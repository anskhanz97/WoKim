import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'sessions' })
export class SessionEntity {
  @PrimaryColumn({ type: 'char', length: 36, collation: 'ascii_bin' })
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'tinyint', unsigned: true })
  userId!: number;

  @Column({
    name: 'token_hash',
    type: 'binary',
    length: 32,
    unique: true,
    select: false,
  })
  tokenHash!: Buffer;

  @Column({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;

  @Column({ name: 'last_seen_at', type: 'datetime', precision: 3 })
  lastSeenAt!: Date;

  @Index()
  @Column({ name: 'expires_at', type: 'datetime', precision: 3 })
  expiresAt!: Date;

  @Column({
    name: 'revoked_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  revokedAt!: Date | null;

  @Column({
    name: 'device_label',
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  deviceLabel!: string | null;
}
