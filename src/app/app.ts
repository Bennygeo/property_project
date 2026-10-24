import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OtpLoginModalComponent } from './core/components/otp-login-modal/otp-login-modal.component';
import { VisitorIntentModalComponent } from './core/components/visitor-intent-modal/visitor-intent-modal.component';
import { UserMindsetBarComponent } from './shared/components/user-mindset-bar/user-mindset-bar.component';

@Component({
  imports: [RouterOutlet, OtpLoginModalComponent, VisitorIntentModalComponent, UserMindsetBarComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('property-registry');
}
