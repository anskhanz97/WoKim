import '../config/load-environment';
import { DataSource } from 'typeorm';
import { environment } from '../config/environment';
import { SessionEntity } from './entities/session.entity';
import { UserEntity } from './entities/user.entity';
import { InitialOwnerAndSessions1792638000000 } from './migrations/1792638000000-initial-owner-and-sessions';
import { PhaseTwoCaptureAndOrganization1792669000000 } from './migrations/1792669000000-phase-two-capture-and-organization';
import { PersonEntity } from './entities/person.entity';
import { TeamEntity } from './entities/team.entity';
import { ProjectEntity } from './entities/project.entity';
import { EntryEntity } from './entities/entry.entity';
import { EntryRevisionEntity } from './entities/entry-revision.entity';
import { AttachmentEntity } from './entities/attachment.entity';
import { CommandReceiptEntity } from './entities/command-receipt.entity';
import { ProcessingJobEntity } from './entities/processing-job.entity';
import { AttachmentMediaMetadata1792673000000 } from './migrations/1792673000000-attachment-media-metadata';
import { TaskEntity } from './entities/task.entity';
import { PhaseThreeTasksAndRequirements1792681000000 } from './migrations/1792681000000-phase-three-tasks-and-requirements';
import { FocusSessionEntity } from './entities/focus-session.entity';
import { InterruptionEntity } from './entities/interruption.entity';
import { DailyCheckInEntity } from './entities/daily-check-in.entity';
import { DailyCheckInItemEntity } from './entities/daily-check-in-item.entity';
import { PhaseFourFocusAndCheckIns1792690000000 } from './migrations/1792690000000-phase-four-focus-and-check-ins';
import { FollowUpEntity } from './entities/follow-up.entity';
import { EvidenceSetEntity } from './entities/evidence-set.entity';
import { EvidenceItemEntity } from './entities/evidence-item.entity';
import { PhaseFiveFollowUpsAndEvidence1792700000000 } from './migrations/1792700000000-phase-five-follow-ups-and-evidence';
import { ExportJobEntity } from './entities/export-job.entity';
import { PhaseSixExportsAndDeletionManifest1792710000000 } from './migrations/1792710000000-phase-six-exports-and-deletion-manifest';
import { DerivedTextEntity } from './entities/derived-text.entity';
import { ProcessingSettingEntity } from './entities/processing-setting.entity';
import { PhaseSevenDerivedText1792720000000 } from './migrations/1792720000000-phase-seven-derived-text';

const env = environment();

export const AppDataSource = new DataSource({
  type: env.database.type,
  host: env.database.host,
  port: env.database.port,
  username: env.database.user,
  password: env.database.password,
  database: env.database.name,
  ssl: env.database.ssl ? { rejectUnauthorized: true } : undefined,
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: ['DATE'],
  synchronize: false,
  migrationsRun: false,
  entities: [
    UserEntity,
    SessionEntity,
    PersonEntity,
    TeamEntity,
    ProjectEntity,
    EntryEntity,
    EntryRevisionEntity,
    AttachmentEntity,
    CommandReceiptEntity,
    ProcessingJobEntity,
    TaskEntity,
    FocusSessionEntity,
    InterruptionEntity,
    DailyCheckInEntity,
    DailyCheckInItemEntity,
    FollowUpEntity,
    EvidenceSetEntity,
    EvidenceItemEntity,
    ExportJobEntity,
    DerivedTextEntity,
    ProcessingSettingEntity,
  ],
  migrations: [
    InitialOwnerAndSessions1792638000000,
    PhaseTwoCaptureAndOrganization1792669000000,
    AttachmentMediaMetadata1792673000000,
    PhaseThreeTasksAndRequirements1792681000000,
    PhaseFourFocusAndCheckIns1792690000000,
    PhaseFiveFollowUpsAndEvidence1792700000000,
    PhaseSixExportsAndDeletionManifest1792710000000,
    PhaseSevenDerivedText1792720000000,
  ],
});
