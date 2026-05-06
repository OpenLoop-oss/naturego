'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Heart, ShoppingBag, Trash2, ArrowLeft, Leaf, Droplets, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, WishlistItem } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCartStore } from '@/lib/stores/cart-store';
import { formatPrice } from '@/lib/utils';

export default function WishlistPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { addItem: addToCart } = useCartStore();

  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setWishlistItems([]);
      router.push('/login');
      return;
    }
    fetchWishlist();
  }, [isAuthenticated, router]);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const response = await api.getWishlist();
      setWishlistItems(response?.items || []);
    } catch {
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (productId: string, productName: string) => {
    setRemovingId(productId);
    try {
      await api.removeFromWishlist(productId);
      setWishlistItems((prev) => prev.filter((item) => item.product.id !== productId));
      toast.success(`${productName} removed from wishlist`);
    } catch {
      toast.error('Failed to remove from wishlist');
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (item: WishlistItem) => {
    if (item.product.stock === 0) {
      toast.error('This product is out of stock');
      return;
    }

    setAddingToCartId(item.product.id);
    try {
      await addToCart(item.product.id, 1);
      toast.success(`${item.product.name} added to cart`);
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCartId(null);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen py-12 bg-cream">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-sm text-sage mb-3">
            <Leaf className="h-4 w-4" />
            <span>Your Favorites</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-bold text-forest">My Wishlist</h1>
          <p className="mt-3 text-sage">
            {wishlistItems.length} {wishlistItems.length === 1 ? 'product' : 'products'} saved for
            later
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <Skeleton className="aspect-square rounded-none" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-10 w-full mt-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : wishlistItems.length === 0 ? (
          <Card className="py-20 rounded-2xl border-sand/30 bg-white/80">
            <CardContent className="text-center">
              <div className="w-20 h-20 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="h-10 w-10 text-sage/50" />
              </div>
              <h2 className="text-2xl font-display font-semibold text-forest">
                Your wishlist is empty
              </h2>
              <p className="text-sage mt-2">Start adding products you love to see them here</p>
              <Link href="/products">
                <Button className="mt-6 rounded-full bg-gradient-to-r from-forest to-forest-light">
                  <Leaf className="h-4 w-4 mr-2" />
                  Browse Products
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((item, index) => (
              <Card
                key={item.id}
                className="overflow-hidden rounded-2xl border-sand/30 bg-white/80 backdrop-blur-sm hover:shadow-xl hover:shadow-sand/20 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-0">
                  <Link href={`/product/${item.product.id}`}>
                    <div className="aspect-square overflow-hidden relative bg-gradient-to-br from-sand-light/30 to-cream">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Leaf className="h-16 w-16 text-sage/30" />
                        </div>
                      )}
                      {item.product.stock === 0 && (
                        <div className="absolute inset-0 bg-forest/60 flex items-center justify-center backdrop-blur-sm">
                          <Badge
                            variant="secondary"
                            className="rounded-full px-4 py-1.5 bg-cream text-terracotta"
                          >
                            Out of Stock
                          </Badge>
                        </div>
                      )}
                      {item.product.category && (
                        <div className="absolute top-3 left-3">
                          <Badge
                            variant="secondary"
                            className="rounded-full px-3 py-1 text-xs bg-sage/90 text-white border-0"
                          >
                            {item.product.category.name}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <Link href={`/product/${item.product.id}`}>
                        <h3 className="font-display font-semibold text-forest truncate group-hover:text-sage transition-colors line-clamp-2">
                          {item.product.name}
                        </h3>
                      </Link>
                      <button
                        onClick={() => handleRemoveFromWishlist(item.product.id, item.product.name)}
                        disabled={removingId === item.product.id}
                        className="ml-2 p-1 text-sage hover:text-terracotta transition-colors"
                      >
                        {removingId === item.product.id ? (
                          <div className="w-5 h-5 border-2 border-sage border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {item.product.description && (
                      <p className="text-sm text-sage mt-1 line-clamp-2">
                        {item.product.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xl font-bold text-terracotta">
                        {formatPrice(item.product.price)}
                      </p>
                      {item.product.stock > 0 && (
                        <div className="flex items-center gap-1 text-xs text-sage">
                          <Droplets className="h-3 w-3" />
                          <span>In Stock</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        className="flex-1 rounded-xl bg-gradient-to-r from-forest to-forest-light hover:shadow-lg shadow-md shadow-forest/10"
                        size="sm"
                        disabled={item.product.stock === 0 || addingToCartId === item.product.id}
                        onClick={() => handleAddToCart(item)}
                        isLoading={addingToCartId === item.product.id}
                      >
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                      <Link href={`/product/${item.product.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-sage/30 text-forest hover:bg-sage/10"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Continue Shopping */}
        {wishlistItems.length > 0 && (
          <div className="mt-10 text-center">
            <Link href="/products">
              <Button
                variant="outline"
                className="rounded-full border-sage/30 text-forest hover:bg-sage/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continue Shopping
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
