# Argo CD & GitOps flashcards

## GitOps

Q: What is GitOps?
A: Operating systems where the **desired state is declared in Git**, and an in-cluster agent continuously **pulls** and reconciles it (OpenGitOps principles: declarative, versioned & immutable, pulled automatically, continuously reconciled).
Every change is a reviewed commit; rollback = git revert; the cluster self-heals drift.

Q: Push-based CI/CD vs pull-based GitOps?
A: Push: the CI pipeline runs `kubectl/helm` against clusters → CI needs cluster credentials, no drift correction.
Pull: an agent in (or near) the cluster pulls from Git → no external write credentials, continuous drift detection, and the Git history is the audit log. CI still builds/tests images and updates the version in Git.

## Argo CD

Q: What is Argo CD and its main components?
A: A GitOps continuous delivery controller for Kubernetes:
- **API server** — UI, CLI, RBAC/SSO.
- **repo-server** — clones Git/Helm/OCI repos and renders manifests (Helm, Kustomize, plain YAML, plugins).
- **application-controller** — compares rendered desired state with the live cluster and syncs.
- **ApplicationSet controller**, notifications controller, Redis cache, Dex for SSO.

Q: What is an Argo CD Application?
A: A CRD linking a **source** (repo, revision, path, Helm values/Kustomize) to a **destination** (cluster + namespace) with a sync policy:
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata: { name: api, namespace: argocd }
spec:
  project: shop
  source:
    repoURL: https://git.example.com/shop/deploy.git
    targetRevision: main
    path: apps/api/overlays/prod
  destination: { server: https://kubernetes.default.svc, namespace: shop }
  syncPolicy:
    automated: { prune: true, selfHeal: true }
    syncOptions: [CreateNamespace=true, ServerSideApply=true]
```

Q: Sync status vs health status?
A: **Sync**: `Synced` / `OutOfSync` — does live state match Git?
**Health**: `Healthy`, `Progressing`, `Degraded`, `Suspended`, `Missing` — is the app actually working? Built-in checks per kind (Deployment rollout complete, PVC bound…), custom Lua health checks for CRDs.

Q: What do `prune` and `selfHeal` do?
A: `prune: true` deletes live resources that were removed from Git (off by default for safety).
`selfHeal: true` reverts manual changes in the cluster back to Git state (drift correction). Without it, Argo only shows OutOfSync.

Q: What are sync waves and hooks?
A: `argocd.argoproj.io/sync-wave: "-1"` orders resources: lower waves applied and healthy first (CRDs/namespaces → operators → apps).
Hooks (`PreSync`, `Sync`, `PostSync`, `SyncFail`) run Jobs at phases — e.g. DB migrations in PreSync.

Q: What is an ApplicationSet?
A: A template that generates many Applications from **generators**: list, cluster (every registered cluster matching labels), Git directories/files, matrix/merge, pull-request. The fleet-management tool: "install the monitoring stack on every cluster labelled `env=prod`".
```yaml
goTemplate: true
generators:
- clusters: { selector: { matchLabels: { tier: tenant } } }
template:
  metadata: { name: '{{.name}}-monitoring' }
  spec:
    destination: { server: '{{.server}}', namespace: monitoring }
```

Q: What is the app-of-apps pattern?
A: A root Application that points to a directory of Application manifests, bootstrapping an entire cluster's set of apps from one entry point. ApplicationSets are often a more scalable replacement.

Q: How do you handle secrets with GitOps?
A: Never commit plaintext. Options: **External Secrets Operator** (Git contains an ExternalSecret reference; values come from Vault/OpenBao), **Sealed Secrets** (encrypted with a cluster key), **SOPS** (encrypted files decrypted at render via plugin/KSOPS), Vault/OpenBao agent or CSI driver.

Q: How does Argo CD manage multiple clusters and multi-tenancy?
A: Remote clusters are registered as Secrets (API URL + credentials); one Argo CD (hub) can manage many clusters, or run one per cluster for isolation/scale. **AppProjects** restrict which repos, destination clusters/namespaces and resource kinds a team can deploy, plus project roles for RBAC.

Q: Argo CD vs Flux?
A: Both are CNCF-graduated GitOps tools. **Argo CD**: rich UI, Application CRD, ApplicationSets, strong multi-cluster hub model. **Flux**: toolkit of controllers (source, kustomize, helm, notification, image automation), CLI-first, per-cluster pull model, native Helm releases (`HelmRelease`).

Q: How does a typical release flow look with Argo CD?
A: Dev merges → CI builds and pushes image `api:1.4.2` → CI (or Argo CD Image Updater/Renovate) opens a PR bumping the tag in the deploy repo → review/merge → Argo CD detects the commit, syncs (waves/hooks), reports health → progressive delivery with **Argo Rollouts** (canary/blue-green with metric analysis) if needed.

## CI/CD

Q: What belongs in CI vs CD for Kubernetes services?
A: **CI**: lint, unit tests, build, security scans (SAST, `govulncheck`, image scanning with Trivy/Grype), SBOM, sign images (cosign), push to registry, render/validate manifests (`helm template | kubeconform`).
**CD**: promote a version through environments — preferably by committing to the GitOps repo, then Argo CD/Flux applies it with health checks and progressive delivery.

Q: How do you promote a release across environments with GitOps?
A: One directory/overlay or values file per environment; promotion = a PR that bumps the image tag/chart version from staging to prod (automated by Renovate, Kargo or Image Updater), gated by tests and SLO checks. Never rebuild the image per environment — promote the same immutable digest.

Q: What is progressive delivery?
A: Gradually shifting traffic to a new version with automated analysis: **canary** (1% → 10% → 50% → 100%, metric checks at each step) or **blue/green** (switch all traffic after verification). Tools: Argo Rollouts, Flagger. For platform rollouts (cluster upgrades), the same idea applies as waves of clusters.

Q: How do you secure the software supply chain?
A: Pin dependencies and base images by digest, minimal/distroless images, SBOM generation, vulnerability scanning, image signing (Sigstore/cosign) and **admission policies** that only allow signed images from trusted registries (Kyverno/Gatekeeper), SLSA provenance from CI, least-privilege CI credentials (OIDC instead of static keys).
