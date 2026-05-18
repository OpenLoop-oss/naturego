'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ShoppingBag, Minus, Plus, Check, Leaf, Droplets } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, Product } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCartStore } from '@/lib/stores/cart-store';
import { formatPrice } from '@/lib/utils';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const { isAuthenticated } = useAuthStore();
  const { addItem: addToCart } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await api.getProduct(productId);
        const productData = (response as any).data || (response as any);
        setProduct(productData.product || productData);
      } catch {
        toast.error('Product not found');
        router.push('/products');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, router]);

  const handleAddToCart = async () => {
    if (!product) return;

    setAddingToCart(true);
    try {
      const success = await addToCart(product.id, quantity);
      if (success) {
        setAdded(true);
        toast.success(`${quantity} x ${product.name} added to cart`);
        setTimeout(() => setAdded(false), 2000);
      }
    } catch {
      toast.error('Failed to add item to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const incrementQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12 bg-cream">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="min-h-screen py-12 bg-cream">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm text-sage hover:text-forest transition-colors mb-8 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Products
        </Link>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Product Image */}
          <div className="animate-fade-in">
            <Card className="overflow-hidden rounded-2xl border-sand/30 shadow-lg shadow-sand/20">
              <CardContent className="p-0">
                <div className="aspect-square bg-gradient-to-br from-sand-light/30 to-cream relative">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Leaf className="h-24 w-24 text-sage/30" />
                    </div>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-forest/60 flex items-center justify-center backdrop-blur-sm">
                      <Badge
                        variant="secondary"
                        className="text-lg px-6 py-2 bg-cream text-terracotta"
                      >
                        Out of Stock
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Info */}
          <div className="space-y-6 animate-slide-up">
            {product.category && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  <Leaf className="h-3 w-3 mr-1" />
                  {product.category.name}
                </Badge>
              </div>
            )}

            <div>
              <h1 className="text-3xl lg:text-4xl font-display font-bold text-forest leading-tight">
                {product.name}
              </h1>
              <p className="mt-4 text-4xl font-bold text-terracotta">
                {formatPrice(parseFloat(String(product.price)))}
              </p>
            </div>

            {/* Stock Status */}
            <div>
              {product.stock === 0 ? (
                <Badge variant="destructive" className="rounded-full px-4 py-1.5">
                  Out of Stock
                </Badge>
              ) : product.stock <= 10 ? (
                <Badge
                  variant="warning"
                  className="rounded-full px-4 py-1.5 bg-wheat/20 text-earth"
                >
                  Only {product.stock} left in stock
                </Badge>
              ) : (
                <Badge
                  variant="success"
                  className="rounded-full px-4 py-1.5 bg-olive/15 text-olive"
                >
                  <Droplets className="h-3 w-3 mr-1" />
                  In Stock
                </Badge>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-sand/30">
                <h3 className="font-display font-semibold text-forest mb-3 flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-sage" />
                  Product Details
                </h3>
                <p className="text-sage leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Quantity Selector */}
            {product.stock > 0 && (
              <div>
                <h3 className="font-display font-semibold text-forest mb-3">Quantity</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-sand/50 rounded-xl overflow-hidden bg-white">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                      className="rounded-none h-12 w-12 text-forest hover:bg-sage/10"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-16 text-center font-semibold text-forest text-lg">
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={incrementQuantity}
                      disabled={quantity >= product.stock}
                      className="rounded-none h-12 w-12 text-forest hover:bg-sage/10"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-sm text-sage">{product.stock} available</span>
                </div>
              </div>
            )}

            {/* Add to Cart Button */}
            <Button
              size="lg"
              className="w-full rounded-xl bg-gradient-to-r from-forest to-forest-light hover:shadow-xl hover:shadow-forest/20 shadow-lg shadow-forest/10 text-lg py-7"
              disabled={product.stock === 0 || addingToCart}
              onClick={handleAddToCart}
              isLoading={addingToCart}
            >
              {added ? (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Added to Cart
                </>
              ) : (
                <>
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Add to Cart - {formatPrice(parseFloat(String(product.price)) * quantity)}
                </>
              )}
            </Button>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4 pt-4 border-t border-sand/30">
              <div className="flex items-center gap-2 text-sm text-sage">
                <Leaf className="h-4 w-4 text-olive" />
                <span>100% Organic</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-sage">
                <Droplets className="h-4 w-4 text-sage" />
                <span>Farm Fresh</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-sage">
                <span className="w-2 h-2 rounded-full bg-olive" />
                <span>Natural</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
