# Terraform flashcards
<!-- Terraform 1.14 language docs via Context7 (import/moved/removed blocks, ephemeral resources, write-only args) -->

## Core concepts

Q: What is Terraform and what model does it use?
A: A declarative Infrastructure-as-Code tool: you describe resources in **HCL**, Terraform builds a dependency graph, compares config ⇄ **state** ⇄ real infrastructure, and computes a **plan** of create/update/replace/delete actions.
Provider plugins translate resources into API calls (OpenStack, AWS, Kubernetes, Helm…). OpenTofu is the open-source (MPL) fork.

Q: What is a provider?
A: A plugin (separate binary from the Registry) that implements resource and data source types for one API. Declared in `required_providers` with a version constraint, configured in a `provider` block; aliases allow multiple configs (regions/clouds):
```hcl
terraform {
  required_providers {
    openstack = { source = "terraform-provider-openstack/openstack", version = "~> 3.0" }
  }
}
provider "openstack" { cloud = "prod" }   # reads clouds.yaml
```

Q: Resource vs data source?
A: `resource` — an object Terraform **manages** (creates, updates, destroys).
`data` — **reads** existing information (an image ID, a network created elsewhere, a remote state output) without managing it.
```hcl
data "openstack_images_image_v2" "talos" { name = "talos-v1.14.1", most_recent = true }
resource "openstack_compute_instance_v2" "cp" {
  image_id = data.openstack_images_image_v2.talos.id
}
```

Q: Variables, locals and outputs?
A: - `variable` — inputs (type, default, `validation`, `sensitive`); set via tfvars, `-var`, `TF_VAR_x`.
- `locals` — named expressions computed inside the module (no external input).
- `output` — values exported to the caller module, CLI, or other configs via remote state.

Q: What is Terraform state and why does it exist?
A: A JSON mapping of resource **addresses → real object IDs** plus last-known attributes. Needed to know which real objects belong to the config, to compute diffs, to track dependencies for deletion, and for performance.
It can contain **secrets in plaintext** → store it encrypted with restricted access.

Q: Why use remote state, and what is state locking?
A: Remote backends (S3-compatible/Swift, GCS, azurerm, HTTP, Consul, Terraform Cloud) let a team share one source of truth and keep it out of laptops/Git.
**Locking** prevents two concurrent applies from corrupting state (S3 native lockfile `use_lockfile = true` since 1.10, DynamoDB previously; Consul/HTTP backends have their own). `terraform force-unlock` only after confirming nobody is running.

Q: Describe the core workflow commands.
A: ```bash
terraform init      # download providers/modules, configure backend
terraform fmt -recursive && terraform validate
terraform plan -out=tfplan
terraform apply tfplan    # applies exactly the reviewed plan
terraform destroy
```
In CI: plan on PR (post the diff), apply the saved plan after approval on merge.

Q: What does `terraform plan` actually do?
A: Refreshes state from real infrastructure (unless `-refresh=false`), evaluates config, and diffs: `+` create, `~` update in place, `-/+` replace (destroy+create because an argument forces new), `-` destroy, `<=` read data. Nothing changes until apply.

Q: What is drift and how do you detect and handle it?
A: Drift = real infrastructure changed outside Terraform (console clicks, other tools).
Detect: `terraform plan -refresh-only` (or scheduled plans in CI that alert on non-empty diffs). Handle: apply to revert, or accept by updating config / `apply -refresh-only` to update state.

Q: How does Terraform determine resource ordering?
A: From **references** between resources (implicit dependencies) forming a DAG; independent resources are created in parallel (`-parallelism=10` default). Use `depends_on` only for hidden dependencies Terraform can't see (e.g. an IAM policy that must exist before a service starts).

## Modules & structure

Q: What is a module?
A: Any directory of `.tf` files. The root module calls child modules with inputs and gets outputs — Terraform's unit of reuse/encapsulation:
```hcl
module "cluster" {
  source       = "git::https://git.example.com/infra/k8s-cluster.git?ref=v2.3.0"
  name         = "tenant-a"
  worker_count = 5
}
output "api_endpoint" { value = module.cluster.api_endpoint }
```
Pin module versions; keep modules small and composable.

Q: How do you structure Terraform for multiple environments?
A: Common options:
- **Directory per environment** (`envs/prod`, `envs/staging`) calling shared modules, separate state per env — explicit, most common.
- Workspaces — same config, multiple states (fine for identical, short-lived copies).
- Wrappers like Terragrunt, or Terraform Stacks/HCP for orchestration.
Split state by blast radius and lifecycle (network vs clusters vs apps).

Q: What are workspaces and when are they a bad idea?
A: CLI workspaces = multiple named state files for one configuration (`terraform workspace new staging`; `terraform.workspace` in expressions).
Bad for strongly different environments or separate credentials/backends — it's easy to apply to the wrong one and the differences end up as conditionals everywhere.

Q: How do you share data between separate Terraform configurations?
A: `terraform_remote_state` data source to read another state's outputs (couples you to their state format and access), or better: publish values to a lookup system (data sources querying the cloud API by name/tag, SSM/Vault/Consul) or pass them through a pipeline.

## Meta-arguments & expressions

Q: count vs for_each?
A: `count = n` — instances addressed by index `res[0]`; removing an element in the middle shifts indexes → **unintended destroy/recreate**.
`for_each = map/set` — instances addressed by key `res["tenant-a"]`; stable when items are added/removed. Prefer `for_each` for anything with identity; `count` for "0 or 1" toggles.
```hcl
resource "openstack_compute_instance_v2" "worker" {
  for_each = toset(var.worker_names)
  name     = each.key
}
```

