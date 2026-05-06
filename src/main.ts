import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { GlobalExceptionFilter, LoggingInterceptor, TransformInterceptor } from './common';
import * as express from 'express';
import * as path from 'path';
import cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enabled: !!process.env.SENTRY_DSN,
});

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.use(cookieParser());

  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString();
      },
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;
  const nodeEnv = configService.get<string>('nodeEnv') || 'development';

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  const frontendUrl = configService.get<string>('app.frontendUrl') || 'http://localhost:3001';

  app.enableCors({
    origin:
      nodeEnv === 'development'
        ? true
        : [frontendUrl, 'http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-CSRF-Token', 'x-session-id'],
    exposedHeaders: ['Set-Cookie'],
  });

  app.use((req: any, res: any, next: any) => {
    res.header('X-Frame-Options', 'DENY');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('E-Commerce API')
    .setDescription(
      'Production-grade e-commerce API with authentication, product management, cart, and orders',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Products', 'Product management endpoints')
    .addTag('Cart', 'Shopping cart management')
    .addTag('Orders', 'Order management and checkout')
    .addTag('Payment', 'Payment processing and webhooks')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();

  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  logger.log(`Environment: ${nodeEnv}`);
  logger.log(`Rate limiting: ENABLED (short: 10/min, long: 100/hour)`);
  logger.log(`Webhook endpoint: POST /api/v1/payment/webhook`);
}

bootstrap();
