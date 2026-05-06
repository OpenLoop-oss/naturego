# Ecommerce Admin System - Implementation Plan

**Created:** 2026-03-29  
**Status:** Ready for Implementation  
**Based on:** System Analysis dated 2026-03-29

---

## Current System Assessment

### What's Working ✅

- JWT authentication with refresh tokens
- Role-based access (USER/ADMIN)
- Order creation with stock decrement
- Real-time notifications (SSE)
- Email notifications via Resend
- Transaction-protected database operations

### What Needs Fixing 🔴

| Issue                           | Severity | Status   | Impact                           |
| ------------------------------- | -------- | -------- | -------------------------------- |
| Fake payment processing         | CRITICAL | Deferred | No actual payments collected     |
| No refund processing            | CRITICAL | Deferred | Customer refunds never processed |
| Race condition in stock         | HIGH     | Fixed    | Can result in negative stock     |
| No status transition validation | HIGH     | Fixed    | Admin can set any status         |
| No order history/audit          | MEDIUM   | Fixed    | No accountability                |
| No stock history/audit          | MEDIUM   | Fixed    | No inventory traceability        |
| No product variants             | HIGH     | Pending  | Can't sell sizes/colors          |
| LOW_STOCK alerts not wired      | MEDIUM   | Fixed    | Admin unaware of low stock       |

---

## Implementation Phases

### Phase 1: Critical Fixes (Day 1-2)

**Goal:** Make the system production-safe for payments and inventory

#### 1.1 Real Razorpay Integration

- [ ] Create `src/modules/payment/razorpay.service.ts`
- [ ] Implement `createOrder()` for checkout
- [ ] Implement `verifyPayment()` webhook handler
- [ ] Implement `refundPayment()` for refunds
- [ ] Remove `simulatePayment()` mock code

**Status:** Deferred - `simulatePayment()` placeholder ready for replacement

#### 1.2 Atomic Stock Decrement

- [x] Fix race condition in `orders.service.ts` checkout
- [x] Use database-level atomic operations (`decrement`)
- [x] Add stock movement tracking

**Status:** Completed

#### 1.3 Order Status State Machine

- [x] Define valid status transitions in `constants/order-status.ts`
- [x] Add `validateStatusTransition()` function (`canTransitionOrder`)
- [x] Apply validation in `updateOrderStatus()`
- [x] Update frontend to only show valid next actions

**Status:** Completed

#### 1.4 Order History Table

- [x] Add `OrderHistory` model to schema
- [x] Log all status changes with user ID
- [x] Log tracking number additions
- [x] Update API response to include history (`GET :id/history`)

**Status:** Completed

---

### Phase 2: Inventory System (Day 3-4)

**Goal:** Complete stock traceability and variant support

#### 2.1 Stock Movement Audit

- [x] Add `StockMovement` model to schema
- [x] Log all stock changes (sales, returns, adjustments) in checkout/cancel
- [ ] Create `src/modules/inventory/inventory.service.ts`
- [ ] Add stock adjustment endpoint for admins

**Status:** Partial - Stock movement logging active, adjustment endpoint pending

#### 2.2 Product Variants

- [ ] Add `ProductVariant` model to schema
- [ ] Update Product model with `sku`, `costPrice`, `lowStockThreshold`
- [ ] Create variant CRUD endpoints
- [ ] Update cart/checkout to use variants
- [ ] Update frontend product forms

**Status:** Not started

#### 2.3 Wire Up Low Stock Alerts

- [x] Call `emitLowStock()` after checkout when threshold reached
- [x] Add low stock threshold config (`lowStockThreshold` on Product)
- [ ] Dashboard low stock widget

**Status:** Core functionality completed - dashboard widget pending

---

### Phase 3: Admin Dashboard (Day 5)

**Goal:** Unified dashboard API and improved UI

#### 3.1 Dashboard API Endpoint

