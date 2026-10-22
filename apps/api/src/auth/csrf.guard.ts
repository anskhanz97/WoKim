import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { environment } from '../config/environment';
import { authCookieNames } from './cookie-options';
import { CsrfService } from './csrf.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly csrf: CsrfService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    const origin = request.get('origin');
    if (origin && origin !== environment().publicOrigin) {
      throw new ForbiddenException({
        code: 'ORIGIN_INVALID',
        message: 'This request came from an untrusted origin.',
      });
    }

    if (
      !this.csrf.verify(
        request.get('x-csrf-token'),
        request.cookies?.[authCookieNames().csrf],
      )
    ) {
      throw new ForbiddenException({
        code: 'CSRF_INVALID',
        message: 'Refresh the page and try again.',
      });
    }
    return true;
  }
}
