# T3Code Analytics Data Accessibility Assessment

Date: 2026-08-20

## Concern And Scope

This assessment determines how T3Code usage data can become accessible for trustworthy analytics while preserving runtime authority, privacy, and operational safety. The direct behavior is a read-only path from generated records to reproducible aggregate facts. It includes current server, client, provider, persistence, observability, access, and operations surfaces. It excludes dashboard design, new instrumentation, recurring collection, external publication, identity analysis, and any T3Code mutation.

The assessment uses current T3Code code on local `main`, aggregate read-only observations from the hosted instance, active repository policy, and official platform documentation. Discovery was limited to twelve batched inspections and twenty additional source items.

## Evidence Snapshot

Direct observations as of the assessment time:

The live observations were collected through separate read-only aggregate queries while the service remained active. They describe scale and shape, but they are not one transactionally frozen benchmark. First-slice acceptance values must come from a consistent snapshot.

| Source | Observed shape | Analytical meaning | Main caution |
| --- | --- | --- | --- |
| Orchestration events | 482991 rows from March through August 2026 | Durable product behavior sequence | Payloads contain sensitive content and evolving schemas |
| Command receipts | 479239 rows | Command admission and rejection | Receipt volume is dominated by fine-grained activity commands |
| Threads | 446 rows | Durable work containers | Titles, paths, branches, and identifiers are sensitive |
| Turns | 4762 rows | Best current work-attempt grain | Some stale running and pending states exist |
| Messages | 35372 rows | Conversation role and timing | Text is excluded from analytics |
| Activities | 388957 rows | Tool, task, error, plan, checkpoint, and context activity | Summaries and arbitrary payloads can contain content |
| Context snapshots | 109936 rows across 1487 turns | Token and context pressure signals | Coverage is partial and semantics need validation |
| Provider logs | 1438 files and about 13.1 GB | Deep diagnostic replay | Critical sensitivity and best-effort retention |
| Local traces | Rotating structured spans | Operational latency and failure | Attributes can contain paths, URLs, and query text |
| Runtime metrics | Definitions exist, historical persistence absent | Aggregate operational trends | Hosted instance has no active export configuration |
| Access records | Durable client and session tables observed | Coarse device reach | Counts, identity, network, and session values are protected |

Evidence:

- `t3code:apps/server/src/persistence/Migrations/001_OrchestrationEvents.ts`
- `t3code:apps/server/src/persistence/Migrations/005_Projections.ts`
- `t3code:apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.ts`
- `t3code:apps/server/src/provider/Layers/ProviderEventLoggers.ts`
- `t3code:apps/server/src/observability/Layers/Observability.ts`
- `t3code:governance/privacy_and_publication_policy.md`
- `live-observation:2026-08-20`

## Regenerated Domain Snapshot

The domain universe comes from current package ownership, runtime seams, durable stores, and operational boundaries. Marketing and external provider billing are included to preserve explicit non-integration decisions.

## Pass One Domain Sweep

| Domain | Needed integration | Current integration | Completeness | Evidence | Non-integration rationale | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| Orchestration | own | own | partial | Event store, command receipts, domain schemas | Not applicable | Define admitted event fields and schema-version handling |
| Provider runtime | publish | publish | partial | Canonical events and native provider logs | Not applicable | Admit only canonical low-risk fields |
| Persistence | own | own | partial | SQLite migrations and projections | Not applicable | Define consistent snapshot and reconciliation method |
| Observability | publish | publish | partial | Local traces and optional OTLP metrics | Not applicable | Separate operational facts and activate retention only in later slice |
| Web client | observe | adapter | not started | Web consumes domain events and emits browser traces | Not applicable | Freeze client-only questions before adding tracking |
| Desktop and mobile clients | observe | adapter | partial | Desktop and mobile telemetry and local stores | Not applicable | Inventory only metrics absent from server truth |
| Auth and access | publish | own | partial | Client and auth session tables | Not applicable | Permit coarse client-class aggregates only |
| Project and source control | publish | publish | partial | Project projections, Git metrics, tool events | Not applicable | Define operation classes without paths or remotes |
| Terminal and process | publish | publish | partial | Terminal metrics, traces, and activity events | Not applicable | Admit lifecycle and outcome only |
| Preview and MCP | publish | publish | partial | Canonical tool types and preview contracts | Not applicable | Define coarse tool taxonomy |
| Relay and mobile cloud | observe | publish | partial | Relay PostgreSQL and Axiom-oriented telemetry | Not applicable | Keep separate until hosted mobile usage is an accepted question |
| Deployment operations | publish | observe | partial | Release commit and service interval | Not applicable | Create a public-safe release interval dimension |
| Analytics governance | own | none | not started | New repository boundary | Not applicable | Own source, metric, privacy, and quality contracts |
| Marketing | none | none | not needed | Separate marketing application | Marketing traffic does not answer T3Code product usage questions | Preserve no integration |
| External provider billing | none | none | not needed | Provider-specific account events | T3Code does not own billing truth and account data is protected | Preserve no integration |

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

