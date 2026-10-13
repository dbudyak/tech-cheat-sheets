# Ansible flashcards

## Ansible

Q: What is Ansible?
A: An agentless automation/configuration-management tool: a control node connects to managed hosts (SSH, WinRM, or APIs) and runs **modules** described in YAML **playbooks**. Python-based, push model, no daemon on targets.

Q: Inventory, playbook, play, task, module, role?
A: - **Inventory** — hosts and groups (static INI/YAML or dynamic plugins, e.g. OpenStack).
- **Playbook** — YAML file of **plays**; a play maps hosts to tasks.
- **Task** — one module call (`ansible.builtin.package`, `template`, `service`, `k8s`).
- **Role** — reusable structure (`tasks/`, `handlers/`, `templates/`, `defaults/`, `vars/`).
- **Collection** — distributable bundle of roles/modules (`kubernetes.core`, `openstack.cloud`).

Q: What does idempotency mean in Ansible?
A: Running a playbook repeatedly yields the same end state; tasks report `changed` only if they actually changed something. Modules are declarative (`state: present`). `command`/`shell` are not idempotent unless you add `creates:`/`changed_when:`.

Q: What are handlers?
A: Tasks triggered via `notify` that run **once at the end of the play** and only if a notifying task changed something — e.g. restart nginx after its config template changed.
```yaml
- name: Configure nginx
  ansible.builtin.template: { src: nginx.conf.j2, dest: /etc/nginx/nginx.conf }
  notify: restart nginx
handlers:
- name: restart nginx
  ansible.builtin.service: { name: nginx, state: restarted }
```

Q: Variables and precedence — what to remember?
A: Many levels (22): role defaults are lowest, then inventory group_vars/host_vars, play vars, role vars, task vars, `set_fact`, and **extra vars `-e` always win**. Keep tunables in role `defaults/` and environment specifics in `group_vars/`. Templates use Jinja2.

Q: How do you keep secrets in Ansible?
A: **Ansible Vault** encrypts files/variables (`ansible-vault encrypt group_vars/prod/secrets.yml`, run with `--ask-vault-pass` or a vault password file), or look up from external stores at runtime (`community.hashi_vault` lookups work with OpenBao's Vault-compatible API).

Q: Useful run options for safe changes?
A: ```bash
ansible-playbook site.yml -i inventory/prod --check --diff   # dry run with diffs
ansible-playbook site.yml --limit web01 --tags nginx
ansible-playbook site.yml -e serial=1                          # with `serial:` in play
ansible all -m ansible.builtin.ping
```
`serial` does rolling changes across hosts; `max_fail_percentage` stops a bad rollout.

Q: Where does Ansible fit in a Kubernetes/Talos platform?
A: Bootstrap and day-2 tasks outside Kubernetes: preparing OpenStack/bare-metal hosts, network gear, deploying OpenStack itself (Kolla-Ansible), orchestrating ordered procedures across systems, and calling APIs (`kubernetes.core.k8s`, `openstack.cloud`). On Talos nodes there's no SSH/Python, so node config is done through machine config instead.
