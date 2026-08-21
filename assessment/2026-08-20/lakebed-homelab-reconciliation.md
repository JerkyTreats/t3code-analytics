# Lakebed And Homelab Reconciliation

Assessment date: 2026-08-20

## Outcome

The Leviathan cluster can host a normal internal analytics application cleanly. It cannot yet host Lakebed as an evidence-backed durable production service.

The cluster side is ready. GitOps, service discovery, internal DNS, shared TLS, reverse proxying, secret delivery, monitoring infrastructure, and compute headroom all have working reusable seams. The missing contract is on the Lakebed side: version `0.0.29` ships no production runner, OCI image, durable store, self-host control plane, backup and restore path, or arbitrary custom-domain registration flow.

Lakebed therefore has a meaningful but bounded place in this homelab:

- strong fit for rapid capsule authoring, local transactional experiments, and externally hosted presentation of synthetic or reviewed aggregate data
- weak fit for a cluster-owned system of record or durable internal application runtime
- no current fit as the analytical transformation engine or direct reader of private T3Code state

The requested hostname `analytics.t3code.internal.jerkytreats.dev` does not work today. It has no DNS answer, `PublishedService`, shared certificate coverage, Caddy route, Kubernetes Service, workload, or Lakebed process.

## Concern And Scope

The assessed behavior is durable service of the existing Lakebed analytics capsule at the requested internal hostname, reconciled across artifact compilation, execution, persistence, identity, storage, network publication, GitOps, operations, and the governed analytics input boundary.

Evidence includes:

- official Lakebed documentation
- local source from the published Lakebed `0.0.29` npm package
- the existing synthetic analytics capsule
- declarative Leviathan cluster configuration
- live read-only Kubernetes and DNS observations
- a temporary anonymous artifact build
- a temporary reverse-proxy behavior spike

No deployment, external Lakebed resource, authentication attempt, secret read, cluster write, Argo refresh, DNS edit, or infrastructure repository edit was performed.

The privacy and governance boundary remains authoritative. Lakebed must not receive raw T3Code content, user topology, credentials, or unreviewed operational records.

## Regenerated Domain Snapshot

The operating path under assessment is:

```text
accepted aggregate publication
  -> Lakebed capsule artifact
  -> executable runtime and durable store
  -> application identity and authorization
  -> Kubernetes workload and Service
  -> PublishedService and shared SAN certificate
  -> Caddy internal HTTPS edge
  -> internal browser origin
  -> monitoring, backup, and recovery
```

Two materially different hosting paths must not be conflated:

```text
official hosted path
  capsule artifact -> Lakebed API -> Lakebed runtime and state -> lakebed.app

cluster-owned path
  capsule artifact -> missing production runner -> Kubernetes -> internal host
```

The first path is supported but external to the homelab. The second path would be internal, but its runtime and persistence layer are not supplied by Lakebed.

## Pass One Domain Sweep

| Domain | Needed relationship | Current relationship | Completeness | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| Analytics governance | own | owns reviewed aggregate boundary | partial until real exporter exists | repository policy and source assessment | separate authorized data slice |
| Capsule source and build | publish | publishes anonymous source artifact | complete for experiment | successful Lakebed `0.0.29` build | reuse |
| Local Lakebed runtime | none for production | ephemeral developer server | complete as non-integration | memory-backed package runtime | none |
| Official Lakebed hosting | consume | no hosted deploy created | available but untested here | CLI deploys to Lakebed API | hosted spike |
| Database persistence | own | hosted only, memory-backed locally | blocked for self-host | only `MemoryCapsuleStore` ships | upstream contract |
| Authentication and identity | own | hosted Lakebed Auth only | blocked for internal origin | exact-origin token contract | upstream contract |
| Object storage | none | capsule does not use uploads | complete as non-integration | capsule source and storage docs | none |
| Browser transport and origin | adapter | working local HTTP and reactive transport | partial for hosted alias | origin-bound auth and preserved Host | proxy verdict |
| Container image supply | publish | no runner image exists | blocked | npm package inventory | upstream runtime first |
| Kubernetes workload and Service | own | reusable pattern, no target workload | platform seam complete | live cluster and T3Code Admin manifests | later GitOps slice |
| Secrets and configuration | consume | reusable OnePassword seam | platform seam complete | existing workloads | later GitOps slice |
| Internal DNS, TLS, and proxy | publish | healthy shared platform, target absent | platform seam complete | 23 ready publications and ready certificate bundle | later publication slice |
| GitOps delivery | own | reusable Argo ownership, target absent | platform seam complete | healthy `internal-web` application | later GitOps slice |
| Observability | publish and observe | Prometheus and OTLP ready, Lakebed export absent | partial | monitoring configuration and Lakebed CLI | adapter |
| Backup and retention | own | no Lakebed restore path | blocked | export is page-consistent and no import ships | upstream contract |
| T3Code extraction | publish accepted aggregates | deliberate non-integration | not started by design | analytics governance policy | separately authorized P1 |
| Shared PostgreSQL | none | no Lakebed adapter | complete as non-integration | package inventory | none |
| Public ingress and Pomerium | none | target is internal | complete as non-integration | requested hostname and infra policy | none |
| GPU acceleration | none | no requirement | complete as non-integration | runtime shape | none |

