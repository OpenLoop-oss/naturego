'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, ShoppingBag, Trash2, Minus, Plus, Loader2, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCartStore } from '@/lib/stores/cart-store';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
  const router = useRouter();
  const { items, itemCount, subtotal, fetchCart, updateItem, removeItem, isLoading } =
    useCartStore();
  const [updating, setUpdating] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setUpdating(itemId);
    try {
      await updateItem(itemId, newQuantity);
    } catch {
      toast.error('Failed to update quantity');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setRemoving(itemId);
    try {
      await removeItem(itemId);
      toast.success('Item removed from cart');
    } catch {
      toast.error('Failed to remove item');
    } finally {
      setRemoving(null);
    }
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="min-h-screen py-12 bg-cream">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-cream">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 text-sm text-sage mb-2">
              <Leaf className="h-4 w-4" />
              <span>Your Cart</span>
            </div>
            <h1 className="text-4xl font-display font-bold text-forest">Shopping Cart</h1>
            <p className="mt-1 text-sage">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm text-sage hover:text-forest transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Continue Shopping
          </Link>
        </div>

        {items.length === 0 ? (
          <Card className="py-20 rounded-2xl border-sand/30 bg-white/80">
            <CardContent className="text-center">
              <div className="w-20 h-20 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="h-10 w-10 text-sage/50" />
              </div>
              <h2 className="text-2xl font-display font-semibold text-forest">
                Your cart is empty
              </h2>
              <p className="text-sage mt-2">Add some organic products to get started</p>
              <Link href="/products">
                <Button className="mt-6 rounded-full bg-gradient-to-r from-forest to-forest-light">
                  Browse Products
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden animate-fade-in rounded-2xl border-sand/30 bg-white/80"
                >
                  <CardContent className="p-5">
                    <div className="flex gap-5">
                      {/* Product Image */}
                      <Link href={`/product/${item.productId}`} className="flex-shrink-0">
                        <div className="w-28 h-28 rounded-xl overflow-hidden bg-gradient-to-br from-sand-light/30 to-cream">
                          {item.product.imageUrl ? (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Leaf className="h-10 w-10 text-sage/30" />
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/product/${item.productId}`}
                          className="font-display font-semibold text-forest hover:text-sage transition-colors line-clamp-1 text-lg"
                        >
                          {item.product.name}
                        </Link>
                        <p className="mt-1 font-bold text-terracotta text-xl">
                          {formatPrice(parseFloat(String(item.product.price)))}
                        </p>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-4 mt-4">
                          <div className="flex items-center border border-sand/50 rounded-xl overflow-hidden bg-white">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-none text-forest hover:bg-sage/10"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1 || updating === item.id}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-14 text-center font-semibold text-forest">
                              {updating === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                              ) : (
                                item.quantity
                              )}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-none text-forest hover:bg-sage/10"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              disabled={updating === item.id}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-terracotta hover:text-terracotta hover:bg-terracotta/10"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={removing === item.id}
                          >
                            {removing === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right">
                        <p className="font-bold text-xl text-forest">
                          {formatPrice(parseFloat(String(item.product.price)) * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 animate-slide-up rounded-2xl border-sand/30 bg-white/80">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-sage">Subtotal ({itemCount} items)</span>
                    <span className="text-forest font-medium">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-sage">Shipping</span>
                    <span className="text-olive font-medium">Free</span>
                  </div>
                  <div className="border-t border-sand/30 pt-4 flex justify-between font-semibold text-xl">
                    <span className="text-forest">Total</span>
                    <span className="text-terracotta">{formatPrice(subtotal)}</span>
                  </div>
                  <Button
                    className="w-full rounded-xl bg-gradient-to-r from-forest to-forest-light hover:shadow-xl hover:shadow-forest/20 shadow-lg text-lg py-6"
                    size="lg"
                    onClick={() => router.push('/checkout')}
                  >
                    <ShoppingBag className="h-5 w-5 mr-2" />
                    Proceed to Checkout
                  </Button>
                  <div className="flex items-center justify-center gap-2 text-xs text-sage">
                    <Leaf className="h-3 w-3 text-olive" />
                    <span>Free shipping on all orders</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
