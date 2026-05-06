import { IsInt, IsNotEmpty, IsPositive, Min, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ example: 'uuid-product-id' })
  @IsString({ message: 'Product ID must be a string' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;

  @ApiProperty({ example: 2 })
  @IsInt({ message: 'Quantity must be an integer' })
  @IsPositive({ message: 'Quantity must be positive' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;
}
