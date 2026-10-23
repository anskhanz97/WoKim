import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TodayQueryDto {
  @ApiPropertyOptional({ example: '2026-10-22' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class FocusStartDto {
  @ApiProperty() @IsUUID() taskId!: string;
  @ApiProperty() @IsInt() @Min(0) expectedFocusVersion!: number;
}

export class FocusSwitchDto {
  @ApiProperty() @IsUUID() targetTaskId!: string;
  @ApiProperty() @IsInt() @Min(0) expectedFocusVersion!: number;
  @ApiPropertyOptional({ maxLength: 100000 })
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  checkpoint?: string;
  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  nextAction?: string;
}

export class FocusPauseDto {
  @ApiProperty({ enum: ['pause', 'wait'] }) @IsIn(['pause', 'wait']) reason!:
    'pause' | 'wait';
  @ApiProperty() @IsInt() @Min(0) expectedFocusVersion!: number;
  @ApiPropertyOptional({ maxLength: 100000 })
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  checkpoint?: string;
  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  nextAction?: string;
}

export class FocusFinishDto {
  @ApiProperty({ enum: ['done', 'cancel'] }) @IsIn(['done', 'cancel']) action!:
    'done' | 'cancel';
  @ApiProperty() @IsInt() @Min(0) expectedFocusVersion!: number;
  @ApiPropertyOptional({ maxLength: 100000 })
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  checkpoint?: string;
}

export class CheckInItemDto {
  @ApiProperty({ enum: ['current', 'paused', 'due', 'waiting'] })
  @IsIn(['current', 'paused', 'due', 'waiting'])
  section!: 'current' | 'paused' | 'due' | 'waiting';
  @ApiPropertyOptional() @IsOptional() @IsUUID() taskId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() followUpId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
}

export class SaveCheckInDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number | null;
  @ApiProperty({ maxLength: 64 }) @IsString() @MaxLength(64) timezone!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  intendedOutcome?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  interruptionNotes?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  deadlineNotes?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  waitingNotes?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  reflection?: string | null;
  @ApiProperty({ type: [CheckInItemDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CheckInItemDto)
  items!: CheckInItemDto[];
}
