#!/bin/bash

set -e

# -----------------------------
# Full E-Commerce Flow Test
# -----------------------------

API_BASE="http://localhost:3000/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }

# -----------------------------
# Step 1: Login as admin to create products
# -----------------------------
echo ""
echo "=========================================="
echo "FULL E-COMMERCE FLOW TEST"
echo "=========================================="
echo ""

log "Step 1: Admin login..."
ADMIN_RESP=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}')

ADMIN_TOKEN=$(echo "$ADMIN_RESP" | jq -r '.data.data.accessToken // .accessToken')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  error "Admin login failed"
  echo "$ADMIN_RESP" | jq .
  exit 1
fi
log "Admin logged in successfully"

# -----------------------------
# Step 2: Register a test user
# -----------------------------
log "Step 2: Registering test user..."
TIMESTAMP=$(date +%s)
USER_EMAIL="testuser_$TIMESTAMP@example.com"

REGISTER_RESP=$(curl -s -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"Test@123\",\"name\":\"Test User $TIMESTAMP\"}")

USER_ID=$(echo "$REGISTER_RESP" | jq -r '.data.data.id // empty')

if [ -z "$USER_ID" ]; then
  warn "User may already exist, trying login..."
fi

# Login as user
log "Step 3: User login..."
LOGIN_RESP=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"Test@123\"}")

USER_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.data.data.accessToken // .accessToken')

if [ "$USER_TOKEN" = "null" ] || [ -z "$USER_TOKEN" ]; then
  error "User login failed"
  echo "$LOGIN_RESP" | jq .
  exit 1
fi
log "User logged in: $USER_EMAIL"

# -----------------------------
# Step 4: Create sample products (if none exist)
# -----------------------------
log "Step 4: Checking products..."

PRODUCTS_RESP=$(curl -s -X GET "$API_BASE/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

TOTAL_PRODUCTS=$(echo "$PRODUCTS_RESP" | jq -r '.data.data.pagination.total // .pagination.total // 0')

PRODUCT_IDS=()

if [ "$TOTAL_PRODUCTS" -eq 0 ] || [ "$TOTAL_PRODUCTS" = "null" ]; then
  warn "No products found. Creating sample products..."

  for i in 1 2 3; do
    case $i in
      1) NAME="Laptop Pro"; DESC="High-end laptop for professionals"; PRICE=1299.99; STOCK=50;;
      2) NAME="Wireless Mouse"; DESC="Ergonomic wireless mouse"; PRICE=49.99; STOCK=100;;
      3) NAME="USB-C Hub"; DESC="Multi-port USB-C hub"; PRICE=79.99; STOCK=75;;
    esac

    CREATE_RESP=$(curl -s -X POST "$API_BASE/products" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"$NAME\",\"description\":\"$DESC\",\"price\":$PRICE,\"stock\":$STOCK,\"imageUrl\":\"https://example.com/product$i.jpg\"}")

    PROD_ID=$(echo "$CREATE_RESP" | jq -r '.data.data.id // empty')

    if [ -n "$PROD_ID" ]; then
      log "Created product: $NAME (ID: $PROD_ID)"
      PRODUCT_IDS+=("$PROD_ID")
    else
      warn "Failed to create product $i"
    fi
  done
else
  log "Found $TOTAL_PRODUCTS existing products"
  # Get product IDs from existing products
  for i in $(seq 0 $((TOTAL_PRODUCTS - 1))); do
    PROD_ID=$(echo "$PRODUCTS_RESP" | jq -r ".data.data.products[$i].id // .products[$i].id // empty")
    if [ -n "$PROD_ID" ]; then
      PRODUCT_IDS+=("$PROD_ID")
    fi
  done
fi

