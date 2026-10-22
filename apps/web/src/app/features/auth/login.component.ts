import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import type { ApiError } from '../../core/auth/auth.models';

@Component({
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  readonly submitting = signal(false);
  readonly error = signal('');
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
      await this.auth.login(this.form.getRawValue().email, this.form.getRawValue().password);
      await this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') || '/today');
    } catch (error) {
      const apiError = error as ApiError;
      this.error.set(apiError.error?.error?.message || 'WoKim could not sign you in. Check your details and try again.');
    } finally {
      this.submitting.set(false);
    }
  }
}
