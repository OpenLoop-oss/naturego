import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { configuration } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { EmailModule } from './modules/email/email.module';
import { UploadModule } from './modules/upload/upload.module';
import { PaymentModule } from './modules/payment/payment.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'medium',
        ttl: 300000,
        limit: 500,
      },
      {
        name: 'long',
        ttl: 3600000,
        limit: 1000,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    CategoriesModule,
    AddressesModule,
    EmailModule,
    UploadModule,
    PaymentModule,
    WishlistModule,
    NotificationsModule,
    ShippingModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
