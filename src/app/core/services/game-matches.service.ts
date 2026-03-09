import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GameMatchesApi {
  private readonly API_URL = `${environment.apiBaseUrl}/api/v1/game-matches`;

  constructor(private http: HttpClient) {}

  getMatch(id: number) {
    return this.http.get<any>(
      `${this.API_URL}/${id}`
    );
  }
}
