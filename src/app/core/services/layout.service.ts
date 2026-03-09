import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { TenantService } from './tenant.service';
import { NotificationsService } from './notifications.service';

@Injectable({ providedIn: 'root' })
export class LayoutService {

  private clientKey = 'hs2024$!@#super-secret-client-key';
  private notificationsStarted = false;

  constructor(
    private auth: AuthService,
    private tenants: TenantService,
    private notifications: NotificationsService
  ) {}
 
  initNotificationsWhenReady() {
     if (this.notificationsStarted) return;

    const interval = setInterval(() => {
       if (!this.auth.ready()) return;

      const user = this.auth.user();
      const tenantConfig = this.tenants.getTenant();

      if (!user || !tenantConfig) return;

      this.notifications.connect(
        tenantConfig.tenant.id,
        String(user.id),
      );

      console.log('🔔 Notifications connected', {
        tenantId: tenantConfig.tenant.id,
        userId: user.id,
      });

      this.notificationsStarted = true;
      clearInterval(interval);
    }, 100);
  }

 
  async loadLayout(token?: string) {
    const tenant = this.resolveTenant();

    const headers: Record<string, string> = {
      ClientKey: this.clientKey,
      'X-Tenant': tenant,
    };

    if (token) headers['Token'] = token;

    const [menuData, footerData] = await Promise.all([
      this.fetchEndpoint(
        'https://wordpressmu-1372681-5818581.cloudwaysapps.com/wp-json/gamification/v1/menu_html',
        headers
      ),
      this.fetchEndpoint(
        'https://wordpressmu-1372681-5818581.cloudwaysapps.com/wp-json/gamification/v1/footer_html',
        headers
      ),
    ]);

    const jsAssets = new Set<string>([
      ...(menuData.assets?.js || []),
      ...(footerData.assets?.js || []),
    ]);

    await Promise.all(
      [...jsAssets].map(src => this.ensureJs(src))
    );

    [
      ...(menuData.assets?.css || []),
      ...(footerData.assets?.css || []),
    ].forEach(href => this.ensureCss(href));

    this.injectHtml('hs-header', menuData.html);
    this.injectHtml('hs-footer', footerData.html);

    requestAnimationFrame(() => {
      (window as any).HSMenu?.init?.(
        document.getElementById('hs-header')
      );

      (window as any).HSFooter?.init?.(
        document.getElementById('hs-footer')
      );
    });
  }

 
  private async fetchEndpoint(url: string, headers: any) {
    const res = await fetch(url, { headers });
    const json = await res.json();
    if (json?.code !== 200) {
      throw new Error('Layout API error');
    }
    return json;
  }

  private injectHtml(id: string, html: string) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html || '';
  }

  private ensureCss(href: string) {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }

  private ensureJs(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(`Failed loading ${src}`);
      document.body.appendChild(script);
    });
  }

  private resolveTenant() {
    const host = window.location.hostname;
    if (host.includes('hotspawn')) return 'hotspawn';
    if (host.includes('rankrush')) return 'rankrush';
    return 'default';
  }
}
