# OpenBao / secrets management flashcards
<!-- OpenBao docs via Context7 -->

## OpenBao

Q: What is OpenBao?
A: An open-source (MPL-2.0, Linux Foundation / OpenSSF) **fork of HashiCorp Vault**, created after Vault moved to the BSL licence. API- and CLI-compatible (`bao` CLI, `/v1/...` API, `X-Vault-Token` header), for storing secrets, issuing dynamic credentials, PKI and encryption-as-a-service. Namespaces (multi-tenancy) are available in open source.

Q: Core concepts: seal/unseal, storage, auth methods, policies, tokens?
A: - Data is encrypted with a key protected by the **seal**; on start the server is sealed and must be **unsealed** (Shamir key shares or auto-unseal via KMS/HSM/transit).
- Storage: integrated **Raft** (HA, built-in replication).
- **Auth methods** verify identity (Kubernetes, OIDC, AppRole, certs) → issue a **token** with **policies** (HCL path-based ACLs) and a TTL.

Q: What are secrets engines? Name important ones.
A: Pluggable backends mounted at paths:
- **KV v2** — versioned static secrets (`bao kv put secret/app db_pass=...`).
- **Database** — dynamic DB credentials.
- **PKI** — issues X.509 certificates (internal CA, short-lived certs).
- **Transit** — encryption/signing as a service; keys never leave the server.
- **SSH**, **TOTP**, cloud credentials (where supported), Kubernetes service account tokens.

Q: What are dynamic secrets and why are they better than static ones?
A: Credentials generated **on demand** per client with a **lease/TTL** (e.g. a unique Postgres user valid for 1h) and revoked automatically on expiry or via lease revocation. Benefits: no long-lived shared passwords, per-workload audit trail, instant revocation after a leak, automatic rotation.

Q: How does Kubernetes auth work in OpenBao/Vault?
A: The Pod presents its **ServiceAccount JWT** to `auth/kubernetes/login` with a role name; OpenBao validates it with the Kubernetes **TokenReview** API (or the JWT issuer's keys), checks `bound_service_account_names/namespaces` on the role, and returns a token with that role's policies.
```bash
bao auth enable kubernetes
bao write auth/kubernetes/config kubernetes_host=https://10.0.0.10:6443
bao write auth/kubernetes/role/api \
  bound_service_account_names=api bound_service_account_namespaces=shop \
  policies=api-read ttl=1h
```

Q: How do workloads in Kubernetes consume secrets from OpenBao?
A: - **External Secrets Operator** — syncs into Kubernetes Secrets (GitOps-friendly; Secret ends up in etcd).
- **Agent injector / sidecar** — renders secrets to a shared volume and renews leases.
- **Secrets Store CSI driver** — mounts secrets as files.
- **Direct API** from the app using its ServiceAccount token (no Kubernetes Secret at all).

Q: What does a policy look like?
A: ```hcl
path "secret/data/shop/api/*" {
  capabilities = ["read"]
}
path "database/creds/shop-ro" {
  capabilities = ["read"]
}
```
Deny by default; least privilege per role. KV v2 paths include `data/` (and `metadata/` for listing/versions).

Q: Why might a platform use OpenBao for many Kubernetes clusters?
A: Central store for cluster secrets (Talos machine configs, kubeconfigs, cloud credentials), a **PKI** for per-cluster CAs and short-lived certs, Kubernetes auth so each cluster's workloads get scoped access, transit for envelope encryption (e.g. as a KMS for etcd encryption at rest), and an open-source licence suitable for sovereign deployments.
