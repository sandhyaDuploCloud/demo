# form-complex — AppServices-style complex form

Demonstrates a **dense, conditional form** modeled on the portal's heavyweight AppService form, split into a
**Basic / Advanced** 2-step wizard (the same `<duplo-wizard-stepper>` as `form-wizard`). The resource
(`AppServiceLite`) is **No-provision** — the focus is the form.

## What it shows (all from library primitives)

- **ng-select** dropdowns — Platform, Replication Strategy, LB Type.
- **Conditional sections** (`*ngIf`) — HPA min/max/target fields appear only for the `hpa` strategy; the LB block
  (type / listener port / health-check path) appears only when the "Expose via Load Balancer" toggle is on.
  Conditional `[required]` keeps per-step validity honest (e.g. Min/Max replicas are required only under HPA).
- **Repeatable rows** — an add/remove Environment Variables list (name/value pairs) bound with indexed `name`s.
  (The library's `key-val-field` from `SharedFormsModule` is a drop-in alternative for this.)
- **Collapsible group** — a "Container config" section (Command + Volume Mounts) toggled open/closed.
- **Bootstrap `custom-switch`** toggle, number inputs with min/max, pattern-validated name.

Per-step validation is the same pattern as `form-wizard`: one `<form>` + per-step `ngModelGroup` + `[hidden]`, with
`nextDisabled` bound to the current group's `.invalid`.

## Components reused (`@duplocloud-internal/ng-common-lib`)

`SharedFormsModule` (`form-field`, validation directives, `ng-select`), `SearchableDatatableModule` (list),
`CommonLibComponentsModule` (`view-with-sidecards`, `view-header-card`, `sidecard`, `flat-status-filter`). The only
bespoke UI is the copied `wizard/wizard-stepper.component.ts` (no stepper exists in the library).

## Deprovision

No-provision resource — nothing external is created; `DELETE` removes the row directly.

## Build

```bash
DUPLO_BASE=http://localhost:60021 ./scripts/build-extension.sh  samples/form-complex
DUPLO_BASE=http://localhost:60021 ./scripts/deploy-extension.sh samples/form-complex/dist/extension.zip
```
