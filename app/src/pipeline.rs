use std::{collections::HashMap, path::Path};

use anyhow::{Context, Result, anyhow};
use chrono::{Duration, SecondsFormat, Utc};
use duckdb::{Connection as DuckConnection, params as duck_params};
use rusqlite::{Connection, OpenFlags};

use crate::model::{
    ActivityCount, ActivityCoverage, DailyUsage, Dashboard, ProjectDailyUsage, ProjectRollup,
    Snapshot, Summary, ThreadRecency,
};

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
    if projection_sequence > source_event_sequence {
        return Err(anyhow!(
            "projection cursor is ahead of the source event high-water mark"
        ));
    }
    if projection_sequence < source_event_sequence {
        return Err(anyhow!(
            "projection cursors are behind the source event high-water mark"
        ));
    }

    let summary_row = transaction.query_row(
        r#"
        WITH current_projects AS (
          SELECT project_id FROM projection_projects WHERE deleted_at IS NULL
        ),
        project_turns AS (
          SELECT threads.project_id, turns.thread_id, turns.state, turns.requested_at
          FROM projection_turns AS turns
          JOIN projection_threads AS threads USING (thread_id)
          JOIN current_projects USING (project_id)
        ),
        project_windows AS (
          SELECT
            project_id,
            SUM(CASE WHEN julianday(requested_at) >= julianday('now', '-7 days')
                      AND julianday(requested_at) <= julianday('now', '+5 minutes') THEN 1 ELSE 0 END) AS current_turns,
            SUM(CASE WHEN julianday(requested_at) >= julianday('now', '-14 days')
                      AND julianday(requested_at) < julianday('now', '-7 days') THEN 1 ELSE 0 END) AS previous_turns
          FROM project_turns
          GROUP BY project_id
        ),
        top_three AS (
          SELECT COALESCE(SUM(current_turns), 0) AS turns
          FROM (
            SELECT current_turns FROM project_windows ORDER BY current_turns DESC LIMIT 3
          )
        ),
        project_turn_last AS (
          SELECT project_id, MAX(requested_at) AS last_work_at
          FROM project_turns
          GROUP BY project_id
        ),
        project_activity_last AS (
          SELECT threads.project_id, MAX(activities.created_at) AS last_work_at
          FROM projection_thread_activities AS activities
          JOIN projection_threads AS threads USING (thread_id)
          JOIN current_projects USING (project_id)
          GROUP BY threads.project_id
        ),
        project_last_work AS (
          SELECT
            current_projects.project_id,
            CASE
              WHEN project_turn_last.last_work_at IS NULL THEN project_activity_last.last_work_at
              WHEN project_activity_last.last_work_at IS NULL THEN project_turn_last.last_work_at
              WHEN project_activity_last.last_work_at > project_turn_last.last_work_at THEN project_activity_last.last_work_at
              ELSE project_turn_last.last_work_at
            END AS last_work_at
          FROM current_projects
          LEFT JOIN project_turn_last USING (project_id)
          LEFT JOIN project_activity_last USING (project_id)
        )
        SELECT
          (SELECT COUNT(*) FROM current_projects),
          COALESCE(SUM(CASE WHEN julianday(project_turn_last.last_work_at) >= julianday('now', '-1 day') AND julianday(project_turn_last.last_work_at) <= julianday('now', '+5 minutes') THEN 1 ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN julianday(project_turn_last.last_work_at) >= julianday('now', '-7 days') AND julianday(project_turn_last.last_work_at) <= julianday('now', '+5 minutes') THEN 1 ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN julianday(project_last_work.last_work_at) < julianday('now', '-30 days') THEN 1 ELSE 0 END), 0),
          (SELECT COUNT(*) FROM project_turns WHERE julianday(requested_at) >= julianday('now', '-7 days') AND julianday(requested_at) <= julianday('now', '+5 minutes')),
          (SELECT COUNT(*) FROM project_turns WHERE julianday(requested_at) >= julianday('now', '-14 days') AND julianday(requested_at) < julianday('now', '-7 days')),
          (SELECT COALESCE(SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END), 0) FROM project_turns WHERE julianday(requested_at) >= julianday('now', '-7 days') AND julianday(requested_at) <= julianday('now', '+5 minutes')),
          (SELECT COALESCE(SUM(CASE WHEN state = 'error' THEN 1 ELSE 0 END), 0) FROM project_turns WHERE julianday(requested_at) >= julianday('now', '-7 days') AND julianday(requested_at) <= julianday('now', '+5 minutes')),
          (SELECT COALESCE(SUM(CASE WHEN state = 'interrupted' THEN 1 ELSE 0 END), 0) FROM project_turns WHERE julianday(requested_at) >= julianday('now', '-7 days') AND julianday(requested_at) <= julianday('now', '+5 minutes')),
          (SELECT COALESCE(SUM(CASE WHEN state IN ('pending', 'running') THEN 1 ELSE 0 END), 0) FROM project_turns),
          (SELECT COUNT(DISTINCT thread_id) FROM project_turns WHERE julianday(requested_at) >= julianday('now', '-7 days') AND julianday(requested_at) <= julianday('now', '+5 minutes')),
          (SELECT COUNT(*) FROM projection_threads AS threads JOIN current_projects USING (project_id) WHERE threads.deleted_at IS NULL AND threads.has_actionable_proposed_plan = 1),
          (SELECT COUNT(*) FROM project_windows WHERE current_turns > 0 AND previous_turns = 0),
          (SELECT COUNT(*) FROM project_windows WHERE previous_turns > 0 AND current_turns = 0),
          (SELECT turns FROM top_three),
          (SELECT MAX(occurred_at) FROM orchestration_events)
        FROM current_projects
        LEFT JOIN project_last_work USING (project_id)
        LEFT JOIN project_turn_last USING (project_id)
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
                row.get::<_, i64>(8)?,
                row.get::<_, i64>(9)?,
                row.get::<_, i64>(10)?,
                row.get::<_, i64>(11)?,
                row.get::<_, i64>(12)?,
                row.get::<_, i64>(13)?,
                row.get::<_, i64>(14)?,
                row.get::<_, Option<String>>(15)?,
            ))
        },
    )?;

    let mut daily_statement = transaction.prepare(
        r#"
        WITH RECURSIVE dates(day) AS (
          SELECT date('now', '-41 days')
          UNION ALL
          SELECT date(day, '+1 day') FROM dates WHERE day < date('now')
        ),
        turn_daily AS (
          SELECT
            substr(requested_at, 1, 10) AS day,
            COUNT(DISTINCT threads.project_id) AS active_projects,
            COUNT(*) AS turns_requested,
            SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END) AS turns_completed,
            SUM(CASE WHEN state = 'error' THEN 1 ELSE 0 END) AS turns_error,
            SUM(CASE WHEN state = 'interrupted' THEN 1 ELSE 0 END) AS turns_interrupted,
            COUNT(DISTINCT thread_id) AS active_threads
          FROM projection_turns AS turns
          JOIN projection_threads AS threads USING (thread_id)
          JOIN projection_projects AS projects USING (project_id)
          WHERE date(turns.requested_at) >= date('now', '-41 days')
            AND date(turns.requested_at) <= date('now')
            AND projects.deleted_at IS NULL
          GROUP BY day
        ),
        activity_daily AS (
          SELECT
            substr(activities.created_at, 1, 10) AS day,
            SUM(CASE WHEN kind = 'tool.started' THEN 1 ELSE 0 END) AS tool_starts,
            SUM(CASE WHEN kind = 'tool.completed' THEN 1 ELSE 0 END) AS tool_completions,
            SUM(CASE WHEN kind = 'runtime.error' THEN 1 ELSE 0 END) AS runtime_errors,
            SUM(CASE WHEN kind = 'turn.plan.updated' THEN 1 ELSE 0 END) AS plan_updates,
            SUM(CASE WHEN kind = 'checkpoint.captured' THEN 1 ELSE 0 END) AS checkpoints,
            SUM(CASE WHEN kind = 'context-compaction' THEN 1 ELSE 0 END) AS compactions
          FROM projection_thread_activities AS activities
          JOIN projection_threads AS threads USING (thread_id)
          JOIN projection_projects AS projects USING (project_id)
          WHERE date(activities.created_at) >= date('now', '-41 days')
            AND date(activities.created_at) <= date('now')
            AND projects.deleted_at IS NULL
          GROUP BY day
        )
        SELECT
          dates.day,
          COALESCE(turns.active_projects, 0),
          COALESCE(turns.turns_requested, 0),
          COALESCE(turns.turns_completed, 0),
          COALESCE(turns.turns_error, 0),
          COALESCE(turns.turns_interrupted, 0),
          COALESCE(turns.active_threads, 0),
          COALESCE(activity.tool_starts, 0),
          COALESCE(activity.tool_completions, 0),
          COALESCE(activity.runtime_errors, 0),
          COALESCE(activity.plan_updates, 0),
          COALESCE(activity.checkpoints, 0),
          COALESCE(activity.compactions, 0)
        FROM dates
        LEFT JOIN turn_daily AS turns USING (day)
        LEFT JOIN activity_daily AS activity USING (day)
        ORDER BY dates.day
        "#,
    )?;
    let daily = daily_statement
        .query_map([], |row| {
            Ok(DailyUsage {
                day: row.get(0)?,
                active_projects: row.get(1)?,
                turns_requested: row.get(2)?,
                turns_completed: row.get(3)?,
                turns_error: row.get(4)?,
                turns_interrupted: row.get(5)?,
                active_threads: row.get(6)?,
                tool_starts: row.get(7)?,
                tool_completions: row.get(8)?,
                runtime_errors: row.get(9)?,
                plan_updates: row.get(10)?,
                checkpoints: row.get(11)?,
                compactions: row.get(12)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut activity_statement = transaction.prepare(
        r#"
        SELECT activities.kind, COUNT(*) AS activity_count
        FROM projection_thread_activities AS activities
        JOIN projection_threads AS threads USING (thread_id)
        JOIN projection_projects AS projects USING (project_id)
        WHERE julianday(activities.created_at) >= julianday('now', '-7 days')
          AND julianday(activities.created_at) <= julianday('now', '+5 minutes')
          AND projects.deleted_at IS NULL
        GROUP BY activities.kind
        "#,
    )?;
    let raw_activity = activity_statement
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    let activity = aggregate_activity(raw_activity, summary_row.4);

    let activity_coverage = transaction.query_row(
        r#"
        SELECT
          COUNT(*),
          COALESCE(SUM(CASE WHEN activities.turn_id IS NOT NULL AND turns.row_id IS NOT NULL THEN 1 ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN activities.turn_id IS NULL THEN 1 ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN activities.turn_id IS NOT NULL AND turns.row_id IS NULL THEN 1 ELSE 0 END), 0)
        FROM projection_thread_activities AS activities
        JOIN projection_threads AS threads USING (thread_id)
        JOIN projection_projects AS projects USING (project_id)
        LEFT JOIN projection_turns AS turns
          ON turns.thread_id = activities.thread_id AND turns.turn_id = activities.turn_id
        WHERE julianday(activities.created_at) >= julianday('now', '-7 days')
          AND julianday(activities.created_at) <= julianday('now', '+5 minutes')
          AND projects.deleted_at IS NULL
        "#,
        [],
        |row| {
            Ok(ActivityCoverage {
                total: row.get(0)?,
                attributed_to_turn: row.get(1)?,
                thread_level: row.get(2)?,
                unresolved_turn: row.get(3)?,
            })
        },
    )?;

    let mut project_statement = transaction.prepare(
        r#"
        WITH ranked_projects AS (
          SELECT
            project_id,
            title,
            created_at,
            deleted_at
          FROM projection_projects
        ),
        turn_last AS (
          SELECT thread_id, MAX(COALESCE(completed_at, started_at, requested_at)) AS last_work_at
          FROM projection_turns GROUP BY thread_id
        ),
        activity_last AS (
          SELECT thread_id, MAX(created_at) AS last_work_at
          FROM projection_thread_activities GROUP BY thread_id
        ),
        thread_work AS (
          SELECT
            threads.thread_id,
            threads.project_id,
            CASE
              WHEN turn_last.last_work_at IS NULL THEN activity_last.last_work_at
              WHEN activity_last.last_work_at IS NULL THEN turn_last.last_work_at
              WHEN activity_last.last_work_at > turn_last.last_work_at THEN activity_last.last_work_at
              ELSE turn_last.last_work_at
            END AS last_work_at
          FROM projection_threads AS threads
          LEFT JOIN turn_last USING (thread_id)
          LEFT JOIN activity_last USING (thread_id)
        ),
        project_work AS (
          SELECT project_id, MAX(last_work_at) AS last_work_at
          FROM thread_work GROUP BY project_id
        ),
        turn_metrics AS (
          SELECT
            threads.project_id,
            COUNT(DISTINCT CASE WHEN julianday(turns.requested_at) >= julianday('now', '-7 days') AND julianday(turns.requested_at) <= julianday('now', '+5 minutes') THEN turns.thread_id END) AS active_threads_7d,
            COALESCE(SUM(CASE WHEN julianday(turns.requested_at) >= julianday('now', '-7 days') AND julianday(turns.requested_at) <= julianday('now', '+5 minutes') THEN 1 ELSE 0 END), 0) AS turns_7d,
            COALESCE(SUM(CASE WHEN julianday(turns.requested_at) >= julianday('now', '-14 days') AND julianday(turns.requested_at) < julianday('now', '-7 days') THEN 1 ELSE 0 END), 0) AS turns_previous,
            COALESCE(SUM(CASE WHEN julianday(turns.requested_at) >= julianday('now', '-7 days') AND julianday(turns.requested_at) <= julianday('now', '+5 minutes') AND turns.state = 'completed' THEN 1 ELSE 0 END), 0) AS completed_7d,
            COALESCE(SUM(CASE WHEN julianday(turns.requested_at) >= julianday('now', '-7 days') AND julianday(turns.requested_at) <= julianday('now', '+5 minutes') AND turns.state = 'error' THEN 1 ELSE 0 END), 0) AS error_7d,
            COALESCE(SUM(CASE WHEN julianday(turns.requested_at) >= julianday('now', '-7 days') AND julianday(turns.requested_at) <= julianday('now', '+5 minutes') AND turns.state = 'interrupted' THEN 1 ELSE 0 END), 0) AS interrupted_7d,
            COALESCE(SUM(CASE WHEN turns.state IN ('pending', 'running') THEN 1 ELSE 0 END), 0) AS in_flight
          FROM projection_threads AS threads
          LEFT JOIN projection_turns AS turns USING (thread_id)
          GROUP BY threads.project_id
        ),
        thread_metrics AS (
          SELECT
            threads.project_id,
            COUNT(*) AS current_threads,
            COALESCE(SUM(CASE WHEN julianday(threads.created_at) >= julianday('now', '-7 days') AND julianday(threads.created_at) <= julianday('now', '+5 minutes') THEN 1 ELSE 0 END), 0) AS new_threads_7d,
            COALESCE(SUM(CASE WHEN threads.has_actionable_proposed_plan = 1 THEN 1 ELSE 0 END), 0) AS actionable_plans,
            COALESCE(SUM(CASE WHEN julianday(thread_work.last_work_at) >= julianday('now', '-1 day') AND julianday(thread_work.last_work_at) <= julianday('now', '+5 minutes') THEN 1 ELSE 0 END), 0) AS within_24h,
            COALESCE(SUM(CASE WHEN julianday(thread_work.last_work_at) >= julianday('now', '-7 days') AND julianday(thread_work.last_work_at) < julianday('now', '-1 day') THEN 1 ELSE 0 END), 0) AS within_7d,
            COALESCE(SUM(CASE WHEN julianday(thread_work.last_work_at) >= julianday('now', '-30 days') AND julianday(thread_work.last_work_at) < julianday('now', '-7 days') THEN 1 ELSE 0 END), 0) AS within_30d,
            COALESCE(SUM(CASE WHEN julianday(thread_work.last_work_at) < julianday('now', '-30 days') THEN 1 ELSE 0 END), 0) AS beyond_30d,
            COALESCE(SUM(CASE WHEN thread_work.last_work_at IS NULL OR julianday(thread_work.last_work_at) > julianday('now', '+5 minutes') THEN 1 ELSE 0 END), 0) AS unknown_recency
          FROM projection_threads AS threads
          LEFT JOIN thread_work USING (thread_id, project_id)
          WHERE threads.deleted_at IS NULL
          GROUP BY threads.project_id
        )
        SELECT
          projects.project_id,
          projects.title,
          projects.created_at,
          project_work.last_work_at,
          COALESCE(thread_metrics.current_threads, 0),
          COALESCE(turn_metrics.active_threads_7d, 0),
          COALESCE(thread_metrics.new_threads_7d, 0),
          COALESCE(turn_metrics.turns_7d, 0),
          COALESCE(turn_metrics.turns_previous, 0),
          COALESCE(turn_metrics.completed_7d, 0),
          COALESCE(turn_metrics.error_7d, 0),
          COALESCE(turn_metrics.interrupted_7d, 0),
          COALESCE(turn_metrics.in_flight, 0),
          COALESCE(thread_metrics.actionable_plans, 0),
          COALESCE(thread_metrics.within_24h, 0),
          COALESCE(thread_metrics.within_7d, 0),
          COALESCE(thread_metrics.within_30d, 0),
          COALESCE(thread_metrics.beyond_30d, 0),
          COALESCE(thread_metrics.unknown_recency, 0)
        FROM ranked_projects AS projects
        LEFT JOIN project_work USING (project_id)
        LEFT JOIN turn_metrics USING (project_id)
        LEFT JOIN thread_metrics USING (project_id)
        WHERE projects.deleted_at IS NULL
        ORDER BY project_work.last_work_at DESC, projects.title
        "#,
    )?;
    let mut projects = project_statement
        .query_map([], |row| {
            let last_work_at: Option<String> = row.get(3)?;
            let completed: i64 = row.get(9)?;
            let errors: i64 = row.get(10)?;
            let interrupted: i64 = row.get(11)?;
            let terminal = completed + errors + interrupted;
            let turns_7d: i64 = row.get(7)?;
            let raw_project_id: String = row.get(0)?;
            Ok(ProjectRollup {
                key: project_key(&raw_project_id),
                title: row.get(1)?,
                created_at: row.get(2)?,
                recency_band: recency_band(last_work_at.as_deref()),
                last_work_at,
                current_threads: row.get(4)?,
                active_threads_7d: row.get(5)?,
                new_threads_7d: row.get(6)?,
                turns_7d,
                turns_previous: row.get(8)?,
                turn_share_7d: if summary_row.4 == 0 {
                    None
                } else {
                    Some(turns_7d as f64 / summary_row.4 as f64)
                },
                turns_completed_7d: completed,
                turns_error_7d: errors,
                turns_interrupted_7d: interrupted,
                terminal_completion_rate_7d: if terminal == 0 {
                    None
                } else {
                    Some(completed as f64 / terminal as f64)
                },
                turns_in_flight: row.get(12)?,
                actionable_plan_threads: row.get(13)?,
                thread_recency: ThreadRecency {
                    within_24h: row.get(14)?,
                    within_7d: row.get(15)?,
                    within_30d: row.get(16)?,
                    beyond_30d: row.get(17)?,
                    unknown: row.get(18)?,
                },
                daily: Vec::new(),
                activity: Vec::new(),
                activity_coverage: ActivityCoverage {
                    total: 0,
                    attributed_to_turn: 0,
                    thread_level: 0,
                    unresolved_turn: 0,
                },
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut project_daily_statement = transaction.prepare(
        r#"
        WITH RECURSIVE dates(day) AS (
          SELECT date('now', '-41 days')
          UNION ALL
          SELECT date(day, '+1 day') FROM dates WHERE day < date('now')
        ),
        ranked_projects AS (
          SELECT
            project_id,
            deleted_at
          FROM projection_projects
        ),
        daily AS (
          SELECT
            threads.project_id,
            substr(turns.requested_at, 1, 10) AS day,
            COUNT(*) AS turns_requested,
            COUNT(DISTINCT turns.thread_id) AS active_threads
          FROM projection_turns AS turns
          JOIN projection_threads AS threads USING (thread_id)
          WHERE date(turns.requested_at) >= date('now', '-41 days')
            AND date(turns.requested_at) <= date('now')
          GROUP BY threads.project_id, day
        )
        SELECT
          projects.project_id,
          dates.day,
          COALESCE(daily.turns_requested, 0),
          COALESCE(daily.active_threads, 0)
        FROM ranked_projects AS projects
        CROSS JOIN dates
        LEFT JOIN daily USING (project_id, day)
        WHERE projects.deleted_at IS NULL
        ORDER BY projects.project_id, dates.day
        "#,
    )?;
    let project_daily = project_daily_statement
        .query_map([], |row| {
            Ok((
                project_key(&row.get::<_, String>(0)?),
                ProjectDailyUsage {
                    day: row.get(1)?,
                    turns_requested: row.get(2)?,
                    active_threads: row.get(3)?,
                },
            ))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    for (key, day) in project_daily {
        if let Some(project) = projects.iter_mut().find(|project| project.key == key) {
            project.daily.push(day);
        }
    }

    let mut project_activity_statement = transaction.prepare(
        r#"
        WITH ranked_projects AS (
          SELECT
            project_id,
            deleted_at
          FROM projection_projects
        )
        SELECT
          projects.project_id,
          activities.kind,
          COUNT(*)
        FROM projection_thread_activities AS activities
        JOIN projection_threads AS threads USING (thread_id)
        JOIN ranked_projects AS projects USING (project_id)
        WHERE projects.deleted_at IS NULL
          AND julianday(activities.created_at) >= julianday('now', '-7 days')
          AND julianday(activities.created_at) <= julianday('now', '+5 minutes')
        GROUP BY projects.project_id, activities.kind
        ORDER BY projects.project_id, COUNT(*) DESC, activities.kind
        "#,
    )?;
    let project_activity = project_activity_statement
        .query_map([], |row| {
            Ok((
                project_key(&row.get::<_, String>(0)?),
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
            ))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    let mut project_activity_by_key: HashMap<String, Vec<(String, i64)>> = HashMap::new();
    for (key, kind, count) in project_activity {
        project_activity_by_key
            .entry(key)
            .or_default()
            .push((kind, count));
    }
    for (key, rows) in project_activity_by_key {
        if let Some(project) = projects.iter_mut().find(|project| project.key == key) {
            project.activity = aggregate_activity(rows, project.turns_7d);
        }
    }

    let mut project_coverage_statement = transaction.prepare(
        r#"
        WITH ranked_projects AS (
          SELECT
            project_id,
            deleted_at
          FROM projection_projects
        )
        SELECT
          projects.project_id,
          COUNT(*),
          COALESCE(SUM(CASE WHEN activities.turn_id IS NOT NULL AND turns.row_id IS NOT NULL THEN 1 ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN activities.turn_id IS NULL THEN 1 ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN activities.turn_id IS NOT NULL AND turns.row_id IS NULL THEN 1 ELSE 0 END), 0)
        FROM projection_thread_activities AS activities
        JOIN projection_threads AS threads USING (thread_id)
        JOIN ranked_projects AS projects USING (project_id)
        LEFT JOIN projection_turns AS turns
          ON turns.thread_id = activities.thread_id AND turns.turn_id = activities.turn_id
        WHERE projects.deleted_at IS NULL
          AND julianday(activities.created_at) >= julianday('now', '-7 days')
          AND julianday(activities.created_at) <= julianday('now', '+5 minutes')
        GROUP BY projects.project_id
        "#,
    )?;
    let project_coverage = project_coverage_statement
        .query_map([], |row| {
            Ok((
                project_key(&row.get::<_, String>(0)?),
                ActivityCoverage {
                    total: row.get(1)?,
                    attributed_to_turn: row.get(2)?,
                    thread_level: row.get(3)?,
                    unresolved_turn: row.get(4)?,
                },
            ))
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    for (key, coverage) in project_coverage {
        if let Some(project) = projects.iter_mut().find(|project| project.key == key) {
            project.activity_coverage = coverage;
        }
    }

    drop(project_coverage_statement);
    drop(project_activity_statement);
    drop(project_daily_statement);
    drop(project_statement);
    drop(activity_statement);
    drop(daily_statement);
    transaction.commit()?;

    let terminal_turns = summary_row.6 + summary_row.7 + summary_row.8;
    let completion_rate = if terminal_turns == 0 {
        None
    } else {
        Some(summary_row.6 as f64 / terminal_turns as f64)
    };
    let freshness = summary_row.15.as_deref().and_then(source_freshness_seconds);

    Ok(Dashboard {
        snapshot: Snapshot {
            contract_version: 2,
            generated_at: Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true),
            source_latest_at: summary_row.15,
            source_event_sequence,
            projection_sequence,
            projection_lag: source_event_sequence.saturating_sub(projection_sequence),
            source_freshness_seconds: freshness,
            window_days: WINDOW_DAYS,
        },
        summary: Summary {
            current_projects: summary_row.0,
            active_projects_24h: summary_row.1,
            active_projects_7d: summary_row.2,
            dormant_projects_30d: summary_row.3,
            turns_requested: summary_row.4,
            turns_previous: summary_row.5,
            turns_completed: summary_row.6,
            turns_error: summary_row.7,
            turns_interrupted: summary_row.8,
            turns_in_flight: summary_row.9,
            active_threads: summary_row.10,
            actionable_plan_threads: summary_row.11,
            current_only_projects: summary_row.12,
            cooling_projects: summary_row.13,
            top_three_turn_share: if summary_row.4 == 0 {
                None
            } else {
                Some(summary_row.14 as f64 / summary_row.4 as f64)
            },
            terminal_completion_rate: completion_rate,
        },
        daily,
        projects,
        activity,
        activity_coverage,
    })
}

fn recency_band(value: Option<&str>) -> String {
    let Some(parsed) = value.and_then(|value| chrono::DateTime::parse_from_rfc3339(value).ok())
    else {
        return "unknown".into();
    };
    let age = Utc::now() - parsed.with_timezone(&Utc);
    if age < Duration::minutes(-5) {
        "invalid"
    } else if age < Duration::days(1) {
        "within-24h"
    } else if age < Duration::days(7) {
        "two-to-seven-days"
    } else if age < Duration::days(30) {
        "eight-to-thirty-days"
    } else {
        "beyond-30d"
    }
    .into()
}

fn project_key(raw_project_id: &str) -> String {
    let mut hasher = blake3::Hasher::new();
    hasher.update(b"t3code-analytics-project-v1\0");
    hasher.update(raw_project_id.as_bytes());
    let digest = hasher.finalize().to_hex();
    format!("project-{}", &digest.as_str()[..16])
}

fn aggregate_activity(rows: Vec<(String, i64)>, turns: i64) -> Vec<ActivityCount> {
    let mut counts: HashMap<&'static str, i64> = HashMap::new();
    for (kind, count) in rows {
        *counts.entry(activity_family(&kind)).or_default() += count;
    }
    let mut families = counts
        .into_iter()
        .map(|(kind, count)| ActivityCount {
            kind: kind.into(),
            count,
            per_hundred_turns: if turns == 0 {
                None
            } else {
                Some(count as f64 * 100.0 / turns as f64)
            },
        })
        .collect::<Vec<_>>();
    families.sort_by(|left, right| {
        right
            .count
            .cmp(&left.count)
            .then(left.kind.cmp(&right.kind))
    });
    families
}

fn activity_family(kind: &str) -> &'static str {
    if kind.starts_with("tool.") {
        "tool lifecycle"
    } else if kind.starts_with("task.") || kind.starts_with("collaboration.") {
        "delegated work"
    } else if kind.contains("plan") {
        "planning"
    } else if kind.contains("context") || kind.contains("compaction") {
        "context management"
    } else if kind.contains("checkpoint") {
        "checkpointing"
    } else if kind.contains("approval") || kind.contains("user-input") {
        "interaction requests"
    } else if kind.contains("error") || kind.contains("failure") {
        "runtime exceptions"
    } else if kind.starts_with("turn.") || kind.starts_with("runtime.") {
        "turn lifecycle"
    } else {
        "other admitted activity"
    }
}

fn source_freshness_seconds(value: &str) -> Option<i64> {
    let parsed = chrono::DateTime::parse_from_rfc3339(value).ok()?;
    let age = Utc::now() - parsed.with_timezone(&Utc);
    if age < Duration::minutes(-5) {
        None
    } else {
        Some(age.num_seconds().max(0))
    }
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
        CREATE TABLE IF NOT EXISTS daily_usage_v2 (
          generated_at VARCHAR NOT NULL,
          day DATE NOT NULL,
          active_projects BIGINT NOT NULL,
          turns_requested BIGINT NOT NULL,
          turns_completed BIGINT NOT NULL,
          turns_error BIGINT NOT NULL,
          turns_interrupted BIGINT NOT NULL,
          active_threads BIGINT NOT NULL,
          PRIMARY KEY (generated_at, day)
        );
        CREATE TABLE IF NOT EXISTS project_rollups (
          generated_at VARCHAR NOT NULL,
          project_key VARCHAR NOT NULL,
          project_title VARCHAR NOT NULL,
          last_work_at VARCHAR,
          recency_band VARCHAR NOT NULL,
          current_threads BIGINT NOT NULL,
          active_threads_7d BIGINT NOT NULL,
          new_threads_7d BIGINT NOT NULL,
          turns_7d BIGINT NOT NULL,
          turns_previous BIGINT NOT NULL,
          turn_share_7d DOUBLE,
          terminal_completion_rate_7d DOUBLE,
          turns_in_flight BIGINT NOT NULL,
          actionable_plan_threads BIGINT NOT NULL,
          activity_count_7d BIGINT NOT NULL,
          thread_level_activity_7d BIGINT NOT NULL,
          unresolved_activity_7d BIGINT NOT NULL,
          PRIMARY KEY (generated_at, project_key)
        );
        CREATE TABLE IF NOT EXISTS project_daily_usage (
          generated_at VARCHAR NOT NULL,
          project_key VARCHAR NOT NULL,
          day DATE NOT NULL,
          turns_requested BIGINT NOT NULL,
          active_threads BIGINT NOT NULL,
          PRIMARY KEY (generated_at, project_key, day)
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
        transaction.execute(
            "INSERT INTO daily_usage_v2
              (generated_at, day, active_projects, turns_requested, turns_completed, turns_error, turns_interrupted, active_threads)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            duck_params![
                dashboard.snapshot.generated_at,
                row.day,
                row.active_projects,
                row.turns_requested,
                row.turns_completed,
                row.turns_error,
                row.turns_interrupted,
                row.active_threads,
            ],
        )?;
    }
    for row in &dashboard.activity {
        transaction.execute(
            "INSERT INTO activity_breakdown VALUES (?, ?, ?)",
            duck_params![dashboard.snapshot.generated_at, row.kind, row.count],
        )?;
    }
    for project in &dashboard.projects {
        transaction.execute(
            "INSERT INTO project_rollups
              (generated_at, project_key, project_title, last_work_at, recency_band,
               current_threads, active_threads_7d, new_threads_7d, turns_7d, turns_previous,
               turn_share_7d, terminal_completion_rate_7d, turns_in_flight,
               actionable_plan_threads, activity_count_7d, thread_level_activity_7d,
               unresolved_activity_7d)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            duck_params![
                dashboard.snapshot.generated_at,
                project.key,
                project.title,
                project.last_work_at,
                project.recency_band,
                project.current_threads,
                project.active_threads_7d,
                project.new_threads_7d,
                project.turns_7d,
                project.turns_previous,
                project.turn_share_7d,
                project.terminal_completion_rate_7d,
                project.turns_in_flight,
                project.actionable_plan_threads,
                project.activity_coverage.total,
                project.activity_coverage.thread_level,
                project.activity_coverage.unresolved_turn,
            ],
        )?;
        for day in &project.daily {
            transaction.execute(
                "INSERT INTO project_daily_usage
                  (generated_at, project_key, day, turns_requested, active_threads)
                 VALUES (?, ?, ?, ?, ?)",
                duck_params![
                    dashboard.snapshot.generated_at,
                    project.key,
                    day.day,
                    day.turns_requested,
                    day.active_threads,
                ],
            )?;
        }
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
        "DELETE FROM daily_usage_v2 WHERE generated_at < ?",
        duck_params![retention_cutoff],
    )?;
    transaction.execute(
        "DELETE FROM project_daily_usage WHERE generated_at < ?",
        duck_params![retention_cutoff],
    )?;
    transaction.execute(
        "DELETE FROM project_rollups WHERE generated_at < ?",
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
            CREATE TABLE orchestration_events (
              sequence INTEGER PRIMARY KEY,
              occurred_at TEXT NOT NULL
            );
            CREATE TABLE projection_state (
              projector TEXT PRIMARY KEY,
              last_applied_sequence INTEGER NOT NULL
            );
            CREATE TABLE projection_turns (
              row_id TEXT NOT NULL,
              thread_id TEXT NOT NULL,
              turn_id TEXT,
              state TEXT NOT NULL,
              requested_at TEXT NOT NULL,
              started_at TEXT,
              completed_at TEXT
            );
            CREATE TABLE projection_projects (
              project_id TEXT NOT NULL,
              title TEXT NOT NULL,
              created_at TEXT NOT NULL,
              deleted_at TEXT
            );
            CREATE TABLE projection_threads (
              thread_id TEXT NOT NULL,
              project_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              deleted_at TEXT,
              has_actionable_proposed_plan INTEGER NOT NULL
            );
            CREATE TABLE projection_thread_activities (
              activity_id TEXT NOT NULL,
              thread_id TEXT NOT NULL,
              turn_id TEXT,
              kind TEXT NOT NULL,
              created_at TEXT NOT NULL,
              payload_json TEXT NOT NULL,
              summary TEXT NOT NULL
            );
            "#,
        )?;
        let now = Utc::now().to_rfc3339();
        source.execute(
            "INSERT INTO orchestration_events VALUES (12, ?)",
            params![now],
        )?;
        source.execute(
            "INSERT INTO projection_state VALUES ('projection.turns', 12)",
            [],
        )?;
        source.execute(
            "INSERT INTO projection_projects VALUES ('raw-project-alpha', 'Analytics', ?, NULL)",
            params![now],
        )?;
        source.execute(
            "INSERT INTO projection_projects VALUES ('raw-project-deleted', 'Deleted', ?, ?)",
            params![now, now],
        )?;
        source.execute(
            "INSERT INTO projection_threads VALUES ('work-object-alpha', 'raw-project-alpha', ?, NULL, 1)",
            params![now],
        )?;
        source.execute(
            "INSERT INTO projection_threads VALUES ('work-object-beta', 'raw-project-alpha', ?, NULL, 0)",
            params![now],
        )?;
        source.execute(
            "INSERT INTO projection_threads VALUES ('work-object-old', 'raw-project-alpha', ?, NULL, 0)",
            params![now],
        )?;
        source.execute(
            "INSERT INTO projection_threads VALUES ('work-object-deleted', 'raw-project-deleted', ?, NULL, 0)",
            params![now],
        )?;
        source.execute(
            "INSERT INTO projection_turns VALUES ('row-alpha', ?, 'turn-alpha', 'completed', ?, ?, ?)",
            params!["work-object-alpha", now, now, now],
        )?;
        source.execute(
            "INSERT INTO projection_turns VALUES ('row-beta', ?, 'turn-beta', 'error', ?, ?, ?)",
            params!["work-object-beta", now, now, now],
        )?;
        let outside_current_window =
            (Utc::now() - Duration::days(7) - Duration::hours(1)).to_rfc3339();
        source.execute(
            "INSERT INTO projection_turns VALUES ('row-old', ?, 'turn-old', 'completed', ?, ?, ?)",
            params![
                "work-object-old",
                outside_current_window,
                outside_current_window,
                outside_current_window
            ],
        )?;
        source.execute(
            "INSERT INTO projection_turns VALUES ('row-deleted', ?, 'turn-deleted', 'completed', ?, ?, ?)",
            params!["work-object-deleted", now, now, now],
        )?;
        source.execute(
            "INSERT INTO projection_thread_activities VALUES ('activity-alpha', 'work-object-alpha', 'turn-alpha', 'tool.started', ?, ?, ?)",
            params![now, "private-payload-marker", "private-summary-marker"],
        )?;
        source.execute(
            "INSERT INTO projection_thread_activities VALUES ('activity-beta', 'work-object-alpha', NULL, 'turn.plan.updated', ?, ?, ?)",
            params![now, "private-payload-marker", "private-summary-marker"],
        )?;
        source.execute(
            "INSERT INTO projection_thread_activities VALUES ('activity-gamma', 'work-object-alpha', 'missing-turn', 'runtime.error', ?, ?, ?)",
            params![now, "private-payload-marker", "private-summary-marker"],
        )?;
        drop(source);

        let dashboard = extract_and_persist(&source_path, &analytics_path)?;
        assert_eq!(dashboard.summary.turns_requested, 2);
        assert_eq!(dashboard.summary.turns_completed, 1);
        assert_eq!(dashboard.summary.turns_error, 1);
        assert_eq!(dashboard.summary.current_projects, 1);
        assert_eq!(dashboard.summary.turns_requested, 2);
        assert_eq!(dashboard.summary.turns_previous, 1);
        assert_eq!(dashboard.projects.len(), 1);
        assert_eq!(dashboard.projects[0].title, "Analytics");
        assert_eq!(dashboard.projects[0].daily.len(), 42);
        assert_eq!(dashboard.activity_coverage.attributed_to_turn, 1);
        assert_eq!(dashboard.activity_coverage.thread_level, 1);
        assert_eq!(dashboard.activity_coverage.unresolved_turn, 1);
        assert_eq!(dashboard.activity[0].kind, "planning");
        assert!(dashboard.projects[0].key.starts_with("project-"));
        assert_eq!(dashboard.projects[0].key, project_key("raw-project-alpha"));

        let published = serde_json::to_string(&dashboard)?;
        assert!(!published.contains("private-payload-marker"));
        assert!(!published.contains("private-summary-marker"));
        assert!(!published.contains("work-object-alpha"));
        assert!(!published.contains("raw-project-alpha"));

        let cached = load_latest(&analytics_path)?.expect("cached snapshot");
        assert_eq!(cached.snapshot.source_event_sequence, 12);

        let source = Connection::open(&source_path)?;
        source.execute("UPDATE projection_state SET last_applied_sequence = 11", [])?;
        drop(source);
        let rejected = extract(&source_path).expect_err("projection lag must reject publication");
        assert!(rejected.to_string().contains("behind"));
        Ok(())
    }
}
