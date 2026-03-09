import { Component, Input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import type { Toast } from '../../../core/models/toast.model';

@Component({
    standalone: true,
    selector: 'app-toast-container',
    imports: [NgFor, NgIf],
    template: `
     <div class="toast-container">
      <div
        class="toast"
        *ngFor="let t of toasts"
        [class.success]="t.type === 'success'"
        [class.warning]="t.type === 'warning'"
        [class.error]="t.type === 'error'">

    
   

        <div class="content">
          <h4 *ngIf="t.title">{{ t.title }}</h4>
          <p>{{ t.message }}</p>
        </div>


             <img
          *ngIf="t.icon"
          [src]="t.icon"
          class="toast-logo"
          alt="team logo"
        />
        
      </div>
    </div>

  `,
    styleUrls: ['./toast.component.css']
})
export class ToastContainerComponent {
    @Input() toasts: Toast[] = [];
}
