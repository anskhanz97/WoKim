import { DatePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import type { ApiError, OwnerSession } from '../../core/auth/auth.models';

@Component({ imports: [ReactiveFormsModule, DatePipe], templateUrl: './profile.component.html', styleUrl: './profile.component.scss' })
export class ProfileComponent implements OnInit {
  readonly sessions = signal<OwnerSession[]>([]);
  readonly message = signal(''); readonly error = signal(''); readonly saving = signal(false);
  readonly profileForm; readonly passwordForm;
  constructor(formBuilder: FormBuilder, readonly auth: AuthService, private readonly router: Router) {
    const owner = auth.owner();
    this.profileForm = formBuilder.nonNullable.group({
      displayName: [owner?.displayName ?? '', [Validators.required, Validators.maxLength(120)]],
      timezone: [owner?.timezone ?? 'UTC', [Validators.required, Validators.maxLength(64)]],
    });
    this.passwordForm = formBuilder.nonNullable.group({
      currentPassword: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(200)]],
      newPassword: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(200)]],
    });
  }
  async ngOnInit(): Promise<void> { await this.refreshSessions(); }
  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) return this.profileForm.markAllAsTouched();
    await this.run(async () => { const value = this.profileForm.getRawValue(); await this.auth.updateProfile(value.displayName, value.timezone); this.message.set('Profile saved.'); });
  }
  async changePassword(): Promise<void> {
    if (this.passwordForm.invalid) return this.passwordForm.markAllAsTouched();
    await this.run(async () => { const value = this.passwordForm.getRawValue(); await this.auth.changePassword(value.currentPassword, value.newPassword); this.passwordForm.reset(); await this.refreshSessions(); this.message.set('Password changed. Other sessions were signed out.'); });
  }
  async revoke(session: OwnerSession): Promise<void> {
    await this.run(async () => {
      if (session.current) {
        await this.auth.logout();
        await this.router.navigateByUrl('/login');
        return;
      }
      await this.auth.revokeSession(session.id);
      await this.refreshSessions();
      this.message.set('Session revoked.');
    });
  }
  private async refreshSessions(): Promise<void> { this.sessions.set(await this.auth.sessions()); }
  private async run(action: () => Promise<void>): Promise<void> {
    this.saving.set(true); this.error.set(''); this.message.set('');
    try { await action(); } catch (error) { const apiError = error as ApiError; this.error.set(apiError.error?.error?.message || 'This change could not be saved. Reload and try again.'); } finally { this.saving.set(false); }
  }
}
