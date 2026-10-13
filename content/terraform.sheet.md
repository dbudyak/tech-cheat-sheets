# Terraform cheat sheet
<!-- Terraform 1.14 docs via Context7 -->

## CLI
> Workflow
```bash
terraform init -upgrade               # providers, modules, backend
terraform fmt -recursive
terraform validate
terraform plan -out=tfplan -var-file=prod.tfvars
terraform show tfplan                 # human readable; -json for tooling
terraform apply tfplan
terraform destroy -target=module.sandbox   # -target only for emergencies
```

> State
```bash
terraform state list
terraform state show 'openstack_compute_instance_v2.worker["w-0"]'
terraform state mv  OLD NEW          # prefer moved {} blocks
terraform state rm  ADDR             # prefer removed {} blocks
terraform state pull > backup.tfstate
terraform force-unlock LOCK_ID
```

> Drift, replace, import
```bash
terraform plan -refresh-only          # what changed outside Terraform?
terraform apply -refresh-only         # accept drift into state
terraform apply -replace='openstack_compute_instance_v2.cp[1]'
terraform plan -generate-config-out=generated.tf   # with import {} blocks
```

> Misc
```bash
terraform output -json
terraform console                     # evaluate expressions
terraform graph | dot -Tsvg > g.svg
terraform providers lock -platform=linux_amd64 -platform=darwin_arm64
terraform workspace list|new|select
terraform test
```

## Blocks
> terraform + backend + providers
```hcl
terraform {
  required_version = ">= 1.10"
  required_providers {
    openstack = { source = "terraform-provider-openstack/openstack", version = "~> 3.0" }
    helm      = { source = "hashicorp/helm", version = "~> 3.0" }
  }
  backend "s3" {
    bucket       = "tf-state"
    key          = "platform/prod/terraform.tfstate"
    region       = "eu-north-1"
    use_lockfile = true      # S3-native locking (1.10+)
    encrypt      = true
  }
}

provider "openstack" {
  cloud = "prod"             # entry in clouds.yaml
}
provider "openstack" {
  alias = "dr"
  cloud = "dr-site"
}
```
Use `provider = openstack.dr` in a resource to select the alias. `~> 3.0` = ≥3.0, <4.0.

> variable / locals / output
```hcl
variable "workers" {
  type = map(object({ flavor = string, count = number }))
  default = { general = { flavor = "m1.large", count = 3 } }
  validation {
    condition     = alltrue([for w in values(var.workers) : w.count >= 1])
    error_message = "Each pool needs at least one worker."
  }
}

variable "db_password" {
  type      = string
  sensitive = true
  ephemeral = true           # 1.10+: never written to state/plan
}

locals {
  name_prefix = "${var.env}-k8s"
  common_tags = { env = var.env, managed_by = "terraform" }
}

output "lb_ip" {
  value = openstack_lb_loadbalancer_v2.api.vip_address
}
```

> resource + data
```hcl
data "openstack_networking_network_v2" "ext" {
  name = "public"
}

resource "openstack_networking_network_v2" "cluster" {
  name           = "${local.name_prefix}-net"
  admin_state_up = true
}

resource "openstack_networking_subnet_v2" "nodes" {
  network_id = openstack_networking_network_v2.cluster.id
  cidr       = "10.0.0.0/24"
}

resource "openstack_compute_instance_v2" "cp" {
  count       = 3
  name        = "${local.name_prefix}-cp-${count.index}"
  image_name  = "talos-v1.14.1"
  flavor_name = "m1.large"
  user_data   = file("controlplane.yaml")     # Talos machine config
  network { uuid = openstack_networking_network_v2.cluster.id }
}
```

> for_each over a map
```hcl
resource "openstack_blockstorage_volume_v3" "data" {
  for_each = { for k, v in var.workers : k => v if v.count > 0 }
  name     = "data-${each.key}"
  size     = 100
}
# address: openstack_blockstorage_volume_v3.data["general"]
```

> module call
```hcl
module "tenant_cluster" {
  source  = "./modules/cluster"            # or registry / git?ref=tag
  for_each = var.tenants
  name     = each.key
  k8s_version = each.value.version
}
```

> lifecycle
```hcl
lifecycle {
  create_before_destroy = true
  prevent_destroy       = true
  ignore_changes        = [metadata]
  replace_triggered_by  = [terraform_data.image.output]
}
```

> moved / import / removed
```hcl
moved {
  from = module.k8s
  to   = module.tenant_cluster["default"]
}

import {
  to = openstack_networking_router_v2.main
  id = "6f1c..."
}

removed {
  from = openstack_compute_instance_v2.legacy
  lifecycle { destroy = false }
}
```

> check block (continuous assertions)
```hcl
check "api_health" {
  data "http" "api" { url = "https://${openstack_lb_loadbalancer_v2.api.vip_address}:6443/readyz" }
  assert {
    condition     = data.http.api.status_code == 200
    error_message = "API server not ready"
  }
}
```
Failing checks are warnings, not errors — good for post-apply validation.

## Expressions & functions
> Common functions
```hcl
lookup(var.sizes, var.env, "small")
merge(local.common_tags, { role = "worker" })
coalesce(var.override, "default")
try(var.cfg.optional.value, null)
cidrsubnet("10.0.0.0/16", 8, 2)      # 10.0.2.0/24
templatefile("${path.module}/cloud-init.tftpl", { hostname = each.key })
jsonencode({ a = 1 }) ; yamldecode(file("values.yaml"))
toset(["a", "b"]) ; flatten([[1], [2, 3]]) ; length(var.list)
```

> Conditionals and splats
```hcl
count = var.enable_bastion ? 1 : 0
ips   = openstack_compute_instance_v2.cp[*].access_ip_v4
names = [for k, v in openstack_compute_instance_v2.worker : v.name]
```

## Testing
> terraform test (.tftest.hcl)
```hcl
run "network_cidr" {
  command = plan
  variables { env = "test" }
  assert {
    condition     = openstack_networking_subnet_v2.nodes.cidr == "10.0.0.0/24"
    error_message = "unexpected CIDR"
  }
}
```
