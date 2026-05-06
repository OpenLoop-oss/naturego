import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { Request } from 'express';
import * as crypto from 'crypto';
import { PaymentService } from './payment.service';
import { PhonepeService } from './phonepe.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles, CurrentUser } from '../../common/decorators';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

export class CreatePaymentOrderDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  receipt?: string;
}

export class VerifyPaymentDto {
  @IsString()
  razorpayOrderId: string;

  @IsString()
  razorpayPaymentId: string;

  @IsString()
  razorpaySignature: string;
}

export class CreatePhonePeOrderDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}

export enum PaymentGateway {
  RAZORPAY = 'razorpay',
  PHONEPE = 'phonepe',
  COD = 'cod',
}

export class CreateOrderDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(PaymentGateway)
  gateway?: PaymentGateway;

  @IsOptional()
  @IsString()
  receipt?: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly phonepeService: PhonepeService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook handler' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const webhookSecret = this.configService.get('razorpay.webhookSecret');
    const body = req.rawBody?.toString() || '';

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.warn('Invalid webhook signature received');
        return { success: false, message: 'Invalid signature' };
      }
    }

    try {
      const event = JSON.parse(body);
      const payload = event.payload || {};
      const orderEntity = payload.order || {};
      const paymentEntity = payload.payment || {};

      const razorpayOrderId = orderEntity.details?.rzp_order_id || orderEntity.id;
      const razorpayPaymentId = paymentEntity.id;
      const status = event.event;

      console.log(`Webhook received: ${status} for order ${razorpayOrderId}`);

      switch (status) {
        case 'payment.captured':
          await this.prisma.order.updateMany({
            where: { razorpayOrderId },
            data: {
              paymentStatus: PaymentStatus.COMPLETED,
              razorpayPaymentId,
            },
          });
          console.log(`Payment captured for order: ${razorpayOrderId}`);
          break;

        case 'payment.failed':
          await this.prisma.order.updateMany({
            where: { razorpayOrderId },
            data: {
              paymentStatus: PaymentStatus.FAILED,
            },
          });
          console.log(`Payment failed for order: ${razorpayOrderId}`);
          break;

        case 'refund.created':
          console.log(`Refund initiated for order: ${razorpayOrderId}`);
          break;

        case 'refund.processed':
          await this.prisma.order.updateMany({
            where: { razorpayOrderId },
            data: {
              paymentStatus: PaymentStatus.REFUNDED,
            },
          });
          console.log(`Refund processed for order: ${razorpayOrderId}`);
          break;

        default:
          console.log(`Unhandled webhook event: ${status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Webhook processing error:', error);
      return { success: false, message: 'Webhook processing failed' };
    }
  }

  @Post('phonepe/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PhonePe webhook handler' })
  async handlePhonePeWebhook(@Body() body: any) {
    try {
      const { merchantTransactionId, state, responseCode } = body.data || {};

      console.log(`PhonePe webhook received: ${state} for order ${merchantTransactionId}`);

      if (state === 'COMPLETED' && responseCode === 'SUCCESS') {
        await this.prisma.order.updateMany({
          where: { phonepeTransactionId: merchantTransactionId },
          data: {
            paymentStatus: PaymentStatus.COMPLETED,
          },
        });
        console.log(`PhonePe payment completed for order: ${merchantTransactionId}`);
      } else if (state === 'FAILED') {
        await this.prisma.order.updateMany({
          where: { phonepeTransactionId: merchantTransactionId },
          data: {
            paymentStatus: PaymentStatus.FAILED,
          },
        });
        console.log(`PhonePe payment failed for order: ${merchantTransactionId}`);
      }

      return { success: true };
    } catch (error) {
      console.error('PhonePe webhook error:', error);
      return { success: false };
    }
  }

  @Post('create-order')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a payment order' })
  @ApiResponse({ status: 200, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async createOrder(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    const gateway = dto.gateway || PaymentGateway.RAZORPAY;

    if (gateway === PaymentGateway.COD) {
      return {
        success: true,
        message: 'COD order created',
        data: {
          orderId: `cod_${Date.now()}`,
          amount: dto.amount,
          currency: dto.currency || 'INR',
          status: 'PENDING',
          gateway: 'COD',
        },
      };
    }

    if (gateway === PaymentGateway.PHONEPE) {
      const frontendUrl = this.configService.get('app.frontendUrl') || 'http://localhost:3001';
      const transactionId = this.phonepeService.generateTransactionId();
      const callbackUrl = dto.callbackUrl || `${frontendUrl}/api/payment/phonepe/webhook`;

      const result = await this.phonepeService.createPayment({
        merchantTransactionId: transactionId,
        amount: dto.amount,
        redirectUrl: `${frontendUrl}/order/success?gateway=phonepe&txn=${transactionId}`,
        redirectMode: 'POST',
        callbackUrl,
        merchantUserId: userId,
      });

      if (!result.success || !result.data?.instrumentResponse?.redirectInfo) {
        return {
          success: false,
          message: result.error?.description || 'Failed to create PhonePe order',
        };
      }

      return {
        success: true,
        message: 'PhonePe order created',
        data: {
          transactionId,
          amount: dto.amount,
          currency: dto.currency || 'INR',
          gateway: 'PHONEPE',
          paymentUrl: result.data.instrumentResponse.redirectInfo.url,
          method: result.data.instrumentResponse.redirectInfo.method,
        },
      };
    }

    const order = await this.paymentService.createOrder({
      amount: dto.amount,
      currency: dto.currency || 'INR',
      receipt: dto.receipt || `order_${userId}_${Date.now()}`,
      notes: {
        userId,
        gateway: 'RAZORPAY',
      },
    });

    return {
      success: true,
      message: 'Razorpay order created',
      data: {
        ...order,
        gateway: 'RAZORPAY',
      },
    };
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify payment signature' })
  @ApiResponse({ status: 200, description: 'Payment verified' })
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    const isValid = await this.paymentService.verifyPayment(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );

    return {
      success: isValid,
      message: isValid ? 'Payment verified successfully' : 'Payment verification failed',
      data: { verified: isValid },
    };
  }

  @Get('phonepe/status/:transactionId')
  @ApiOperation({ summary: 'Check PhonePe payment status' })
  async checkPhonePeStatus(@Param('transactionId') transactionId: string) {
    const result = await this.phonepeService.checkPaymentStatus(transactionId);

    return {
      success: result.success,
      data: result.data,
    };
  }

  @Get('gateways')
  @ApiOperation({ summary: 'Get available payment gateways' })
  async getPaymentGateways() {
    return {
      success: true,
      data: [
        {
          id: 'razorpay',
          name: 'Razorpay',
          enabled: true,
        },
        {
          id: 'phonepe',
          name: 'PhonePe',
          enabled: true,
        },
        {
          id: 'cod',
          name: 'Cash on Delivery',
          enabled: true,
        },
      ],
    };
  }
}
