import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';

export interface LeaderboardEntry {
  userId: string;
  email: string | null;
  totalPoints: number;
  rank: number;
  totalPicks?: number;
  username?: string | null;
  displayName?: string | null;
}

export interface LeaderboardResponse {
  weekId: string;
  sportAlias: string;
  status: 'OPEN' | 'CLOSED';
  weekStartUtc: string;
  weekEndUtc: string;
  cutoffUtc: string;
  entries: LeaderboardEntry[];
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.css'],
})
export class LeaderboardComponent {
  private readonly _data = signal<LeaderboardResponse | null>(null);

  @Input() set data(value: LeaderboardResponse | null) {
    this._data.set(value);
  }

  @Input() title = 'Leaderboard';
  @Input() maxRows = 10;
  @Input() viewAllLabel = 'View Leaderboard';
  @Input() loading = false;

  @Output() viewLeaderboard = new EventEmitter<void>();

  rows = computed(() => {
    const data = this._data();
    if (!data?.entries?.length) return [];
    return data.entries.slice(0, this.maxRows).map((entry) => ({
      ...entry,
      playerName: this.getPlayerName(entry),
    }));
  });

  onViewLeaderboard() {
    this.viewLeaderboard.emit();
  }

  hasEntries = computed(() => this.rows().length > 0);

  trackByUserId(_: number, item: { userId: string }) {
    return item.userId;
  }

  getPlayerName(entry: LeaderboardEntry): string {
    return (
      entry.displayName?.trim() ||
      entry.username?.trim() ||
      entry.email?.trim() ||
      `Player #${entry.rank}`
    );
  }

 
}