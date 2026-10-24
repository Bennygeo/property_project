import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserBehaviorService } from '../../../core/services/user-behavior.service';

@Component({
  selector: 'app-user-mindset-bar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-mindset-bar.component.html',
  styleUrls: ['./user-mindset-bar.component.css']
})
export class UserMindsetBarComponent {
  readonly behaviorService = inject(UserBehaviorService);

  // Phone editing mode
  readonly isEditingPhone = signal<boolean>(false);
  editPhoneInput: string = '';

  startEditPhone(): void {
    this.editPhoneInput = this.behaviorService.activeUserPhone();
    this.isEditingPhone.set(true);
  }

  savePhone(): void {
    if (this.editPhoneInput.trim()) {
      this.behaviorService.setUserPhone(this.editPhoneInput.trim());
    }
    this.isEditingPhone.set(false);
  }

  cancelEditPhone(): void {
    this.isEditingPhone.set(false);
  }

  toggleDrawer(): void {
    this.behaviorService.toggleMindsetDrawer();
  }

  closeDrawer(): void {
    this.behaviorService.closeMindsetDrawer();
  }

  loadUserPromptScenario(): void {
    this.behaviorService.simulateUserPromptScenario(true);
  }

  loadFlatScenario(): void {
    this.behaviorService.simulateFlatDominantScenario();
  }

  readonly showClearNotice = signal<boolean>(false);

  clearHistory(): void {
    this.behaviorService.clearHistory();
    this.showClearNotice.set(true);
    setTimeout(() => {
      this.showClearNotice.set(false);
    }, 2500);
  }
}
