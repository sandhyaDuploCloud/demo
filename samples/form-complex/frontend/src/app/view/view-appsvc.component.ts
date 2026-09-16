import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonLibComponentsModule, FlatStatusFilter } from '@duplocloud-internal/ng-common-lib';
import { AppSvcService, AppService } from '../appsvc.service';
import { ResultTemplateModule } from '../result-template/result-template.module';

const APPSVC_VIEW_TEMPLATE: any = {
  resourceType: 'AppServiceLite', subType: 'app-service-lite', label: 'App Service', icon: 'layers', idField: 'id',
  groups: [{ name: 'Result', fields: [{ type: 'single', key: 'status', label: 'Status', value: 'status' }] }],
};

// Detail view: header card + Spec/Result toggle. No-provision → no provisioning-track UI.
//
// CommonLibComponentsModule re-exports CommonModule and NgbModule along with the view shell components,
// so it is the only platform import this template needs.
@Component({
  selector: 'as-view',
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
            <app-flat-status-filter [filters]="panelFilters" [activeStatus]="activePanel()" [showCount]="false"
                                    (changed)="activePanel.set($event)"></app-flat-status-filter>
          </ng-template>
        </view-header-card>

        <sidecard featherIcon="layers">
          <h6 class="card-subtitle text-muted">Platform</h6>
          <h4 class="card-title">{{ it.spec?.platform || '—' }}</h4>
        </sidecard>
        <sidecard featherIcon="copy">
          <h6 class="card-subtitle text-muted">Replicas</h6>
          <h4 class="card-title">{{ it.spec?.replicas ?? '—' }}</h4>
        </sidecard>

        <section class="card px-2 py-1">
          @switch (activePanel()) {
            @case ('spec') {
              <div class="p-1">
                <div class="row">
                  <div class="col-md-6 mb-1"><strong>Image:</strong> {{ it.spec?.image || '—' }}</div>
                  <div class="col-md-6 mb-1"><strong>Port:</strong> {{ it.spec?.port ?? '—' }}</div>
                  <div class="col-md-6 mb-1"><strong>Strategy:</strong> {{ it.spec?.replicationStrategy || '—' }}</div>
                  <div class="col-md-6 mb-1"><strong>Load Balancer:</strong> {{ it.spec?.enableLb ? (it.spec?.lbType || 'Enabled') : 'Disabled' }}</div>
                  <div class="col-md-12 mb-1"><strong>Env Vars:</strong> {{ (it.spec?.env || []).length }} defined</div>
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
export class ViewAppSvcComponent implements OnInit {
  private readonly svc = inject(AppSvcService);
  private readonly route = inject(ActivatedRoute);

  protected readonly item = signal<AppService | undefined>(undefined);
  protected readonly viewTemplate = signal<any>(null);
  protected readonly activePanel = signal<'spec' | 'result'>('spec');
  protected readonly panelFilters = [
    new FlatStatusFilter({ name: 'spec', label: 'Spec' }),
    new FlatStatusFilter({ name: 'result', label: 'Result' }),
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.svc.get(id).subscribe(i => this.item.set(i));
    this.svc.getViewTemplate().subscribe(t => this.viewTemplate.set(t || APPSVC_VIEW_TEMPLATE));
  }
}
