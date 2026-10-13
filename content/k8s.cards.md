# Kubernetes flashcards
<!-- Checked against kubernetes.io docs for v1.37 (Context7). -->

## Architecture

Q: What is Kubernetes in one sentence, and what problem does it solve?
A: A declarative control plane for running containers across a fleet of machines: you store the **desired state** as API objects and controllers continuously drive the actual state towards it.
It replaces hand-written deploy scripts with self-healing scheduling, service discovery, rollouts and scaling.

Q: Name the control-plane components and what each one does.
A: - `kube-apiserver` — the only component that talks to etcd; REST API, authn/authz, admission, validation.
- `etcd` — consistent key-value store holding all cluster state.
- `kube-scheduler` — assigns unscheduled Pods to nodes.
- `kube-controller-manager` — runs built-in controllers (Deployment, ReplicaSet, Node, Job, EndpointSlice…).
- `cloud-controller-manager` — cloud-specific loops: nodes, routes, `LoadBalancer` Services.

Q: Name the node components and what each one does.
A: - `kubelet` — agent that watches Pods bound to its node and makes the container runtime run them; reports status, runs probes.
- container runtime (containerd, CRI-O) — pulls images and runs containers via the **CRI** gRPC API.
- `kube-proxy` — programs iptables/nftables/IPVS rules so Service virtual IPs reach Pod endpoints (some CNIs like Cilium replace it with eBPF).
- CNI plugin — gives Pods their network interfaces and IPs.

Q: What does the kube-apiserver do on every write request?
A: Authentication → authorization (RBAC) → **mutating admission** (webhooks, MutatingAdmissionPolicy) → schema validation → **validating admission** (webhooks, ValidatingAdmissionPolicy) → persist to etcd.
It is stateless and horizontally scalable; every other component talks only to it.

Q: Why is etcd critical and how is it made highly available?
A: etcd is the single source of truth for cluster state; losing it means losing the cluster.
It uses **Raft** consensus, so it needs a quorum of `(n/2)+1` members — run 3 or 5 members (odd numbers) to tolerate 1 or 2 failures. Latency-sensitive: needs fast disks (fsync).

Q: What does the scheduler actually do?
A: For each Pod with no `nodeName`: **filter** nodes that can't fit it (resources, taints, affinity, volume topology), **score** the rest (spreading, image locality, affinity weights), then **bind** the Pod to the best node by writing `spec.nodeName`.
It does not start containers — the kubelet does that.

Q: What is a controller in Kubernetes?
A: A control loop that **watches** a resource type, compares desired state (`spec`) with observed state (`status`/the world), and acts to close the gap. Example: the ReplicaSet controller creates/deletes Pods until the count matches `replicas`.
Controllers are level-triggered: they react to the current state, not to the sequence of events.

Q: What is the difference between level-triggered and edge-triggered, and why does Kubernetes use level-triggered?
A: Edge-triggered reacts to events ("a Pod was deleted"); level-triggered reacts to state ("there are 2 Pods but 3 wanted").
Level-triggered is robust to missed events, restarts and duplicates — the controller just recomputes the diff. That's why reconcilers must be idempotent.

Q: How does a Pod become running, end-to-end, after `kubectl apply -f deploy.yaml`?
A: apiserver stores Deployment → Deployment controller creates a ReplicaSet → ReplicaSet controller creates Pods → scheduler binds each Pod to a node → that node's kubelet sees it, CNI sets up networking, runtime pulls the image and starts containers → kubelet runs probes and updates Pod status → EndpointSlice controller adds ready Pods to Services.

Q: What is the declarative model vs imperative, and what does `kubectl apply` do?
A: Imperative: "create X, scale Y". Declarative: "here is the full desired state; make it so".
`kubectl apply` sends the manifest; with **server-side apply** (`--server-side`) the apiserver merges it and tracks **field ownership** (managedFields), detecting conflicts between managers (e.g. you vs the HPA on `replicas`).

