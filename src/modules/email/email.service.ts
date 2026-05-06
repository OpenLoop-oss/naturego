import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface OrderEmailData {
  email: string;
  name: string;
  orderId: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  totalPrice: string;
  shippingAddress?: {
    fullName: string;
    phone?: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
}

interface CancellationEmailData {
  email: string;
  name: string;
  orderId: string;
  orderDate: string;
  totalPrice: string;
}

interface ShippingEmailData {
  email: string;
  name: string;
  orderId: string;
  trackingNumber: string;
}

interface DeliveryEmailData {
  email: string;
  name: string;
  orderId: string;
}

interface PasswordResetEmailData {
  email: string;
  name: string;
  resetUrl: string;
}

@Injectable()
export class EmailService {
  private resend: Resend | null = null;
  private fromEmail: string;
  private fromName: string;

  constructor(private configService: ConfigService) {
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'orders@irafarms.com';
    this.fromName = process.env.RESEND_FROM_NAME || 'IRA Farms';

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async sendOrderConfirmation(data: OrderEmailData) {
    const { email, name, orderId, orderDate, items, totalPrice } = data;

    const itemsHtml = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.price}</td>
        </tr>
      `,
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🛒 Order Confirmed!</h1>
            <p style="color: white; margin: 8px 0 0 0; opacity: 0.9;">Thank you for choosing organic</p>
          </div>
          
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 16px 0;">Hi <strong>${name}</strong>,</p>
            <p style="margin: 0 0 24px 0; color: #6b7280;">Your order has been confirmed and is being processed. We'll send you another email when your order ships.</p>
            
            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px 0;"><strong>Order ID:</strong> #${orderId.slice(0, 8).toUpperCase()}</p>
              <p style="margin: 0;"><strong>Order Date:</strong> ${orderDate}</p>
            </div>
            
            <h2 style="font-size: 18px; margin: 0 0 16px 0; border-bottom: 2px solid #22c55e; padding-bottom: 8px;">Order Details</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Item</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
                  <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #22c55e;">₹${totalPrice}</td>
                </tr>
              </tfoot>
            </table>
            
            <div style="background: #fefce8; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #eab308;">
              <p style="margin: 0; color: #854d0e;">
                <strong>💡 Tip:</strong> Our organic products are sourced directly from farmers. Store in a cool, dry place for best freshness.
              </p>
            </div>
            
            <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <a href="${process.env.APP_FRONTEND_URL || 'http://localhost:3001'}/orders/${orderId}" 
             style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Track Your Order →
              </a>
            </div>
          </div>
          
          <div style="text-align: center; padding: 24px; color: #6b7280; font-size: 14px;">
            <p style="margin: 0 0 8px 0;">© 2026 IRA Farms. Fresh from our farm to your door.</p>
            <p style="margin: 0;">Questions? Reply to this email or contact our support team.</p>
          </div>
        </body>
      </html>
    `;

    try {
      if (this.resend) {
        await this.resend.emails.send({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: email,
          subject: `Order Confirmed! #${orderId.slice(0, 8).toUpperCase()} - IRA Farms`,
          html,
        });
        return { sent: true };
      } else {
        console.log('📧 [DEV] Order confirmation email would be sent to:', email);
        console.log('📧 [DEV] Set RESEND_API_KEY in .env to enable');
        return { sent: false, reason: 'Email service not configured' };
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      return { sent: false, reason: 'Failed to send email' };
    }
  }

  async sendOrderCancellation(data: CancellationEmailData) {
    const { email, name, orderId, orderDate, totalPrice } = data;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Order Cancelled</h1>
            <p style="color: white; margin: 8px 0 0 0; opacity: 0.9;">Your order has been cancelled</p>
          </div>
          
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 16px 0;">Hi <strong>${name}</strong>,</p>
            <p style="margin: 0 0 24px 0; color: #6b7280;">Your order has been successfully cancelled. The refund of <strong>₹${totalPrice}</strong> will be processed to your original payment method within 5-7 business days.</p>
            
            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px 0;"><strong>Order ID:</strong> #${orderId.slice(0, 8).toUpperCase()}</p>
              <p style="margin: 0;"><strong>Order Date:</strong> ${orderDate}</p>
              <p style="margin: 8px 0 0 0;"><strong>Refund Amount:</strong> ₹${totalPrice}</p>
            </div>
            
            <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #ef4444;">
              <p style="margin: 0; color: #991b1b;">
                <strong>Note:</strong> If you did not request this cancellation or have any questions, please contact our support team immediately.
              </p>
            </div>
            
            <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <a href="${this.configService.get('app.frontendUrl') || 'http://localhost:3001'}/orders" 
                 style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                View All Orders →
              </a>
            </div>
          </div>
          
          <div style="text-align: center; padding: 24px; color: #6b7280; font-size: 14px;">
            <p style="margin: 0 0 8px 0;">© 2026 IRA Farms. Fresh from our farm to your door.</p>
            <p style="margin: 0;">Questions? Reply to this email or contact our support team.</p>
          </div>
        </body>
      </html>
    `;

    try {
      if (this.resend) {
        await this.resend.emails.send({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: email,
          subject: `Order Cancelled - #${orderId.slice(0, 8).toUpperCase()} - IRA Farms`,
          html,
        });
        return { sent: true };
      } else {
        console.log('📧 [DEV] Order cancellation email would be sent to:', email);
        console.log('📧 [DEV] Set RESEND_API_KEY in .env to enable');
        return { sent: false, reason: 'Email service not configured' };
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      return { sent: false, reason: 'Failed to send email' };
    }
  }

  async sendShippingNotification(data: ShippingEmailData) {
    const { email, name, orderId, trackingNumber } = data;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📦 Your Order Has Shipped!</h1>
            <p style="color: white; margin: 8px 0 0 0; opacity: 0.9;">It's on its way to you</p>
          </div>
          
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 16px 0;">Hi <strong>${name}</strong>,</p>
            <p style="margin: 0 0 24px 0; color: #6b7280;">Great news! Your order has been shipped and is on its way to you.</p>
            
            <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px 0;"><strong>Order ID:</strong> #${orderId.slice(0, 8).toUpperCase()}</p>
              <p style="margin: 0;"><strong>Tracking Number:</strong> ${trackingNumber}</p>
            </div>
            
            <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e;">
                <strong>💡 Track your package:</strong> You can track your order in real-time using the tracking number above on our shipping partner's website.
              </p>
            </div>
            
            <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <a href="${process.env.APP_FRONTEND_URL || 'http://localhost:3001'}/orders/${orderId}" 
                 style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Track Your Order →
              </a>
            </div>
          </div>
          
          <div style="text-align: center; padding: 24px; color: #6b7280; font-size: 14px;">
            <p style="margin: 0 0 8px 0;">© 2026 IRA Farms. Fresh from our farm to your door.</p>
            <p style="margin: 0;">Questions? Reply to this email or contact our support team.</p>
          </div>
        </body>
      </html>
    `;

    try {
      if (this.resend) {
        await this.resend.emails.send({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: email,
          subject: `Your Order Has Shipped! #${orderId.slice(0, 8).toUpperCase()} - IRA Farms`,
          html,
        });
        return { sent: true };
      } else {
        console.log('📧 [DEV] Shipping notification email would be sent to:', email);
        console.log('📧 [DEV] Tracking Number:', trackingNumber);
        return { sent: false, reason: 'Email service not configured' };
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      return { sent: false, reason: 'Failed to send email' };
    }
  }

  async sendDeliveryConfirmation(data: DeliveryEmailData) {
    const { email, name, orderId } = data;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Order Delivered!</h1>
            <p style="color: white; margin: 8px 0 0 0; opacity: 0.9;">Enjoy your organic products</p>
          </div>
          
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 16px 0;">Hi <strong>${name}</strong>,</p>
            <p style="margin: 0 0 24px 0; color: #6b7280;">Your order has been successfully delivered! We hope you enjoy your organic products from IRA Farms.</p>
            
            <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px 0;"><strong>Order ID:</strong> #${orderId.slice(0, 8).toUpperCase()}</p>
              <p style="margin: 0;"><strong>Status:</strong> Delivered ✓</p>
            </div>
            
            <div style="background: #fef9c3; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #eab308;">
              <p style="margin: 0; color: #854d0e;">
                <strong>💡 Tips for storing organic products:</strong> Keep in a cool, dry place. For best freshness, consume within the recommended timeframe.
              </p>
            </div>
            
            <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 16px 0; color: #6b7280;">We'd love to hear your feedback!</p>
              <a href="${process.env.APP_FRONTEND_URL || 'http://localhost:3001'}/orders/${orderId}" 
                 style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Rate Your Order →
              </a>
            </div>
          </div>
          
          <div style="text-align: center; padding: 24px; color: #6b7280; font-size: 14px;">
            <p style="margin: 0 0 8px 0;">Thank you for choosing organic!</p>
            <p style="margin: 0;">© 2026 IRA Farms. Fresh from our farm to your door.</p>
          </div>
        </body>
      </html>
    `;

    try {
      if (this.resend) {
        await this.resend.emails.send({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: email,
          subject: `Order Delivered! #${orderId.slice(0, 8).toUpperCase()} - IRA Farms`,
          html,
        });
        return { sent: true };
      } else {
        console.log('📧 [DEV] Delivery confirmation email would be sent to:', email);
        return { sent: false, reason: 'Email service not configured' };
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      return { sent: false, reason: 'Failed to send email' };
    }
  }

  async sendVerificationEmail(data: { to: string; name: string; verificationUrl: string }) {
    const { to, name, verificationUrl } = data;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Our Store!</h1>
            <p style="color: white; margin: 8px 0 0 0; opacity: 0.9;">Please verify your email address</p>
          </div>
          
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 16px 0;">Hi <strong>${name}</strong>,</p>
            <p style="margin: 0 0 24px 0; color: #6b7280;">Thank you for registering! Please click the button below to verify your email address.</p>
            
            <div style="text-align: center; padding: 24px 0;">
              <a href="${verificationUrl}" 
                 style="display: inline-block; background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Verify Email Address →
              </a>
            </div>
            
            <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">
              If you didn't create an account, you can safely ignore this email.
            </p>
            
            <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">
              This verification link will expire in 24 hours.
            </p>
          </div>
          
          <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} NatureGo. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
