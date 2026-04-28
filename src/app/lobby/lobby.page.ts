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
import { LeaderboardComponent, LeaderboardResponse } from './components/leaderboard/leaderboard.component';
import { LeaderboardService } from '../core/services/leaderboard.service';
import { NotificationsService } from '../core/services/notifications.service';

type PickemMatch = {
  id: number;
  game: Game;
  tournament: string;
  teamA: Team;
  teamB: Team;
  startsAt: string;
  status?: string | null;
  lock_time?: string | null;
  lockTime?: string | null;
};

type GameFilter = Game | 'ALL';

@Component({
  standalone: true,
  selector: 'app-lobby-page',
  imports: [
    NgIf,
    NgFor,
    PickemVsCardComponent,
    EmptyStateComponent,
    LoginRequiredDialog,
    LeaderboardComponent,

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
  private leaderboardService = inject(LeaderboardService);
  private notificationsService = inject(NotificationsService);

  leaderboard = signal<LeaderboardResponse | null>(null);
  loadingLeaderboard = signal(false);
  wpLoginUrl = environment.wpLoginUrl;
  /* =========================
     AUTH
  ========================= */

  user = this.auth.user;
  isLoggedIn = computed(() => this.auth.isLoggedIn());
  authReady = computed(() => this.auth.ready());

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
  activeGame = signal<GameFilter>('ALL');
  loading = signal(false);
  error = signal<string | null>(null);

  /* =========================
     DATA
  ========================= */

  pickems = signal<PickemMatch[]>([]);
  myPicks = signal<MatchPick[]>([]);
  loadingMyPicks = signal(false);
  subscribedFixtureIds = signal<Set<number>>(new Set());
  subscriptionPendingIds = signal<Set<number>>(new Set());

  filteredPickems = computed(() => {
    const game = this.activeGame();

    if (game === 'ALL') {
      return this.pickems();
    }

    return this.pickems().filter(p => p.game === game);
  });
  visiblePickems = computed(() => {
    const game = this.activeGame();

    if (game === 'ALL') {
      return this.pickems();
    }

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
  loadLeaderboard = effect(() => {
    const tenant = this.tenant();
    const game = this.activeGame();

    if (!tenant || !game) return;

    const tenantId = Number(tenant.tenant.id);

    if (!Number.isInteger(tenantId)) {
      this.leaderboard.set(null);
      return;
    }

    this.loadingLeaderboard.set(true);

    this.leaderboardService
      .getLeaderboard({
        tenantId,
        sportAlias: game.toLowerCase(),
        limit: 10,
        offset: 0,
      })
      .subscribe({
        next: (data) => {
          this.leaderboard.set(data);
          this.loadingLeaderboard.set(false);
        },
        error: (err) => {
          console.error('[LobbyPage] Failed to load leaderboard', err);
          this.leaderboard.set(null);
          this.loadingLeaderboard.set(false);
        },
      });
  });

  syncDefaultGame = effect(() => {
    const tenant = this.tenant();
    if (!tenant) return;

    this.activeGame.set('CS2');
  });

  loadFixtures = effect(() => {
    const game = this.activeGame();

    this.loading.set(true);
    this.error.set(null);

    const request =
      game === 'ALL'
        ? this.fixturesService.getFixtures({
          status: 'scheduled'
        })
        : this.fixturesService.getFixtures({
          sport_alias: game.toLowerCase(),
          status: 'scheduled'
        });

    request.subscribe({
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

    if (!this.authReady()) return;

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

  loadMatchSubscriptions = effect(() => {
    if (!this.authReady()) return;

    if (!this.isLoggedIn()) {
      this.subscribedFixtureIds.set(new Set());
      return;
    }

    const user = this.user();
    const tenant = this.tenant();
    const fixtureIds = this.pickems().map(match => String(match.id));

    if (!user || !tenant || !fixtureIds.length) {
      this.subscribedFixtureIds.set(new Set());
      return;
    }

    this.notificationsService
      .getMatchSubscriptions(String(tenant.tenant.id), String(user.id), fixtureIds)
      .subscribe({
        next: ({ fixtureIds: subscribedIds }) => {
          this.subscribedFixtureIds.set(
            new Set(subscribedIds.map(id => Number(id)))
          );
        },
        error: err => {
          console.error('[LobbyPage] Failed to load match subscriptions', err);
          this.subscribedFixtureIds.set(new Set());
        },
      });
  });


  /* =========================
     ACTIONS
  ========================= */

  selectGame(game: GameFilter) {
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

  openLeaderboard() {
    this.router.navigate(['/leaderboard']);
  }

  isMatchSubscribed(fixtureId: number): boolean {
    return this.subscribedFixtureIds().has(fixtureId);
  }

  isSubscriptionPending(fixtureId: number): boolean {
    return this.subscriptionPendingIds().has(fixtureId);
  }

  toggleMatchSubscription(fixtureId: number) {
    if (!this.authReady()) return;

    if (!this.isLoggedIn()) {
      this.showLoginDialog.set(true);
      return;
    }

    const user = this.user();
    const tenant = this.tenant();

    if (!user || !tenant) return;

    const enabled = !this.isMatchSubscribed(fixtureId);

    this.subscriptionPendingIds.update(ids => {
      const next = new Set(ids);
      next.add(fixtureId);
      return next;
    });

    this.notificationsService
      .updateMatchSubscription({
        tenantId: String(tenant.tenant.id),
        userId: String(user.id),
        fixtureId: String(fixtureId),
        enabled,
      })
      .subscribe({
        next: ({ enabled: isEnabled }) => {
          this.subscribedFixtureIds.update(ids => {
            const next = new Set(ids);

            if (isEnabled) {
              next.add(fixtureId);
            } else {
              next.delete(fixtureId);
            }

            return next;
          });
        },
        error: err => {
          console.error('[LobbyPage] Failed to update match subscription', err);
          this.subscriptionPendingIds.update(ids => {
            const next = new Set(ids);
            next.delete(fixtureId);
            return next;
          });
        },
        complete: () => {
          this.subscriptionPendingIds.update(ids => {
            const next = new Set(ids);
            next.delete(fixtureId);
            return next;
          });
        },
      });
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
      await this.auth.refresh({ announce: 'login' });
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
  closingSoonPickems = computed(() => {
    const now = Date.now();
    const next24Hours = now + 24 * 60 * 60 * 1000;

    return this.visiblePickems()
      .filter(match => {
        const startMs = this.getMatchStartMs(match);
        return startMs > now && startMs < next24Hours;
      })
      .sort((a, b) => this.getMatchStartMs(a) - this.getMatchStartMs(b));
  });

  upcomingPickems = computed(() => {
    const next24Hours = Date.now() + 24 * 60 * 60 * 1000;

    return this.visiblePickems()
      .filter(match => {
        const startMs = this.getMatchStartMs(match);
        return startMs >= next24Hours;
      })
      .sort((a, b) => this.getMatchStartMs(a) - this.getMatchStartMs(b));
  });

  hasDisplayablePickems = computed(() =>
    this.closingSoonPickems().length > 0 || this.upcomingPickems().length > 0
  );

  private getMatchStartMs(match: PickemMatch): number {
  const raw = match.startsAt;

  if (!raw) return 0;

  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber;
  }

  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
  private mapFixtureToPickem(f: Fixture): PickemMatch {
    return {
      id: Number(f.id),
      game: f.sport_alias.toUpperCase() as Game,

      tournament: f.competition_name ?? 'Unknown tournament',

      teamA: {
        id: String(f.participants0_id ?? ''),
        name: f.participants0_name ?? 'TBD',
        logo: this.teamLogo(f.participants0_id),
        pickedPercent: f.participants0_picked_percent ?? 0,
      },

      teamB: {
        id: String(f.participants1_id ?? ''),
        name: f.participants1_name ?? 'TBD',
        logo: this.teamLogo(f.participants1_id),
        pickedPercent: f.participants1_picked_percent ?? 0,
      },

      startsAt:
        f.scheduled_start_time ??
        f.start_time ??
        new Date().toISOString(),

      status: f.status,
      lock_time: f.lock_time
    };
  }

  private teamLogo(teamId: string | number | null | undefined): string {
    if (!teamId) {
      return '/hs-logo-flat.png';
    }
    return `${environment.apiBaseUrl}/teams/${teamId}.svg`;
  }
}
