# Analytics Platform Landscape

## Research Question

Which platform ideas help T3Code turn existing operational data into trustworthy usage analytics without prematurely adding a dashboard, duplicating event truth, or exporting sensitive content?

## Evaluation Frame

The relevant platform is not one product. It is a chain of responsibilities:

1. Event and telemetry contracts
2. Source access and extraction
3. Durable analytical storage
4. Transformation and semantic modeling
5. Data quality and lineage
6. Query serving
7. Presentation

T3Code already implements meaningful parts of the first layer and its operational source layer. The near-term decision is how to extract and model safely, not which chart library to use.

## Reference Findings

### OpenTelemetry

OpenTelemetry gives T3Code a vendor-neutral contract for traces and metrics. Its signal model explicitly separates traces, metrics, and logs because each answers a different kind of question. Metrics are aggregated runtime measurements, while traces retain request paths and causal context. OpenTelemetry also warns that high-cardinality labels such as user identifiers or raw paths create unbounded metric state.

T3Code already emits optional OTLP traces and metrics. This should remain the operational health lane. Product facts such as one durable turn, one thread, or one command outcome should continue to come from the orchestration store rather than being reconstructed from sampled or aggregated telemetry.

Evidence:

- [OpenTelemetry signals](https://opentelemetry.io/docs/concepts/signals/)
- [OpenTelemetry metrics and cardinality](https://opentelemetry.io/docs/concepts/signals/metrics/)
- `t3code:apps/server/src/observability/Layers/Observability.ts`
- `t3code:apps/server/src/observability/Metrics.ts`

Disposition: adopt as the operational telemetry contract, not as the sole product analytics source.

### Snowplow

Snowplow is valuable here as a tracking governance reference. Its tracking plans group event specifications by domain and owner. Self-describing events carry schemas and are validated before good records reach storage. Its design guidance starts from decisions and events rather than from arbitrary click capture.

T3Code already has schema-backed canonical events and a durable event spine. Installing Snowplow now would add another collector and event authority before a concrete gap proves the need. The useful lesson is to create tracking plans, owners, schemas, and validation rules inside this repository.

Evidence:

- [Snowplow tracking plans](https://docs.snowplow.io/docs/event-studio/tracking-plans/)
- [Snowplow tracking design](https://docs.snowplow.io/docs/fundamentals/tracking-design-best-practice/)
- [Snowplow self-describing events](https://docs.snowplow.io/docs/sources/trackers/javascript-trackers/web-tracker/custom-tracking-using-schemas/)

Disposition: borrow the governance model and defer the platform.

### DuckDB and Parquet

DuckDB can query SQLite directly and can read and write Parquet with filter and projection pushdown. Parquet provides a portable compressed columnar boundary. This combination fits a single-host exploratory program whose source database is SQLite and whose first consumers are repeatable SQL models and quality checks.

Directly attaching the live T3Code database is too permissive because the SQLite extension supports writes and shares SQLite locking behavior. The first slice should operate on a verified consistent snapshot, open it read only, allowlist fields, and emit partitioned Parquet plus a manifest. DuckDB remains a processing and exploration engine rather than the source of truth.

Evidence:

- [DuckDB SQLite extension](https://duckdb.org/docs/current/core_extensions/sqlite)
- [DuckDB Parquet support](https://duckdb.org/docs/current/data/parquet/overview)
- [DuckDB read-only attachment](https://duckdb.org/docs/stable/sql/statements/attach)

Disposition: provisional first-slice engine and artifact format.

### Axiom

Axiom accepts OpenTelemetry logs, traces, and metrics and recommends separating datasets by signal type and environment. It is optimized for timestamped machine data, observability queries, dashboards, and alerts. T3Code already contains Axiom-oriented relay observability configuration, while the hosted server currently has no active OTLP export configuration.

Axiom is a strong candidate for the operational lane and perhaps privacy-safe timestamped analytical events later. It should not receive raw provider logs or unrestricted trace attributes. It also should not become the only home of conformed facts until repeatable export, retention, cost, and deletion behavior are accepted.

Evidence:

- [Axiom OpenTelemetry ingestion](https://axiom.co/docs/send-data/opentelemetry)
- [Axiom dataset organization](https://axiom.co/docs/reference/datasets)
- [Axiom observability model](https://axiom.co/docs/getting-started-guide/observability)
- `t3code:infra/relay/src/observability.ts`

Disposition: retain as the leading operational backend candidate and evaluate separately from product fact storage.

### PostHog

PostHog combines product analytics, event exploration, warehouse connections, session replay, feature flags, and dashboards. That breadth is attractive once T3Code has settled product questions and approved event contracts.

Its default center of gravity is user and product event analysis. T3Code already has durable server-side behavior events and unusually sensitive interaction content. Adding PostHog before field admission and metric semantics are settled risks duplicate tracking, identity drift, and accidental content export.

Evidence:

- [PostHog platform overview](https://posthog.com/)

Disposition: defer until a validated question requires interactive product analytics that conformed facts cannot answer cleanly.

### ClickHouse

ClickHouse is a later OLAP candidate for high ingest volume, concurrent dashboards, or retention at a scale that exceeds a single-host analytical file workflow. Current product event volume does not establish that need. Raw provider logs are large, but volume alone does not make them admissible or analytically useful.

ClickHouse documents itself as a storage engine rather than an out-of-the-box observability product and recommends pairing it with a collector and presentation layer. Its own guidance positions the system for medium to very large volumes and notes that smaller volumes may not justify the ecosystem cost.

Evidence:

- [ClickHouse observability guidance](https://clickhouse.com/docs/guides/use-cases/observability/build-your-own/introduction)

Disposition: defer until benchmark evidence shows query concurrency, retention, or ingestion limits in the smaller architecture.

### Transformation Frameworks

Tools such as dbt become valuable when multiple models, consumers, and environments need dependency management, documentation, tests, and lineage. The first slice can prove the model with versioned SQL and explicit assertions. Introducing a transformation framework before repeated model ownership appears would add runtime and packaging surface without improving the first proof.

Disposition: defer until repeated model execution or a second real consumer appears.

### Presentation Platforms

Grafana, Metabase, Superset, PostHog dashboards, and a custom T3Code-native interface remain presentation candidates. They are intentionally unranked in this pass. The choice depends on the accepted query serving layer, concurrency, authentication, drill-down needs, and whether operational and product views should share a surface.

Disposition: no selection before conformed facts and metric contracts pass real data checks.

## Recommended Architecture Posture

Use two coordinated but separate lanes.

The product analytics lane begins with the T3Code orchestration store, creates privacy-safe conformed facts, and preserves exact source lineage. It favors stable facts such as turns, activities, command outcomes, token snapshots, and release intervals.

The operational lane uses OpenTelemetry for latency, rates, errors, runtime resources, and causal traces. Axiom or another OTLP backend may retain those signals. Operational telemetry may explain product outcomes, but it does not redefine them.

Both lanes may share pseudonymous correlation keys only after a field-level privacy review. Neither lane admits raw content by default.

## Decision Summary

| Capability | Provisional choice | Why now | Trigger to revisit |
| --- | --- | --- | --- |
| Product source truth | T3Code orchestration events and projections | Already durable and semantically close to behavior | Event contract no longer supports required facts |
| Extraction engine | DuckDB over a consistent read-only SQLite snapshot | Small, SQL-native, and suited to current scale | Snapshot time or transformation cost exceeds accepted window |
| Analytical artifact | Partitioned Parquet with run manifest | Portable, inspectable, and columnar | Concurrent serving or mutation needs become real |
| Operational contract | OpenTelemetry | Already implemented and vendor neutral | Unsupported signal or semantic gap appears |
| Operational backend | Axiom candidate | Existing integration direction and full OTLP signal support | Retention, privacy, cost, or query needs fail evaluation |
| Product analytics suite | Deferred | Would duplicate current event capture | Validated interactive analysis need exceeds modeled facts |
| Transformation framework | Deferred | One bounded model family first | Repeated runs and consumers create real dependency pressure |
| Presentation layer | Deferred | Meaning and serving contracts are not yet accepted | Conformed facts pass quality gates and have an authorized consumer |
