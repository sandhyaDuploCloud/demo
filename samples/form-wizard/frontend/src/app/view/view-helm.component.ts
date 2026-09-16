import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonLibComponentsModule, FlatStatusFilter } from '@duplocloud-internal/ng-common-lib';
import { HelmService, HelmDeployment } from '../helm.service';
import { ResultTemplateModule } from '../result-template/result-template.module';

// Declarative Result view-template (served by the backend GET …/view-template; falls back to this local copy).
const HELM_VIEW_TEMPLATE: any = {
  resourceType: 'HelmDeployment', subType: 'helm-deployment', label: 'Helm Deployment', icon: 'package', idField: 'id',
  groups: [{
    name: 'Result',
    fields: [
      { type: 'single', key: 'status', label: 'Status', value: 'status' },
    ],
  }],
};

// Detail view: header card + Spec/Result toggle. No-provision → no "Track Provisioning" action/footer.
//
// CommonLibComponentsModule re-exports CommonModule (the date pipe) and NgbModule along with the view
// shell components, so it is the only platform import this template needs.
@Component({
  selector: 'hw-view',
  imports: [CommonLibComponentsModule, ResultTemplateModule],
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

          <ng-template #headerFilter>
            <app-flat-status-filter
              [filters]="panelFilters"
              [activeStatus]="activePanel()"
              [showCount]="false"
              (changed)="activePanel.set($event)">
            </app-flat-status-filter>
          </ng-template>
        </view-header-card>

        <sidecard featherIcon="box">
          <h6 class="card-subtitle text-muted">Namespace</h6>
          <h4 class="card-title">{{ it.spec?.namespace || '—' }}</h4>
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
                  <div class="col-md-6 mb-1"><strong>Deployment Name:</strong> {{ it.spec?.deploymentName || '—' }}</div>
                  <div class="col-md-6 mb-1"><strong>Release Name:</strong> {{ it.spec?.releaseName || '—' }}</div>
                  <div class="col-md-6 mb-1"><strong>Namespace:</strong> {{ it.spec?.namespace || '—' }}</div>
                  <div class="col-md-6 mb-1"><strong>Timeout:</strong> {{ it.spec?.timeout || '—' }}</div>
                  <div class="col-md-6 mb-1"><strong>Auto-rollback:</strong> {{ it.spec?.autoRollback ? 'Enabled' : 'Disabled' }}</div>
                  <div class="col-md-6 mb-1"><strong>Products:</strong> {{ (it.spec?.products || []).join(', ') || '—' }}</div>
                  <div class="col-md-6 mb-1"><strong>Chart:</strong> {{ it.spec?.chartName || '—' }}@if (it.spec?.chartVersion) {<span>:{{ it.spec?.chartVersion }}</span>}</div>
                  <div class="col-md-6 mb-1"><strong>Registry:</strong> {{ it.spec?.chartRegistryUrl || '—' }}</div>
                  <div class="col-md-6 mb-1"><strong>Service Type:</strong> {{ it.spec?.serviceType || '—' }}</div>
                </div>
              </div>
            }
            @case ('result') {
              <app-resource-template-view [template]="viewTemplate()" [data]="it"></app-resource-template-view>
            }
          }
        </section>
      </view-with-sidecards>
    } @else {
      <div class="text-muted p-2">Loading…</div>
    }
  `,
})
export class ViewHelmComponent implements OnInit {
  private readonly svc = inject(HelmService);
  private readonly route = inject(ActivatedRoute);

  protected readonly item = signal<HelmDeployment | undefined>(undefined);
  protected readonly viewTemplate = signal<any>(null);
  protected readonly activePanel = signal<'spec' | 'result'>('spec');
  protected readonly panelFilters = [
    new FlatStatusFilter({ name: 'spec', label: 'Spec' }),
    new FlatStatusFilter({ name: 'result', label: 'Result' }),
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.svc.get(id).subscribe(i => this.item.set(i));
    this.svc.getViewTemplate().subscribe(t => this.viewTemplate.set(t || HELM_VIEW_TEMPLATE));
  }
}
