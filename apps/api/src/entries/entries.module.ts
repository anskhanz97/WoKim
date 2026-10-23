import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentEntity } from '../database/entities/attachment.entity';
import { CommandReceiptEntity } from '../database/entities/command-receipt.entity';
import { EntryRevisionEntity } from '../database/entities/entry-revision.entity';
import { EntryEntity } from '../database/entities/entry.entity';
import { ProcessingJobEntity } from '../database/entities/processing-job.entity';
import { PersonEntity } from '../database/entities/person.entity';
import { ProjectEntity } from '../database/entities/project.entity';
import { TaskEntity } from '../database/entities/task.entity';
import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EntryEntity,
      AttachmentEntity,
      EntryRevisionEntity,
      CommandReceiptEntity,
      ProcessingJobEntity,
      PersonEntity,
      ProjectEntity,
      TaskEntity,
    ]),
  ],
  controllers: [EntriesController],
  providers: [EntriesService],
})
export class EntriesModule {}
