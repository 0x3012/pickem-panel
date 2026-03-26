import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-pickem-vs-card',
  templateUrl: './pickem-vs-card.component.html',
  styleUrls: ['./pickem-vs-card.component.css'],
  imports: [DatePipe]
})
export class PickemVsCardComponent {
  @Input({ required: true }) match!: any;
  @Output() play = new EventEmitter<number>();

  timeLeft: string = '00:00:00';
  private interval: any;

  ngOnInit() {
    this.updateCountdown();
    this.interval = setInterval(() => this.updateCountdown(), 1000);
    console.log('MATCH DATA:', this.match);
  }

  ngOnDestroy() {
    clearInterval(this.interval);
  }

  updateCountdown() {
    if (!this.match?.startsAt) {
      this.timeLeft = '00:00:00';
      return;
    }

    const now = Date.now();
    const start = Number(this.match.startsAt); // 👈 clave
    const diff = start - now;

    if (diff <= 0) {
      this.timeLeft = '00:00:00';
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    this.timeLeft =
      `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  isEndingSoon(): boolean {
    if (!this.match?.startsAt) return false;
    const diff = Number(this.match.startsAt) - Date.now();
    return diff > 0 && diff < 5600000;
  }

  pad(n: number): string {
    return n < 10 ? '0' + n : n.toString();
  }

  startGame() {
    this.play.emit(this.match.id);
  }
}
