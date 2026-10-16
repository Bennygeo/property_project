import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { WalletService } from '../../../../core/services/wallet.service';
import { PropertyService } from '../../../../core/services/property.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { TopConciergeBarComponent } from '../../../home/components/top-concierge-bar/top-concierge-bar.component';
import { HeaderComponent } from '../../../home/components/header/header.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { PropertyMediaModalComponent } from '../../../home/components/property-media-modal/property-media-modal.component';
import { TopupDialogComponent } from '../../../home/components/topup-dialog/topup-dialog.component';
import { ToastComponent } from '../../../home/components/toast/toast.component';
import { 
  UserProfileResponse, 
  ScheduledVisit, 
  UnlockedMediaItem, 
  WalletLedgerItem, 
  ShortlistedItem,
  ViewHistoryItem,
  BrochureDownloadItem
} from '../../../../core/models/user.model';
import { Property } from '../../../../core/models/property.model';

export type ProfileDashboardSection = 
  | 'profile' 
  | 'my_properties'
  | 'favourites' 
  | 'views' 
  | 'transactions' 
  | 'visits' 
  | 'brochures' 
  | 'preferences' 
  | 'danger';

@Component({
  selector: 'app-user-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TopConciergeBarComponent,
    HeaderComponent,
    FooterComponent,
    PropertyMediaModalComponent,
    TopupDialogComponent,
    ToastComponent
  ],
  templateUrl: './user-profile-page.component.html',
  styleUrls: ['./user-profile-page.component.css']
})
export class UserProfilePageComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly walletService = inject(WalletService);
  readonly propertyService = inject(PropertyService);
  readonly notificationService = inject(NotificationService);
  readonly router = inject(Router);

  // Active Dashboard Section
  readonly activeSection = signal<ProfileDashboardSection>('profile');

  // Loading & State
  readonly isLoading = signal<boolean>(true);
  readonly isSavingProfile = signal<boolean>(false);
  readonly isEditModalOpen = signal<boolean>(false);

  // Account Deletion Two-Step Flow State
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly deleteConfirmationInput = signal<string>('');
  readonly isDeletingAccount = signal<boolean>(false);
  readonly deleteErrorMessage = signal<string>('');

  // View History Clear State
  readonly isClearingViews = signal<boolean>(false);

  // Profile Data from MySQL
  readonly profileData = signal<UserProfileResponse | null>(null);

  // Edit Form Fields
  readonly editName = signal<string>('');
  readonly editEmail = signal<string>('');
  readonly editPhone = signal<string>('');
  readonly editCity = signal<string>('Chennai');
  readonly editBudget = signal<string>('₹2 Cr – ₹5 Cr');
  readonly editPropertyType = signal<string>('Luxury Villas & Penthouses');

  // Notification Preferences
  readonly notifyWhatsApp = signal<boolean>(true);
  readonly notifyEmail = signal<boolean>(true);
  readonly notifyPriceDrops = signal<boolean>(true);
  readonly notifyNewListings = signal<boolean>(true);

  // Computed counts for badges
  readonly shortlistsCount = computed<number>(() => {
    return this.propertyService.shortlistCount() || this.profileData()?.shortlists?.length || 0;
  });

  readonly viewsCount = computed<number>(() => {
    return this.profileData()?.viewHistory?.length || 0;
  });

  readonly visitsCount = computed<number>(() => {
    return this.profileData()?.visits?.length || 0;
  });

  readonly brochuresCount = computed<number>(() => {
    return this.profileData()?.brochures?.length || 0;
  });

  // User-submitted properties list
  readonly myProperties = signal<any[]>([]);
  readonly myPropertiesCount = computed<number>(() => this.myProperties().length);

  ngOnInit(): void {
    this.loadFullProfile();
  }

  loadFullProfile(): void {
    this.isLoading.set(true);
    const user = this.authService.currentUser();
    const userId = user?.id || 1;

    // Load submitted properties
    this.propertyService.fetchUserProperties(userId).subscribe(props => {
      this.myProperties.set(props);
    });

    this.authService.loadProfile(userId).subscribe(data => {
      this.isLoading.set(false);
      if (data) {
        this.profileData.set(data);
        if (data.user) {
          this.authService.setCurrentUser(data.user);
          this.walletService.setBalance(data.user.pointsBalance);
          this.editName.set(data.user.name);
          this.editEmail.set(data.user.email);
          this.editPhone.set(data.user.phone || '');
        }
      }
    });
  }

  setSection(section: ProfileDashboardSection): void {
    this.activeSection.set(section);
    window.scrollTo({ top: 180, behavior: 'smooth' });
  }

  getUserInitials(): string {
    const name = this.authService.currentUser()?.name || 'Investor';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  openEditModal(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.editName.set(user.name);
      this.editEmail.set(user.email);
      this.editPhone.set(user.phone || '');
    }
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  onSaveProfile(event?: Event): void {
    if (event) event.preventDefault();
    const user = this.authService.currentUser();
    if (!user) return;

    this.isSavingProfile.set(true);
    this.authService.updateProfile({
      id: user.id,
      name: this.editName().trim(),
      email: this.editEmail().trim(),
      phone: this.editPhone().trim()
    }).subscribe(updated => {
      this.isSavingProfile.set(false);
      if (updated) {
        this.closeEditModal();
        this.loadFullProfile();
      }
    });
  }

  savePreferences(): void {
    this.notificationService.show({
      type: 'success',
      title: 'Preferences Saved',
      message: 'Your investor alert and notification channels have been updated.',
      icon: 'notifications_active'
    });
  }

  // Clear Browsing History
  clearAllViews(): void {
    if (!confirm('Are you sure you want to clear your property browsing trail?')) {
      return;
    }
    this.isClearingViews.set(true);
    this.authService.clearViewHistory().subscribe(() => {
      this.isClearingViews.set(false);
      this.loadFullProfile();
    });
  }

  // Delete Account Confirmation Flow
  openDeleteModal(): void {
    this.deleteConfirmationInput.set('');
    this.deleteErrorMessage.set('');
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deleteConfirmationInput.set('');
    this.deleteErrorMessage.set('');
  }

  confirmDeleteAccount(): void {
    const code = this.deleteConfirmationInput().trim().toUpperCase();
    if (code !== 'DELETE') {
      this.deleteErrorMessage.set('Please type exact word "DELETE" to confirm.');
      return;
    }

    this.isDeletingAccount.set(true);
    this.deleteErrorMessage.set('');

    this.authService.deleteAccount(code).subscribe(res => {
      this.isDeletingAccount.set(false);
      if (res && res.success) {
        this.closeDeleteModal();
        this.router.navigate(['/']);
      } else {
        this.deleteErrorMessage.set(res?.message || 'Account deletion failed. Please try again.');
      }
    });
  }

  // Shortlisted Properties
  getShortlistedProperties(): Property[] {
    const all = this.propertyService.allProperties();
    const shortlists = all.filter(p => p.isShortlisted);
    if (shortlists.length > 0) return shortlists;
    return all.slice(0, 3);
  }

  // Viewed Properties
  getViewedItems(): ViewHistoryItem[] {
    return this.profileData()?.viewHistory || [];
  }

  // Scheduled Visits
  getVisits(): ScheduledVisit[] {
    return this.profileData()?.visits || [];
  }

  // Unlocked 4K Media
  getUnlocks(): UnlockedMediaItem[] {
    return this.profileData()?.unlocks || [];
  }

  // Transactions Ledger
  getTransactions(): WalletLedgerItem[] {
    return this.profileData()?.transactions || [];
  }

  // Regulatory Brochures
  getBrochures(): BrochureDownloadItem[] {
    return this.profileData()?.brochures || [];
  }

  onWatchTour(propertyId: string): void {
    const prop = this.propertyService.getPropertyById(propertyId);
    if (prop) {
      this.propertyService.openMediaModal(prop, 'premium');
    } else {
      this.router.navigate(['/property', propertyId]);
    }
  }

  removeFromShortlist(propertyId: string, event: Event): void {
    event.stopPropagation();
    this.propertyService.toggleShortlist(propertyId);
    this.notificationService.show({
      type: 'info',
      title: 'Removed from Shortlist',
      message: 'Property has been removed from your saved list.',
      icon: 'bookmark_remove'
    });
  }

  onSignOut(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
