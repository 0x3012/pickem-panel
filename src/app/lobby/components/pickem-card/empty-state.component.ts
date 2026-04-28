import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-empty-state',
  template: `
    <div class="empty">
      <img src="/hs-logo-flat.png" style="width:60px" alt="Hotspawn logo" />
      <p><strong>Check back in a minute!</strong></p>
      <p>Fresh info is on the way.</p>
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
export class EmptyStateComponent { }
