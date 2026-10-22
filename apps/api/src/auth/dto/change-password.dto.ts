import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ minLength: 12, maxLength: 200 })
  @IsString()
  @Length(12, 200)
  currentPassword!: string;

  @ApiProperty({ minLength: 12, maxLength: 200 })
  @IsString()
  @Length(12, 200)
  newPassword!: string;
}
