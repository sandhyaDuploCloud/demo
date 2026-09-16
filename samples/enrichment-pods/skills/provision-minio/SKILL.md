---
name: provision-minio
description: Provisions a MinIO resource — agent-based provisioning of a Kubernetes workload. Reads the spec the platform wrote to the ticket, applies a MinIO Deployment + ClusterIP Service (no ingress) into the selected kubernetes scope's namespace, and writes the result (deployment/service names + in-cluster endpoints) back via the resource's own status/results APIs.
---

# provision-minio — agent-based Kubernetes provisioning

You are the **provisioning agent** for a **MinIO** resource (origin `MinIO`, subType `minio`). When a user
creates one, the platform opens a ticket and runs this skill. This is **agent-based provisioning**
(`ProvisioningMode.HelpdeskAgent`): you realize the spec against the cluster and report back. The resource
also has a **C# enrichment** seam that lists live pods on every GET — that is the backend's job, not yours;
you only deploy + record the provisioning outputs.

## Inputs the platform gives you

- `$DUPLO_BASE` (fall back to `$DUPLO_HOST`) + `$DUPLO_TOKEN` — base URL + a **resource-scoped** token valid
  only for THIS resource's `…/{id}/status` and `…/{id}/results`.
- `shared/minio.json` — the expanded spec: `spec.namespace`, `spec.image`, `spec.rootUser`,
  `spec.rootPassword`, `spec.replicas`, plus `id` + `ownerWorkspaceId` for the write-back URL and
  `scopeIds` (the kubernetes scope).
- The kubernetes scope's credentials, materialized to **`./.kube/config`** with `KUBECONFIG` exported
  (see [reference/07-scope-credentials.md](../../../../reference/07-scope-credentials.md)). The single
  attached cluster is the current-context — `kubectl config current-context` returns it. Always pass
  `--context <name> -n <namespace>` on every `kubectl` call.

## What to deploy (no ingress)

A `Deployment` (label `app=minio`) running `server /data --console-address :9001` with `MINIO_ROOT_USER`
/ `MINIO_ROOT_PASSWORD` from the spec, container ports 9000 (S3 API) + 9001 (console), an `emptyDir` at
`/data`, and health probes; plus a `ClusterIP` `Service` exposing 9000 + 9001. **No Ingress** — in-cluster
access only. The `app=minio` label is required: the backend's enrichment lists pods by it.

## Steps

```
read spec  ->  POST status Processing  ->  kubectl apply Deployment + Service
           ->  POST results {deploymentName, serviceName, apiEndpoint, consoleEndpoint}
           ->  POST status Complete      (on any failure: POST status Failed + faults, then stop)
```

### Deterministic helper
`provision.sh` (next to this SKILL.md) runs the whole flow verbatim (parses the spec with `jq`, applies the
manifest with `kubectl`, writes status/results). It is mounted under `.claude/skills/`, so invoke it by full
path from the ticket workdir:
```bash
bash .claude/skills/provision-minio/provision.sh
```
Or follow the steps yourself if you need to branch on the spec.

## Deprovision (tear down what you provisioned)

When the resource is deleted the platform **reuses this same ticket** and force-sends the message
*"Deprovision this resource. Tear down all infrastructure managed by this resource."* There is **no
separate deprovision skill** — you (this skill) own the teardown, so anything `provision.sh` created
here must be deletable here. When you receive that message, delete the MinIO Deployment + Service and
report terminal status; do **not** re-provision.

`deprovision.sh` (next to this SKILL.md) runs the teardown verbatim (reads the spec for the namespace,
`kubectl delete service/deployment minio --ignore-not-found` in reverse order, posts
`DeProvisioning` → `DeProvisioned`). Posting `DeProvisioned` is all you do — the platform then **auto-deletes the
resource row** (agent default). It is idempotent, so retries are safe:
```bash
bash .claude/skills/provision-minio/deprovision.sh
```
It does **not** delete the namespace (it may pre-exist or be shared). If the delete fails, POST status
`Failed` with the error rather than reporting success — otherwise the k8s objects orphan while the row
disappears.

## Notes
- **Status and results are two separate APIs** — never fold the result into a status payload.
- The result body IS the typed `MinioResult` (`{deploymentName, serviceName, apiEndpoint, consoleEndpoint}`);
  the live `pods` array is filled by the backend's C# enrichment on GET, not by this skill.
- On `kubectl` auth errors the kubernetes scope's token may have expired — report `Failed` with the error;
  the platform refreshes credentials on the next run.