Hi ${name},

Thank you for registering! Please verify your email address by clicking the link below:

${verificationUrl}

If you didn't create an account, you can safely ignore this email.

This verification link will expire in 24 hours.
    `;

    try {
      console.log('📧 [EMAIL] Sending verification email to:', to);
      console.log('📧 [EMAIL] Verification URL:', verificationUrl);
      if (this.resend) {
        const result = await this.resend.emails.send({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: to,
          subject: 'Verify Your Email Address',
          html,
        });
        console.log('📧 [EMAIL] Resend response:', result);
        return { sent: true };
      } else {
        console.log('📧 [DEV] Verification email would be sent to:', to);
        console.log('📧 [DEV] Verification URL:', verificationUrl);
        console.log('📧 [DEV] Set RESEND_API_KEY in .env to enable');
        return { sent: false, reason: 'Email service not configured' };
      }
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return { sent: false, reason: 'Failed to send email' };
    }
  }

  async sendPasswordReset(data: PasswordResetEmailData) {
    const { email, name, resetUrl } = data;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset Request</h1>
            <p style="color: white; margin: 8px 0 0 0; opacity: 0.9;">You requested a password reset</p>
          </div>
          
          <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 16px 0;">Hi <strong>${name}</strong>,</p>
            <p style="margin: 0 0 24px 0; color: #6b7280;">We received a request to reset your password. Click the button below to create a new password.</p>
            
            <div style="text-align: center; padding: 24px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Reset Password →
              </a>
            </div>
            
            <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #ef4444;">
              <p style="margin: 0; color: #991b1b;">
                <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
              </p>
            </div>
            
            <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">
              <strong>Important:</strong> This link will expire in 1 hour for your security.
            </p>
            
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
          
          <div style="text-align: center; padding: 24px; color: #6b7280; font-size: 14px;">
            <p style="margin: 0 0 8px 0;">© 2026 IRA Farms. Fresh from our farm to your door.</p>
            <p style="margin: 0;">Questions? Reply to this email or contact our support team.</p>
          </div>
        </body>
      </html>
    `;

    try {
      if (this.resend) {
        await this.resend.emails.send({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: email,
          subject: 'Password Reset Request - IRA Farms',
          html,
        });
        return { sent: true };
      } else {
        console.log('📧 [DEV] Password reset email would be sent to:', email);
        console.log('📧 [DEV] Reset URL:', resetUrl);
        console.log('📧 [DEV] Set RESEND_API_KEY in .env to enable');
        return { sent: false, reason: 'Email service not configured' };
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      return { sent: false, reason: 'Failed to send email' };
    }
  }
}
