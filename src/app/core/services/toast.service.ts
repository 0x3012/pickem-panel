import { Injectable, signal } from '@angular/core';
import type { Toast, ToastType } from '../models/toast.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;

  toasts = signal<Toast[]>([]);

  /**
   * Generic toast
   */
  show(
    message: string,
    type: ToastType = 'success',
    options?: {
      title?: string;
      icon?: string;
      duration?: number;
      meta?: any;
    }
  ) {
    const id = ++this.counter;

    const toast: Toast = {
      id,
      message,
      type,
      title: options?.title,
      icon: options?.icon,
      meta: options?.meta,
    };

    this.toasts.update(list => [...list, toast]);

    const duration = options?.duration ?? 6000;
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  fromNotification(notification: {
    type: string;
    message?: string;
    payload?: any;
  }) {
    console.log('fromNotification called:', notification);
    
    if (!notification.message) return;

    switch (notification.type) {
      case 'PICK_WON': {
        const rawLogo = notification.payload?.team?.logo;
        const logo = `${environment.apiBaseUrl}${rawLogo}`;
        
        console.log('Toast logo URL:', logo);
        console.log('Team name:', notification.payload?.team?.name);
        
        this.show(notification.message, 'success', {
          title: 'Pick won 🎉',
          icon: logo,
          meta: notification.payload,
        });
        break;
      }

      default:
        console.log('Unknown notification type:', notification.type);
        this.show(notification.message, 'info');
    }
  }

  dismiss(id: number) {
    this.toasts.update(list =>
      list.filter(t => t.id !== id),
    );
  }

  clear() {
    this.toasts.set([]);
  }
}
