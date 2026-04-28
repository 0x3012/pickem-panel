import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  NotificationEvent,
  NotificationHistoryItem,
  GetNotificationHistoryParams,
  GetUnreadNotificationsParams,
  MarkNotificationsAsReadParams,
  MatchNotificationSubscriptionPayload,
  MatchNotificationSubscriptionStatus,
  MatchNotificationSubscriptionsResponse,
} from '../models/notifications.model';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private eventSource?: EventSource;
  private http = inject(HttpClient);

  notifications = signal<NotificationEvent[]>([]);
  hasUnreadNotifications = signal(false);

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
        this.hasUnreadNotifications.set(true);

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
    this.hasUnreadNotifications.set(false);
  }

  getNotificationHistory(params: GetNotificationHistoryParams): Observable<NotificationHistoryItem[]> {
    let httpParams = new HttpParams()
      .set('tenantId', String(params.tenantId))
      .set('userId', String(params.userId));

    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    if (params.cursor !== undefined) {
      httpParams = httpParams.set('cursor', String(params.cursor));
    }

    return this.http.get<NotificationHistoryItem[]>(
      `${environment.apiBaseUrl}/api/v1/notifications/history`,
      {
        params: httpParams,
        withCredentials: true,
      }
    );
  }

  getUnreadNotifications(params: GetUnreadNotificationsParams): Observable<NotificationHistoryItem[]> {
    const httpParams = new HttpParams()
      .set('tenantId', String(params.tenantId))
      .set('userId', String(params.userId));

    return this.http.get<NotificationHistoryItem[]>(
      `${environment.apiBaseUrl}/api/v1/notifications/history/unread`,
      {
        params: httpParams,
        withCredentials: true,
      }
    ).pipe(
      tap(history => {
        this.hasUnreadNotifications.set(history.length > 0);
      })
    );
  }

  markNotificationsAsRead(params: MarkNotificationsAsReadParams): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(
      `${environment.apiBaseUrl}/api/v1/notifications/history/mark-read`,
      {
        tenantId: String(params.tenantId),
        userId: String(params.userId),
        notificationIds: params.notificationIds?.map(id => String(id)),
      },
      {
        withCredentials: true,
      }
    );
  }

  updateMatchSubscription(
    payload: MatchNotificationSubscriptionPayload
  ): Observable<MatchNotificationSubscriptionPayload> {
    return this.http.post<MatchNotificationSubscriptionPayload>(
      `${environment.apiBaseUrl}/api/v1/notifications/subscriptions/match`,
      payload,
      {
        withCredentials: true,
      }
    );
  }

  refreshUnreadStatus(tenantId: number, userId: number): void {
    this.getUnreadNotifications({
      tenantId,
      userId,
    }).subscribe({
      error: err => {
        console.error('[NotificationsService] Failed to refresh unread status', err);
      }
    });
  }

  getMatchSubscriptionStatus(
    tenantId: string,
    userId: string,
    fixtureId: string
  ): Observable<MatchNotificationSubscriptionStatus> {
    const params = new HttpParams()
      .set('tenantId', tenantId)
      .set('userId', userId)
      .set('fixtureId', fixtureId);

    return this.http.get<MatchNotificationSubscriptionStatus>(
      `${environment.apiBaseUrl}/api/v1/notifications/subscriptions/match/status`,
      {
        params,
        withCredentials: true,
      }
    );
  }

  getMatchSubscriptions(
    tenantId: string,
    userId: string,
    fixtureIds: string[]
  ): Observable<MatchNotificationSubscriptionsResponse> {
    const params = new HttpParams()
      .set('tenantId', tenantId)
      .set('userId', userId)
      .set('fixtureIds', fixtureIds.join(','));

    return this.http.get<MatchNotificationSubscriptionsResponse>(
      `${environment.apiBaseUrl}/api/v1/notifications/subscriptions/matches`,
      {
        params,
        withCredentials: true,
      }
    );
  }
}
