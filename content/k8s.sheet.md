# Kubernetes cheat sheet
<!-- kubectl and API fields checked against kubernetes.io (v1.37) via Context7 -->

## Mental model
Desired state lives in the API (etcd). Controllers watch it and reconcile reality towards it. Everything — Pods, Services, your own CRDs — follows the same `spec` (what you want) / `status` (what is) pattern.

> Deployment → ReplicaSet → Pod → container
Deployment owns ReplicaSets (one per template revision); ReplicaSet keeps N Pods; kubelet runs the Pod's containers via the CRI runtime.

> Service → EndpointSlice → Pod IPs
Service selects Pods by labels; only **Ready** Pods appear in EndpointSlices; kube-proxy/eBPF forwards the virtual IP to them.

> PVC → StorageClass → CSI driver → PV
A claim with a class triggers dynamic provisioning; the Pod mounts the claim.

### Which workload controller?
> Deployment
Stateless, interchangeable replicas; rolling updates + rollback. Web/API services, workers.

> StatefulSet
Stable names (`db-0`), stable per-Pod PVCs, ordered rollout, headless Service DNS. Databases, etcd, Kafka, ZooKeeper.

> DaemonSet
One Pod per node (or per matching node). CNI, kube-proxy, log/metrics agents, CSI node plugins.

> Job / CronJob
Run to completion (batch, migrations, backups); CronJob schedules Jobs.

## kubectl — inspect

> kubectl get / describe
```bash
kubectl get pods -A -o wide                 # all namespaces, node + IP
kubectl get deploy,svc,ing -n shop
kubectl get pods -l app=api --show-labels
kubectl get pods --field-selector=status.phase!=Running
kubectl describe pod api-7d9f-x2k           # Events at the bottom!
kubectl get events -n shop --sort-by=.lastTimestamp
```
`describe` aggregates status, conditions and recent Events — the first stop for Pending / CrashLoop / ImagePull issues.

> Output formats
```bash
kubectl get pod api -o yaml
kubectl get pods -o jsonpath='{.items[*].spec.nodeName}'
kubectl get pods -o custom-columns=NAME:.metadata.name,RESTARTS:.status.containerStatuses[0].restartCount
kubectl get deploy api -o json | jq '.status'
```

> Explain the schema
```bash
kubectl explain deployment.spec.strategy.rollingUpdate
kubectl api-resources --namespaced=true
kubectl api-versions
```
Built-in field documentation for any resource, including CRDs with schemas.

> Logs
```bash
kubectl logs api-7d9f-x2k -c app --previous   # crashed container
kubectl logs -f deploy/api --all-containers --since=10m
kubectl logs -l app=api --max-log-requests=10 --prefix
```

> Resource usage (needs metrics-server)
```bash
kubectl top nodes
kubectl top pods -A --sort-by=memory --containers
```

## kubectl — change

> Apply / diff
```bash
kubectl diff -f k8s/                     # preview vs live
kubectl apply -f k8s/ --server-side      # SSA with field ownership
kubectl apply -k overlays/prod           # kustomize
kubectl delete -f k8s/ --wait
```

> Rollouts
```bash
kubectl rollout status deploy/api
kubectl rollout history deploy/api
kubectl rollout undo deploy/api --to-revision=3
kubectl rollout restart deploy/api       # re-create pods (new annotation)
kubectl set image deploy/api app=registry/api:1.4.2
kubectl scale deploy/api --replicas=5
```

> Generate manifests quickly
```bash
kubectl create deploy api --image=nginx --replicas=2 --dry-run=client -o yaml
kubectl create secret generic db --from-literal=password=s3cr3t --dry-run=client -o yaml
kubectl expose deploy api --port=80 --target-port=8080
```

> Labels, annotations, patches
```bash
kubectl label pod api-x env=prod --overwrite
kubectl annotate deploy api kubernetes.io/change-cause="bump to 1.4.2"
kubectl patch deploy api -p '{"spec":{"replicas":3}}'
kubectl patch deploy api --type=json -p '[{"op":"replace","path":"/spec/replicas","value":3}]'
```

