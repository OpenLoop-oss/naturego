import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles, CurrentUser } from '../../common/decorators';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('guest')
  @ApiOperation({ summary: 'Get guest cart items' })
  @ApiHeader({ name: 'x-session-id', description: 'Guest session ID', required: false })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  async getGuestCart(@Headers('x-session-id') sessionId: string) {
    const result = await this.cartService.getGuestCart(sessionId || 'default');
    return result;
  }

  @Post('guest')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add product to guest cart' })
  @ApiHeader({ name: 'x-session-id', description: 'Guest session ID', required: false })
  @ApiResponse({ status: 201, description: 'Item added to cart successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient stock' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async addToGuestCart(
    @Headers('x-session-id') sessionId: string,
    @Body() addToCartDto: AddToCartDto,
  ) {
    const session = sessionId || `session_${Date.now()}`;
    const result = await this.cartService.addToGuestCart(session, addToCartDto);
    return { ...result, sessionId: session };
  }

  @Patch('guest/:id')
  @ApiOperation({ summary: 'Update guest cart item quantity' })
  @ApiHeader({ name: 'x-session-id', description: 'Guest session ID', required: false })
  @ApiResponse({ status: 200, description: 'Cart item updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid quantity or insufficient stock' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async updateGuestCartItem(
    @Headers('x-session-id') sessionId: string,
    @Param('id') cartItemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    const result = await this.cartService.updateGuestCartItem(
      sessionId || 'default',
      cartItemId,
      updateCartItemDto.quantity,
    );
    return result;
  }

  @Delete('guest/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove item from guest cart' })
  @ApiHeader({ name: 'x-session-id', description: 'Guest session ID', required: false })
  @ApiResponse({ status: 200, description: 'Item removed from cart successfully' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async removeGuestCartItem(
    @Headers('x-session-id') sessionId: string,
    @Param('id') cartItemId: string,
  ) {
    const result = await this.cartService.removeGuestCartItem(sessionId || 'default', cartItemId);
    return result;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add product to cart (authenticated)' })
  @ApiResponse({ status: 201, description: 'Item added to cart successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient stock' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async addToCart(@CurrentUser('id') userId: string, @Body() addToCartDto: AddToCartDto) {
    const result = await this.cartService.addToCart(userId, addToCartDto);
    return {
      success: true,
      message: 'Item added to cart successfully',
      data: result,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user cart items' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  async getCart(@CurrentUser('id') userId: string) {
    const result = await this.cartService.getCart(userId);
    return {
      success: true,
      message: 'Cart retrieved successfully',
      data: result,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update quantity of a cart item' })
  @ApiResponse({ status: 200, description: 'Cart item updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid quantity or insufficient stock' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your cart item' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async updateCartItem(
    @CurrentUser('id') userId: string,
    @Param('id') cartItemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    const result = await this.cartService.updateCartItem(userId, cartItemId, updateCartItemDto);
    return {
      success: true,
      message: 'Cart item updated successfully',
      data: result,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed from cart successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your cart item' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async removeCartItem(@CurrentUser('id') userId: string, @Param('id') cartItemId: string) {
    const result = await this.cartService.removeCartItem(userId, cartItemId);
    return {
      success: true,
      message: result.message,
    };
  }
}
