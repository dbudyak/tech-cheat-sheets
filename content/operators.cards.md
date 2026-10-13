# Operators & cluster lifecycle flashcards
<!-- controller-runtime / kubebuilder / Cluster API v1.14 (v1beta2 API) checked via Context7 -->

## Operator pattern

Q: What is the operator pattern?
A: Encoding operational knowledge (install, upgrade, backup, failover) into a **controller** that manages a **custom resource**. Users declare `kind: PostgresCluster` / `kind: Cluster`; the operator reconciles real infrastructure to match.
It's Kubernetes' own controller model applied to your domain.

Q: What is a CustomResourceDefinition (CRD)?
A: An API object that registers a new resource type (group, version, kind, scope, **OpenAPI v3 schema**) with the apiserver. After that, `kubectl get mykinds` works, objects are stored in etcd, validated, and RBAC applies — no code runs until a controller watches them.

Q: What is a custom resource (CR) vs a CRD?
A: The CRD is the type definition ("class"); a CR is an instance ("object") of that type, e.g. one `Cluster` named `tenant-a`. The controller reconciles CRs.

Q: spec vs status — who writes which?
A: `spec` = desired state, written by users/GitOps. `status` = observed state, written **only by the controller** via the `/status` subresource (separate RBAC, and spec writes don't touch it).
Status usually contains `conditions` and `observedGeneration`.

Q: What are `generation` and `observedGeneration`?
A: `metadata.generation` is incremented by the apiserver on every **spec** change (with the status subresource enabled). The controller writes `status.observedGeneration` = the generation it last reconciled.
`observedGeneration < generation` ⇒ "the latest change hasn't been processed yet" — what `kubectl rollout status` and GitOps health checks rely on.

Q: What are status conditions and why use them?
A: A standard list of `{type, status: True/False/Unknown, reason, message, lastTransitionTime, observedGeneration}` such as `Ready`, `Progressing`, `Degraded`.
Machine-readable for tools (`kubectl wait --for=condition=Ready`), human-readable via `reason`/`message`. Use `meta.SetStatusCondition` from apimachinery.

Q: What does a reconcile loop look like?
A: 1. Fetch the object (gone → return, nothing to do).
2. Handle deletion (finalizers).
3. Compute desired child state from spec; create/update/delete children to match (idempotently).
4. Update status/conditions.
5. Return result: done, requeue after X, or error (→ retry with back-off).

Q: Why must reconcilers be idempotent?
A: Reconcile can be called any number of times for the same state: on startup (resync of all objects), on every watched change, on requeue, after a crash mid-way. Running it twice must converge to the same result without duplicating resources — e.g. "ensure VM named X exists", never "create a VM".

Q: What does Reconcile receive as input, and why only that?
A: Just a `reconcile.Request{NamespacedName}` — no event type, no diff. Events are **coalesced** in a work queue; the reconciler reads the current state from the cache and recomputes. This is what makes it level-triggered and robust to missed events.

Q: Return values of Reconcile in controller-runtime and their effect?
A: - `ctrl.Result{}, nil` — done; wait for the next event.
- `ctrl.Result{RequeueAfter: 30*time.Second}, nil` — check again later (polling external systems).
- `ctrl.Result{}, err` — logged, requeued with **exponential back-off** (rate limiter).
- `reconcile.TerminalError(err)` — don't retry.

Q: What is a finalizer and why is it needed?
A: A string in `metadata.finalizers`. While present, a delete only sets `deletionTimestamp`; the object stays until all finalizers are removed.
The controller sees the deletion timestamp, cleans up **external** resources (cloud VMs, DNS, load balancers) that garbage collection can't reach, then removes its finalizer.

Q: Write the finalizer handling in a reconciler.
A: ```go
const fin = "example.com/cleanup"

if obj.DeletionTimestamp.IsZero() {
    if controllerutil.AddFinalizer(obj, fin) {
        if err := r.Update(ctx, obj); err != nil { return ctrl.Result{}, err }
    }
} else {
    if controllerutil.ContainsFinalizer(obj, fin) {
        if err := r.deleteExternal(ctx, obj); err != nil {
            return ctrl.Result{}, err // retry; object stays
        }
        controllerutil.RemoveFinalizer(obj, fin)
        if err := r.Update(ctx, obj); err != nil { return ctrl.Result{}, err }
    }
    return ctrl.Result{}, nil
}
```

Q: Owner references vs finalizers — when to use which?
A: **Owner references** — in-cluster children (Deployments, Secrets, Services) the CR creates: GC deletes them automatically and the controller gets events from them (`Owns()`). Set with `controllerutil.SetControllerReference`.
**Finalizers** — anything **outside** the cluster or across namespaces that GC can't track.

Q: What are informers, listers and the shared cache?
A: An informer does LIST+WATCH for one resource type, keeps an in-memory **cache** (indexer) and emits add/update/delete events to handlers. Listers read from that cache.
controller-runtime's manager shares one informer per type across all controllers, so `client.Get` reads from the cache (cheap, eventually consistent) and writes go to the apiserver.

Q: What is the work queue in a controller and what guarantees does it give?
A: Event handlers enqueue object keys (`ns/name`). The queue **deduplicates** keys, ensures a key is never processed by two workers concurrently, and supports rate-limited requeue. So N rapid updates → often one reconcile.

Q: What consequences does reading from the cache have?
A: Reads can be **stale**: right after you create a child, `Get` may not see it yet. Design for it: use deterministic names, tolerate `AlreadyExists`, rely on `resourceVersion` conflicts for writes, and don't assume read-your-writes. Use an uncached `APIReader` only when necessary.

Q: How do you handle `409 Conflict` on update?
A: Conflict = someone changed the object since you read it (optimistic concurrency via `resourceVersion`). Return the error and let the reconciler requeue and re-read, or use `retry.RetryOnConflict`. Prefer **patches** (merge/SSA) for status and finalizers to reduce conflicts.

Q: What do `For`, `Owns` and `Watches` mean in SetupWithManager?
A: ```go
ctrl.NewControllerManagedBy(mgr).
    For(&v1.Database{}).                 // primary resource
    Owns(&appsv1.StatefulSet{}).         // children → enqueue owner
    Watches(&corev1.Secret{},            // other objects → custom mapping
        handler.EnqueueRequestsFromMapFunc(r.dbsForSecret)).
    WithEventFilter(predicate.GenerationChangedPredicate{}).
    Complete(r)
```
`GenerationChangedPredicate` skips status-only and metadata-only updates.

Q: What is controller-runtime and what does it give you?
A: The Go library (kubernetes-sigs) under kubebuilder and Operator SDK: **Manager** (shared cache, clients, leader election, metrics, health probes, webhooks server), **Controller** builder, **Reconciler** interface, typed client, `envtest` for tests.

Q: What is kubebuilder?
A: A scaffolding tool: generates the project layout, API types (`api/v1/*_types.go`), controller stubs, and uses **controller-gen** to produce CRD YAML, RBAC and DeepCopy from Go markers:
```go
// +kubebuilder:validation:Minimum=1
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Ready",type=string,JSONPath=`.status.conditions[?(@.type=="Ready")].status`
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch
```

Q: What is client-go and how does it relate to controller-runtime?
A: client-go is the official low-level Go client: typed clientsets (`clientset.CoreV1().Pods(ns).Get(...)`), dynamic client, informers, workqueue, leader election, `tools/clientcmd` for kubeconfig. controller-runtime wraps it in a friendlier, generic API (`client.Get(ctx, key, &obj)`).

Q: Why does an operator need leader election?
A: You run 2+ replicas for availability, but only one should reconcile at a time to avoid conflicting writes. They compete for a **Lease** object; the holder renews it and others wait. controller-runtime: `LeaderElection: true` in manager options.

Q: How do you test a controller?
A: - Unit-test pure logic (desired-state builders).
- **envtest**: starts a real etcd + kube-apiserver binary locally (no kubelet/controllers), install CRDs, run your reconciler and assert with `Eventually` (Ginkgo/Gomega).
- fake client for fast tests, kind clusters for e2e.

Q: What are conversion webhooks and storage versions?
A: A CRD can serve multiple versions (`v1alpha1`, `v1beta1`, `v1`), but stores only one (**storage version**). If schemas differ, a **conversion webhook** converts between them (hub-and-spoke in kubebuilder). Old objects in etcd must be migrated before dropping a version.

Q: What are defaulting and validating webhooks — and CEL validation?
A: Webhooks your operator serves to set defaults and reject invalid CRs. Simple rules can now be in the CRD schema as **CEL** `x-kubernetes-validations` (e.g. immutability `self == oldSelf`, cross-field checks) — no webhook to run:
```go
// +kubebuilder:validation:XValidation:rule="self.minReplicas <= self.maxReplicas",message="min > max"
```

Q: Common operator anti-patterns?
A: - Edge-triggered logic ("on create do X") instead of reconciling state.
- Long blocking calls in Reconcile (use RequeueAfter + status).
- Writing status on every reconcile even if unchanged → event storm/hot loop.
- Not using owner refs/finalizers → leaked resources.
- Storing state in memory instead of status/annotations.
- One giant CRD that does everything.

Q: How do you avoid a hot reconcile loop?
A: Only update status when it changed (compare before patching), filter events with predicates (`GenerationChangedPredicate`), avoid writing fields on your own watched object that trigger yourself, and use back-off/`RequeueAfter` instead of immediate requeues.

## Cluster API

Q: What is Cluster API (CAPI)?
A: A Kubernetes sub-project that manages **Kubernetes clusters as Kubernetes objects**: declarative APIs + controllers to create, scale, upgrade and delete clusters on any infrastructure. Clusters are reconciled like Deployments are.

Q: Management cluster vs workload cluster?
A: **Management cluster** — runs the CAPI controllers and providers and stores `Cluster`/`Machine` objects.
**Workload clusters** — the clusters it creates, where user apps run. One management cluster can manage hundreds of workload clusters. Bootstrap one with kind + `clusterctl init`, then optionally `clusterctl move` it into a permanent cluster.

Q: What are the three provider types in Cluster API?
A: - **Infrastructure** provider — machines/networks/LBs on a platform (CAPO for OpenStack, CAPA AWS, CAPV vSphere, Metal3).
- **Bootstrap** provider — turns a machine into a node (kubeadm → cloud-init; Talos bootstrap → Talos machine config).
- **Control plane** provider — manages control-plane machines (KubeadmControlPlane, TalosControlPlane, or hosted control planes).

Q: Core CAPI objects?
A: - `Cluster` — references infra cluster + control plane objects.
- `Machine` — one node (≈ Pod).
- `MachineSet` — N identical Machines (≈ ReplicaSet).
- `MachineDeployment` — rolling updates of MachineSets (≈ Deployment).
- `MachineHealthCheck` — remediation of unhealthy Machines.
- Infra `*Template`s + bootstrap `*ConfigTemplate`s referenced by MachineDeployments.

Q: How does a MachineDeployment roll out a new Kubernetes version?
A: Changing `version` or a template ref creates a new MachineSet; machines are replaced **immutably**: create new machine → node joins → drain + delete old one, honouring `maxSurge`/`maxUnavailable` — exactly like Pods in a Deployment. (Newer CAPI also supports opt-in in-place updates via an extension.)

Q: What is a MachineHealthCheck?
A: Watches node conditions (e.g. `Ready=Unknown` for 5 min) and machine conditions; unhealthy Machines are **remediated** (deleted and recreated by their MachineSet). Has a guard (`unhealthyLessThanOrEqualTo`/range) so a network partition doesn't trigger mass deletion.

Q: What is ClusterClass / managed topology?
A: A reusable cluster **template**: control plane, worker classes, infra templates, variables and patches. A `Cluster` then only declares `spec.topology` (class, version, worker counts, variables) and CAPI generates and keeps all underlying objects in sync.
Upgrading 500 clusters ≈ changing `topology.version` on each, ideally rolled out progressively.

Q: What does `clusterctl` do?
A: CLI for CAPI: `init` (install providers into a management cluster), `generate cluster` (templates), `describe cluster` (condition tree), `move` (pivot objects between management clusters), `upgrade` (providers), `get kubeconfig`.

Q: What is Cluster API Provider OpenStack (CAPO)?
A: The infrastructure provider that creates OpenStack resources for clusters: `OpenStackCluster` (network, subnet, router, security groups, API server load balancer via Octavia) and `OpenStackMachine` (Nova servers from a Glance image, ports, volumes).

Q: How can Talos clusters be managed declaratively at scale?
A: Options: **Cluster API** with the Talos bootstrap and control-plane providers (CABPT/CACPPT) on any infra provider (e.g. OpenStack), Sidero **Omni** (SaaS/self-hosted management plane), or your own operator generating Talos machine configs and calling the Talos API. All share: immutable images + machine config as code.

## Day-2 operations

Q: What is "day 2" in cluster lifecycle?
A: Everything after creation: upgrades (Kubernetes, OS, add-ons), scaling, certificate rotation, backup/restore of etcd, node remediation, config drift correction, security patching, capacity management, observability, incident response, decommissioning.

Q: How would you upgrade hundreds of clusters safely?
A: - Declarative version pinned per cluster (ClusterClass topology / GitOps).
- **Waves/rings**: internal → canary tenants → rest, with automatic gates on health SLOs.
- Pre-flight checks: deprecated APIs, etcd health, PDBs that would block drains, add-on compatibility.
- Control plane first, then workers; surge machines; MachineHealthChecks.
- Fleet-wide observability of versions and a tested rollback/forward path.

Q: How do you manage add-ons (CNI, CSI, ingress, monitoring) across many clusters?
A: GitOps from the management side: Argo CD ApplicationSets with a cluster generator, Flux, or CAPI `ClusterResourceSet`/addon providers (Helm addon provider). Version add-ons together with the Kubernetes version in a tested "release bundle".

Q: What is configuration drift and how do controllers/GitOps handle it?
A: Drift = live state diverges from the declared state (manual `kubectl edit`, out-of-band changes). Controllers continuously reconcile it back; Argo CD shows OutOfSync and can **self-heal**; Terraform detects it only when you run `plan`.

Q: Certificates in a Kubernetes cluster — what needs rotating?
A: Cluster CA (long-lived), apiserver serving certs, etcd peer/client certs, kubelet client/serving certs (kubelet can auto-rotate), front-proxy, ServiceAccount signing keys. kubeadm certs expire after 1 year by default (renewed on upgrade); Talos rotates most of them automatically.

## Ray on Kubernetes (KubeRay)

Q: What is Ray?
A: An open-source distributed compute framework for Python (AI/ML): tasks and actors scheduled across a cluster of a **head node** and **worker nodes**, plus libraries for training (Ray Train), tuning (Tune), data processing (Ray Data) and model serving (Ray Serve).

Q: What does the KubeRay operator provide?
A: CRDs reconciled by an operator:
- `RayCluster` — head + worker groups as Pods, with autoscaling.
- `RayJob` — creates a cluster, submits a job, optionally tears it down.
- `RayService` — Ray Serve deployments with zero-downtime upgrades.
A textbook example of an operator encoding a complex distributed system's lifecycle.

Q: What platform concerns come up when running Ray/AI workloads on Kubernetes?
A: GPU scheduling (device plugins / DRA, taints for GPU nodes), gang scheduling and queues (Kueue, Volcano), large images and fast storage, autoscaling of worker groups with the Ray autoscaler + cluster autoscaler, and per-tenant quotas.