## kubectl — debug

> Exec / port-forward / copy
```bash
kubectl exec -it api-x -c app -- sh
kubectl port-forward svc/api 8080:80
kubectl cp api-x:/tmp/heap.hprof ./heap.hprof
```

> Ephemeral debug containers
```bash
kubectl debug -it api-x --image=busybox:1.36 --target=app   # share process ns
kubectl debug api-x -it --copy-to=api-dbg --container=app -- sh
kubectl debug node/worker-1 -it --image=busybox             # node fs at /host
```
Works for distroless images that have no shell.

> Throwaway client Pod for network tests
```bash
kubectl run tmp --rm -it --restart=Never --image=nicolaka/netshoot -- bash
# inside: curl api.shop:80/healthz ; dig api.shop.svc.cluster.local
```

> RBAC checks
```bash
kubectl auth can-i delete pods -n shop
kubectl auth can-i --list --as=system:serviceaccount:shop:api
kubectl auth whoami
```

> Nodes
```bash
kubectl cordon worker-1
kubectl drain worker-1 --ignore-daemonsets --delete-emptydir-data
kubectl uncordon worker-1
kubectl describe node worker-1 | grep -A5 Conditions
kubectl taint nodes worker-1 dedicated=gpu:NoSchedule
```

> Contexts
```bash
kubectl config get-contexts
kubectl config use-context prod
kubectl config set-context --current --namespace=shop
```

### Failure state → first command
> Pending
`kubectl describe pod` → Events: Insufficient cpu/memory, taints, affinity, unbound PVC, quota.

> CrashLoopBackOff
`kubectl logs --previous` + `describe` (exit code; 137 = SIGKILL/OOM, 1 = app error); check probes and config.

> ImagePullBackOff
`describe` → wrong tag, missing `imagePullSecrets`, registry unreachable, wrong arch.

> OOMKilled
Last State: OOMKilled, exit 137 → raise memory limit or fix usage (`GOMEMLIMIT`, JVM `MaxRAMPercentage`).

> Running but no traffic
`kubectl get endpointslices -l kubernetes.io/service-name=api` empty → selector/labels mismatch or readiness failing; check `targetPort`, NetworkPolicy.

> Terminating forever
Look at `metadata.finalizers` and the controller that owns them; unreachable node.

## Manifests

> Deployment with probes, resources, security
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  labels: { app.kubernetes.io/name: api }
spec:
  replicas: 3
  selector:
    matchLabels: { app.kubernetes.io/name: api }
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }
  template:
    metadata:
      labels: { app.kubernetes.io/name: api }
    spec:
      serviceAccountName: api
      terminationGracePeriodSeconds: 30
      containers:
      - name: app
        image: registry.example.com/api:1.4.2
        ports: [{ name: http, containerPort: 8080 }]
        env:
        - name: DB_PASSWORD
          valueFrom: { secretKeyRef: { name: db, key: password } }
        envFrom: [{ configMapRef: { name: api-config } }]
        resources:
          requests: { cpu: 250m, memory: 256Mi }
          limits:   { memory: 256Mi }
        startupProbe:   { httpGet: { path: /healthz, port: http }, failureThreshold: 30, periodSeconds: 2 }
        livenessProbe:  { httpGet: { path: /healthz, port: http }, periodSeconds: 10 }
        readinessProbe: { httpGet: { path: /readyz,  port: http }, periodSeconds: 5 }
        securityContext:
          runAsNonRoot: true
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities: { drop: ["ALL"] }
```
The selector is immutable and must match template labels. Memory limit = request avoids OOM surprises under node pressure.

> Service + Ingress
```yaml
apiVersion: v1
kind: Service
metadata: { name: api }
spec:
  selector: { app.kubernetes.io/name: api }
  ports: [{ name: http, port: 80, targetPort: http }]
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata: { name: api }
spec:
  ingressClassName: nginx
  tls: [{ hosts: [api.example.com], secretName: api-tls }]
  rules:
  - host: api.example.com
    http:
      paths:
      - { path: /, pathType: Prefix, backend: { service: { name: api, port: { name: http } } } }
