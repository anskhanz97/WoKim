import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';
import { projectStatuses } from '../database/entities/project.entity';
import { ListQueryDto } from '../common/pagination';

export class DirectoryQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  archived?: 'true' | 'false';
}

export class ProjectQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: projectStatuses })
  @IsOptional()
  @IsIn(projectStatuses)
  status?: (typeof projectStatuses)[number];
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}

export class CreatePersonDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @Length(1, 120)
  displayName!: string;
  @ApiPropertyOptional({ maxLength: 254 })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  handle?: string;
  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;
}
export class UpdatePersonDto extends PartialType(CreatePersonDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() archived?: boolean;
}
export class CreateTeamDto {
  @ApiProperty({ maxLength: 120 }) @IsString() @Length(1, 120) name!: string;
  @ApiPropertyOptional({ maxLength: 10000 })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;
}
export class UpdateTeamDto extends PartialType(CreateTeamDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() archived?: boolean;
}
export class CreateProjectDto {
  @ApiProperty({ maxLength: 180 }) @IsString() @Length(1, 180) name!: string;
  @ApiPropertyOptional({ maxLength: 20000 })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;
  @ApiPropertyOptional({ example: '2026-10-30' })
  @IsOptional()
  @IsString()
  targetDate?: string;
  @ApiPropertyOptional({ maxLength: 2048 })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  repositoryUrl?: string;
}
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
export class ProjectTransitionDto {
  @ApiProperty({ enum: ['complete', 'archive', 'reactivate', 'restore'] })
  @IsIn(['complete', 'archive', 'reactivate', 'restore'])
  action!: 'complete' | 'archive' | 'reactivate' | 'restore';
}

export class AssociationRoleDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  roleLabel?: string;
}