Q: What is the watch mechanism and resourceVersion?
A: Clients `LIST` then `WATCH` from the returned `resourceVersion`; the apiserver streams ADDED/MODIFIED/DELETED events from etcd's revision.
`resourceVersion` is also used for **optimistic concurrency**: an update with a stale resourceVersion fails with `409 Conflict`.

## Workloads

Q: What is a Pod and why is it not "just a container"?
A: The smallest schedulable unit: one or more containers that share a network namespace (same IP, `localhost`), volumes, and lifecycle, always co-scheduled on one node.
Pods are ephemeral and replaceable — you rarely create them directly; controllers do.

Q: What are init containers and native sidecar containers?
A: Init containers run sequentially to completion **before** app containers start (migrations, waiting for deps, fetching config).
A sidecar is an init container with `restartPolicy: Always`: it starts before the app containers, keeps running alongside them, and is stopped after them (GA since 1.33). Fixes the old "Job never finishes because the log shipper keeps running" problem.
```yaml
initContainers:
- name: log-shipper
  image: fluent-bit
  restartPolicy: Always
```

Q: ReplicaSet vs Deployment?
A: A ReplicaSet keeps N identical Pods running, matched by a label selector.
A Deployment manages ReplicaSets to give you **rolling updates, rollback and revision history**: each template change creates a new ReplicaSet and scales old→new. You almost never create ReplicaSets directly.

Q: How does a Deployment rolling update work? What do maxSurge and maxUnavailable mean?
A: The controller scales up the new ReplicaSet and down the old one in steps.
- `maxSurge` — how many Pods above `replicas` may exist during the rollout (default 25%).
- `maxUnavailable` — how many may be unavailable (default 25%).
`maxSurge: 1, maxUnavailable: 0` = zero-downtime, one at a time. Readiness probes gate progress.

Q: How do you roll back a Deployment, and what is a revision?
A: Each pod-template change creates a new ReplicaSet = a revision (`revisionHistoryLimit`, default 10, old ones kept at 0 replicas).
```bash
kubectl rollout history deploy/api
kubectl rollout undo deploy/api --to-revision=3
kubectl rollout status deploy/api
```
In GitOps you roll back by reverting the commit instead.

Q: What is the Recreate strategy and when would you use it?
A: Deletes all old Pods before creating new ones — causes downtime.
Use when two versions must never run together (exclusive lock on a volume, incompatible schema migration, ReadWriteOnce volume).

Q: What is a StatefulSet and how is it different from a Deployment?
A: For stateful apps (databases, etcd, Kafka). It gives each Pod:
- a **stable identity**: `name-0`, `name-1`… with stable DNS via a headless Service,
- **stable storage**: its own PVC from `volumeClaimTemplates`, reattached after rescheduling,
- **ordered** create/scale/update (by default; `podManagementPolicy: Parallel` relaxes it).
Deployment Pods are interchangeable cattle; StatefulSet Pods are named pets.

Q: How do StatefulSet rolling updates work, and what is `partition`?
A: Pods are updated one at a time in **reverse ordinal** order (highest first), waiting for each to be Ready.
`updateStrategy.rollingUpdate.partition: N` only updates Pods with ordinal ≥ N — a built-in canary for stateful apps. `OnDelete` strategy updates a Pod only when you delete it.

Q: What is a DaemonSet? Give typical uses.
A: Runs one Pod per (matching) node, automatically adding Pods to new nodes.
Uses: CNI agents, kube-proxy, log collectors (Fluent Bit), node exporters, CSI node plugins, security agents. They usually tolerate taints so they also run on control-plane nodes.

Q: Job vs CronJob?
A: A **Job** runs Pods until a given number complete successfully (`completions`, `parallelism`, `backoffLimit`, `activeDeadlineSeconds`). Indexed Jobs give each Pod an index.
A **CronJob** creates Jobs on a cron schedule; `concurrencyPolicy` (Allow/Forbid/Replace), `startingDeadlineSeconds`, history limits, `timeZone`.

