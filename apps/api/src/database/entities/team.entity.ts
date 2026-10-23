import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity({ name: 'teams' })
export class TeamEntity {
  @PrimaryColumn({ type: 'char', length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({
    name: 'archived_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
  })
  archivedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt!: Date;
  @VersionColumn({ type: 'int', unsigned: true, default: 1 }) version!: number;
}
