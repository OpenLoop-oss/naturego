import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';

export interface CreateOrderParams {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

@Injectable()
export class PaymentService {
  private razorpay: Razorpay | null = null;

  constructor(private configService: ConfigService) {
    const keyId = this.configService.get('razorpay.keyId');
    const keySecret = this.configService.get('razorpay.keySecret');

    if (keyId && keySecret) {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    }
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    if (!this.razorpay) {
      const mockOrder = {
        id: `mock_${Date.now()}`,
        amount: params.amount * 100,
        currency: params.currency || 'INR',
        status: 'created',
      };
      console.log('📝 [DEV] Razorpay order created (mock):', mockOrder);
      return mockOrder;
    }

    try {
      const order = await this.razorpay.orders.create({
        amount: Math.round(params.amount * 100),
        currency: params.currency || 'INR',
        receipt: params.receipt,
        notes: params.notes,
      });

      return {
        id: order.id,
        amount: Number(order.amount) / 100,
        currency: order.currency,
        status: order.status,
      };
    } catch (error) {
      console.error('Razorpay order creation failed:', error);
      throw new BadRequestException('Failed to create payment order');
    }
  }

  async verifyPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): Promise<boolean> {
    const keySecret = this.configService.get('razorpay.keySecret');

    if (!keySecret) {
      console.log('📝 [DEV] Payment verification (mock):', { razorpayOrderId, razorpayPaymentId });
      return true;
    }

    try {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      return generatedSignature === razorpaySignature;
    } catch (error) {
      console.error('Payment verification failed:', error);
      return false;
    }
  }

  async getPaymentDetails(paymentId: string) {
    if (!this.razorpay) {
      return {
        id: paymentId,
        amount: 0,
        currency: 'INR',
        status: 'captured',
      };
    }

    try {
      return await this.razorpay.payments.fetch(paymentId);
    } catch (error) {
      console.error('Failed to fetch payment:', error);
      return null;
    }
  }
}
