import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './auth.types';
import { AuthService } from './auth.service';
import { authCookieNames } from './cookie-options';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const secret = cookies?.[authCookieNames().session];
    const authenticated =
      typeof secret === 'string' ? await this.auth.authenticate(secret) : null;
    if (!authenticated) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'Sign in to continue.',
      });
    }
    request.owner = authenticated.owner;
    request.ownerSession = authenticated.session;
    return true;
  }
}
