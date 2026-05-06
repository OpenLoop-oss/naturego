import { IsOptional, IsUUID } from 'class-validator';

export class CheckoutDto {
  @IsOptional()
  @IsUUID()
  addressId?: string;
}
