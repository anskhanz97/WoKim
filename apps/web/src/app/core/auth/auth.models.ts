export interface Owner {
  id: number;
  email: string;
  displayName: string;
  timezone: string;
  version: number;
}

export interface OwnerSession {
  id: string;
  deviceLabel: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  current: boolean;
}

export interface ApiError {
  error?: { error?: { message?: string; code?: string } };
  message?: string;
}
