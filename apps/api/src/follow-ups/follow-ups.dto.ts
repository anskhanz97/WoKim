import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ListQueryDto } from '../common/pagination';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class FollowUpQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: ['waiting', 'answered', 'cancelled'] })
  @IsOptional()
  @IsIn(['waiting', 'answered', 'cancelled'])
  status?: 'waiting' | 'answered' | 'cancelled';
  @ApiPropertyOptional() @IsOptional() @IsUUID() personId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() taskId?: string;
}

export class EvidenceSetQueryDto extends ListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() taskId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
}

export class CreateFollowUpDto {
  @ApiProperty({ maxLength: 100000 })
  @IsString()
  @Length(1, 100000)
  question!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() taskId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() personId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() sourceEntryId?: string;
  @ApiPropertyOptional({ example: '2026-10-30' })
  @IsOptional()
  @IsDateString()
  followUpOn?: string;
}
export class UpdateFollowUpDto {
  @ApiPropertyOptional({ maxLength: 100000 })
  @IsOptional()
  @IsString()
  @Length(1, 100000)
  question?: string;
  @ApiPropertyOptional({ enum: ['waiting', 'answered', 'cancelled'] })
  @IsOptional()
  @IsIn(['waiting', 'answered', 'cancelled'])
  status?: 'waiting' | 'answered' | 'cancelled';
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  followUpOn?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  resolution?: string | null;
}
export class CreateEvidenceSetDto {
  @ApiProperty() @IsUUID() taskId!: string;
  @ApiProperty({ maxLength: 240 }) @IsString() @Length(1, 240) title!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;
}
export class UpdateEvidenceSetDto {
  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional()
  @IsString()
  @Length(1, 240)
  title?: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string | null;
}
export class EvidenceItemDto {
  @ApiProperty() @IsUUID() attachmentId!: string;
  @ApiProperty({ enum: ['before', 'after', 'reference'] })
  @IsIn(['before', 'after', 'reference'])
  side!: 'before' | 'after' | 'reference';
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  caption?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  viewportLabel?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() capturedAt?:
    string | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
export class UpdateEvidenceItemDto {
  @ApiPropertyOptional({ enum: ['before', 'after', 'reference'] })
  @IsOptional()
  @IsIn(['before', 'after', 'reference'])
  side?: 'before' | 'after' | 'reference';
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  caption?: string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  viewportLabel?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() capturedAt?:
    string | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
