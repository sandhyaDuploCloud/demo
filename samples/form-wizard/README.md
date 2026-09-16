# form-wizard — multi-step form with a Next/Previous wizard

Demonstrates a **multi-step create wizard** (numbered step header + progress line + Back / Cancel / Next → footer),
matching a typical 4-step deploy flow: **Products → Deployment → Chart Registry → Services & Values**. The resource
(`HelmDeployment`) is **No-provision** — the point is the FRONTEND form, so create just persists the collected spec.

## What to copy

- **`frontend/src/app/wizard/wizard-stepper.component.ts`** — a self-contained `<duplo-wizard-stepper>` (numbered
  header, progress line, Back/Cancel/Next-or-Finish footer). **The shared UI library ships no stepper/wizard
  component**, so a wizard extension copies this. Only this chrome is bespoke; everything else is library components.
- **`frontend/src/app/add/add-helm.component.ts`** — the wizard host. The pattern that makes per-step validation work
  with template-driven forms:
  - ONE `<form #f="ngForm">` wraps `<duplo-wizard-stepper>`.
  - Each step's fields live in an **`ngModelGroup`** (`step0…step3`) and are toggled with **`[hidden]`** (NOT `*ngIf`)
    so their controls stay registered while the step is hidden.
  - `nextDisabled` = the CURRENT group's `.invalid` (`f.form.get('step'+i).invalid`), so **Next/Finish is gated per
    step**. `(next)`/`(back)` advance/rewind `activeIndex`; `(finish)` POSTs on the last step.

## Components reused from the library (`@duplocloud-internal/ng-common-lib`)

- `SharedFormsModule` → `form-field`, text inputs, `validation-state`/`validation-errors`/`form-group-errors`, and
  **`ng-select`** (re-exported) for the *Products* multiselect, *Timeout*, and *Service Type* dropdowns.
- The *Auto-rollback* toggle is a Bootstrap 4 `custom-control custom-switch` (the host ships the Vuexy theme CSS).
- `SearchableDatatableModule` (list) + `CommonLibComponentsModule` (`view-with-sidecards`, `view-header-card`,
  `sidecard`, `flat-status-filter`) for list/detail.

See `../../.claude/skills/duplo-extension-dev/reference/14-forms-and-wizards.md` for the full write-up.

## Deprovision

No-provision resource — nothing external is created, so there is no teardown. `DELETE` removes the row directly.

## Build

```bash
DUPLO_BASE=http://localhost:60021 ./scripts/build-extension.sh  samples/form-wizard
DUPLO_BASE=http://localhost:60021 ./scripts/deploy-extension.sh samples/form-wizard/dist/extension.zip
```
