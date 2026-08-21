use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Dashboard {
    pub snapshot: Snapshot,
    pub summary: Summary,
    pub daily: Vec<DailyUsage>,
    pub projects: Vec<ProjectRollup>,
    pub activity: Vec<ActivityCount>,
    pub activity_coverage: ActivityCoverage,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub contract_version: u16,
    pub generated_at: String,
    pub source_latest_at: Option<String>,
    pub source_event_sequence: i64,
    pub projection_sequence: i64,
    pub projection_lag: i64,
    pub source_freshness_seconds: Option<i64>,
    pub window_days: u16,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub current_projects: i64,
    pub active_projects_24h: i64,
    pub active_projects_7d: i64,
    pub dormant_projects_30d: i64,
    pub turns_requested: i64,
    pub turns_previous: i64,
    pub turns_completed: i64,
    pub turns_error: i64,
    pub turns_interrupted: i64,
    pub turns_in_flight: i64,
    pub active_threads: i64,
    pub actionable_plan_threads: i64,
    pub current_only_projects: i64,
    pub cooling_projects: i64,
    pub top_three_turn_share: Option<f64>,
    pub terminal_completion_rate: Option<f64>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyUsage {
    pub day: String,
    pub active_projects: i64,
    pub turns_requested: i64,
    pub turns_completed: i64,
    pub turns_error: i64,
    pub turns_interrupted: i64,
    pub active_threads: i64,
    pub tool_starts: i64,
    pub tool_completions: i64,
    pub runtime_errors: i64,
    pub plan_updates: i64,
    pub checkpoints: i64,
    pub compactions: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityCount {
    pub kind: String,
    pub count: i64,
    pub per_hundred_turns: Option<f64>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRollup {
    pub key: String,
    pub title: String,
    pub created_at: String,
    pub last_work_at: Option<String>,
    pub recency_band: String,
    pub current_threads: i64,
    pub active_threads_7d: i64,
    pub new_threads_7d: i64,
    pub turns_7d: i64,
    pub turns_previous: i64,
    pub turn_share_7d: Option<f64>,
    pub turns_completed_7d: i64,
    pub turns_error_7d: i64,
    pub turns_interrupted_7d: i64,
    pub terminal_completion_rate_7d: Option<f64>,
    pub turns_in_flight: i64,
    pub actionable_plan_threads: i64,
    pub thread_recency: ThreadRecency,
    pub daily: Vec<ProjectDailyUsage>,
    pub activity: Vec<ActivityCount>,
    pub activity_coverage: ActivityCoverage,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDailyUsage {
    pub day: String,
    pub turns_requested: i64,
    pub active_threads: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreadRecency {
    pub within_24h: i64,
    pub within_7d: i64,
    pub within_30d: i64,
    pub beyond_30d: i64,
    pub unknown: i64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityCoverage {
    pub total: i64,
    pub attributed_to_turn: i64,
    pub thread_level: i64,
    pub unresolved_turn: i64,
}
