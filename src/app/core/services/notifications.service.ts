import { Injectable, signal } from '@angular/core';
import { NotificationEvent } from '../models/notifications.model';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private eventSource?: EventSource;

  notifications = signal<NotificationEvent[]>([]);

  constructor(private toast: ToastService) {}

  connect(tenantId: string, userId: string) {
    console.log('🚀 NotificationsService.connect CALLED with', {
      tenantId,
      userId,
    });

    if (this.eventSource) {
      this.eventSource.close();
    }

    const es = new EventSource(
      `${environment.apiBaseUrl}/api/v1/notifications/stream?tenantId=${tenantId}&userId=${userId}`,
      { withCredentials: true },
    );

    es.onmessage = event => {
      try {
        const data: NotificationEvent = JSON.parse(event.data);
        console.log('🔔 Notification received', data);

        this.notifications.update(list => [
          data,
          ...list,
        ]);

        this.toast.fromNotification(data);

      } catch (err) {
        console.error('Invalid notification payload', err);
      }
    };

    es.onerror = err => {
      console.warn('⚠️ Notifications stream error', err);
    };

    this.eventSource = es;
  }

  disconnect() {
    this.eventSource?.close();
    this.eventSource = undefined;
  }

  clear() {
    this.notifications.set([]);
  }
}
