# Quick Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker (optional, for database)

## Step 1: Start PostgreSQL

### Option A: Using Docker
```bash
docker-compose up -d
```

### Option B: Local PostgreSQL
Ensure PostgreSQL is running and create a database:
```sql
CREATE DATABASE ecommerce_db;
```

## Step 2: Install Dependencies
```bash
npm install
```

## Step 3: Setup Environment
```bash
cp .env.example .env
# Edit .env if needed (default should work for Docker)
```

## Step 4: Generate Prisma Client
```bash
npm run prisma:generate
```

## Step 5: Run Migrations
```bash
npm run prisma:migrate
# OR for quick setup:
npm run db:push
```

## Step 6: Seed Database (Creates Admin User)
```bash
npm run prisma:seed
```

## Step 7: Start Development Server
```bash
npm run start:dev
```

## Step 8: Access API
- API Base URL: http://localhost:3000/api/v1
- Swagger Docs: http://localhost:3000/api/docs

## Test Credentials
Admin user created by seed:
- Email: admin@example.com
- Password: Admin@123

## Common Commands

### Build for Production
```bash
npm run build
npm run start:prod
```

### Run Tests
```bash
npm test
```

### Lint & Format
```bash
npm run lint
npm run format
```

### Database Operations
```bash
npm run prisma:studio    # Open Prisma Studio
npm run db:reset         # Reset database
```

## API Testing Example

Register:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

Login:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}'
```

Get Products (Public):
```bash
curl http://localhost:3000/api/v1/products
```

Create Product (Admin):
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"name":"Laptop","price":999.99,"stock":50}'
```
