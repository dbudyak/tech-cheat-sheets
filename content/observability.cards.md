# Observability & reliability flashcards

## Fundamentals

Q: What are the three (four) pillars of observability?
A: **Metrics** (cheap aggregated numbers over time — alerting, dashboards), **logs** (discrete events with detail), **traces** (a request's path across services with timing), and increasingly **profiles** (continuous CPU/memory profiling). Correlate them via shared labels and trace IDs.

Q: Monitoring vs observability?
A: Monitoring answers known questions ("is CPU > 90%?") with predefined checks. Observability is the ability to ask **new** questions about system behaviour from its telemetry without shipping new code — high-cardinality, correlated metrics/logs/traces.

Q: RED vs USE methods?
A: **RED** (for services): **R**ate, **E**rrors, **D**uration of requests.
**USE** (for resources): **U**tilisation, **S**aturation, **E**rrors — CPU, memory, disk, network, etcd.
Google's **four golden signals**: latency, traffic, errors, saturation.

## Prometheus

Q: How does Prometheus collect metrics? Why pull?
A: It **scrapes** HTTP `/metrics` endpoints on an interval (service discovery finds targets, e.g. Kubernetes Pods/Endpoints). Pull makes target health visible (`up` metric), keeps clients simple, and avoids overload by pushers. Short-lived jobs use the Pushgateway; remote-write ships data to long-term storage.

Q: What are the Prometheus metric types?
A: - **Counter** — monotonically increasing (requests_total); use `rate()`.
- **Gauge** — goes up and down (memory, queue depth).
- **Histogram** — observations in configurable buckets (`_bucket`, `_sum`, `_count`); aggregatable across instances → percentiles with `histogram_quantile`. Native histograms are the newer, efficient form.
- **Summary** — client-side quantiles; cheap but **not aggregatable**.

Q: What is the Prometheus data model and why does cardinality matter?
A: A time series = metric name + set of **labels**, e.g. `http_requests_total{job="api",code="500",path="/users"}`. Every unique label combination is a separate series in memory. Labels like user ID, request ID or raw URL paths cause **cardinality explosions** (OOM, slow queries). Keep labels bounded.

Q: Basic PromQL: request rate, error ratio, p99 latency?
A: ```promql
sum by (service) (rate(http_requests_total[5m]))

sum(rate(http_requests_total{code=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))

histogram_quantile(0.99,
  sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
```
`rate` = per-second average over the window for counters (handles resets); `irate` uses the last two samples.

Q: Useful Kubernetes PromQL queries?
A: ```promql
sum by (namespace, pod) (rate(container_cpu_usage_seconds_total{container!=""}[5m]))
container_memory_working_set_bytes{container!=""}
increase(kube_pod_container_status_restarts_total[1h]) > 3
kube_deployment_status_replicas_available < kube_deployment_spec_replicas
rate(container_cpu_cfs_throttled_periods_total[5m]) / rate(container_cpu_cfs_periods_total[5m])
```
Sources: cAdvisor (kubelet), kube-state-metrics (object state), node-exporter (hosts).

Q: How is Prometheus deployed on Kubernetes typically?
A: **kube-prometheus-stack** / Prometheus Operator: CRDs `Prometheus`, `ServiceMonitor`/`PodMonitor` (what to scrape, by label), `PrometheusRule` (recording + alerting rules), `Alertmanager`. Plus kube-state-metrics, node-exporter, Grafana.

Q: How do you scale Prometheus for hundreds of clusters?
A: Prometheus is single-node with local TSDB. For fleets: per-cluster Prometheus/agent mode → **remote-write** to a central long-term store (Thanos, Cortex/Mimir, VictoriaMetrics) for global queries, deduplication of HA pairs, and retention in object storage. Add an external `cluster` label per source.

Q: What are recording rules and why use them?
A: Precomputed PromQL expressions saved as new series (e.g. `job:http_requests:rate5m`) — make dashboards and SLO/alert queries cheap and consistent, especially across many series.

## Alerting & SLOs

Q: How does Alertmanager work?
A: Prometheus evaluates alerting rules and sends firing alerts to Alertmanager, which **groups**, **deduplicates**, **inhibits** (suppress child alerts when a parent fires) and **silences** them, then routes by labels to receivers (PagerDuty, Slack, email, webhooks).

Q: What makes a good alert?
A: Alert on **symptoms** that hurt users (SLO burn, error rate, latency), not every cause (CPU 80%). Every page must be actionable, urgent and have a runbook link; non-urgent issues become tickets. Use `for:` durations to avoid flapping.

Q: SLI vs SLO vs SLA?
A: - **SLI** — a measured indicator: ratio of good events, e.g. "requests served < 300 ms with non-5xx / all requests".
- **SLO** — internal target for an SLI over a window: "99.9% over 30 days".
- **SLA** — contractual promise to customers with consequences (credits); looser than the SLO.

Q: What is an error budget and how is it used?
A: `1 − SLO`: with 99.9% over 30 days you may "spend" ~43 min of unavailability (0.1% of requests). If the budget is healthy, ship faster; if it's exhausted, freeze risky changes and invest in reliability. It turns reliability vs velocity into a data-driven agreement.

Q: What is burn-rate alerting?
A: Alert on how fast the error budget is being consumed relative to the SLO: burn rate 1 = exactly on budget. Multi-window, multi-burn-rate alerts (e.g. 14.4× over 1h **and** 5m → page; 6× over 6h → page; 1× over 3d → ticket) catch fast outages quickly and slow leaks without noisy paging.

Q: Example SLOs for a managed Kubernetes platform?
A: - Kubernetes API availability: 99.95% of apiserver requests succeed (non-5xx), measured at the LB.
- API latency: 99% of mutating requests < 1 s.
- Cluster provisioning: 95% of new clusters Ready within 15 min.
- Upgrade success rate, node readiness ratio, etcd fsync p99 < 10 ms (as an internal indicator).

## Logs & traces

Q: How is logging usually done in Kubernetes?
A: Apps log structured JSON to **stdout/stderr**; the runtime writes files on the node; a DaemonSet agent (Fluent Bit, Vector, Grafana Alloy, OTel Collector) tails them, enriches with Pod metadata, and ships to a backend (Loki, Elasticsearch/OpenSearch). Don't write log files inside containers.

Q: What is Loki and how does it differ from Elasticsearch?
A: Loki indexes only **labels** (like Prometheus) and stores compressed log chunks in object storage; queries with LogQL filter by labels then grep content. Much cheaper to run than full-text indexing (Elasticsearch), but slower for arbitrary full-text search.

Q: What is distributed tracing?
A: Each request gets a **trace ID**; each operation is a **span** (name, start, duration, attributes, parent span). Context is propagated across services via headers (W3C `traceparent`). Backends (Jaeger, Tempo) show the call tree to find where latency/errors originate. Sampling (head or tail) controls cost.

Q: What is OpenTelemetry?
A: The CNCF standard for telemetry: vendor-neutral **APIs/SDKs** for traces, metrics and logs in many languages (Go: `go.opentelemetry.io/otel`), the **OTLP** protocol, auto-instrumentation, and the **Collector** (receivers → processors → exporters) to route data to any backend. Avoids vendor lock-in.

Q: How do you correlate logs, metrics and traces?
A: Shared resource attributes/labels (`service.name`, `k8s.namespace`, `cluster`), trace IDs injected into log lines, **exemplars** linking metric samples to traces, and Grafana data links between Prometheus, Loki and Tempo.

Q: What is Grafana's role?
A: Visualisation and exploration over many data sources (Prometheus, Loki, Tempo, Elasticsearch, SQL): dashboards, ad-hoc Explore, alerting, SLO plugins. Dashboards should be provisioned as code (JSON in Git, Grafana operator/Terraform) for consistency across environments.

Q: How do you expose metrics from a Go service?
A: ```go
var reqs = promauto.NewCounterVec(prometheus.CounterOpts{
    Name: "http_requests_total", Help: "HTTP requests",
}, []string{"code", "method"})

reqs.WithLabelValues("200", "GET").Inc()
http.Handle("/metrics", promhttp.Handler())
```
controller-runtime already exposes workqueue depth, reconcile duration/errors and client metrics on its metrics endpoint.

## Incident response

Q: What does a good incident process look like?
A: Detect (alerts on SLOs) → declare and assign an **incident commander** → mitigate first (rollback, failover, scale), communicate status regularly → resolve → **blameless postmortem** with timeline, contributing factors and tracked action items. Practise with game days/chaos testing.

Q: What is toil and why reduce it?
A: Manual, repetitive, automatable operational work that scales linearly with the fleet (hand-upgrading clusters, rotating certs by hand). SRE practice caps toil (~50%) and automates it — essential when managing hundreds of clusters with a small team.
