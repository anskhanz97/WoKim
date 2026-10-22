import type { Request } from 'express';
import type { SessionEntity } from '../database/entities/session.entity';
import type { UserEntity } from '../database/entities/user.entity';

export interface AuthenticatedRequest extends Request {
  owner: UserEntity;
  ownerSession: SessionEntity;
}

export interface SessionResult {
  session: SessionEntity;
  secret: string;
}
