# Lakebed Experiment Reflection

Date: 2026-08-20

Status: completed bounded feasibility experiment

Audience: Lakebed maintainers and the T3Code Analytics experiment owner

## Executive Reflection

Lakebed makes a strong first impression as an agent-native application runtime. The public docs are unusually direct, the scaffold teaches the framework through both code and agent instructions, and the path from an empty directory to a running full-stack app is short and coherent.

The main friction appeared at the exact boundary this experiment cares about: adopting Lakebed inside an existing repository with established data contracts and governance. The greenfield path is clear. The brownfield path is not yet equally clear.

For T3Code Analytics, Lakebed is viable as the last mile for server-authoritative queries, a compact Preact interface, authentication, inspection, and eventual deployment. The second checkpoint proved coherent snapshot publication with synthetic aggregates under concurrent reads. Lakebed does not replace extraction, columnar transformation, or analytical storage. That separation is healthy if the handoff into a capsule becomes explicit and repeatable.

## Experiment Question

Can T3Code Analytics be rebuilt around Lakebed as a small, privacy-safe experiment without asking Lakebed to become an analytical warehouse or weakening the existing source boundaries?

The answer is yes for a narrow presentation and query-serving role. A protected experiment endpoint successfully loaded materialized snapshots, but a production bulk-loading contract remains unanswered.

## Thread Context

