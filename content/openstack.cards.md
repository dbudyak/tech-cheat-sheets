# OpenStack flashcards

## Services

Q: What is OpenStack?
A: An open-source cloud platform (IaaS) composed of services with REST APIs, used to build private and public clouds — the basis of many sovereign/regional cloud providers. Each service is independent; they cooperate via Keystone auth and a message queue (RabbitMQ) with a database (MariaDB/Galera).

Q: Keystone?
A: **Identity**: users, groups, **projects** (tenants), **domains**, roles, service catalog (endpoints of every service), token issuance. Supports application credentials (scoped, revocable credentials for automation) and federation (OIDC/SAML).

Q: Nova?
A: **Compute**: lifecycle of VMs (servers) — scheduling to hypervisors (KVM/libvirt), flavors (vCPU/RAM/disk), server groups (affinity/anti-affinity), live migration, resize, console. `nova-scheduler` filters/weighs hosts (Placement service tracks inventories).

Q: Neutron?
A: **Networking**: networks, subnets, ports, routers, floating IPs, security groups, provider vs self-service (tenant) networks; drivers like OVN/Open vSwitch. Each VM NIC is a Neutron **port** with IPs and security groups.

Q: Cinder?
A: **Block storage**: volumes attached to VMs (backends like Ceph RBD, LVM, NetApp), snapshots, backups, volume types (QoS/performance tiers), multi-attach. In Kubernetes, the **Cinder CSI** driver turns PVCs into Cinder volumes.

Q: Glance?
A: **Image service**: stores and serves VM images (qcow2/raw) with metadata, often backed by Ceph or Swift. Talos/Ubuntu node images are uploaded to Glance and referenced when creating servers.

Q: Swift?
A: **Object storage**: HTTP API for objects in containers, eventually consistent, replicated across zones (similar to S3; many deployments use Ceph RGW with S3 and Swift APIs instead). Used for backups, etcd snapshots, Terraform state, image storage.

Q: Octavia?
A: **Load balancer as a service**: L4/L7 load balancers (listeners, pools, members, health monitors), usually implemented with **amphora** VMs running HAProxy (or the OVN provider for L4). Kubernetes `type: LoadBalancer` Services on OpenStack create Octavia LBs via the cloud controller manager.

Q: Other OpenStack services worth knowing?
A: **Heat** (orchestration templates), **Barbican** (secrets/keys), **Designate** (DNS), **Ironic** (bare metal provisioning), **Manila** (shared filesystems, RWX), **Placement** (resource inventory), **Horizon** (dashboard), **Magnum** (Kubernetes clusters as a service, older approach).

## Kubernetes on OpenStack

Q: How does Kubernetes integrate with OpenStack?
A: Via `cloud-provider-openstack`:
- **openstack-cloud-controller-manager (OCCM)** — node addresses/zone labels from Nova, removes deleted nodes, `LoadBalancer` Services → Octavia.
- **Cinder CSI** — PVCs → Cinder volumes (attach/detach, snapshots, resize, topology by AZ).
- **Manila CSI** — RWX shares. Also Keystone auth webhook, Barbican KMS for secrets encryption.

Q: How does a `LoadBalancer` Service get an IP on OpenStack?
A: OCCM sees the Service, creates an Octavia load balancer with a listener per port and a pool of node members (NodePorts), optionally attaches a **floating IP** from the external network, and writes the VIP into `status.loadBalancer.ingress`. Annotations tune it (internal LB, flavor, subnet, proxy protocol).

Q: How would you provision a Kubernetes cluster on OpenStack?
A: Network + subnet + router (Neutron) → security groups → an Octavia LB for the API server (6443) → control-plane and worker VMs (Nova) from a Glance image, config via user-data (Talos machine config/cloud-init) → install CNI, OCCM, Cinder CSI. Automated by Terraform, or continuously by **Cluster API Provider OpenStack**.

Q: What does a cloud provider care about operating OpenStack at scale?
A: Multi-tenancy via projects + quotas, capacity planning per AZ/host aggregate, Ceph health, RabbitMQ and DB stability, upgrades of the control plane (Kolla-Ansible, OpenStack-Ansible, or OpenStack on Kubernetes via Helm/operators), API rate limits from many Kubernetes controllers, Octavia amphora capacity.

Q: How do clients authenticate to OpenStack in automation?
A: A `clouds.yaml` entry (auth URL, project, region, credentials) referenced by `OS_CLOUD=prod`; prefer **application credentials** over user passwords. CLI: `openstack server list`, `openstack loadbalancer list`, `openstack volume list`, `openstack token issue`.
