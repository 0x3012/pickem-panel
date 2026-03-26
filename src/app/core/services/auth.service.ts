import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthUser } from '../models/auth-user.model';
import { ToastService } from './toast.service';

type MeResponse = {
  loggedIn: boolean;
  user: AuthUser | null;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly ME_URL = `https://www.hotspawn.com/wp-json/pickem/v1/me`;
 
  private _user = signal<AuthUser | null>(null);
  private _checked = signal(false);

  user = computed(() => this._user());
  isLoggedIn = computed(() => !!this._user());
  ready = computed(() => this._checked());

  constructor(private http: HttpClient, private toastService: ToastService) {}

 
  loadSession() {
    return this.http
      .get<MeResponse>(this.ME_URL, { withCredentials: true })
      .subscribe({
        next: res => {
          if (!environment.production) {
            console.debug('[AuthService] /me response', res);
          }

          const wasLoggedOut = !this._user();
          this._user.set(res.loggedIn ? res.user : null);
          this._checked.set(true);

          if (res.loggedIn && wasLoggedOut) {
            this.toastService.show(
              `Welcome back, ${res.user?.name || res.user?.username || 'User'} you are now logged in!`,
              'success',
              { title: 'Login Successful 🎉' }
            );
          }
        },
        error: () => {
          this._user.set(null);
          this._checked.set(true);
        }
      });
  }
 
  refresh() {
    this._checked.set(false);
    this.loadSession();
  }

  startHeartbeat() {
  setInterval(() => {
    this.refresh();
  }, 3_600_000);
}


 
  logout() {
    window.location.href = `${environment.wpBaseUrl}/wp-login.php?action=logout`;
  }
}
