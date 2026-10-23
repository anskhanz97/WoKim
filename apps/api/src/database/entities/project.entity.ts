import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export const projectStatuses = ['active', 'completed', 'archived'] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

@Entity({ name: 'projects' })
export class ProjectEntity {
  @PrimaryColumn({ type: 'char', length: 36 }) id!: string;
  @Column({ type: 'varchar', length: 180 }) name!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: ProjectStatus;
  @Column({ name: 'target_date', type: 'date', nullable: true }) targetDate!:
    string | null;
  @Column({
    name: 'repository_url',
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  repositoryUrl!: string | null;
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
