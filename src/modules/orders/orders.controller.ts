import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import {
  GetOrdersDto,
  CheckoutDto,
  CancelOrderDto,
  UpdateOrderStatusDto,
  GuestCheckoutDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('guest')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Guest checkout without authentication' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient stock' })
  async guestCheckout(@Body() guestCheckoutDto: GuestCheckoutDto) {
    const result = await this.ordersService.guestCheckout(guestCheckoutDto);
    return {
      success: true,
      message: result.message,
      data: {
        orderId: result.order.id,
        totalPrice: result.order.totalPrice,
        status: result.order.status,
        paymentStatus: result.order.paymentStatus,
        razorpayOrderId: result.order.razorpayOrderId,
      },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Checkout cart to create an order (authenticated)' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Cart is empty or insufficient stock' })
  async checkout(@CurrentUser('id') userId: string, @Body() checkoutDto: CheckoutDto) {
    const result = await this.ordersService.checkout(userId, checkoutDto.addressId);
    return {
      success: true,
      message: result.message,
      data: result.order,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: "List user's past orders" })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async getOrders(@CurrentUser('id') userId: string, @Query() query: GetOrdersDto) {
    const result = await this.ordersService.getOrders(userId, query);
    return {
      success: true,
      message: 'Orders retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order details' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(@CurrentUser('id') userId: string, @Param('id') orderId: string) {
    const result = await this.ordersService.getOrderById(userId, orderId);
    return {
      success: true,
      message: 'Order retrieved successfully',
      data: result,
    };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(@CurrentUser('id') userId: string, @Param('id') orderId: string) {
    const result = await this.ordersService.cancelOrder(userId, orderId);
    return {
      success: true,
      message: 'Order cancelled successfully. Refund will be processed.',
      data: result,
    };
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a refund for an order' })
  @ApiResponse({ status: 200, description: 'Refund request submitted' })
  @ApiResponse({ status: 400, description: 'Refund not available' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async requestRefund(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Body() cancelOrderDto: CancelOrderDto,
  ) {
    const result = await this.ordersService.requestRefund(
      userId,
      orderId,
      cancelOrderDto.reason || 'Customer requested refund',
    );
    return {
      success: true,
      message: result.message,
      data: result,
    };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateOrderStatus(
    @CurrentUser('id') adminId: string,
    @Param('id') orderId: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    const result = await this.ordersService.updateOrderStatus(
      orderId,
      updateStatusDto.status,
      updateStatusDto.trackingNumber,
      updateStatusDto.notes,
      adminId,
    );
    return {
      success: true,
      message: 'Order status updated successfully',
      data: result,
    };
  }

  @Get(':id/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order history (Admin/Manager only)' })
  @ApiResponse({ status: 200, description: 'Order history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderHistory(@Param('id') orderId: string) {
    const result = await this.ordersService.getOrderHistory(orderId);
    return {
      success: true,
      message: 'Order history retrieved successfully',
      data: result,
    };
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders for admin (Admin only)' })
  @ApiResponse({ status: 200, description: 'All orders retrieved successfully' })
  async getAllOrders(@Query() query: GetOrdersDto) {
    const result = await this.ordersService.getAllOrders(query);
    return {
      success: true,
      message: 'All orders retrieved successfully',
      data: result,
    };
  }
}
