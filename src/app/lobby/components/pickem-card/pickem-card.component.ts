import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-pickem-card',
  templateUrl: './pickem-card.component.html',
  styleUrls: ['./pickem-card.component.css']
})
export class PickemCardComponent {

  private router = inject(Router);

  @Input({ required: true }) data!: {
    id: number;
    title: string;
    subtitle: string;
    image: string;
  };

  open() {
    this.router.navigate(['/game/pick-one'], {
      queryParams: { pickemId: this.data.id }
    });
  }
}
