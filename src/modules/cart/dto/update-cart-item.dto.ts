import { IsInt, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({ example: 3 })
  @IsInt({ message: 'Quantity must be an integer' })
  @IsPositive({ message: 'Quantity must be positive' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;
}
