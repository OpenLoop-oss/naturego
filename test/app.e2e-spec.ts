import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userEmail: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/auth (POST)', () => {
    it('should register a new user', () => {
      userEmail = `test_${Date.now()}@example.com`;
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: userEmail,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('email', userEmail);
          expect(res.body.data).toHaveProperty('name', 'Test User');
        });
    });

    it('should fail to register with existing email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: userEmail,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(409);
    });

    it('should fail to register with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: userEmail,
          password: 'Password123!',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          accessToken = res.body.data.accessToken;
        });
    });

    it('should fail to login with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: userEmail,
          password: 'WrongPassword!',
        })
        .expect(401);
    });

    it('should fail to login with non-existent email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401);
    });
  });

  describe('/api/v1/products (GET)', () => {
    it('should get products without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('products');
          expect(res.body.data).toHaveProperty('pagination');
        });
    });

    it('should filter products by search', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?search=organic')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data.products)).toBe(true);
        });
    });

    it('should paginate products', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?page=1&limit=10')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.pagination.page).toBe(1);
          expect(res.body.data.pagination.limit).toBe(10);
        });
    });
  });

  describe('/api/v1/categories (GET)', () => {
    it('should get categories without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/categories')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data.categories)).toBe(true);
        });
    });
  });

  describe('/api/v1/cart (GET, POST)', () => {
    it('should require auth to access cart', () => {
      return request(app.getHttpServer()).get('/api/v1/cart').expect(401);
    });

    it('should get empty cart for authenticated user', () => {
      return request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('items');
          expect(Array.isArray(res.body.data.items)).toBe(true);
        });
    });
  });

  describe('/api/v1/orders (GET)', () => {
    it('should require auth to access orders', () => {
      return request(app.getHttpServer()).get('/api/v1/orders').expect(401);
    });

    it('should get empty orders for authenticated user', () => {
      return request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('orders');
          expect(Array.isArray(res.body.data.orders)).toBe(true);
        });
    });
  });

  describe('/api/v1/users/me (GET, PATCH)', () => {
    it('should get user profile', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('email', userEmail);
        });
    });

    it('should update user profile', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name' })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('name', 'Updated Name');
        });
    });
  });

  describe('/api/v1/addresses (CRUD)', () => {
    let addressId: string;

    it('should create an address', () => {
      return request(app.getHttpServer())
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          label: 'Home',
          fullName: 'Test User',
          phone: '1234567890',
          addressLine1: '123 Test Street',
          city: 'Test City',
          state: 'TS',
          postalCode: '123456',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('id');
          addressId = res.body.data.id;
        });
    });

    it('should get all addresses', () => {
      return request(app.getHttpServer())
        .get('/api/v1/addresses')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data.addresses)).toBe(true);
          expect(res.body.data.addresses.length).toBeGreaterThan(0);
        });
    });

    it('should update an address', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/addresses/${addressId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ fullName: 'Updated User' })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('fullName', 'Updated User');
        });
    });

    it('should delete an address', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/addresses/${addressId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
