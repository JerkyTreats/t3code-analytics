mod model;
mod pipeline;

use std::{
    net::SocketAddr,
    path::PathBuf,
    sync::{
        Arc,
        atomic::{AtomicBool, AtomicU64, Ordering},
    },
    time::{Duration, Instant},
};

use anyhow::{Context, Result};
use axum::{
    Json, Router,
    extract::State,
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{Html, IntoResponse, Response},
    routing::get,
};
use model::Dashboard;
use tokio::sync::RwLock;
use tower_http::trace::TraceLayer;
use tracing::{error, info};
use tracing_subscriber::EnvFilter;

const INDEX_HTML: &str = include_str!("../static/index.html");
const APP_JS: &str = include_str!("../static/app.js");
const STYLES_CSS: &str = include_str!("../static/styles.css");

#[derive(Clone)]
struct Config {
    source_path: PathBuf,
    analytics_path: PathBuf,
    address: SocketAddr,
    refresh_interval: Duration,
}

#[derive(Clone)]
struct AppState {
    dashboard: Arc<RwLock<Option<Dashboard>>>,
    status: Arc<RefreshStatus>,
}

#[derive(Default)]
struct RefreshStatus {
    refreshing: AtomicBool,
    success: AtomicBool,
    failures: AtomicU64,
    duration_ms: AtomicU64,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .json()
        .init();

    let config = Config::from_env()?;
    let cached = pipeline::load_latest(&config.analytics_path).unwrap_or_else(|cause| {
        error!(error = %cause, "failed to load cached aggregate snapshot");
        None
    });
    let state = AppState {
        dashboard: Arc::new(RwLock::new(cached)),
        status: Arc::new(RefreshStatus::default()),
    };

    refresh_once(&config, &state).await;
    let refresh_config = config.clone();
    let refresh_state = state.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(refresh_config.refresh_interval);
        interval.tick().await;
        loop {
            interval.tick().await;
            refresh_once(&refresh_config, &refresh_state).await;
        }
    });

    let router = Router::new()
        .route("/", get(index))
        .route("/app.js", get(app_js))
        .route("/styles.css", get(styles_css))
        .route("/api/dashboard", get(dashboard))
        .route("/healthz", get(health))
        .route("/readyz", get(ready))
        .route("/metrics", get(metrics))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(config.address)
        .await
        .with_context(|| format!("bind analytics service to {}", config.address))?;
    info!(address = %config.address, "t3code analytics is listening");
    axum::serve(listener, router)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

impl Config {
    fn from_env() -> Result<Self> {
        let host = std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".into());
        let port = std::env::var("PORT").unwrap_or_else(|_| "4180".into());
        let refresh_seconds = std::env::var("REFRESH_SECONDS")
            .unwrap_or_else(|_| "300".into())
            .parse::<u64>()
            .context("REFRESH_SECONDS must be an integer")?
            .max(30);
        Ok(Self {
            source_path: std::env::var("SOURCE_DB_PATH")
                .unwrap_or_else(|_| "/source/state.sqlite".into())
                .into(),
            analytics_path: std::env::var("ANALYTICS_DB_PATH")
                .unwrap_or_else(|_| "/data/analytics.duckdb".into())
                .into(),
            address: format!("{host}:{port}").parse()?,
            refresh_interval: Duration::from_secs(refresh_seconds),
        })
    }
}

async fn refresh_once(config: &Config, state: &AppState) {
    if state.status.refreshing.swap(true, Ordering::SeqCst) {
        return;
    }
    let started = Instant::now();
    let source_path = config.source_path.clone();
    let analytics_path = config.analytics_path.clone();
    let result = tokio::task::spawn_blocking(move || {
        pipeline::extract_and_persist(&source_path, &analytics_path)
    })
    .await;
    state
        .status
        .duration_ms
        .store(started.elapsed().as_millis() as u64, Ordering::Relaxed);
    state.status.refreshing.store(false, Ordering::SeqCst);

    match result {
        Ok(Ok(snapshot)) => {
            info!(
                source_sequence = snapshot.snapshot.source_event_sequence,
                turns = snapshot.summary.turns_requested,
                "aggregate snapshot refreshed"
            );
            *state.dashboard.write().await = Some(snapshot);
            state.status.success.store(true, Ordering::Relaxed);
        }
        Ok(Err(cause)) => {
            state.status.failures.fetch_add(1, Ordering::Relaxed);
            state.status.success.store(false, Ordering::Relaxed);
            *state.dashboard.write().await = None;
            error!(error = %cause, "aggregate refresh failed");
        }
        Err(cause) => {
            state.status.failures.fetch_add(1, Ordering::Relaxed);
            state.status.success.store(false, Ordering::Relaxed);
            *state.dashboard.write().await = None;
            error!(error = %cause, "aggregate refresh task failed");
        }
    }
}

