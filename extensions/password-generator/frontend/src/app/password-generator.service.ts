import { Injectable, Inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export const REMOTE_DuploHttpClient = 'REMOTE_DuploHttpClient';
export const REMOTE_UserSession = 'REMOTE_UserSession';

const ORIGIN_TYPE = 'PasswordGenerator';
const SUB_TYPE = 'password-generator';
const REST_SEGMENT = 'extensions/password-generators';

export interface PasswordGeneratorSpec {
  label?: string;
  length?: number;
  includeSymbols?: boolean;
}

export interface PasswordGeneratorResult {
  label?: string;
  password?: string;
  passwordLength?: number;
  strength?: string;
  includesSymbols?: boolean;
  generatedAt?: string;
}

export interface PasswordGenerator {
  id: string;
  name: string;
  status: string;
  subStatus?: string;
  createdAt?: string;
  spec?: PasswordGeneratorSpec;
  result?: PasswordGeneratorResult;
}

@Injectable({ providedIn: 'root' })
export class PasswordGeneratorService {
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

  list(): Observable<PasswordGenerator[]> {
    return this.http.get(this.base()).pipe(map((r: any) => {
      const d = this.unwrap(r);
      return (d?.items ?? d ?? []) as PasswordGenerator[];
    }));
  }

  get(id: string): Observable<PasswordGenerator> {
    return this.http.get(`${this.base()}/${id}`).pipe(map((r: any) => this.unwrap(r)));
  }

  create(name: string, spec: PasswordGeneratorSpec): Observable<PasswordGenerator> {
    const body = { name, spec };
    return this.http.post(this.base(), body).pipe(map((r: any) => this.unwrap(r)));
  }

  getViewTemplate(type: string = ORIGIN_TYPE, subType: string = SUB_TYPE): Observable<any | null> {
    const q = `type=${encodeURIComponent(type)}&subType=${encodeURIComponent(subType)}`;
    return this.http.get(`${this.base()}/view-template?${q}`).pipe(
      map((r: any) => this.unwrap(r) ?? null),
      catchError(() => of(null)),
    );
  }
}
