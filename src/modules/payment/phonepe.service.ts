import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface PhonePePaymentResponse {
  success: boolean;
  data?: {
    merchantTransactionId: string;
    instrumentResponse?: {
      type: string;
      redirectInfo?: {
        url: string;
        method: string;
      };
    };
  };
  error?: {
    code: string;
    description: string;
  };
}

export interface PhonePeStatusResponse {
  success: boolean;
  data?: {
    merchantId: string;
    merchantTransactionId: string;
    transactionId: string;
    state: string;
    responseCode: string;
  };
}

@Injectable()
export class PhonepeService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly clientVersion: string;

  constructor(private configService: ConfigService) {
    const environment = this.configService.get('phonepe.environment') || 'sandbox';
    this.baseUrl =
      environment === 'production'
        ? 'https://api.phonepe.com/apis/pg'
        : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
    this.clientId = this.configService.get('phonepe.clientId') || '';
    this.clientSecret = this.configService.get('phonepe.clientSecret') || '';
    this.clientVersion = this.configService.get('phonepe.clientVersion') || '';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret || !this.clientVersion) {
      console.log('📝 [DEV] PhonePe access token (mock)');
      return 'mock_token';
    }

    try {
      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('client_version', this.clientVersion);
      params.append('client_secret', this.clientSecret);
      params.append('grant_type', 'client_credentials');

      const response = await axios.post(`${this.baseUrl}/v1/oauth/token`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = (response.data.expires_at as number) * 1000 - 60000;

      console.log('✅ PhonePe authentication successful');
      return this.accessToken!;
    } catch (error) {
      console.error('❌ PhonePe authentication failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async createPayment(params: {
    merchantTransactionId: string;
    amount: number;
    redirectUrl: string;
    redirectMode: string;
    callbackUrl: string;
    merchantUserId?: string;
    mobileNumber?: string;
  }): Promise<PhonePePaymentResponse> {
    if (!this.clientId) {
      console.log('📝 [DEV] PhonePe payment created (mock):', params);
      return {
        success: true,
        data: {
          merchantTransactionId: params.merchantTransactionId,
          instrumentResponse: {
            type: 'PAYMENT_PAGE',
            redirectInfo: {
              url: `https://mock-phonepe.com/pay?txn=${params.merchantTransactionId}`,
              method: 'GET',
            },
          },
        },
      };
    }

    try {
      const token = await this.getAccessToken();

      const payload = {
        merchantId: this.clientId,
        merchantTransactionId: params.merchantTransactionId,
        merchantUserId: params.merchantUserId || 'MUID123',
        amount: params.amount * 100,
        redirectUrl: params.redirectUrl,
        redirectMode: params.redirectMode,
        callbackUrl: params.callbackUrl,
        mobileNumber: params.mobileNumber || '9999999999',
        paymentInstrument: {
          type: 'PAY_PAGE',
        },
      };

      const response = await axios.post(`${this.baseUrl}/checkout/v2/pay`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `O-Bearer ${token}`,
        },
      });

      return {
        success: response.data.success,
        data: response.data.data,
        error: response.data.error,
      };
    } catch (error) {
      console.error('❌ PhonePe create payment error:', error.response?.data || error.message);
      return {
        success: false,
        error: {
          code: 'PAYMENT_ERROR',
          description: error.response?.data?.error?.description || 'Payment creation failed',
        },
      };
    }
  }

  async checkPaymentStatus(merchantTransactionId: string): Promise<PhonePeStatusResponse> {
    if (!this.clientId) {
      console.log('📝 [DEV] PhonePe status check (mock):', merchantTransactionId);
      return {
        success: true,
        data: {
          merchantId: 'MOCK',
          merchantTransactionId,
          transactionId: `TXN_${merchantTransactionId}`,
          state: 'COMPLETED',
          responseCode: 'SUCCESS',
        },
      };
    }

    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/checkout/v2/order/${merchantTransactionId}/status`,
        {
          headers: {
            Authorization: `O-Bearer ${token}`,
          },
        },
      );

      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      console.error('❌ PhonePe status check error:', error.response?.data || error.message);
      return {
        success: false,
      };
    }
  }

  generateTransactionId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 10);
    return `ORD${timestamp}${random}`.substring(0, 35);
  }
}
