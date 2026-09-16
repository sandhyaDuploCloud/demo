import { Injectable, Inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// Host-provided string DI tokens (no @common-lib import). REMOTE_DuploHttpClient exposes get/post
// returning RxJS Observables; REMOTE_UserSession carries the current tenant (.tenant.TenantId).
export const REMOTE_DuploHttpClient = 'REMOTE_DuploHttpClient';
export const REMOTE_UserSession = 'REMOTE_UserSession';

// TYPED resource: the extension ships its own controller, so we call its OWN REST segment.
const ORIGIN_TYPE = 'HelmDeployment';
const SUB_TYPE = 'helm-deployment';
const REST_SEGMENT = 'extensions/helmdeployments';

// Mirrors HelmDeploySpec on the backend — the fields the 4-step wizard collects.
export interface HelmDeploySpec {
  products: string[];
  deploymentName: string;
  namespace: string;
  releaseName: string;
  timeout: string;
  autoRollback: boolean;
  chartRegistryUrl: string;
  chartName: string;
  chartVersion: string;
  serviceType: string;
  values: string;
}

export interface HelmDeployment {
  id: string;
  name: string;
  status: string;
  subStatus?: string;
  createdAt?: string;
  spec?: Partial<HelmDeploySpec>;
  result?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class HelmService {
  constructor(
    @Inject(REMOTE_DuploHttpClient) private http: any,
    @Inject(REMOTE_UserSession) private session: any,
  ) {}

  workspaceId(): string {
    return this.session?.tenant?.TenantId ?? '';
  }

  private base(): string {
    return `/v1/aiservicedesk/user/data/workspaces/${this.workspaceId()}/environment/${REST_SEGMENT}`;
  }

  private unwrap = (r: any) => (r && r.data !== undefined ? r.data : r);

  list(): Observable<HelmDeployment[]> {
    return this.http.get(this.base()).pipe(map((r: any) => {
      const d = this.unwrap(r);
      return (d?.items ?? d ?? []) as HelmDeployment[];
    }));
  }

  get(id: string): Observable<HelmDeployment> {
    return this.http.get(`${this.base()}/${id}`).pipe(map((r: any) => this.unwrap(r)));
  }

  create(name: string, spec: HelmDeploySpec): Observable<HelmDeployment> {
    return this.http.post(this.base(), { name, spec }).pipe(map((r: any) => this.unwrap(r)));
  }

  // Declarative Result view-template (inherited GET …/view-template). Null when none is registered.
  getViewTemplate(type: string = ORIGIN_TYPE, subType: string = SUB_TYPE): Observable<any | null> {
    const q = `type=${encodeURIComponent(type)}&subType=${encodeURIComponent(subType)}`;
    return this.http.get(`${this.base()}/view-template?${q}`).pipe(
      map((r: any) => this.unwrap(r) ?? null),
      catchError(() => of(null)),
    );
  }
}
