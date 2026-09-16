import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { extractErrorMessage, SharedFormsModule } from '@duplocloud-internal/ng-common-lib';
import { HelmService, HelmDeploySpec } from '../helm.service';
import { WizardStep, WizardStepperComponent } from '../wizard/wizard-stepper.component';

// Multi-step WIZARD create form (matches the design mock: numbered header + Back/Cancel/Next footer).
//
// Per-step validation, template-driven: ONE <form> wraps the <duplo-wizard-stepper>; each step's fields sit
// in an `ngModelGroup` and are toggled with [hidden] (NOT @if) so their controls stay registered while
// hidden. `nextDisabled` is the CURRENT group's `.invalid`, so Next/Finish is gated per step. All field
// widgets come from SharedFormsModule (`form-field`, validation directives) + ng-select; only the stepper
// chrome is bespoke. On Finish the per-step models are assembled into the HelmDeploySpec and POSTed.
//
// `model` stays a plain mutable object bound with [(ngModel)]: two-way binding to an object PROPERTY is
// fine — the trap is only [(ngModel)] onto a signal. Signals hold state written outside a template event
// (activeIndex/saving/error), which is what the default OnPush strategy needs to repaint.
@Component({
  selector: 'hw-add',
  imports: [SharedFormsModule, NgSelectModule, WizardStepperComponent],
  styles: [`
    :host { display: block; }
    .step-title { font-weight: 600; margin-bottom: 1rem; }
    .form-narrow { max-width: 820px; }
  `],
  template: `
    <form #f="ngForm" class="form form-vertical" (ngSubmit)="f.valid && finish()">
      <duplo-wizard-stepper
        [steps]="steps"
        [activeIndex]="activeIndex()"
        [nextDisabled]="isStepInvalid(f)"
        [saving]="saving()"
        [error]="error()"
        finishLabel="Create"
        (back)="back()"
        (next)="next(f)"
        (cancel)="cancel()"
        (finish)="finish()">

        <div class="form-container form-narrow" form-group-errors showDetailsWhen="submitted">

          <!-- Step 1 — Products -->
          <div [hidden]="activeIndex() !== 0" ngModelGroup="step0">
            <div class="step-title">Products</div>
            <form-field>
              <label class="element-label">Products *</label>
              <ng-select name="products" [(ngModel)]="model.products" [items]="productOptions"
                         [multiple]="true" placeholder="Select one or more products" required
                         validation-state validation-errors></ng-select>
            </form-field>
          </div>

          <!-- Step 2 — Deployment -->
          <div [hidden]="activeIndex() !== 1" ngModelGroup="step1">
            <div class="step-title">Deployment</div>
            <form-field>
              <label class="element-label">Deployment Name *</label>
              <!-- Keep the hyphen escaped: browsers compile pattern with the RegExp v flag,
                   under which a bare hyphen in a class throws and the validator fails open. -->
              <input type="text" class="form-control" name="deploymentName" [(ngModel)]="model.deploymentName"
                     placeholder="e.g. baic-prod" required validation-state validation-errors
                     minlength="2" maxlength="60" pattern="^[a-z0-9]([a-z0-9\\-]*[a-z0-9])?$" />
            </form-field>
            <form-field>
              <label class="element-label">Namespace *</label>
              <input type="text" class="form-control" name="namespace" [(ngModel)]="model.namespace"
                     placeholder="baic-staging" required validation-state validation-errors />
            </form-field>
            <form-field>
              <label class="element-label">Release Name *</label>
              <input type="text" class="form-control" name="releaseName" [(ngModel)]="model.releaseName"
                     placeholder="baic" required validation-state validation-errors />
            </form-field>
            <form-field>
              <label class="element-label">Timeout *</label>
              <ng-select name="timeout" [(ngModel)]="model.timeout" [items]="timeoutOptions"
                         [clearable]="false" required validation-state validation-errors></ng-select>
            </form-field>
            <div class="form-group">
              <label class="element-label d-block">Auto-rollback on failure</label>
              <div class="custom-control custom-switch">
                <input type="checkbox" class="custom-control-input" id="autoRollback" name="autoRollback"
                       [(ngModel)]="model.autoRollback" />
                <label class="custom-control-label" for="autoRollback">Enabled (--atomic)</label>
              </div>
            </div>
          </div>

          <!-- Step 3 — Chart Registry -->
          <div [hidden]="activeIndex() !== 2" ngModelGroup="step2">
            <div class="step-title">Chart Registry</div>
            <form-field>
              <label class="element-label">Registry URL *</label>
              <input type="text" class="form-control" name="chartRegistryUrl" [(ngModel)]="model.chartRegistryUrl"
                     placeholder="oci://registry.example.com/charts" required validation-state validation-errors />
            </form-field>
            <form-field>
              <label class="element-label">Chart Name *</label>
              <input type="text" class="form-control" name="chartName" [(ngModel)]="model.chartName"
                     placeholder="baic" required validation-state validation-errors />
            </form-field>
            <form-field>
              <label class="element-label">Chart Version *</label>
              <input type="text" class="form-control" name="chartVersion" [(ngModel)]="model.chartVersion"
                     placeholder="1.2.3" required validation-state validation-errors />
            </form-field>
          </div>

          <!-- Step 4 — Services & Values -->
          <div [hidden]="activeIndex() !== 3" ngModelGroup="step3">
            <div class="step-title">Services &amp; Values</div>
            <form-field>
              <label class="element-label">Service Type *</label>
              <ng-select name="serviceType" [(ngModel)]="model.serviceType" [items]="serviceTypeOptions"
                         [clearable]="false" required validation-state validation-errors></ng-select>
            </form-field>
            <form-field>
              <label class="element-label">values.yaml overrides</label>
              <textarea class="form-control" name="values" [(ngModel)]="model.values" rows="8"
                        placeholder="# optional Helm values overrides"></textarea>
            </form-field>
          </div>

        </div>
      </duplo-wizard-stepper>
    </form>
  `,
})
export class AddHelmComponent {
  private readonly svc = inject(HelmService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly steps: WizardStep[] = [
    { key: 'step0', label: 'Products' },
    { key: 'step1', label: 'Deployment' },
    { key: 'step2', label: 'Chart Registry' },
    { key: 'step3', label: 'Services & Values' },
  ];

  protected readonly activeIndex = signal(0);
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected readonly productOptions = ['baic', 'analytics', 'gateway', 'notifications'];
  protected readonly timeoutOptions = ['5 minutes', '10 minutes', '15 minutes', '30 minutes'];
  protected readonly serviceTypeOptions = ['ClusterIP', 'NodePort', 'LoadBalancer'];

  protected model: HelmDeploySpec = {
    products: [],
    deploymentName: '',
    namespace: '',
    releaseName: '',
    timeout: '15 minutes',
    autoRollback: true,
    chartRegistryUrl: '',
    chartName: '',
    chartVersion: '',
    serviceType: 'ClusterIP',
    values: '',
  };

  // Validity of just the active step's ngModelGroup — gates Next/Finish per step. Stays a method rather
  // than a computed: the group lives on the template's NgForm and its status changes per keystroke.
  protected isStepInvalid(f: NgForm): boolean {
    const group = f?.form?.get(this.steps[this.activeIndex()].key);
    return !!group && group.invalid;
  }

  protected next(f: NgForm): void {
    if (this.isStepInvalid(f)) {
      return;
    }
    if (this.activeIndex() < this.steps.length - 1) {
      this.activeIndex.update(i => i + 1);
    }
  }

  protected back(): void {
    if (this.activeIndex() > 0) {
      this.activeIndex.update(i => i - 1);
    }
  }

  protected finish(): void {
    this.saving.set(true);
    this.error.set('');
    // deploymentName doubles as the resource name (kebab, unique per workspace).
    this.svc.create(this.model.deploymentName, this.model).subscribe({
      next: () => this.router.navigate(['..'], { relativeTo: this.route }),
      error: err => {
        this.saving.set(false);
        // Surface the REAL reason: the platform puts the generic title in `message` and the actual
        // detail in `errors`. extractErrorMessage() (from the lib) reads errors → Message → message.
        this.error.set(extractErrorMessage(err));
      },
    });
  }

  protected cancel(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}
