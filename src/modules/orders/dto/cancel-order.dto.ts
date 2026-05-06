import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiPropertyOptional({
    description: 'Reason for cancellation or refund request',
    example: 'Changed my mind about the order',
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason?: string;
}
