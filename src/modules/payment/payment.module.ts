import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PhonepeService } from './phonepe.service';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentController],
  providers: [PaymentService, PhonepeService],
  exports: [PaymentService, PhonepeService],
})
export class PaymentModule {}