Q: What does `ttlSecondsAfterFinished` do on a Job?
A: Deletes the finished Job (and its Pods) N seconds after completion, so completed Jobs don't pile up in etcd. CronJobs use `successfulJobsHistoryLimit`/`failedJobsHistoryLimit` instead.

Q: Pod restartPolicy values and which controllers allow which?
A: `Always` (default; required for Deployment/ReplicaSet/StatefulSet/DaemonSet), `OnFailure` and `Never` (for Jobs).
Restarts happen in place on the same node with exponential back-off (10s → 20s → … capped at 5 min) — that back-off is what `CrashLoopBackOff` means.

Q: What is a PodDisruptionBudget?
A: Limits **voluntary** disruptions (node drain, cluster upgrade, autoscaler scale-down): `minAvailable` or `maxUnavailable` for Pods matching a selector.
`kubectl drain` uses the Eviction API, which refuses to evict if it would violate the PDB. Does not protect against node crashes.

Q: How does graceful Pod termination work?
A: Pod gets `deletionTimestamp` → removed from Service endpoints → `preStop` hook runs → `SIGTERM` to containers → after `terminationGracePeriodSeconds` (default 30s) → `SIGKILL`.
Your app must handle SIGTERM: stop accepting, drain in-flight requests, exit. A short `preStop` sleep helps avoid traffic to a terminating Pod while endpoints propagate.

## Networking

Q: What is the Kubernetes networking model?
A: Every Pod gets its own IP; all Pods can reach all other Pods without NAT; agents on a node can reach all Pods on it.
Implemented by a **CNI plugin** (Cilium, Calico, Flannel…). Isolation is opt-in via NetworkPolicy.

Q: What is a Service and why is it needed?
A: Pod IPs change when Pods are replaced. A Service is a stable virtual IP + DNS name (`svc.ns.svc.cluster.local`) that load-balances to Pods matching a **label selector**.
The EndpointSlice controller tracks ready Pod IPs; kube-proxy (or eBPF) programs the forwarding.

Q: Service types: ClusterIP, NodePort, LoadBalancer, ExternalName, headless?
A: - `ClusterIP` (default) — internal virtual IP.
- `NodePort` — also opens a port (30000–32767) on every node.
- `LoadBalancer` — also asks the cloud controller for an external LB (on OpenStack: Octavia).
- `ExternalName` — DNS CNAME to an external host, no proxying.
- Headless (`clusterIP: None`) — no VIP; DNS returns Pod IPs directly (StatefulSets, client-side LB).

Q: port vs targetPort vs nodePort vs containerPort?
A: `port` — the Service's port. `targetPort` — the Pod port traffic is sent to (number or named port). `nodePort` — port on every node (NodePort/LB). `containerPort` — informational declaration on the container.

Q: What is Ingress and what is an Ingress controller?
A: Ingress is an L7 (HTTP/HTTPS) routing object: host/path rules → Services, plus TLS.
It does nothing alone; an **Ingress controller** (ingress-nginx, Traefik, HAProxy…) watches Ingress objects and configures a proxy. Usually exposed through one LoadBalancer Service.

Q: What is the Gateway API and why is it replacing Ingress?
A: A role-oriented successor to Ingress: `GatewayClass` (infra provider) → `Gateway` (cluster operator: listeners, TLS) → `HTTPRoute`/`GRPCRoute`/`TLSRoute` (app teams).
Portable features that needed controller-specific annotations in Ingress: header matching, traffic splitting/weights, cross-namespace routing via `ReferenceGrant`. Note: the ingress-nginx project has been retired, pushing migration.

Q: How does DNS work inside a cluster?
A: CoreDNS runs as a Deployment behind the `kube-dns` Service. Pods' `/etc/resolv.conf` points at it with search domains, so `api` resolves within the namespace and `api.other-ns` across namespaces.
Records: `svc.ns.svc.cluster.local` (A/AAAA to ClusterIP or Pod IPs for headless), SRV for named ports, `pod-0.svc.ns...` for StatefulSet Pods.

