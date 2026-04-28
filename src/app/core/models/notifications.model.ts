export interface NotificationEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  payload?: any;
}

export interface NotificationHistoryItem {
  id: number;
  tenant_id: number;
  user_id: number;
  type: string;
  message: string;
  payload?: any;
  is_read: boolean;
  created_at: string;
}

export interface GetNotificationHistoryParams {
  tenantId: number;
  userId: number;
  limit?: number;
  cursor?: number;
}

export interface GetUnreadNotificationsParams {
  tenantId: number;
  userId: number;
}

export interface MarkNotificationsAsReadParams {
  tenantId: number;
  userId: number;
  notificationIds?: number[];
}

export interface MatchNotificationSubscriptionPayload {
  tenantId: string;
  userId: string;
  fixtureId: string;
  enabled: boolean;
}

export interface MatchNotificationSubscriptionStatus {
  subscribed: boolean;
}

export interface MatchNotificationSubscriptionsResponse {
  fixtureIds: string[];
}
