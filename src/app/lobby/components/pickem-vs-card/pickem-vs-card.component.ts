import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-pickem-vs-card',
  templateUrl: './pickem-vs-card.component.html',
  styleUrls: ['./pickem-vs-card.component.css']
})
export class PickemVsCardComponent {
  @Input({ required: true }) match!: any;
  @Output() play = new EventEmitter<number>();

  startGame() {
    this.play.emit(this.match.id);
  }
}