Q: What is a NetworkPolicy?
A: Firewall rules for Pods (L3/L4), selected by labels: `podSelector`, `ingress`/`egress` rules with `from`/`to` pod/namespace selectors or CIDRs, and ports.
Once a Pod is selected by any policy for a direction, everything not allowed is denied. Enforced by the CNI — Flannel alone ignores them. Common baseline: default-deny per namespace + explicit allows.

Q: What is externalTrafficPolicy: Local and why use it?
A: Traffic from a NodePort/LoadBalancer is only sent to Pods on the receiving node: preserves the **client source IP** and avoids an extra hop, but nodes without a ready Pod fail LB health checks and load can be uneven. Default `Cluster` SNATs and spreads evenly.

## Config & Storage

Q: ConfigMap vs Secret?
A: Both hold key-value config, consumed as env vars or mounted files.
Secrets are for sensitive data: base64-encoded (**not encrypted**) in the API, can be encrypted at rest in etcd (EncryptionConfiguration/KMS), tighter RBAC, mounted on tmpfs. Mounted files update on change (not env vars, not `subPath`).

Q: How do you keep Secrets actually secret in a real cluster?
A: Encryption at rest with a KMS provider, least-privilege RBAC (`get`/`list` on secrets ≈ read all), no secrets in Git in plaintext — use External Secrets Operator / CSI secrets store backed by Vault/OpenBao, or Sealed Secrets/SOPS for GitOps. Prefer short-lived, dynamic credentials.

Q: PV, PVC and StorageClass — how do they relate?
A: - **PersistentVolume** — a piece of storage in the cluster (cluster-scoped).
- **PersistentVolumeClaim** — a namespaced request ("10Gi, RWO, class fast").
- **StorageClass** — a provisioner + parameters for **dynamic provisioning**: a PVC referencing it causes the CSI driver to create a volume and PV automatically.
Pods reference PVCs, never PVs directly.

Q: What are access modes and reclaim policies?
A: Access modes: `ReadWriteOnce` (one node), `ReadOnlyMany`, `ReadWriteMany` (NFS/CephFS), `ReadWriteOncePod` (one Pod).
Reclaim policy when the PVC is deleted: `Delete` (default for dynamic — volume destroyed) or `Retain` (keep data for manual recovery).

Q: What is CSI and why does it matter?
A: Container Storage Interface: a standard gRPC API so storage vendors ship drivers out-of-tree (controller plugin for create/attach/snapshot + node plugin DaemonSet for mount).
On OpenStack, the Cinder CSI driver provisions Cinder volumes for PVCs. Enables snapshots (`VolumeSnapshot`), expansion, topology.

Q: What does `volumeBindingMode: WaitForFirstConsumer` do?
A: Delays volume provisioning until a Pod using the PVC is scheduled, so the volume is created in the **same zone/AZ** as the node. With `Immediate`, a zonal volume might be created where the Pod can't run → Pod stuck Pending.

Q: What is an emptyDir volume?
A: Scratch space created when the Pod starts and deleted when it is removed (survives container restarts). Can be memory-backed (`medium: Memory`). Used for caches and sharing files between containers in a Pod.

## Scheduling & Resources

Q: requests vs limits?
A: **requests** — what the scheduler reserves; the node must have that much allocatable. Also the CPU share weight.
**limits** — hard cap enforced by cgroups: CPU over the limit is **throttled**; memory over the limit gets the container **OOMKilled**.

Q: What are the QoS classes and why do they matter?
A: - **Guaranteed** — every container has requests = limits for CPU and memory.
- **Burstable** — some requests/limits set but not Guaranteed.
- **BestEffort** — none set.
Under node memory pressure the kubelet evicts BestEffort first, then Burstable exceeding requests, Guaranteed last. Also influences OOM score.

