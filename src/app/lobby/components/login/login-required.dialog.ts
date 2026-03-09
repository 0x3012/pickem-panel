import { Component, EventEmitter, Output } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-login-required-dialog',
  imports: [NgIf],
  templateUrl: './login-required.dialog.html',
  styleUrls: ['./login-required.dialog.css']
})
export class LoginRequiredDialog {
  @Output() closed = new EventEmitter<void>();
  @Output() loginClick = new EventEmitter<void>();

  close() {
    this.closed.emit();
  }

  login() {
    this.loginClick.emit();
  }
}
