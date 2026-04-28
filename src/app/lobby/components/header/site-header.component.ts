import { Component, Input, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TenantService } from '../../../core/services/tenant.service';
import { NotificationsService } from '../../../core/services/notifications.service';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.css'
})
export class SiteHeaderComponent {
  private auth = inject(AuthService);
  private tenantService = inject(TenantService);
  private notificationsService = inject(NotificationsService);

  @Input() showLobbyLinks = true;
  @Input() activeTab: 'lobby' | 'my-picks' | '' = '';

  isLoggedIn = computed(() => this.auth.isLoggedIn());
  authReady = computed(() => this.auth.ready());
  hasUnreadNotifications = this.notificationsService.hasUnreadNotifications;
  mobileMenuOpen = signal(false);

  syncUnreadStatus = effect(() => {
    if (!this.authReady() || !this.isLoggedIn()) {
      this.notificationsService.hasUnreadNotifications.set(false);
      return;
    }

    const user = this.auth.user();
    const tenant = this.tenantService.getTenant();

    if (!user || !tenant) return;

    this.notificationsService.refreshUnreadStatus(
      Number(tenant.tenant.id),
      user.id,
    );
  });

  toggleMobileMenu() {
    this.mobileMenuOpen.update(open => !open);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }
}