Every frozen domain needs a truthful relationship to the concern. This does not mean every domain changes in the first implementation slice.

## Pass Two Affected Domain Decomposition

### Orchestration

| Domain concern | Owner | Current ground | Required relationship | Change posture | Boundary risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Event admission | Orchestration event contract | Stable event envelope and typed payloads | Publish allowlisted envelope fields | reuse unchanged | Payload versions can drift | `t3code:packages/contracts/src/orchestration.ts` |
| Turn lifecycle | Orchestration projections | Requested, started, completed, interrupted, and error states | Publish one conformed turn fact | adapter only | Stale nonterminal rows | `t3code:apps/server/src/persistence/Migrations/005_Projections.ts` |
| Command outcomes | Orchestration engine | Durable receipts | Publish accepted and rejected facts | adapter only | Fine-grained commands distort user-level rates | `t3code:apps/server/src/persistence/Migrations/002_OrchestrationCommandReceipts.ts` |
| Correlation | Event envelope | Command, causation, and correlation identifiers exist | Pseudonymize only required joins | adapter only | Reidentification through stable keys | `t3code:apps/server/src/persistence/Migrations/001_OrchestrationEvents.ts` |

### Provider Runtime

| Domain concern | Owner | Current ground | Required relationship | Change posture | Boundary risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Canonical activity | Provider runtime contract | Provider-neutral lifecycle event union | Publish coarse event and tool types | adapter only | Unknown payload fields can leak content | `t3code:packages/contracts/src/providerRuntime.ts` |
| Token snapshots | Provider adapters | Provider-normalized usage snapshots | Publish validated numeric facts | adapter only | Cumulative and incremental fields differ by provider | `t3code:apps/server/src/provider/Layers/CodexAdapter.ts` |
| Provider identity | Provider registry | Driver and instance identifiers | Publish provider family only by default | adapter only | Instance names may reveal accounts | `t3code:packages/contracts/src/providerInstance.ts` |
| Native diagnostics | Provider event loggers | Native and canonical rotating files | Exclude from first slice | not needed | Full prompts, responses, and account events may appear | `t3code:apps/server/src/provider/Layers/ProviderEventLoggers.ts` |

### Persistence

| Domain concern | Owner | Current ground | Required relationship | Change posture | Boundary risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Snapshot acquisition | SQLite runtime | Live multi-gigabyte database | Produce verified consistent copy | new local behavior | Live locks and inconsistent sidecar copies | `t3code:apps/server/src/persistence/Layers/Sqlite.ts` |
| Projection authority | Projection pipeline | Rebuildable query tables | Reconcile with event sequence and manifest | adapter only | Projection convenience can mask event gaps | `t3code:apps/server/src/orchestration/Layers/ProjectionPipeline.ts` |
| Schema history | Migration registry | Migration IDs extend through 40 with reserved gaps | Record source schema version per run | adapter only | Historical rows cross semantic eras | `t3code:apps/server/src/persistence/Migrations.ts` |
| Retention | Runtime file layout | Rotating logs and durable SQLite coexist | Document source-specific retention | new local behavior | Silent source truncation | `t3code:apps/server/src/config.ts` |

### Observability

| Domain concern | Owner | Current ground | Required relationship | Change posture | Boundary risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Metrics | Server observability | Counters and timers export over OTLP only | Keep operational series separate | reuse unchanged | No hosted history today | `t3code:apps/server/src/observability/Metrics.ts` |
| Traces | Server observability | Local rotating span records and optional OTLP | Admit allowlisted span facts only | adapter only | Query text, paths, and URLs appear in attributes | `t3code:apps/server/src/observability/Layers/Observability.ts` |
| Browser correlation | Browser trace collector | Browser spans join local trace sink | Preserve only approved correlation | adapter only | Client details and routes may be sensitive | `t3code:apps/server/src/observability/BrowserTraceCollector.ts` |
| Backend selection | Operations | Axiom and Grafana patterns exist | Evaluate after signal contract | not needed | Tool choice can collapse signal meanings | `t3code:docs/operations/observability.md` |

