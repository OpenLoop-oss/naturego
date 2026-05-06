import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PaymentStatus, StockMovementType } from '@prisma/client';
import { GetOrdersDto, GuestCheckoutDto } from './dto';
import { EmailService } from '../email/email.service';
import { PaymentService } from '../payment/payment.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ShiprocketService } from '../shipping/shiprocket.service';
import {
  canTransitionOrder,
  isCancellable,
  getNextValidStatuses,
} from '../../common/constants/order-status';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly shiprocketService: ShiprocketService,
  ) {}

  async checkout(userId: string, addressId?: string) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product: ${item.product.name}. Available: ${item.product.stock}`,
        );
      }
    }

    let shippingAddress = null;
    if (addressId) {
      const address = await this.prisma.address.findFirst({
        where: { id: addressId, userId },
      });
      if (address) {
        shippingAddress = {
          fullName: address.fullName,
          phone: address.phone,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
        };
      }
    }

    const totalPrice = cartItems.reduce(
      (sum: number, item: any) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    const order = await this.prisma.$transaction(async (tx: any) => {
      for (const item of cartItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true },
        });

        if (!product || product.stock < item.quantity) {
          throw new BadRequestException(`Insufficient stock for product: ${item.product.name}`);
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.SALE,
            quantity: -item.quantity,
            referenceId: undefined,
            referenceType: 'ORDER',
            reason: 'Sale - checkout',
            userId: userId,
          },
        });

        const updatedProduct = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true, lowStockThreshold: true, name: true },
        });

        if (updatedProduct && updatedProduct.stock <= updatedProduct.lowStockThreshold) {
          this.notificationsService.emitLowStock({
            productId: item.productId,
            name: updatedProduct.name,
            currentStock: updatedProduct.stock,
            threshold: updatedProduct.lowStockThreshold,
          });
        }
      }

      const razorpayOrder = await this.paymentService.createOrder({
        amount: totalPrice,
        currency: 'INR',
        receipt: `order_${userId}_${Date.now()}`,
      });

      const newOrder = await tx.order.create({
        data: {
          userId,
          totalPrice,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          razorpayOrderId: razorpayOrder.id,
          shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : undefined,
          items: {
            create: cartItems.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            })),
          },
        },
      });

      await tx.orderHistory.create({
        data: {
          orderId: newOrder.id,
          action: 'STATUS_CHANGE',
          oldValue: null,
          newValue: OrderStatus.PENDING,
          description: 'Order created',
          userId: userId,
        },
      });

      const orderWithDetails = await tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  imageUrl: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      await tx.cartItem.deleteMany({
        where: { userId },
      });

      const paymentSuccess = await this.simulatePayment();

      if (paymentSuccess) {
        await tx.order.update({
          where: { id: newOrder.id },
          data: { paymentStatus: PaymentStatus.COMPLETED },
        });
        if (orderWithDetails) {
          orderWithDetails.paymentStatus = PaymentStatus.COMPLETED;
        }
      }

      return orderWithDetails;
    });

    if (order) {
      const user = order.user;
      await this.syncToShipRocket(
        order.id,
        order.items,
        shippingAddress,
        user?.name || 'Customer',
        user?.email || '',
        shippingAddress?.phone || '',
        false,
      );
    }

    if (order && order.user) {
      this.emailService.sendOrderConfirmation({
        email: order.user.email,
        name: order.user.name,
        orderId: order.id,
        orderDate: new Date(order.createdAt).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        items: order.items.map(
          (item: {
            product: { name: string };
            quantity: number;
            price: { toString: () => string };
          }) => ({
            name: item.product.name,
            quantity: item.quantity,
            price: item.price.toString(),
          }),
        ),
        totalPrice: order.totalPrice.toString(),
        shippingAddress: shippingAddress || undefined,
      });

      this.notificationsService.emitNewOrder(order);
    }

    return {
      order,
      message: 'Order created successfully. Payment completed.',
    };
  }

  async guestCheckout(guestData: GuestCheckoutDto) {
    const { email, name, items, address, customerNotes } = guestData;

    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== items.length) {
      throw new BadRequestException('Some products were not found');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let totalPrice = 0;

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product: ${product.name}. Available: ${product.stock}`,
        );
      }
      totalPrice += Number(product.price) * item.quantity;
    }

    const order = await this.prisma.$transaction(async (tx: any) => {
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.SALE,
            quantity: -item.quantity,
            referenceType: 'ORDER',
            reason: 'Sale - guest checkout',
          },
        });
      }

      const razorpayOrder = await this.paymentService.createOrder({
        amount: totalPrice,
        currency: 'INR',
        receipt: `order_guest_${Date.now()}`,
      });

      const newOrder = await tx.order.create({
        data: {
          totalPrice,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          razorpayOrderId: razorpayOrder.id,
          shippingAddress: JSON.stringify(address),
          customerNotes,
          guestEmail: email,
          guestName: name,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: productMap.get(item.productId)!.price,
            })),
          },
        },
      });

      await tx.orderHistory.create({
        data: {
          orderId: newOrder.id,
          action: 'STATUS_CHANGE',
          oldValue: null,
          newValue: OrderStatus.PENDING,
          description: 'Guest order created',
        },
      });

      const orderWithDetails = await tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
      });

      const paymentSuccess = await this.simulatePayment();

      if (paymentSuccess) {
        await tx.order.update({
          where: { id: newOrder.id },
          data: { paymentStatus: PaymentStatus.COMPLETED },
        });
        if (orderWithDetails) {
          orderWithDetails.paymentStatus = PaymentStatus.COMPLETED;
        }
      }

      return {
        ...orderWithDetails,
        guestEmail: email,
        guestName: name,
      };
    });

    this.emailService.sendOrderConfirmation({
      email,
      name,
      orderId: order.id,
      orderDate: new Date(order.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      items: order.items.map(
        (item: {
          product: { name: string };
          quantity: number;
          price: { toString: () => string };
        }) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.price.toString(),
        }),
      ),
      totalPrice: order.totalPrice.toString(),
      shippingAddress: address,
    });

    await this.syncToShipRocket(
      order.id,
      order.items,
      address,
      name,
      email,
      address?.phone || '',
      true,
    );

    return {
      order,
      message: 'Order placed successfully. Payment completed.',
    };
  }

  private async simulatePayment(): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 100);
    });
  }

  async getOrders(userId: string, query: GetOrdersDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          totalPrice: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          updatedAt: true,
          items: {
            select: {
              id: true,
              productId: true,
              quantity: true,
              price: true,
              createdAt: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        totalPrice: true,
        status: true,
        paymentStatus: true,
        trackingNumber: true,
        notes: true,
        customerNotes: true,
        guestEmail: true,
        guestName: true,
        shippingAddress: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            price: true,
            createdAt: true,
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                imageUrl: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    trackingNumber?: string,
    notes?: string,
    adminUserId?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!canTransitionOrder(order.status, status)) {
      const validStatuses = getNextValidStatuses(order.status);
      throw new BadRequestException(
        `Invalid status transition from ${order.status} to ${status}. ` +
          `Valid transitions: ${validStatuses.length > 0 ? validStatuses.join(', ') : 'none'}`,
      );
    }

    const updateData: any = { status };
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }
    if (notes) {
      updateData.notes = notes;
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const previousStatus = order.status;

      const result = await tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  imageUrl: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      await tx.orderHistory.create({
        data: {
          orderId,
          action: 'STATUS_CHANGE',
          oldValue: previousStatus,
          newValue: status,
          description: `Status changed from ${previousStatus} to ${status}`,
        },
      });

      if (adminUserId) {
        await tx.auditLog.create({
          data: {
            action: 'UPDATE',
            entityType: 'Order',
            entityId: orderId,
            oldValue: { status: previousStatus },
            newValue: { status, trackingNumber, notes },
            userId: adminUserId,
          },
        });
      }

      return result;
    });

    if (status === OrderStatus.SHIPPED && updatedOrder.user) {
      this.emailService.sendShippingNotification({
        email: updatedOrder.user.email,
        name: updatedOrder.user.name,
        orderId: updatedOrder.id,
        trackingNumber: trackingNumber || '',
      });
    }

    if (status === OrderStatus.DELIVERED && updatedOrder.user) {
      this.emailService.sendDeliveryConfirmation({
        email: updatedOrder.user.email,
        name: updatedOrder.user.name,
        orderId: updatedOrder.id,
      });
    }

    return updatedOrder;
  }

  async getAllOrders(query: GetOrdersDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  imageUrl: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async cancelOrder(userId: string, orderId: string, isAdmin = false) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId && !isAdmin) {
      throw new NotFoundException('Order not found');
    }

    if (!isCancellable(order.status)) {
      const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED'];
      throw new BadRequestException(
        `Order cannot be cancelled in ${order.status} status. ` +
          `Cancellation allowed for: ${validStatuses.join(', ')}`,
      );
    }

    const cancelledOrder = await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.RESERVED_RELEASED,
            quantity: item.quantity,
            referenceId: orderId,
            referenceType: 'ORDER',
            reason: 'Order cancelled',
            userId: userId,
          },
        });
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.REFUNDED,
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
      });

      await tx.orderHistory.create({
        data: {
          orderId,
          action: 'STATUS_CHANGE',
          oldValue: order.status,
          newValue: OrderStatus.CANCELLED,
          description: `Order cancelled. Stock returned to inventory.`,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CANCEL',
          entityType: 'Order',
          entityId: orderId,
          oldValue: { status: order.status },
          newValue: { status: OrderStatus.CANCELLED, paymentStatus: PaymentStatus.REFUNDED },
          userId: userId,
        },
      });

      return updatedOrder;
    });

    if (order.user) {
      this.emailService.sendOrderCancellation({
        email: order.user.email,
        name: order.user.name,
        orderId: order.id,
        orderDate: new Date(order.createdAt).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        totalPrice: order.totalPrice.toString(),
      });
    }

    return cancelledOrder;
  }

  async requestRefund(userId: string, orderId: string, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    if (order.paymentStatus === PaymentStatus.REFUNDED) {
      throw new BadRequestException('Refund already processed');
    }

    if (order.paymentStatus !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('No payment found for this order');
    }

    return {
      message: 'Refund request submitted successfully',
      orderId: order.id,
      reason,
      status: 'PENDING',
    };
  }

  async getOrderHistory(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const history = await this.prisma.orderHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      orderId,
      history,
    };
  }

  private async syncToShipRocket(
    orderId: string,
    items: Array<{
      product: { name: string; sku?: string | null };
      quantity: number;
      price: { toString: () => string };
    }>,
    shippingAddress: any,
    customerName: string,
    customerEmail: string,
    customerPhone: string,
    isGuest: boolean,
    tx?: any,
  ): Promise<{ shiprocketOrderId?: string; shiprocketShipmentId?: string }> {
    try {
      const pickupPostcode =
        this.configService.get<string>('shiprocket.pickupPostcode') || '110001';

      const addressStr = [shippingAddress?.addressLine1, shippingAddress?.addressLine2]
        .filter(Boolean)
        .join(', ');

      const orderItems = items.map((item) => ({
        name: item.product.name,
        sku: item.product.sku || `SKU-${item.product.name.substring(0, 5).toUpperCase()}`,
        units: item.quantity,
        selling_price: Number(item.price.toString()),
        weight: 0.5,
      }));

      const subTotal = items.reduce(
        (sum, item) => sum + Number(item.price.toString()) * item.quantity,
        0,
      );

      const shiprocketOrderData = {
        order_id: orderId,
        order_date: new Date().toISOString(),
        pickup_location: 'work',
        billing_customer_name: customerName.split(' ')[0] || customerName,
        billing_last_name: customerName.split(' ').slice(1).join(' ') || '',
        billing_address: addressStr || 'N/A',
        billing_city: shippingAddress?.city || 'N/A',
        billing_state: shippingAddress?.state || 'N/A',
        billing_pincode: (shippingAddress?.postalCode || '000000').toString(),
        billing_country: shippingAddress?.country || 'India',
        billing_email: customerEmail,
        billing_phone: customerPhone,
        shipping_is_billing: true,
        shipping_customer_name: customerName.split(' ')[0] || customerName,
        shipping_last_name: customerName.split(' ').slice(1).join(' ') || '',
        shipping_address: addressStr || 'N/A',
        shipping_city: shippingAddress?.city || 'N/A',
        shipping_state: shippingAddress?.state || 'N/A',
        shipping_pincode: (shippingAddress?.postalCode || '000000').toString(),
        shipping_country: shippingAddress?.country || 'India',
        shipping_email: customerEmail,
        shipping_phone: customerPhone,
        order_items: orderItems,
        payment_method: 'PREPAID' as const,
        sub_total: subTotal,
        total_shipping: 0,
        length: 10,
        breadth: 10,
        height: 10,
        weight: items.length * 0.5,
      };

      const result = await this.shiprocketService.createOrder(shiprocketOrderData);

      if (result) {
        console.log(`✅ Order ${orderId} synced to ShipRocket:`, result);

        if (tx) {
          await tx.order.update({
            where: { id: orderId },
            data: {
              shiprocketOrderId: result.order_id.toString(),
              shiprocketShipmentId: result.shipment_id.toString(),
            },
          });
        } else {
          await this.prisma.order.update({
            where: { id: orderId },
            data: {
              shiprocketOrderId: result.order_id.toString(),
              shiprocketShipmentId: result.shipment_id.toString(),
            },
          });
        }

        return {
          shiprocketOrderId: result.order_id.toString(),
          shiprocketShipmentId: result.shipment_id.toString(),
        };
      }
    } catch (error) {
      console.error(`❌ Failed to sync order ${orderId} to ShipRocket:`, error);
    }

    return {};
  }
}
