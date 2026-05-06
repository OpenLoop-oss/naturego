import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GuestCartItemDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty()
  @Min(1)
  quantity: number;
}

export class GuestAddressDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  addressLine1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  postalCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;
}

export class GuestCheckoutDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ type: [GuestCartItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestCartItemDto)
  items: GuestCartItemDto[];

  @ApiProperty({ type: GuestAddressDto })
  @ValidateNested()
  @Type(() => GuestAddressDto)
  address: GuestAddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerNotes?: string;
}
