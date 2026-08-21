# T3Code Analytics

T3Code Analytics exists to make T3Code usage understandable without turning raw interaction data into a surveillance system.

The repository starts below the dashboard layer. It first establishes what T3Code produces, which records are authoritative, which fields are safe to admit, how facts relate, where semantics are incomplete, and which decisions a metric can support. Presentation work begins only after those contracts survive real extraction and quality checks.

## Current Finding

T3Code already has a valuable analytical spine. Its hosted instance retains an append-only orchestration event stream, query projections, structured activity and token snapshots, local traces, provider event logs, and access records. The main gap is not event capture. The gap is a privacy-safe, repeatable, documented read path that turns operational records into stable analytical facts.

The first data implementation is now a bounded Rust service that opens T3Code SQLite through a read-only mount, holds one consistent read transaction, admits only allowlisted aggregate fields, and publishes accepted snapshots into embedded DuckDB. Axum serves the aggregate API and internal dashboard from the same process. Parquet remains a later portability option. OpenTelemetry and Prometheus remain the operational telemetry direction. Lakebed informed the interaction contract but is no longer on the production path.

## Information Hierarchy

1. Source truth records what T3Code actually committed or emitted.
2. Admitted records copy only approved fields with source lineage and extraction metadata.
3. Conformed facts establish stable grain, time semantics, keys, and dimensions.
4. Measures define reusable counts, rates, durations, distributions, and coverage.
5. Analytical questions combine measures into decision-oriented views.
6. Presentation renders accepted views without redefining their meaning.

Each layer may narrow or derive from the layer above it. No downstream layer may silently repair, invent, or reinterpret upstream truth.

## Repository Map

- [Data accessibility assessment](assessment/2026-08-20/data-accessibility.md) maps current domains, source seams, risks, and the frozen affected set.
- [Lakebed and homelab reconciliation](assessment/2026-08-20/lakebed-homelab-reconciliation.md) resolves hosting, Kubernetes, persistence, origin, and operational fit with live and experimental evidence.
- [Source registry](catalog/sources.yaml) records authority, grain, cadence, sensitivity, and disposition for each known source.
- [Metric catalog](catalog/metrics.yaml) records candidate metric buckets, definitions, coverage, and explicit exclusions.
- [Platform landscape](research/platform-landscape.md) compares instrumentation, transformation, storage, observability, product analytics, and later presentation options.
- [Lakebed experiment reflection](research/lakebed-experiment-reflection.md) records the bootstrap process, observed friction, architectural fit, and constructive product feedback.
- [Lakebed analytics capsule](experiments/lakebed-analytics/README.md) contains the synthetic publication model, analytical client, and coherent-reader stress check.
- [Rust analytics service](app/README.md) contains the read-only extraction pipeline, DuckDB publication store, aggregate API, dashboard, and runtime health surface.
- [Delivery ledger](.ledger/t3code-analytics-bootstrap.md) preserves maturity, authority, phases, gates, and the proposed first implementation slice.

## Present Boundary

The repository contains design evidence, one isolated Lakebed experiment, and one implemented Rust analytics service. The service has passed synthetic privacy tests, live read-only extraction, hardened container execution, and desktop plus mobile visual inspection. Kubernetes and hostname deployment are the remaining active delivery steps. No raw data is stored in this repository.
