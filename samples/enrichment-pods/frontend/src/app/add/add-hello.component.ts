import { Component, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormGroupErrorsComponent, SharedFormsModule } from '@duplocloud-internal/ng-common-lib';
import { HelloService } from '../hello.service';

// Create form in the platform's 3-column `panel-form-accordion` layout.
//
// Forms stay template-driven, but each field is a signal bound one-way with an explicit (ngModelChange)
// writer: `[(ngModel)]="sig"` would compile to `sig = $event`, which cannot assign to a signal. Signals
// also keep the component correct under Angular 22's default OnPush strategy.
@Component({
  selector: 'hw-add',
  imports: [SharedFormsModule],
  styles: [`
    :host { display: block; }
    .panel-form-accordion { background: #fff; padding: 1.25rem 0 1rem 1.5rem; }
    .panel-content-title { width: 265px; min-width: 265px; }
    .panel-content-title-sub-text { max-width: 220px; }
    .panel-content-form { max-width: 768px; flex: 1 1 auto; margin: 0 1rem; padding: 0 1rem; }
    .panel-content-sidenav { width: 265px; min-width: 265px; margin-left: 2rem; }
    .panel-content-sidenav .help-item { padding-bottom: 1rem; }
    .panel-content-sidenav .help-item-title { margin: 0; font-weight: 600; font-size: 0.9rem; }
  `],
  template: `
    <div class="card panel-form-accordion">
      <div class="d-flex justify-content-between">

        <div class="panel-content-title">
          <h4 class="font-weight-bolder">Create MinIO</h4>
          <p class="panel-content-title-sub-text text-muted">
            Deploys a MinIO Deployment + Service (no ingress) into the selected Kubernetes scope's namespace.
          </p>
        </div>

        <div class="panel-content-form">
          <form name="AddMinioForm" #f="ngForm" class="form form-vertical" (ngSubmit)="f.valid && submit()">
            <div class="form-container" form-group-errors #formGroupErrors showDetailsWhen="submitted">
              <form-field>
                <label class="element-label">Name *</label>
                <!-- Keep the hyphen escaped: browsers compile pattern with the RegExp v flag, under
                     which a bare hyphen in a character class throws and the validator fails open. -->
                <input type="text" class="form-control" name="name"
                       [ngModel]="name()" (ngModelChange)="name.set($event)"
                       placeholder="e.g. minio-dev" required validation-state validation-errors
                       minlength="2" maxlength="60" pattern="^[a-zA-Z0-9]([a-zA-Z0-9\\-]*[a-zA-Z0-9])?$" />
              </form-field>
              <form-field>
                <label class="element-label">Kubernetes Scope ID *</label>
                <input type="text" class="form-control" name="scopeId"
                       [ngModel]="scopeId()" (ngModelChange)="scopeId.set($event)"
                       placeholder="the eks scope id" required validation-state validation-errors />
              </form-field>
              <form-field>
                <label class="element-label">Namespace *</label>
                <input type="text" class="form-control" name="namespace"
                       [ngModel]="namespace()" (ngModelChange)="namespace.set($event)"
                       required validation-state validation-errors />
              </form-field>
              <form-field>
                <label class="element-label">Image</label>
                <input type="text" class="form-control" name="image"
                       [ngModel]="image()" (ngModelChange)="image.set($event)" />
              </form-field>
              <form-field>
                <label class="element-label">Root User</label>
                <input type="text" class="form-control" name="rootUser"
                       [ngModel]="rootUser()" (ngModelChange)="rootUser.set($event)" />
              </form-field>
              <form-field>
                <label class="element-label">Root Password</label>
                <input type="password" class="form-control" name="rootPassword"
                       [ngModel]="rootPassword()" (ngModelChange)="rootPassword.set($event)" />
              </form-field>
              <form-field>
                <label class="element-label">Replicas</label>
                <input type="number" class="form-control" name="replicas"
                       [ngModel]="replicas()" (ngModelChange)="replicas.set($event)" min="1" />
              </form-field>

              <div class="d-flex justify-content-end mt-1">
                <button type="button" class="btn btn-outline-secondary mr-1" (click)="cancel()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="saving()">Provision</button>
              </div>
            </div>
          </form>
        </div>

        <div class="panel-content-sidenav">
          <div class="help-item">
            <p class="help-item-title">Kubernetes Scope</p>
            <small class="text-muted">The cluster credentials the agent uses to <code>kubectl apply</code> MinIO.</small>
          </div>
          <div class="help-item">
            <p class="help-item-title">Namespace</p>
            <small class="text-muted">Where the Deployment + Service are created.</small>
          </div>
        </div>

      </div>
    </div>
  `,
})
export class AddHelloComponent {
  private readonly svc = inject(HelloService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly name = signal('');
  protected readonly scopeId = signal('');
  protected readonly namespace = signal('dev01-gk');
  protected readonly image = signal('quay.io/minio/minio:RELEASE.2025-04-22T22-12-26Z');
  protected readonly rootUser = signal('minioadmin');
  protected readonly rootPassword = signal('minioadmin123');
  protected readonly replicas = signal(1);
  protected readonly saving = signal(false);

  // Platform error reporter: the form-group-errors directive (already on the <form>) surfaces the real
  // API error via extractErrorMessage. viewChild() returns a signal — call it.
  private readonly formErrors = viewChild(FormGroupErrorsComponent);

  protected submit(): void {
    this.saving.set(true);
    this.svc.create(this.name(), {
      scopeIds: this.scopeId() ? [this.scopeId()] : [],
      namespace: this.namespace(),
      image: this.image(),
      rootUser: this.rootUser(),
      rootPassword: this.rootPassword(),
      replicas: this.replicas(),
    }).subscribe({
      next: () => this.router.navigate(['..'], { relativeTo: this.route }),
      error: err => {
        this.saving.set(false);
        this.formErrors()?.reportError(err);
      },
    });
  }

  protected cancel(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}
