import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

import {
  GetLeaderboardPageParams,
  LeaderboardPageEntry,
  LeaderboardPagePlayer,
  LeaderboardPagePrize,
  LeaderboardPageResponse,
} from '../models/leaderboard-page.model';

@Injectable({
  providedIn: 'root'
})
export class LeaderboardPageApi {
  private http = inject(HttpClient);

  private readonly API_URL = `${environment.apiBaseUrl}/api/v1/pickem-weeks`;

  getLeaderboardPage(
    params: GetLeaderboardPageParams
  ): Observable<LeaderboardPageResponse> {
    let httpParams = new HttpParams()
      .set('tenantId', String(params.tenantId));

    if (params.sportAlias) {
      httpParams = httpParams.set('sportAlias', params.sportAlias);
    }

    if (params.weekId !== undefined) {
      httpParams = httpParams.set('weekId', String(params.weekId));
    }

    if (params.email) {
      httpParams = httpParams.set('email', params.email);
    }

    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', String(params.limit));
    }

    if (params.offset !== undefined) {
      httpParams = httpParams.set('offset', String(params.offset));
    }

    return this.http.get<any>(
      `${this.API_URL}/leaderboard-page`,
      {
        params: httpParams,
        withCredentials: true,
      }
    ).pipe(
      map(row => this.mapLeaderboardPage(row))
    );
  }

  /* =========================
     MAPPERS
  ========================= */

  private mapLeaderboardPage(row: any): LeaderboardPageResponse {
    return {
      weekId: Number(row.weekId),
      sportAlias: row.sportAlias,
      status: row.status,
      weekStartUtc: row.weekStartUtc,
      weekEndUtc: row.weekEndUtc,
      cutoffUtc: row.cutoffUtc,
      entries: Array.isArray(row.entries)
        ? row.entries.map((entry: any) => this.mapEntry(entry))
        : [],
      player: row.player ? this.mapPlayer(row.player) : null,
      prizes: Array.isArray(row.prizes)
        ? row.prizes.map((prize: any) => this.mapPrize(prize))
        : [],
    };
  }

  private mapEntry(row: any): LeaderboardPageEntry {
    return {
      userId: Number(row.userId),
      email: row.email ?? null,
      totalPoints: Number(row.totalPoints ?? 0),
      rank: Number(row.rank ?? 0),
      totalPicks: Number(row.totalPicks ?? 0),
      correctPicks:
        row.correctPicks !== undefined && row.correctPicks !== null
          ? Number(row.correctPicks)
          : undefined,
      username: row.username ?? null,
      displayName: row.displayName ?? null,
      avatar: row.avatar ?? null,
    };
  }

  private mapPlayer(row: any): LeaderboardPagePlayer {
    return {
      userId: Number(row.userId),
      email: row.email,
      rank: Number(row.rank ?? 0),
      totalPoints: Number(row.totalPoints ?? 0),
      wins: Number(row.wins ?? 0),
      losses: Number(row.losses ?? 0),
      totalPicks: Number(row.totalPicks ?? 0),
      username: row.username ?? null,
      displayName: row.displayName ?? null,
      avatar: row.avatar ?? null,
    };
  }

  private mapPrize(row: any): LeaderboardPagePrize {
    return {
      id: Number(row.id),
      title: row.title,
      description: row.description ?? null,
      imageUrl: row.imageUrl ?? null,
      ruleType: row.ruleType,
      minRank:
        row.minRank !== undefined && row.minRank !== null
          ? Number(row.minRank)
          : null,
      maxRank:
        row.maxRank !== undefined && row.maxRank !== null
          ? Number(row.maxRank)
          : null,
      minPoints:
        row.minPoints !== undefined && row.minPoints !== null
          ? Number(row.minPoints)
          : null,
      quantityTotal:
        row.quantityTotal !== undefined && row.quantityTotal !== null
          ? Number(row.quantityTotal)
          : null,
      quantityClaimed:
        row.quantityClaimed !== undefined && row.quantityClaimed !== null
          ? Number(row.quantityClaimed)
          : null,
    };
  }
}