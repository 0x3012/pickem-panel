import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-pickem-vs-card',
  imports: [NgIf],
  templateUrl: './pickem-vs-card.component.html',
  styleUrls: ['./pickem-vs-card.component.css']
})
export class PickemVsCardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) match!: any;
  @Input() notificationsEnabled = false;
  @Input() notificationsLoading = false;
  @Output() play = new EventEmitter<number>();
  @Output() toggleNotifications = new EventEmitter<number>();

  readonly fallbackLogo = '/hs-logo-flat.png';

  startsAtDate = '';
  lockTimeDate = '';
  countdownText = '';

  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.formatStartDate();
    this.formatLockTime();
    this.updateCountdown();

    this.timer = setInterval(() => {
      this.updateCountdown();
    }, 1000);

    console.log('MATCH DATA:', this.match);
    console.log('CARD STATUS:', this.match?.status, this.match);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // 🕒 Start date (unchanged)
  formatStartDate() {
    if (!this.match?.startsAt) {
      this.startsAtDate = 'TBD';
      return;
    }

    const date = new Date(Number(this.match.startsAt));

    this.startsAtDate = date.toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  // 🔒 NEW: formatted lock time
  formatLockTime() {
    const lockTime = this.match?.lock_time || this.match?.lockTime;
    if (!lockTime) {
      this.lockTimeDate = 'N/A';
      return;
    }

    const date = new Date(Number(lockTime));

    this.lockTimeDate = date.toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

   updateCountdown() {
    const lockTime = this.match?.lock_time || this.match?.lockTime;
    if (!lockTime) {
      this.countdownText = 'No lock';
      return;
    }

    const diff = Number(lockTime) - Date.now();

    if (diff <= 0) {
      this.countdownText = 'Locked';
      return;
    }

    this.countdownText = this.formatCountdown(diff);
  }

  private formatCountdown(diff: number): string {
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }

    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  // 🔥 UPDATED: now based on lock_time (not startsAt)
  isEndingSoon(): boolean {
    const lockTime = this.match?.lock_time || this.match?.lockTime;
    if (!lockTime) return false;

    const diff = Number(lockTime) - Date.now();
    return diff > 0 && diff < 5_600_000; // ~1.5h
  }

  shouldShowLockBlock(): boolean {
    const status = String(this.match?.status ?? '').trim().toLowerCase();
    return status !== 'ended';
  }

  startGame() {
    this.play.emit(this.match.id);
  }

  onToggleNotifications(event: Event) {
    event.stopPropagation();

    if (this.notificationsLoading) {
      return;
    }

    this.toggleNotifications.emit(this.match.id);
  }

  onLogoError(event: Event, originalLogo: string) {
    const image = event.target as HTMLImageElement;

    if (image.src.includes('.svg') && originalLogo.endsWith('.svg')) {
      image.src = originalLogo.replace('.svg', '.png');
      return;
    }

    image.src = this.fallbackLogo;
  }

  hasResolvedPickResult(): boolean {
    return this.match?.won !== undefined && this.match?.won !== null;
  }

  isWinningPick(): boolean {
    return this.match?.won === true;
  }

  isLosingPick(): boolean {
    return this.match?.won === false;
  }

  isPickedTeam(teamId: string | number | null | undefined): boolean {
    if (teamId === null || teamId === undefined) return false;

    return Number(this.match?.pickedTeamId) === Number(teamId);
  }

  questionLabel(): string {
    return this.match?.pickedTeamId !== undefined ? 'Results:' : 'Who will win?';
  }

  private pad(n: number): string {
    return n < 10 ? '0' + n : n.toString();
  }
}
