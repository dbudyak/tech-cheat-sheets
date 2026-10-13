# Operators & Cluster API cheat sheet
<!-- controller-runtime / kubebuilder / Cluster API v1beta2 via Context7 -->

## Operator in one paragraph
A **CRD** adds a new API type; users create **custom resources** with a `spec`. A **controller** watches them (via shared informer caches), and for every change runs an idempotent **Reconcile(name)**: read current state, create/update/delete children so reality matches `spec`, write `status` + conditions, use **owner references** for in-cluster children and **finalizers** for external cleanup, return requeue/error for retries. Leader election makes one replica active.

## Kubebuilder workflow

> Scaffold a project and API
```bash
kubebuilder init --domain example.com --repo github.com/acme/db-operator
kubebuilder create api --group db --version v1alpha1 --kind Database
make manifests generate   # controller-gen: CRDs, RBAC, DeepCopy
make install run          # install CRDs into current cluster, run locally
make docker-build docker-push deploy IMG=registry/db-operator:0.1.0
```

> API types (api/v1alpha1/database_types.go)
```go
type DatabaseSpec struct {
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:default=1
    Replicas int32  `json:"replicas,omitempty"`
    Version  string `json:"version"`
}

type DatabaseStatus struct {
    ObservedGeneration int64              `json:"observedGeneration,omitempty"`
    Conditions         []metav1.Condition `json:"conditions,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Ready",type=string,JSONPath=`.status.conditions[?(@.type=="Ready")].status`
type Database struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`
    Spec   DatabaseSpec   `json:"spec,omitempty"`
    Status DatabaseStatus `json:"status,omitempty"`
}
```
Markers drive the generated OpenAPI schema; `omitempty` + default markers define optionality.

## Reconciler skeleton

> Reconcile with child object, owner ref and status
```go
// +kubebuilder:rbac:groups=db.example.com,resources=databases;databases/status,verbs=get;list;watch;update;patch
// +kubebuilder:rbac:groups=apps,resources=statefulsets,verbs=get;list;watch;create;update;patch;delete
func (r *DatabaseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    log := log.FromContext(ctx)

    var db dbv1.Database
    if err := r.Get(ctx, req.NamespacedName, &db); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err) // deleted: nothing to do
    }

    sts := &appsv1.StatefulSet{ObjectMeta: metav1.ObjectMeta{Name: db.Name, Namespace: db.Namespace}}
    op, err := controllerutil.CreateOrUpdate(ctx, r.Client, sts, func() error {
        sts.Spec.Replicas = &db.Spec.Replicas
        // ... fill selector/template deterministically from db.Spec
        return controllerutil.SetControllerReference(&db, sts, r.Scheme)
    })
    if err != nil {
        return ctrl.Result{}, err // requeued with back-off
    }
    log.Info("statefulset reconciled", "op", op)

    ready := sts.Status.ReadyReplicas == db.Spec.Replicas
    meta.SetStatusCondition(&db.Status.Conditions, metav1.Condition{
        Type: "Ready", Status: boolStatus(ready), Reason: "Reconciled",
        ObservedGeneration: db.Generation,
    })
    db.Status.ObservedGeneration = db.Generation
    if err := r.Status().Update(ctx, &db); err != nil {
        return ctrl.Result{}, err
    }
    if !ready {
        return ctrl.Result{RequeueAfter: 10 * time.Second}, nil
    }
    return ctrl.Result{}, nil
}
```
`CreateOrUpdate` reads, mutates via the closure, and only writes if something changed — the idempotent core of most reconcilers.

> Wiring watches
```go
func (r *DatabaseReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&dbv1.Database{}).
        Owns(&appsv1.StatefulSet{}).
        WithOptions(controller.Options{MaxConcurrentReconciles: 4}).
        Complete(r)
}
```