## Frozen Affected Set

The affected domains are frozen as:

`analytics governance`, `capsule artifact`, `official hosted plane`, `database persistence`, `authentication`, `browser origin`, `container supply`, `Kubernetes workload`, `secrets`, `internal publication`, `GitOps`, `observability`, `backup`, `T3Code aggregate publication`

Object storage, shared PostgreSQL, public ingress, Pomerium, and GPU acceleration are explicit non-integrations. They are not hidden implementation work.

## Pass Two Decomposition

| Concern | Owner | Current ground | Required relationship | Change posture | Boundary risk |
| --- | --- | --- | --- | --- | --- |
| Artifact compilation | Lakebed CLI | working self-describing JSON envelope | hosted runner consumes artifact | reuse | artifact is not executable by Kubernetes |
| Deploy admission | Lakebed hosted API | CLI create and update flow | external plane admits artifact | reuse for hosted route | data residency and external control plane |
| Alternate API origin | Lakebed CLI and hypothetical operator | CLI accepts `--api` | compatible control plane implements full API | new platform | client seam does not provide a server |
| Durable row execution | Lakebed hosted runner | hosted Postgres, local memory | durable store and transaction runtime | new platform for self-host | restart data loss |
| Recovery | Lakebed and service operator | export only | import and tested restore | extend | no evidenced recovery contract |
| Identity verification | Lakebed Auth | works on supported hosted origin | recognize internal exact origin | upstream extension | token audience mismatch |
| Custom hostname | Lakebed domains plane | documents Lakebed-owned subdomains | register arbitrary internal origin | upstream extension | virtual-host and redirect mismatch |
| Reverse proxy | dns-operator owner | preserves incoming Host | route to origin-compatible backend | adapter | hosted edge likely sees wrong Host |
| Workload packaging | Leviathan app owner | established hardened Deployment shape | digest-pinned runner image | small after runtime exists | mutable `npx` startup is not reproducible |
| Service publication | internal-web owner | established ready `PublishedService` flow | add one host to one stable Service | small after backend exists | dead route if added early |
| Persistent volume | Leviathan state owner | node-local `local-path` available | mount a documented durable state path | blocked | PVC cannot persist memory stores |
| Secrets | OnePassword and app owner | working secret injection | provide publication and runtime secrets | reuse | hosted environment is a separate plane |
| Aggregate loader | analytics owner | synthetic protected loader only | publish reviewed snapshots | separate authorized slice | direct live coupling violates governance |
| Metrics and traces | observability owner | collectors available | Lakebed export or adapter | extend | silent stateful service is hard to operate |

## Runtime Scope, Behavior Scope, And Write Scope

The runtime path includes the accepted snapshot, publication endpoint, Lakebed runtime or replacement app, service discovery, internal proxy, TLS, DNS, browser transport, and operational signals.

The behavior-change scope for a durable self-hosted Lakebed route would include a new artifact runner, durable database adapter, restart semantics, identity verification, custom-origin routing, recovery, container supply, and telemetry. That is a platform implementation, not a small app deployment.

The write scope of this assessment is the analytics documentation only. Infrastructure and live runtime state remained read-only.

## Ownership And Boundary Synthesis

The smallest missing connective behavior depends on the chosen path.

For cluster-owned Lakebed, the missing behavior is a supported production runner joined to a durable store. Kubernetes publication cannot start honestly until that exists.

