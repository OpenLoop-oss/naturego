import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, CartItem } from '@/lib/api/client';
import { useAuthStore } from './auth-store';

const GUEST_SESSION_KEY = 'guest-session-id';

const getGuestSessionId = () => {
  if (typeof window === 'undefined') return null;
  let sessionId = localStorage.getItem(GUEST_SESSION_KEY);
  if (!sessionId) {
    sessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(GUEST_SESSION_KEY, sessionId);
  }
  return sessionId;
};

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
  itemCount: number;
  subtotal: number;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<boolean>;
  updateItem: (itemId: string, quantity: number) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  clearCart: () => void;
  clearError: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      error: null,
      itemCount: 0,
      subtotal: 0,

      fetchCart: async () => {
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        set({ isLoading: true, error: null });

        try {
          let response;
          if (isAuthenticated) {
            response = await api.getCart();
            const items = response?.items || [];
            const itemCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
            const subtotal = items.reduce(
              (sum: number, item: any) =>
                sum + parseFloat(String(item.product?.price || 0)) * item.quantity,
              0,
            );
            set({ items, itemCount, subtotal, isLoading: false });
          } else {
            const sessionId = getGuestSessionId();
            if (!sessionId) {
              set({ items: [], itemCount: 0, subtotal: 0, isLoading: false });
              return;
            }
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart/guest`, {
              headers: { 'x-session-id': sessionId },
            });
            const data = await res.json();
            const items = data?.data?.items || [];
            const itemCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
            const subtotal = items.reduce(
              (sum: number, item: any) =>
                sum + parseFloat(String(item.product?.price || 0)) * item.quantity,
              0,
            );
            set({ items, itemCount, subtotal, isLoading: false });
          }
        } catch (err: unknown) {
          const error = err as { message?: string };
          set({ error: error.message || 'Failed to fetch cart', isLoading: false });
        }
      },

      addItem: async (productId: string, quantity = 1) => {
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        set({ isLoading: true, error: null });

        try {
          if (isAuthenticated) {
            await api.addToCart(productId, quantity);
          } else {
            const sessionId = getGuestSessionId();
            if (!sessionId) {
              throw new Error('No session ID');
            }
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart/guest`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId,
              },
              body: JSON.stringify({ productId, quantity }),
            });
            const data = await res.json();
            if (!data.success) {
              throw new Error(data.message || 'Failed to add item');
            }
          }
          await get().fetchCart();
          return true;
        } catch (err: unknown) {
          const error = err as { message?: string };
          set({ error: error.message || 'Failed to add item', isLoading: false });
          return false;
        }
      },

      updateItem: async (itemId: string, quantity: number) => {
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        set({ isLoading: true, error: null });

        try {
          if (isAuthenticated) {
            await api.updateCartItem(itemId, quantity);
          } else {
            const sessionId = getGuestSessionId();
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart/guest/${itemId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId || '',
              },
              body: JSON.stringify({ quantity }),
            });
          }
          await get().fetchCart();
          return true;
        } catch (err: unknown) {
          const error = err as { message?: string };
          set({ error: error.message || 'Failed to update item', isLoading: false });
          return false;
        }
      },

      removeItem: async (itemId: string) => {
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        set({ isLoading: true, error: null });

        try {
          if (isAuthenticated) {
            await api.removeFromCart(itemId);
          } else {
            const sessionId = getGuestSessionId();
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart/guest/${itemId}`, {
              method: 'DELETE',
              headers: { 'x-session-id': sessionId || '' },
            });
          }
          await get().fetchCart();
          return true;
        } catch (err: unknown) {
          const error = err as { message?: string };
          set({ error: error.message || 'Failed to remove item', isLoading: false });
          return false;
        }
      },

      clearCart: () => {
        set({ items: [], itemCount: 0, subtotal: 0, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'cart-storage',
    },
  ),
);

useAuthStore.subscribe((state, prevState) => {
  if (prevState.isAuthenticated && !state.isAuthenticated) {
    useCartStore.getState().fetchCart();
  }
});
