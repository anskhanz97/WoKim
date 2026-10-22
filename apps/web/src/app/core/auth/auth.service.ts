import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Owner, OwnerSession } from './auth.models';

interface DataResponse<T> {
  data: T;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly ownerState = signal<Owner | null>(null);
  private readonly csrfState = signal<string | null>(null);
  private profileEtag: string | null = null;

  readonly owner = this.ownerState.asReadonly();
  readonly authenticated = computed(() => this.ownerState() !== null);
  readonly csrfToken = this.csrfState.asReadonly();

  constructor(private readonly http: HttpClient) {}

  async restore(): Promise<boolean> {
    if (this.ownerState()) return true;
    try {
      await this.loadProfile();
      return true;
    } catch {
      this.ownerState.set(null);
      return false;
    }
  }

  async login(email: string, password: string): Promise<void> {
    await this.issueCsrf();
    await firstValueFrom(
      this.http.post('/api/v1/auth/login', { email, password, deviceLabel: this.deviceLabel() }, { withCredentials: true }),
    );
    await this.loadProfile();
  }

  async logout(): Promise<void> {
    await this.ensureCsrf();
    await firstValueFrom(this.http.post('/api/v1/auth/logout', {}, { withCredentials: true }));
    this.ownerState.set(null);
    this.csrfState.set(null);
    this.profileEtag = null;
  }

  async loadProfile(): Promise<Owner> {
    const response = await firstValueFrom(
      this.http.get<DataResponse<Owner>>('/api/v1/me', { observe: 'response', withCredentials: true }),
    );
    this.profileEtag = response.headers.get('etag');
    this.ownerState.set(response.body!.data);
    return response.body!.data;
  }

  async updateProfile(displayName: string, timezone: string): Promise<Owner> {
    await this.ensureCsrf();
    const response = await firstValueFrom(
      this.http.patch<DataResponse<Owner>>(
        '/api/v1/me',
        { displayName, timezone },
        { observe: 'response', headers: { 'If-Match': this.profileEtag ?? '' }, withCredentials: true },
      ),
    );
    this.profileEtag = response.headers.get('etag');
    this.ownerState.set(response.body!.data);
    return response.body!.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.ensureCsrf();
    await firstValueFrom(
      this.http.post('/api/v1/me/password', { currentPassword, newPassword }, { withCredentials: true }),
    );
    await this.issueCsrf();
  }

  async sessions(): Promise<OwnerSession[]> {
    const response = await firstValueFrom(
      this.http.get<DataResponse<OwnerSession[]>>('/api/v1/me/sessions', { withCredentials: true }),
    );
    return response.data;
  }

  async revokeSession(id: string): Promise<void> {
    await this.ensureCsrf();
    await firstValueFrom(this.http.delete(`/api/v1/me/sessions/${encodeURIComponent(id)}`, { withCredentials: true }));
  }

  async ensureCsrf(): Promise<string> {
    return this.csrfState() ?? this.issueCsrf();
  }

  private async issueCsrf(): Promise<string> {
    const response = await firstValueFrom(
      this.http.get<DataResponse<{ token: string }>>('/api/v1/auth/csrf', { withCredentials: true }),
    );
    this.csrfState.set(response.data.token);
    return response.data.token;
  }

  private deviceLabel(): string {
    const platform = navigator.platform || 'Browser';
    const browser = navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/)?.[1] ?? 'Web';
    return `${platform} · ${browser}`;
  }
}
