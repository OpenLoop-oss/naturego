import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ShipRocketCourier {
  courier_id: number;
  courier_name: string;
  courier_company_id: number;
  rate: number;
  estimated_days: string;
  is_cod: number;
}

export interface ShipRocketRate {
  courier_id: number;
  courier_name: string;
  rate: number;
  estimated_days: string;
}

export interface ShipRocketOrder {
  order_id: number;
  shipment_id: number;
  pickup_scheduled_date: string;
  status: string;
  tracking_id: string;
}

@Injectable()
export class ShiprocketService {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private readonly baseUrl = 'https://apiv2.shiprocket.in/v1/external';

  constructor(private configService: ConfigService) {}

  private getCredentials() {
    return {
      email: this.configService.get<string>('shiprocket.email'),
      password: this.configService.get<string>('shiprocket.password'),
      channelId: this.configService.get<string>('shiprocket.channelId'),
    };
  }

  async authenticate(): Promise<string> {
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    const { email, password } = this.getCredentials();

    try {
      const response = await axios.post(`${this.baseUrl}/auth/login`, {
        email,
        password,
      });

      this.token = response.data.token;
      this.tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);

      console.log('✅ ShipRocket authentication successful');
      return this.token!;
    } catch (error) {
      console.error('❌ ShipRocket authentication failed:', error.response?.data || error.message);
      throw error;
    }
  }

  private async getHeaders() {
    const token = await this.authenticate();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  async getCourierServiceability(params: {
    pickup_postcode: number;
    delivery_postcode: number;
    weight: number;
    cod?: number;
    declared_value?: number;
  }): Promise<ShipRocketRate[]> {
    try {
      const headers = await this.getHeaders();
      console.log(
        '📦 ShipRocket: Checking rates for',
        params.pickup_postcode,
        '->',
        params.delivery_postcode,
      );
      const response = await axios.get(`${this.baseUrl}/courier/serviceability`, {
        headers,
        params: {
          pickup_postcode: params.pickup_postcode,
          delivery_postcode: params.delivery_postcode,
          weight: params.weight,
          cod: params.cod || 0,
          declared_value: params.declared_value || 0,
        },
      });

      if (response.data?.courier_data && Array.isArray(response.data.courier_data)) {
        return response.data.courier_data.map((rate: any) => ({
          courier_id: rate.courier_id,
          courier_name: rate.courier_name,
          rate: rate.rate,
          estimated_days: rate.estimated_days,
        }));
      }

      return [];
    } catch (error) {
      console.error(
        '❌ ShipRocket courier serviceability error:',
        error.response?.data || error.message,
      );
      return [];
    }
  }

  async createOrder(orderData: {
    order_id: string;
    order_date: string;
    pickup_location: string;
    billing_customer_name: string;
    billing_last_name: string;
    billing_address: string;
    billing_city: string;
    billing_state: string;
    billing_pincode: string;
    billing_country: string;
    billing_email: string;
    billing_phone: string;
    shipping_is_billing: boolean;
    shipping_customer_name: string;
    shipping_last_name: string;
    shipping_address: string;
    shipping_city: string;
    shipping_state: string;
    shipping_pincode: string;
    shipping_country: string;
    shipping_email: string;
    shipping_phone: string;
    order_items: Array<{
      name: string;
      sku: string;
      units: number;
      selling_price: number;
      weight: number;
    }>;
    payment_method: 'PREPAID' | 'COD';
    sub_total: number;
    total_shipping: number;
    length: number;
    breadth: number;
    height: number;
    weight: number;
  }): Promise<ShipRocketOrder | null> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(`${this.baseUrl}/orders/create/adhoc`, orderData, {
        headers,
      });

      if (response.data) {
        return {
          order_id: response.data.order_id,
          shipment_id: response.data.shipment_id,
          pickup_scheduled_date: response.data.pickup_scheduled_date,
          status: response.data.status,
          tracking_id: response.data.tracking_id || '',
        };
      }

      return null;
    } catch (error) {
      console.error('❌ ShipRocket create order error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getOrderStatus(orderId: number): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseUrl}/orders/${orderId}/status`, { headers });
      return response.data;
    } catch (error) {
      console.error('❌ ShipRocket order status error:', error.response?.data || error.message);
      return null;
    }
  }

  async cancelOrder(orderId: number): Promise<boolean> {
    try {
      const headers = await this.getHeaders();
      await axios.post(`${this.baseUrl}/orders/cancel`, { ids: [orderId] }, { headers });
      return true;
    } catch (error) {
      console.error('❌ ShipRocket cancel order error:', error.response?.data || error.message);
      return false;
    }
  }

  async generateAWB(orderId: number, courierId: number): Promise<string | null> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(
        `${this.baseUrl}/orders/awb`,
        {
          order_id: orderId,
          courier_id: courierId,
        },
        { headers },
      );

      if (response.data?.awb_code) {
        return response.data.awb_code;
      }

      return null;
    } catch (error) {
      console.error('❌ ShipRocket generate AWB error:', error.response?.data || error.message);
      return null;
    }
  }

  async schedulePickup(orderId: number): Promise<boolean> {
    try {
      const headers = await this.getHeaders();
      await axios.post(`${this.baseUrl}/orders/${orderId}/pickup`, {}, { headers });
      return true;
    } catch (error) {
      console.error('❌ ShipRocket schedule pickup error:', error.response?.data || error.message);
      return false;
    }
  }
}
