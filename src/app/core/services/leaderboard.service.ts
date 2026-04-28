import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LeaderboardEntry, LeaderboardResponse } from '../models/leaderboard.model';


@Injectable({
  providedIn: 'root',
})
export class LeaderboardService {
  private http = inject(HttpClient);

  getLeaderboard(params: {
    tenantId: number;
    sportAlias?: string;
    weekId?: number;
    limit?: number;
    offset?: number;
  }): Observable<LeaderboardResponse> {
    let httpParams = new HttpParams().set('tenantId', String(params.tenantId));

    if (params.sportAlias) {
      httpParams = httpParams.set('sportAlias', params.sportAlias);
    }

    if (params.weekId !== undefined) {
      httpParams = httpParams.set('weekId', String(params.weekId));
    }

    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    if (params.offset !== undefined) {
      httpParams = httpParams.set('offset', String(params.offset));
    }

    const headers = new HttpHeaders({
      'x-api-key': environment.apiKey,
    });

    return this.http.get<LeaderboardResponse>(
      `${environment.apiBaseUrl}/api/v1/pickem-weeks/leaderboard`,
      {
        params: httpParams,
        headers,
      },
    );
  }
}