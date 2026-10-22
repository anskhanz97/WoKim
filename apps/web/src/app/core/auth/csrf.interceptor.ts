import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export const csrfInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).csrfToken();
  if (!token || SAFE.has(request.method) || !request.url.startsWith('/api/')) return next(request);
  return next(request.clone({ setHeaders: { 'X-CSRF-Token': token } }));
};
