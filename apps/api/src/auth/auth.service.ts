import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash as hashPassword, verify as verifyPassword } from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { IsNull, LessThan, MoreThan, Repository } from 'typeorm';
import { environment } from '../config/environment';
import { SessionEntity } from '../database/entities/session.entity';
import { UserEntity } from '../database/entities/user.entity';
import type { SessionResult } from './auth.types';

const DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly settings = environment().auth;

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(SessionEntity)
    private readonly sessions: Repository<SessionEntity>,
  ) {}

  async login(
    email: string,
    password: string,
    deviceLabel?: string,
  ): Promise<SessionResult> {
    const owner = await this.users
      .createQueryBuilder('owner')
      .addSelect('owner.passwordHash')
      .where('LOWER(owner.email) = LOWER(:email)', { email: email.trim() })
      .getOne();

    if (!owner || !(await verifyPassword(owner.passwordHash, password))) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
      });
    }
    return this.createSession(owner.id, deviceLabel);
  }

  async authenticate(
    secret: string,
  ): Promise<{ owner: UserEntity; session: SessionEntity } | null> {
    const tokenHash = this.hashSecret(secret);
    const session = await this.sessions
      .createQueryBuilder('session')
      .addSelect('session.tokenHash')
      .where('session.tokenHash = :tokenHash', { tokenHash })
      .getOne();
    if (!session || session.revokedAt) return null;

    const now = new Date();
    const idleExpiry =
      session.lastSeenAt.getTime() + this.settings.idleDays * DAY;
    if (session.expiresAt <= now || idleExpiry <= now.getTime()) return null;

    if (now.getTime() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
      session.lastSeenAt = now;
      await this.sessions.save(session);
    }
    const owner = await this.users.findOneBy({ id: session.userId });
    return owner ? { owner, session } : null;
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessions.update({ id: sessionId }, { revokedAt: new Date() });
  }

  async listSessions(userId: number): Promise<SessionEntity[]> {
    return this.sessions.find({
      where: { userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { lastSeenAt: 'DESC', id: 'ASC' },
    });
  }

  async revokeSession(userId: number, sessionId: string): Promise<void> {
    await this.sessions.update(
      { id: sessionId, userId },
      { revokedAt: new Date() },
    );
  }

  async changePassword(
    ownerId: number,
    currentPassword: string,
    newPassword: string,
    currentSessionId: string,
    deviceLabel?: string | null,
  ): Promise<SessionResult> {
    const owner = await this.users
      .createQueryBuilder('owner')
      .addSelect('owner.passwordHash')
      .where('owner.id = :ownerId', { ownerId })
      .getOneOrFail();
    if (!(await verifyPassword(owner.passwordHash, currentPassword))) {
      throw new UnauthorizedException({
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Current password is incorrect.',
      });
    }

    owner.passwordHash = await hashPassword(newPassword);
    owner.passwordChangedAt = new Date();
    await this.users.manager.transaction(async (manager) => {
      await manager.getRepository(UserEntity).save(owner);
      await manager
        .getRepository(SessionEntity)
        .update({ userId: ownerId }, { revokedAt: new Date() });
    });
    const replacement = await this.createSession(
      ownerId,
      deviceLabel ?? undefined,
    );
    if (replacement.session.id === currentSessionId)
      throw new Error('Session rotation failed');
    return replacement;
  }

  async cleanupExpired(): Promise<void> {
    await this.sessions.delete({ expiresAt: LessThan(new Date()) });
  }

  private async createSession(
    userId: number,
    deviceLabel?: string,
  ): Promise<SessionResult> {
    const secret = randomBytes(32).toString('base64url');
    const now = new Date();
    const session = this.sessions.create({
      id: randomUUID(),
      userId,
      tokenHash: this.hashSecret(secret),
      createdAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + this.settings.absoluteDays * DAY),
      revokedAt: null,
      deviceLabel: deviceLabel?.trim() || null,
    });
    await this.sessions.save(session);
    return { session, secret };
  }

  private hashSecret(secret: string): Buffer {
    return createHash('sha256').update(secret).digest();
  }
}
