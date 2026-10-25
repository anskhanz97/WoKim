import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideEye, LucideEyeOff } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import type { ApiError } from '../../core/auth/auth.models';

@Component({
  imports: [ReactiveFormsModule, LucideEye, LucideEyeOff],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly passwordVisible = signal(false);
  readonly form;

  constructor(
    formBuilder: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    this.form = formBuilder.nonNullable.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(200)]],
      rememberMe: [false],
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    try {
      const value = this.form.getRawValue();
      await this.auth.login(value.email, value.password, value.rememberMe);
      await this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') || '/today');
    } catch (error) {
      const apiError = error as ApiError;
      this.error.set(apiError.error?.error?.message || 'WoKim could not sign you in. Check your details and try again.');
    } finally {
      this.submitting.set(false);
    }
  }
}
