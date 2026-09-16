import { Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormGroupErrorsComponent, SharedFormsModule } from '@duplocloud-internal/ng-common-lib';
import { S3BucketService } from '../s3-bucket.service';

@Component({
  selector: 's3b-add',
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
          <h4 class="font-weight-bolder">{{ isEdit ? 'Edit' : 'Create' }} S3 Bucket</h4>
          <p class="panel-content-title-sub-text text-muted">
            Provision a named S3 bucket in any AWS region with optional public-access settings.
          </p>
        </div>

        <div class="panel-content-form">
          @if (loading()) {
            <div class="text-muted p-1">Loading…</div>
          } @else {
            <form name="AddS3BucketForm" #f="ngForm" class="form form-vertical" (ngSubmit)="f.valid && submit()">
              <div class="form-container" form-group-errors #formGroupErrors showDetailsWhen="submitted">

                <form-field>
                  <label class="element-label">Resource Name *</label>
                  <input type="text" class="form-control" name="name"
                         [ngModel]="name()" (ngModelChange)="name.set($event)" [readonly]="isEdit"
                         placeholder="e.g. my-s3-bucket" required validation-state validation-errors
                         minlength="2" maxlength="60"
                         pattern="^[a-zA-Z0-9]([a-zA-Z0-9\\-]*[a-zA-Z0-9])?$" />
                </form-field>

                <form-field>
                  <label class="element-label">Bucket Name *</label>
                  <input type="text" class="form-control" name="bucketName"
                         [ngModel]="bucketName()" (ngModelChange)="bucketName.set($event)"
                         placeholder="e.g. my-unique-bucket-name" required validation-state validation-errors
                         minlength="3" maxlength="63"
                         pattern="^[a-z0-9][a-z0-9\\-\\.]*[a-z0-9]$" />
                </form-field>

                <form-field>
                  <label class="element-label">Region</label>
                  <input type="text" class="form-control" name="region"
                         [ngModel]="region()" (ngModelChange)="region.set($event)"
                         placeholder="us-east-1" validation-state validation-errors />
                </form-field>

                <form-field>
                  <label class="element-label">Public Access</label>
                  <div class="custom-control custom-switch mt-50">
                    <input type="checkbox" class="custom-control-input" id="publicAccess" name="publicAccess"
                           [ngModel]="publicAccess()" (ngModelChange)="publicAccess.set($event)" />
                    <label class="custom-control-label" for="publicAccess">
                      {{ publicAccess() ? 'Enabled (Block Public Access disabled)' : 'Blocked (default)' }}
                    </label>
                  </div>
                </form-field>

                <div class="d-flex justify-content-end mt-1">
                  <button type="button" class="btn btn-outline-secondary mr-1" (click)="cancel()">Cancel</button>
                  <button type="submit" class="btn btn-primary" [disabled]="saving()">
                    {{ isEdit ? 'Save' : 'Provision' }}
                  </button>
                </div>
              </div>
            </form>
          }
        </div>

        <div class="panel-content-sidenav">
          <div class="help-item">
            <p class="help-item-title">Resource Name</p>
            <small class="text-muted">A unique identifier for this resource within DuploCloud.</small>
          </div>
          <div class="help-item">
            <p class="help-item-title">Bucket Name</p>
            <small class="text-muted">Globally unique S3 bucket name. Lowercase, 3–63 chars, letters/numbers/hyphens/dots.</small>
          </div>
          <div class="help-item">
            <p class="help-item-title">Region</p>
            <small class="text-muted">AWS region for the bucket. Defaults to <code>us-east-1</code>.</small>
          </div>
          <div class="help-item">
            <p class="help-item-title">Public Access</p>
            <small class="text-muted">When enabled, disables S3 Block Public Access settings. Defaults to blocked.</small>
          </div>
        </div>

      </div>
    </div>
  `,
})
export class AddS3BucketComponent implements OnInit {
  private readonly svc = inject(S3BucketService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly name = signal('');
  protected readonly bucketName = signal('');
  protected readonly region = signal('us-east-1');
  protected readonly publicAccess = signal(false);
  protected readonly saving = signal(false);
  protected readonly loading = signal(false);

  protected readonly isEdit = this.route.snapshot.data['action'] === 'Edit';
  private readonly id: string = this.route.snapshot.params['id'];

  private readonly formErrors = viewChild(FormGroupErrorsComponent);

  ngOnInit(): void {
    if (!this.isEdit) {
      return;
    }
    this.loading.set(true);
    this.svc.get(this.id).subscribe({
      next: item => {
        this.name.set(item?.name ?? '');
        this.bucketName.set(item?.spec?.bucketName ?? '');
        this.region.set(item?.spec?.region ?? 'us-east-1');
        this.publicAccess.set(item?.spec?.publicAccess ?? false);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected submit(): void {
    this.saving.set(true);
    const spec = {
      bucketName: this.bucketName(),
      region: this.region() || 'us-east-1',
      publicAccess: this.publicAccess(),
    };
    const call = this.isEdit
      ? this.svc.update(this.id, spec)
      : this.svc.create(this.name(), spec);
    call.subscribe({
      next: () => this.back(),
      error: (err: any) => {
        this.saving.set(false);
        this.formErrors()?.reportError(err);
      },
    });
  }

  protected cancel(): void {
    this.back();
  }

  private back(): void {
    this.router.navigate([this.isEdit ? '../..' : '..'], { relativeTo: this.route });
  }
}
