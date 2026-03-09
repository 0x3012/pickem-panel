import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { TenantConfig } from '../models/tenant.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TenantService {
  private readonly API_URL = `${environment.apiBaseUrl}/api/v1/tenants`;

 
  private tenant: TenantConfig | null = null;

  constructor(private http: HttpClient) {}

   

  getTenantBySlug(slug: string): Observable<TenantConfig> {
    return this.http
      .get<TenantConfig>(`${this.API_URL}/slug/${slug}`)
      .pipe(
        tap((config) => (this.tenant = config))
      );
  }

 
  getTenant(): TenantConfig | null {
    return this.tenant;
  }

  getFeatures() {
    return this.tenant?.features;
  }

  getGames() {
    return this.tenant?.games;
  }

  getTheme() {
    return this.tenant?.theme;
  }
 

  isReady(): boolean {
    return this.tenant !== null;
  }

  getPrimaryColor(): number | null {
    const hex = this.tenant?.theme?.primaryColor;
    if (!hex) return null;

    return Number(`0x${hex.replace('#', '')}`);
  }
}
