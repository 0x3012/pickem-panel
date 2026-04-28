import { Component, signal, computed, inject, effect } from '@angular/core';
import { NgIf, NgFor, DatePipe } from '@angular/common';

import { LoginRequiredDialog } from '../lobby/components/login/login-required.dialog';
import { EmptyStateComponent } from '../lobby/components/pickem-card/empty-state.component';
import { TenantService } from '../core/services/tenant.service';
import { AuthService } from '../core/services/auth.service';
import { NotificationsService } from '../core/services/notifications.service';
import type { NotificationHistoryItem } from '../core/models/notifications.model';

import { environment } from '../../environments/environment';

@Component({
    standalone: true,
    selector: 'app-notifications-page',
    imports: [
        NgIf,
        NgFor,
        DatePipe,
        LoginRequiredDialog,
        EmptyStateComponent,
    ],
    templateUrl: './notifications.page.html',
    styleUrls: ['./notifications.page.css']
})
export class NotificationsPage {
    private tenantService = inject(TenantService);
    private auth = inject(AuthService);
    private notificationsService = inject(NotificationsService);

    user = this.auth.user;
    isLoggedIn = computed(() => this.auth.isLoggedIn());
    authReady = computed(() => this.auth.ready());

    tenant = signal<any | null>(null);

    showLoginDialog = signal(false);

    activeFilter = signal<'all' | 'unread'>('all');
    notificationsHistory = signal<NotificationHistoryItem[]>([]);
    loading = signal(false);
    markingAllRead = signal(false);
    markingReadIds = signal<Set<number>>(new Set());
    error = signal<string | null>(null);
    hasUnreadNotifications = computed(() =>
        this.notificationsHistory().some(notification => !notification.is_read)
    );

    constructor() {
        const t = this.tenantService.getTenant();

        if (t) {
            this.tenant.set(t);
        } else {
            this.tenantService.getTenantBySlug('hotspawn').subscribe({
                next: config => this.tenant.set(config),
                error: err =>
                    console.error('[NotificationsPage] Failed to load tenant', err),
            });
        }
    }

    checkLoginStatus = effect(() => {
        if (!this.authReady()) return;

        if (!this.isLoggedIn()) {
            this.notificationsHistory.set([]);
            this.showLoginDialog.set(true);
        }
    });

    loadNotifications = effect(() => {
        if (!this.authReady()) return;

        if (!this.isLoggedIn()) return;

        const user = this.user();
        const tenant = this.tenant();
        const filter = this.activeFilter();

        if (!user || !tenant) return;

        const tenantId = Number(tenant.tenant.id);

        this.fetchNotifications(tenantId, user.id, filter);
    });

    trackByNotificationId(_: number, notification: NotificationHistoryItem) {
        return notification.id;
    }

    formatNotificationType(type: string): string {
        const labels: Record<string, string> = {
            MATCH_SCORE_CHANGED: 'Score update',
            MATCH_STATUS_CHANGED: 'Status update',
            PICK_WON: 'Pick won',
        };

        if (labels[type]) {
            return labels[type];
        }

        return type
            .toLowerCase()
            .split('_')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    setFilter(filter: 'all' | 'unread') {
        if (this.activeFilter() === filter) return;

        this.activeFilter.set(filter);
    }

    markAsRead(notificationId: number) {
        const user = this.user();
        const tenant = this.tenant();

        if (!user || !tenant) return;

        this.markingReadIds.update(ids => {
            const next = new Set(ids);
            next.add(notificationId);
            return next;
        });

        this.notificationsService.markNotificationsAsRead({
            tenantId: Number(tenant.tenant.id),
            userId: user.id,
            notificationIds: [notificationId],
        }).subscribe({
            next: () => {
                if (this.activeFilter() === 'unread') {
                    this.notificationsHistory.update(list =>
                        list.filter(notification => notification.id !== notificationId)
                    );
                } else {
                    this.notificationsHistory.update(list =>
                        list.map(notification =>
                            notification.id === notificationId
                                ? { ...notification, is_read: true }
                                : notification
                        )
                    );
                }

                this.notificationsService.hasUnreadNotifications.set(
                    this.notificationsHistory().some(notification => !notification.is_read)
                );
            },
            error: (err) => {
                console.error('[NotificationsPage] Failed to mark notification as read', err);
                this.error.set('Failed to mark notification as read');
            },
            complete: () => {
                this.markingReadIds.update(ids => {
                    const next = new Set(ids);
                    next.delete(notificationId);
                    return next;
                });
            }
        });
    }

    markAllAsRead() {
        const user = this.user();
        const tenant = this.tenant();

        if (!user || !tenant || !this.notificationsHistory().length) return;

        this.markingAllRead.set(true);
        this.error.set(null);

        this.notificationsService.markNotificationsAsRead({
            tenantId: Number(tenant.tenant.id),
            userId: user.id,
        }).subscribe({
            next: () => {
                if (this.activeFilter() === 'unread') {
                    this.notificationsHistory.set([]);
                } else {
                    this.notificationsHistory.update(list =>
                        list.map(notification => ({ ...notification, is_read: true }))
                    );
                }

                this.notificationsService.hasUnreadNotifications.set(false);
            },
            error: (err) => {
                console.error('[NotificationsPage] Failed to mark all notifications as read', err);
                this.error.set('Failed to mark all notifications as read');
            },
            complete: () => {
                this.markingAllRead.set(false);
            }
        });
    }

    isMarkingAsRead(notificationId: number): boolean {
        return this.markingReadIds().has(notificationId);
    }

    private fetchNotifications(tenantId: number, userId: number, filter: 'all' | 'unread') {
        this.loading.set(true);
        this.error.set(null);

        if (filter === 'all') {
            this.notificationsService.refreshUnreadStatus(tenantId, userId);
        }

        const request = filter === 'unread'
            ? this.notificationsService.getUnreadNotifications({
                tenantId,
                userId,
            })
            : this.notificationsService.getNotificationHistory({
                tenantId,
                userId,
                limit: 50,
            });

        request.subscribe({
            next: (history) => {
                this.notificationsHistory.set(history);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('[NotificationsPage] Failed to load notifications', err);
                this.notificationsHistory.set([]);
                this.loading.set(false);
                this.error.set('Failed to load notifications');
            }
        });
    }

    closeLoginDialog() {
        this.showLoginDialog.set(false);
    }

    openWpLogin() {
        this.showLoginDialog.set(false);

        const loginUrl = environment.wpLoginUrl;

        const popup = window.open(
            loginUrl,
            'wpLogin',
            'width=520,height=720'
        );

        if (!popup) {
            return;
        }

        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                this.auth.refresh({ announce: 'login' }).catch(() => undefined);
            }
        }, 1000);
    }
}