```

> Gateway API HTTPRoute
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: { name: api }
spec:
  parentRefs: [{ name: public-gw, namespace: infra }]
  hostnames: [api.example.com]
  rules:
  - matches: [{ path: { type: PathPrefix, value: / } }]
    backendRefs:
    - { name: api,        port: 80, weight: 90 }
    - { name: api-canary, port: 80, weight: 10 }
```
Weighted backends give canary releases without controller-specific annotations.

> StatefulSet with per-Pod storage
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata: { name: pg }
spec:
  serviceName: pg            # headless Service: pg-0.pg.ns.svc
  replicas: 3
  selector: { matchLabels: { app: pg } }
  template:
    metadata: { labels: { app: pg } }
    spec:
      containers:
      - name: pg
        image: postgres:17
        volumeMounts: [{ name: data, mountPath: /var/lib/postgresql/data }]
  volumeClaimTemplates:
  - metadata: { name: data }
    spec:
      accessModes: [ReadWriteOnce]
      storageClassName: fast
      resources: { requests: { storage: 20Gi } }
```

> HPA (autoscaling/v2)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: api }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: api }
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
  behavior:
    scaleDown: { stabilizationWindowSeconds: 300 }
```

> PodDisruptionBudget
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: api }
spec:
  minAvailable: 2
  selector: { matchLabels: { app.kubernetes.io/name: api } }
```

> NetworkPolicy: default deny + allow from ingress controller
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny }
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: api-from-ingress }
spec:
  podSelector: { matchLabels: { app.kubernetes.io/name: api } }
  ingress:
  - from:
    - namespaceSelector: { matchLabels: { kubernetes.io/metadata.name: ingress-nginx } }
    ports: [{ port: 8080 }]
```
Remember to allow DNS egress (UDP/TCP 53 to kube-system) after a default-deny egress.

> RBAC: read-only role for a ServiceAccount
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { name: pod-reader, namespace: shop }
rules:
- apiGroups: [""]
  resources: [pods, pods/log]
  verbs: [get, list, watch]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: { name: ci-reads-pods, namespace: shop }
subjects: [{ kind: ServiceAccount, name: ci, namespace: shop }]
roleRef: { apiGroup: rbac.authorization.k8s.io, kind: Role, name: pod-reader }
```

> Scheduling: tolerations, affinity, spread
```yaml
spec:
  tolerations:
  - { key: dedicated, operator: Equal, value: gpu, effect: NoSchedule }
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions: [{ key: node.kubernetes.io/instance-type, operator: In, values: [gpu.large] }]
  topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: ScheduleAnyway
    labelSelector: { matchLabels: { app: trainer } }
```

> CronJob
```yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: backup }
spec:
  schedule: "0 2 * * *"
  timeZone: Europe/Berlin
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 2
      ttlSecondsAfterFinished: 86400
      template:
        spec:
          restartPolicy: OnFailure
          containers: [{ name: backup, image: backup:1.0, args: ["--target=s3"] }]
```

## Numbers worth remembering
> Defaults
`terminationGracePeriodSeconds` 30s · rolling update `maxSurge`/`maxUnavailable` 25% · `revisionHistoryLimit` 10 · CrashLoop back-off capped at 5 min · NodePort range 30000–32767 · etcd quota 2 GiB default · kubelet may lag apiserver by 3 minor versions · Pods evicted ~5 min after node NotReady.

> Exit codes
`0` ok · `1` app error · `126/127` command not executable / not found · `137` SIGKILL (OOM or grace period exceeded) · `143` SIGTERM handled by exiting.
