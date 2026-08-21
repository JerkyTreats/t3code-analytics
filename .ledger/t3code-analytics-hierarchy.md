# T3Code Analytics Hierarchy Delivery Ledger

Date: 2026-08-21
Status: implemented-awaiting-live-proof
Owner: root agent

## Objective

Replace the flat usage board with a decision-ready portfolio view that mirrors T3Code work hierarchy and provides a project drilldown without admitting raw content or repository topology.

Direct product proof is a live internal dashboard where the landing page answers what was worked on when and where current work is distributed, then a project selection reveals project-specific recency, thread, turn, outcome, and activity trends.

## Maturity Envelope

```yaml
maturity:
  posture: first-slice
  obligation_floor: operational-privacy
  confidence: high-for-current-hierarchy-medium-for-historical-state
  user_override: private-project-title-publication-authorized-2026-08-21
  direct_product_proof: portfolio-landing-and-project-drilldown-over-live-coherent-snapshot
  hard_limits:
    t3code_writes: forbidden
    raw_content: forbidden
    repository_topology: forbidden
    new_services: zero
    new_stores: zero
    new_credentials: zero
    github_collector: gated
  tripwires:
    changed_files: 16
    added_lines: 2200
  stop_conditions:
    - project-parent joins do not reconcile
    - a protected topology field reaches a durable or published boundary
    - projection lag is hidden
    - implementation requires a second service or store
    - GitHub correlation requires the existing broad operator credential
```

## Active Slice

Owned behavior:

- coherent project-aware extraction from the existing read-only SQLite mount
- current portfolio summary over equal rolling windows
- complete UTC date spine
- stable analytical project keys
- project title publication on the private internal dashboard under explicit user direction
- project daily facts and project rollups in the existing DuckDB file
- high-abstraction landing and client-side project drilldown
- explicit source freshness, projection lag, and activity attribution coverage

Excluded behavior:

- thread titles or raw thread keys
- paths, repositories, remotes, branches, worktrees, and issue links
- messages, prompts, reasoning, command text, summaries, and activity payloads
- accounts, clients, sessions, devices, and auth state
- GitHub credentials or API acquisition
- push-history claims
- project, thread, or human productivity scores

## Affected Domain Set

- project projection
- thread projection
- turn projection
- activity projection
- event chronology
- analytics governance
- aggregate persistence
- internal dashboard presentation

T3Code runtime behavior, authentication, cluster publication, and DNS are inspected dependencies but have no planned behavior change.

## Expansion Decisions

| Proposal | Decision | Reason |
| --- | --- | --- |
| Extend existing JSON snapshot | accepted | smallest compatible contract for one internal consumer |
| Add project rollup and daily tables to DuckDB | accepted | preserves conformed grains inside the existing store |
| Add a second query service | rejected | no current consumer need |
| Publish project titles | accepted for private route | explicit user direction and no repository data in the published model |
| Publish thread titles | rejected | content-bearing and unnecessary for direct proof |
| Add GitHub collector | gated | new credential and repository-topology privacy design required |
| Use GitHub Events as push history | rejected | retention and latency make the source incomplete |
| Add Parquet | deferred | DuckDB already satisfies the direct proof |

## Review Plan

- Rust tests over synthetic projects, threads, turns, and activities
- uniqueness and parent reconciliation assertions
- privacy scan over serialized snapshot and DuckDB
- unit and release build
- browser verification at desktop and narrow viewport
- live refresh, health, route, and certificate verification after deployment

## Closeout State

The project-aware extraction, version-two snapshot contract, project serving facts, portfolio landing, and project drilldown are implemented locally. Unit, lint, release-build, live-source reconciliation, privacy, desktop, and narrow-viewport proof are in progress. Cluster promotion remains pending.