For Lakebed-managed hosting under the internal name, the missing behavior is supported arbitrary-origin registration across virtual-host routing and Lakebed Auth. A Host-rewrite relay is not equivalent because it leaves identity audience behavior unresolved.

For a conventional internal analytics application, no platform-level connective behavior is missing. The remaining work is an authorized application slice: build a digest-pinned workload, consume reviewed analytical artifacts, expose health and operational signals, then publish one stable Service through the existing internal-web owner.

Ownership remains separated:

- the analytics repository owns governance, accepted aggregate contracts, and presentation behavior
- the workload GitOps owner owns executable image, Deployment, Service, probes, and resource posture
- the internal-web owner owns hostname, shared certificate selection, and Caddy publication
- Lakebed owns its hosted runner, data plane, identity, and supported domain contract
- the T3Code runtime remains a source owner and is not changed by this assessment

## Experiment Evidence

### Capsule behavior

The existing synthetic capsule proved that Lakebed can compile a full-stack artifact, protect a narrow publication endpoint, roll back a failed multi-write transaction, and serve coherent snapshots while reads overlap writes. Eighty overlapping reads during 24 alternating publications saw only complete snapshots.

### Package and hosting behavior

The published package contains a source development server, compiler, deploy client, client SDK, artifact envelope, abstract store contract, and memory-backed implementations. It does not contain a production runner image, control-plane server, Kubernetes assets, durable store implementation, identity service, or hosted object-store wiring.

`lakebed dev` constructs memory-backed database, object storage, and log components. A PVC would not make those objects durable because they are never written through a documented filesystem state path.

The built artifact identifies itself as `lakebed.capsule.artifact.v1` and targets anonymous source execution. It is self-describing, but it is neither an OCI image nor a standalone executable.

### Live cluster behavior

Read-only observation found:

- the `internal-web` Argo application is Synced and Healthy
- all 23 current `PublishedService` resources are Ready
- the `internal-shared` certificate bundle is Ready at observed generation 26
- the target is absent from publications, certificate domains, Caddy runtime, Kubernetes Services, and DNS
- the existing T3Code internal host resolves and returns HTTP 200 with valid TLS
- the single node had about 2 percent CPU and 21 percent memory use during observation

The smallest reusable in-cluster shape is:

```text
dedicated namespace
  -> digest-pinned Deployment
  -> ClusterIP Service
  -> PublishedService
  -> internal-shared CertificateBundle
  -> shared Caddy
  -> tailnet HTTPS
```

### Edge and origin behavior

The dns-operator proxy supports HTTP and HTTPS upstreams, WebSocket-style upgraded connections, forwarding headers, and shared certificate publication. It preserves the incoming Host header and exposes no upstream Host override in the `PublishedService` contract.

A temporary reverse proxy proved that the Lakebed development server can serve the root HTML, client assets, JSON endpoints, protected synthetic publication, and reactive WebSocket queries through a dedicated hostname. The proxy preserved the public Host and forwarded connection upgrades. This removes basic HTTP and reactive transport from the blocker list.

The same spike also established four production failures:

- restarting the process erased the published snapshot
- two simultaneous replicas held divergent isolated state
- database, logs, tables, export, and storage inspection routes returned HTTP 200 without an inspection token
- the development server ignored forwarded HTTPS when deriving the authentication origin

The last behavior makes the browser use the HTTPS audience while the server derives an HTTP audience behind TLS termination. No signed Google token was used, so the exact authentication failure remains a source-backed inference.

Subpath navigation returned an HTML shell, but the shell still emitted root-relative assets, WebSocket paths, auth callbacks, and application links. A dedicated hostname works better than a path prefix.

Official Lakebed domain commands document Lakebed-owned `lakebed.app` subdomains. Lakebed Auth tokens are bound to the exact browser origin. A direct proxy from the requested internal host to a hosted Lakebed origin is therefore not a supported custom-domain path on current evidence.

A relay that rewrites Host could plausibly render anonymous traffic, but it would add an app, not remove one, and authenticated origin behavior would remain unproven. This is an inference, not a completed hosted test.

## Hosting Options

