import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'dev@example.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 12, maxLength: 200 })
  @IsString()
  @Length(12, 200)
  password!: string;

  @ApiPropertyOptional({ example: 'Firefox on laptop' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  deviceLabel?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
