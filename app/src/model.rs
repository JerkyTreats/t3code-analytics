use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Dashboard {
    pub snapshot: Snapshot,
    pub summary: Summary,
    pub daily: Vec<DailyUsage>,
    pub activity: Vec<ActivityCount>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
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
    pub turns_requested: i64,
    pub turns_completed: i64,
    pub turns_error: i64,
    pub turns_interrupted: i64,
    pub turns_in_flight: i64,
    pub stale_in_flight: i64,
    pub active_threads: i64,
    pub active_days: i64,
    pub terminal_completion_rate: Option<f64>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyUsage {
    pub day: String,
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
}
