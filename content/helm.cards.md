# Helm flashcards

## Helm

Q: What is Helm and what problems does it solve?
A: The package manager for Kubernetes: a **chart** is a versioned bundle of templated manifests + default `values.yaml`. Helm renders templates with your values, installs them as a **release**, and tracks revisions for upgrade/rollback. Solves parameterisation, packaging, distribution and versioning of apps.

Q: Chart structure?
A: ```
mychart/
  Chart.yaml          # name, version (chart), appVersion, dependencies
  values.yaml         # defaults
  values.schema.json  # optional JSON-schema validation of values
  templates/          # Go templates → manifests
    _helpers.tpl      # named templates (define/include)
    NOTES.txt
  charts/             # vendored dependencies (subcharts)
  crds/               # CRDs installed before templates (never upgraded!)
```

Q: Release, revision and where Helm stores state?
A: A **release** = an installed instance of a chart with a name in a namespace. Each install/upgrade/rollback creates a **revision**, stored as a Secret (`sh.helm.release.v1.<name>.v<N>`) in the release namespace. Helm 3 has no server component (Tiller removed).

Q: Core Helm commands?
A: ```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm upgrade --install api ./chart -n shop --create-namespace \
  -f values-prod.yaml --set image.tag=1.4.2 --atomic --wait
helm list -n shop ; helm history api -n shop
helm rollback api 3 -n shop
helm template api ./chart -f values-prod.yaml   # render locally
helm diff upgrade api ./chart -f values.yaml     # plugin
helm uninstall api -n shop
```

Q: How are values merged, and what's the precedence?
A: Chart `values.yaml` < parent chart values for subcharts < `-f` files (in order, later wins) < `--set`/`--set-string`/`--set-file` (later wins). Maps are deep-merged; **lists are replaced**, not merged.

Q: Templating essentials?
A: Go `text/template` + Sprig functions:
```yaml
metadata:
  name: {{ include "app.fullname" . }}
  labels: {{- include "app.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicas | default 2 }}
  {{- if .Values.resources }}
  resources: {{- toYaml .Values.resources | nindent 4 }}
  {{- end }}
  {{- range .Values.env }}
  - name: {{ .name }}
    value: {{ .value | quote }}
  {{- end }}
```
`{{-` trims whitespace; `.Release`, `.Chart`, `.Capabilities` are built-ins; `required "msg" .Values.x` fails on missing values.

Q: What are Helm hooks?
A: Annotated resources run at lifecycle points: `pre-install`, `post-install`, `pre-upgrade`, `post-upgrade`, `pre-delete`, `pre-rollback`, `test`. Typical: a DB-migration Job as `pre-upgrade`. Control with `helm.sh/hook-weight` and `helm.sh/hook-delete-policy`. Argo CD maps them to its own sync hooks.

Q: Why are CRDs in Helm tricky?
A: Files in `crds/` are installed only on first install and **never upgraded or deleted** by Helm (to avoid data loss). Teams either ship CRDs as normal templates (with care), in a separate chart, or let the operator/GitOps tool manage them.

Q: What does `--atomic` / `--wait` do and why use them in CI?
A: `--wait` waits until resources are ready (Deployments available, Jobs complete) up to `--timeout`. `--atomic` additionally **rolls back automatically** on failure, so CI never leaves a half-upgraded release (Helm 4 renames it to `--rollback-on-failure`).

Q: Helm vs Kustomize?
A: **Helm** — templating + packaging + release management; good for distributing configurable apps to others.
**Kustomize** — template-free overlays/patches on plain YAML (`kubectl apply -k`); good for your own manifests per environment. Common combo: Helm chart rendered and then patched with Kustomize, or both driven by Argo CD.

Q: What are OCI-based charts and library charts?
A: Charts can be pushed to OCI registries like container images: `helm push chart-1.0.0.tgz oci://registry/charts`, `helm install x oci://registry/charts/app --version 1.0.0`.
**Library charts** (`type: library`) contain only named templates for reuse across charts; they render no resources themselves.

Q: What is new in Helm 4?
A: Released Nov 2025 (Helm 3 is now end-of-life):
- **Server-side apply** by default for new releases (existing releases keep their previous apply method unless `--server-side`).
- WebAssembly-based plugin system; post-renderers are now plugins.
- Flag renames: `--atomic` → `--rollback-on-failure`, `--force` → `--force-replace` (old ones deprecated).
Charts with `apiVersion: v2` keep working.
