import { Controller, Get, Query } from '@nestjs/common';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('test')
  async testEmail(@Query('to') toEmail: string) {
    if (!toEmail) {
      return {
        success: false,
        message: 'Please provide a "to" query parameter with email address',
      };
    }

    const result = await this.emailService.sendOrderConfirmation({
      email: toEmail,
      name: 'Test User',
      orderId: 'test-order-' + Date.now(),
      orderDate: new Date().toLocaleDateString('en-IN'),
      items: [
        { name: 'Organic Rice (1kg)', quantity: 2, price: '250' },
        { name: 'Organic Honey (500g)', quantity: 1, price: '450' },
      ],
      totalPrice: '950',
    });

    return {
      success: result.sent,
      message: result.sent ? 'Email sent successfully!' : 'Email failed to send',
      reason: result.reason || null,
    };
  }
}