Q: Why do many teams set memory limits but no CPU limits?
A: Memory is incompressible — without a limit one Pod can starve the node. CPU is compressible — limits cause CFS **throttling** and latency spikes even when the node has idle CPU. Setting accurate CPU *requests* gives fair sharing without throttling.

Q: What are LimitRange and ResourceQuota?
A: **LimitRange** — per-namespace defaults and min/max for container requests/limits (so Pods without them get defaults).
**ResourceQuota** — per-namespace totals: sum of CPU/memory requests, number of Pods, PVCs, LoadBalancers… Core multi-tenancy tools.

Q: Taints and tolerations?
A: A **taint** on a node repels Pods: `key=value:Effect` with effects `NoSchedule`, `PreferNoSchedule`, `NoExecute` (also evicts running Pods).
A **toleration** on a Pod allows (doesn't force) scheduling onto tainted nodes. Used for dedicated nodes (GPU), control-plane isolation, and node conditions (`node.kubernetes.io/not-ready`).
```bash
kubectl taint nodes n1 gpu=true:NoSchedule
```

Q: nodeSelector vs node affinity?
A: `nodeSelector` — simple exact label match.
Node affinity — expressive operators (`In`, `NotIn`, `Exists`, `Gt`…) and two modes: `requiredDuringSchedulingIgnoredDuringExecution` (hard) and `preferredDuringScheduling…` (soft, weighted). Taints repel; affinity attracts — combine both for dedicated nodes.

Q: Pod affinity / anti-affinity?
A: Schedule relative to other Pods by label within a `topologyKey` (e.g. `kubernetes.io/hostname`, `topology.kubernetes.io/zone`).
Anti-affinity spreads replicas across nodes/zones for HA; affinity co-locates (app next to its cache). Required anti-affinity can leave Pods Pending if there aren't enough nodes.

Q: What are topologySpreadConstraints?
A: Spread Pods evenly across topology domains with a max skew:
```yaml
topologySpreadConstraints:
- maxSkew: 1
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
  labelSelector: { matchLabels: { app: api } }
```
More flexible and efficient than pod anti-affinity for "spread across zones".

Q: What are PriorityClasses and preemption?
A: A PriorityClass gives Pods a priority value. If a high-priority Pod can't be scheduled, the scheduler may **preempt** (evict) lower-priority Pods to make room. System components use `system-cluster-critical` / `system-node-critical`.

Q: What is in-place Pod resize?
A: Changing a running container's CPU/memory requests/limits without recreating the Pod, via the Pod's `resize` subresource (GA in 1.35). `resizePolicy` per resource says `NotRequired` (apply live) or `RestartContainer`. VPA can use it to avoid evictions.

## Health & Autoscaling

Q: Liveness vs readiness vs startup probes?
A: - **liveness** — "is it wedged?" Failure → kubelet **restarts** the container.
- **readiness** — "can it take traffic?" Failure → removed from Service endpoints, not restarted.
- **startup** — "has it finished booting?" Disables the other two until it succeeds; for slow starters.
Types: `httpGet`, `tcpSocket`, `exec`, `grpc`.

Q: Common probe mistakes?
A: - Liveness checking downstream deps (DB down → all Pods restart → cascading outage). Liveness should only check the process itself.
- Same endpoint/thresholds for liveness and readiness.
- No startup probe for a slow JVM → killed during boot → CrashLoopBackOff.
- Timeouts too tight under GC pauses.

Q: How does the Horizontal Pod Autoscaler work?
A: A control loop (every ~15s) reads metrics (metrics-server for CPU/memory, or custom/external metrics via an adapter like Prometheus Adapter/KEDA) and sets `replicas`:
`desired = ceil(current × currentMetric / targetMetric)`.
CPU utilisation is relative to **requests**, so requests must be set. `behavior` configures stabilisation windows to avoid flapping.

Q: HPA vs VPA vs Cluster Autoscaler vs Karpenter?
A: - **HPA** — more/fewer Pods.
- **VPA** — right-sizes requests/limits per Pod (recommend, or apply by evicting/resizing).
- **Cluster Autoscaler** — adds nodes when Pods are Pending for resources, removes underused nodes (works with node groups; Cluster API has a provider).
- **Karpenter** — provisions right-sized nodes directly per pending workload.
Don't let HPA and VPA both act on CPU for the same workload.

Q: What is KEDA?
A: Kubernetes Event-Driven Autoscaling: scales Deployments/Jobs from event sources (queue length, Kafka lag, Prometheus queries, cron), including **scale to zero**, by feeding external metrics to an HPA it manages.

## Security

Q: How does RBAC work?
A: - **Role** (namespaced) / **ClusterRole** (cluster-wide or reusable) = list of rules: `apiGroups`, `resources`, `verbs` (get, list, watch, create, update, patch, delete).
- **RoleBinding** / **ClusterRoleBinding** grant a role to subjects: User, Group, ServiceAccount.
Purely additive — there are no deny rules. A RoleBinding can reference a ClusterRole to grant it in one namespace.

Q: How do you check what a user or ServiceAccount can do?
A: ```bash
kubectl auth can-i create deployments -n prod
kubectl auth can-i --list --as=system:serviceaccount:ci:deployer -n prod
kubectl auth whoami
```

Q: What is a ServiceAccount and how do Pods authenticate to the API?
A: An in-cluster identity for workloads. The kubelet mounts a short-lived, audience-bound **projected token** (auto-rotated) at `/var/run/secrets/kubernetes.io/serviceaccount/token`. Grant it permissions with RBAC.
The same tokens can be used for workload identity with external systems (Vault/OpenBao Kubernetes auth, cloud OIDC federation).

Q: How do humans authenticate to Kubernetes?
A: Kubernetes has no user objects. Options: client certificates (CN = user, O = groups), **OIDC** tokens from an IdP (most common in production), webhook token auth, or cloud IAM plugins via kubeconfig `exec` credential plugins.

Q: What are Pod Security Standards and Pod Security Admission?
A: Three profiles: `privileged`, `baseline`, `restricted`. The built-in PSA admission controller enforces them per namespace via labels:
```yaml
pod-security.kubernetes.io/enforce: restricted
```
`restricted` requires non-root, no privilege escalation, dropped capabilities, seccomp RuntimeDefault. Replaced PodSecurityPolicy (removed in 1.25).

Q: What does a securityContext typically set for a hardened container?
A: ```yaml
securityContext:
  runAsNonRoot: true
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities: { drop: ["ALL"] }
  seccompProfile: { type: RuntimeDefault }
```

Q: What are admission webhooks and ValidatingAdmissionPolicy?
A: Webhooks: the apiserver calls your HTTPS service to **mutate** (inject sidecars, defaults) or **validate** (reject bad objects) requests. Powerful but a webhook outage can block the API (`failurePolicy`).
**ValidatingAdmissionPolicy** (GA 1.30) and **MutatingAdmissionPolicy** run **CEL** expressions in-process — no extra service to operate. Policy engines: Kyverno, OPA Gatekeeper.

## Troubleshooting

Q: A Pod is `Pending`. What are the likely causes and how do you debug?
A: The scheduler couldn't place it, or volumes aren't ready. `kubectl describe pod` → **Events**:
- `Insufficient cpu/memory` — requests too big or cluster full (autoscaler?).
- untolerated taint, node affinity/selector mismatch, anti-affinity.
- PVC unbound (no StorageClass, wrong zone), ResourceQuota exceeded (then the Pod isn't even created — check ReplicaSet events).

Q: `CrashLoopBackOff` — what does it mean and how do you debug it?
A: The container keeps exiting and the kubelet backs off between restarts. Not a cause, a symptom.
```bash
kubectl logs pod/x --previous     # logs of the crashed attempt
kubectl describe pod x            # exit code, reason, events
kubectl get pod x -o jsonpath='{.status.containerStatuses[0].lastState}'
```
Causes: app error/missing config, failing liveness probe, wrong command, OOMKilled (exit 137).

Q: `ImagePullBackOff` / `ErrImagePull` — causes?
A: Wrong image name or tag, private registry without `imagePullSecrets`, registry rate limits / unreachable (network policy, proxy, DNS), architecture mismatch (no arm64 manifest).
`kubectl describe pod` shows the exact pull error in Events.

Q: `OOMKilled` — what happened and what do you do?
A: The container exceeded its **memory limit** and the kernel OOM killer killed it (exit code **137** = 128+SIGKILL).
Check `kubectl describe pod` (Last State: OOMKilled) and memory metrics; raise the limit, fix the leak, or tune the runtime (JVM: `-XX:MaxRAMPercentage`; Go: `GOMEMLIMIT`). Node-level OOM / eviction is different: Pod status `Evicted`.

Q: A Service doesn't route traffic to your Pods. How do you debug?
A: 1. `kubectl get endpointslices -l kubernetes.io/service-name=svc` — empty? selector doesn't match Pod labels, or Pods not Ready.
2. Check `targetPort` matches the container's listening port.
3. Test from inside: `kubectl run tmp --rm -it --image=busybox -- wget -qO- svc:80`.
4. DNS: `nslookup svc`. 5. NetworkPolicies blocking.

Q: Pod status `CreateContainerConfigError` / `ContainerCreating` stuck?
A: `CreateContainerConfigError` — referenced ConfigMap/Secret or key missing.
Stuck `ContainerCreating` — volume attach/mount failure (CSI, RWO volume still attached elsewhere), CNI failing to assign an IP, image still pulling. `kubectl describe pod` events tell which.

Q: A Pod or namespace is stuck in `Terminating`. Why?
A: Usually a **finalizer** that its controller isn't removing (controller down or failing), or a node that is unreachable so the kubelet can't confirm the Pod died.
Inspect `metadata.finalizers`; fix the controller rather than force-removing finalizers (that can leak external resources). Namespaces: check `kubectl get ns x -o yaml` status conditions for which resources block it.

Q: What does `kubectl debug` give you?
A: Ephemeral debug containers in a running Pod (useful for distroless images with no shell), copies of Pods with changed images/commands, and node debugging:
```bash
kubectl debug -it pod/api --image=busybox --target=api
kubectl debug node/n1 -it --image=ubuntu   # host fs at /host
```

Q: Node `NotReady` — what do you check?
A: `kubectl describe node` conditions (MemoryPressure, DiskPressure, PIDPressure, NetworkUnavailable), kubelet health/logs (on Talos: `talosctl logs kubelet`), container runtime, CNI Pods on that node, certificate expiry, network to the apiserver. After ~5 min of NotReady, Pods are evicted via `NoExecute` taints.

## Multi-tenancy & Operations

Q: What are namespaces good for — and not good for?
A: Scoping names, RBAC, ResourceQuota, LimitRange, NetworkPolicy, Pod Security labels per team/app.
They are **not** a hard security boundary: tenants share the kernel, nodes, CRDs, cluster-scoped resources and the control plane.

Q: Soft vs hard multi-tenancy — options?
A: - **Namespace per tenant** + RBAC, quotas, NetworkPolicies, PSA restricted — cheap, soft isolation.
- **Virtual clusters** (vCluster) — tenant gets its own API server inside a host namespace.
- **Cluster per tenant** — strongest isolation, more overhead; viable when cluster lifecycle is automated (Cluster API, managed control planes) — the model of managed-Kubernetes platforms running hundreds of clusters.
Add sandboxed runtimes (gVisor, Kata) or dedicated nodes for untrusted code.

Q: How does a Kubernetes cluster upgrade work, and what's the order?
A: Version skew policy drives the order: **control plane first** (etcd → kube-apiserver → controller-manager/scheduler), one minor version at a time, then **nodes** (kubelet may lag the apiserver by up to 3 minors).
Nodes: cordon → drain (respects PDBs) → upgrade/replace → uncordon, one by one or via rolling machine replacement (Cluster API). Check deprecated APIs before (`kubectl convert`, pluto/kubent), and upgrade add-ons/CNI compatibly.

Q: Why must you check API deprecations before upgrading?
A: Kubernetes removes old API versions (e.g. `extensions/v1beta1` Ingress in 1.22, PodSecurityPolicy in 1.25). Manifests, Helm charts and operators still using them break after the upgrade. Scan with tools like pluto/kube-no-trouble and the apiserver's `apiserver_requested_deprecated_apis` metric.

Q: cordon vs drain?
A: `kubectl cordon` marks the node unschedulable (existing Pods stay).
`kubectl drain` cordons then **evicts** Pods (respecting PDBs), skipping DaemonSet Pods with `--ignore-daemonsets`; `--delete-emptydir-data` needed for Pods with emptyDir.

Q: How do you back up and restore etcd?
A: ```bash
etcdctl snapshot save snap.db \
  --endpoints=https://127.0.0.1:2379 --cacert=ca.crt --cert=c.crt --key=c.key
etcdutl snapshot restore snap.db --data-dir=/var/lib/etcd-new
```
Restore creates a **new cluster** from the snapshot (stop apiservers, restore on all members, start). Store snapshots off-cluster, encrypted, and test restores. On Talos: `talosctl etcd snapshot` and `talosctl bootstrap --recover-from`.

Q: etcd backup vs Velero — what's the difference?
A: etcd snapshot = whole-cluster state for **disaster recovery** of the control plane, same cluster version.
**Velero** = backs up API objects (and volume snapshots) per namespace/label to object storage — for migrating apps, restoring individual namespaces, and data. Mature platforms do both.

Q: What are common etcd operational issues?
A: Slow disk fsync → leader elections and apiserver timeouts; database size hitting the quota (default 2 GiB, max recommended 8 GiB) → cluster becomes read-only (`mvcc: database space exceeded`) until **compaction + defrag**; losing quorum; clock skew; too many objects/events from noisy controllers.

Q: What are API Priority and Fairness (APF)?
A: The apiserver classifies requests into **priority levels** and **flow schemas** and queues them fairly, so one misbehaving client (a hot-looping controller) can't starve others like the kubelets or the scheduler. Relevant when you run many controllers against one apiserver.

## Extensibility

Q: How can you extend Kubernetes?
A: - **CRDs** + controllers (operators) — new resource types.
- **Admission** webhooks / policies — mutate/validate.
- **Aggregated API servers** (e.g. metrics-server) — serve whole API groups.
- **Plugins**: CNI (network), CSI (storage), CRI (runtime), device plugins/DRA (GPUs), scheduler plugins, kubectl plugins.

Q: What is Dynamic Resource Allocation (DRA)?
A: A GA (1.34) API for requesting devices like GPUs with structured parameters: `DeviceClass`, `ResourceClaim`/`ResourceClaimTemplate`, `ResourceSlice` published by drivers. More flexible than device plugins' integer counts (`nvidia.com/gpu: 1`) — allows sharing, selecting by attributes, partitioning.

Q: What are labels, selectors and annotations?
A: **Labels**: identifying key/values used by **selectors** (Services → Pods, Deployments → Pods, `kubectl get -l app=api,tier!=db`). Equality and set-based (`env in (prod,staging)`).
**Annotations**: non-identifying metadata for tools (change-cause, checksums, ingress config); not selectable. Recommended labels: `app.kubernetes.io/name`, `/instance`, `/version`, `/managed-by`.

Q: What are owner references and garbage collection?
A: `metadata.ownerReferences` links a dependent to its owner (Pod → ReplicaSet → Deployment). Deleting the owner garbage-collects dependents: **background** (default), **foreground** (owner waits for dependents, `foregroundDeletion` finalizer), or **orphan**.
Owners must be in the same namespace (or cluster-scoped).
