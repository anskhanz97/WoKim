import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ListQueryDto } from '../common/pagination';

export const entryTypes = [
  'note',
  'instruction',
  'decision',
  'question',
  'work_update',
  'checkpoint',
  'reference',
] as const;
export const sourceKinds = ['typed', 'pasted', 'upload', 'recording'] as const;

export class EntryQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: ['unprocessed', 'organized', 'dismissed'] })
  @IsOptional()
  @IsIn(['unprocessed', 'organized', 'dismissed'])
  state?: 'unprocessed' | 'organized' | 'dismissed';
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() taskId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() personId?: string;
  @ApiPropertyOptional({ enum: entryTypes })
  @IsOptional()
  @IsIn(entryTypes)
  type?: (typeof entryTypes)[number];
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
}

export class CaptureMetadataDto {
  @ApiPropertyOptional({ maxLength: 100000 })
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  contentText?: string;
  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  title?: string;
  @ApiPropertyOptional({ enum: entryTypes, default: 'note' })
  @IsOptional()
  @IsIn(entryTypes)
  entryType?: (typeof entryTypes)[number];
  @ApiPropertyOptional({ enum: sourceKinds, default: 'typed' })
  @IsOptional()
  @IsIn(sourceKinds)
  sourceKind?: (typeof sourceKinds)[number];
  @ApiPropertyOptional({ maxLength: 2048 })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  sourceUrl?: string;
  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  sourceLabel?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() taskId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() senderPersonId?: string;
  @ApiPropertyOptional({
    enum: ['instruction', 'evidence_before', 'evidence_after', 'reference'],
  })
  @IsOptional()
  @IsIn(['instruction', 'evidence_before', 'evidence_after', 'reference'])
  attachmentPurpose?:
    'instruction' | 'evidence_before' | 'evidence_after' | 'reference';
  @ApiPropertyOptional({
    description: 'Override automatic processing for audio in this capture.',
  })
  @IsOptional()
  @IsBoolean()
  transcribeAudio?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() occurredAt?: string;
  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  occurredTimezone?: string;
}

export class UpdateEntryDto {
  @ApiPropertyOptional({ maxLength: 240, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  title?: string | null;
  @ApiPropertyOptional({ maxLength: 100000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  contentText?: string | null;
  @ApiPropertyOptional({ enum: entryTypes })
  @IsOptional()
  @IsIn(entryTypes)
  entryType?: (typeof entryTypes)[number];
  @ApiPropertyOptional({ enum: ['unprocessed', 'organized', 'dismissed'] })
  @IsOptional()
  @IsIn(['unprocessed', 'organized', 'dismissed'])
  inboxState?: 'unprocessed' | 'organized' | 'dismissed';
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  projectId?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  taskId?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  senderPersonId?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  changeReason?: string | null;
}

export class UpdateAttachmentDto {
  @ApiPropertyOptional({
    enum: ['instruction', 'evidence_before', 'evidence_after', 'reference'],
  })
  @IsOptional()
  @IsIn(['instruction', 'evidence_before', 'evidence_after', 'reference'])
  purpose?: string;
  @ApiPropertyOptional({ maxLength: 5000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  caption?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ocrEnabled?: boolean;
}