Q: What lifecycle rules exist?
A: ```hcl
lifecycle {
  create_before_destroy = true   # replacement without downtime
  prevent_destroy       = true   # error on plans that destroy it
  ignore_changes        = [tags, metadata["owner"]]  # tolerate external edits
  replace_triggered_by  = [terraform_data.image_version]
  precondition  { condition = var.size > 0, error_message = "size" }
  postcondition { condition = self.status == "ACTIVE", error_message = "not active" }
}
```

Q: What are dynamic blocks and for expressions?
A: `for` builds collections; `dynamic` generates repeated nested blocks:
```hcl
locals { ports = { http = 80, https = 443 } }
dynamic "rule" {
  for_each = local.ports
  content { port = rule.value, name = rule.key }
}
upper_names = [for n in var.names : upper(n) if n != ""]
by_name     = { for s in var.servers : s.name => s.ip }
```

Q: What is `terraform_data` (and `null_resource`)?
A: A built-in resource that stores values and can trigger replacement/provisioners without a provider — the modern replacement for `null_resource`. Often used with `replace_triggered_by` or to run a `local-exec` when an input changes.

Q: Why should you avoid provisioners?
A: `local-exec`/`remote-exec` run imperative scripts that Terraform can't plan, diff or reliably retry; failures taint resources. Prefer cloud-init/user-data, immutable images (Packer), configuration management (Ansible) or Kubernetes operators for in-machine config.

## State operations & refactoring

Q: How do you import existing infrastructure?
A: Declaratively with an `import` block (1.5+), reviewed in plan; Terraform can even generate config:
```hcl
import {
  to = openstack_networking_network_v2.legacy
  id = "c1a8d6e2-..."
}
```
```bash
terraform plan -generate-config-out=generated.tf
```
The old CLI `terraform import addr id` changes state immediately without a plan.

Q: How do you rename/move a resource without destroying it?
A: A `moved` block — recorded in code, applied by everyone's next plan:
```hcl
moved {
  from = openstack_compute_instance_v2.worker[0]
  to   = openstack_compute_instance_v2.worker["w-0"]
}
```
Works for module refactors too (`module.a.x` → `module.b.x`). CLI alternative: `terraform state mv`.

Q: How do you stop managing a resource without destroying it?
A: A `removed` block (1.7+) with `lifecycle { destroy = false }`, or the CLI `terraform state rm addr`. The object keeps existing; Terraform forgets it.
```hcl
removed {
  from = openstack_blockstorage_volume_v3.old_data
  lifecycle { destroy = false }
}
```

Q: What does `-replace` do (formerly `taint`)?
A: `terraform apply -replace=addr` forces a destroy/create of one object in the plan (e.g. a corrupted VM) — reviewable, unlike the deprecated `terraform taint` which edited state.

Q: How do you keep secrets out of Terraform state?
A: Historically you couldn't — `sensitive = true` only hides values in CLI output. Since 1.10/1.11: **ephemeral resources/variables** (never persisted) and **write-only arguments** (`password_wo`) let you pass secrets (e.g. from Vault/OpenBao) to providers without storing them in state or plan. Still: encrypt and restrict the state backend.

Q: How do you test Terraform code?
A: `terraform validate` + `tflint` + policy checks (OPA/Conftest, Checkov, Sentinel) on plans; `terraform test` (1.6+) with `.tftest.hcl` files running plan/apply assertions, with mocked providers; Terratest (Go) for real end-to-end infrastructure tests.

## Comparisons

Q: Terraform vs Ansible?
A: **Terraform**: declarative provisioning of infrastructure via APIs (VMs, networks, LBs, DNS), with **state** and a plan/diff. Great for creating/destroying cloud resources.
**Ansible**: procedural-ish, mostly stateless configuration management over SSH/APIs — install packages, edit files, orchestrate steps on existing hosts, idempotent per task.
Typical: Terraform creates machines, Ansible configures them. With immutable OSes (Talos), the Ansible part shrinks.

Q: Terraform vs Kubernetes operators / Crossplane / Cluster API for infrastructure?
A: Terraform reconciles **only when you run it** (plan/apply), so drift persists until the next run. Controllers (Crossplane, Cluster API) reconcile **continuously** and expose infra as Kubernetes APIs — self-service and self-healing, but more moving parts. Many platforms use Terraform for the foundation (projects, networks, management cluster) and controllers for per-tenant clusters.

Q: Terraform vs OpenTofu?
A: OpenTofu forked from Terraform 1.5 after HashiCorp's licence change to BSL (2023); it's Linux Foundation, MPL-licensed and largely compatible (same providers/registry protocol). Extra features like built-in **state encryption**. Choice is mostly licensing and governance.

Q: What happens when two people run `terraform apply` at the same time?
A: With a locking backend the second fails to acquire the lock. Without locking, both read the same state and write conflicting results → corrupted/lost state and orphaned resources. That's why remote state + locking + CI-driven applies are standard.

Q: How do you do a safe Terraform change in production?
A: Small PR → `fmt`/`validate`/`tflint` → plan in CI posted to the PR → review especially `-/+` replacements and destroys → apply the **saved plan** from CI (not a laptop) → `prevent_destroy` on critical resources → monitor. Use separate states to limit blast radius.
