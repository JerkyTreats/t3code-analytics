# T3Code Information Hierarchy Assessment

Date: 2026-08-21
Status: accepted for the project-aware dashboard slice

## Decision

The analytical product model is:

```text
Project
└── Thread
    ├── Turn
    │   └── attributed Activity
    └── unattributed or unresolved Activity
```

The hierarchy is not a strict tree. Every activity belongs to a thread, but a turn link is optional and may not resolve to a current turn projection. The dashboard must preserve thread-level activity rather than forcing every activity into a turn.

Project title is admitted only for this private internal dashboard by the explicit user direction on 2026-08-21. Workspace paths, repository identity, repository remotes, branches, worktrees, issue links, messages, tool payloads, accounts, clients, and sessions remain excluded.

Analytical project keys use a versioned BLAKE3 namespace over the high-entropy source key. Raw keys never cross the coherent extraction transaction. The namespace can be rotated without retaining a source crosswalk.

## Live Evidence

One consistent read-only source transaction observed:

- 28 project rows
- 25 current projects
- 451 thread rows
- 4,821 turn rows
- 392,659 canonical activity rows
- no orphan thread, turn, or activity parent
- 100,884 activities with no turn key
- 4,406 activities with a turn key that did not resolve to a current turn row
- zero projection lag during the later reconciliation read

Current portfolio evidence showed:

- 4 projects with work in the last day
- 12 projects with work in the last seven days
- 12 projects with no work in the last thirty days
- 784 turns in the current rolling seven-day window
- about 78 percent of current-window turns concentrated in the three most active projects
- 39 threads with work in the last seven days
- 21 currently nonterminal turns
- 4 threads with an actionable proposed plan

These counts describe work distribution and system activity. They do not measure attention, effort, value, authorship, or productivity.

## Source And Grain Matrix

| Entity | Source | Grain | Parent | Time truth | Admitted publication |
| --- | --- | --- | --- | --- | --- |
| Project | `projection_projects` | one current project row | none | creation and deletion lifecycle | project title under explicit private-dashboard override, pseudonymous key, lifecycle, aggregate trends |
| Thread | `projection_threads` | one current thread row | project | current lifecycle plus runtime recency | project-level aggregate counts only |
| Turn | `projection_turns` | one accumulating turn attempt | thread | requested, started, completed | aggregate outcome and time-window facts |
| Activity | `projection_thread_activities` | one canonical activity row | thread and optional turn | created time | allowlisted kind aggregates with explicit attribution coverage |
| Event chronology | `orchestration_events` | one committed event | aggregate stream | global sequence and event time | high-water mark and projection lag only |
| Extraction | analytics-owned | one coherent source read | none | generated time | lineage, freshness, quality posture |

## Analytical Questions

The landing view must answer:

1. Is the snapshot current and reconciled enough to trust
2. Which projects make up the current working set
3. How work is distributed across projects over time
4. Which projects entered or left the current rolling window
5. Which current work states may need operational review

The project view must answer:

1. When the project last received admitted work
2. How many project threads were active in the current window
3. How current turn volume compares with the preceding equal window
4. How terminal outcomes changed
5. How project threads distribute across recency bands
6. Which activity families appear after normalization by turn volume

## Metric Contracts

### Last work time

The latest admitted turn lifecycle timestamp or thread activity timestamp. Generic row update time is not work time.

### Active project

A current project with at least one requested turn in the selected rolling window.

### Active thread

A thread with at least one requested turn in the selected rolling window.

### Current project turn share

Project requested turns divided by all project-linked requested turns in the same rolling window. The denominator must be present beside the value.

### Current-only project

A project active in the current rolling seven-day window and inactive in the immediately preceding equal window. This is not called a new project.

### Cooling project

A project active in the preceding rolling seven-day window and inactive in the current equal window.

### Terminal completion rate

Completed turns divided by completed, error, and interrupted turns. It is null when no terminal turns exist.

### Activity rate

Allowlisted activity occurrences per one hundred requested turns in the same window. Raw activity volume is not placed on the turn trend scale.

Activity kinds are collapsed into the version-one analytical families `tool lifecycle`, `delegated work`, `planning`, `context management`, `checkpointing`, `interaction requests`, `runtime exceptions`, `turn lifecycle`, and `other admitted activity`. The source kind remains transient.

## Recency Bands

- within 24 hours
- two to seven days
- eight to thirty days
- more than thirty days
- unknown

The bands are navigation aids, not engagement claims. Nonterminal age is shown as elapsed age without a stale label until a state-aware threshold is separately accepted.

## Null And Coverage Rules

- zero means a complete observation with no qualifying facts
- null remains null through extraction and rendering
- every day in the declared UTC window is materialized
- a missing day becomes zero only when source coverage and projection reconciliation prove a measured-empty day
- rolling instants compare normalized Julian dates rather than timestamp strings
- dates in the 42-day display spine use complete UTC calendar-date membership
- rates remain null for a zero or incomplete denominator
- thread-level and unresolved-turn activities remain explicit coverage categories
- loading, empty, unavailable, and extraction-error states remain visually distinct

## Presentation Contract

The dashboard is a monitoring surface with bounded exploration.

- big numbers include a window, denominator, or comparison
- time trends use unsmoothed solid lines
- project composition uses no more than five named project colors plus Other
- categorical comparison uses sorted horizontal bars or a table
- project rows drill into project detail
- values do not rely on color alone
- missing values render as an en dash
- numerical table cells align right
- forecasts are excluded from the first slice

