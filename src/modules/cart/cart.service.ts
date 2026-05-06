import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToCartDto, UpdateCartItemDto, GuestCartDto } from './dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getGuestCart(sessionId: string) {
    const cartItems = await this.prisma.guestCartItem.findMany({
      where: { sessionId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            stock: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalItems = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const totalPrice = cartItems.reduce(
      (sum: number, item: any) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    return {
      items: cartItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: item.product,
        createdAt: item.createdAt,
      })),
      summary: {
        totalItems,
        totalPrice: Number(totalPrice.toFixed(2)),
      },
    };
  }

  async addToGuestCart(sessionId: string, addToCartDto: AddToCartDto) {
    const { productId, quantity } = addToCartDto;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.stock < quantity) {
      throw new BadRequestException(`Insufficient stock. Available: ${product.stock}`);
    }

    const existingCartItem = await this.prisma.guestCartItem.findFirst({
      where: { sessionId, productId },
    });

    if (existingCartItem) {
      const newQuantity = existingCartItem.quantity + quantity;
      if (product.stock < newQuantity) {
        throw new BadRequestException(`Insufficient stock. Available: ${product.stock}`);
      }

      const updatedItem = await this.prisma.guestCartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: newQuantity },
      });

      return {
        id: updatedItem.id,
        productId: updatedItem.productId,
        quantity: updatedItem.quantity,
        product,
        createdAt: updatedItem.createdAt,
      };
    }

    const cartItem = await this.prisma.guestCartItem.create({
      data: {
        sessionId,
        productId,
        quantity,
      },
    });

    return {
      id: cartItem.id,
      productId: cartItem.productId,
      quantity: cartItem.quantity,
      product,
      createdAt: cartItem.createdAt,
    };
  }

  async updateGuestCartItem(sessionId: string, cartItemId: string, quantity: number) {
    const cartItem = await this.prisma.guestCartItem.findFirst({
      where: { id: cartItemId, sessionId },
      include: { product: true },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (cartItem.product.stock < quantity) {
      throw new BadRequestException(`Insufficient stock. Available: ${cartItem.product.stock}`);
    }

    const updatedItem = await this.prisma.guestCartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });

    return {
      id: updatedItem.id,
      productId: updatedItem.productId,
      quantity: updatedItem.quantity,
      product: cartItem.product,
      createdAt: updatedItem.createdAt,
    };
  }

  async removeGuestCartItem(sessionId: string, cartItemId: string) {
    const cartItem = await this.prisma.guestCartItem.findFirst({
      where: { id: cartItemId, sessionId },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.guestCartItem.delete({
      where: { id: cartItemId },
    });

    return { message: 'Item removed from cart successfully' };
  }

  async clearGuestCart(sessionId: string) {
    await this.prisma.guestCartItem.deleteMany({
      where: { sessionId },
    });
    return { message: 'Cart cleared successfully' };
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    const { productId, quantity } = addToCartDto;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.stock < quantity) {
      throw new BadRequestException(`Insufficient stock. Available: ${product.stock}`);
    }

    const existingCartItem = await this.prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingCartItem) {
      const newQuantity = existingCartItem.quantity + quantity;
      if (product.stock < newQuantity) {
        throw new BadRequestException(`Insufficient stock. Available: ${product.stock}`);
      }

      const updatedItem = await this.prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: newQuantity },
      });

      const productDetails = await this.prisma.product.findUnique({
        where: { id: updatedItem.productId },
        select: {
          id: true,
          name: true,
          price: true,
          imageUrl: true,
        },
      });

      return {
        id: updatedItem.id,
        userId: updatedItem.userId,
        productId: updatedItem.productId,
        quantity: updatedItem.quantity,
        createdAt: updatedItem.createdAt,
        updatedAt: updatedItem.updatedAt,
        product: productDetails,
      };
    }

    const cartItem = await this.prisma.cartItem.create({
      data: {
        userId,
        productId,
        quantity,
      },
    });

    const productDetails = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
      },
    });

    return {
      id: cartItem.id,
      userId: cartItem.userId,
      productId: cartItem.productId,
      quantity: cartItem.quantity,
      createdAt: cartItem.createdAt,
      updatedAt: cartItem.updatedAt,
      product: productDetails,
    };
  }

  async getCart(userId: string) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            stock: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalItems = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

    const totalPrice = cartItems.reduce(
      (sum: number, item: any) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    return {
      items: cartItems,
      summary: {
        totalItems,
        totalPrice: Number(totalPrice.toFixed(2)),
      },
    };
  }

  async updateCartItem(userId: string, cartItemId: string, updateCartItemDto: UpdateCartItemDto) {
    const { quantity } = updateCartItemDto;

    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { product: true },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (cartItem.userId !== userId) {
      throw new ForbiddenException('You can only update your own cart items');
    }

    if (cartItem.product.stock < quantity) {
      throw new BadRequestException(`Insufficient stock. Available: ${cartItem.product.stock}`);
    }

    const updatedItem = await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });

    const productDetails = await this.prisma.product.findUnique({
      where: { id: updatedItem.productId },
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
      },
    });

    return {
      id: updatedItem.id,
      userId: updatedItem.userId,
      productId: updatedItem.productId,
      quantity: updatedItem.quantity,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
      product: productDetails,
    };
  }

  async removeCartItem(userId: string, cartItemId: string) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (cartItem.userId !== userId) {
      throw new ForbiddenException('You can only remove your own cart items');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return { message: 'Item removed from cart successfully' };
  }

  async clearCart(userId: string) {
    await this.prisma.cartItem.deleteMany({
      where: { userId },
    });

    return { message: 'Cart cleared successfully' };
  }
}
