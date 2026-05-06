'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CreditCard,
  Lock,
  Loader2,
  CheckCircle,
  MapPin,
  Plus,
  Check,
  Banknote,
  Leaf,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCartStore } from '@/lib/stores/cart-store';
import { api, Address, Order } from '@/lib/api/client';
import { formatPrice } from '@/lib/utils';

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  handler?: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
  theme?: {
    color?: string;
  };
  error?: (response: RazorpayError) => void;
}

interface RazorpayInstance {
  on(event: string, callback: (response: RazorpayResponse | RazorpayError) => void): void;
  open(): void;
  close(): void;
}

interface RazorpayResponse {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

interface RazorpayError {
  error: {
    code: string;
    description: string;
    source?: string;
    step?: string;
    reason?: string;
  };
}

interface GuestInfo {
  email: string;
  name: string;
  phone: string;
}

interface GuestAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type PaymentMethod = 'RAZORPAY' | 'COD';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { items, subtotal, fetchCart, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('RAZORPAY');
  const [isGuest, setIsGuest] = useState(false);
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({ email: '', name: '', phone: '' });
  const [guestAddress, setGuestAddress] = useState<GuestAddress>({
    fullName: '',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
  });

  useEffect(() => {
    fetchCart();
    if (isAuthenticated) {
      fetchAddresses();
    }
    loadRazorpayScript();
  }, [isAuthenticated, fetchCart]);

  useEffect(() => {
    if (isAuthenticated) {
      setIsGuest(false);
    }
  }, [isAuthenticated]);

