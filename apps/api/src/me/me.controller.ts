import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from '../auth/auth.service';
import {
  authCookieNames,
  privateCookieOptions,
  sessionCookieOptions,
} from '../auth/cookie-options';
import { CurrentOwner } from '../auth/current-owner.decorator';
import { CurrentSession } from '../auth/current-session.decorator';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import { entityTag, parseIfMatch } from '../common/http-version';
import { ListQueryDto, paginate } from '../common/pagination';
import type { SessionEntity } from '../database/entities/session.entity';
import type { UserEntity } from '../database/entities/user.entity';
import { MeService } from './me.service';

const ownerView = (owner: UserEntity) => ({
  id: owner.id,
  email: owner.email,
  displayName: owner.displayName,
  timezone: owner.timezone,
  version: owner.version,
});

const sessionView = (session: SessionEntity, currentId: string) => ({
  id: session.id,
  deviceLabel: session.deviceLabel,
  createdAt: session.createdAt,
  lastSeenAt: session.lastSeenAt,
  expiresAt: session.expiresAt,
  revokedAt: session.revokedAt,
  current: session.id === currentId,
});

@ApiTags('owner')
@ApiCookieAuth()
@Controller('me')
export class MeController {
  constructor(
    private readonly me: MeService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Read the current owner profile' })
  getProfile(
    @CurrentOwner() owner: UserEntity,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('ETag', entityTag(owner.version));
    return { data: ownerView(owner) };
  }

  @Patch()
  async updateProfile(
    @CurrentOwner() owner: UserEntity,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() input: UpdateProfileDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const updated = await this.me.update(
      owner.id,
      parseIfMatch(ifMatch),
      input,
    );
    response.setHeader('ETag', entityTag(updated.version));
    return { data: ownerView(updated) };
  }

  @Post('password')
  async changePassword(
    @CurrentOwner() owner: UserEntity,
    @CurrentSession() session: SessionEntity,
    @Body() input: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const replacement = await this.auth.changePassword(
      owner.id,
      input.currentPassword,
      input.newPassword,
      session.id,
      session.deviceLabel,
      session.rememberMe,
    );
    response.cookie(
      authCookieNames().session,
      replacement.secret,
      sessionCookieOptions(
        replacement.session.rememberMe
          ? replacement.session.expiresAt
          : undefined,
      ),
    );
    return { data: { changed: true } };
  }

  @Get('sessions')
  async listSessions(
    @CurrentOwner() owner: UserEntity,
    @CurrentSession() current: SessionEntity,
    @Query() query: ListQueryDto,
  ) {
    const sessions = await this.auth.listSessions(owner.id);
    return paginate(
      sessions.map((session) => sessionView(session, current.id)),
      query,
    );
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async revokeSession(
    @CurrentOwner() owner: UserEntity,
    @CurrentSession() current: SessionEntity,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.revokeSession(owner.id, id);
    if (current.id === id)
      response.clearCookie(authCookieNames().session, privateCookieOptions());
  }
}
