import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonLibComponentsModule, FlatStatusFilter } from '@duplocloud-internal/ng-common-lib';
import { HelloService, HelloWorld } from '../hello.service';
import { ResultTemplateModule } from '../result-template/result-template.module';
import { StatusBadgeComponent } from '../shared/status-badge.component';

// Declarative Result view-template (served by the backend GET …/view-template; this is the local fallback).
const MINIO_VIEW_TEMPLATE: any = {
  resourceType: 'MinIO', subType: 'minio', label: 'MinIO', icon: 'database', idField: 'id',
  groups: [
    {
      name: 'Endpoints',
      fields: [
        { type: 'single', key: 'deploymentName', label: 'Deployment', value: 'result.deploymentName', hideWhenEmpty: true },
        { type: 'single', key: 'serviceName', label: 'Service', value: 'result.serviceName', hideWhenEmpty: true },
        { type: 'single', key: 'apiEndpoint', label: 'S3 API', value: 'result.apiEndpoint', mono: true, hideWhenEmpty: true },
        { type: 'single', key: 'consoleEndpoint', label: 'Console', value: 'result.consoleEndpoint', mono: true, hideWhenEmpty: true },
      ],
    },
    {
      name: 'Live Pods',
      fields: [
        {
          type: 'table', key: 'pods', value: 'result.pods',
          columns: [
            { key: 'name', label: 'Name' },
            { key: 'phase', label: 'Phase' },
            { key: 'ready', label: 'Ready' },
          ],
        },
      ],
    },
  ],
};

// Detail view mirroring the platform resource pattern.
//
// CommonLibComponentsModule re-exports CommonModule (the date pipe) and NgbModule (ngbDropdownItem) along
// with the view shell components, so it is the only platform import this template needs.
@Component({
  selector: 'hw-view',
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
        <sidecard featherIcon="server">
          <h6 class="card-subtitle text-muted">Pods</h6>
          <h4 class="card-title">{{ it.result?.pods?.length ?? 0 }}</h4>
        </sidecard>
        <sidecard featherIcon="calendar">
          <h6 class="card-subtitle text-muted">Created At</h6>
          <h4 class="card-title">{{ it.createdAt | date:'medium' }}</h4>
        </sidecard>

        <section class="card px-2 py-1">
          @switch (activePanel()) {
            @case ('spec') {
              <div class="p-1">
                <div class="row">
                  <div class="col-md-6 mb-50"><strong>Namespace:</strong> {{ it.spec?.namespace || '—' }}</div>
                  <div class="col-md-6 mb-50"><strong>Replicas:</strong> {{ it.spec?.replicas ?? '—' }}</div>
                  <div class="col-md-6 mb-50"><strong>Image:</strong> {{ it.spec?.image || '—' }}</div>
                  <div class="col-md-6 mb-50"><strong>Root User:</strong> {{ it.spec?.rootUser || '—' }}</div>
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
export class ViewHelloComponent implements OnInit {
  private readonly svc = inject(HelloService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly item = signal<HelloWorld | undefined>(undefined);
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
      this.activePanel.set(i?.result?.deploymentName ? 'result' : 'spec');
    });
    this.svc.getViewTemplate().subscribe(t => this.viewTemplate.set(t || MINIO_VIEW_TEMPLATE));
  }

  protected track(): void {
    const it = this.item();
    if (!it) {
      return;
    }
    this.tracking.set(true);
    this.svc.ticketName(it.id).subscribe({
      next: name => {
        this.tracking.set(false);
        if (!name) {
          return;
        }
        this.router.navigate(['/ai/service-desk', this.svc.workspaceId(), 'tickets', 'chat', name]);
      },
      error: () => this.tracking.set(false),
    });
  }
}
