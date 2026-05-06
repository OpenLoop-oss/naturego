import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface NotificationEvent {
  type: 'NEW_ORDER' | 'ORDER_UPDATED' | 'LOW_STOCK' | 'ORDER_CANCELLED';
  data: any;
  timestamp: Date;
}

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private clients: Map<string, any> = new Map();
  private adminClients: Set<string> = new Set();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  onModuleInit() {
    this.eventEmitter.on('notification', (notification: NotificationEvent) => {
      this.broadcastToAdmin(notification);
    });
  }

  onModuleDestroy() {
    this.clients.clear();
    this.adminClients.clear();
  }

  addClient(clientId: string, isAdmin: boolean = false) {
    this.clients.set(clientId, {
      isAdmin,
      subscriptions: new Set(['NEW_ORDER', 'ORDER_UPDATED', 'LOW_STOCK', 'ORDER_CANCELLED']),
    });
    if (isAdmin) {
      this.adminClients.add(clientId);
    }
  }

  removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (client?.isAdmin) {
      this.adminClients.delete(clientId);
    }
    this.clients.delete(clientId);
  }

  broadcastToAdmin(notification: NotificationEvent) {
    const message = `data: ${JSON.stringify(notification)}\n\n`;

    for (const clientId of this.adminClients) {
      const client = this.clients.get(clientId);
      if (client && client.subscriptions.has(notification.type)) {
        try {
          client.response?.write(message);
        } catch (error) {
          console.error(`Failed to send notification to client ${clientId}:`, error);
          this.removeClient(clientId);
        }
      }
    }
  }

  emitNewOrder(order: any) {
    this.eventEmitter.emit('notification', {
      type: 'NEW_ORDER',
      data: order,
      timestamp: new Date(),
    });
  }

  emitOrderUpdated(order: any) {
    this.eventEmitter.emit('notification', {
      type: 'ORDER_UPDATED',
      data: order,
      timestamp: new Date(),
    });
  }

  emitLowStock(product: any) {
    this.eventEmitter.emit('notification', {
      type: 'LOW_STOCK',
      data: product,
      timestamp: new Date(),
    });
  }

  emitOrderCancelled(order: any) {
    this.eventEmitter.emit('notification', {
      type: 'ORDER_CANCELLED',
      data: order,
      timestamp: new Date(),
    });
  }
}
