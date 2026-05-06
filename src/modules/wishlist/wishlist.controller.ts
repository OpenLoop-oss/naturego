import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';

@ApiTags('Wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('USER', 'ADMIN')
@ApiBearerAuth()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get user wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist retrieved successfully' })
  async getWishlist(@CurrentUser('id') userId: string) {
    const result = await this.wishlistService.getWishlist(userId);
    return {
      success: true,
      message: 'Wishlist retrieved successfully',
      data: result,
    };
  }

  @Post(':productId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add product to wishlist' })
  @ApiResponse({ status: 201, description: 'Product added to wishlist' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Product already in wishlist' })
  async addToWishlist(@CurrentUser('id') userId: string, @Param('productId') productId: string) {
    const result = await this.wishlistService.addToWishlist(userId, productId);
    return {
      success: true,
      message: 'Product added to wishlist',
      data: result,
    };
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove product from wishlist' })
  @ApiResponse({ status: 200, description: 'Product removed from wishlist' })
  @ApiResponse({ status: 404, description: 'Wishlist item not found' })
  async removeFromWishlist(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    const result = await this.wishlistService.removeFromWishlist(userId, productId);
    return {
      success: true,
      message: result.message,
    };
  }
}
