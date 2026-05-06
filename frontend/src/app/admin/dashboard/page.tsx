'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package,
  ShoppingBag,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  Leaf,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { formatPrice, formatDate } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/notification-bell';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    stock: number;
    imageUrl: string | null;
  }>;
  recentOrders: Array<{
    id: string;
    totalPrice: string;
    status: string;
    paymentStatus: string;
    createdAt: string;
    user: { name: string; email: string };
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    orderCount: number;
    totalRevenue: number;
    imageUrl: string | null;
  }>;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const [productsRes, ordersRes, usersRes] = await Promise.all([
        api.getProducts({ limit: 100 }),
        api.getAllOrders({ limit: 100 }),
        api.getUsers(),
      ]);

      const products = productsRes?.products || [];
      const lowStock = products.filter((p: any) => p.stock <= 10 && p.stock > 0);
      const outOfStock = products.filter((p: any) => p.stock === 0);
      const ordersList = ordersRes?.orders || [];
      const usersList = usersRes?.users || [];

      setStats({
        totalProducts: productsRes?.pagination?.total || 0,
        totalOrders: ordersRes?.pagination?.total || 0,
        totalUsers: usersList.length,
        totalRevenue: ordersList.reduce(
          (sum: number, o: any) => sum + parseFloat(String(o.totalPrice)),
          0,
        ),
        pendingOrders: ordersList.filter(
          (o: any) => o.status === 'PENDING' || o.status === 'PROCESSING',
        ).length,
        lowStockProducts: [...outOfStock, ...lowStock].slice(0, 5),
        recentOrders: ordersList as DashboardStats['recentOrders'],
        topProducts: [],
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    fetchStats();

    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user, router, fetchStats]);

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-gradient-to-b from-green-50/50 to-background">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-green-600 text-sm mb-2">
              <Leaf className="h-4 w-4" />
              <span>Admin Dashboard</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name}</h1>
            <p className="mt-2 text-muted-foreground">
              Here&apos;s what&apos;s happening with your organic store
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              {lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <NotificationBell />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="animate-fade-in border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <div className="text-3xl font-bold mt-1 text-green-600">
                    {loading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      formatPrice(stats?.totalRevenue || 0)
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-green-600 text-xs">
                    <TrendingUp className="h-3 w-3" />
                    <span>+12% from last month</span>
                  </div>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-7 w-7 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in" style={{ animationDelay: '50ms' }}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-3xl font-bold mt-1">
                    {loading ? <Skeleton className="h-8 w-16" /> : stats?.totalOrders || 0}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-blue-600 text-xs">
                    <TrendingUp className="h-3 w-3" />
                    <span>{stats?.pendingOrders || 0} pending</span>
                  </div>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <ShoppingBag className="h-7 w-7 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Products</p>
                  <p className="text-3xl font-bold mt-1">
                    {loading ? <Skeleton className="h-8 w-16" /> : stats?.totalProducts || 0}
                  </p>
                  {(stats?.lowStockProducts?.length || 0) > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-yellow-600 text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{stats?.lowStockProducts?.length} low stock</span>
                    </div>
                  )}
                </div>
                <div className="h-14 w-14 rounded-2xl bg-purple-100 flex items-center justify-center">
                  <Package className="h-7 w-7 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in" style={{ animationDelay: '150ms' }}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customers</p>
                  <p className="text-3xl font-bold mt-1">
                    {loading ? <Skeleton className="h-8 w-16" /> : stats?.totalUsers || 0}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-green-600 text-xs">
                    <TrendingUp className="h-3 w-3" />
                    <span>+5 new this week</span>
                  </div>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-orange-100 flex items-center justify-center">
                  <Users className="h-7 w-7 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Orders */}
          <Card className="lg:col-span-2 animate-slide-up">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Orders</CardTitle>
              <Link
                href="/admin/orders"
                className="text-sm text-green-600 hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : stats?.recentOrders && stats.recentOrders.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.user?.name || 'Guest'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          {formatPrice(order.totalPrice)}
                        </p>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No orders yet</p>
                  <p className="text-sm text-muted-foreground">
                    Orders will appear here once customers start buying
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Inventory Alert
              </CardTitle>
              <Link
                href="/admin/products"
                className="text-sm text-green-600 hover:underline flex items-center gap-1"
              >
                Manage <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : stats?.lowStockProducts && stats.lowStockProducts.length > 0 ? (
                <div className="space-y-3">
                  {stats.lowStockProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p
                          className={`text-xs ${product.stock === 0 ? 'text-red-600 font-medium' : 'text-yellow-600'}`}
                        >
                          {product.stock === 0 ? 'Out of stock' : `${product.stock} left`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="font-medium">All stocked up!</p>
                  <p className="text-sm text-muted-foreground">No low stock alerts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/products">
            <Card className="hover:shadow-lg transition-all cursor-pointer hover:border-green-300">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Package className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Manage Products</h3>
                    <p className="text-sm text-muted-foreground">Add or edit products</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/orders">
            <Card className="hover:shadow-lg transition-all cursor-pointer hover:border-blue-300">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Process Orders</h3>
                    <p className="text-sm text-muted-foreground">Manage & track orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/products">
            <Card className="hover:shadow-lg transition-all cursor-pointer hover:border-green-300">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <Leaf className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">View Store</h3>
                    <p className="text-sm text-muted-foreground">See customer view</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/profile">
            <Card className="hover:shadow-lg transition-all cursor-pointer hover:border-orange-300">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">My Profile</h3>
                    <p className="text-sm text-muted-foreground">Account settings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