| Option | Ease | Durability | Homelab ownership | Internal hostname | Verdict |
| --- | --- | --- | --- | --- | --- |
| Official Lakebed hosting | easy by product design | Lakebed-managed | low | unsupported or unproven | good synthetic hosted spike |
| `lakebed dev` in a Pod | easy to package badly | none across restart | apparent only | technically publishable | disposable demo only |
| Self-built Lakebed runner | hard | owner must implement | high | possible after platform work | unjustified for one app |
| Conventional internal app | established | owner-selected store and backup | high | directly supported | best durable internal route |
| Lakebed for prototyping only | easy | not relied upon | bounded | local or hosted lab URL | meaningful current fit |

## Constraints That Matter For Analytics

Current published limits and package behavior include:

- Node 20 or newer
- local database and object storage reset with the process
- anonymous artifact size of 1 MiB
- state size of 1 MiB
- 16,384 state rows
- 10,000 requests per day
- 1,000 mutations per day
- 1,000 writes per transaction
- 5 second transaction duration
- 1,000 rows returned per operation
- 5,000 rows read per operation
- 4 MiB read per database operation
- scalar database fields limited to strings, booleans, and table identifiers
- no SQL joins
- page-consistent export with no current import or restore command

These constraints are compatible with a compact materialized analytics snapshot. They are not a natural fit for general analytical transformation, raw event retention, or homelab disaster recovery.

## Explicit Non-Integrations

- Lakebed does not read the live T3Code database.
- Lakebed does not receive raw event or trace content.
- Shared PostgreSQL is not treated as a Lakebed store without a supported adapter.
- A PVC is not treated as persistence for an in-memory runtime.
- Traefik is not added beside the established dns-operator Caddy path.
- Pomerium and public DNS are outside this internal service.
- Object storage is unnecessary for the current analytics capsule.
- GPU capacity has no role in this runtime.

## Evidence And Confidence

High-confidence facts come from the package source, successful local build, existing capsule tests, declarative infrastructure, and live read-only cluster state.

Medium-confidence inferences concern a real hosted Lakebed edge behind the internal alias. No hosted deployment or authenticated session was authorized, so virtual-host rejection, redirects, cookies, and WebSocket behavior were modeled from the documented origin contract and proxy implementation rather than tested against a claimed deploy.

Primary sources:

- [Lakebed overview](https://docs.lakebed.dev/)
- [Lakebed reference](https://docs.lakebed.dev/reference/)
- [Lakebed database guide](https://docs.lakebed.dev/database/)
- [Lakebed identity contract](https://docs.lakebed.dev/auth/)
- [Lakebed object storage](https://docs.lakebed.dev/storage/)
- [Local experiment reflection](../../../research/lakebed-experiment-reflection.md)
- [Synthetic analytics capsule](../../../experiments/lakebed-analytics/README.md)
- `/home/jerkytreats/infra/k8s/clusters/leviathan/internal-web-published-services.yaml`
- `/home/jerkytreats/infra/k8s/clusters/leviathan/t3code-admin/deployment.yaml`
- `/home/jerkytreats/dns-operator/internal/publish/runtime.go`
- `/home/jerkytreats/dns-operator/api/publish/v1alpha1/publishedservice_types.go`

## Unresolved Questions For Lakebed

1. Is a supported self-hosted artifact runner or OCI image planned?
2. Will a production `CapsuleStore` implementation and restart contract be published?
3. Can hosted applications register arbitrary custom domains?
4. Can Lakebed Auth accept and verify an internal exact origin?
5. What is the supported import and full restore workflow?
6. Can runtime logs, metrics, and traces be exported to standard collectors?
7. Is there a production bulk publication contract for reviewed snapshots?

## Recommendation

Keep Lakebed in the homelab stack as an experiment and authoring tool, not as a cluster runtime dependency.

The smallest honest next Lakebed experiment is an official hosted deployment under a claimed `lakebed.app` hostname using synthetic data only. It should test persistence across redeploy, protected publication, inspection, export, reactive transport, and authentication. It is a paid or externally stateful action if the service requires one, so it was not performed implicitly.

Do not add `analytics.t3code.internal.jerkytreats.dev` yet. Add that hostname only after either Lakebed publishes a supported custom-origin contract or a durable conventional internal analytics workload exists behind the cluster Service.

For a durable internal analytics site now, build the small presentation service on the established Kubernetes path and keep Lakebed as the fast prototype that informs its query and user-interface contract.
