# T3Code Analytics Service

This is one Rust service for privacy-safe T3Code aggregate analytics.

The service opens the source SQLite database with explicit read-only flags over a read-only filesystem mount. Each refresh holds one SQLite read transaction while it computes allowlisted aggregate facts. It never selects message text, activity summaries, activity payloads, paths, account fields, client fields, session fields, or network values.

Accepted facts are published atomically into an embedded DuckDB file and cached in memory for the JSON API. The dashboard, API, health endpoints, and Prometheus metrics are served by the same Axum process.

## Local Development

```sh
SOURCE_DB_PATH=/path/to/synthetic.sqlite \
ANALYTICS_DB_PATH=/tmp/t3code-analytics.duckdb \
HOST=127.0.0.1 \
PORT=4180 \
cargo run --manifest-path app/Cargo.toml
```

The source must contain the current T3Code projection and event tables. Never point development commands at the live source unless the source mount and SQLite connection are both read only.

## Endpoints

- `/` dashboard
- `/api/dashboard` accepted aggregate contract
- `/healthz` process health
- `/readyz` aggregate readiness
- `/metrics` Prometheus text format

## Storage

DuckDB retains aggregate snapshots for 90 days. Parquet remains a later export option and is not required by the running service.
