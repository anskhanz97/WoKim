import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvidenceSetEntity } from '../database/entities/evidence-set.entity';
import { FollowUpEntity } from '../database/entities/follow-up.entity';
import { FollowUpsController } from './follow-ups.controller';
import { FollowUpsService } from './follow-ups.service';

@Module({
  imports: [TypeOrmModule.forFeature([FollowUpEntity, EvidenceSetEntity])],
  controllers: [FollowUpsController],
  providers: [FollowUpsService],
})
export class FollowUpsModule {}
