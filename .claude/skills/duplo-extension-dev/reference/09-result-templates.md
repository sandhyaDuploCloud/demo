# Result view-templates — render a result without bespoke HTML

The platform renders a resource's **Result** tab from a declarative JSON template (the same mechanism the
built-in Network / Cluster baselines use). Your extension ships the template; the frontend renders it with
the `<app-resource-template-view>` component. No hand-rolled result markup.

> **Where the renderer comes from (current state):** the published `@duplocloud-internal/ng-common-lib`
> does **not** yet export the renderer (re-checked through **0.1.5**), so the samples **vendor it locally** at
> `frontend/src/app/result-template/` (a self-contained copy of the platform's component, decoupled to need
> only `CommonModule` + ng-bootstrap) and import the local `ResultTemplateModule`. Once the lib exports
> `ResourceTemplateViewModule`, delete that folder and import the module from the lib — the
> `<app-resource-template-view>` usage is identical either way.

## How it wires together
1. **Ship the file** in your bundle at the root, under
   `resources-frontend-templates/<Type>/<subType>.view-template.json` (e.g.
   `resources-frontend-templates/HelloWorld/hello-world.view-template.json`).
2. **Loader registers it.** On load (and on every startup replay) the studio registers your unpacked
   `resources-frontend-templates/` directory with the host's view-template service. Extension roots are
   searched **before** the host root, so you can serve a template for your own type/subType.
3. **Serve it.** Your controller already inherits
   `GET …/environment/<restSegment>/view-template?type=<Type>&subType=<subType>` (from
   `ResourcesController<…>`) — no code needed. It returns the parsed JSON, or 404 if absent.
4. **Render it.** The view component fetches the template and binds it + the result blob:
   ```ts
   // A signal, not a plain field: components default to OnPush, so `this.viewTemplate = t` from a
   // subscribe would repaint nothing. See 02-authoring-guide → Component shape.
   readonly viewTemplate = signal<ResourceViewTemplate | null>(null);
   this.svc.getViewTemplate(ORIGIN_TYPE, SUB_TYPE).subscribe(t => this.viewTemplate.set(t)); // null on 404
   ```
   ```html
   @if (viewTemplate(); as tpl) {
     <app-resource-template-view [template]="tpl" [data]="item()"></app-resource-template-view>
   } @else {
     <!-- lib view-cards fallback -->
   }
   ```

## Template shape
```jsonc
{
  "resourceType": "HelloWorld",
  "subType": "hello-world",
  "label": "Hello World",
  "icon": "user",                 // optional feather icon
  "idField": "id",               // dot-path to the row's stable id
  "groups": [                    // each group is a tab
    {
      "name": "Overview",
      "fields": [ /* typed fields, see below */ ]
    }
  ]
}
```
Field types (each addresses `data` — your resource object — by dot-path):
- **`single`** — one labelled value: `{ "type":"single", "key":"full", "label":"Full Name", "value":"result.fullName" }`
  (`mono`, `suffix`, `fullWidth`, `hideWhenEmpty`, `isTemplate` for `{path}` interpolation, `details` for a modal).
- **`multi`** — a pill list from an array: `{ "type":"multi", "source":"result.tags", "valueField":"name" }`.
- **`table`** — rows from an array: `{ "type":"table", "source":"result.items", "columns":[{"key":"id","label":"ID"}],
  "filter":{"field":"type","value":"Private"}, "rowMenus":[…] }` (`sourceType:"map"` turns an object into rows).
- **`raw`** — collapsible JSON of a sub-object: `{ "type":"raw", "source":"result" }`.
- **`hideWhen`** — on any field/group: `{ "path":"result.x", "equals":null }` (or `notEquals`).

## Worked example — `HelloWorld/hello-world.view-template.json`
```json
{
  "resourceType": "HelloWorld",
  "subType": "hello-world",
  "label": "Hello World",
  "idField": "id",
  "groups": [
    {
      "name": "Result",
      "fields": [
        { "type": "single", "key": "fullName", "label": "Full Name", "value": "result.fullName", "hideWhenEmpty": true },
        { "type": "single", "key": "status", "label": "Status", "value": "status", "mono": false }
      ]
    }
  ]
}
```

## Notes
- The result blob you render is whatever your `*Result` model serializes; keep dot-paths in the template in
  sync with it.
- Keep a fallback (e.g. lib view-cards) for the window before the template is served, or for resources whose
  result isn't populated yet.
- Templates are plain JSON read on demand (no cache); ship as many as you have subTypes.
- **`[innerHTML]` + CSS:** if a custom view component injects rich HTML via `[innerHTML]`, the component's scoped
  styles will NOT apply to it (Angular's default emulated `ViewEncapsulation` only tags markup the template renders).
  Set `encapsulation: ViewEncapsulation.None` on that component (and namespace your selectors to avoid leaking), or
  style the injected markup with the **globally-loaded** theme (Bootstrap 4 + Vuexy utility classes) — the remote
  ships no global CSS of its own. (The bundled `app-resource-template-view` uses interpolation, not `[innerHTML]`, so
  it isn't affected — this only bites hand-rolled rich-text/report renderers.)
