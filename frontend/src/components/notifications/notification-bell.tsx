'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, BellRing, X, Package, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

const notificationIcons = {
  NEW_ORDER: Package,
  ORDER_UPDATED: RefreshCw,
  LOW_STOCK: AlertTriangle,
  ORDER_CANCELLED: XCircle,
  CONNECTED: Bell,
};

const notificationColors = {
  NEW_ORDER: 'bg-green-100 text-green-700',
  ORDER_UPDATED: 'bg-blue-100 text-blue-700',
  LOW_STOCK: 'bg-yellow-100 text-yellow-700',
  ORDER_CANCELLED: 'bg-red-100 text-red-700',
  CONNECTED: 'bg-gray-100 text-gray-700',
};

export function NotificationBell() {
  const { notifications, isConnected, unreadCount, clearNotifications, NotificationIcon } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      clearNotifications();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button variant="ghost" size="icon" onClick={handleToggle} className="relative">
        <NotificationIcon
          className={`h-5 w-5 ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-background border rounded-lg shadow-lg z-50">
          <div className="sticky top-0 bg-background border-b p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Notifications</h3>
              <Badge variant={isConnected ? 'success' : 'secondary'} className="text-xs">
                {isConnected ? 'Live' : 'Offline'}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="divide-y">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs mt-1">You&apos;ll see updates here in real-time</p>
              </div>
            ) : (
              notifications.map((notification, index) => {
                const Icon =
                  notificationIcons[notification.type as keyof typeof notificationIcons] || Bell;
                const colorClass =
                  notificationColors[notification.type as keyof typeof notificationColors] ||
                  'bg-gray-100 text-gray-700';

                return (
                  <div
                    key={`${notification.type}-${notification.timestamp}-${index}`}
                    className="p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{getNotificationTitle(notification)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getNotificationDescription(notification)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(notification.timestamp.toString())}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getNotificationTitle(notification: Notification): string {
  switch (notification.type) {
    case 'NEW_ORDER':
      return 'New Order Received!';
    case 'ORDER_UPDATED':
      return 'Order Updated';
    case 'LOW_STOCK':
      return 'Low Stock Alert';
    case 'ORDER_CANCELLED':
      return 'Order Cancelled';
    case 'CONNECTED':
      return 'Connected to Live Updates';
    default:
      return 'Notification';
  }
}

function getNotificationDescription(notification: Notification): string {
  const data = notification.data;
  switch (notification.type) {
    case 'NEW_ORDER':
      return data?.user?.name
        ? `${data.user.name} placed an order for ₹${data.totalPrice}`
        : `Order received for ₹${data?.totalPrice}`;
    case 'ORDER_UPDATED':
      return `Order #${data?.id?.slice(0, 8)} status changed to ${data?.status}`;
    case 'LOW_STOCK':
      return `${data?.name} - Only ${data?.stock} left in stock`;
    case 'ORDER_CANCELLED':
      return `Order #${data?.id?.slice(0, 8)} was cancelled`;
    case 'CONNECTED':
      return 'Real-time notifications are now active';
    default:
      return '';
  }
}
