import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RequestProcessingDto {
  @ApiProperty({ enum: ['ocr', 'transcribe'] })
  @IsIn(['ocr', 'transcribe'])
  kind!: 'ocr' | 'transcribe';
  @ApiPropertyOptional({ maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  language?: string;
}

export class ReviewDerivedTextDto {
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
  @ApiProperty({ maxLength: 200000 })
  @IsString()
  @MaxLength(200000)
  text!: string;
}

export class UpdateProcessingSettingsDto {
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  transcriptionEnabled?: boolean;
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ocrLanguages?: string;
  @ApiPropertyOptional({ maxLength: 32, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  transcriptionLanguage?: string | null;
  @ApiPropertyOptional({ maxLength: 191 })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  modelId?: string;
}
