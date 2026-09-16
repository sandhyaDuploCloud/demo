import { Component, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { NgbAccordionDirective, NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { extractErrorMessage, SharedFormsModule } from '@duplocloud-internal/ng-common-lib';
import { AppSvcService, AppSvcSpec } from '../appsvc.service';

/** Accordion item ids — also the side-nav keys. */
const STEPS = { BASIC: 'basic', ADVANCED: 'advanced' } as const;

// COMPLEX (AppServices-style) create form in the platform's multi-step V2 shape, mirroring
// ai-studio/src/app/admin/workspaces/add-workspace.
//
// Layout: a `card panel-form-accordion` wrapper with a title row, then one `panel-form-panel` accordion
// item per step. Each panel body is `panel-content-title` + `panel-content-form`, and its third column
// renders ONE shared side-nav template via ngTemplateOutlet — so every step shows the FULL list of steps
// with the current one highlighted, and any step title is clickable to jump there. The accordion's own
// header chrome is hidden in SCSS; navigation is the side nav plus the Next button.
//
// Ng-Bootstrap 21 uses the DIRECTIVE accordion API ([ngbAccordion] / [ngbAccordionItem] /
// ngbAccordionCollapse / ngbAccordionBody with an inner <ng-template>). The pre-15 <ngb-accordion> +
// <ngb-panel> component API no longer exists.
//
// Two V2 pieces an extension remote cannot use, so they are deliberately absent:
//   - *blockUI / @BlockUI — ng-block-ui is not an extension dependency nor a shared singleton; the
//     submit button's disabled state comes from a local `saving` signal instead.
//   - SUCCESS_REPORTER / ERROR_REPORTER — host-provided InjectionTokens; a remote bundles its own copy
//     of the lib, so identities differ and injection throws NG0201. Form-level errors render inline;
//     per-field detail still comes from the form-group-errors directive.
//
// `model` stays a plain mutable object bound with [(ngModel)]: two-way binding to an object PROPERTY is
// fine — the trap is only [(ngModel)] onto a signal. Signals hold state written outside a template event
// (saving/error come back from a subscribe), which is what the default OnPush strategy needs to repaint.
@Component({
  selector: 'as-add',
  imports: [SharedFormsModule, NgSelectModule, NgbAccordionModule, NgTemplateOutlet],
  styleUrls: ['./add-appsvc.component.scss'],
  template: `
    <div class="card panel-form-accordion add-appsvc-accordion">

      <div class="d-flex justify-content-between align-items-start">
        <h3 class="m-0">Add App Service</h3>
        <div class="header-cancel-btn">
          <button type="button" class="btn btn-outline-secondary" (click)="cancel()">Cancel</button>
        </div>
      </div>

      @if (error()) {
        <div class="alert alert-danger mt-1 mb-0">{{ error() }}</div>
      }

      <div ngbAccordion #acc="ngbAccordion" [closeOthers]="true" [animation]="true" [destroyOnHide]="false">

        <!-- ── Basic ─────────────────────────────────────────────────────────── -->
        <div [ngbAccordionItem]="steps.BASIC" class="panel-form-panel" [collapsed]="false">
          <div ngbAccordionCollapse>
            <div ngbAccordionBody>
              <ng-template>
                <div class="d-flex justify-content-between">

                  <div class="panel-content-title">
                    <h4 class="font-weight-bolder">Basic</h4>
                    <p class="panel-content-title-sub-text">
                      Identity, image and how many copies to run.
                    </p>
                  </div>

                  <div class="panel-content-form">
                    <form name="basicForm" #basicForm="ngForm" class="form form-vertical"
                          (ngSubmit)="submitBasic()" novalidate>
                      <div class="form-container" form-group-errors showDetailsWhen="submitted">
                        <form-field>
                          <label class="element-label">Service Name *</label>
                          <!-- Keep the hyphen escaped: browsers compile pattern with the RegExp v flag,
                               under which a bare hyphen in a class throws and the validator fails open. -->
                          <input type="text" class="form-control" name="resourceName" [(ngModel)]="resourceName"
                                 placeholder="e.g. web-api" required validation-state validation-errors
                                 minlength="2" maxlength="60" pattern="^[a-z0-9]([a-z0-9\\-]*[a-z0-9])?$" />
                        </form-field>
                        <form-field>
                          <label class="element-label">Container Image *</label>
                          <input type="text" class="form-control" name="image" [(ngModel)]="model.image"
                                 placeholder="nginx:1.25" required validation-state validation-errors />
                        </form-field>
                        <form-field>
                          <label class="element-label">Platform *</label>
                          <ng-select placeholder="Select platform" name="platform" [(ngModel)]="model.platform"
                                     [items]="platformOptions" [clearable]="false" required
                                     validation-state validation-errors></ng-select>
                        </form-field>
                        <form-field>
                          <label class="element-label">Replicas *</label>
                          <input type="number" class="form-control" name="replicas" [(ngModel)]="model.replicas"
                                 min="1" max="100" required validation-state validation-errors />
                        </form-field>
                        <form-field>
                          <label class="element-label">Container Port *</label>
                          <input type="number" class="form-control" name="port" [(ngModel)]="model.port"
                                 min="1" max="65535" required validation-state validation-errors />
                        </form-field>

                        <div class="d-flex justify-content-end mt-1 pb-50">
                          <button type="submit" class="btn btn-primary">Next</button>
                        </div>
                      </div>
                    </form>
                  </div>

                  <ng-template *ngTemplateOutlet="panelSideNav; context: { $implicit: steps.BASIC }"></ng-template>

                </div>
              </ng-template>
            </div>
          </div>
        </div>

        <!-- ── Advanced ──────────────────────────────────────────────────────── -->
        <div [ngbAccordionItem]="steps.ADVANCED" class="panel-form-panel">
          <div ngbAccordionCollapse>
            <div ngbAccordionBody>
              <ng-template>
                <div class="d-flex justify-content-between">

                  <div class="panel-content-title">
                    <h4 class="font-weight-bolder">Advanced</h4>
                    <p class="panel-content-title-sub-text">
                      Scaling, environment, networking and container overrides.
                    </p>
                  </div>

                  <div class="panel-content-form">
                    <form name="advancedForm" #advancedForm="ngForm" class="form form-vertical"
                          (ngSubmit)="finish()" novalidate>
                      <div class="form-container" form-group-errors showDetailsWhen="submitted">

                        <form-field>
                          <label class="element-label">Replication Strategy *</label>
                          <ng-select placeholder="Select strategy" name="replicationStrategy"
                                     [(ngModel)]="model.replicationStrategy" [items]="strategyOptions"
                                     [clearable]="false" required validation-state validation-errors></ng-select>
                        </form-field>
                        @if (model.replicationStrategy === 'hpa') {
                          <div class="subcard">
                            <div class="row">
                              <div class="col-md-4">
                                <form-field>
                                  <label class="element-label">Min Replicas *</label>
                                  <input type="number" class="form-control" name="hpaMinReplicas"
                                         [(ngModel)]="model.hpaMinReplicas" min="1"
                                         [required]="model.replicationStrategy === 'hpa'"
                                         validation-state validation-errors />
                                </form-field>
                              </div>
                              <div class="col-md-4">
                                <form-field>
                                  <label class="element-label">Max Replicas *</label>
                                  <input type="number" class="form-control" name="hpaMaxReplicas"
                                         [(ngModel)]="model.hpaMaxReplicas" min="1"
                                         [required]="model.replicationStrategy === 'hpa'"
                                         validation-state validation-errors />
                                </form-field>
                              </div>
                              <div class="col-md-4">
                                <form-field>
                                  <label class="element-label">Target CPU %</label>
                                  <input type="number" class="form-control" name="hpaTargetCpu"
                                         [(ngModel)]="model.hpaTargetCpu" min="1" max="100"
                                         validation-state validation-errors />
                                </form-field>
                              </div>
                            </div>
                          </div>
                        }

                        <label class="element-label d-block mt-1">Environment Variables</label>
                        <!-- track $index, not the row object: rows are mutated in place and two blank
                             rows would otherwise collide. The alias names each ngModel control. -->
                        @for (e of model.env; track $index; let i = $index) {
                          <div class="env-row">
                            <input type="text" class="form-control" name="envName{{ i }}"
                                   [(ngModel)]="e.name" placeholder="NAME" />
                            <input type="text" class="form-control" name="envValue{{ i }}"
                                   [(ngModel)]="e.value" placeholder="value" />
                            <button type="button" class="btn btn-outline-danger" (click)="removeEnv(i)">
                              <i data-feather="trash-2"></i>
                            </button>
                          </div>
                        }
                        <button type="button" class="btn btn-sm btn-outline-secondary" (click)="addEnv()">
                          <i data-feather="plus" class="mr-50"></i> Add variable
                        </button>

                        <form-field>
                          <label class="element-label mt-1">Expose via Load Balancer</label>
                          <div class="custom-control custom-switch mt-50">
                            <input type="checkbox" class="custom-control-input" id="enableLb" name="enableLb"
                                   [(ngModel)]="model.enableLb" />
                            <label class="custom-control-label" for="enableLb">
                              {{ model.enableLb ? 'Enabled' : 'Disabled' }}
                            </label>
                          </div>
                        </form-field>
                        @if (model.enableLb) {
                          <div class="subcard">
                            <form-field>
                              <label class="element-label">LB Type *</label>
                              <ng-select placeholder="Select LB type" name="lbType" [(ngModel)]="model.lbType"
                                         [items]="lbTypeOptions" [required]="model.enableLb"
                                         validation-state validation-errors></ng-select>
                            </form-field>
                            <div class="row">
                              <div class="col-md-6">
                                <form-field>
                                  <label class="element-label">Listener Port *</label>
                                  <input type="number" class="form-control" name="lbListenerPort"
                                         [(ngModel)]="model.lbListenerPort" min="1" max="65535"
                                         [required]="model.enableLb" validation-state validation-errors />
                                </form-field>
                              </div>
                              <div class="col-md-6">
                                <form-field>
                                  <label class="element-label">Health Check Path</label>
                                  <input type="text" class="form-control" name="healthCheckPath"
                                         [(ngModel)]="model.healthCheckPath" placeholder="/healthz"
                                         validation-state validation-errors />
                                </form-field>
                              </div>
                            </div>
                          </div>
                        }

                        <label class="element-label d-block mt-1">Container Config</label>
                        <div class="subcard">
                          <form-field>
                            <label class="element-label">Command</label>
                            <textarea class="form-control" name="command" [(ngModel)]="model.command"
                                      rows="3" placeholder="/bin/sh -c 'exec app'"></textarea>
                          </form-field>
                          <form-field>
                            <label class="element-label">Volume Mounts (YAML)</label>
                            <textarea class="form-control" name="volumeMounts" [(ngModel)]="model.volumeMounts"
                                      rows="4" placeholder="- name: data&#10;  mountPath: /data"></textarea>
                          </form-field>
                        </div>

                        <div class="d-flex justify-content-end mt-1 pb-50">
                          <button type="button" class="btn btn-outline-secondary mr-1"
                                  (click)="onExpandPanel(steps.BASIC)">Back</button>
                          <button type="submit" class="btn btn-primary" [disabled]="saving()">
                            {{ saving() ? 'Creating…' : 'Create' }}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>

                  <ng-template *ngTemplateOutlet="panelSideNav; context: { $implicit: steps.ADVANCED }"></ng-template>

                </div>
              </ng-template>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- One side nav, rendered by every panel with its own active id, so the full step list is always
         visible and any step title jumps to that panel. -->
    <ng-template #panelSideNav let-panelNavId>
      <div class="panel-content-sidenav">
        <div class="nav-item" [class.active]="panelNavId === steps.BASIC">
          <h5 class="nav-item-title" [class.invalid]="basicInvalid()"
              (click)="onExpandPanel(steps.BASIC)">Basic</h5>
          <ul class="nav-list">
            <li>Service Name</li>
            <li>Container Image</li>
            <li>Platform</li>
            <li>Replicas</li>
            <li>Container Port</li>
          </ul>
        </div>

        <div class="nav-item" [class.active]="panelNavId === steps.ADVANCED">
          <h5 class="nav-item-title" (click)="onExpandPanel(steps.ADVANCED)">Advanced</h5>
          <ul class="nav-list">
            <li>Replication Strategy</li>
            @if (model.replicationStrategy === 'hpa') {
              <li>Min / Max Replicas</li>
              <li>Target CPU %</li>
            }
            <li>Environment Variables</li>
            <li>Load Balancer</li>
            @if (model.enableLb) {
              <li>LB Type</li>
              <li>Listener Port</li>
              <li>Health Check Path</li>
            }
            <li>Command</li>
            <li>Volume Mounts</li>
          </ul>
        </div>
      </div>
    </ng-template>
  `,
})
export class AddAppSvcComponent {
  private readonly svc = inject(AppSvcService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly accordion = viewChild<NgbAccordionDirective>('acc');
  private readonly basicForm = viewChild<NgForm>('basicForm');
  private readonly advancedForm = viewChild<NgForm>('advancedForm');

  protected readonly steps = STEPS;
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  /** Set once Basic has been submitted while invalid, so the nav entry can flag it. */
  protected readonly basicInvalid = signal(false);

  protected resourceName = '';
  protected readonly platformOptions = ['ECS', 'EKS'];
  protected readonly strategyOptions = ['static', 'hpa', 'daemonset'];
  protected readonly lbTypeOptions = ['ClassicElb', 'ApplicationElb'];

  protected model: AppSvcSpec = {
    image: '',
    platform: 'EKS',
    replicas: 1,
    port: 80,
    replicationStrategy: 'static',
    hpaMinReplicas: null,
    hpaMaxReplicas: null,
    hpaTargetCpu: null,
    env: [],
    command: '',
    volumeMounts: '',
    enableLb: false,
    lbType: null,
    lbListenerPort: null,
    healthCheckPath: null,
  };

  protected addEnv(): void {
    this.model.env.push({ name: '', value: '' });
  }

  protected removeEnv(i: number): void {
    this.model.env.splice(i, 1);
  }

  protected onExpandPanel(panelId: string): void {
    this.accordion()?.expand(panelId);
  }

  /** Basic gates progress: invalid keeps the panel open, shows errors and flags the nav entry. */
  protected submitBasic(): void {
    const f = this.basicForm();
    if (f?.invalid) {
      f.form.markAllAsTouched();
      this.basicInvalid.set(true);
      return;
    }
    this.basicInvalid.set(false);
    this.onExpandPanel(STEPS.ADVANCED);
  }

  protected finish(): void {
    // Create gates on BOTH steps: the side nav can jump straight to Advanced without submitting Basic.
    const basic = this.basicForm();
    const advanced = this.advancedForm();
    this.basicInvalid.set(!!basic?.invalid);
    if (basic?.invalid || advanced?.invalid) {
      basic?.form.markAllAsTouched();
      advanced?.form.markAllAsTouched();
      if (basic?.invalid) {
        this.onExpandPanel(STEPS.BASIC);
      }
      return;
    }
    this.saving.set(true);
    this.error.set('');
    // Build the payload explicitly rather than posting the form object, so UI-only state cannot leak
    // into the request (V2 rule), and off sections send null rather than stale values.
    const payload: AppSvcSpec = {
      image: this.model.image,
      platform: this.model.platform,
      replicas: Number(this.model.replicas),
      port: Number(this.model.port),
      replicationStrategy: this.model.replicationStrategy,
      hpaMinReplicas: this.model.replicationStrategy === 'hpa' ? Number(this.model.hpaMinReplicas) : null,
      hpaMaxReplicas: this.model.replicationStrategy === 'hpa' ? Number(this.model.hpaMaxReplicas) : null,
      hpaTargetCpu: this.model.replicationStrategy === 'hpa' && this.model.hpaTargetCpu != null
        ? Number(this.model.hpaTargetCpu) : null,
      env: this.model.env.filter(e => !!e.name),
      command: this.model.command,
      volumeMounts: this.model.volumeMounts,
      enableLb: this.model.enableLb,
      lbType: this.model.enableLb ? this.model.lbType : null,
      lbListenerPort: this.model.enableLb ? Number(this.model.lbListenerPort) : null,
      healthCheckPath: this.model.enableLb ? this.model.healthCheckPath : null,
    };
    this.svc.create(this.resourceName, payload).subscribe({
      next: () => this.router.navigate(['..'], { relativeTo: this.route }),
      error: err => {
        this.saving.set(false);
        // Surface the REAL reason (platform puts the generic title in `message`, the detail in `errors`).
        this.error.set(extractErrorMessage(err));
      },
    });
  }

  protected cancel(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}