- [ ] Create `src/modules/admin/admin.controller.ts`
- [ ] Create `src/modules/admin/admin.service.ts`
- [ ] Single `/admin/dashboard` endpoint returns:
  - Total revenue (with date filters)
  - Order counts by status
  - Low stock count
  - Recent orders
  - Top products
- [ ] Update frontend to use single endpoint

#### 3.2 Admin Users Page

- [ ] Create `frontend/src/app/admin/users/page.tsx`
- [ ] List all users with roles
- [ ] Edit user role
- [ ] Deactivate/activate users

---

### Phase 4: Enhanced Features (Day 6-7)

**Goal:** Production-ready features

#### 4.1 Audit Log Table

- [ ] Add `AuditLog` model to schema
- [ ] Log all admin actions (product create/update/delete, user changes)
- [ ] Create audit log viewer for admins

#### 4.2 Bulk Operations

- [ ] Bulk product update endpoint
- [ ] Bulk stock update endpoint
- [ ] CSV export/import for products

#### 4.3 Enhanced RBAC

- [ ] Add roles: MANAGER, SUPPORT, SUPER_ADMIN
- [ ] Update guards for granular permissions
- [ ] Add role-based UI restrictions

---

## Database Schema Changes

### New Tables/Fields

```prisma
// New enums
enum Role {
  USER
  MANAGER
  SUPPORT
  ADMIN
  SUPER_ADMIN
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  PACKED
  SHIPPED
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
  RETURNED
  REFUNDED
}

enum StockMovementType {
  INITIAL
  SALE
  RETURN
  ADJUSTMENT_IN
  ADJUSTMENT_OUT
  DAMAGED
  RESERVED
  RESERVED_RELEASED
}

// New models
model ProductVariant {
  id         String  @id @default(uuid())
  sku        String  @unique
  name       String
  price      Decimal?
  stock      Int     @default(0)
  attributes Json?
  productId  String
  product    Product @relation(...)
}

model StockMovement {
  id            String           @id @default(uuid())
  type          StockMovementType
  quantity      Int
  referenceId   String?
  referenceType String?
  reason        String?
  variantId     String?
  productId     String?
  userId        String?
  createdAt     DateTime         @default(now())
}

model OrderHistory {
  id          String   @id @default(uuid())
  action      String
  oldValue    String?
  newValue    String?
  description String?
  orderId     String
  userId      String?
  createdAt   DateTime @default(now())
}

model AuditLog {
  id         String   @id @default(uuid())
  action     String
  entityType String
  entityId   String?
  oldValue   Json?
  newValue   Json?
  userId     String?
  ipAddress  String?
  createdAt  DateTime @default(now())
}
```

---

## File Changes Summary

### Backend (NestJS)

| File                                            | Action | Description                | Status  |
| ----------------------------------------------- | ------ | -------------------------- | ------- |
| `src/modules/payment/razorpay.service.ts`       | CREATE | Real payment integration   | Pending |
| `src/modules/payment/razorpay.controller.ts`    | CREATE | Webhook endpoints          | Pending |
| `src/modules/payment/webhook.controller.ts`     | CREATE | Payment webhooks           | Pending |
| `src/modules/inventory/inventory.service.ts`    | CREATE | Stock management           | Pending |
| `src/modules/inventory/inventory.controller.ts` | CREATE | Admin stock endpoints      | Pending |
| `src/modules/admin/admin.service.ts`            | CREATE | Dashboard data             | Pending |
| `src/modules/admin/admin.controller.ts`         | CREATE | Admin endpoints            | Pending |
| `src/modules/orders/orders.service.ts`          | UPDATE | Status validation, history | ✅ Done |
| `src/modules/orders/order-history.service.ts`   | CREATE | Order history              | ✅ Done |
| `src/common/constants/order-status.ts`          | CREATE | Status transitions         | ✅ Done |
| `prisma/schema.prisma`                          | UPDATE | New models/enums           | ✅ Done |

### Frontend (Next.js)

