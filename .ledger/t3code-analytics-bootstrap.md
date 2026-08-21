# T3Code Analytics Bootstrap Ledger

Date: 2026-08-20
Mode: design-with-completed-feasibility-and-hosting-assessment
Readiness: build-ready

## Objective And Direct Product Proof

Objective: create a trustworthy analytical path from T3Code source records to decision-ready usage metrics, then expose accepted views at the internal metrics hostname.

Direct product proof for the first implementation slice: one command can process a verified consistent snapshot of T3Code state, emit only approved fields into conformed analytical facts, produce a manifest and quality report, and answer the frozen baseline queries reproducibly without reading message or tool content.

The internal dashboard is a later consumer. It is not proof for the first slice.

## Current Ground

- T3Code persists append-only orchestration events and command receipts in SQLite.
- Rebuildable projections expose projects, threads, messages, activities, sessions, turns, approvals, and plans.
- Canonical provider activity retains tool lifecycle, task lifecycle, runtime errors, plans, checkpoints, and token snapshots.
- Raw provider logs and trace records contain fields that are too sensitive for default analytical admission.
- Runtime metrics have no local historical persistence and the hosted service has no active OTLP export configuration.
- The live source has meaningful history beginning in March 2026.

Evidence:

- `t3code:apps/server/src/config.ts`
- `t3code:apps/server/src/persistence/Migrations.ts`
- `t3code:apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.ts`
- `t3code:apps/server/src/observability/Metrics.ts`
- `live-observation:2026-08-20`

## Maturity Envelope

```yaml
maturity:
  posture: exploratory
  obligation_floor: operational
  confidence: high-for-source-shape-medium-for-metric-semantics
  evidence:
    - live-durable-sensitive-data
    - one-hosted-consumer
    - existing-event-and-observability-contracts
    - no-proven-analytics-consumer-yet
  user_override: yolo-rust-dashboard-duckdb-kubernetes-and-internal-hostname-authorized
  direct_product_proof: internal-https-dashboard-serving-privacy-safe-live-aggregate-snapshot
  hard_limits:
    new_crates: one-rust-service-authorized
    new_durable_stores: one-embedded-duckdb-store-authorized
    new_cross_domain_protocols: forbidden-without-approval
    new_workspace_dependencies: one-standalone-cargo-package-authorized
    parallel_implementors: one
    t3code_mutation: forbidden-without-separate-slice
    raw_content_export: forbidden
    live_database_writes: forbidden
    production_dashboard_work: forbidden-before-data-proof
  tripwires:
    changed_files: 24
    added_lines: 2500
    note: accepted-by-yolo-override-for-active-slice
  investigation_budget:
    inspection_calls: 12
    source_files_beyond_named_design_and_policy: 20
  approval_gates:
    - active-slice-authorized
    - approve-t3code-instrumentation-change
    - approve-query-service-and-hostname
  review_budget:
    review_owner: root-agent
    reviewer_lanes: 1
    initial_passes: 1
    verification_passes: 1
    reviewer_inspection_calls: 8
    reviewer_additional_source_files: 12
```

The posture is exploratory because no analytical path or real analytical consumer exists. The obligation floor is operational because the initiative touches live durable records that include sensitive content and access metadata.

## Current Product Trace

```text
User or provider action
  -> T3Code canonical event or runtime signal
  -> SQLite event store and projections or local telemetry
  -> missing governed extraction boundary
  -> missing conformed facts and quality results
  -> missing accepted metric views
  -> later internal presentation
```

The smallest missing connective behavior is the governed extraction boundary.

## Frozen Affected Domain Set

- orchestration
- provider-runtime
- persistence
- observability
- web-client
- desktop-and-mobile-clients
- auth-and-access
- project-and-source-control
- terminal-and-process
- preview-and-mcp
- relay-and-mobile-cloud
- deployment-operations
- analytics-governance

The frozen set comes from [the data accessibility assessment](../assessment/2026-08-20/data-accessibility.md).

## Authorized Active Slice

Status: in progress

Product increment: one Rust service reads the live T3Code SQLite source through an operating-system-enforced read-only Kubernetes mount, computes allowlisted aggregates inside one consistent SQLite read transaction, publishes the latest accepted snapshot into one embedded DuckDB file, and serves an internal dashboard over valid HTTPS.

Owned analytics change scope:

- one standalone Cargo package
- one embedded dashboard and JSON API
- one DuckDB schema for aggregate snapshots
- one background refresh loop inside the service process
- synthetic SQLite fixtures and Rust tests
- one container build workflow

Owned infrastructure change scope:

- one dedicated namespace
- one single-replica Deployment
- one ClusterIP Service
- one local-path PVC
- one read-only hostPath source mount on the single Leviathan node
- one ServiceMonitor
- one Argo application
- one internal `PublishedService`

Direct acceptance evidence:

- source volume is read only at the container boundary
- SQLite opens with explicit read-only flags and query-only mode
- no query selects content, payload, path, account, client, session, network, or credential fields
- one transaction produces summary, daily, activity, and source-health facts
- DuckDB contains only aggregate rows and reviewed snapshot JSON
- synthetic fixture tests prove aggregation and exclusion behavior
- the container runs as non-root with a read-only root filesystem
- Argo reports the workload and internal-web applications healthy and synced
- the requested hostname resolves through shared Caddy
- the shared certificate covers the hostname and validates without an insecure curl flag
- the dashboard and health endpoints return HTTP 200

Stop conditions:

- source access requires a write-capable mount or connection
- any raw content or protected topology field reaches an artifact or response
- source snapshot consistency cannot be held across the aggregate query set
- more than one new service or durable store becomes necessary
- the active slice crosses 24 changed files or 2500 added lines
- a public route or T3Code runtime change becomes necessary

The completed design slice created this repository, the source registry, metric catalog, platform research, domain assessment, and program ledger. It did not alter T3Code or create runtime infrastructure.

The user separately authorized and completed a bounded local Lakebed feasibility experiment. That experiment created an isolated capsule with synthetic fixtures, one protected local loader endpoint, one reactive analytical query, a Preact client, and a coherent-reader stress check. It did not access T3Code source data, create a hosted deployment, or activate P1.

The user then authorized a read-only Lakebed and homelab reconciliation. Delegated spikes inspected the published runtime, live cluster seams, and temporary proxy behavior. The assessment found that the cluster can host a conventional analytics app, while Lakebed `0.0.29` does not supply the durable self-host runtime, persistence, recovery, custom-origin, and operations contracts needed to run as a cluster-owned production service. No infrastructure or hosted state changed.

## Proposed First Slice

Status: awaiting approval

Product increment: a local privacy-safe baseline export from a consistent T3Code SQLite snapshot.

Owned change scope:

- extractor command in this repository
- versioned allowlist and pseudonymization policy
- conformed facts for dates, releases, threads, turns, activities, token snapshots, and command outcomes
- extraction manifest
- quality assertions
- fixture-based tests with synthetic records
- one reproducible baseline report

Existing seams:

- append-only `orchestration_events`
- command receipts
- projection turns
- projection activities
- projection threads
- DuckDB SQLite and Parquet support

Acceptance evidence:

- source is a consistent snapshot and is opened read only
- no source path can be mutated
- raw content and protected fields are absent from outputs
- source counts reconcile with documented exclusions
- event sequence gaps are reported
- conformed grains are unique
- foreign key orphans are reported
- token snapshot coverage is explicit
- a second run over the same snapshot produces identical facts and manifest content except run timestamps
- baseline queries match independently checked aggregate source observations

Stop conditions:

- any protected field appears in output
- snapshot acquisition cannot be proven consistent
- token semantics require summing cumulative values without provider-specific validation
- the slice needs a scheduler, service, network endpoint, or T3Code code change
- provisional tripwires are crossed

## Uncommitted Backlog

| Phase | Increment | Status | Dependency | Activation evidence |
| --- | --- | --- | --- | --- |
| P0 | Lakebed last-mile feasibility with synthetic snapshots | complete | Reviewed privacy boundary | User authorization on 2026-08-20 |
| P0R | Lakebed hosting and homelab reconciliation | complete | P0 capsule and read-only cluster access | User authorization on 2026-08-20 |
| P1 | Privacy-safe Rust snapshot service and baseline dashboard | in progress | Accepted envelope | User YOLO authorization on 2026-08-20 |
| P2 | Versioned analytical models and metric views | backlog | P1 complete | Reconciled facts and settled token semantics |
| P3 | Recurring extraction, retention, and freshness monitoring | backlog | P2 complete | Repeated manual runs and real freshness need |
| P4 | Query-serving boundary and internal authentication | partially activated by YOLO slice | P1 aggregate contract | Internal service authorization |
| P5 | Internal dashboard and hostname | partially activated by YOLO slice | P1 aggregate contract | Internal hostname authorization |

## Architectural Expansion Decisions