### Web Client

| Domain concern | Owner | Current ground | Required relationship | Change posture | Boundary risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Server-observed actions | Web runtime | Commands become durable orchestration events | Reuse server facts | reuse unchanged | Double counting if clicks are also tracked | `t3code:packages/contracts/src/orchestration.ts` |
| Client-only interactions | Web presentation | Some navigation and presentation behavior never reaches server | Remain untracked until a decision needs it | not needed | Surveillance-style capture without a question | `t3code:apps/web/src` |
| Context display | Web context model | Reads token snapshots from activities | Validate interpretation against source facts | reuse unchanged | UI logic can be mistaken for source semantics | `t3code:apps/web/src/lib/contextWindow.ts` |

### Desktop And Mobile Clients

| Domain concern | Owner | Current ground | Required relationship | Change posture | Boundary risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Desktop runtime | Desktop host | Embeds the same server and local traces | Reuse server and operational facts | reuse unchanged | Duplicate service instances | `t3code:apps/desktop` |
| Mobile telemetry | Mobile observability | Optional trace export exists | Keep as operational signal | reuse unchanged | Device and network attributes | `t3code:apps/mobile/src/features/observability/tracing.ts` |
| Local client stores | Mobile and web clients | Preferences and connection caches | Exclude from first slice | not needed | Client state is not durable product truth | `t3code:apps/mobile/src/persistence` |

### Auth And Access

| Domain concern | Owner | Current ground | Required relationship | Change posture | Boundary risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Client reach | Auth clients | Durable client records | Publish coarse client class counts | adapter only | Small groups can reveal device topology | `t3code:apps/server/src/persistence/Migrations/040_SettingsAdminClients.ts` |
| Connection recency | Auth sessions | Last connected timestamp | Publish aggregate recency only | adapter only | No full connection event history | `t3code:apps/server/src/auth/SessionStore.ts` |
| Pairing | Pairing store | One-time authorization state | Exclude | not needed | Credential and access sensitivity | `t3code:apps/server/src/auth/PairingGrantStore.ts` |

### Project And Source Control

| Domain concern | Owner | Current ground | Required relationship | Change posture | Boundary risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Project dimension | Project projection | Workspace root and project state | Publish pseudonymous project key | adapter only | Paths and repository identities are protected | `t3code:apps/server/src/persistence/Migrations/005_Projections.ts` |
| Git operations | VCS driver | Metrics and trace spans exist | Publish operation class, duration, and outcome | adapter only | Commands, paths, branches, and remotes leak context | `t3code:apps/server/src/vcs/GitVcsDriverCore.ts` |
| Checkpoints | Checkpoint reactor | Capture and revert lifecycle is durable | Publish coarse checkpoint outcomes | adapter only | File lists contain private paths | `t3code:apps/server/src/checkpointing/CheckpointStore.ts` |

### Terminal And Process

| Domain concern | Owner | Current ground | Required relationship | Change posture | Boundary risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Terminal lifecycle | Terminal manager | Started and restarted counters plus traces | Publish counts and outcomes | adapter only | Terminal logs can contain secrets | `t3code:apps/server/src/terminal/Manager.ts` |
| Process resources | Diagnostics | Runtime CPU and memory history | Keep operational and aggregate | adapter only | Host details and process command lines | `t3code:apps/server/src/diagnostics/ProcessResourceMonitor.ts` |
| Command content | Terminal and tool events | Raw command and output may exist | Exclude | not needed | Critical content sensitivity | `t3code:packages/contracts/src/providerRuntime.ts` |

### Preview And MCP

| Domain concern | Owner | Current ground | Required relationship | Change posture | Boundary risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Tool taxonomy | Provider contract | MCP and preview calls appear as tool types | Publish coarse type only | adapter only | Tool input and output can contain content | `t3code:packages/contracts/src/providerRuntime.ts` |
| Preview lifecycle | Preview broker | Open, navigate, resize, fail, and close events exist | Defer until product question exists | not needed | URLs and page content are sensitive | `t3code:packages/contracts/src/preview.ts` |
| MCP sessions | MCP registry | Connection and invocation state is runtime local | Keep operational | reuse unchanged | Tokens and invocation context | `t3code:apps/server/src/mcp/McpSessionRegistry.ts` |

