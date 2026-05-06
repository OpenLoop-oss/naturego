import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PaymentService } from '../payment/payment.service';
import { ConfigService } from '@nestjs/config';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    cartItem: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      update: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockEmailService = {
    sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
  };

  const mockPaymentService = {
    createOrder: jest.fn().mockResolvedValue({
      id: 'razorpay_order_123',
      amount: 100,
      currency: 'INR',
      status: 'created',
    }),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('7d'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkout', () => {
    it('should create order and clear cart successfully', async () => {
      const userId = 'user-123';
      const mockCartItems = [
        {
          productId: 'product-1',
          quantity: 2,
          product: {
            id: 'product-1',
            name: 'Product 1',
            price: { toString: () => '50' },
            stock: 10,
          },
        },
      ];

      const mockOrder = {
        id: 'order-123',
        userId,
        totalPrice: { toString: () => '100' },
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        items: mockCartItems,
      };

      mockPrismaService.cartItem.findMany.mockResolvedValue(mockCartItems);
      const mockTxOrder = {
        id: 'order-123',
        userId,
        totalPrice: { toString: () => '100' },
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        items: mockCartItems.map((item) => ({
          id: 'order-item-1',
          productId: item.productId,
          quantity: item.quantity,
          price: { toString: () => '50' },
          product: item.product,
        })),
        user: { id: userId, name: 'Test User', email: 'test@example.com' },
        createdAt: new Date(),
        razorpayOrderId: 'razorpay_order_123',
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: { update: jest.fn().mockResolvedValue({}) },
          order: {
            create: jest.fn().mockResolvedValue(mockTxOrder),
            findUnique: jest.fn().mockResolvedValue(mockTxOrder),
            update: jest.fn().mockResolvedValue(mockTxOrder),
          },
          cartItem: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
        };
        return callback(tx);
      });

      const result = await service.checkout(userId);

      expect(result.order).toBeDefined();
      expect(result.message).toContain('Order created successfully');
    });

    it('should throw BadRequestException if cart is empty', async () => {
      mockPrismaService.cartItem.findMany.mockResolvedValue([]);

      await expect(service.checkout('user-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if insufficient stock', async () => {
      const mockCartItems = [
        {
          productId: 'product-1',
          quantity: 10,
          product: {
            id: 'product-1',
            name: 'Product 1',
            price: { toString: () => '50' },
            stock: 5,
          },
        },
      ];

      mockPrismaService.cartItem.findMany.mockResolvedValue(mockCartItems);

      await expect(service.checkout('user-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOrders', () => {
    it('should return paginated orders', async () => {
      const userId = 'user-123';
      const mockOrders = [
        {
          id: 'order-1',
          userId,
          totalPrice: 100,
          status: OrderStatus.DELIVERED,
          items: [],
        },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(1);

      const result = await service.getOrders(userId, { page: 1, limit: 10 });

      expect(result.orders).toEqual(mockOrders);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getOrderById', () => {
    it('should return order details', async () => {
      const userId = 'user-123';
      const orderId = 'order-123';
      const mockOrder = {
        id: orderId,
        userId,
        totalPrice: 100,
        status: OrderStatus.DELIVERED,
        items: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.getOrderById(userId, orderId);

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.getOrderById('user-123', 'invalid')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if order belongs to different user', async () => {
      const mockOrder = {
        id: 'order-123',
        userId: 'different-user',
        totalPrice: 100,
        status: OrderStatus.DELIVERED,
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.getOrderById('user-123', 'order-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
