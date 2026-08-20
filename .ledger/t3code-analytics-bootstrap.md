# T3Code Analytics Bootstrap Ledger

Date: 2026-08-20
Mode: design
Readiness: approval-ready

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
  user_override: none
  direct_product_proof: reproducible-privacy-safe-baseline-export
  hard_limits:
    new_crates: forbidden-without-approval
    new_durable_stores: forbidden-without-approval
    new_cross_domain_protocols: forbidden-without-approval
    new_workspace_dependencies: forbidden-without-approval
    parallel_implementors: one
    t3code_mutation: forbidden-without-separate-slice
    raw_content_export: forbidden
    live_database_writes: forbidden
    dashboard_work: forbidden-before-data-proof
  tripwires:
    changed_files: 12
    added_lines: 1800
    note: provisional-and-not-yet-accepted
  investigation_budget:
    inspection_calls: 12
    source_files_beyond_named_design_and_policy: 20
  approval_gates:
    - approve-first-extractor-slice
    - approve-any-new-durable-store
    - approve-recurring-scheduler
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

No implementation slice is authorized.

The completed design slice created this repository, the source registry, metric catalog, platform research, domain assessment, and program ledger. It did not alter T3Code or create runtime infrastructure.

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
| P1 | Privacy-safe snapshot extractor and baseline facts | awaiting approval | Accepted envelope | User approval of exact slice |
| P2 | Versioned analytical models and metric views | backlog | P1 complete | Reconciled facts and settled token semantics |
| P3 | Recurring extraction, retention, and freshness monitoring | backlog | P2 complete | Repeated manual runs and real freshness need |
| P4 | Query-serving boundary and internal authentication | backlog | P3 complete | Accepted consumers and concurrency requirement |
| P5 | Internal dashboard and hostname | backlog | P4 complete | Accepted view contracts and presentation requirements |

## Architectural Expansion Decisions

| Proposal | Product behavior unblocked | Existing approach considered | Current consumers | Authority | Disposition |
| --- | --- | --- | --- | --- | --- |
| DuckDB process dependency | Snapshot transformation and local SQL proof | SQLite CLI plus shell SQL | None | Needs P1 approval | provisional |
| Parquet analytical artifacts | Portable conformed facts | DuckDB-only file | None | Needs P1 approval | provisional |
| Dedicated analytical store | Concurrent historical queries | Parquet and local DuckDB | None | Not authorized | deferred |
| Scheduler | Automatic freshness | Manual bounded run | None | Not authorized | deferred |
| T3Code analytics events | Missing client or semantic events | Existing orchestration and telemetry | None | Not authorized | deferred |
| Query service | Multi-user internal access | Local SQL artifacts | None | Not authorized | deferred |
| Internal hostname | Browser access to accepted views | Local report | None | Not authorized | deferred |

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
- the repository has no remote and no commit

## Complexity Delta

Current design slice:

- new repository: 1
- runtime files changed: 0
- T3Code files changed: 0
- services added: 0
- stores added: 0
- schemas added to runtime: 0
- background runtimes added: 0
- direct product behavior proved: none
- design behavior proved: current source shape and program boundary documented

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

State: design complete and implementation not started.
