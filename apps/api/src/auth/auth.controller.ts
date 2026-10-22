import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentSession } from './current-session.decorator';
import { AuthService } from './auth.service';
import { authCookieNames, privateCookieOptions } from './cookie-options';
import { CsrfService } from './csrf.service';
import { LoginDto } from './dto/login.dto';
import { LoginThrottleService } from './login-throttle.service';
import { Public } from './public.decorator';
import type { SessionEntity } from '../database/entities/session.entity';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly csrf: CsrfService,
    private readonly throttle: LoginThrottleService,
  ) {}

  @Public()
  @Get('csrf')
  @ApiOperation({ summary: 'Issue a CSRF token for the browser session' })
  issueCsrf(@Res({ passthrough: true }) response: Response) {
    const issued = this.csrf.issue();
    response.cookie(
      authCookieNames().csrf,
      issued.cookieValue,
      privateCookieOptions(),
    );
    return { data: { token: issued.token } };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() input: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const throttleKey = `${request.ip}:${input.email.trim().toLowerCase()}`;
    this.throttle.consume(throttleKey);
    const result = await this.auth.login(
      input.email,
      input.password,
      input.deviceLabel,
    );
    this.throttle.clear(throttleKey);
    response.cookie(authCookieNames().session, result.secret, {
      ...privateCookieOptions(),
      expires: result.session.expiresAt,
    });
    return { data: { authenticated: true } };
  }

  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth()
  async logout(
    @CurrentSession() session: SessionEntity,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(session.id);
    response.clearCookie(authCookieNames().session, privateCookieOptions());
    response.clearCookie(authCookieNames().csrf, privateCookieOptions());
  }
}
