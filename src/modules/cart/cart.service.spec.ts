import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CartService', () => {
  let service: CartService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    cartItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addToCart', () => {
    it('should add item to cart successfully', async () => {
      const userId = 'user-123';
      const productId = 'product-456';
      const quantity = 2;

      const mockProduct = {
        id: productId,
        name: 'Test Product',
        price: 99.99,
        stock: 10,
      };

      const mockCartItem = {
        id: 'cart-item-789',
        userId,
        productId,
        quantity,
        product: mockProduct,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.cartItem.findUnique.mockResolvedValue(null);
      mockPrismaService.cartItem.create.mockResolvedValue(mockCartItem);

      const result = await service.addToCart(userId, { productId, quantity });

      expect(result).toEqual(mockCartItem);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: productId },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addToCart('user-123', { productId: 'invalid', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient stock', async () => {
      const mockProduct = {
        id: 'product-456',
        name: 'Test Product',
        price: 99.99,
        stock: 5,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      await expect(
        service.addToCart('user-123', { productId: 'product-456', quantity: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCart', () => {
    it('should return cart items with summary', async () => {
      const userId = 'user-123';
      const mockCartItems = [
        {
          id: 'item-1',
          userId,
          productId: 'product-1',
          quantity: 2,
          product: { id: 'product-1', name: 'Product 1', price: 50 },
        },
        {
          id: 'item-2',
          userId,
          productId: 'product-2',
          quantity: 1,
          product: { id: 'product-2', name: 'Product 2', price: 30 },
        },
      ];

      mockPrismaService.cartItem.findMany.mockResolvedValue(mockCartItems);

      const result = await service.getCart(userId);

      expect(result.items).toEqual(mockCartItems);
      expect(result.summary.totalItems).toBe(3);
      expect(result.summary.totalPrice).toBe(130);
    });

    it('should return empty cart if no items', async () => {
      mockPrismaService.cartItem.findMany.mockResolvedValue([]);

      const result = await service.getCart('user-123');

      expect(result.items).toEqual([]);
      expect(result.summary.totalItems).toBe(0);
      expect(result.summary.totalPrice).toBe(0);
    });
  });

  describe('updateCartItem', () => {
    it('should update cart item quantity successfully', async () => {
      const userId = 'user-123';
      const cartItemId = 'cart-item-123';
      const mockCartItem = {
        id: cartItemId,
        userId,
        productId: 'product-456',
        quantity: 2,
        product: { id: 'product-456', name: 'Test', price: 99.99, stock: 10 },
      };

      const updatedItem = {
        ...mockCartItem,
        quantity: 5,
      };

      mockPrismaService.cartItem.findUnique.mockResolvedValue(mockCartItem);
      mockPrismaService.cartItem.update.mockResolvedValue(updatedItem);

      const result = await service.updateCartItem(userId, cartItemId, { quantity: 5 });

      expect(result.quantity).toBe(5);
    });

    it('should throw NotFoundException if cart item not found', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCartItem('user-123', 'invalid', { quantity: 5 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeCartItem', () => {
    it('should remove cart item successfully', async () => {
      const userId = 'user-123';
      const cartItemId = 'cart-item-123';
      const mockCartItem = {
        id: cartItemId,
        userId,
      };

      mockPrismaService.cartItem.findUnique.mockResolvedValue(mockCartItem);
      mockPrismaService.cartItem.delete.mockResolvedValue(mockCartItem);

      const result = await service.removeCartItem(userId, cartItemId);

      expect(result.message).toBe('Item removed from cart successfully');
    });

    it('should throw NotFoundException if cart item not found', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        service.removeCartItem('user-123', 'invalid'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
