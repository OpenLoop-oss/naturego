import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ShippingService, TrackingResult } from './shipping.service';
import { ShiprocketService } from './shiprocket.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';

@ApiTags('Shipping')
@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly shiprocketService: ShiprocketService,
  ) {}

  @Get('track/:trackingNumber')
  @ApiOperation({ summary: 'Track a shipment by tracking number' })
  @ApiResponse({ status: 200, description: 'Tracking information retrieved' })
  @ApiResponse({ status: 404, description: 'Tracking number not found' })
  async trackShipment(@Param('trackingNumber') trackingNumber: string): Promise<TrackingResult> {
    return this.shippingService.trackShipment(trackingNumber);
  }

  @Post('generate-tracking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Generate a new tracking number (Admin only)' })
  @ApiResponse({ status: 200, description: 'Tracking number generated' })
  async generateTrackingNumber(): Promise<{ trackingNumber: string }> {
    return {
      trackingNumber: this.shippingService.generateTrackingNumber(),
    };
  }

  @Post('validate-address')
  @ApiOperation({ summary: 'Validate shipping address and check service availability' })
  @ApiResponse({ status: 200, description: 'Address validation result' })
  async validateAddress(
    @Body()
    address: {
      city: string;
      state: string;
      postalCode: string;
      country: string;
    },
  ) {
    return this.shippingService.validateAddress(address);
  }

  @Post('courier-rates')
  @ApiOperation({ summary: 'Get shipping rates from ShipRocket' })
  @ApiResponse({ status: 200, description: 'Courier rates retrieved' })
  async getCourierRates(
    @Body()
    params: {
      pickup_postcode: number;
      delivery_postcode: number;
      weight: number;
      cod?: number;
      declared_value?: number;
    },
  ) {
    const rates = await this.shiprocketService.getCourierServiceability(params);
    return {
      success: true,
      data: rates,
    };
  }

  @Post('create-test-order')
  @ApiOperation({ summary: 'Create a test order on ShipRocket' })
  @ApiResponse({ status: 200, description: 'Test order created' })
  async createTestOrder(
    @Body()
    data: {
      order_id: string;
      pickup_postcode: number;
      delivery_postcode: number;
      weight: number;
      cod: number;
      declared_value: number;
      customer_name: string;
      customer_email: string;
      customer_phone: string;
      address: string;
      city: string;
      state: string;
    },
  ) {
    const orderData = {
      order_id: data.order_id,
      order_date: new Date().toISOString(),
      pickup_location: 'work',
      billing_customer_name: data.customer_name,
      billing_last_name: '',
      billing_address: data.address,
      billing_city: data.city,
      billing_state: data.state,
      billing_pincode: data.delivery_postcode.toString(),
      billing_country: 'India',
      billing_email: data.customer_email,
      billing_phone: data.customer_phone,
      shipping_is_billing: true,
      shipping_customer_name: data.customer_name,
      shipping_last_name: '',
      shipping_address: data.address,
      shipping_city: data.city,
      shipping_state: data.state,
      shipping_pincode: data.delivery_postcode.toString(),
      shipping_country: 'India',
      shipping_email: data.customer_email,
      shipping_phone: data.customer_phone,
      order_items: [
        {
          name: 'Test Product',
          sku: 'TEST-001',
          units: 1,
          selling_price: data.declared_value,
          weight: data.weight,
        },
      ],
      payment_method: (data.cod === 1 ? 'COD' : 'PREPAID') as 'COD' | 'PREPAID',
      sub_total: data.declared_value,
      total_shipping: 0,
      length: 10,
      breadth: 10,
      height: 10,
      weight: data.weight,
    };

    const result = await this.shiprocketService.createOrder(orderData);
    return {
      success: true,
      data: result,
    };
  }
}
