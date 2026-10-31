import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OtpLoginModalComponent } from './core/components/otp-login-modal/otp-login-modal.component';
import { VisitorIntentModalComponent } from './core/components/visitor-intent-modal/visitor-intent-modal.component';
import { UserMindsetBarComponent } from './shared/components/user-mindset-bar/user-mindset-bar.component';
import { PropertyCompareDockComponent } from './shared/components/property-compare/property-compare-dock/property-compare-dock.component';
import { PropertyCompareModalComponent } from './shared/components/property-compare/property-compare-modal/property-compare-modal.component';

@Component({
  imports: [
    RouterOutlet,
    OtpLoginModalComponent,
    VisitorIntentModalComponent,
    UserMindsetBarComponent,
    PropertyCompareDockComponent,
    PropertyCompareModalComponent
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('property-registry');
}
