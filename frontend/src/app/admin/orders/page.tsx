'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Package,
  ChevronLeft,
  ChevronRight,
  Eye,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  FileText,
  History,
  RotateCcw,
  DollarSign,
  Box,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, Order, OrderStatus, OrderHistoryEntry } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { formatPrice, formatDate } from '@/lib/utils';

const statusColors: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'outline'
> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  PACKED: 'secondary',
  SHIPPED: 'info',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
  RETURNED: 'warning',
  REFUNDED: 'secondary',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
  REFUNDED: 'Refunded',
};

const validTransitions: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: ['REFUNDED'],
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
};

const cancellableStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED'];

const statusSteps = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const nextStatusMap: Record<string, { status: string; label: string; icon: typeof Clock }> = {
  PENDING: { status: 'PROCESSING', label: 'Start Processing', icon: Clock },
  PROCESSING: { status: 'SHIPPED', label: 'Mark as Shipped', icon: Truck },
  SHIPPED: { status: 'DELIVERED', label: 'Mark as Delivered', icon: CheckCircle },
  DELIVERED: { status: 'DELIVERED', label: 'Completed', icon: CheckCircle },
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [orderHistory, setOrderHistory] = useState<OrderHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; status?: string } = {
        page,
        limit: 10,
      };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      console.log('[Admin Orders] Fetching orders with params:', params);
      const response = await api.getAllOrders(params);
      console.log('[Admin Orders] Response:', response);
      let orderList = response?.orders || [];
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        orderList = orderList.filter(
          (order: Order) =>
            order.id.toLowerCase().includes(query) ||
            order.user?.name?.toLowerCase().includes(query) ||
            order.user?.email?.toLowerCase().includes(query),
        );
      }
      console.log('[Admin Orders] Order list:', orderList.length, 'orders');
      setOrders(orderList);
      setTotalPages(response?.pagination?.totalPages || 1);
      setTotalOrders(response?.pagination?.total || 0);
    } catch (error: any) {
      console.error('[Admin Orders] Error:', error);
      toast.error('Failed to load orders: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    fetchOrders();
  }, [isAuthenticated, user, router, fetchOrders]);

  const openStatusDialog = (order: Order) => {
    setSelectedOrder(order);
    const validNext = validTransitions[order.status];
    setNewStatus(validNext?.[0] || order.status);
    setTrackingNumber(order.trackingNumber || '');
    setAdminNotes(order.notes || '');
    setIsStatusDialogOpen(true);
  };

  const fetchOrderHistory = async (orderId: string) => {
    setLoadingHistory(true);
    try {
      const result = await api.getOrderHistory(orderId);
      setOrderHistory(result.history || []);
    } catch {
      setOrderHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder) return;

    setUpdatingOrderId(selectedOrder.id);
    try {
      await api.updateOrderStatus(
        selectedOrder.id,
        newStatus,
        trackingNumber || undefined,
        adminNotes || undefined,
      );
      toast.success('Order status updated successfully');
      setIsStatusDialogOpen(false);
      fetchOrders();
    } catch {
      toast.error('Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen py-8 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Orders Management</h1>
          <p className="mt-2 text-muted-foreground">Manage, process and track customer orders</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold">
                    {orders.filter((o) => o.status === 'PENDING').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Box className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="text-xl font-bold">
                    {
                      orders.filter((o) => ['CONFIRMED', 'PROCESSING', 'PACKED'].includes(o.status))
                        .length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In Transit</p>
                  <p className="text-xl font-bold">
                    {
                      orders.filter((o) => ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status))
                        .length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-xl font-bold">
                    {orders.filter((o) => ['DELIVERED', 'REFUNDED'].includes(o.status)).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order ID, customer name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders ({totalOrders})</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="PACKED">Packed</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="RETURNED">Returned</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchOrders} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-lg" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No orders found</p>
                {searchQuery && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your search or filter
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {orders.map((order) => (
                  <div key={order.id} className="p-6 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                            #{order.id.slice(0, 8)}
                          </span>
                          <Badge variant={statusColors[order.status]}>
                            {statusLabels[order.status] || order.status}
                          </Badge>
                          <Badge
                            variant={
                              order.paymentStatus === 'COMPLETED'
                                ? 'success'
                                : order.paymentStatus === 'REFUNDED'
                                  ? 'secondary'
                                  : 'warning'
                            }
                          >
                            {order.paymentStatus}
                          </Badge>
                          {order.trackingNumber && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {order.trackingNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">
                              {order.user?.name || order.guestName || 'Unknown Customer'}
                            </p>
                            {order.guestEmail && (
                              <Badge variant="outline" className="text-xs">
                                Guest
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {order.user?.email || order.guestEmail || 'No email'}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            <span>{order.items.reduce((sum, i) => sum + i.quantity, 0)} items</span>
                            <span>{formatDate(order.createdAt)}</span>
                            {order.notes && (
                              <span className="flex items-center gap-1 text-blue-600">
                                <FileText className="h-3 w-3" /> Has notes
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            {formatPrice(Number(order.totalPrice))}
                          </p>
                        </div>

                        <div className="flex -space-x-2">
                          {order.items.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className="w-10 h-10 rounded-lg overflow-hidden border-2 border-background bg-muted"
                            >
                              {item.product.imageUrl ? (
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="w-10 h-10 rounded-lg bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                              +{order.items.length - 3}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 border-l pl-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openOrderDetail(order)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {validTransitions[order.status]?.length > 0 && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openStatusDialog(order)}
                              disabled={updatingOrderId === order.id}
                            >
                              {updatingOrderId === order.id ? (
                                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-1" />
                              )}
                              Update Status
                            </Button>
                          )}
                          {cancellableStatuses.includes(order.status) && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setNewStatus('CANCELLED');
                                setIsStatusDialogOpen(true);
                              }}
                              disabled={updatingOrderId === order.id}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-4">
              Page {page} of {totalPages} ({totalOrders} total)
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Dialog
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (open && selectedOrder) {
            fetchOrderHistory(selectedOrder.id);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              {selectedOrder && `#${selectedOrder.id.slice(0, 8).toUpperCase()}`}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant={statusColors[selectedOrder.status]}>
                  {statusLabels[selectedOrder.status] || selectedOrder.status}
                </Badge>
                <Badge
                  variant={
                    selectedOrder.paymentStatus === 'COMPLETED'
                      ? 'success'
                      : selectedOrder.paymentStatus === 'REFUNDED'
                        ? 'secondary'
                        : 'warning'
                  }
                >
                  {selectedOrder.paymentStatus}
                </Badge>
                {selectedOrder.trackingNumber && (
                  <Badge variant="secondary">
                    <Truck className="h-3 w-3 mr-1" />
                    {selectedOrder.trackingNumber}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">
                    {selectedOrder.user?.name || selectedOrder.guestName || 'Unknown'}
                  </p>
                  <p className="text-sm">
                    {selectedOrder.user?.email || selectedOrder.guestEmail || 'No email'}
                  </p>
                  {selectedOrder.guestEmail && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Guest Order
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">{formatDate(selectedOrder.createdAt)}</p>
                </div>
              </div>

              {selectedOrder.shippingAddress && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Shipping Address</p>
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    {typeof selectedOrder.shippingAddress === 'string' ? (
                      (() => {
                        try {
                          const addr = JSON.parse(selectedOrder.shippingAddress);
                          return (
                            <>
                              <p className="font-medium">{addr.fullName}</p>
                              <p>
                                {addr.addressLine1}
                                {addr.addressLine2 && `, ${addr.addressLine2}`}
                              </p>
                              <p>
                                {addr.city}, {addr.state} {addr.postalCode}
                              </p>
                              <p>Phone: {addr.phone}</p>
                            </>
                          );
                        } catch {
                          return <p>{selectedOrder.shippingAddress}</p>;
                        }
                      })()
                    ) : (
                      <>
                        <p className="font-medium">{selectedOrder.shippingAddress.fullName}</p>
                        <p>{selectedOrder.shippingAddress.addressLine1}</p>
                        <p>
                          {selectedOrder.shippingAddress.city},{' '}
                          {selectedOrder.shippingAddress.state}{' '}
                          {selectedOrder.shippingAddress.postalCode}
                        </p>
                        <p>Phone: {selectedOrder.shippingAddress.phone}</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {selectedOrder.notes && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Admin Notes</p>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Order Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {item.product.imageUrl && (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-medium">
                        {formatPrice(Number(item.price) * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <History className="h-4 w-4" />
                  <p className="text-sm text-muted-foreground">Order History</p>
                </div>
                {loadingHistory ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 rounded" />
                    ))}
                  </div>
                ) : orderHistory.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {orderHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 p-2 bg-muted/50 rounded text-sm"
                      >
                        <div className="flex-1">
                          <p className="font-medium">
                            {entry.action === 'STATUS_CHANGE' &&
                            entry.oldValue &&
                            entry.newValue ? (
                              <>
                                <span className="text-muted-foreground">
                                  {statusLabels[entry.oldValue] || entry.oldValue}
                                </span>
                                {' → '}
                                <span>{statusLabels[entry.newValue] || entry.newValue}</span>
                              </>
                            ) : (
                              entry.description || entry.action
                            )}
                          </p>
                          {entry.description && entry.action !== 'STATUS_CHANGE' && (
                            <p className="text-xs text-muted-foreground">{entry.description}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(entry.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No history available</p>
                )}
              </div>

              <div className="flex justify-between items-center border-t pt-4">
                <p className="font-medium">Total</p>
                <p className="text-xl font-bold text-green-600">
                  {formatPrice(Number(selectedOrder.totalPrice))}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              {selectedOrder && `Order #${selectedOrder.id.slice(0, 8).toUpperCase()}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newStatus">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {selectedOrder &&
                    validTransitions[selectedOrder.status]?.map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusLabels[status] || status}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Current: {statusLabels[selectedOrder?.status || ''] || selectedOrder?.status}
              </p>
            </div>

            {['SHIPPED', 'OUT_FOR_DELIVERY'].includes(newStatus) && (
              <div className="space-y-2">
                <Label htmlFor="trackingNumber">Tracking Number</Label>
                <Input
                  id="trackingNumber"
                  placeholder="Enter tracking number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The customer will receive an email with this tracking number
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Admin Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add internal notes about this order..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={updatingOrderId !== null}
              variant={newStatus === 'CANCELLED' ? 'destructive' : 'default'}
            >
              {updatingOrderId !== null ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
