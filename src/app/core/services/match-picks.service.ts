import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

import {
  CreateMatchPickRequest,
  CreateMatchPickResponse,
  MatchPick
} from '../models/match-pick.model';

@Injectable({
  providedIn: 'root'
})
export class MatchPicksApi {

  private http = inject(HttpClient);

  private readonly API_URL = `${environment.apiBaseUrl}/api/v1/match-picks`;


  getUserPicks(
    userId: number,
    tenantId: number
  ): Observable<MatchPick[]> {

    const params = new HttpParams()
      .set('tenantId', String(tenantId));

    return this.http
      .get<any[]>(
        `${this.API_URL}/user/${userId}`,
        {
          params,
          withCredentials: true,
        }
      )
      .pipe(
        map(rows => rows.map(r => this.mapApiPick(r)))
      );
  }


  getUserPickForMatch(
    userId: number,
    matchId: number,
    tenantId: number
  ): Observable<MatchPick | null> {

    const params = new HttpParams()
      .set('tenantId', String(tenantId));

    return this.http.get<any>(
      `${this.API_URL}/user/${userId}/match/${matchId}`,
      {
        params,
        withCredentials: true,
      }
    ).pipe(
      map(row => row ? this.mapApiPick(row) : null)
    );
  }


  createPick(
    payload: CreateMatchPickRequest
  ): Observable<CreateMatchPickResponse> {

    const body = {
      tenantId: String(payload.tenantId),
      userId: String(payload.userId),
      userEmail: payload.userEmail,
      matchId: String(payload.matchId),
      pickedTeamId:
        payload.pickedTeamId !== null
          ? String(payload.pickedTeamId)
          : null,
      userLockTime: payload.userLockTime,
      deviceHash: payload.deviceHash ?? null, 

    };

    return this.http.post<CreateMatchPickResponse>(
      this.API_URL,
      body,
      { withCredentials: true }
    );
  }

  /* =========================
     MAPPER
  ========================= */

  private mapApiPick(row: any): MatchPick {
    return {
      id: Number(row.id),

      tenantId: Number(row.tenant_id),

      userId: Number(row.user_id),
      userEmail: row.user_email,

      fixtureId: Number(row.fixture_id),

      pickedTeamId: row.picked_team_id
        ? Number(row.picked_team_id)
        : null,

      userLockTime: row.user_lock_time,
      serverReceivedAt: row.server_received_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
