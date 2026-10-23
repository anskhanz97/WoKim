import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsDateString,
  IsInt,
  Max,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Length,
} from 'class-validator';
import { taskStatuses } from '../database/entities/task.entity';

export class SearchQueryDto {
  @ApiProperty({ minLength: 1, maxLength: 200 })
  @IsString()
  @Length(1, 200)
  q!: string;
  @ApiPropertyOptional({ enum: ['task', 'entry', 'person', 'team', 'derived'] })
  @IsOptional()
  @IsIn(['task', 'entry', 'person', 'team', 'derived'])
  type?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() personId?: string;
  @ApiPropertyOptional({ enum: taskStatuses })
  @IsOptional()
  @IsIn(taskStatuses)
  status?: (typeof taskStatuses)[number];
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  page?: number;
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class CreateExportDto {
  @ApiProperty({ enum: ['all', 'project'] }) @IsIn(['all', 'project']) scope!:
    'all' | 'project';
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
}
export class TrashCommandDto {
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedFocusVersion?: number;
}
export class PurgeDto {
  @ApiProperty({ example: 'PURGE' })
  @IsString()
  @MaxLength(16)
  confirm!: string;
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
}