| Proposal | Product behavior unblocked | Existing approach considered | Current consumers | Authority | Disposition |
| --- | --- | --- | --- | --- | --- |
| DuckDB process dependency | Durable aggregate snapshots and analytical SQL | In-memory snapshot only | Internal dashboard | User-authorized P1 | accepted |
| Parquet analytical artifacts | Portable conformed facts | DuckDB-only file | None | Not required for direct proof | deferred |
| Dedicated analytical store | Concurrent historical queries | Parquet and local DuckDB | None | Not authorized | deferred |
| Scheduler | Automatic freshness | In-process refresh loop | Internal dashboard | User-authorized P1 | accepted-inside-service |
| T3Code analytics events | Missing client or semantic events | Existing orchestration and telemetry | None | Not authorized | deferred |
| Query service | Multi-user internal access | Static local report | Internal dashboard | User-authorized P1 | accepted |
| Internal hostname | Browser access to accepted views | Local report | Internal dashboard | User-authorized P1 | accepted |
| Lakebed feasibility capsule | Atomic materialized snapshot publication and reactive presentation | Static report only | Experiment owner | User-authorized P0 | passed-locally |
| Lakebed self-hosting | Durable cluster-owned Lakebed runtime | Lakebed hosted plane or conventional internal app | None | Read-only assessment only | blocked-by-runtime-contract |
| Internal analytics hostname | Browser access to a stable backend | No route until a durable backend exists | None | Not authorized | correctly-absent |

## Review State

Review owner: root agent

Initial design findings:

- Raw provider logs are large but are not safe or necessary first-slice inputs.
- Token usage snapshots exist but cover only part of historical turns and may mix cumulative and incremental meanings.
- Runtime metrics are not historically retained on the hosted instance.
- Trace attributes can contain query text, paths, URLs, and embedded event detail.
- Projection tables are convenient but rebuildable and must not silently outrank committed event truth.
- A dashboard-first implementation would conceal missing contracts and coverage.

Verification result: passed.

Verification evidence:

- both YAML catalogs parse successfully
- every `t3code:` and `analytics:` evidence path resolves
- raw database, Parquet, NDJSON, log, environment, data, and export artifacts are ignored by Git
- publication scan found no local paths, private hostnames, credentials, account values, or raw identifiers
- Markdown parentheses appear only in link syntax
- the published history contains only reviewed static design artifacts
- the Lakebed capsule builds as an anonymous source artifact
- missing write keys return HTTP 403 and unknown fixtures return HTTP 400
- a failed multi-write publication leaves no partial snapshot
- 80 reads overlapping 24 publications returned only complete synthetic snapshots
- the final local database had exactly one current snapshot and no failed indexes
- a temporary root-host proxy passed HTTP, protected publication, and reactive WebSocket transport
- process restart erased local Lakebed state and two replicas diverged
- development inspection and export surfaces were reachable without an inspection token
- all temporary proxy and Lakebed processes and files were removed
- live cluster inspection found healthy reusable publication seams and no target hostname state

## Complexity Delta

Current design and reconciliation slice:

- new repository: 1
- runtime files changed: 0
- T3Code files changed: 0
- services added: 0
- stores added: 0
- schemas added to runtime: 0
- background runtimes added: 0
- direct product behavior proved: none
- design behavior proved: current source shape and program boundary documented
- hosting behavior proved: cluster publication seam ready, Lakebed self-host runtime absent
- live infrastructure writes: 0
- external Lakebed resources created: 0

Completed Lakebed feasibility experiment:

- T3Code files changed: 0
- live source reads: 0
- synthetic schema tables: 2
- local experiment endpoints: 2
- hosted services added: 0
- deployments created: 0
- direct behavior proved: coherent atomic publication and reactive query contract
- production platform decision: not made

## Risks And Exceptions

- Historical source semantics changed across migrations and provider generations.
- Current projections can include stale nonterminal state that requires explicit aging rules.
- Model names and provider instance names can become high-cardinality or private dimensions.
- Token counts are not equivalent to cost, quality, attention, or value.
- Tool events can contain content even when their outer event type appears safe.
- Snapshot copying a multi-gigabyte live SQLite database needs a verified online backup method.
- The future internal site requires a separate authentication and DNS publication slice.

## Next Slice Reassessment

Before P1 starts, the user must accept the provisional tripwires and decide whether analytical artifacts may remain local and private. P1 must not activate P2 or any dashboard work automatically.

## Final Reconciliation

State: design complete, Lakebed feasibility experiment complete, homelab reconciliation complete, and P1 implementation in progress with local plus container proof complete and Kubernetes deployment pending.

## Commit Effects

If applied, this commit records the completed Lakebed experiment and homelab reconciliation, then adds the authorized Rust analytics service, embedded DuckDB aggregate store, privacy test, hardened container, and container publication workflow without changing T3Code or live infrastructure.

If applied, the infrastructure commit pins the verified analytics image, mounts the T3Code source directory read only, provisions DuckDB storage and monitoring, adds Argo CD ownership, and publishes the internal HTTPS hostname through the shared certificate bundle.
