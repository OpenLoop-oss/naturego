const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const ACCESS_TOKEN_COOKIE = 'accessToken';
const REFRESH_TOKEN_COOKIE = 'refreshToken';
const TOKEN_REFRESH_THRESHOLD_SECONDS = 60;

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiError {
  message: string;
  error?: string;
  statusCode?: number;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private subscribeTokenRefresh(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.subscribeTokenRefresh(resolve);
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        this.clearAuthCookies();
        window.location.href = '/login';
        return null;
      }

      const data = await response.json();
      if (data.success && data.data?.expiresIn) {
        this.onTokenRefreshed(getCookie(ACCESS_TOKEN_COOKIE) || '');
        return getCookie(ACCESS_TOKEN_COOKIE);
      }

      return null;
    } catch {
      this.clearAuthCookies();
      window.location.href = '/login';
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  private clearAuthCookies() {
    deleteCookie(ACCESS_TOKEN_COOKIE);
    deleteCookie(REFRESH_TOKEN_COOKIE);
  }

  private getAccessToken(): string | null {
    return getCookie(ACCESS_TOKEN_COOKIE);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.headers && typeof options.headers === 'object') {
      Object.assign(headers, options.headers);
    }

    const accessToken = this.getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 401) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });
      }
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw {
        message: data.message || 'An error occurred',
        error: data.error,
        statusCode: response.status,
      } as ApiError;
    }

    let result = data;
    let iterations = 0;
    const maxIterations = 10;

    while (
      result.data !== undefined &&
      typeof result.data === 'object' &&
      iterations < maxIterations
    ) {
      result = result.data;
      iterations++;
    }

    return result as T;
  }

  async login(email: string, password: string) {
    return this.request<{
      user: User;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
  }

  async register(email: string, password: string, name: string) {
    return this.request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async logout() {
    try {
      await this.request<{ message: string }>('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      this.clearAuthCookies();
    }
  }

  async getMe() {
    return this.request<{ user: User }>('/users/me');
  }

  async updateProfile(data: { name?: string; email?: string }) {
    return this.request<{ user: User }>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async getAddresses() {
    return this.request<{ addresses: Address[] }>('/addresses');
  }

  async createAddress(data: CreateAddressInput) {
    return this.request<{ address: Address }>('/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAddress(id: string, data: Partial<CreateAddressInput>) {
    return this.request<{ address: Address }>(`/addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAddress(id: string) {
    return this.request<{ message: string }>(`/addresses/${id}`, {
      method: 'DELETE',
    });
  }

  async setDefaultAddress(id: string) {
    return this.request<{ address: Address }>(`/addresses/${id}/default`, {
      method: 'PATCH',
    });
  }

  async getCategories() {
    const data = await this.request<{ categories: Category[] }>('/categories');
    if (Array.isArray(data)) {
      return { categories: data };
    }
    return data;
  }

  async getCategory(idOrSlug: string) {
    return this.request<{ category: Category }>(`/categories/${idOrSlug}`);
  }

  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.minPrice) searchParams.set('minPrice', String(params.minPrice));
    if (params?.maxPrice) searchParams.set('maxPrice', String(params.maxPrice));
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const query = searchParams.toString();
    return this.request<{
      products: Product[];
      pagination: PaginationMeta;
    }>(`/products${query ? `?${query}` : ''}`);
  }

  async getProduct(id: string) {
    return this.request<{ product: Product }>(`/products/${id}`);
  }

  async createProduct(data: CreateProductInput) {
    return this.request<{ product: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: Partial<CreateProductInput>) {
    return this.request<{ product: Product }>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async getCart() {
    return this.request<CartResponse>('/cart');
  }

  async addToCart(productId: string, quantity: number) {
    return this.request<{ cartItem: CartItem }>('/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
  }

  async updateCartItem(id: string, quantity: number) {
    return this.request<{ cartItem: CartItem }>(`/cart/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  }

  async removeFromCart(id: string) {
    return this.request<{ message: string }>(`/cart/${id}`, {
      method: 'DELETE',
    });
  }

  async createPaymentOrder(amount: number) {
    return this.request<{ id: string; amount: number; currency: string; status: string }>(
      '/payment/create-order',
      {
        method: 'POST',
        body: JSON.stringify({ amount }),
      },
    );
  }

  async checkout(
    addressId: string,
    paymentDetails?: { razorpayOrderId?: string; razorpayPaymentId?: string },
  ) {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify({ addressId, ...paymentDetails }),
    });
  }

  async getOrders(params?: { page?: number; limit?: number; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    return this.request<{
      orders: Order[];
      pagination: PaginationMeta;
    }>(`/orders${query ? `?${query}` : ''}`);
  }

  async getOrder(id: string) {
    return this.request<{ order: Order }>(`/orders/${id}`);
  }

  async getAllOrders(params?: { page?: number; limit?: number; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    return this.request<{
      orders: Order[];
      pagination: PaginationMeta;
    }>(`/orders/admin/all${query ? `?${query}` : ''}`);
  }

  async updateOrderStatus(id: string, status: string, trackingNumber?: string, notes?: string) {
    return this.request<{ order: Order }>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, trackingNumber, notes }),
    });
  }

  async getOrderHistory(orderId: string) {
    return this.request<{ orderId: string; history: OrderHistoryEntry[] }>(
      `/orders/${orderId}/history`,
    );
  }

  async generateTrackingNumber(): Promise<{ trackingNumber: string }> {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return { trackingNumber: `IRA${timestamp}${random}` };
  }

  async trackShipment(trackingNumber: string) {
    return this.request<{
      status: string;
      estimatedDelivery?: string;
      events: Array<{ timestamp: string; location: string; description: string }>;
    }>(`/shipping/track/${trackingNumber}`);
  }

  async getUsers() {
    return this.request<{ users: User[] }>('/users');
  }

  async getWishlist() {
    return this.request<{
      items: WishlistItem[];
      totalItems: number;
    }>('/wishlist');
  }

  async addToWishlist(productId: string) {
    return this.request<{ wishlistItem: WishlistItem }>(`/wishlist/${productId}`, {
      method: 'POST',
    });
  }

  async removeFromWishlist(productId: string) {
    return this.request<{ message: string }>(`/wishlist/${productId}`, {
      method: 'DELETE',
    });
  }

  async isInWishlist(productId: string): Promise<boolean> {
    try {
      const wishlist = await this.getWishlist();
      return wishlist.items.some((item) => item.product.id === productId);
    } catch {
      return false;
    }
  }

  async getSessions() {
    return this.request<{ sessions: Session[] }>('/auth/sessions');
  }

  async logoutAllSessions() {
    try {
      await this.request<{ message: string }>('/auth/sessions', {
        method: 'DELETE',
        credentials: 'include',
      });
    } finally {
      this.clearAuthCookies();
    }
  }

  async revokeSession(sessionId: string) {
    return this.request<{ message: string }>(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  }
}

export const api = new ApiClient(API_BASE);

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  imageUrl: string | null;
  categoryId: string | null;
  category?: Pick<Category, 'id' | 'name' | 'slug'> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  stock: number;
  imageUrl?: string;
  categoryId?: string;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressInput {
  label?: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  product: Pick<Product, 'id' | 'name' | 'price' | 'imageUrl'>;
}

export interface CartResponse {
  items: CartItem[];
  summary: {
    totalItems: number;
    totalPrice: number;
  };
}

export interface Order {
  id: string;
  userId: string;
  totalPrice: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
  customerNotes?: string;
  completedAt?: string;
  shippingAddress?: Address | string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  user?: Pick<User, 'id' | 'name' | 'email'>;
  guestEmail?: string;
  guestName?: string;
  isGuestOrder?: boolean;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'REFUNDED';

export type PaymentStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface OrderHistoryEntry {
  id: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: string;
  createdAt: string;
  orderId?: string;
  product: Pick<Product, 'id' | 'name' | 'price' | 'imageUrl'>;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    description: string | null;
    price: string;
    imageUrl: string | null;
    stock: number;
    category?: {
      id: string;
      name: string;
    } | null;
  };
}

export interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}
