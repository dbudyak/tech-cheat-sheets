# Talos Linux flashcards
<!-- Talos v1.14 docs via Context7 -->

## Concepts

Q: What is Talos Linux?
A: A minimal, **immutable**, API-managed Linux distribution built only to run Kubernetes (by Sidero Labs). No shell, no SSH, no package manager; the root filesystem is read-only (SquashFS) and the whole OS is configured by one declarative **machine config** and operated via a gRPC API.

Q: Why no SSH or shell — and how do you debug then?
A: Removing interactive access removes a huge attack surface and snowflake drift: every node is exactly what its config says.
Debug through the API with `talosctl`: `logs`, `dmesg`, `services`, `containers`, `read`/`ls` files, `get` resources, `pcap`, `dashboard`, `support` bundle; or run privileged debug Pods via Kubernetes.

Q: What is `talosctl` and how does it authenticate?
A: The CLI client for the Talos API (apid on port 50000). It uses a `talosconfig` with **mutual TLS** client certificates (with roles like `os:admin`, `os:reader`) and targets nodes with `--nodes/-n` and API endpoints with `--endpoints/-e` (requests can be proxied through control-plane nodes).

Q: What is the machine config?
A: A YAML document set describing the whole node: machine type (controlplane/worker), install disk/image, network, kubelet settings, certificates and secrets, cluster info (endpoint, CNI, etcd, apiserver flags), system extensions. Generated with `talosctl gen config` and modified with **patches**.

Q: How do you create a Talos cluster from scratch?
A: ```bash
talosctl gen secrets -o secrets.yaml
talosctl gen config tenant-a https://10.0.0.10:6443 --with-secrets secrets.yaml \
  --config-patch @patch.yaml
talosctl apply-config --insecure -n 10.0.0.11 -f controlplane.yaml   # maintenance mode
talosctl bootstrap -n 10.0.0.11 -e 10.0.0.11   # once: initialise etcd
talosctl kubeconfig -n 10.0.0.11
```
On clouds (OpenStack), pass the machine config as **user-data** instead of `apply-config`.

Q: What are the apply modes when changing machine config?
A: `talosctl apply-config` / `patch machineconfig` with `--mode`:
- `auto` (default) — no reboot if possible, otherwise reboot.
- `no-reboot` — fail if a reboot would be needed.
- `reboot` — always reboot.
- `staged` — apply on next reboot.
- `try` — apply temporarily and auto-revert unless confirmed (default 1 min).

Q: How does a Talos OS upgrade work?
A: `talosctl upgrade -n <ip> --image factory.talos.dev/metal-installer/<schematic>:v1.14.1`. Talos writes the new image to the inactive **A/B** boot slot, cordons/drains (unless `--stage`), reboots via `kexec`, and **automatically rolls back** if the new version fails to boot. Since 1.14 installer images come from the **Image Factory** (`ghcr.io/siderolabs/installer` is no longer published).

Q: How do you upgrade Kubernetes on Talos?
A: Separately from the OS: `talosctl upgrade-k8s --to 1.37.0` rolls control-plane components (static pods), kubelets and bootstrap manifests across the cluster, with pre-checks (deprecated APIs) and `--dry-run`. Talos OS version and Kubernetes version are independent within the support matrix.

Q: What is the Image Factory and what are system extensions?
A: Talos images are immutable, so extra drivers/tools (GPU drivers, iSCSI tools, qemu-guest-agent, gVisor) are added as **system extensions** baked in at image build time. The Image Factory (`factory.talos.dev`) builds images from a **schematic** (list of extensions + kernel args), identified by a content-hash schematic ID, for any platform (metal, openstack, aws…).

Q: How do you back up and recover etcd on Talos?
A: ```bash
talosctl -n <cp-ip> etcd snapshot db.snapshot
talosctl -n <cp-ip> bootstrap --recover-from=./db.snapshot
```
Other etcd ops: `talosctl etcd members`, `etcd remove-member`, `etcd defrag`, `etcd status`. Losing quorum requires bootstrap-recover on one node, then the others rejoin.

Q: Why is Talos a good fit for managed Kubernetes at scale?
A: - Every node is identical and reproducible from config → no drift across hundreds of clusters.
- Fully API-driven → automatable by operators/Cluster API, no SSH key management.
- Small attack surface (no shell, read-only rootfs, minimal binaries, mTLS API, KSPP kernel hardening).
- Atomic A/B upgrades with rollback; fast kexec reboots.
- Fewer moving parts to patch: the OS ships only what Kubernetes needs.

Q: What is the Talos architecture internally?
A: `machined` replaces init/systemd and runs a controller-runtime-style set of **controllers** over typed **resources** (like Kubernetes inside the OS: `talosctl get members`, `get addresses`, `get links`). `apid` serves the API, `trustd` handles trust/certs, `containerd` runs system services and Kubernetes; kubelet and etcd run as system services; control-plane components run as static Pods.

Q: What is KubeSpan and node discovery?
A: **Discovery** lets nodes find each other (via the Sidero discovery service or Kubernetes registry). **KubeSpan** builds a WireGuard full-mesh between nodes automatically — encrypted node-to-node traffic and clusters spanning networks/sites without extra VPN config.

Q: How does Talos handle certificates and secrets?
A: `talosctl gen secrets` produces the cluster CAs (Kubernetes, etcd, Talos API), bootstrap tokens and encryption keys; they're embedded in machine configs, so **machine configs are secrets** and must be stored encrypted (SOPS, Vault/OpenBao). Talos rotates kubelet and component certificates automatically.

Q: What is Omni?
A: Sidero Labs' management plane for Talos clusters (SaaS or self-hosted): registers machines, creates clusters from templates, handles upgrades, config patches, and SSO-backed `kubectl`/`talosctl` access across a fleet. An alternative to Cluster API for Talos fleets.

Q: Useful talosctl troubleshooting commands?
A: ```bash
talosctl -n 10.0.0.11 dashboard
talosctl -n 10.0.0.11 services
talosctl -n 10.0.0.11 logs kubelet -f
talosctl -n 10.0.0.11 dmesg
talosctl -n 10.0.0.11 get machinestatus
talosctl -n 10.0.0.11 health
talosctl -n 10.0.0.11 support            # debug bundle
```