Evidence:

- [Adobe Spectrum data visualization fundamentals](https://spectrum.adobe.com/page/data-visualization-fundamentals/)
- [Adobe Spectrum color for data visualization](https://spectrum.adobe.com/page/color-for-data-visualization/)
- [Adobe Spectrum line charts](https://spectrum.adobe.com/page/line-chart/)
- [Adobe Spectrum area charts](https://spectrum.adobe.com/page/area-chart/)
- [Adobe Spectrum bar charts](https://spectrum.adobe.com/page/bar-chart/)
- [Adobe Spectrum tables](https://spectrum.adobe.com/page/table/)
- [Adobe Spectrum legends](https://spectrum.adobe.com/page/legend/)
- [Microsoft Research SPACE framework](https://www.microsoft.com/en-us/research/publication/the-space-of-developer-productivity-theres-more-to-it-than-you-think/)
- [W3C use of color guidance](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color)

## GitHub Boundary

Live inspection found that 17 current projects are local Git repositories, 15 have a GitHub origin, and all 15 were readable through the current operator authentication. T3Code does not durably record push history, and local Git cannot prove historical push time.

The narrow truthful correlation fact is `thread_with_github_visible_commit`:

- derive a thread activity window
- inspect worktree, branch, origin, and commit SHA only in memory
- ask GitHub whether a candidate commit is visible
- discard every path, origin, repository, branch, SHA, author, account, and response object before any durable or published boundary
- publish only sufficiently broad aggregate coverage

GitHub repository events are not an acceptable historical source. GitHub documents a maximum of 300 timeline events, a thirty-day retention window, and latency of up to six hours. Commit endpoints support bounded `since` and `until` queries. Pull request records are a feasible later source for state and merge-time facts.

Evidence:

- `t3code:apps/server/src/project/RepositoryIdentityResolver.ts`
- `t3code:apps/server/src/git/GitWorkflowService.ts`
- `t3code:apps/server/src/sourceControl/GitHubCli.ts`
- [GitHub commit endpoints](https://docs.github.com/en/rest/commits/commits)
- [GitHub pull request endpoints](https://docs.github.com/en/rest/pulls/pulls)
- [GitHub event endpoint limits](https://docs.github.com/en/rest/activity/events)

Project-to-repository publication remains blocked by the repository-topology rule in `AGENTS.md`. A broad GitHub credential must not be copied into the dashboard pod. GitHub acquisition needs a separate privacy design and a purpose-built read-only credential before implementation.

## Quality Gates

- every current project key is unique
- every thread resolves to one project
- every turn resolves to one thread
- every activity resolves to one thread
- activity turn attribution is classified rather than silently filtered
- projection cursors equal the event high-water mark or the snapshot is marked incomplete
- terminal timestamps and states are consistent
- requested, started, and completed times are ordered
- prohibited-field scans cover API JSON, DuckDB rows, logs, fixtures, and rendered HTML
- project-title admission remains limited to the private internal route

Current portfolio metrics include only nondeleted projects. Historical turn and activity facts under those projects remain included even when their source thread was later deleted. Current-thread counts include only nondeleted threads. A deleted project is excluded from the current portfolio and does not rewrite retained prior DuckDB snapshots.

## Live Experiment Outcome

The project hierarchy is now the primary analytical spine at the private internal route. The portfolio landing moves from total usage into project distribution, window movement, recency, thread load, terminal outcomes, and normalized activity. Selecting a project preserves the same definitions while reducing the grain to one project.

The first live coherent snapshot produced these portfolio signals:

- 25 current projects, with 11 active in seven days and 3 active in 24 hours
- 781 requested turns in the current rolling window, up 534 from the preceding equal window
- 7 current-only projects and 1 cooling project
- 78.9 percent of current turns concentrated in the top three projects
- 12 current projects with no admitted work in more than 30 days
- 39 active threads in the current window
- 98.5 percent terminal completion across the request cohort
- 72,047 admitted activity occurrences, with 63.6 percent attributed to a projected turn and the remainder explicitly classified

These are portfolio-management signals, not productivity scores. Concentration shows where T3Code attention accumulated. Current-only and cooling identify change between equal windows. Recency and active-thread counts distinguish recent breadth from raw turn volume. Project drilldown then shows whether a portfolio change came from new threads, repeated turns, outcome mix, or activity composition.

## Experiment Reflection

The original dashboard failed because the data hierarchy and the interface hierarchy were different. T3Code organizes work as projects, threads, turns, and activity, while the first board started at system-wide totals. The semantic repair was therefore a data-model change before it was a visual change.

The most useful reasoning move was to define analytical grains and admission rules before choosing charts. That exposed three facts that a styling pass would have missed:

- project titles were the only human-meaningful project label available, so their publication needed an explicit private-route exception
- activity was not uniformly attributable to turns, so coverage had to be a first-class metric instead of hidden filtering
- local Git state could suggest a correlation but could not truthfully establish push history

The implementation also benefited from separating portfolio questions from project questions. The landing now answers where work is moving and how concentrated it is. The drilldown answers what changed inside one project. That boundary keeps the landing at a useful abstraction level and prevents it from becoming a wall of unrelated cards.

The highest-leverage next experiment is the gated GitHub commit-visibility seam. It should test whether a T3Code thread window contains a commit that GitHub can currently resolve, while discarding all repository and identity details before persistence. It should not claim push time, contribution, authorship, or productivity.
