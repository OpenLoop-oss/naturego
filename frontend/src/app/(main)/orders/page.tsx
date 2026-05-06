'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Package, ChevronRight, ChevronLeft, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, Order } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { formatPrice, formatDate } from '@/lib/utils';

const statusColors: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info'
> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) {
      setOrders([]);
      router.push('/login');
      return;
    }
    fetchOrders();
  }, [isAuthenticated, page, router]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.getOrders({ page, limit: 10 });
      const ordersData = (response as any)?.orders || response?.orders || [];
      const paginationData = (response as any)?.pagination || { totalPages: 1 };
      setOrders(ordersData);
      setTotalPages(paginationData.totalPages || 1);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen py-12 bg-cream">
      <div className="container mx-auto px-4">
        <div className="mb-10">
          <div className="flex items-center gap-2 text-sm text-sage mb-2">
            <Leaf className="h-4 w-4" />
            <span>Your Account</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-forest">My Orders</h1>
          <p className="mt-2 text-sage">View and track your organic order history</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card className="py-20 rounded-2xl border-sand/30 bg-white/80">
            <CardContent className="text-center">
              <div className="w-20 h-20 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="h-10 w-10 text-sage/50" />
              </div>
              <h2 className="text-2xl font-display font-semibold text-forest">No orders yet</h2>
              <p className="text-sage mt-2">Start shopping to see your orders here</p>
              <Link href="/products">
                <Button className="mt-6 rounded-full bg-gradient-to-r from-forest to-forest-light">
                  Browse Products
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => (
              <Card
                key={order.id}
                className="overflow-hidden hover:shadow-lg transition-all rounded-2xl border-sand/30 bg-white/80 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                      <div>
                        <p className="text-xs text-sage uppercase tracking-wider">Order ID</p>
                        <p className="font-mono text-sm font-semibold text-forest">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={statusColors[order.status]}
                          className="rounded-full px-3 py-1 text-xs"
                        >
                          {statusLabels[order.status]}
                        </Badge>
                        <Badge
                          variant={order.paymentStatus === 'COMPLETED' ? 'success' : 'warning'}
                          className="rounded-full px-3 py-1 text-xs"
                        >
                          {order.paymentStatus === 'COMPLETED' ? 'Paid' : 'Pending'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mb-5">
                      {order.items.slice(0, 4).map((item) => (
                        <div
                          key={item.id}
                          className="w-18 h-18 rounded-xl overflow-hidden bg-gradient-to-br from-sand-light/30 to-cream"
                        >
                          {item.product.imageUrl ? (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Leaf className="h-6 w-6 text-sage/30" />
                            </div>
                          )}
                        </div>
                      ))}
                      {order.items.length > 4 && (
                        <div className="w-18 h-18 rounded-xl bg-sage/10 flex items-center justify-center text-sm text-sage font-medium">
                          +{order.items.length - 4}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-sand/30">
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-sage">Items: </span>
                          <span className="font-medium text-forest">
                            {order.items.reduce((sum, i) => sum + i.quantity, 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-sage">Date: </span>
                          <span className="font-medium text-forest">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3">
                        <p className="font-bold text-xl text-terracotta">
                          {formatPrice(order.totalPrice)}
                        </p>
                        <Link href={`/orders/${order.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full border-sage/30 text-forest hover:bg-sage/10 hover:border-sage"
                          >
                            View Details
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-xl border-sage/30 text-forest hover:bg-sage/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-sage px-4">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="rounded-xl border-sage/30 text-forest hover:bg-sage/10"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