| File                                | Action | Description             | Status  |
| ----------------------------------- | ------ | ----------------------- | ------- |
| `src/app/admin/dashboard/page.tsx`  | UPDATE | Use dashboard API       | Pending |
| `src/app/admin/orders/page.tsx`     | UPDATE | Status state machine UI | ✅ Done |
| `src/app/admin/products/page.tsx`   | UPDATE | Variants support        | Pending |
| `src/app/admin/users/page.tsx`      | CREATE | User management         | Pending |
| `src/app/admin/inventory/page.tsx`  | CREATE | Stock management UI     | Pending |
| `src/app/admin/audit-logs/page.tsx` | CREATE | Audit log viewer        | Pending |
| `src/components/admin/*`            | CREATE | Shared admin components | Pending |
| `src/lib/api/client.ts`             | UPDATE | New endpoints           | ✅ Done |

---

## Order Status Flow

```
┌─────────┐
│ PENDING │ ← Order placed, awaiting payment
└────┬────┘
     │
     ├──────────────────────────┐
     ▼                          ▼
┌─────────┐              ┌───────────┐
│CONFIRMED│              │ CANCELLED │
└────┬────┘              └─────┬─────┘
     │                         │
     ▼                         ▼
┌──────────┐             ┌──────────┐
│PROCESSING│             │ REFUNDED │
└────┬─────┘             └──────────┘
     │
     ▼
┌────────┐
│ PACKED │ ← Ready for shipping
└───┬────┘
    │
    ▼
┌────────┐
│ SHIPPED│ ← Handed to carrier
└───┬────┘
    │
    ▼
┌─────────────────┐
│ OUT_FOR_DELIVERY│
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌──────────┐ ┌────────┐
│DELIVERED │ │RETURNED│
└────┬─────┘ └───┬────┘
     │            │
     ▼            ▼
┌──────────┐ ┌──────────┐
│ RETURNED │ │ REFUNDED │
└──────────┘ └──────────┘
```

---

## API Endpoints

### Admin Endpoints

```
GET    /api/v1/admin/dashboard          - Dashboard stats
GET    /api/v1/admin/users              - List users
PATCH  /api/v1/admin/users/:id          - Update user
GET    /api/v1/admin/audit-logs         - Audit logs

GET    /api/v1/inventory/products      - Stock overview
GET    /api/v1/inventory/variants/:id  - Stock history
POST   /api/v1/inventory/adjust        - Manual adjustment
```

### Enhanced Order Endpoints

```
GET    /api/v1/orders/:id/history      - Order history
GET    /api/v1/orders/:id/timeline     - Visual timeline
```

### Payment Endpoints

```
POST   /api/v1/payment/create           - Create payment order
POST   /api/v1/payment/webhook         - Razorpay webhook
POST   /api/v1/payment/refund          - Process refund
```

---

## Testing Checklist

### Phase 1 Testing

- [ ] Place order with real payment flow
- [x] Verify stock decrements atomically (concurrent requests)
- [x] Test invalid status transitions are blocked
- [x] Verify order history is recorded
- [ ] Test refund flow end-to-end

### Phase 2 Testing

- [ ] Create product with variants
- [ ] Add variant to cart
- [ ] Checkout with variant
- [ ] Verify stock movement logs
- [ ] Test low stock alert

### Phase 3 Testing

- [ ] Dashboard loads with single API call
- [ ] Admin can change user roles
- [ ] User management CRUD works

---

## Success Criteria

The system is production-ready when:

1. **Payments work end-to-end** - Real Razorpay integration, no mocks
2. **Inventory is accurate** - No overselling, no negative stock
3. **Audit trail exists** - Every stock and order change is logged
4. **Status transitions are controlled** - State machine prevents invalid states
5. **Admin dashboard is useful** - Single API call, actionable insights
6. **Product variants work** - Can sell products with options

---

## Notes

- Keep backward compatibility where possible
- All new endpoints require JWT + ADMIN role
- All changes should include database migrations
- Update Swagger docs for new endpoints
- Write unit tests for critical paths (stock, payments, status)
