import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonLibComponentsModule, FlatStatusFilter } from '@duplocloud-internal/ng-common-lib';
import { S3BucketService, S3Bucket } from '../s3-bucket.service';
import { ResultTemplateModule } from '../result-template/result-template.module';
import { StatusBadgeComponent } from '../shared/status-badge.component';

const S3_VIEW_TEMPLATE: any = {
  resourceType: 'S3Bucket', subType: 's3-bucket', label: 'S3 Bucket', icon: 'database', idField: 'id',
  groups: [{
    name: 'Result',
    fields: [
      { type: 'single', key: 'bucketName', label: 'Bucket Name', value: 'result.bucketName', hideWhenEmpty: true },
      { type: 'single', key: 'bucketArn', label: 'Bucket ARN', value: 'result.bucketArn', hideWhenEmpty: true, mono: true },
      { type: 'single', key: 'region', label: 'Region', value: 'result.region', hideWhenEmpty: true },
      { type: 'single', key: 'publicAccess', label: 'Public Access', value: 'result.publicAccess', hideWhenEmpty: true },
      { type: 'single', key: 'dateCreated', label: 'Date Created', value: 'result.dateCreated', hideWhenEmpty: true },
    ],
  }],
};

@Component({
  selector: 's3b-view',
  imports: [CommonLibComponentsModule, ResultTemplateModule, StatusBadgeComponent],
  template: `
    @if (item(); as it) {
      <view-with-sidecards>
        <view-header-card [compactActions]="true">
          <ng-template #title>
            <h3 class="text-uppercase mr-auto">
              <span class="badge avatar-badge">{{ it.name?.[0] }}</span>
              <span class="name-badge">{{ it.name }}</span>
            </h3>
          </ng-template>

          <ng-template #actions>
            <a ngbDropdownItem (click)="edit()"><i data-feather="edit"></i> Edit</a>
            <a ngbDropdownItem (click)="track()"><i data-feather="terminal"></i> View Provisioning Ticket</a>
          </ng-template>

          <ng-template #headerFilter>
            <app-flat-status-filter
              [filters]="panelFilters"
              [activeStatus]="activePanel()"
              [showCount]="false"
              (changed)="activePanel.set($event)">
            </app-flat-status-filter>
          </ng-template>
        </view-header-card>

        <sidecard featherIcon="activity">
          <h6 class="card-subtitle text-muted">Status</h6>
          <h4 class="card-title"><app-status-badge [status]="it.status"></app-status-badge></h4>
        </sidecard>
        <sidecard featherIcon="map-pin">
          <h6 class="card-subtitle text-muted">Region</h6>
          <h4 class="card-title">{{ it.spec?.region || 'us-east-1' }}</h4>
        </sidecard>
        <sidecard featherIcon="calendar">
          <h6 class="card-subtitle text-muted">Created At</h6>
          <h4 class="card-title">{{ it.createdAt | date:'medium' }}</h4>
        </sidecard>

        <section class="card px-2 py-1">
          @switch (activePanel()) {
            @case ('spec') {
              <div class="p-1">
                <div class="row mb-50">
                  <div class="col-md-4"><strong>Bucket Name:</strong></div>
                  <div class="col-md-8">{{ it.spec?.bucketName || '—' }}</div>
                </div>
                <div class="row mb-50">
                  <div class="col-md-4"><strong>Region:</strong></div>
                  <div class="col-md-8">{{ it.spec?.region || 'us-east-1' }}</div>
                </div>
                <div class="row mb-50">
                  <div class="col-md-4"><strong>Public Access:</strong></div>
                  <div class="col-md-8">{{ it.spec?.publicAccess ? 'Enabled' : 'Blocked' }}</div>
                </div>
              </div>
            }
            @case ('result') {
              <app-resource-template-view [template]="viewTemplate()" [data]="it"></app-resource-template-view>
            }
          }

          <div class="d-flex justify-content-end align-items-center px-1 pb-1 pt-50">
            @if (it.subStatus) {
              <span class="font-small-3 text-muted mr-75 text-truncate" style="max-width:60%"
                    [title]="it.subStatus">{{ it.subStatus }}</span>
            }
            <button class="btn btn-primary btn-sm" (click)="track()" [disabled]="tracking()">
              <i data-feather="zap" class="mr-50"></i> Track Provisioning Status
            </button>
          </div>
        </section>
      </view-with-sidecards>
    } @else {
      <div class="text-muted p-2">Loading…</div>
    }
  `,
})
export class ViewS3BucketComponent implements OnInit {
  private readonly svc = inject(S3BucketService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly item = signal<S3Bucket | undefined>(undefined);
  protected readonly viewTemplate = signal<any>(null);
  protected readonly activePanel = signal<'spec' | 'result'>('spec');
  protected readonly tracking = signal(false);
  protected readonly panelFilters = [
    new FlatStatusFilter({ name: 'spec', label: 'Spec' }),
    new FlatStatusFilter({ name: 'result', label: 'Result' }),
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.svc.get(id).subscribe(i => {
      this.item.set(i);
      this.activePanel.set(i?.result?.bucketArn ? 'result' : 'spec');
    });
    this.svc.getViewTemplate().subscribe(t => this.viewTemplate.set(t || S3_VIEW_TEMPLATE));
  }

  protected edit(): void {
    const it = this.item();
    if (it) {
      this.router.navigate(['../..', 'edit', it.id], { relativeTo: this.route });
    }
  }

  protected track(): void {
    const it = this.item();
    if (!it) return;
    this.tracking.set(true);
    this.svc.ticketName(it.id).subscribe({
      next: name => {
        this.tracking.set(false);
        if (!name) return;
        this.router.navigate(['/ai/service-desk', this.svc.workspaceId(), 'tickets', 'chat', name]);
      },
      error: () => this.tracking.set(false),
    });
  }
}
