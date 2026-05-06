import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CartModule } from '../cart/cart.module';
import { EmailModule } from '../email/email.module';
import { PaymentModule } from '../payment/payment.module';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  imports: [CartModule, EmailModule, PaymentModule, ShippingModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
