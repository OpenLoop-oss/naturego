import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface TrackingEvent {
  timestamp: string;
  location: string;
  description: string;
  status: 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'EXCEPTION';
}

export interface TrackingResult {
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery?: string;
  events: TrackingEvent[];
}

@Injectable()
export class ShippingService {
  private readonly carrierName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.carrierName = 'IRA Farms Delivery';
  }

  generateTrackingNumber(): string {
    const prefix = 'IRA';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  async trackShipment(trackingNumber: string): Promise<TrackingResult> {
    if (!trackingNumber.startsWith('IRA')) {
      return {
        trackingNumber,
        carrier: 'External Carrier',
        status: 'TRACKING_NOT_FOUND',
        events: [
          {
            timestamp: new Date().toISOString(),
            location: 'N/A',
            description: 'For shipments from external carriers, please track on their website',
            status: 'EXCEPTION',
          },
        ],
      };
    }

    const order = await this.prisma.order.findFirst({
      where: { trackingNumber },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Tracking number not found');
    }

    const events = this.generateMockTrackingEvents(order.status);
    const statusMap: Record<string, string> = {
      PENDING: 'Order Received',
      PROCESSING: 'Order Being Prepared',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    };

    const estimatedDelivery = this.calculateEstimatedDelivery(order.createdAt, order.status);

    return {
      trackingNumber,
      carrier: this.carrierName,
      status: statusMap[order.status] || order.status,
      estimatedDelivery,
      events,
    };
  }

  private generateMockTrackingEvents(orderStatus: string): TrackingEvent[] {
    const now = new Date();
    const events: TrackingEvent[] = [];

    events.push({
      timestamp: now.toISOString(),
      location: 'Your Location',
      description:
        orderStatus === 'DELIVERED'
          ? 'Package delivered to recipient'
          : 'Package in transit to your location',
      status: orderStatus === 'DELIVERED' ? 'DELIVERED' : 'IN_TRANSIT',
    });

    if (['SHIPPED', 'DELIVERED'].includes(orderStatus)) {
      events.push({
        timestamp: new Date(now.getTime() - 86400000).toISOString(),
        location: 'Regional Hub',
        description: 'Package arrived at regional sorting facility',
        status: 'IN_TRANSIT',
      });

      events.push({
        timestamp: new Date(now.getTime() - 172800000).toISOString(),
        location: 'Local Facility',
        description: 'Package picked up from seller',
        status: 'PICKED_UP',
      });
    }

    if (orderStatus === 'DELIVERED') {
      events.push({
        timestamp: new Date(now.getTime() - 3600000).toISOString(),
        location: 'Your Location',
        description: 'Out for delivery',
        status: 'OUT_FOR_DELIVERY',
      });
    }

    return events;
  }

  private calculateEstimatedDelivery(orderDate: Date, status: string): string | undefined {
    if (status === 'DELIVERED') {
      return new Date().toISOString();
    }

    const deliveryDays = 3 + Math.floor(Math.random() * 3);
    const estimatedDate = new Date(orderDate);
    estimatedDate.setDate(estimatedDate.getDate() + deliveryDays);

    if (estimatedDate < new Date()) {
      return new Date(Date.now() + 86400000 * 2).toISOString();
    }

    return estimatedDate.toISOString();
  }

  async validateAddress(address: {
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }): Promise<{ valid: boolean; serviceAvailable: boolean; estimatedDays: number }> {
    const serviceableCities = [
      'mumbai',
      'delhi',
      'bangalore',
      'chennai',
      'hyderabad',
      'kolkata',
      'pune',
      'ahmedabad',
      'jaipur',
      'chandigarh',
      'lucknow',
      'kochi',
      'coimbatore',
      'visakhapatnam',
      'bhubaneswar',
      'guwahati',
      'nagpur',
    ];

    const isServiceable = serviceableCities.some((city) =>
      address.city.toLowerCase().includes(city),
    );

    return {
      valid: true,
      serviceAvailable: isServiceable,
      estimatedDays: isServiceable ? 3 + Math.floor(Math.random() * 3) : 7,
    };
  }

  calculateShippingCost(weight: number, distance: 'local' | 'regional' | 'national'): number {
    const baseRates = {
      local: 50,
      regional: 100,
      national: 150,
    };

    const weightSurcharge = Math.max(0, weight - 1) * 20;
    return baseRates[distance] + weightSurcharge;
  }
}
