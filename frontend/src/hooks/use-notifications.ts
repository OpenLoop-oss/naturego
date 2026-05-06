'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Bell, BellRing } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';

export interface Notification {
  type: 'NEW_ORDER' | 'ORDER_UPDATED' | 'LOW_STOCK' | 'ORDER_CANCELLED' | 'CONNECTED';
  data?: any;
  timestamp: Date;
  clientId?: string;
  isAdmin?: boolean;
}

export function useNotifications() {
  const { isAuthenticated, user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 50));
    setUnreadCount((prev) => prev + 1);

    if (notification.type === 'NEW_ORDER') {
      toast.success('🎉 New Order Received!', {
        description: `Order #${notification.data?.id?.slice(0, 8)} - ₹${notification.data?.totalPrice}`,
        duration: 5000,
      });
    } else if (notification.type === 'LOW_STOCK') {
      toast.warning('⚠️ Low Stock Alert', {
        description: `${notification.data?.name} has only ${notification.data?.stock} items left`,
        duration: 5000,
      });
    } else if (notification.type === 'ORDER_CANCELLED') {
      toast.info('Order Cancelled', {
        description: `Order #${notification.data?.id?.slice(0, 8)} has been cancelled`,
        duration: 5000,
      });
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const eventSource = new EventSource(`${API_BASE}/notifications/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data) as Notification;
        notification.timestamp = new Date(notification.timestamp);
        addNotification(notification);
      } catch (error) {
        console.error('Failed to parse notification:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      setTimeout(() => {
        if (isAuthenticated && user?.role === 'ADMIN') {
          const newEventSource = new EventSource(`${API_BASE}/notifications/stream`);
          eventSourceRef.current = newEventSource;
        }
      }, 5000);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, user, addNotification]);

  return {
    notifications,
    isConnected,
    unreadCount,
    clearNotifications,
    NotificationIcon: unreadCount > 0 ? BellRing : Bell,
  };
}
