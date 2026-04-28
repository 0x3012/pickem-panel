import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthUser } from '../models/auth-user.model';
import { ToastService } from './toast.service';

type MeResponse = {
  loggedIn: boolean;
  user: AuthUser | null;
};

type LoadSessionOptions = {
  force?: boolean;
  silent?: boolean;
  announce?: 'login' | 'logout';
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly ME_URL = `${environment.wpBaseUrl}/wp-json/pickem/v1/me`;
  private readonly SESSION_STORAGE_KEY = 'pickem.auth.user';
  private readonly AUTH_TOAST_FLAG_KEY = 'pickem.auth.toast';

  private _user = signal<AuthUser | null>(null);
  private _checked = signal(false);
  private loadSessionPromise: Promise<void> | null = null;
  private heartbeatStarted = false;
  private sessionSyncStarted = false;

  user = computed(() => this._user());
  isLoggedIn = computed(() => !!this._user());
  ready = computed(() => this._checked());

  constructor(private http: HttpClient, private toastService: ToastService) {
    this.hydrateStoredSession();
  }

  loadSession(options: LoadSessionOptions = {}) {
    if (this.loadSessionPromise && !options.force) {
      return this.loadSessionPromise;
    }

    this.loadSessionPromise = new Promise<void>((resolve) => {
      this.http
        .get<MeResponse>(this.ME_URL, { withCredentials: true })
        .subscribe({
          next: res => {
            const wasLoggedIn = !!this._user();
            const wasLoggedOut = !this._user();
            const nextUser = res.loggedIn ? res.user : null;

            this._user.set(nextUser);
            this._checked.set(true);
            this.persistSession(nextUser);

            if (res.loggedIn && (wasLoggedOut || options.announce === 'login') && !options.silent) {
              this.toastService.show(
                `Welcome back, ${res.user?.name || res.user?.username || 'User'} you are now logged in!`,
                'success',
                { title: 'Login Successful' }
              );
            }

            if (!res.loggedIn && (wasLoggedIn || options.announce === 'logout') && !options.silent) {
              this.toastService.show(
                'Your session ended. Please sign in again.',
                'info',
                { title: 'Logged Out' }
              );
            }

            this.consumePendingToastFlag(res);

            this.loadSessionPromise = null;
            resolve();
          },
          error: () => {
            this._user.set(null);
            this._checked.set(true);
            this.persistSession(null);
            this.loadSessionPromise = null;
            resolve();
          }
        });
    });

    return this.loadSessionPromise;
  }

  async refresh(options: LoadSessionOptions = {}) {
    this._checked.set(false);
    await this.loadSession({
      ...options,
      force: true,
    });
  }

  startHeartbeat() {
    if (this.heartbeatStarted) return;

    this.heartbeatStarted = true;

    setInterval(() => {
      this.refresh({ silent: true });
    }, 3_600_000);
  }

  startSessionSync() {
    if (this.sessionSyncStarted || typeof window === 'undefined') return;

    this.sessionSyncStarted = true;

    const syncSession = () => {
      if (document.visibilityState === 'hidden') return;

      this.refresh().catch(() => undefined);
    };

    window.addEventListener('focus', syncSession);
    document.addEventListener('visibilitychange', syncSession);
  }

  logout() {
    this.persistSession(null);
    this.persistToastFlag('logout');
    window.location.href = `${environment.wpBaseUrl}/wp-login.php?action=logout`;
  }

  private hydrateStoredSession() {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(this.SESSION_STORAGE_KEY);

      if (!raw) return;

      this._user.set(JSON.parse(raw) as AuthUser);
      this._checked.set(true);
    } catch {
      window.localStorage.removeItem(this.SESSION_STORAGE_KEY);
    }
  }

  private persistSession(user: AuthUser | null) {
    if (typeof window === 'undefined') return;

    if (!user) {
      window.localStorage.removeItem(this.SESSION_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(user));
  }

  private persistToastFlag(type: 'logout') {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(this.AUTH_TOAST_FLAG_KEY, type);
  }

  private consumePendingToastFlag(res: MeResponse) {
    if (typeof window === 'undefined') return;

    const flag = window.localStorage.getItem(this.AUTH_TOAST_FLAG_KEY);

    if (!flag) return;

    window.localStorage.removeItem(this.AUTH_TOAST_FLAG_KEY);

    if (flag === 'logout' && !res.loggedIn) {
      this.toastService.show(
        'You have been logged out.',
        'info',
        { title: 'Logged Out' }
      );
    }
  }
}