> Manager (cmd/main.go)
```go
mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
    Scheme:                 scheme,
    LeaderElection:         true,
    LeaderElectionID:       "db-operator.example.com",
    HealthProbeBindAddress: ":8081",
})
if err := (&DatabaseReconciler{Client: mgr.GetClient(), Scheme: mgr.GetScheme()}).SetupWithManager(mgr); err != nil { ... }
mgr.Start(ctrl.SetupSignalHandler())
```

### Return values
> ctrl.Result{}, nil
Done until next event.

> ctrl.Result{RequeueAfter: d}, nil
Poll again later (external system, waiting for readiness).

> ctrl.Result{}, err
Logged + exponential back-off requeue. `reconcile.TerminalError(err)` = do not retry.

## client-go basics

> Clientset from kubeconfig or in-cluster
```go
cfg, err := rest.InClusterConfig()                       // inside a Pod
// cfg, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
cs, err := kubernetes.NewForConfig(cfg)
pods, err := cs.CoreV1().Pods("shop").List(ctx, metav1.ListOptions{LabelSelector: "app=api"})
for _, p := range pods.Items {
    fmt.Println(p.Name, p.Status.Phase)
}
```

> Shared informer
```go
factory := informers.NewSharedInformerFactory(cs, 10*time.Minute)
inf := factory.Core().V1().Pods().Informer()
inf.AddEventHandler(cache.ResourceEventHandlerFuncs{
    UpdateFunc: func(old, cur any) { queue.Add(keyOf(cur)) },
})
factory.Start(ctx.Done())
cache.WaitForCacheSync(ctx.Done(), inf.HasSynced)
```
Raw client-go controllers: informer → workqueue → worker goroutines → reconcile. controller-runtime does all this for you.

## Testing with envtest
> envtest
```go
testEnv := &envtest.Environment{CRDDirectoryPaths: []string{"../config/crd/bases"}}
cfg, err := testEnv.Start()          // real kube-apiserver + etcd binaries
defer testEnv.Stop()
// create a Database, then:
Eventually(func(g Gomega) {
    g.Expect(k8sClient.Get(ctx, key, &sts)).To(Succeed())
}).Should(Succeed())
```
No kubelet or built-in controllers: Pods never run, so assert on objects, not on running workloads.

## Cluster API objects

> Cluster with ClusterClass topology (v1beta2)
```yaml
apiVersion: cluster.x-k8s.io/v1beta2
kind: Cluster
metadata: { name: tenant-a, namespace: tenants }
spec:
  clusterNetwork:
    pods: { cidrBlocks: [10.244.0.0/16] }
  topology:
    classRef: { name: openstack-talos-v1 }
    version: v1.37.0
    controlPlane: { replicas: 3 }
    workers:
      machineDeployments:
      - { class: default-worker, name: md-0, replicas: 5 }
    variables:
    - { name: flavor, value: m1.large }
```
One small object per tenant; CAPI expands it into control-plane, MachineDeployments and infra objects and keeps them in sync with the class.

> MachineDeployment (≈ Deployment for nodes)
```yaml
apiVersion: cluster.x-k8s.io/v1beta2
kind: MachineDeployment
metadata: { name: md-0 }
spec:
  clusterName: tenant-a
  replicas: 5
  template:
    spec:
      clusterName: tenant-a
      version: v1.37.0
      bootstrap:
        configRef: { apiGroup: bootstrap.cluster.x-k8s.io, kind: TalosConfigTemplate, name: md-0 }
      infrastructureRef: { apiGroup: infrastructure.cluster.x-k8s.io, kind: OpenStackMachineTemplate, name: md-0 }
```
Templates are immutable: to change flavor/image create a new template and point the MachineDeployment at it → rolling replacement.

> clusterctl
```bash
clusterctl init --infrastructure openstack --bootstrap talos --control-plane talos
clusterctl describe cluster tenant-a -n tenants --show-conditions all
clusterctl get kubeconfig tenant-a -n tenants > tenant-a.kubeconfig
clusterctl move --to-kubeconfig=mgmt.kubeconfig
```
