import { IsNotEmpty, IsString, Min, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GuestCartItemDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty()
  @Min(1)
  quantity: number;
}

export class GuestCartDto {
  @ApiProperty({ type: [GuestCartItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestCartItemDto)
  items: GuestCartItemDto[];
}
