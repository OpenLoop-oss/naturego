import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Home' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Apartment 4B' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  state: string;

  @ApiProperty({ example: '400001' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  postalCode: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
