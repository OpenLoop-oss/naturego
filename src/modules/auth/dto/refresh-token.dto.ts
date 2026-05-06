import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiPropertyOptional({ description: 'Refresh token (optional, can also be sent via cookie)' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
