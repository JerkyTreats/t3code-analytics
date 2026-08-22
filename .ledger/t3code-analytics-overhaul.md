# T3Code Analytics Overhaul Program

## Program identity

- Program: T3Code Analytics drilldown overhaul
- Operating mode: delivery
- Maturity posture: first-slice
- Obligation floor: operational-privacy
- Confidence: high
- Status: complete
- Review owner: root
- Started: 2026-08-22

## Direct product proof

The hosted analytics entry page gives a fast, synthesized reading across every supported analytical domain. Each elevated signal opens a denser domain, project, or evidence view without losing the selected time window or navigation context.

## Hard limits

| Limit | Value |
| --- | ---: |
| New crates | 0 |
| New durable stores | 0 |
| New protocols | 0 |
| New workspace dependencies | 0 |
| Parallel implementors | 0 |
| Changed product files before reassessment | 10 |
| Added product lines before reassessment | 2500 |

## Frozen domain map

| Domain | Status | Decision |
| --- | --- | --- |
| Governance and privacy | affected | Preserve the existing topology boundary and admitted aggregate contract |
| Portfolio | affected | Promote to the entry atlas |
| Adoption and reach | affected | Present as reach without productivity inference |
| Throughput | affected | Present request flow and cohort outcomes with explicit denominators |
| Agent activity | affected | Keep as a dense supporting domain, never as a productivity score |
| Reliability | affected | Separate errors, interruptions, and in-flight work from throughput |
| Evidence quality | affected | Attach coverage and freshness to the claims they qualify |
| Presentation and navigation | affected | Replace the source-first hierarchy with atlas, domain, project, evidence |
| Deployment provenance | affected | Promote one tested immutable image through the existing GitOps seam |
| Capacity and cost | deferred | The current contract has no accepted capacity or cost facts |
| Delivery and code operations | deferred | No admitted contract exists for this source domain |

## Architecture decision

Keep the Rust extractor, aggregate model, read-only source access, DuckDB projection, API version two, health endpoints, metrics, container workflow, and GitOps topology unchanged. Replace the embedded static client vertically against the accepted aggregate contract. A data-contract change is allowed only if the client proves a concrete missing fact and that change receives a new gate.

## Delivery gate definition

- Gate ID: UI-GATE-1
- Revision: 1
- Candidate tree: working tree changes limited to the embedded client, its documentation, and this ledger
- Acceptance budget: one primary pass and one verification pass

| Criterion | Acceptance evidence |
| --- | --- |
| G1 Contract fidelity | The existing API renders without invented states, thresholds, or semantic substitutions |
| G2 Entry synthesis | The atlas exposes the supported domains and every elevated signal has a working drill path |
| G3 Context preservation | Domain, project, and evidence routes preserve selection in the URL and provide a reliable return path |
| G4 Accessible responsiveness | Keyboard focus, chart data tables, reduced motion, and layouts at 390 pixels and desktop pass inspection |
| G5 Privacy | Rendered output and client source expose no forbidden topology, paths, prompts, raw content, identities, or credentials |
| G6 Operational fit | Build and tests pass with no new service, store, crate, protocol, or external runtime dependency |

## Active slice

- Slice: embedded client replacement
- Scope: `app/static/index.html`, `app/static/styles.css`, `app/static/app.js`, and directly related documentation or tests
- Proof environment: local service backed by a synthetic source fixture
- Exit: UI-GATE-1 accepted and recorded

## Promotion slice

- Trigger: UI-GATE-1 acceptance
- Scope: commit, push, immutable image build, GitOps digest update, hosted verification, and screenshot evidence
- Rollback: restore the prior image digest through the infrastructure repository

## Decision log

### 2026-08-22

- Rejected the current source-board hierarchy because source provenance is an evidence concern, not the user question.
- Rejected hard-coded portfolio labels such as concentrated, expanding, and evidence ready because the current contract does not define accepted thresholds for those interpretations.
- Selected an editorial observatory direction with a warm paper field, strong ink typography, restrained signal color, and a persistent drilldown spine.
- Preserved the existing data and operational architecture because the usability failure is in information design, navigation, and synthesis rather than extraction.

## Gate record

### UI-GATE-1 · accepted · 2026-08-22

| Criterion | Result | Evidence |
| --- | --- | --- |
| G1 Contract fidelity | pass | Client uses only API version two fields and removes the former concentrated, expanding, and readiness thresholds |
| G2 Entry synthesis | pass | Atlas exposes five supported domains with direct drill links and a factual watchlist |
| G3 Context preservation | pass | Browser proof exercised all domain routes, project detail, and a fourteen-row project evidence ledger with originating domain retained in the URL |
| G4 Accessible responsiveness | pass | Skip link, focus treatment, chart tables, reduced motion, unique element IDs, named controls, and zero page-level overflow in narrow and desktop browser proofs |
| G5 Privacy | pass | Source and rendered-output scans found no raw topology or private source marker crossing the published boundary |
| G6 Operational fit | pass | JavaScript syntax, Rust formatting, Rust test, release build, health and readiness probes, and production Docker image build passed with zero new dependencies |

The collaborative preview screenshot operation failed at the browser service boundary on both local tabs. DOM, route, layout, accessibility, and overflow evidence remained available through the same collaborative browser and was used for acceptance. No screenshot artifact is claimed for this gate.

Candidate product files stayed within the tripwire at five modified product or documentation files and roughly fourteen hundred added lines. Promotion is authorized.

## Promotion record

- Accepted product commit: `1d0ebd993f3c4dcbfb42dc68b8f34a22e31e0b84`
- Container workflow: `32576636005` · success
- Published image: `ghcr.io/jerkytreats/t3code-analytics@sha256:0144cf35b1c216d83a69bf7b33f1b677b49cf552b2ffb3f808af0fabb7ed1b5a`
- GitOps commit: `92933d0cbff8aba10908258b9ca27eb260270e64`
- Argo state: synced and healthy
- Runtime state: one of one replicas available with zero container restarts
- Hosted contract: version two, projection lag zero, twenty-five admitted projects, and forty-two daily observations
- Hosted route proof: atlas, five domains, project detail, and fourteen-row project evidence ledger all rendered with zero page-level horizontal overflow

## Closeout

The direct product proof is satisfied. The hosted entry page now synthesizes all supported analytical domains, every elevated fact has a denser drill path, project navigation retains the originating domain in the URL, and exact evidence remains one additional layer down. Unsupported capacity, cost, delivery, and code-operation domains remain explicitly deferred pending accepted source contracts.
