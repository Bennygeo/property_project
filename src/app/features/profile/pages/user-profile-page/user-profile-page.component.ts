import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
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
import { PropertyCardComponent } from '../../../home/components/property-card/property-card.component';
import { 
  UserProfileResponse, 
  ScheduledVisit, 
  UnlockedMediaItem, 
  WalletLedgerItem, 
  ShortlistedItem,
  ViewHistoryItem,
  BrochureDownloadItem
} from '../../../../core/models/user.model';
import { Property, PropertyType } from '../../../../core/models/property.model';

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
    ToastComponent,
    PropertyCardComponent
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
  readonly route = inject(ActivatedRoute);

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
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'favourites' || tab === 'shortlists') {
        this.activeSection.set('favourites');
      } else if (tab === 'my_properties') {
        this.activeSection.set('my_properties');
      } else if (tab === 'visits') {
        this.activeSection.set('visits');
      }
    });
    this.loadFullProfile();
  }

  loadFullProfile(): void {
    this.isLoading.set(true);
    const user = this.authService.currentUser();
    const userId = user?.id || 1;

    // Refresh shortlists immediately from backend for the active user
    this.propertyService.fetchShortlistsFromBackend(userId);

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

  getUserGenderIcon(): string {
    const user = this.authService.currentUser();
    const gender = (user as any)?.gender;
    if (gender === 'female') return 'woman';
    if (gender === 'male') return 'man';
    const name = (user?.name || '').toLowerCase();
    if (/anita|priya|lakshmi|deepa|kavitha|pooja|swetha|sneha|divya|sharmila|shreya|radha|geetha|female|she|her|woman/i.test(name)) {
      return 'woman';
    }
    if (/arun|kumar|rahul|raj|vijay|suresh|ramesh|karthik|ajay|male|he|his|man/i.test(name)) {
      return 'man';
    }
    return 'person';
  }

  getUserInitials(): string {
    const name = this.authService.currentUser()?.name || 'User';
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
      message: 'Your alert and notification channels have been updated.',
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
    // 1. Direct retrieval from PropertyService persistent dossiers signal
    const serviceProps = this.propertyService.getShortlistedPropertiesList();
    if (serviceProps.length > 0) {
      return serviceProps;
    }

    const ids = this.propertyService.shortlistedPropertyIds();
    const map = new Map<string, Property>();

    // 2. Include any shortlist dossiers from MySQL profile response
    const profileShortlists = this.profileData()?.shortlists;
    if (profileShortlists && Array.isArray(profileShortlists)) {
      for (const ps of profileShortlists) {
        const pId = String(ps.propertyId || ps.id || '').trim();
        const upper = pId.toUpperCase();
        if ((ids.size === 0 || this.propertyService.isShortlisted(pId)) && !map.has(upper)) {
          map.set(upper, {
            id: pId,
            title: ps.title || 'Verified Plotted Development',
            propertyType: (ps.propertyType || 'Gated CMDA Plots') as PropertyType,
            locality: ps.locality || 'Kanyakumari',
            city: ps.city || 'Kanyakumari',
            cityKey: 'chennai',
            price: ps.price,
            pricePerSqFt: ps.pricePerSqFt || '₹ 4,500/sq.ft',
            sqft: ps.sqft || '800 sq.ft (1.84 Cents)',
            bhkBadge: ps.bhkBadge || '1.84 Cents Plot',
            facingOrView: ps.facingOrView || 'West Facing',
            imageUrl: ps.imageUrl || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
            badges: {
              rera: 'TNRERA Approved',
              brokerage: '0% Brokerage',
              points: 4,
              specialTag: 'Cadastral Verified'
            },
            highlights: ['DTCP / CMDA Approved', 'Clear Title', 'Immediate Registration'],
            mediaPoints: 4,
            isMediaUnlocked: false,
            isShortlisted: true,
            freePhotos: [ps.imageUrl],
            premiumMedia: [],
            whatsappUrl: `https://wa.me/919444100000?text=${encodeURIComponent('Hi Find a Plot, I am inquiring about ' + (ps.title || pId))}`
          } as Property);
        }
      }
    }

    // 3. Include matching properties from allProperties
    if (ids.size > 0) {
      const all = this.propertyService.allProperties();
      for (const p of all) {
        if (this.propertyService.isShortlisted(p.id) && !map.has(p.id.trim().toUpperCase())) {
          map.set(p.id.trim().toUpperCase(), { ...p, isShortlisted: true });
        }
      }
    }

    return Array.from(map.values());
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
