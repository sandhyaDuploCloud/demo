# on-demand-plan — no auto-provision, on-demand ticket

Demonstrates the **no-provision** mode: the resource persists but does **not** auto-provision on create (no ticket
fires). A provisioning run is triggered later, **on demand**, via `POST .../{id}/ticket` (exposed by the base
controller). This is how Plan/Environment-style resources behave.

## Hooks used (and why)
| Hook | Why |
|---|---|
| `IsProvisioningNeeded => false` | Create completes immediately with `Status = Complete`; no auto-ticket, no scope validation. |
| `OnBeforeDeleteAsync` (base/CRUD) | Place cascade guards here if the resource owns children (none in this demo). |

Create a PlanDemo with a `description` → it's `Complete` at once. Fire an on-demand run later with
`POST .../environment/extensions/plandemos/{id}/ticket` (runs the mapped skill, if any).

## Deprovision
No deprovision ticket — deletion runs the CRUD delete guard then removes the row directly. See
`reference/11-deprovisioning.md`.

## Build
```bash
DUPLO_BASE=http://localhost:60021 ./scripts/build-extension.sh  samples/on-demand-plan
DUPLO_BASE=http://localhost:60021 ./scripts/deploy-extension.sh samples/on-demand-plan/dist/extension.zip
```
