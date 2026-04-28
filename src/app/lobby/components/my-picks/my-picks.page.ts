import { Component, signal, computed, effect, inject } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { Router } from '@angular/router';

import { EmptyStateComponent } from '../pickem-card/empty-state.component';
import { PickemVsCardComponent } from '../pickem-vs-card/pickem-vs-card.component';
import { LoginRequiredDialog } from '../login/login-required.dialog';
import { TenantService } from '../../../core/services/tenant.service';
import type { Game, TenantConfig } from '../../../core/models/tenant.model';

import type { Fixture } from '../../../core/models/fixture.model';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import type { Team } from '../../../core/models/pick-one-match.model';
import { MatchPicksApi } from '../../../core/services/match-picks.service';
import { NotificationsService } from '../../../core/services/notifications.service';

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
    pickedTeamId?: number | null;
    won?: boolean | null;
};
type GameFilter = Game | 'ALL';
@Component({
    standalone: true,
    selector: 'app-my-picks-page',
    imports: [
        NgIf,
        NgFor,
        PickemVsCardComponent,
        EmptyStateComponent,
        LoginRequiredDialog,
    ],
    templateUrl: './my-picks.page.html',
    styleUrls: ['./my-picks.page.css']
})
export class MyPicksPage {
    private tenantService = inject(TenantService);
    private router = inject(Router);
    private auth = inject(AuthService);
    private picksApi = inject(MatchPicksApi);
    private notificationsService = inject(NotificationsService);

    user = this.auth.user;
    isLoggedIn = computed(() => this.auth.isLoggedIn());
    authReady = computed(() => this.auth.ready());

    tenant = signal<TenantConfig | null>(null);

    enabledGames = computed(() =>
        this.tenant()?.games.enabled ?? []
    );

    showLoginDialog = signal(false);
    pendingPickemId = signal<number | null>(null);

    activeGame = signal<GameFilter>('ALL');

    loading = signal(false);
    loadingMyPicks = signal(false);
    error = signal<string | null>(null);

    pickems = signal<PickemMatch[]>([]);
    subscribedFixtureIds = signal<Set<number>>(new Set());
    subscriptionPendingIds = signal<Set<number>>(new Set());

visiblePickems = computed(() => {
  const game = this.activeGame();

  if (game === 'ALL') {
    return this.pickems();
  }

  return this.pickems().filter(
    p => p.game === game
  );
});

    constructor() {
        const t = this.tenantService.getTenant();

        if (t) {
            this.tenant.set(t);
        } else {
            this.tenantService.getTenantBySlug('hotspawn').subscribe({
                next: config => this.tenant.set(config),
                error: err =>
                    console.error('[MyPicksPage] Failed to load tenant', err),
            });
        }
    }

syncDefaultGame = effect(() => {
  const tenant = this.tenant();
  if (!tenant) return;

  this.activeGame.set('ALL');
});

    loadMyPicks = effect(() => {
        if (!this.authReady()) return;

        if (!this.isLoggedIn()) {
            this.showLoginDialog.set(true);
            this.pickems.set([]);
            this.subscribedFixtureIds.set(new Set());
            return;
        }

        const user = this.user();

        if (!user) return;

        this.loadingMyPicks.set(true);
        this.loading.set(true);
        this.error.set(null);

        const game = this.activeGame();
        const filters =
            game === 'ALL'
                ? undefined
                : { sport_alias: game.toLowerCase() };

        this.picksApi
            .getUserPickedFixtures(user.id, filters)
            .subscribe({
                next: fixtures => {
                    this.pickems.set(
                        fixtures.map(f => this.mapFixtureToPickem(f))
                    );
                    this.loadingMyPicks.set(false);
                    this.loading.set(false);
                },
                error: err => {
                    console.error(err);
                    this.pickems.set([]);
                    this.loadingMyPicks.set(false);
                    this.error.set('Failed to load your picks');
                    this.loading.set(false);
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
        const fixtureIds = this.visiblePickems().map(match => String(match.id));

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
                    console.error('[MyPicksPage] Failed to load match subscriptions', err);
                    this.subscribedFixtureIds.set(new Set());
                }
            });
    });

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
                    console.error('[MyPicksPage] Failed to update match subscription', err);
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
                }
            });
    }

    openWpLogin() {
        this.showLoginDialog.set(false);

        const loginUrl = environment.wpLoginUrl;

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
            return;
        }

        const pickemId = this.pendingPickemId();
        if (pickemId) {
            this.pendingPickemId.set(null);
            this.router.navigate(['/game', pickemId]);
        }
    }

    private mapFixtureToPickem(f: Fixture): PickemMatch {
        const pickedTeamId =
            f.picked_team_id !== undefined && f.picked_team_id !== null
                ? Number(f.picked_team_id)
                : null;
        const won =
            f.won === undefined || f.won === null
                ? null
                : Boolean(Number(f.won));

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
            lock_time: f.lock_time,
            pickedTeamId,
            won
        };
    }

    private teamLogo(teamId: string | number | null | undefined): string {
        if (!teamId) {
            return '/hs-logo-flat.png';
        }
        return `${environment.apiBaseUrl}/teams/${teamId}.svg`;
    }
}
