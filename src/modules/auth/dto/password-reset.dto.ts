import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'abc123token', description: 'Reset token from email' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'newPassword123', description: 'New password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
