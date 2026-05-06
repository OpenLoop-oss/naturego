import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  async addToWishlist(userId: string, productId: string) {
    const product = await this.productsService.findOne(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existingItem = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingItem) {
      throw new ConflictException('Product already in wishlist');
    }

    const wishlistItem = await this.prisma.wishlist.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            imageUrl: true,
            stock: true,
          },
        },
      },
    });

    return wishlistItem;
  }

  async getWishlist(userId: string) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            stock: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items,
      totalItems: items.length,
    };
  }

  async removeFromWishlist(userId: string, productId: string) {
    const wishlistItem = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!wishlistItem) {
      throw new NotFoundException('Wishlist item not found');
    }

    await this.prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return { message: 'Product removed from wishlist' };
  }

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const item = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
    return !!item;
  }
}
