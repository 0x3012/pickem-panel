export interface NotificationEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  payload?: any;
}
