import { Component, DestroyRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FilterTableUtils, SearchableDatatableComponent, SearchableDatatableModule } from '@duplocloud-internal/ng-common-lib';
import { S3BucketService, S3Bucket, REMOTE_UserSession } from '../s3-bucket.service';
import { StatusBadgeComponent } from '../shared/status-badge.component';

@Component({
  selector: 's3b-list',
  imports: [SearchableDatatableModule, StatusBadgeComponent],
  template: `
    <div class="card datatable-card">
      <searchable-datatable
        [showAdd]="true"
        addLabel="Create S3 Bucket"
        (add)="add()"
        [rows]="rows()"
        (filter)="filterUpdate()"
        columnMode="force">

        <ngx-datatable-column [width]="50" [sortable]="false" [canAutoResize]="false" cellClass="actions">
          <ng-template ngx-datatable-cell-template let-row="row">
            <div ngbDropdown container="body">
              <button class="btn btn-sm hide-arrow" ngbDropdownToggle>
                <i data-feather="more-vertical"></i>
              </button>
              <div ngbDropdownMenu>
                <a ngbDropdownItem (click)="view(row)">
                  <i data-feather="eye" class="mr-50"></i><span>View</span>
                </a>
                <a ngbDropdownItem (click)="edit(row)">
                  <i data-feather="edit" class="mr-50"></i><span>Edit</span>
                </a>
                <a ngbDropdownItem (click)="track(row)">
                  <i data-feather="activity" class="mr-50"></i><span>Track Provisioning</span>
                </a>
              </div>
            </div>
          </ng-template>
        </ngx-datatable-column>

        <ngx-datatable-column name="Name" [flexGrow]="140">
          <ng-template ngx-datatable-cell-template let-row="row">
            <a (click)="view(row)" class="text-primary font-weight-medium cursor-pointer">{{ row.name }}</a>
          </ng-template>
        </ngx-datatable-column>

        <ngx-datatable-column name="Bucket Name" [flexGrow]="180">
          <ng-template ngx-datatable-cell-template let-row="row">{{ row.spec?.bucketName || '—' }}</ng-template>
        </ngx-datatable-column>

        <ngx-datatable-column name="Region" [flexGrow]="110">
          <ng-template ngx-datatable-cell-template let-row="row">{{ row.spec?.region || 'us-east-1' }}</ng-template>
        </ngx-datatable-column>

        <ngx-datatable-column name="Public Access" [flexGrow]="110">
          <ng-template ngx-datatable-cell-template let-row="row">
            {{ row.result?.publicAccess || (row.spec?.publicAccess ? 'Enabled' : 'Blocked') }}
          </ng-template>
        </ngx-datatable-column>

        <ngx-datatable-column name="Status" [flexGrow]="110" [maxWidth]="150">
          <ng-template ngx-datatable-cell-template let-row="row">
            <app-status-badge [status]="row.status"></app-status-badge>
          </ng-template>
        </ngx-datatable-column>

      </searchable-datatable>
    </div>
  `,
})
export class ListS3BucketComponent implements OnInit {
  private readonly svc = inject(S3BucketService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject<any>(REMOTE_UserSession as any);
  private readonly destroyRef = inject(DestroyRef);

  private readonly table = viewChild(SearchableDatatableComponent);

  private readonly allRows = signal<S3Bucket[]>([]);
  private readonly filterTerm = signal('');

  private readonly searchFields = ['name', 'status', 'spec.bucketName', 'spec.region', 'result.publicAccess'];

  protected readonly rows = computed(() => {
    const term = this.filterTerm();
    const all = this.allRows();
    return term ? all.filter(r => FilterTableUtils.searchByFields(r, this.searchFields, term)) : all;
  });

  ngOnInit(): void {
    this.session.getTenantRefreshTimer(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([, tenantChanged]: [any, boolean]) => this.refresh(!!tenantChanged));
  }

  private refresh(tenantChanged: boolean): void {
    if (tenantChanged) {
      this.table()?.startLoading();
    }
    this.svc.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rows => {
        this.allRows.set(rows ?? []);
        this.table()?.refresh();
      },
      error: () => {
        this.allRows.set([]);
        this.table()?.stopLoading();
      },
    });
  }

  protected filterUpdate(): void {
    this.filterTerm.set(this.table()?.searchTerm?.toLowerCase()?.trim() ?? '');
  }

  protected add(): void {
    this.router.navigate(['add'], { relativeTo: this.route });
  }

  protected view(r: S3Bucket): void {
    this.router.navigate(['view', r.id], { relativeTo: this.route });
  }

  protected edit(r: S3Bucket): void {
    this.router.navigate(['edit', r.id], { relativeTo: this.route });
  }

  protected track(r: S3Bucket): void {
    this.svc.ticketName(r.id).subscribe(name => {
      if (!name) return;
      this.router.navigate(['/ai/service-desk', this.svc.workspaceId(), 'tickets', 'chat', name]);
    });
  }
}
