use std::path::Path;

use anyhow::{Context, Result, anyhow};
use chrono::{Duration, SecondsFormat, Utc};
use duckdb::{Connection as DuckConnection, params as duck_params};
use rusqlite::{Connection, OpenFlags};

use crate::model::{ActivityCount, DailyUsage, Dashboard, Snapshot, Summary};

const WINDOW_DAYS: u16 = 42;

pub fn extract_and_persist(source_path: &Path, analytics_path: &Path) -> Result<Dashboard> {
    let dashboard = extract(source_path)?;
    persist(analytics_path, &dashboard)?;
    Ok(dashboard)
}

pub fn load_latest(analytics_path: &Path) -> Result<Option<Dashboard>> {
    if !analytics_path.exists() {
        return Ok(None);
    }

    let connection = DuckConnection::open(analytics_path)
        .with_context(|| "open aggregate DuckDB for cached snapshot")?;
    ensure_schema(&connection)?;
    let mut statement = connection
        .prepare("SELECT snapshot_json FROM extraction_runs ORDER BY generated_at DESC LIMIT 1")?;
    let mut rows = statement.query([])?;
    let Some(row) = rows.next()? else {
        return Ok(None);
    };
    let snapshot_json: String = row.get(0)?;
    Ok(Some(serde_json::from_str(&snapshot_json)?))
}

