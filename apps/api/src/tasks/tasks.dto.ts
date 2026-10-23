import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  taskPriorities,
  taskStatuses,
  taskTypes,
} from '../database/entities/task.entity';
import { ListQueryDto } from '../common/pagination';

export class TaskQueryDto extends ListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional({ enum: taskStatuses })
  @IsOptional()
  @IsIn(taskStatuses)
  status?: (typeof taskStatuses)[number];
  @ApiPropertyOptional({ enum: taskTypes })
  @IsOptional()
  @IsIn(taskTypes)
  type?: (typeof taskTypes)[number];
  @ApiPropertyOptional({ enum: taskPriorities })
  @IsOptional()
  @IsIn(taskPriorities)
  priority?: (typeof taskPriorities)[number];
  @ApiPropertyOptional() @IsOptional() @IsUUID() personId?: string;
  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsDateString()
  dueFrom?: string;
  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsDateString()
  dueTo?: string;
}

export class HistoryQueryDto extends ListQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
}

export class TaskLinkDto {
  @ApiProperty({ maxLength: 24 }) @IsString() @Length(1, 24) kind!: string;
  @ApiProperty({ maxLength: 240 }) @IsString() @Length(1, 240) label!: string;
  @ApiProperty({ maxLength: 2048 })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  url!: string;
}

export class DeadlineDto {
  @ApiProperty({ enum: ['hard', 'target'] }) @IsIn(['hard', 'target']) kind!:
    'hard' | 'target';
  @ApiPropertyOptional({ example: '2026-10-30' })
  @IsOptional()
  @IsString()
  date?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() at?: string;
  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}

export class CreateTaskDto {
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiProperty({ maxLength: 240 }) @IsString() @Length(1, 240) title!: string;
  @ApiPropertyOptional({ maxLength: 100000 })
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  description?: string;
  @ApiProperty({ enum: taskTypes })
  @IsIn(taskTypes)
  type!: (typeof taskTypes)[number];
  @ApiPropertyOptional({ enum: taskPriorities, default: 'normal' })
  @IsOptional()
  @IsIn(taskPriorities)
  priority?: (typeof taskPriorities)[number];
  @ApiPropertyOptional() @IsOptional() @IsUUID() requestedByPersonId?: string;
  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  nextAction?: string;
  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  branchName?: string;
  @ApiPropertyOptional({ type: [TaskLinkDto], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TaskLinkDto)
  links?: TaskLinkDto[];
  @ApiPropertyOptional({ type: DeadlineDto, nullable: true })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DeadlineDto)
  deadline?: DeadlineDto | null;
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional()
  @IsString()
  @Length(1, 240)
  title?: string;
  @ApiPropertyOptional({ maxLength: 100000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  description?: string | null;
  @ApiPropertyOptional({ enum: taskTypes })
  @IsOptional()
  @IsIn(taskTypes)
  type?: (typeof taskTypes)[number];
  @ApiPropertyOptional({ enum: taskPriorities })
  @IsOptional()
  @IsIn(taskPriorities)
  priority?: (typeof taskPriorities)[number];
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  requestedByPersonId?: string | null;
  @ApiPropertyOptional({ maxLength: 10000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  nextAction?: string | null;
  @ApiPropertyOptional({ maxLength: 240, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  branchName?: string | null;
  @ApiPropertyOptional({ type: [TaskLinkDto], maxItems: 20, nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TaskLinkDto)
  links?: TaskLinkDto[] | null;
  @ApiPropertyOptional({ type: DeadlineDto, nullable: true })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DeadlineDto)
  deadline?: DeadlineDto | null;
}

export class ConvertEntryToTaskDto extends CreateTaskDto {
  @ApiProperty() @IsInt() expectedEntryVersion!: number;
}

export class TaskTransitionDto {
  @ApiProperty({ enum: ['ready', 'wait', 'done', 'cancel', 'reopen'] })
  @IsIn(['ready', 'wait', 'done', 'cancel', 'reopen'])
  action!: 'ready' | 'wait' | 'done' | 'cancel' | 'reopen';
}

export class SupersessionDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  olderEntryIds!: string[];
  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  reason?: string;
}
