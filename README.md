# T3Code Analytics

T3Code Analytics exists to make T3Code usage understandable without turning raw interaction data into a surveillance system.

The repository starts below the dashboard layer. It first establishes what T3Code produces, which records are authoritative, which fields are safe to admit, how facts relate, where semantics are incomplete, and which decisions a metric can support. Presentation work begins only after those contracts survive real extraction and quality checks.

## Current Finding

T3Code already has a valuable analytical spine. Its hosted instance retains an append-only orchestration event stream, query projections, structured activity and token snapshots, local traces, provider event logs, and access records. The main gap is not event capture. The gap is a privacy-safe, repeatable, documented read path that turns operational records into stable analytical facts.

The recommended first implementation is a bounded exporter that reads a consistent SQLite snapshot, admits only allowlisted fields, creates conformed fact tables, and writes a run manifest plus quality results. DuckDB and Parquet are the provisional exploration tools. OpenTelemetry remains the operational telemetry contract. No dashboard platform has been selected.

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
- [Source registry](catalog/sources.yaml) records authority, grain, cadence, sensitivity, and disposition for each known source.
- [Metric catalog](catalog/metrics.yaml) records candidate metric buckets, definitions, coverage, and explicit exclusions.
- [Platform landscape](research/platform-landscape.md) compares instrumentation, transformation, storage, observability, product analytics, and later presentation options.
- [Delivery ledger](.ledger/t3code-analytics-bootstrap.md) preserves maturity, authority, phases, gates, and the proposed first implementation slice.

## Present Boundary

The repository currently contains design evidence only. It has no raw data, extractor, model runtime, database, scheduler, service, dashboard, deployment, or DNS record.
