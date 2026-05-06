-- Migration: Add OrderHistory, StockMovement, AuditLog tables and update enums
-- Created: 2026-03-29

-- Add new enum values to OrderStatus
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PACKED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'OUT_FOR_DELIVERY';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RETURNED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

-- Add new enum values to PaymentStatus
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';

-- Add new enum values to Role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MANAGER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPPORT';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- Add isActive column to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Add carrier, customerNotes, completedAt columns to orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "carrier" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customerNotes" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP;

-- Create OrderHistory table
CREATE TABLE IF NOT EXISTS "order_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "orderId" UUID NOT NULL,
    "userId" UUID,
    CONSTRAINT "order_history_pkey" PRIMARY KEY ("id")
);

-- Add foreign key for order_history
ALTER TABLE "order_history" ADD CONSTRAINT "order_history_orderId_fkey" 
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE;

ALTER TABLE "order_history" ADD CONSTRAINT "order_history_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "order_history_orderId_idx" ON "order_history"("orderId");
CREATE INDEX IF NOT EXISTS "order_history_userId_idx" ON "order_history"("userId");
CREATE INDEX IF NOT EXISTS "order_history_createdAt_idx" ON "order_history"("createdAt");

-- Create StockMovement table
CREATE TYPE "StockMovementType" AS ENUM (
    'INITIAL', 'SALE', 'RETURN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGED', 'RESERVED', 'RESERVED_RELEASED'
);

CREATE TABLE IF NOT EXISTS "stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "productId" UUID,
    "userId" UUID,
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey" 
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL;

ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "stock_movements_productId_idx" ON "stock_movements"("productId");
CREATE INDEX IF NOT EXISTS "stock_movements_userId_idx" ON "stock_movements"("userId");
CREATE INDEX IF NOT EXISTS "stock_movements_type_idx" ON "stock_movements"("type");
CREATE INDEX IF NOT EXISTS "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- Add columns to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sku" TEXT UNIQUE;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "lowStockThreshold" INTEGER NOT NULL DEFAULT 10;

-- Create AuditLog table
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "userId" UUID,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_idx" ON "audit_logs"("entityType");
CREATE INDEX IF NOT EXISTS "audit_logs_entityId_idx" ON "audit_logs"("entityId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");

-- Insert initial stock movements for existing products (optional - for audit trail)
-- This would track the initial stock as of now
