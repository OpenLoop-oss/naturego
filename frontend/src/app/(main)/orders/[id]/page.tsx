'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Package,
  MapPin,
  CheckCircle,
  Clock,
  Truck,
  Home,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, Order } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { formatPrice, formatDate } from '@/lib/utils';

const statusSteps = [
  { status: 'PENDING', label: 'Order Placed', icon: Clock },
  { status: 'PROCESSING', label: 'Processing', icon: Package },
  { status: 'SHIPPED', label: 'Shipped', icon: Truck },
  { status: 'DELIVERED', label: 'Delivered', icon: Home },
];

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  PROCESSING: 'bg-blue-500',
  SHIPPED: 'bg-indigo-500',
  DELIVERED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
};

function getStatusIndex(status: string): number {
  if (status === 'CANCELLED') return -1;
  const step = statusSteps.find((s) => s.status === status);
  return step ? statusSteps.indexOf(step) : 0;
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchOrder();
  }, [isAuthenticated, params.id]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const response = await api.getOrder(params.id as string);
      setOrder(response.order);
    } catch {
      toast.error('Failed to load order');
      router.push('/orders');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-8" />
          <Skeleton className="h-64 rounded-xl mb-6" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Order not found</h2>
          <Link href="/orders">
            <Button className="mt-6">Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentStepIndex = getStatusIndex(order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order Details</h1>
            <p className="mt-1 text-muted-foreground">
              Order #{order.id.slice(0, 8)} • Placed on {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge
              variant={
                order.status === 'DELIVERED'
                  ? 'success'
                  : order.status === 'CANCELLED'
                    ? 'destructive'
                    : 'default'
              }
              className="text-sm px-3 py-1"
            >
              {order.status}
            </Badge>
            <Badge
              variant={order.paymentStatus === 'COMPLETED' ? 'success' : 'warning'}
              className="text-sm px-3 py-1"
            >
              {order.paymentStatus}
            </Badge>
          </div>
        </div>

        {/* Order Timeline */}
        <Card className="mb-6 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {isCancelled ? (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Order Cancelled
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Order Status
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isCancelled ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <p className="text-muted-foreground">This order has been cancelled.</p>
              </div>
            ) : (
              <div className="flex items-center justify-between relative">
                {/* Progress Line */}
                <div className="absolute top-6 left-0 right-0 h-0.5 bg-muted -z-10" />
                <div
                  className="absolute top-6 left-0 h-0.5 bg-primary -z-10 transition-all duration-500"
                  style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
                />

                {statusSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <div key={step.status} className="flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                          isCompleted
                            ? `${statusColors[step.status]} text-white`
                            : 'bg-muted text-muted-foreground'
                        } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <p
                        className={`mt-2 text-sm font-medium ${
                          isCompleted ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Order Items */}
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="text-lg">Items Ordered</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    <p className="text-sm font-medium mt-1">
                      {formatPrice(parseFloat(String(item.price)) * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Items ({order.items.reduce((sum, i) => sum + i.quantity, 0)})
                  </span>
                  <span>{formatPrice(order.totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(0)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(order.totalPrice)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {typeof order.shippingAddress === 'object' ? (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{order.shippingAddress.fullName}</p>
                      <p>{order.shippingAddress.addressLine1}</p>
                      {order.shippingAddress.addressLine2 && (
                        <p>{order.shippingAddress.addressLine2}</p>
                      )}
                      <p>
                        {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                        {order.shippingAddress.postalCode}
                      </p>
                      <p className="mt-2">
                        <span className="text-muted-foreground">Phone: </span>
                        {order.shippingAddress.phone}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Address not available</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
