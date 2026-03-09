import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-empty-state',
  template: `
    <div class="empty">
      <img src="/assets/placeholders/empty.svg" />
      <p><strong>¡Mantente atento!</strong></p>
      <p>Los partidos se abrirán en breve</p>
    </div>
  `,
  styles: [`
    .empty {
      margin-top: 80px;
      text-align: center;
      color: #666;
    }
    img {
      width: 200px;
      margin-bottom: 16px;
    }
  `]
})
export class EmptyStateComponent {}