async fn index() -> Response {
    with_security_headers(Html(INDEX_HTML).into_response())
}

async fn app_js() -> Response {
    static_asset(APP_JS, "text/javascript; charset=utf-8")
}

async fn styles_css() -> Response {
    static_asset(STYLES_CSS, "text/css; charset=utf-8")
}

fn static_asset(body: &'static str, content_type: &'static str) -> Response {
    let mut response = body.into_response();
    response
        .headers_mut()
        .insert(header::CONTENT_TYPE, HeaderValue::from_static(content_type));
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("public, max-age=300"),
    );
    with_security_headers(response)
}

async fn dashboard(State(state): State<AppState>) -> Response {
    let snapshot = state.dashboard.read().await;
    match snapshot.as_ref() {
        Some(snapshot) => {
            let mut response = Json(snapshot).into_response();
            response.headers_mut().insert(
                header::CACHE_CONTROL,
                HeaderValue::from_static("private, no-store"),
            );
            with_security_headers(response)
        }
        None => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({"error": "aggregate snapshot unavailable"})),
        )
            .into_response(),
    }
}

async fn health() -> StatusCode {
    StatusCode::OK
}

async fn ready(State(state): State<AppState>) -> StatusCode {
    if state.dashboard.read().await.is_some() && state.status.success.load(Ordering::Relaxed) {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    }
}

async fn metrics(State(state): State<AppState>) -> Response {
    let snapshot = state.dashboard.read().await;
    let ready = i32::from(snapshot.is_some());
    let source_sequence = snapshot
        .as_ref()
        .map(|item| item.snapshot.source_event_sequence)
        .unwrap_or(0);
    let projection_lag = snapshot
        .as_ref()
        .map(|item| item.snapshot.projection_lag)
        .unwrap_or(0);
    let freshness = snapshot
        .as_ref()
        .and_then(|item| item.snapshot.source_freshness_seconds)
        .unwrap_or(-1);
    let body = format!(
        "# HELP t3code_analytics_ready Whether a dashboard snapshot is available\n\
         # TYPE t3code_analytics_ready gauge\n\
         t3code_analytics_ready {ready}\n\
         # HELP t3code_analytics_refresh_failures_total Failed refresh attempts\n\
         # TYPE t3code_analytics_refresh_failures_total counter\n\
         t3code_analytics_refresh_failures_total {}\n\
         # HELP t3code_analytics_refresh_duration_milliseconds Last refresh duration\n\
         # TYPE t3code_analytics_refresh_duration_milliseconds gauge\n\
         t3code_analytics_refresh_duration_milliseconds {}\n\
         # HELP t3code_analytics_source_event_sequence Latest observed source sequence\n\
         # TYPE t3code_analytics_source_event_sequence gauge\n\
         t3code_analytics_source_event_sequence {source_sequence}\n\
         # HELP t3code_analytics_projection_lag Source events ahead of projections\n\
         # TYPE t3code_analytics_projection_lag gauge\n\
         t3code_analytics_projection_lag {projection_lag}\n\
         # HELP t3code_analytics_source_freshness_seconds Age of latest admitted source fact\n\
         # TYPE t3code_analytics_source_freshness_seconds gauge\n\
         t3code_analytics_source_freshness_seconds {freshness}\n",
        state.status.failures.load(Ordering::Relaxed),
        state.status.duration_ms.load(Ordering::Relaxed),
    );
    let mut response = body.into_response();
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/plain; version=0.0.4; charset=utf-8"),
    );
    response
}

fn with_security_headers(mut response: Response) -> Response {
    let headers: &mut HeaderMap = response.headers_mut();
    headers.insert(
        header::CONTENT_SECURITY_POLICY,
        HeaderValue::from_static(
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
        ),
    );
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        header::REFERRER_POLICY,
        HeaderValue::from_static("no-referrer"),
    );
    response
}

async fn shutdown_signal() {
    let control_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("install Ctrl+C handler");
    };
    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("install SIGTERM handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! {
        _ = control_c => {},
        _ = terminate => {},
    }
}
