import {
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { TenantService } from '../core/services/tenant.service';
import { AuthService } from '../core/services/auth.service';
import {
  LeaderboardPageApi,
} from '../core/services/leaderboard-page.service';
import type {
  LeaderboardPageEntry,
  LeaderboardPagePrize,
  LeaderboardPageResponse,
} from '../core/models/leaderboard-page.model';

@Component({
  standalone: true,
  selector: 'app-leaderboard-page',
  imports: [CommonModule],
  templateUrl: './leaderboard-page.component.html',
  styleUrls: ['./leaderboard-page.component.css'],
})
export class LeaderboardPageComponent {
  private tenantService = inject(TenantService);
  private auth = inject(AuthService);
  private leaderboardApi = inject(LeaderboardPageApi);
  private router = inject(Router);

  tenant = signal<any | null>(null);
  data = signal<LeaderboardPageResponse | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  page = signal(1);
  pageSize = 10;
  selectedGame = signal<string | null>(null);

  user = this.auth.user;
  isLoggedIn = this.auth.isLoggedIn;
  enabledGames = computed(() => this.tenant()?.games?.enabled ?? []);

  constructor() {
    const t = this.tenantService.getTenant();

    if (t) {
      this.tenant.set(t);
    } else {
      this.tenantService.getTenantBySlug('hotspawn').subscribe({
        next: (config) => this.tenant.set(config),
        error: (err) => {
          console.error('[LeaderboardPage] Failed to load tenant', err);
          this.error.set('Failed to load tenant');
        },
      });
    }
  }

  syncSelectedGame = effect(() => {
    const tenant = this.tenant();
    if (!tenant) return;

    const games = tenant.games?.enabled ?? [];
    const defaultGame = tenant.games?.defaultGame ?? games[0] ?? null;
    const currentGame = this.selectedGame();

    if (!currentGame || !games.includes(currentGame as any)) {
      this.selectedGame.set(defaultGame);
    }
  });

  loadPage = effect(() => {
    const tenant = this.tenant();
    const currentPage = this.page();
    const currentUser = this.user();
    const currentGame = this.selectedGame();

    if (!tenant) return;

    const tenantId = Number(tenant.tenant.id);
    const sportAlias = String(currentGame ?? '').toLowerCase();

    if (!sportAlias) return;

    this.loading.set(true);
    this.error.set(null);

    this.leaderboardApi
      .getLeaderboardPage({
        tenantId,
        sportAlias,
        email: currentUser?.email ?? undefined,
        limit: this.pageSize,
        offset: (currentPage - 1) * this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.data.set(res);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('[LeaderboardPage] Failed to load leaderboard page', err);
          this.data.set(null);
          this.loading.set(false);
          this.error.set('Failed to load leaderboard');
        },
      });
  });

  title = computed(() => 'Leaderboard');

  resetText = computed(() => {
    const cutoffUtc = this.data()?.cutoffUtc;
    if (!cutoffUtc) return '--';

    const now = Date.now();
    const cutoff = new Date(cutoffUtc).getTime();
    const diff = Math.max(cutoff - now, 0);

    const totalHours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (days > 0) {
      return `${days}d ${hours}h`;
    }

    return `${hours}h`;
  });

  entries = computed(() => this.data()?.entries ?? []);
  prizes = computed(() => this.data()?.prizes ?? []);
  player = computed(() => this.data()?.player ?? null);

  topPrizes = computed(() => {
    const prizes = this.prizes();

    const ranked = prizes
      .filter((p) => p.ruleType === 'RANK')
      .sort((a, b) => {
        const aRank = a.minRank ?? 9999;
        const bRank = b.minRank ?? 9999;
        return aRank - bRank;
      });

    return ranked.slice(0, 3);
  });

  playerName = computed(() => {
    const player = this.player();
    if (!player) return '[username]';

    return (
      player.displayName?.trim() ||
      player.username?.trim() ||
      player.email ||
      '[username]'
    );
  });

  playerStats = computed(() => {
    const player = this.player();

    if (!player) {
      return {
        rank: '--',
        points: '--',
        wl: '--',
      };
    }

    return {
      rank: player.rank,
      points: player.totalPoints,
      wl: `${player.wins}-${player.losses}`,
    };
  });

  highlightedPlayerUserId = computed(() => {
    const player = this.player();
    return player?.userId ?? null;
  });

  pointsAwayText = computed(() => {
    const player = this.player();
    const prizes = this.prizes();

    if (!player) return null;

    const pointPrizes = prizes
      .filter((p) => p.ruleType === 'POINTS' && p.minPoints !== null)
      .sort((a, b) => (a.minPoints ?? 0) - (b.minPoints ?? 0));

    const nextPrize = pointPrizes.find(
      (p) => (p.minPoints ?? 0) > player.totalPoints
    );

    if (!nextPrize || nextPrize.minPoints === null) return null;

    const diff = nextPrize.minPoints - player.totalPoints;
    if (diff <= 0) return null;

    return `${diff} points away from a reward`;
  });

  pageNumbers = computed(() => {
    const current = this.page();
    const total = Math.max(current + 4, 10);

    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    if (current > 3) pages.push('...');

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 2) pages.push('...');

    pages.push(total);

    return pages;
  });

  trackByRank(_: number, item: LeaderboardPageEntry) {
    return `${item.rank}-${item.userId}`;
  }

  goToPage(page: number | string) {
    if (typeof page !== 'number') return;
    if (page < 1) return;
    this.page.set(page);
  }

  selectGame(game: string) {
    if (this.selectedGame() === game) return;

    this.selectedGame.set(game);
    this.page.set(1);
  }

  prevPage() {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
    }
  }

  nextPage() {
    this.page.update((p) => p + 1);
  }

  getEntryName(entry: LeaderboardPageEntry): string {
    if (
      this.highlightedPlayerUserId() !== null &&
      entry.userId === this.highlightedPlayerUserId()
    ) {
      return 'Me';
    }

    return (
      entry.displayName?.trim() ||
      entry.username?.trim() ||
      entry.email?.trim() ||
      `Player #${entry.rank}`
    );
  }

  getPrizeBadge(prize: LeaderboardPagePrize, index: number): string {
    if (prize.minRank === 1 || index === 0) return '1';
    if (prize.minRank === 2 || index === 1) return '2';
    if (prize.minRank === 3 || index === 2) return '3';
    return String(index + 1);
  }

  getPrizeTitle(prize: LeaderboardPagePrize, index: number): string {
    if (prize.title?.trim()) return prize.title;

    if (prize.ruleType === 'RANK') {
      if (prize.minRank === 1) return '1st Place';
      if (prize.minRank === 2) return '2nd Place';
      if (prize.minRank === 3) return '3rd Place';
      if (prize.minRank && prize.maxRank && prize.minRank !== prize.maxRank) {
        return `${prize.minRank}-${prize.maxRank} Place`;
      }
    }

    if (prize.ruleType === 'POINTS' && prize.minPoints) {
      return `${prize.minPoints}+ Points`;
    }

    return `Prize ${index + 1}`;
  }

  openFullLeaderboard() {
    this.router.navigate(['/leaderboard']);
  }
}
