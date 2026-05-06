# E-Commerce API

A production-grade NestJS e-commerce backend with clean architecture, featuring JWT authentication, role-based access control, and comprehensive API documentation.

## 🚀 Features

- **Authentication**: JWT-based authentication with access and refresh tokens
- **User Management**: Registration, login, profile management, role-based access
- **Product Management**: CRUD operations for products (admin only for create/update/delete)
- **Security**: Password hashing with bcrypt, JWT guards, role-based authorization
- **Validation**: DTO-based request validation using class-validator
- **Documentation**: Swagger/OpenAPI documentation
- **Error Handling**: Global exception filter with consistent API response format
- **Logging**: Request logging interceptor
- **ORM**: Prisma with PostgreSQL

## 📁 Project Structure

```
src/
├── common/                    # Shared utilities
│   ├── decorators/           # Custom decorators (CurrentUser, Roles)
│   ├── filters/              # Exception filters
│   ├── guards/               # Auth and role guards
│   └── interceptors/         # Logging and transform interceptors
├── config/                   # Configuration
│   ├── configuration.ts      # Environment configuration
│   └── interface.ts          # Type definitions
├── modules/                  # Feature modules
│   ├── auth/                # Authentication
│   ├── users/               # User management
│   └── products/            # Product management
├── prisma/                   # Database service
│   └── prisma.service.ts
├── app.module.ts             # Root module
└── main.ts                   # Application entry point

prisma/
├── schema.prisma            # Database schema
└── seed.ts                  # Database seeding
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Steps

1. **Install dependencies**

```bash
npm install
```

2. **Configure environment**

Copy the example environment file and update it with your PostgreSQL credentials:

```bash
cp .env.example .env
```

Edit `.env` with your database URL:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/ecommerce_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
PORT=3000
NODE_ENV=development
```

3. **Generate Prisma Client**

```bash
npm run prisma:generate
```

4. **Run database migrations**

```bash
npm run prisma:migrate
```

Or push the schema directly (for development):

```bash
npm run db:push
```

5. **Seed the database (creates admin user)**

```bash
npm run prisma:seed
```

Default admin credentials:
- Email: admin@example.com
- Password: Admin@123

6. **Start the application**

Development:
```bash
npm run start:dev
```

Production:
```bash
npm run build
npm run start:prod
```

## 🔗 API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register a new user |
| POST | `/login` | Login user |
| POST | `/refresh` | Refresh access token |

### Users (`/api/v1/users`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/me` | Get current user profile | Required |
| PATCH | `/me` | Update current user profile | Required |
| DELETE | `/me` | Delete current user account | Required |
| GET | `/` | Get all users | Admin only |
| GET | `/:id` | Get user by ID | Admin only |
| PATCH | `/:id` | Update user by ID | Admin only |
| DELETE | `/:id` | Delete user by ID | Admin only |

### Products (`/api/v1/products`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all products (with pagination) | Public |
| GET | `/:id` | Get product by ID | Public |
| POST | `/` | Create product | Admin only |
| PATCH | `/:id` | Update product | Admin only |
| DELETE | `/:id` | Delete product | Admin only |

## 📖 API Documentation

Once the application is running, access the Swagger documentation at:

```
http://localhost:3000/api/docs
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### Getting Started

1. **Register a user**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

2. **Login**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

3. **Use the access token**
```bash
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Token Refresh

When the access token expires, use the refresh token to get a new pair:

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## 🧪 Testing

Run unit tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:cov
```

Run e2e tests:
```bash
npm run test:e2e
```

## 🧹 Code Quality

Format code:
```bash
npm run format
```

Lint code:
```bash
npm run lint
```

## 📝 Database Schema

### User Model
- `id` (UUID) - Primary key
- `email` (String) - Unique email address
- `password` (String) - Hashed password
- `name` (String) - User's name
- `role` (Enum) - USER or ADMIN
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

### Product Model
- `id` (UUID) - Primary key
- `name` (String) - Product name
- `description` (String) - Product description
- `price` (Decimal) - Product price
- `stock` (Int) - Available stock
- `imageUrl` (String) - Product image URL
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

### RefreshToken Model
- `id` (UUID) - Primary key
- `token` (String) - Unique refresh token
- `expiresAt` (DateTime) - Token expiration
- `userId` (String) - Foreign key to User
- `createdAt` (DateTime) - Creation timestamp

## 🔒 Security Features

- Passwords hashed with bcrypt (10 salt rounds)
- JWT access tokens (15 minutes expiration)
- JWT refresh tokens (7 days expiration)
- Role-based access control (USER, ADMIN)
- Request validation with class-validator
- SQL injection prevention via Prisma ORM
- CORS enabled for development

## 📦 Dependencies

### Production
- @nestjs/common, @nestjs/core, @nestjs/platform-express
- @nestjs/config, @nestjs/jwt, @nestjs/passport
- @nestjs/swagger - API documentation
- @prisma/client - Database ORM
- bcrypt - Password hashing
- class-validator, class-transformer - Validation
- passport, passport-jwt - JWT authentication

### Development
- @nestjs/cli, @nestjs/testing
- typescript, ts-node
- prisma - Database migrations
- jest, ts-jest - Testing
- eslint, prettier - Code formatting

## 🚀 Deployment

For production deployment:

1. Set `NODE_ENV=production` in environment
2. Use strong, unique JWT secrets
3. Configure proper CORS settings
4. Set up PostgreSQL with SSL
5. Use process managers like PM2 for production

## 📄 License

MIT
