# enrichment-pods — AGENT provisioning + C# enrichment (the MinIO use case)

Demonstrates the **two patterns combined** on one resource:
- **Agent-based provisioning** — a mapped skill (`provision-minio`) deploys a MinIO **Deployment + ClusterIP
  Service (no ingress)** into the selected kubernetes scope's namespace and writes the provisioning outputs.
- **C# enrichment** — on every GET, `EnrichResultAsync` injects the **live pods** via the SDK's
  `IScopeClientFactory`. This is the part the original MinIO extension couldn't write before the cloud-access SDK.

Enrichment runs on the read path **independent of provisioning mode**, so it layers live state on top of whatever
the skill persisted (see `reference/12-enrichment-and-live-state.md`).

## How it provisions (agent)
A skill is mapped to `MinIO/minio` (manifest `skillMappings`), so the service runs in `HelpdeskAgent` mode — no
service override needed. The platform writes the spec to `shared/minio.json` and the k8s scope's kubeconfig to
`./.kube/config`; `skills/provision-minio/provision.sh` reads them, creates the namespace if missing,
`kubectl apply`s the Deployment + Service, then POSTs `results` (deployment/service names + in-cluster endpoints)
and `status Complete`. See `reference/07-scope-credentials.md`.

## Hooks used (and why)
| Hook | Why |
|---|---|
| *(skill mapping)* | `MinIO/minio → provision-minio` → agent-based provisioning (`HelpdeskAgent` mode). |
| `EnrichResultAsync` | Runs on GET; injects live pods into `Result.Pods` via `IScopeClientFactory.GetKubernetesClientAsync`. Failures are caught so a GET never 500s. |

The service injects `IScopeClientFactory` (registered by the host SDK) and calls
`client.CoreV1.ListNamespacedPodAsync(ns, labelSelector: "app=minio")` (`using k8s;`). `Result.Pods` is a typed
`List<PodInfo>` — stored as a BSON **array**; the frontend reads it as an array (never `JSON.parse`). Both
`Spec`/`Result` carry `[BsonIgnoreExtraElements]`. See `reference/10-sdk-api.md` + `reference/12-enrichment-and-live-state.md`.

## Try it
1. Attach a **kubernetes** scope to your workspace.
2. Create a MinIO resource with `namespace` + that scope's id in `scopeIds` (image/rootUser/rootPassword/replicas
   have sensible defaults).
3. Provisioning deploys MinIO; GET it → `result` shows the deployment/service + endpoints, and `result.pods` shows
   live pods (name/phase/ready/images), refreshed each read.

## Deprovision
Agent-based, and it is **the same skill's job**. On delete the platform reuses this resource's ticket and
force-sends *"Deprovision this resource. Tear down all infrastructure managed by this resource."* — there is
no separate deprovision skill, so `provision-minio` also ships `deprovision.sh`, which
`kubectl delete`s the MinIO Service + Deployment (`--ignore-not-found`, so it's idempotent) and posts
`DeProvisioning` → `DeProvisioned`. **Once `DeProvisioned` is posted the platform auto-hard-deletes the resource
row** — agent mode defaults `AutoDeleteOnDeProvision => true`, and `MinioService` doesn't override it, so no extra
call is needed. (Override `AutoDeleteOnDeProvision => false` if you'd rather retain the row for audit.) Without the
teardown script the Deployment + Service would orphan when the row is auto-deleted. The namespace is left in place
(it may be shared). See `reference/11-deprovisioning.md`.

## Build
```bash
DUPLO_BASE=http://localhost:60021 ./scripts/build-extension.sh  samples/enrichment-pods
DUPLO_BASE=http://localhost:60021 ./scripts/deploy-extension.sh samples/enrichment-pods/dist/extension.zip
```