if [ ${#PRODUCT_IDS[@]} -eq 0 ]; then
  error "No products available. Please create products first."
  exit 1
fi

# -----------------------------
# Step 5: Add products to cart
# -----------------------------
log "Step 5: Adding products to cart..."
CART_ITEM_IDS=()

for PROD_ID in "${PRODUCT_IDS[@]}"; do
  QTY=$((RANDOM % 3 + 1))  # Random quantity 1-3

  CART_RESP=$(curl -s -X POST "$API_BASE/cart" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"productId\":\"$PROD_ID\",\"quantity\":$QTY}")

  CART_ID=$(echo "$CART_RESP" | jq -r '.data.data.id // .id // empty')

  if [ -n "$CART_ID" ]; then
    log "Added to cart (qty: $QTY), cart item ID: $CART_ID"
    CART_ITEM_IDS+=("$CART_ID")
  else
    warn "Failed to add product $PROD_ID to cart"
  fi
done

# -----------------------------
# Step 6: View cart
# -----------------------------
log "Step 6: Viewing cart..."
CART_VIEW=$(curl -s -X GET "$API_BASE/cart" \
  -H "Authorization: Bearer $USER_TOKEN")

echo "$CART_VIEW" | jq '.data.data.summary // .summary' 2>/dev/null || echo "$CART_VIEW" | jq .

# -----------------------------
# Step 7: Update cart quantities
# -----------------------------
log "Step 7: Updating cart item quantities..."
for CART_ID in "${CART_ITEM_IDS[@]}"; do
  NEW_QTY=$((RANDOM % 4 + 2))  # Random quantity 2-5

  UPDATE_RESP=$(curl -s -X PATCH "$API_BASE/cart/$CART_ID" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"quantity\":$NEW_QTY}")

  UPDATED_QTY=$(echo "$UPDATE_RESP" | jq -r '.data.data.quantity // .quantity // empty')

  if [ -n "$UPDATED_QTY" ]; then
    log "Updated cart item $CART_ID to quantity: $UPDATED_QTY"
  else
    warn "Failed to update cart item $CART_ID"
  fi
done

# -----------------------------
# Step 8: Checkout
# -----------------------------
log "Step 8: Checking out cart..."
CHECKOUT_RESP=$(curl -s -X POST "$API_BASE/orders" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json")

ORDER_ID=$(echo "$CHECKOUT_RESP" | jq -r '.data.data.id // .id // empty')

if [ -n "$ORDER_ID" ]; then
  TOTAL=$(echo "$CHECKOUT_RESP" | jq -r '.data.data.totalPrice // .totalPrice // "N/A"')
  STATUS=$(echo "$CHECKOUT_RESP" | jq -r '.data.data.status // .status // "N/A"')
  PAYMENT=$(echo "$CHECKOUT_RESP" | jq -r '.data.data.paymentStatus // .paymentStatus // "N/A"')

  log "Order created successfully!"
  log "  Order ID: $ORDER_ID"
  log "  Total: $TOTAL"
  log "  Status: $STATUS"
  log "  Payment: $PAYMENT"
else
  warn "Checkout response:"
  echo "$CHECKOUT_RESP" | jq .
fi

# -----------------------------
# Step 9: View orders
# -----------------------------
log "Step 9: Viewing user orders..."
ORDERS_RESP=$(curl -s -X GET "$API_BASE/orders" \
  -H "Authorization: Bearer $USER_TOKEN")

ORDER_COUNT=$(echo "$ORDERS_RESP" | jq -r '.data.data.pagination.total // .pagination.total // 0')

log "User has $ORDER_COUNT order(s)"

# Show order details
echo "$ORDERS_RESP" | jq '.data.data.orders // .orders' 2>/dev/null

# -----------------------------
# Summary
# -----------------------------
echo ""
echo "=========================================="
echo "FLOW TEST COMPLETED"
echo "=========================================="
log "Products processed: ${#PRODUCT_IDS[@]}"
log "Cart items added: ${#CART_ITEM_IDS[@]}"
log "Orders created: $ORDER_COUNT"
echo ""