The investigation began with a request to review [the Lakebed docs](https://docs.lakebed.dev/) and bootstrap T3Code Analytics around the framework.

The existing repository was not an empty application directory. It already contained:

- source and metric registries
- a privacy boundary that forbids user topology and raw interaction content
- a proposed read-only SQLite snapshot extractor
- a deliberate rule that presentation must not redefine metric semantics
- no existing application runtime or package manifest

That context made the experiment a brownfield adoption test rather than a simple starter tutorial.

## Process Reflection

### Documentation discovery

The overview immediately established the capsule model and the four important locations: `server/index.ts`, `client/index.tsx`, `shared/`, and `.env.lakebed.server`.

The machine-readable entry points were excellent. `llms.txt`, `llms-full.txt`, Markdown pages, and raw sources made the docs straightforward to inspect without scraping rendered prose. This is one of the clearest agent-facing choices in the product.

The database guide answered important questions early. Queries are read only, handlers receive a repeatable snapshot, writes are transactional, indexes are required, and SQL joins are not exposed. Those facts made it possible to reject an unsuitable architecture before writing code.

Evidence:

- [Lakebed overview](https://docs.lakebed.dev/)
- [Lakebed database guide](https://docs.lakebed.dev/database/)
- [Lakebed capsule API](https://docs.lakebed.dev/capsule-api/)
- [Lakebed full agent text](https://docs.lakebed.dev/llms-full.txt)

### CLI discovery

Running the CLI through `npx` required no installation step. The help output was concise and exposed the lifecycle in one place: create, develop, build, deploy, authenticate, inspect, export, and read logs.

The package resolved to Lakebed version `0.0.29`. The docs currently label the product as alpha, which set an appropriate expectation for sharp edges.

### Greenfield scaffold

The following command created a working capsule in a temporary directory:

```sh
npx lakebed new <temporary-path>/capsule --no-git
```

The generated project contained:

```text
.gitignore
AGENTS.md
CLAUDE.md
README.md
client/index.tsx
favicon.svg
server/index.ts
shared/todo.ts
```

Generating both `AGENTS.md` and `CLAUDE.md` was a particularly effective agent-native detail. The instructions were concrete, current with database API v1, and aligned with the public docs. The scaffold also demonstrated queries, mutations, auth, routing, a server endpoint, shared validation, and styling in one small example.

### Existing repository adoption

The generator rejects a target that already exists. The error began with a clear message and then printed an internal JavaScript stack.

```text
Error: Target already exists: <path>
```

This behavior is safe, but it leaves an adoption gap. The docs explain how new capsules behave inside an existing Git repository, yet they do not give an equally direct recipe for turning the existing repository root into a capsule.

The practical choices were left to inference:

- create a nested capsule and decide how it relates to repository-level contracts
- manually copy the generated structure into the repository root
- treat a non-empty root as a capsule without generator support

For an agent, this is the moment where a confident greenfield workflow becomes an architecture decision.

### Build

The untouched starter built successfully with this command:

```sh
npx lakebed build <capsule-path> --target anonymous --out <artifact-path> --json
```

The build completed quickly and returned a compact machine-readable result with the artifact hash, path, client bundle hash, and artifact format. The generated artifact was about 412 KiB and described itself as:

```json
{
  "createdWith": {
    "compiler": "0.1.0",
    "lakebed": "0.0.29"
  },
  "format": "lakebed.capsule.artifact.v1"
}
```

This self-description is excellent for debugging and provenance.

The build also exposed a brownfield footprint issue. The command was launched from the analytics repository while the capsule path and artifact output both pointed to a temporary directory. Lakebed still created intermediate bundles under `.lakebed/build` in the caller working directory. Starting development with the same explicit capsule path added another caller-local build directory.

The generated capsule ignores `.lakebed`, but the unrelated caller repository did not. This left untracked build output in the analytics repository even though no Lakebed command targeted it as the capsule. The files were identified during cleanup and removed.

### Local runtime

The development server started immediately and printed only the useful facts:

```text
Lakebed capsule running at http://localhost:4173
Capsule: <capsule-path>
Auth: guest:local
```

The generated status endpoint returned `ok`. The root document returned HTTP 200 with `Cache-Control: no-store`, the expected favicon, the client module, and the auth base URL.

The local listener bound to all interfaces. This suggests the later collaborative preview failure was not caused by a loopback-only Lakebed server.

### Runtime inspection

The inspection commands worked while the development server was running:

```sh
npx lakebed db list --port 4173
npx lakebed db dump --port 4173
npx lakebed logs --port 4173
npx lakebed db export --port 4173 --out <backup-path>
```

`db list` returned the declared `todos` table. `db dump` exposed schema version, schema hash, index state, row counts, and failed index information. That output is compact and useful for both agents and humans.

The empty database export reported zero rows across one table and wrote a self-describing backup. The backup declared `consistency` as `per_page`.

That field is commendably honest, but it raises an important documentation question. The overview says the export walks every table in bounded pages and atomically writes a complete backup. A reader could interpret atomic backup as a consistent database snapshot. The exported metadata suggests atomic file replacement and page-level consistency instead. Analytics and migration users need that distinction stated directly.

### Browser handoff

Direct HTTP checks succeeded, but the T3 Code collaborative preview failed to navigate to the development port across multiple attempts and a fresh tab. The same preview could browse the public Lakebed documentation.

This is not currently a Lakebed finding. The server was healthy and bound to all interfaces. It is recorded because remote and agent-hosted development environments are part of the likely Lakebed audience, and a documented headless verification path would reduce ambiguity when an outer preview system fails.

### Styling runtime

The local HTML loads Tailwind browser support from `cdn.jsdelivr.net` at runtime. The docs accurately say there is no Tailwind build step, but they do not make this development-time network dependency prominent.

This matters for offline work, restricted networks, deterministic visual tests, and environments with strict content security policy. The hosted behavior was not tested, so this observation applies only to the local runtime response inspected in this experiment.

## What Worked Especially Well

### Agent legibility

Lakebed tells an agent what the whole application is, where each kind of code belongs, what imports are legal, and which commands prove runtime state. The product rarely forces the agent to infer hidden framework structure.

### Fast path to product behavior

The generated capsule is not a static hello world. It demonstrates a server-owned query, a validated mutation, an authenticated index, client routing, and an HTTP endpoint. That gives an experiment enough surface to evaluate real framework behavior immediately.

### Inspectability

Build hashes, schema hashes, index readiness, table dumps, exports, logs, and runtime identity are available from the same CLI. This supports the excellent documentation advice to inspect before guessing.

### Security posture

The docs repeatedly reinforce server authority, ownership checks, server-only environment values, and private hosted inspection. The restricted anonymous server runtime preserves ordinary authorization control flow. These are good defaults for agent-authored applications.

### Honest limits

The documentation clearly states the current constraints around imports, Node built-ins, joins, local persistence, outbound fetch, and hosted environment values. That made architectural fit assessment faster and safer.

## Constructive Feedback

### Priority one: add a first-class brownfield bootstrap path

The largest improvement would be a documented and supported way to initialize a capsule inside an existing non-empty repository.

A possible interface could be:

```sh
npx lakebed init
```

The command could create only missing capsule files, refuse collisions, detect an existing Git root, and print every file it plans to add. A dry run would make this safe for agents.

If Lakebed intentionally requires a nested capsule, the docs should state that and show a recommended monorepo shape. The key need is to remove an architectural choice from the bootstrap moment.

### Priority two: anchor generated state to the capsule

When a command receives an explicit capsule path, intermediate `.lakebed` state should default to that capsule or a system temporary directory, not the caller working directory.

If caller-local state is intentional, the CLI should print its location before writing. A dry-run or machine-readable field for every output root would also help agents keep repository boundaries clean.

This matters most in monorepos, orchestration scripts, and agent workspaces where the current directory may not be the application being built.

### Priority three: document the analytical handoff pattern

Lakebed is not an OLAP engine, and it does not need to become one. A short recipe for materialized analytical views would still unlock a valuable class of applications.

The recipe should answer:

- how a trusted external job should load accepted aggregate rows
- whether bulk import exists or is planned
- how to replace one published snapshot atomically
- how to keep query readers on the previous snapshot until the new one is complete
- how to attach lineage, extraction time, and quality state to a published snapshot
- which deploy credentials are appropriate for the loader

This would position Lakebed cleanly as the application boundary around governed data products.

### Priority four: add analytical scalar types

Lakebed v0 exposes string, boolean, and table identifier fields. The experiment therefore stored counts, rates, and observation times as strings.

That works for rendering accepted values, but it prevents native numeric range queries, numeric ordering, aggregation, and temporal filtering. Number and timestamp fields would materially improve analytical and operational application fit without requiring SQL joins.

If those field types are intentionally deferred, document the recommended encoding and the query limitations so agents do not build misleading lexical comparisons.

### Priority five: clarify export consistency language

The backup metadata says `per_page`, while the overview uses atomic backup language. Clarify that atomicity refers to writing the output file if that is the intended meaning. Also state whether rows can reflect different source moments during a multi-page export.

This is important for backups, migrations, audits, and analytical snapshots.

### Priority six: make source versioning reproducible

The built artifact records the Lakebed version, but the generated source tree does not pin the CLI version. Repeating `npx lakebed` later may use a newer release.

Consider one of these options:

- write a minimal Lakebed version file
- include the tested CLI version in generated instructions and commands
- generate commands using an exact package version
- add a lock command that verifies local source compatibility before build

The artifact provenance is already strong. Extending that provenance to the source workflow would complete the story.

### Priority seven: surface the local styling dependency

Document that the development page loads Tailwind browser support from a public CDN, if that is intentional. Also document the expected offline behavior and hosted behavior.

A bundled development option would improve deterministic screenshots and work in restricted environments.

### Priority eight: make expected CLI errors quieter and more actionable

The existing-target error is correct, but the internal stack is not useful in the normal failure case. Prefer a short explanation with next choices, and reserve the stack for a debug flag.

Suggested shape:

```text
Target already exists and was not changed.
Use a new directory, or run lakebed init inside an existing repository.
```

### Priority nine: document remote development verification

The server already bound to all interfaces in this run. Document that behavior and provide a stable readiness command or machine-readable health check for container and remote workspace integrations.

This would help agents distinguish a Lakebed runtime failure from a browser bridge failure.

### Priority ten: fill small contract discoverability gaps

The runtime rejects server environment keys with the reserved `LAKEBED_` prefix. The error is precise, but the rule was not present in the overview or generated instructions reviewed during the experiment.

The database `insert` operation returns the complete inserted row, including its generated identifier and timestamps. The docs demonstrate awaited inserts but do not state the return shape. Making both contracts explicit would prevent avoidable agent detours.

## Fit For T3Code Analytics

### Good fit

- server-authoritative publication queries
- compact Preact presentation
- built-in routing and auth
- private inspection by default
- one-command local runtime
- deploy artifacts with useful provenance
- operational logs and database inspection

### Poor fit by design

- reading a live SQLite operational source
- field-level admission from critical raw records
- SQL joins and wide analytical scans
- Parquet transformation
- provider-specific token reconciliation
- reproducible multi-stage data quality execution

### Proposed experiment boundary

The safest architecture is:

```text
T3Code consistent snapshot
  -> external governed extractor
  -> accepted aggregate publication bundle
  -> Lakebed load boundary
  -> server-authoritative queries
  -> Preact analytical surface
```

The unresolved box was the Lakebed load boundary. The second checkpoint tested a deliberately narrow version using synthetic aggregate rows only.

## Checkpoint Two Evidence

The follow-up experiment now lives at `experiments/lakebed-analytics` and contains only synthetic data contracts.

### Materialized snapshot model

The capsule defines a snapshot table and a metric table. One indexed boolean marks the visible snapshot. Every metric row references its parent snapshot and carries a stable ordinal for deterministic display.

Counts, rates, and observation times are stored as strings because Lakebed v0 does not expose numeric or timestamp schema fields. This was workable for the presentation proof but is not sufficient for general analytical computation.

### Protected loader seam

A local `POST /api/publish-demo` endpoint accepts only the compiled `alpha` and `beta` fixtures. It requires a server environment key and rejects missing keys with HTTP 403. Unknown fixture versions return HTTP 400.

No arbitrary rows can enter through the endpoint. This keeps the experiment focused on publication behavior instead of designing a production ingestion API.

The first runtime start used a key beginning with `LAKEBED_`. Lakebed rejected the reserved prefix before startup and printed the exact offending key. Renaming it to `EXPERIMENT_WRITE_KEY` resolved the issue.

### Transaction behavior

The first publication attempt incorrectly treated the result of `insert` as a string identifier. Lakebed returned the inserted row, and the child insert failed schema validation. The endpoint returned HTTP 500.

A subsequent dashboard read remained empty. No partial parent row survived, which provided direct rollback evidence for a failed multi-write endpoint transaction.

After using the returned row identifier correctly, publication succeeded. Each successful transaction performs these steps:

1. read every current snapshot
2. insert the successor as inactive
3. insert all four metric rows
4. retire every previous current snapshot
5. activate the successor

### Coherent-reader stress check

The reproducible test at `tests/atomic-publication.sh` performed:

- one alpha publication and assertion
- one beta publication and assertion
- 24 alternating publications in a background writer
- 80 overlapping dashboard reads
- one final database invariant check

Every read returned either the complete alpha fixture or the complete beta fixture. No read returned a missing current snapshot, mixed metric values, or fewer than four metrics.

The final database contained 27 snapshots and 108 metric rows. Exactly one snapshot was current. All five indexes were ready and no index failures were reported.

Result: `atomic-publication-ok`.

### Build and presentation

The capsule built successfully as an anonymous source artifact with Lakebed `0.0.29`. The root document and JSON dashboard endpoint returned HTTP 200. The client bundle compiled with a reactive `dashboard` query, an empty publication state, an analytical overview, and a method page.

The frontend uses a geological field-report direction to make snapshot layering visually explicit. Build verification passed, but visual browser inspection remained blocked by the outer collaborative preview bridge. That remains a harness limitation rather than a Lakebed runtime failure.

Running every command from the capsule directory kept `.lakebed` state inside the ignored experiment boundary. This confirmed the cleanup recommendation from the first checkpoint.

## Completed Verdict

Lakebed passed the bounded last-mile feasibility experiment.

It can publish a small materialized snapshot atomically, expose coherent server-authoritative reads, reactively serve a Preact client, reject unauthorized writes, roll back failed multi-write transactions, and provide useful runtime inspection from one CLI.

The experiment does not justify using Lakebed as the analytical transformation engine. Production adoption would still require a supported bulk-loading contract, numeric and temporal field types or an accepted encoding strategy, retention behavior, authenticated operator writes, and successful visual verification in the target browser environment.

## Questions For The Lakebed Team

1. What is the intended bootstrap workflow for an existing non-empty repository root?
2. Is a safe `init` or merge-aware scaffold planned?
3. Where should `.lakebed` intermediate state live when a command receives an explicit capsule path?
4. Are numeric and timestamp schema fields planned?
5. What is the recommended bulk loading path for trusted external jobs?
6. Can a full published dataset be replaced atomically from the perspective of queries?
7. Does `consistency: per_page` allow a database export to span multiple source moments?
8. Is the Tailwind CDN dependency local-development only, and what is the offline story?
9. How should a repository pin the Lakebed CLI version used by source and CI?
10. Is there a supported readiness response for remote development harnesses?
11. Where are reserved server environment prefixes and database mutation return shapes documented?

## Feedback Summary For Sharing

Lakebed succeeded at the greenfield promise and the bounded publication proof. One command produced a legible full-stack app, the untouched starter built cleanly, transactional snapshot replacement stayed coherent under overlapping reads, and inspection tools exposed useful state without guesswork. Its agent documentation, transaction behavior, and artifact provenance are standout strengths.

The highest-value next improvement is brownfield adoption. A safe `lakebed init` flow, capsule-anchored build state, a documented external data-loading pattern, clearer export consistency semantics, and source-level CLI pinning would make Lakebed substantially easier to adopt for governed internal applications such as analytics.

No T3Code source data, user topology, raw interaction content, credentials, or hosted Lakebed resources were accessed or created during this checkpoint.

## Recommended Follow-up

The next work should not expand this feasibility experiment automatically. A production-oriented follow-up would need explicit authorization to test a real external loader contract, retention and replacement policy, operator authentication, numeric encoding, and the built artifact in a browser path independent of the failed collaborative preview bridge.

## Checkpoint Three: Homelab Reconciliation

The third checkpoint asked a different question from the capsule feasibility proof: can Lakebed itself become a durable service in the jerkytreats.dev internal Kubernetes cluster, and can that service honestly own `analytics.t3code.internal.jerkytreats.dev`?

The investigation split into three delegated evidence lanes:

- official hosting and published package contents
- live read-only Kubernetes, GitOps, DNS, TLS, storage, and telemetry inspection
- a temporary root-host reverse-proxy spike against the local Lakebed runtime

This split mattered. The cluster and Lakebed were independently capable in ways that did not add up to a production service.

### What The Cluster Proved

The cluster already has the normal internal application path:

```text
digest-pinned Deployment
  -> ClusterIP Service
  -> PublishedService
  -> shared SAN certificate
  -> shared Caddy
  -> internal HTTPS hostname
```

Live read-only evidence found the `internal-web` Argo application Synced and Healthy, all 23 current publications Ready, and the shared certificate bundle Ready. Existing app patterns include hardened Pods, probes, resource bounds, OnePassword secret injection, and monitoring seams. The node had substantial experiment headroom.

The target analytics hostname remained absent from DNS, the certificate bundle, Caddy, Kubernetes Services, and workloads. No premature route was created.

Conclusion: Kubernetes is not the hosting blocker.

### What The Package Proved

Lakebed `0.0.29` ships a development server, compiler, deploy client, browser SDK, artifact envelope, abstract database store contract, and in-memory store implementations. It does not ship a standalone production runner, OCI image, self-host control plane, durable database store, local identity service, Kubernetes assets, or recovery command.

The capsule compiled into a self-describing `lakebed.capsule.artifact.v1` JSON envelope. That artifact is accepted by the Lakebed hosted API. It is not a standalone executable or container workload.

The `--api` option is a client seam for another API origin. It does not provide the server behind that origin.

Conclusion: rebuilding enough of Lakebed to run the artifact locally would mean owning a platform, not packaging an application.

### What The Proxy Spike Proved

A temporary reverse proxy preserved the requested public Host, supplied forwarded HTTPS headers, and forwarded WebSocket upgrades to a copied capsule.

The following behavior passed through the proxy:

- root HTML and client assets
- dashboard JSON endpoint
- protected synthetic publication endpoint
- guest WebSocket authentication
- reactive dashboard subscription
- complete synthetic snapshot response after publication

Basic path routing and WebSocket transport are therefore compatible with a dedicated internal hostname.

Production behavior failed in more important ways:

- process restart erased every row
- two concurrent replicas returned different state
- database, logs, tables, export, and storage inspection were reachable without an inspection token
- the development runtime ignored forwarded HTTPS when deriving the auth origin
- emitted HTML used root-relative paths and did not activate the available client base-path setting

The local server trusted arbitrary Host values, so ingress would also need to enforce the expected hostname.

Every temporary process, directory, response file, and listener was removed. No repository, DNS, cluster, GitOps, or Lakebed cloud state changed.

### Hosted Lakebed Versus Homelab Hosting

Lakebed apps are easy to host on the Lakebed-managed plane. The CLI handles artifact submission and the hosted platform owns the durable runner, database, identity, domain, environment, inspection, and storage layers.

That is not Lakebed hosted on the jerkytreats.dev cluster. It is an external application that could potentially be linked from the homelab.

Official commands document reservation of Lakebed-owned `lakebed.app` names. They do not document arbitrary custom-domain registration. Lakebed identity tokens are bound to the exact browser origin. The homelab proxy preserves the incoming internal Host and its resource contract has no upstream Host override.

A small relay could rewrite Host for anonymous traffic, but it would introduce another application and would not prove authenticated origin behavior. A direct internal alias is therefore unsupported or unproven, not a simple DNS task.

### Reconciled Verdict

Lakebed has a meaningful place in the homelab as an agent-legible authoring and experiment tool. It is particularly good for quickly testing a server-authoritative query contract, transactional snapshot publication, and a polished analytical surface against synthetic or reviewed aggregates.

Lakebed does not currently have an evidence-backed place as a cluster-native durable runtime, analytical store, or source transformation engine. Packaging `lakebed dev` in Kubernetes would create a service that looks hosted while losing state on restart, diverging under replicas, exposing development inspection, and misderiving auth origin behind TLS.

For a durable internal analytics service today, the established Kubernetes application pattern is the honest path. Lakebed can remain the prototype that shapes its query and presentation contract.

The full breadth-first domain sweep, frozen affected set, one-level decomposition, evidence confidence, and hosting option comparison are recorded in the [Lakebed and homelab reconciliation](../assessment/2026-08-20/lakebed-homelab-reconciliation.md).

### Constructive Feedback For Lakebed

The highest-value additions for homelab and private-cloud adoption would be:

1. a supported production artifact runner or OCI image
2. a durable store implementation with restart and migration contracts
3. documented custom-domain and exact-origin auth support
4. authenticated or disableable inspection surfaces
5. standard metrics, logs, and trace export
6. import plus tested restore workflows
7. correct canonical-origin handling behind trusted TLS proxies
8. explicit base-path emission or a documented dedicated-host requirement

The product remains compelling within its intended hosted model. The friction appears when a successful capsule is mistaken for a portable runtime artifact. Making that boundary more explicit in the CLI and documentation would prevent unsafe self-hosting attempts.

## Replacement Spike And Final Evidence

The conventional replacement made the boundary unusually clear. A small Rust service using Axum, rusqlite, and the official DuckDB binding went from source inspection to a live internal dashboard without changing T3Code. It reads the current SQLite source through explicit read-only flags and an exact read-only host mount, computes only allowlisted aggregates inside one transaction, and retains accepted snapshots in one DuckDB file.

T3Code itself is not a Kubernetes workload. It runs as a host systemd user service on Leviathan, while a selectorless Kubernetes Service points back to that host. The analytics workload does run in the same single-node k3s cluster. This makes the read-only host mount honest and narrow, while keeping the HTTP service, storage, probes, monitoring, image pull, GitOps ownership, DNS, and TLS inside the established cluster pattern.

Direct production evidence passed:

- the immutable GHCR image built successfully
- the Pod became Ready with zero restarts
- the four-gigabyte live source refreshed in about 0.6 seconds
- the steady local proof container used about 33 MiB of memory
- source and projection sequences matched with zero lag
- the deployed API exposed aggregates without forbidden fields or values
- trusted HTTP/2 requests returned status 200 through the requested hostname
- the renewed Let's Encrypt certificate covered the hostname
- desktop and mobile rendering passed against the live service

The shared certificate expansion revealed one homelab operations seam. The operator issued the correct certificate, updated authoritative DNS, rendered the correct Caddy route, and marked the publication Ready. The existing Caddy process still held the earlier certificate in memory and returned a TLS alert until its Deployment restarted. Lakebed did not cause this, but the replacement spike found it because it demanded end-to-end proof instead of treating controller status as completion.

This outcome strengthens the constructive Lakebed conclusion. The capsule was fast for proving the analytical interaction contract. The conventional app was straightforward for owning persistence, recovery shape, security posture, monitoring, cluster scheduling, custom hostname, and trusted TLS. Lakebed would become materially more useful in this homelab if a compiled capsule could cross that same boundary through a supported durable runner and custom-origin contract.
