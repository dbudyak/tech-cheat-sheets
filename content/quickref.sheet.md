# Quick reference — Kubernetes platform engineering
<!-- Two phone screens: the essentials to re-read right before a conversation. -->

## Kubernetes mental model
Desired state (`spec`) is stored in etcd via the API server; **controllers** watch it and loop: observe → diff → act → update `status`. Level-triggered + idempotent = self-healing. Scheduler only picks a node; kubelet makes the containers run.

> Deployment vs StatefulSet vs DaemonSet
**Deployment**: interchangeable replicas, rolling update/rollback (stateless APIs). **StatefulSet**: stable names `db-0`, per-Pod PVCs, ordered rollout (databases, etcd). **DaemonSet**: one Pod per node (CNI, log/metric agents, CSI).

> Probes · resources · QoS
liveness → restart; readiness → remove from Service; startup → protect slow boot. Requests = scheduling; limits = cgroup cap (CPU throttled, memory OOMKilled). Guaranteed (req=lim) › Burstable › BestEffort under eviction.

## Operator pattern
A **CRD** defines a new API; a controller (Go, controller-runtime) **reconciles** each custom resource: read it from the informer cache, create/update children idempotently (`CreateOrUpdate`, owner refs), clean external resources via **finalizers**, report `status.conditions` + `observedGeneration`, and requeue on errors. Leader election keeps one active replica. **Cluster API** applies this to whole clusters: management cluster reconciles `Cluster`/`MachineDeployment` objects into VMs on OpenStack (CAPO) bootstrapped with Talos.

## The stack in one line each
> Go
Static binaries, goroutines/channels, the language of Kubernetes and its controllers.

> Talos Linux
Immutable, API-only (no SSH) Kubernetes OS; machine config YAML; `talosctl`; A/B upgrades with rollback.

> OpenStack
IaaS: Nova (VMs), Neutron (networks), Cinder (volumes→CSI), Glance (images), Keystone (auth), Octavia (LBs→`LoadBalancer` Services), Swift (objects).

> Helm
Templated, versioned charts → releases with upgrade/rollback.

> Argo CD / GitOps
Git is the source of truth; in-cluster controller pulls, syncs, self-heals; ApplicationSets for fleets.

> Terraform
Declarative IaC with state + plan/apply; provisions infra once per run (vs controllers reconciling continuously).

> Ansible
Agentless, idempotent configuration/orchestration over SSH/APIs (hosts, OpenStack deployments).

> OpenBao
Open-source Vault fork: KV, dynamic secrets, PKI, transit; Kubernetes auth via ServiceAccount tokens.

> Observability
Prometheus (pull, counters/gauges/histograms, PromQL) + Grafana, Loki logs, OpenTelemetry traces; SLOs with error-budget burn-rate alerts.

> Ray
Distributed Python compute framework for AI/ML; on Kubernetes via the KubeRay operator (`RayCluster`, `RayJob`, `RayService`).

## kubectl debugging
```bash
kubectl get pods -A -o wide | grep -v Running
kubectl describe pod POD -n NS          # Events: why Pending / pull / probe
kubectl logs POD -c C --previous        # why it crashed
kubectl get events -n NS --sort-by=.lastTimestamp
kubectl get endpointslices -l kubernetes.io/service-name=SVC
kubectl debug -it POD --image=busybox --target=C
kubectl top pods -n NS --containers
kubectl rollout status|history|undo deploy/X
kubectl auth can-i --list --as=system:serviceaccount:NS:SA
kubectl drain NODE --ignore-daemonsets --delete-emptydir-data
```
Pending = scheduling/PVC/quota · CrashLoopBackOff = app exits (logs --previous) · ImagePullBackOff = tag/secret/registry · OOMKilled = exit 137, raise limit · Terminating forever = finalizer.

## Go essentials
```go
type Store interface{ Get(ctx context.Context, id string) (*Item, error) } // implicit impl

func (s *svc) Handle(ctx context.Context, id string) error {
    ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()
    it, err := s.store.Get(ctx, id)
    if errors.Is(err, ErrNotFound) { return nil }
    if err != nil { return fmt.Errorf("get %s: %w", id, err) }
    return s.process(it)
}

g, ctx := errgroup.WithContext(ctx)       // bounded fan-out, first error cancels
g.SetLimit(8)
for _, c := range clusters { g.Go(func() error { return upgrade(ctx, c) }) }
err := g.Wait()
```
Pointer receivers mutate (and only `*T` then satisfies the interface) · errors are values, wrap with `%w`, check with `errors.Is/As` · only the sender closes a channel · `select` on `ctx.Done()` everywhere · maps aren't thread-safe → `sync.Mutex` · `go test -race` · table-driven tests · `defer` runs LIFO at return.
