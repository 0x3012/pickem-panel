import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Fixture } from '../models/fixture.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FixturesService {
  private readonly API_URL = `${environment.apiBaseUrl}/api/v1/fixtures`;

  constructor(private http: HttpClient) {}

  getFixtures(params?: {
    sport_alias?: string;
    competition_id?: string;
    status?: string;
  }): Observable<Fixture[]> {
    let httpParams = new HttpParams();
 
    httpParams = httpParams.set('status', params?.status ?? 'scheduled');

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          key !== 'status'  
        ) {
          httpParams = httpParams.set(key, value);
        }
      });
    }

    return this.http.get<Fixture[]>(this.API_URL, {
      params: httpParams,
    });
  }
}