  const loadRazorpayScript = () => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  };

  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const response = await api.getAddresses();
      const addrList = Array.isArray(response) ? response : (response as any)?.addresses || [];
      setAddresses(addrList);
      const defaultAddr = addrList.find((a: Address) => a.isDefault);
      setSelectedAddress(defaultAddr || addrList[0] || null);
    } catch {
      toast.error('Failed to load addresses');
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleGuestCheckout = async () => {
    if (!guestInfo.email || !guestInfo.name || !guestInfo.phone) {
      toast.error('Please fill in your contact details');
      return;
    }
    if (
      !guestAddress.fullName ||
      !guestAddress.phone ||
      !guestAddress.addressLine1 ||
      !guestAddress.city ||
      !guestAddress.state ||
      !guestAddress.postalCode
    ) {
      toast.error('Please fill in your shipping address');
      return;
    }

    setLoading(true);
    try {
      const cartItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: guestInfo.email,
          name: guestInfo.name,
          items: cartItems,
          address: {
            ...guestAddress,
            phone: guestAddress.phone || guestInfo.phone,
          },
        }),
      });

      const data = await response.json();

      const orderData = data?.data?.data || data?.data || data;

      if (data.success) {
        setOrder({
          id: orderData.orderId || orderData.id,
          totalPrice: orderData.totalPrice,
          status: orderData.status,
          paymentStatus: orderData.paymentStatus,
          userId: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: [],
        } as Order);
        setOrderPlaced(true);
        clearCart();
        toast.success('Order placed successfully!');
      } else {
        toast.error(data.message || 'Failed to place order');
      }
    } catch (error) {
      toast.error('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (isGuest) {
      await handleGuestCheckout();
      return;
    }

    if (!selectedAddress) {
      toast.error('Please select a shipping address');
      return;
    }

    setLoading(true);

    if (paymentMethod === 'COD') {
      await placeCodOrder(selectedAddress.id);
      return;
    }

    try {
      const razorpayOrder = await api.createPaymentOrder(subtotal);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_key',
        amount: Math.round(subtotal * 100),
        currency: 'INR',
        name: 'Verdant Grove',
        description: 'Fresh organic products',
        order_id: (razorpayOrder as any).id,
        prefill: {
          name: user?.name || guestInfo.name || '',
          email: user?.email || guestInfo.email || '',
        },
        handler: async (response: { razorpay_order_id?: string; razorpay_payment_id?: string }) => {
          await verifyAndCreateOrder(response, selectedAddress?.id || '');
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
        theme: {
          color: '#2D6A4F',
        },
      };

      const Rzpay = window.Razorpay as any;
      if (Rzpay) {
        const rzp = new Rzpay(options);
        rzp.on('payment.failed', (response: { error: { description: string } }) => {
          toast.error(`Payment failed: ${response.error.description}`);
          setLoading(false);
        });
        rzp.open();
      } else {
        toast.error('Payment gateway not loaded. Please refresh and try again.');
        setLoading(false);
      }
    } catch (error) {
      const err = error as { message?: string };
      toast.error(err.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  const placeCodOrder = async (addressId: string) => {
    try {
      const orderData = await api.checkout(addressId);
      const orderResult = (orderData as any).order || orderData;
      setOrder(orderResult);
      setOrderPlaced(true);
      clearCart();
      toast.success('Order placed successfully with Cash on Delivery!');
    } catch (error) {
      const err = error as { message?: string };
      toast.error(err.message || 'Failed to place order');
      setLoading(false);
    }
  };

  const verifyAndCreateOrder = async (
    paymentResponse: { razorpay_order_id?: string; razorpay_payment_id?: string },
    addressId: string,
  ) => {
    try {
      const orderData = await api.checkout(addressId, {
        razorpayOrderId: paymentResponse.razorpay_order_id,
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
      });
      const orderResult = (orderData as any).order || orderData;
      setOrder(orderResult);
      setOrderPlaced(true);
      clearCart();
      toast.success('Order placed successfully!');
    } catch (error) {
      const err = error as { message?: string };
      toast.error(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const isGuestFormValid = () => {
    return (
      guestInfo.email &&
      guestInfo.name &&
      guestInfo.phone &&
      guestAddress.fullName &&
      guestAddress.phone &&
      guestAddress.addressLine1 &&
      guestAddress.city &&
      guestAddress.state &&
      guestAddress.postalCode
    );
  };

  if (orderPlaced && order) {
    return (
      <div className="min-h-screen py-12 bg-cream">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="text-center py-12 rounded-2xl border-sand/30 bg-white/80 animate-fade-in">
            <CardContent>
              <div className="w-24 h-24 bg-olive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-12 w-12 text-olive" />
              </div>
              <h1 className="text-3xl font-display font-bold text-forest mb-2">Order Placed!</h1>
              <p className="text-sage mb-6">
                Thank you for choosing organic. Your order has been confirmed.
              </p>

              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 mb-6 text-left border border-sand/30">
                <div className="flex justify-between mb-3">
                  <span className="text-sage">Order ID</span>
                  <span className="font-mono text-sm text-forest">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between mb-3">
                  <span className="text-sage">Total</span>
                  <span className="font-bold text-terracotta text-lg">
                    {formatPrice(order.totalPrice)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sage">Status</span>
                  <Badge variant="success" className="rounded-full px-3 py-1">
                    {order.status}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  className="w-full rounded-xl bg-gradient-to-r from-forest to-forest-light"
                  onClick={() => router.push('/orders')}
                >
                  View My Orders
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-sage/30 text-forest hover:bg-sage/10"
                  onClick={() => router.push('/products')}
                >
                  Continue Shopping
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !loading) {
    return (
      <div className="min-h-screen py-12 bg-cream">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="text-center py-12 rounded-2xl border-sand/30 bg-white/80">
            <CardContent>
              <div className="w-20 h-20 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Leaf className="h-10 w-10 text-sage/50" />
              </div>
              <h2 className="text-2xl font-display font-semibold text-forest">
                Your cart is empty
              </h2>
              <p className="text-sage mt-2 mb-6">Add some organic products before checking out</p>
              <Link href="/products">
                <Button className="rounded-full bg-gradient-to-r from-forest to-forest-light">
                  Browse Products
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-cream">
      <div className="container mx-auto px-4">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-sm text-sage hover:text-forest transition-colors mb-8 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Cart
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-sage mb-2">
            <Leaf className="h-4 w-4" />
            <span>Organic Checkout</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-forest">Checkout</h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Checkout Form */}
          <div className="space-y-6">
            {/* Guest/Logged In Toggle */}
            {!isAuthenticated && (
              <Card className="rounded-2xl border-sand/30 bg-white/80">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2 text-forest">
                    <User className="h-5 w-5 text-sage" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant={!isGuest ? 'default' : 'outline'}
                      onClick={() => {
                        setIsGuest(false);
                        router.push('/login');
                      }}
                      className={`flex-1 rounded-xl ${!isGuest ? 'bg-forest' : ''}`}
                    >
                      Login to Continue
                    </Button>
                    <Button
                      variant={isGuest ? 'default' : 'outline'}
                      onClick={() => setIsGuest(true)}
                      className={`flex-1 rounded-xl ${isGuest ? 'bg-forest' : ''}`}
                    >
                      Guest Checkout
                    </Button>
                  </div>
                  {isGuest && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-forest mb-1 block">Email</label>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          value={guestInfo.email}
                          onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-forest mb-1 block">
                            Full Name
                          </label>
                          <Input
                            placeholder="John Doe"
                            value={guestInfo.name}
                            onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                            className="rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-forest mb-1 block">
                            Phone
                          </label>
                          <Input
                            placeholder="9876543210"
                            value={guestInfo.phone}
                            onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                            className="rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Shipping Address */}
            <Card className="rounded-2xl border-sand/30 bg-white/80">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-forest">
                  <MapPin className="h-5 w-5 text-sage" />
                  Shipping Address
                </CardTitle>
                {isAuthenticated && (
                  <Link href="/addresses">
                    <Button variant="ghost" size="sm" className="text-sage hover:text-forest">
                      <Plus className="h-4 w-4 mr-1" />
                      Add New
                    </Button>
                  </Link>
                )}
              </CardHeader>
              <CardContent>
                {isGuest ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-forest mb-1 block">
                        Full Name
                      </label>
                      <Input
                        placeholder="John Doe"
                        value={guestAddress.fullName}
                        onChange={(e) =>
                          setGuestAddress({ ...guestAddress, fullName: e.target.value })
                        }
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-forest mb-1 block">Phone</label>
                      <Input
                        placeholder="9876543210"
                        value={guestAddress.phone}
                        onChange={(e) =>
                          setGuestAddress({ ...guestAddress, phone: e.target.value })
                        }
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-forest mb-1 block">
                        Address Line 1
                      </label>
                      <Input
                        placeholder="123 Main Street"
                        value={guestAddress.addressLine1}
                        onChange={(e) =>
                          setGuestAddress({ ...guestAddress, addressLine1: e.target.value })
                        }
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-forest mb-1 block">
                        Address Line 2 (Optional)
                      </label>
                      <Input
                        placeholder="Apartment, suite, etc."
                        value={guestAddress.addressLine2 || ''}
                        onChange={(e) =>
                          setGuestAddress({ ...guestAddress, addressLine2: e.target.value })
                        }
                        className="rounded-xl"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-forest mb-1 block">City</label>
                        <Input
                          placeholder="Mumbai"
                          value={guestAddress.city}
                          onChange={(e) =>
                            setGuestAddress({ ...guestAddress, city: e.target.value })
                          }
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-forest mb-1 block">State</label>
                        <Input
                          placeholder="Maharashtra"
                          value={guestAddress.state}
                          onChange={(e) =>
                            setGuestAddress({ ...guestAddress, state: e.target.value })
                          }
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-forest mb-1 block">
                        Postal Code
                      </label>
                      <Input
                        placeholder="400001"
                        value={guestAddress.postalCode}
                        onChange={(e) =>
                          setGuestAddress({ ...guestAddress, postalCode: e.target.value })
                        }
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                ) : loadingAddresses ? (
                  <Skeleton className="h-32 rounded-xl" />
                ) : !addresses || addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MapPin className="h-8 w-8 text-sage/50" />
                    </div>
                    <p className="text-sage mb-4">No addresses saved yet</p>
                    <Link href="/addresses">
                      <Button
                        size="sm"
                        className="rounded-full bg-gradient-to-r from-forest to-forest-light"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Address
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        onClick={() => setSelectedAddress(address)}
                        className={`p-5 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedAddress?.id === address.id
                            ? 'border-forest bg-forest/5 ring-2 ring-forest'
                            : 'border-sand/30 hover:border-sage'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              selectedAddress?.id === address.id
                                ? 'border-forest bg-forest'
                                : 'border-sage/50'
                            }`}
                          >
                            {selectedAddress?.id === address.id && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-forest">{address.label}</span>
                              {address.isDefault && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs rounded-full bg-sage/10 text-sage border-0"
                                >
                                  Default
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm mt-1 text-sage">
                              {address.fullName}, {address.addressLine1}
                            </p>
                            <p className="text-sm text-sage/70">
                              {address.city}, {address.state} {address.postalCode}
                            </p>
                            <p className="text-sm text-sage/70 mt-1">Phone: {address.phone}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card className="rounded-2xl border-sand/30 bg-white/80">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-forest">
                  <CreditCard className="h-5 w-5 text-sage" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  onClick={() => setPaymentMethod('RAZORPAY')}
                  className={`flex items-center gap-4 p-5 border-2 rounded-xl cursor-pointer transition-all ${
                    paymentMethod === 'RAZORPAY'
                      ? 'border-forest bg-forest/5 ring-2 ring-forest'
                      : 'border-sand/30 hover:border-sage'
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'RAZORPAY' ? 'border-forest bg-forest' : 'border-sage/50'
                    }`}
                  >
                    {paymentMethod === 'RAZORPAY' && <Check className="h-4 w-4 text-white" />}
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-forest/10 to-sage/10 flex items-center justify-center">
                    <span className="text-forest font-bold text-lg">₹</span>
                  </div>
                  <div>
                    <p className="font-semibold text-forest">Pay Online (Razorpay)</p>
                    <p className="text-sm text-sage">UPI, Cards, Net Banking, Wallets</p>
                  </div>
                </div>

                <div
                  onClick={() => setPaymentMethod('COD')}
                  className={`flex items-center gap-4 p-5 border-2 rounded-xl cursor-pointer transition-all ${
                    paymentMethod === 'COD'
                      ? 'border-forest bg-forest/5 ring-2 ring-forest'
                      : 'border-sand/30 hover:border-sage'
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'COD' ? 'border-forest bg-forest' : 'border-sage/50'
                    }`}
                  >
                    {paymentMethod === 'COD' && <Check className="h-4 w-4 text-white" />}
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-terracotta/10 flex items-center justify-center">
                    <Banknote className="h-6 w-6 text-terracotta" />
                  </div>
                  <div>
                    <p className="font-semibold text-forest">Cash on Delivery</p>
                    <p className="text-sm text-sage">Pay when you receive your order</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24 rounded-2xl border-sand/30 bg-white/80">
              <CardHeader>
                <CardTitle className="text-xl text-forest">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-sand-light/30 to-cream flex-shrink-0">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Leaf className="h-8 w-8 text-sage/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-forest truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-sage">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-forest">
                        {formatPrice(parseFloat(String(item.product.price)) * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-sand/30 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-sage">Subtotal</span>
                    <span className="text-forest">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-sage">Shipping</span>
                    <span className="text-olive font-medium">Free</span>
                  </div>
                </div>

                <div className="border-t border-sand/30 pt-4 flex justify-between font-semibold text-xl">
                  <span className="text-forest">Total</span>
                  <span className="text-terracotta">{formatPrice(subtotal)}</span>
                </div>

                <Button
                  className="w-full rounded-xl bg-gradient-to-r from-forest to-forest-light hover:shadow-xl hover:shadow-forest/20 shadow-lg text-lg py-6"
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={
                    items.length === 0 || (isGuest ? !isGuestFormValid() : !selectedAddress)
                  }
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : paymentMethod === 'COD' ? (
                    <>
                      <Banknote className="h-5 w-5 mr-2" />
                      Place Order (Pay on Delivery)
                    </>
                  ) : (
                    <>
                      <Lock className="h-5 w-5 mr-2" />
                      Pay {formatPrice(subtotal)}
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-sage">
                  <Lock className="h-3 w-3" />
                  <span>Secure payment powered by Razorpay</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
