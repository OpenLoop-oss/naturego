# Phase 2: Cart & Orders Module

## New Database Models

### CartItem
- `id` (UUID) - Primary key
- `quantity` (Int) - Quantity in cart
- `userId` (String) - Foreign key to User
- `productId` (String) - Foreign key to Product
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp
- **Unique constraint**: [userId, productId]

### Order
- `id` (UUID) - Primary key
- `totalPrice` (Decimal) - Total order price
- `status` (Enum) - PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED
- `paymentStatus` (Enum) - PENDING, COMPLETED, FAILED, REFUNDED
- `userId` (String) - Foreign key to User
- `createdAt` (DateTime) - Creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

### OrderItem
- `id` (UUID) - Primary key
- `quantity` (Int) - Item quantity
- `price` (Decimal) - Price at time of order
- `orderId` (String) - Foreign key to Order
- `productId` (String) - Foreign key to Product
- `createdAt` (DateTime) - Creation timestamp

## API Endpoints

### Cart Endpoints (`/api/v1/cart`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Add product to cart | USER only |
| GET | `/` | Get current user's cart | USER only |
| PATCH | `/:id` | Update cart item quantity | USER only |
| DELETE | `/:id` | Remove item from cart | USER only |

### Order Endpoints (`/api/v1/orders`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Checkout cart to create order | USER only |
| GET | `/` | List user's orders | USER only |
| GET | `/:id` | Get order details | USER only |

## Features Implemented

### Cart Module
✅ Add products to cart with quantity validation  
✅ Stock availability checking  
✅ Update cart item quantities  
✅ Remove items from cart  
✅ Get cart with total price calculation  
✅ Duplicate product handling (updates quantity)  
✅ User-specific cart isolation  

### Orders Module
✅ Checkout cart to create order  
✅ Automatic stock deduction on checkout  
✅ Cart clearing after checkout  
✅ Payment simulation (PENDING → COMPLETED)  
✅ Order history retrieval  
✅ Order details retrieval  
✅ Pagination support for order listing  
✅ Status filtering for orders  

### Security
✅ JWT authentication required for all endpoints  
✅ Role-based access control (USER only)  
✅ User isolation (users can only access their own data)  
✅ Stock validation before adding/updating cart  
✅ Stock validation before checkout  

### Error Handling
✅ 404 for missing items  
✅ 400 for invalid requests  
✅ 403 for forbidden actions  
✅ Proper error messages with stock availability  

## Testing the Features

### Add Item to Cart
```bash
curl -X POST http://localhost:3000/api/v1/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId": "PRODUCT_UUID",
    "quantity": 2
  }'
```

### Get Cart
```bash
curl http://localhost:3000/api/v1/cart \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Cart Item
```bash
curl -X PATCH http://localhost:3000/api/v1/cart/CART_ITEM_UUID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"quantity": 5}'
```

### Checkout
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Orders
```bash
curl http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Order Details
```bash
curl http://localhost:3000/api/v1/orders/ORDER_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Database Setup

Run the migration to create new tables:

```bash
npm run prisma:migrate
# OR for development:
npm run db:push
```

## Workflow

1. **Browse Products** (Public)
   ```
   GET /api/v1/products
   ```

2. **Add to Cart** (Authenticated)
   ```
   POST /api/v1/cart
   ```

3. **Manage Cart**
   ```
   GET /api/v1/cart
   PATCH /api/v1/cart/:id
   DELETE /api/v1/cart/:id
   ```

4. **Checkout**
   ```
   POST /api/v1/orders
   ```

5. **View Orders**
   ```
   GET /api/v1/orders
   GET /api/v1/orders/:id
   ```

## Response Format

All endpoints return consistent response format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

## Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Error details"
}
```
