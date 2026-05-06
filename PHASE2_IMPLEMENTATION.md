# E-Commerce API - Phase 2 Implementation

## ✅ Completed Features

### Cart Module (`/api/v1/cart`)
- **Add to Cart** - Add products with stock validation
- **View Cart** - Get all items with total price calculation
- **Update Quantity** - Modify item quantities (stock checked)
- **Remove Items** - Delete specific items from cart
- **User Isolation** - Users can only access their own cart

### Orders Module (`/api/v1/orders`)
- **Checkout** - Convert cart to order with automatic stock deduction
- **Order History** - View past orders with pagination
- **Order Details** - Get specific order information
- **Payment Simulation** - Mock payment status updates
- **Stock Management** - Automatic deduction on checkout

## 🏗️ Architecture

### Database Models
```
User (existing)
  ↓
CartItem (NEW)
  ↓
Product (existing)
  ↓
Order (NEW)
  ↓
OrderItem (NEW)
```

### Module Structure
```
src/modules/
├── cart/
│   ├── cart.controller.ts
│   ├── cart.service.ts
│   ├── cart.module.ts
│   ├── cart.service.spec.ts
│   └── dto/
│       ├── add-to-cart.dto.ts
│       ├── update-cart-item.dto.ts
│       └── index.ts
│
├── orders/
│   ├── orders.controller.ts
│   ├── orders.service.ts
│   ├── orders.module.ts
│   ├── orders.service.spec.ts
│   └── dto/
│       ├── get-orders.dto.ts
│       └── index.ts
│
├── auth/ (existing)
├── users/ (existing)
└── products/ (existing)
```

## 🔒 Security Features

### Authentication & Authorization
- ✅ JWT authentication required for all cart/order endpoints
- ✅ Role-based access: Only `USER` role can access (ADMIN blocked)
- ✅ User isolation: Users can only access their own data
- ✅ Ownership validation on all operations

### Data Validation
- ✅ Stock availability check before adding to cart
- ✅ Stock validation before quantity updates
- ✅ Stock check before checkout
- ✅ Input validation using class-validator

### Error Handling
- ✅ 404 for missing products/cart items/orders
- ✅ 400 for empty cart, insufficient stock, invalid input
- ✅ 403 for unauthorized access attempts
- ✅ Consistent error response format

## 🚀 Quick Start

### 1. Update Database Schema
```bash
# Generate Prisma client with new models
npm run prisma:generate

# Run migrations
npm run prisma:migrate
# OR for development:
npm run db:push
```

### 2. Start Server
```bash
npm run start:dev
```

### 3. Test the Flow

#### Add Product to Cart
```bash
curl -X POST http://localhost:3000/api/v1/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productId": "UUID-HERE",
    "quantity": 2
  }'
```

#### View Cart
```bash
curl http://localhost:3000/api/v1/cart \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Cart Item
```bash
curl -X PATCH http://localhost:3000/api/v1/cart/CART_ITEM_UUID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"quantity": 5}'
```

#### Checkout
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### View Orders
```bash
curl http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📊 Response Examples

### Cart Response
```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "items": [
      {
        "id": "uuid",
        "quantity": 2,
        "product": {
          "id": "uuid",
          "name": "Laptop",
          "price": 999.99,
          "imageUrl": "https://..."
        }
      }
    ],
    "summary": {
      "totalItems": 2,
      "totalPrice": 1999.98
    }
  }
}
```

### Order Response
```json
{
  "success": true,
  "message": "Order created successfully. Payment completed.",
  "data": {
    "id": "order-uuid",
    "totalPrice": 1999.98,
    "status": "PENDING",
    "paymentStatus": "COMPLETED",
    "items": [...],
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

## 🧪 Testing

Run unit tests:
```bash
npm test
```

Run specific test files:
```bash
npm test -- cart.service.spec.ts
npm test -- orders.service.spec.ts
```

## 📝 API Documentation

Swagger documentation is available at:
```
http://localhost:3000/api/docs
```

New endpoints will appear under:
- **Cart** - Shopping cart management
- **Orders** - Order management and checkout

## 🔄 Workflow Example

1. **Login/Register** to get JWT token
2. **Browse Products** → `GET /api/v1/products`
3. **Add to Cart** → `POST /api/v1/cart`
4. **Update Quantities** → `PATCH /api/v1/cart/:id`
5. **View Cart** → `GET /api/v1/cart`
6. **Checkout** → `POST /api/v1/orders`
7. **View Orders** → `GET /api/v1/orders`

## 🛡️ Security Notes

### What ADMIN Cannot Do:
- ❌ Add items to cart
- ❌ View cart
- ❌ Checkout orders
- ❌ Access order history

### What Users Can Only Do:
- ✅ Access their own cart
- ✅ Modify their own cart items
- ✅ View their own orders
- ✅ Checkout their own cart

## 📦 Dependencies Added
No new dependencies required - uses existing packages:
- `@nestjs/common`
- `@nestjs/passport`
- `@prisma/client`
- `class-validator`

## 🔧 Configuration

No additional environment variables required. Uses existing:
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`

## 📈 Next Steps (Phase 3 - Optional)

Potential features for future phases:
- Order status updates (ADMIN)
- Payment gateway integration (Stripe)
- Email notifications
- Order cancellation
- Product reviews/ratings
- Wishlist
- Shipping addresses
- Order tracking
- Admin order management dashboard

## 🐛 Troubleshooting

### Common Issues

**"Product not found" error**
- Verify product UUID is correct
- Check if product exists in database

**"Insufficient stock" error**
- Product stock is lower than requested quantity
- Reduce quantity or choose different product

**"Cart is empty" error on checkout**
- Add items to cart first
- Use `POST /api/v1/cart` to add items

**"Order not found" error**
- Verify order UUID is correct
- Ensure you're logged in as the order owner
