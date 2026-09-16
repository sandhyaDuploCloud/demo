import { Injectable, Inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export const REMOTE_DuploHttpClient = 'REMOTE_DuploHttpClient';
export const REMOTE_UserSession = 'REMOTE_UserSession';

const ORIGIN_TYPE = 'AppServiceLite';
const SUB_TYPE = 'app-service-lite';
const REST_SEGMENT = 'extensions/appservicelites';

export interface EnvVar { name: string; value: string; }

// Mirrors AppSvcSpec on the backend.
export interface AppSvcSpec {
  image: string;
  platform: string;
  replicas: number;
  port: number;
  replicationStrategy: string;
  hpaMinReplicas?: number | null;
  hpaMaxReplicas?: number | null;
  hpaTargetCpu?: number | null;
  env: EnvVar[];
  command: string;
  volumeMounts: string;
  enableLb: boolean;
  lbType?: string | null;
  lbListenerPort?: number | null;
  healthCheckPath?: string | null;
}

export interface AppService {
  id: string;
  name: string;
  status: string;
  subStatus?: string;
  createdAt?: string;
  spec?: Partial<AppSvcSpec>;
  result?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class AppSvcService {
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

  list(): Observable<AppService[]> {
    return this.http.get(this.base()).pipe(map((r: any) => {
      const d = this.unwrap(r);
      return (d?.items ?? d ?? []) as AppService[];
    }));
  }

  get(id: string): Observable<AppService> {
    return this.http.get(`${this.base()}/${id}`).pipe(map((r: any) => this.unwrap(r)));
  }

  create(name: string, spec: AppSvcSpec): Observable<AppService> {
    return this.http.post(this.base(), { name, spec }).pipe(map((r: any) => this.unwrap(r)));
  }

  getViewTemplate(type: string = ORIGIN_TYPE, subType: string = SUB_TYPE): Observable<any | null> {
    const q = `type=${encodeURIComponent(type)}&subType=${encodeURIComponent(subType)}`;
    return this.http.get(`${this.base()}/view-template?${q}`).pipe(
      map((r: any) => this.unwrap(r) ?? null),
      catchError(() => of(null)),
    );
  }
}
