# T3Code Analytics Service

This is one Rust service for privacy-safe T3Code aggregate analytics. Its product model follows the T3Code hierarchy from project to thread to turn and then to attributed or thread-level activity.

The service opens the source SQLite database with explicit read-only flags over a read-only filesystem mount. Each refresh holds one SQLite read transaction while it computes allowlisted aggregate facts. Project titles are published only on the private internal dashboard under the explicit 2026-08-21 user direction. It never selects message text, activity summaries, activity payloads, paths, repository fields, branches, worktrees, account fields, client fields, session fields, or network values.

Accepted portfolio, project-rollup, project-day, activity, and source-quality facts are published atomically into an embedded DuckDB file and cached in memory for the JSON API. The dashboard, project drilldown, API, health endpoints, and Prometheus metrics are served by the same Axum process.

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

DuckDB retains aggregate snapshots, project rollups, and project-day facts for 90 days. Parquet remains a later export option and is not required by the running service.

## Metric Windows

The primary monitoring window is a rolling seven days compared with the immediately preceding equal window. The trend view materializes every UTC date across the latest 42 days. Zero represents a measured-empty day only after the coherent read and projection cursor checks succeed.

Project recency uses the latest admitted turn lifecycle or thread activity timestamp. Generic metadata update times do not count as work. Activity rates are normalized per one hundred requested turns and preserve thread-level or unresolved turn attribution as explicit coverage facts.
