import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { ShiprocketService } from './shiprocket.service';

@Module({
  providers: [ShippingService, ShiprocketService],
  controllers: [ShippingController],
  exports: [ShippingService, ShiprocketService],
})
export class ShippingModule {}
