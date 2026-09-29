import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonLibComponentsModule, FlatStatusFilter } from '@duplocloud-internal/ng-common-lib';
import { PasswordGeneratorService, PasswordGenerator } from '../password-generator.service';
import { ResultTemplateModule } from '../result-template/result-template.module';
import { StatusBadgeComponent } from '../shared/status-badge.component';

// Declarative Result view-template (ideally served by the backend GET …/view-template; falls back to this
// local copy so the Result panel always renders via <app-resource-template-view>).
//
// The generated password is deliberately absent here: the vendored renderer has no masked field type, so
// the secret is rendered by this component's own reveal row below instead of as a plain tile.
const PWGEN_VIEW_TEMPLATE: any = {
  resourceType: 'PasswordGenerator', subType: 'password-generator', label: 'Password Generator',
  icon: 'key', idField: 'id',
  groups: [{
    name: 'Result',
    fields: [
      { type: 'single', key: 'label', label: 'Label', value: 'result.label', mono: false },
      { type: 'single', key: 'passwordLength', label: 'Password Length', value: 'result.passwordLength' },
      { type: 'single', key: 'strength', label: 'Strength', value: 'result.strength', mono: false },
      { type: 'single', key: 'includesSymbols', label: 'Includes Symbols', value: 'result.includesSymbols', mono: false },
      { type: 'single', key: 'generatedAt', label: 'Generated At', value: 'result.generatedAt' },
    ],
  }],
};

// Detail view mirroring the platform resource pattern: view-header-card with an avatar-badge title and a
// Spec/Result toggle, then @switch on activePanel, then a subStatus footer.
//
// Worker mode has no provisioning ticket, so there is no "Track Provisioning Status" button and no
// "View Provisioning Ticket" action — that UI would be dead.
//
// CommonLibComponentsModule re-exports CommonModule (the date pipe) along with the view shell components,
// so it is the only platform import this template needs.
@Component({
  selector: 'pwgen-view',
  imports: [CommonLibComponentsModule, ResultTemplateModule, StatusBadgeComponent],
  styles: [`
    .secret-row { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
    .secret-value { font-family: var(--bs-font-monospace, monospace); letter-spacing: .04em; word-break: break-all; }
  `],
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

        <sidecard featherIcon="activity">
          <h6 class="card-subtitle text-muted">Status</h6>
          <h4 class="card-title"><app-status-badge [status]="it.status"></app-status-badge></h4>
        </sidecard>
        <sidecard featherIcon="shield">
          <h6 class="card-subtitle text-muted">Strength</h6>
          <h4 class="card-title">{{ it.result?.strength ?? '—' }}</h4>
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
                  <div class="col-md-4"><strong>Label:</strong> {{ it.spec?.label ?? '—' }}</div>
                  <div class="col-md-4"><strong>Length:</strong> {{ it.spec?.length ?? 16 }}</div>
                  <div class="col-md-4">
                    <strong>Include Symbols:</strong> {{ (it.spec?.includeSymbols ?? true) ? 'Yes' : 'No' }}
                  </div>
                </div>
              </div>
            }
            @case ('result') {
              <app-resource-template-view [template]="viewTemplate()" [data]="it"></app-resource-template-view>

              @if (it.result?.password) {
                <div class="p-1 pt-0">
                  <div class="tile-label text-muted font-small-3 mb-25">Generated Password</div>
                  <div class="secret-row">
                    <span class="secret-value">{{ revealed() ? it.result?.password : masked(it.result?.password) }}</span>
                    <button class="btn btn-sm btn-outline-secondary" (click)="revealed.set(!revealed())">
                      <i [attr.data-feather]="revealed() ? 'eye-off' : 'eye'" class="mr-50"></i>
                      {{ revealed() ? 'Hide' : 'Reveal' }}
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" (click)="copy(it.result?.password)">
                      <i data-feather="copy" class="mr-50"></i>{{ copied() ? 'Copied' : 'Copy' }}
                    </button>
                  </div>
                </div>
              }
            }
          }

          @if (it.subStatus) {
            <div class="d-flex justify-content-end align-items-center px-1 pb-1 pt-50">
              <span class="font-small-3 text-muted text-truncate" style="max-width:60%"
                    [title]="it.subStatus">{{ it.subStatus }}</span>
            </div>
          }
        </section>
      </view-with-sidecards>
    } @else {
      <div class="text-muted p-2">Loading…</div>
    }
  `,
})
export class ViewPasswordGeneratorComponent implements OnInit {
  private readonly svc = inject(PasswordGeneratorService);
  private readonly route = inject(ActivatedRoute);

  protected readonly item = signal<PasswordGenerator | undefined>(undefined);
  protected readonly viewTemplate = signal<any>(null);
  protected readonly activePanel = signal<'spec' | 'result'>('spec');
  /** The password stays masked until the user asks for it. */
  protected readonly revealed = signal(false);
  protected readonly copied = signal(false);
  protected readonly panelFilters = [
    new FlatStatusFilter({ name: 'spec', label: 'Spec' }),
    new FlatStatusFilter({ name: 'result', label: 'Result' }),
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.svc.get(id).subscribe(i => {
      this.item.set(i);
      this.activePanel.set(i?.result?.strength ? 'result' : 'spec');
    });
    this.svc.getViewTemplate().subscribe(t => this.viewTemplate.set(t || PWGEN_VIEW_TEMPLATE));
  }

  /** Dot mask sized to the real password so its length isn't hidden but its content is. */
  protected masked(pw?: string): string {
    return '•'.repeat(pw?.length ?? 0);
  }

  protected copy(pw?: string): void {
    if (!pw) {
      return;
    }
    navigator.clipboard?.writeText(pw).then(
      () => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      },
      () => this.copied.set(false),
    );
  }
}