fn extract(source_path: &Path) -> Result<Dashboard> {
    let flags = OpenFlags::SQLITE_OPEN_READ_ONLY
        | OpenFlags::SQLITE_OPEN_URI
        | OpenFlags::SQLITE_OPEN_NO_MUTEX;
    let mut source = Connection::open_with_flags(source_path, flags)
        .with_context(|| "open T3Code source with read-only flags")?;
    source.pragma_update(None, "query_only", true)?;
    source.busy_timeout(std::time::Duration::from_secs(10))?;

    let transaction = source.transaction()?;
    let source_event_sequence = transaction.query_row(
        "SELECT COALESCE(MAX(sequence), 0) FROM orchestration_events",
        [],
        |row| row.get::<_, i64>(0),
    )?;
    let projection_sequence = transaction.query_row(
        "SELECT COALESCE(MIN(last_applied_sequence), 0) FROM projection_state",
        [],
        |row| row.get::<_, i64>(0),
    )?;

    let summary = transaction.query_row(
        r#"
        SELECT
          COUNT(*),
          COALESCE(SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN state = 'error' THEN 1 ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN state = 'interrupted' THEN 1 ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN state IN ('pending', 'running') THEN 1 ELSE 0 END), 0),
          COALESCE(SUM(CASE
            WHEN state IN ('pending', 'running')
             AND julianday('now') - julianday(requested_at) >= 0.25
            THEN 1 ELSE 0 END), 0),
          COUNT(DISTINCT thread_id),
          COUNT(DISTINCT substr(requested_at, 1, 10)),
          MAX(requested_at)
        FROM projection_turns
        "#,
        [],
        |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, i64>(4)?,
                row.get::<_, i64>(5)?,
                row.get::<_, i64>(6)?,
                row.get::<_, i64>(7)?,
                row.get::<_, Option<String>>(8)?,
            ))
        },
    )?;

    let mut daily_statement = transaction.prepare(
        r#"
        WITH turn_daily AS (
          SELECT
            substr(requested_at, 1, 10) AS day,
            COUNT(*) AS turns_requested,
            SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END) AS turns_completed,
            SUM(CASE WHEN state = 'error' THEN 1 ELSE 0 END) AS turns_error,
            SUM(CASE WHEN state = 'interrupted' THEN 1 ELSE 0 END) AS turns_interrupted,
            COUNT(DISTINCT thread_id) AS active_threads
          FROM projection_turns
          WHERE requested_at >= datetime('now', '-41 days')
          GROUP BY day
        ),
        activity_daily AS (
          SELECT
            substr(created_at, 1, 10) AS day,
            SUM(CASE WHEN kind = 'tool.started' THEN 1 ELSE 0 END) AS tool_starts,
            SUM(CASE WHEN kind = 'tool.completed' THEN 1 ELSE 0 END) AS tool_completions,
            SUM(CASE WHEN kind = 'runtime.error' THEN 1 ELSE 0 END) AS runtime_errors,
            SUM(CASE WHEN kind = 'turn.plan.updated' THEN 1 ELSE 0 END) AS plan_updates,
            SUM(CASE WHEN kind = 'checkpoint.captured' THEN 1 ELSE 0 END) AS checkpoints,
            SUM(CASE WHEN kind = 'context-compaction' THEN 1 ELSE 0 END) AS compactions
          FROM projection_thread_activities
          WHERE created_at >= datetime('now', '-41 days')
          GROUP BY day
        )
        SELECT
          turns.day,
          turns.turns_requested,
          turns.turns_completed,
          turns.turns_error,
          turns.turns_interrupted,
          turns.active_threads,
          COALESCE(activity.tool_starts, 0),
          COALESCE(activity.tool_completions, 0),
          COALESCE(activity.runtime_errors, 0),
          COALESCE(activity.plan_updates, 0),
          COALESCE(activity.checkpoints, 0),
          COALESCE(activity.compactions, 0)
        FROM turn_daily AS turns
        LEFT JOIN activity_daily AS activity USING (day)
        ORDER BY turns.day
        "#,
    )?;
    let daily = daily_statement
        .query_map([], |row| {
            Ok(DailyUsage {
                day: row.get(0)?,
                turns_requested: row.get(1)?,
                turns_completed: row.get(2)?,
                turns_error: row.get(3)?,
                turns_interrupted: row.get(4)?,
                active_threads: row.get(5)?,
                tool_starts: row.get(6)?,
                tool_completions: row.get(7)?,
                runtime_errors: row.get(8)?,
                plan_updates: row.get(9)?,
                checkpoints: row.get(10)?,
                compactions: row.get(11)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut activity_statement = transaction.prepare(
        r#"
        SELECT kind, COUNT(*) AS activity_count
        FROM projection_thread_activities
        WHERE created_at >= datetime('now', '-30 days')
        GROUP BY kind
        ORDER BY activity_count DESC, kind
        LIMIT 8
        "#,
    )?;
    let activity = activity_statement
        .query_map([], |row| {
            Ok(ActivityCount {
                kind: row.get(0)?,
                count: row.get(1)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    drop(activity_statement);
    drop(daily_statement);
    transaction.commit()?;

    let terminal_turns = summary.1 + summary.2 + summary.3;
    let completion_rate = if terminal_turns == 0 {
        None
    } else {
        Some(summary.1 as f64 / terminal_turns as f64)
    };
    let freshness = summary.8.as_deref().and_then(source_freshness_seconds);

    Ok(Dashboard {
        snapshot: Snapshot {
            generated_at: Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true),
            source_latest_at: summary.8,
            source_event_sequence,
            projection_sequence,
            projection_lag: source_event_sequence.saturating_sub(projection_sequence),
            source_freshness_seconds: freshness,
            window_days: WINDOW_DAYS,
        },
        summary: Summary {
            turns_requested: summary.0,
            turns_completed: summary.1,
            turns_error: summary.2,
            turns_interrupted: summary.3,
            turns_in_flight: summary.4,
            stale_in_flight: summary.5,
            active_threads: summary.6,
            active_days: summary.7,
            terminal_completion_rate: completion_rate,
        },
        daily,
        activity,
    })
}

fn source_freshness_seconds(value: &str) -> Option<i64> {
    let parsed = chrono::DateTime::parse_from_rfc3339(value).ok()?;
    Some(
        (Utc::now() - parsed.with_timezone(&Utc))
            .num_seconds()
            .max(0),
    )
}

fn ensure_schema(connection: &DuckConnection) -> Result<()> {
    connection.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS extraction_runs (
          generated_at VARCHAR PRIMARY KEY,
          source_event_sequence BIGINT NOT NULL,
          projection_sequence BIGINT NOT NULL,
          source_latest_at VARCHAR,
          snapshot_json VARCHAR NOT NULL
        );
        CREATE TABLE IF NOT EXISTS daily_usage (
          generated_at VARCHAR NOT NULL,
          day DATE NOT NULL,
          turns_requested BIGINT NOT NULL,
          turns_completed BIGINT NOT NULL,
          turns_error BIGINT NOT NULL,
          turns_interrupted BIGINT NOT NULL,
          active_threads BIGINT NOT NULL,
          tool_starts BIGINT NOT NULL,
          tool_completions BIGINT NOT NULL,
          runtime_errors BIGINT NOT NULL,
          plan_updates BIGINT NOT NULL,
          checkpoints BIGINT NOT NULL,
          compactions BIGINT NOT NULL,
          PRIMARY KEY (generated_at, day)
        );
        CREATE TABLE IF NOT EXISTS activity_breakdown (
          generated_at VARCHAR NOT NULL,
          kind VARCHAR NOT NULL,
          activity_count BIGINT NOT NULL,
          PRIMARY KEY (generated_at, kind)
        );
        "#,
    )?;
    Ok(())
}

fn persist(analytics_path: &Path, dashboard: &Dashboard) -> Result<()> {
    let parent = analytics_path
        .parent()
        .ok_or_else(|| anyhow!("analytics path has no parent directory"))?;
    std::fs::create_dir_all(parent)?;

    let mut connection = DuckConnection::open(analytics_path)
        .with_context(|| "open aggregate DuckDB for publication")?;
    ensure_schema(&connection)?;
    let transaction = connection.transaction()?;
    let snapshot_json = serde_json::to_string(dashboard)?;
    transaction.execute(
        r#"
        INSERT INTO extraction_runs
          (generated_at, source_event_sequence, projection_sequence, source_latest_at, snapshot_json)
        VALUES (?, ?, ?, ?, ?)
        "#,
        duck_params![
            dashboard.snapshot.generated_at,
            dashboard.snapshot.source_event_sequence,
            dashboard.snapshot.projection_sequence,
            dashboard.snapshot.source_latest_at,
            snapshot_json,
        ],
    )?;

    for row in &dashboard.daily {
        transaction.execute(
            r#"
            INSERT INTO daily_usage VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            duck_params![
                dashboard.snapshot.generated_at,
                row.day,
                row.turns_requested,
                row.turns_completed,
                row.turns_error,
                row.turns_interrupted,
                row.active_threads,
                row.tool_starts,
                row.tool_completions,
                row.runtime_errors,
                row.plan_updates,
                row.checkpoints,
                row.compactions,
            ],
        )?;
    }
    for row in &dashboard.activity {
        transaction.execute(
            "INSERT INTO activity_breakdown VALUES (?, ?, ?)",
            duck_params![dashboard.snapshot.generated_at, row.kind, row.count],
        )?;
    }

    let retention_cutoff =
        (Utc::now() - Duration::days(90)).to_rfc3339_opts(SecondsFormat::Secs, true);
    transaction.execute(
        "DELETE FROM daily_usage WHERE generated_at < ?",
        duck_params![retention_cutoff],
    )?;
    transaction.execute(
        "DELETE FROM activity_breakdown WHERE generated_at < ?",
        duck_params![retention_cutoff],
    )?;
    transaction.execute(
        "DELETE FROM extraction_runs WHERE generated_at < ?",
        duck_params![retention_cutoff],
    )?;
    transaction.commit()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::params;
    use tempfile::tempdir;

    #[test]
    fn extracts_only_aggregate_contracts_and_persists_snapshot() -> Result<()> {
        let directory = tempdir()?;
        let source_path = directory.path().join("source.sqlite");
        let analytics_path = directory.path().join("analytics.duckdb");
        let source = Connection::open(&source_path)?;
        source.execute_batch(
            r#"
            CREATE TABLE orchestration_events (sequence INTEGER PRIMARY KEY);
            CREATE TABLE projection_state (
              projector TEXT PRIMARY KEY,
              last_applied_sequence INTEGER NOT NULL
            );
            CREATE TABLE projection_turns (
              thread_id TEXT NOT NULL,
              state TEXT NOT NULL,
              requested_at TEXT NOT NULL
            );
            CREATE TABLE projection_thread_activities (
              kind TEXT NOT NULL,
              created_at TEXT NOT NULL,
              payload_json TEXT NOT NULL,
              summary TEXT NOT NULL
            );
            "#,
        )?;
        source.execute("INSERT INTO orchestration_events VALUES (12)", [])?;
        source.execute(
            "INSERT INTO projection_state VALUES ('projection.turns', 12)",
            [],
        )?;
        let now = Utc::now().to_rfc3339();
        source.execute(
            "INSERT INTO projection_turns VALUES (?, 'completed', ?)",
            params!["work-object-alpha", now],
        )?;
        source.execute(
            "INSERT INTO projection_turns VALUES (?, 'error', ?)",
            params!["work-object-beta", now],
        )?;
        source.execute(
            "INSERT INTO projection_thread_activities VALUES ('tool.started', ?, ?, ?)",
            params![now, "private-payload-marker", "private-summary-marker"],
        )?;
        drop(source);

        let dashboard = extract_and_persist(&source_path, &analytics_path)?;
        assert_eq!(dashboard.summary.turns_requested, 2);
        assert_eq!(dashboard.summary.turns_completed, 1);
        assert_eq!(dashboard.summary.turns_error, 1);
        assert_eq!(dashboard.activity[0].kind, "tool.started");

        let published = serde_json::to_string(&dashboard)?;
        assert!(!published.contains("private-payload-marker"));
        assert!(!published.contains("private-summary-marker"));
        assert!(!published.contains("work-object-alpha"));

        let cached = load_latest(&analytics_path)?.expect("cached snapshot");
        assert_eq!(cached.snapshot.source_event_sequence, 12);
        Ok(())
    }
}
