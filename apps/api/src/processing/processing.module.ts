import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentEntity } from '../database/entities/attachment.entity';
import { DerivedTextEntity } from '../database/entities/derived-text.entity';
import { ProcessingJobEntity } from '../database/entities/processing-job.entity';
import { ProcessingSettingEntity } from '../database/entities/processing-setting.entity';
import { ProcessingController } from './processing.controller';
import { ProcessingService } from './processing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttachmentEntity,
      DerivedTextEntity,
      ProcessingJobEntity,
      ProcessingSettingEntity,
    ]),
  ],
  controllers: [ProcessingController],
  providers: [ProcessingService],
})
export class ProcessingModule {}
