import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandReceiptEntity } from '../database/entities/command-receipt.entity';
import { EntryEntity } from '../database/entities/entry.entity';
import { PersonEntity } from '../database/entities/person.entity';
import { ProjectEntity } from '../database/entities/project.entity';
import { TaskEntity } from '../database/entities/task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskEntity,
      EntryEntity,
      ProjectEntity,
      PersonEntity,
      CommandReceiptEntity,
    ]),
  ],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
