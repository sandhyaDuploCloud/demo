# 14 — Forms & multi-step wizards

Extension forms are **template-driven** (`ngForm` + `ngModel` — no Reactive Forms) and built from the platform UI
library `@duplocloud-internal/ng-common-lib`. This doc covers the field components you get for free, and the
**multi-step wizard** pattern (which the library does *not* ship a component for).

## Field components you can reuse (`SharedFormsModule`)

Import `SharedFormsModule` and use:
- `<form-field>` wrapping a `<input class="form-control" …>` / `<textarea>` — the standard labelled field.
- Validation directives: `validation-state`, `validation-errors` on the control; `form-group-errors` +
  `#fge showDetailsWhen="submitted"` on the container.
- **`<ng-select>`** — re-exported by `SharedFormsModule` (single, `[multiple]`, `[items]`). No separate import.
- `<password-field>`, `<key-val-field>` (name/value pairs), and `FormElementsCollapsableGroupComponent` (collapsible
  section) for richer inputs.
- Toggle/switch: there is no dedicated lib toggle — use a Bootstrap 4 `custom-control custom-switch` + `ngModel`
  (the host ships the Vuexy theme CSS).

The single-page create form is the `panel-form-accordion` 3-column layout — see
[02-authoring-guide](02-authoring-guide.md) and `samples/helloworld`.

## Multi-step wizards — there is NO library stepper

The library ships **no stepper/wizard component**, and the host's own multi-step forms (AppService, etc.) hand-roll
one in portal-internal code you can't import. So a wizard extension **copies a small local component**:
`samples/form-wizard/frontend/src/app/wizard/wizard-stepper.component.ts` — `<duplo-wizard-stepper>` renders the
numbered step header (done ✓ / active / todo + progress line) and the **Back / "Step N of M" / Cancel / Next→**
footer. Only this chrome is bespoke; the step **bodies** use the field components above.

### The per-step validation pattern (template-driven)

Wrap everything in **one** `<form>`; put each step's fields in an **`ngModelGroup`**; toggle steps with **`[hidden]`
(NOT `*ngIf`)** so hidden controls stay registered; gate Next/Finish on the **current group's** validity:

```html
<form #f="ngForm" (ngSubmit)="f.valid && finish()">
  <duplo-wizard-stepper [steps]="steps" [activeIndex]="activeIndex"
                        [nextDisabled]="isStepInvalid(f)" [saving]="saving"
                        (back)="back()" (next)="next(f)" (cancel)="cancel()" (finish)="finish()">
    <div [hidden]="activeIndex !== 0" ngModelGroup="step0"> …form-field inputs… </div>
    <div [hidden]="activeIndex !== 1" ngModelGroup="step1"> …ng-select, custom-switch, etc.… </div>
  </duplo-wizard-stepper>
</form>
```
```ts
isStepInvalid(f: NgForm) { const g = f.form.get(this.steps[this.activeIndex].key); return !!g && g.invalid; }
next(f: NgForm) { if (!this.isStepInvalid(f) && this.activeIndex < this.steps.length - 1) this.activeIndex++; }
back()          { if (this.activeIndex > 0) this.activeIndex--; }
finish()        { this.svc.create(name, this.model).subscribe(…); }   // assemble spec on the last step
```

Why `[hidden]` and not `*ngIf`: `*ngIf` destroys a hidden step's controls, so they drop out of the form and can't be
validated as a group; `[hidden]` keeps them registered while off-screen.

Conditional required fields (e.g. HPA/LB blocks) use `[required]="condition"` so a hidden block doesn't block Next.

**On create failure**, surface the REAL server error — see [15-error-handling](15-error-handling.md). Standard forms
call `formGroupErrors.reportError(err)`; the wizard samples feed `extractErrorMessage(err)` into
`<duplo-wizard-stepper [error]>`. Never read `err.error.message` (that's the generic "Invalid request" title).

## Samples

- **`samples/form-wizard`** — a 4-step linear wizard (Products → Deployment → Chart Registry → Services & Values)
  with text inputs, an `ng-select` (Timeout), a multiselect (Products), and a `custom-switch` (auto-rollback).
- **`samples/form-complex`** — an AppServices-style Basic/Advanced 2-step form: `ng-select` dropdowns, conditional
  HPA + load-balancer sections (`*ngIf` + conditional `[required]`), a repeatable env-var list, and a collapsible
  container-config group.

Both resources are **No-provision** (`IsProvisioningNeeded => false`) — the focus is the form; create just persists
the spec.

## Challenges / constraints (know before you build)

- **No reusable stepper** anywhere (library or host) → copy the sample's `wizard-stepper.component.ts`.
- **`panel-form-accordion` is markup, not a component**, and the lib ships **compiled CSS only** → any layout/stepper
  chrome CSS lives in the component's `styles` (see the samples).
- **Template-driven only** — Reactive Forms are forbidden by house style.
- **No composite widgets** beyond `key-val-field` (no repeatable-rows/tabs-per-item component) → assemble rich
  sections from primitives + `*ngFor`/`*ngIf` (see `form-complex`'s env-var rows).
