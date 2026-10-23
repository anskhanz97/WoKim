import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'command_receipts' })
export class CommandReceiptEntity {
  @PrimaryColumn({ name: 'command_key', type: 'char', length: 36 })
  commandKey!: string;
  @Column({ type: 'varchar', length: 80 }) operation!: string;
  @Column({ name: 'request_hash', type: 'binary', length: 32 })
  requestHash!: Buffer;
  @Column({ name: 'result_status', type: 'smallint', unsigned: true })
  resultStatus!: number;
  @Column({ type: 'json' }) result!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
  @Column({ name: 'expires_at', type: 'datetime', precision: 3 })
  expiresAt!: Date;
}
