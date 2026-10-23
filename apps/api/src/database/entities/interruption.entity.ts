import { CreateDateColumn, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'interruptions' })
export class InterruptionEntity {
  @PrimaryColumn({ type: 'char', length: 36, collation: 'ascii_bin' })
  id!: string;
  @Column({
    name: 'from_focus_session_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
  })
  fromFocusSessionId!: string;
  @Column({
    name: 'to_focus_session_id',
    type: 'char',
    length: 36,
    collation: 'ascii_bin',
  })
  toFocusSessionId!: string;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
}
