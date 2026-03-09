export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  id: number;
  type: ToastType;

  message: string;
  title?: string;

  icon?: string;   
  meta?: any;
}