### Relay And Mobile Cloud

| Domain concern | Owner | Current ground | Required relationship | Change posture | Boundary risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Relay delivery | Relay runtime | PostgreSQL delivery and activity records | Exclude until mobile question is accepted | not needed | Separate operational authority and user context | `t3code:infra/relay/src/agentActivity` |
| Relay traces | Relay observability | Axiom OTLP paths exist | Preserve separate operational dataset | reuse unchanged | Cross-environment correlation | `t3code:infra/relay/src/observability.ts` |
| Mobile registrations | Relay persistence | Device registration state | Exclude from product analytics | not needed | Device and push identifiers | `t3code:infra/relay/src/agentActivity/MobileRegistrations.ts` |

### Deployment Operations

| Domain concern | Owner | Current ground | Required relationship | Change posture | Boundary risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Release interval | Deployment process | Immutable deployment commit and version | Publish public-safe interval dimension | new local behavior | Local host and path disclosure | `live-observation:2026-08-20` |
| Service health | Host service | Runtime state and journal | Keep operational and aggregate | adapter only | Process details and private host data | `live-observation:2026-08-20` |
| Schema transition | Deployment process | Migrations apply during deployment | Join source schema version to extraction runs | adapter only | Metrics can shift at releases | `t3code:apps/server/src/persistence/Migrations.ts` |

### Analytics Governance

| Domain concern | Owner | Current ground | Required relationship | Change posture | Boundary risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Source registry | T3Code Analytics | Initial registry exists | Own authority, grain, privacy, and disposition | new local behavior | Registry drift from T3Code | `analytics:catalog/sources.yaml` |
| Metric contracts | T3Code Analytics | Candidate catalog exists | Own definitions, nulls, dimensions, and limits | new local behavior | Dashboard-local redefinition | `analytics:catalog/metrics.yaml` |
| Quality evidence | T3Code Analytics | No executable checks yet | Produce per-run assertions and reconciliation | new local behavior | Green checks over wrong semantics | `analytics:.ledger/t3code-analytics-bootstrap.md` |
| Publication safety | T3Code Analytics | Raw-data exclusions are policy only | Enforce allowlists and scan outputs | new local behavior | Protected data in artifacts | `analytics:AGENTS.md` |

## Ownership And Boundary Synthesis

T3Code orchestration owns product event truth. Provider runtime publishes normalized activity. Persistence owns durable storage and rebuildable projections. Observability owns runtime telemetry. The new analytics repository owns admission, conformed facts, metric semantics, quality evidence, and later presentation contracts.

The smallest missing connective behavior is a consistent read-only snapshot exporter with a field allowlist, pseudonymization, source reconciliation, and executable quality checks.

The principal boundary risks are content leakage, projection drift, token semantic mismatch, duplicate counting across signals, high-cardinality identifiers, and accidental writes to the live source.

## Separated Scopes

Domains on the operating path:

- orchestration
- provider-runtime
- persistence
- observability
- clients
- auth-and-access
- project-and-source-control
- terminal-and-process
- preview-and-mcp
- relay-and-mobile-cloud
- deployment-operations
- analytics-governance

Domains whose behavior may change in the first implementation slice:

- analytics-governance

Likely first-slice write scope:

- extractor files in this repository
- analytical schemas in this repository
- SQL models in this repository
- synthetic fixtures and tests in this repository
- generated private data outside Git

T3Code source files are not in the first-slice write scope.

## Explicit Non-Integration Decisions

- No marketing analytics in the T3Code usage model.
- No external provider billing or account data.
- No raw provider log ingestion in the first slice.
- No message, prompt, response, reasoning, command, terminal, attachment, or file content.
- No person, account, IP address, raw user agent, local path, remote URL, or session identifier dimensions.
- No client clickstream until a specific accepted question cannot be answered from server truth.
- No dashboard platform selection in this assessment.

## Confidence And Unresolved Questions

Confidence is high for the current source topology and medium for metric semantics. The main unresolved questions are:

- Which token fields are cumulative and which are increments for every provider generation?
- Which running and pending turns represent real in-flight work versus historical stale state?
- Which tool lifecycle events can be reconciled reliably across provider adapters?
- What retention window should conformed facts and operational telemetry use?
- Should stable pseudonymous thread keys persist indefinitely or rotate by period?
- Which first three decisions should the eventual internal dashboard help make?
- Is local-only private storage acceptable for the first implementation slice?
