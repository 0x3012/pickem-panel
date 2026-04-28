import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TenantService } from './core/services/tenant.service';
import { LayoutService } from './core/services/layout.service';
import { AuthService } from './core/services/auth.service';
import { ToastService } from './core/services/toast.service';
import { ToastContainerComponent } from './lobby/components/toast/toast.component';
import { SiteHeaderComponent } from './lobby/components/header/site-header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,ToastContainerComponent,SiteHeaderComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit {

  constructor(public toast: ToastService,
    private tenantService: TenantService,
    private layout: LayoutService,
    private auth: AuthService
    
  ) {}


  ngOnInit(): void {
     this.tenantService.getTenantBySlug('hotspawn').subscribe({
      next: () => {
         this.layout.loadLayout();

         this.layout.initNotificationsWhenReady();
      },
      error: (err) => {
        console.error('[App] Failed to bootstrap tenant', err);
      },
    });
  }
}
