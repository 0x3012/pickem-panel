import { Component, signal, computed, effect, inject } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { Router } from '@angular/router';

import { EmptyStateComponent } from './components/pickem-card/empty-state.component';
import { PickemVsCardComponent } from './components/pickem-vs-card/pickem-vs-card.component';
import { LoginRequiredDialog } from './components/login/login-required.dialog';
import { TenantService } from '../core/services/tenant.service';
import type { Game, TenantConfig } from '../core/models/tenant.model';

import { FixturesService } from '../core/services/fixtures.service';
import type { Fixture } from '../core/models/fixture.model';

import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';
import type { Team } from '../core/models/pick-one-match.model';
import { MatchPicksApi } from '../core/services/match-picks.service';
import type { MatchPick } from '../core/models/match-pick.model';


type PickemMatch = {
  id: number;
  game: Game;
  tournament: string;
  teamA: Team;
  teamB: Team;
  startsAt: string;
};

@Component({
  standalone: true,
  selector: 'app-lobby-page',
  imports: [
    NgIf,
    NgFor,
    PickemVsCardComponent,
    EmptyStateComponent,
    LoginRequiredDialog,

  ],
  templateUrl: './lobby.page.html',
  styleUrls: ['./lobby.page.css']
})
export class LobbyPage {
  /* =========================
     SERVICES
  ========================= */
  private tenantService = inject(TenantService);
  private fixturesService = inject(FixturesService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private picksApi = inject(MatchPicksApi);
  wpLoginUrl = environment.wpLoginUrl;
  /* =========================
     AUTH
  ========================= */

  user = this.auth.user;
  isLoggedIn = this.auth.isLoggedIn;

  /* =========================
     TENANT (LOCAL STATE)
  ========================= */

  tenant = signal<TenantConfig | null>(null);

  enabledGames = computed(() =>
    this.tenant()?.games.enabled ?? []
  );

  /* =========================
     UI STATE
  ========================= */

  showLoginDialog = signal(false);
  pendingPickemId = signal<number | null>(null);

  activeTab = signal<'lobby' | 'my-games'>('lobby');
  activeGame = signal<Game>('CS2');

  loading = signal(false);
  error = signal<string | null>(null);

  /* =========================
     DATA
  ========================= */

  pickems = signal<PickemMatch[]>([]);
  myPicks = signal<MatchPick[]>([]);
  loadingMyPicks = signal(false);

  filteredPickems = computed(() =>
    this.pickems().filter(p => p.game === this.activeGame())
  );

  visiblePickems = computed(() => {
    const game = this.activeGame();


    if (this.activeTab() === 'my-games') {
      const picksByFixture = new Set(
        this.myPicks().map(p => p.fixtureId)
      );

      return this.pickems().filter(
        p => p.game === game && picksByFixture.has(p.id)
      );
    }

    // TAB: LOBBY
    return this.pickems().filter(p => p.game === game);
  });



  constructor() {

    const t = this.tenantService.getTenant();

    if (t) {
      this.tenant.set(t);
    } else {
      this.tenantService.getTenantBySlug('hotspawn').subscribe({
        next: config => this.tenant.set(config),
        error: err =>
          console.error('[LobbyPage] Failed to load tenant', err),
      });
    }
  }

  /* =========================
     SYNC DEFAULT GAME
  ========================= */

  syncDefaultGame = effect(() => {
    const tenant = this.tenant();
    if (!tenant) return;

    const enabled = tenant.games.enabled;
    const next = enabled.includes(tenant.games.defaultGame)
      ? tenant.games.defaultGame
      : enabled[0];

    if (next) this.activeGame.set(next);
  });



  loadFixtures = effect(() => {
    const game = this.activeGame();
    if (!game) return;

    this.loading.set(true);
    this.error.set(null);

    this.fixturesService
      .getFixtures({
        sport_alias: game.toLowerCase(),
        status: 'scheduled'
      })
      .subscribe({
        next: fixtures => {
          this.pickems.set(
            fixtures.map(f => this.mapFixtureToPickem(f))
          );
          this.loading.set(false);
        },
        error: err => {
          console.error(err);
          this.pickems.set([]);
          this.error.set('Failed to load matches');
          this.loading.set(false);
        }
      });
  });



  loadMyPicks = effect(() => {
    if (this.activeTab() !== 'my-games') return;

    if (!this.isLoggedIn()) {
      this.showLoginDialog.set(true);
      this.activeTab.set('lobby');
      return;
    }

    const user = this.user();
    const tenant = this.tenant();

    if (!user || !tenant) return;

    const tenantId = Number(tenant.tenant.id);

    this.loadingMyPicks.set(true);

    this.picksApi
      .getUserPicks(user.id, tenantId)
      .subscribe({
        next: picks => {
          this.myPicks.set(picks);
          this.loadingMyPicks.set(false);
        },
        error: err => {
          console.error(err);
          this.myPicks.set([]);
          this.loadingMyPicks.set(false);
        }
      });
  });


  /* =========================
     ACTIONS
  ========================= */

  selectGame(game: Game) {
    this.activeGame.set(game);
  }

  openGame(pickemId: number) {
    if (!this.isLoggedIn()) {
      this.pendingPickemId.set(pickemId);
      this.showLoginDialog.set(true);
      return;
    }

    this.router.navigate(['/game', pickemId]);
  }

  closeLoginDialog() {
    this.showLoginDialog.set(false);
    this.pendingPickemId.set(null);
  }


  openWpLogin() {
    this.showLoginDialog.set(false);

    const loginUrl = environment.wpLoginUrl;
    // ej: https://www.hotspawn.com/login/

    const popup = window.open(
      loginUrl,
      'wpLogin',
      'width=520,height=720'
    );

    if (!popup) {
        return;
    }

    const poll = setInterval(async () => {
      if (popup.closed) {
        clearInterval(poll);
        await this.afterLoginPopup();
      }
    }, 600);
  }

  private async afterLoginPopup() {
    try {
      await this.auth.refresh();
    } catch (e) {
      return;
    }

    if (!this.isLoggedIn()) {
      // el usuario cerró el popup sin loguearse
      return;
    }

    const pickemId = this.pendingPickemId();
    if (pickemId) {
      this.pendingPickemId.set(null);
      this.router.navigate(['/game', pickemId]);
    }
  }




  /* =========================
     MAPPERS
  ========================= */

  private mapFixtureToPickem(f: Fixture): PickemMatch {
    return {
      id: Number(f.id),
      game: f.sport_alias.toUpperCase() as Game,

      tournament: f.competition_name ?? 'Unknown tournament',

      teamA: {
        id: String(f.participants0_id ?? ''),
        name: f.participants0_name ?? 'TBD',
        logo: this.teamLogo(f.participants0_id)
      },

      teamB: {
        id: String(f.participants1_id ?? ''),
        name: f.participants1_name ?? 'TBD',
        logo: this.teamLogo(f.participants1_id)
      },

      startsAt:
        f.scheduled_start_time ??
        f.start_time ??
        new Date().toISOString()
    };
  }

  private teamLogo(teamId: string | number | null | undefined): string {
    if (!teamId) {
      return '/assets/teams/unknown.png';
    }
    return `${environment.apiBaseUrl}/teams/${teamId}.svg`;
  }
}
