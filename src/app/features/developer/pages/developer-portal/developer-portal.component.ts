import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { AdminService } from '../../../../core/services/admin.service';
import { PropertyService, DeveloperSummary } from '../../../../core/services/property.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { HeaderComponent } from '../../../home/components/header/header.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { TopConciergeBarComponent } from '../../../home/components/top-concierge-bar/top-concierge-bar.component';
import {
  PropertyMasterData,
  createBlankMasterData,
  createDefaultMasterData,
  calculateCents,
  calculateTotalPrice,
  MASTER_YES_NO_OPTIONS,
  MASTER_FACING_OPTIONS,
  MASTER_PATTA_OPTIONS,
  MASTER_LAND_USE_OPTIONS,
  MASTER_AVAILABILITY_OPTIONS,
  MASTER_CORRIDOR_OPTIONS,
  MASTER_SUITED_FOR_OPTIONS,
  MASTER_UTILITY_OPTIONS,
  MASTER_DRAINAGE_OPTIONS,
  MASTER_ROAD_TYPE_OPTIONS,
  MASTER_FLOOD_ZONE_OPTIONS,
  MASTER_CATEGORY_OPTIONS,
  MASTER_TYPE_OPTIONS,
  MASTER_PROJECT_STAGE_OPTIONS,
  MASTER_PROJECT_STATUS_OPTIONS,
  MASTER_APPROVAL_AUTHORITY_OPTIONS
} from '../../../../core/models/property-master.model';

export interface DeveloperPortalCompany {
  id: number;
  name: string;
  slug: string;
  reraNumber: string;
  logoUrl: string;
  coverImageUrl: string;
  corporateOffice: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  about: string;
  establishedYear: string;
  projectsCompleted: string;
  deliveredSqFt: string;
  onTimeTrack: string;
}

export interface DeveloperPortalProject {
  id: string;
  title: string;
  propertyType: string;
  listingMode: string;
  locality: string;
  city: string;
  price: string;
  pricePerSqFt: string;
  sqft: string;
  bhkBadge: string;
  facingOrView: string;
  imageUrl: string;
  reraNumber: string;
  possessionDate: string;
  projectStatus: string;
  totalUnits: string;
  status: string;
  createdAt: string;
  projectName?: string;
  district?: string;
  leadsCount?: number;
}

export interface DeveloperUpcomingProject {
  id: string;
  name: string;
  locality: string;
  city: string;
  propertyType: string;
  expectedLaunch: string;
  startingPrice: string;
  totalUnits: string;
  bannerUrl: string;
  description: string;
}

@Component({
  selector: 'app-developer-portal',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TopConciergeBarComponent,
    HeaderComponent,
    FooterComponent
  ],
  templateUrl: './developer-portal.component.html',
  styleUrls: ['./developer-portal.component.scss']
})
export class DeveloperPortalComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly adminService = inject(AdminService);
  readonly propertyService = inject(PropertyService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly isUploadingCover = signal<boolean>(false);
  readonly isUploadingLogo = signal<boolean>(false);
  readonly activeTab = signal<'overview' | 'projects' | 'link-projects' | 'post-project' | 'upcoming' | 'customize'>('overview');

  // All developers directory list (for admin company switcher)
  readonly allDevelopers = signal<DeveloperSummary[]>([]);

  // Link / Unlink Existing Projects State
  readonly linkedProjects = signal<any[]>([]);
  readonly availableProjects = signal<any[]>([]);
  readonly projectSearchQuery = signal<string>('');
  readonly selectedProjectsToLink = signal<string[]>([]);
  readonly isLinkingProjects = signal<boolean>(false);

  isSuperAdminUser(): boolean {
    const r = (this.authService.currentUser()?.role || '') as string;
    return r === 'admin' || r === 'super_admin';
  }

  readonly architecturalCoverPresets = [
    { label: 'Executive Skyline', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=80' },
    { label: 'Modern Prestige', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=80' },
    { label: 'Plotted Land Corridor', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1800&q=80' },
    { label: 'Green Gated Layout', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1800&q=80' }
  ];

  selectCoverPreset(url: string): void {
    this.customForm.coverImageUrl = url;
  }

  onUploadCoverImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.isUploadingCover.set(true);

    this.propertyService.uploadPropertyImage(file).subscribe({
      next: (res) => {
        this.isUploadingCover.set(false);
        if (res && res.success && res.url) {
          this.customForm.coverImageUrl = res.url;
          this.notificationService.show({
            type: 'success',
            title: 'Image Uploaded',
            message: 'Background cover photo uploaded. Click Save Profile to apply.',
            icon: 'wallpaper'
          });
        } else {
          this.notificationService.show({
            type: 'error',
            title: 'Upload Failed',
            message: res?.message || 'Failed to upload cover image.',
            icon: 'error'
          });
        }
      },
      error: () => {
        this.isUploadingCover.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Upload Error',
          message: 'Error communicating with upload server.',
          icon: 'error'
        });
      }
    });
  }

  onUploadLogoImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.isUploadingLogo.set(true);

    this.propertyService.uploadPropertyImage(file).subscribe({
      next: (res) => {
        this.isUploadingLogo.set(false);
        if (res && res.success && res.url) {
          this.customForm.logoUrl = res.url;
        }
      },
      error: () => {
        this.isUploadingLogo.set(false);
      }
    });
  }

  // Company Data
  readonly company = signal<DeveloperPortalCompany | null>(null);
  readonly projects = signal<DeveloperPortalProject[]>([]);
  readonly upcomingProjects = signal<DeveloperUpcomingProject[]>([]);
  readonly stats = signal<any>({
    totalProjects: 0,
    publishedProjects: 0,
    upcomingProjects: 0,
    totalInquiries: 0,
    complianceScore: '100% TNRERA Verified'
  });

  // Edit / Customization Form State
  customForm = {
    name: '',
    reraNumber: '',
    logoUrl: '',
    coverImageUrl: '',
    corporateOffice: '',
    contactEmail: '',
    contactPhone: '',
    websiteUrl: '',
    about: '',
    establishedYear: '',
    projectsCompleted: '',
    deliveredSqFt: ''
  };

  // Post New Project Master Data (All ~70 fields)
  devMaster: PropertyMasterData = createDefaultMasterData();

  readonly devYesNoOptions = MASTER_YES_NO_OPTIONS;
  readonly devFacingOptions = MASTER_FACING_OPTIONS;
  readonly devPattaOptions = MASTER_PATTA_OPTIONS;
  readonly devLandUseOptions = MASTER_LAND_USE_OPTIONS;
  readonly devAvailabilityOptions = MASTER_AVAILABILITY_OPTIONS;
  readonly devCorridorOptions = MASTER_CORRIDOR_OPTIONS;
  readonly devSuitedForOptions = MASTER_SUITED_FOR_OPTIONS;
  readonly devUtilityOptions = MASTER_UTILITY_OPTIONS;
  readonly devDrainageOptions = MASTER_DRAINAGE_OPTIONS;
  readonly devRoadTypeOptions = MASTER_ROAD_TYPE_OPTIONS;
  readonly devFloodZoneOptions = MASTER_FLOOD_ZONE_OPTIONS;
  readonly devCategoryOptions = MASTER_CATEGORY_OPTIONS;
  readonly devTypeOptions = MASTER_TYPE_OPTIONS;
  readonly devProjectStageOptions = MASTER_PROJECT_STAGE_OPTIONS;
  readonly devProjectStatusOptions = MASTER_PROJECT_STATUS_OPTIONS;
  readonly devApprovalAuthorityOptions = MASTER_APPROVAL_AUTHORITY_OPTIONS;

  onDevPlotSizeSqftChange(): void {
    this.devMaster.plotSizeCents = calculateCents(this.devMaster.plotSizeSqft);
    this.devMaster.totalPrice = calculateTotalPrice(this.devMaster.plotSizeSqft, this.devMaster.pricePerSqft);
    if (this.devMaster.plotSizeSqft && !this.devMaster.minPlotSize) {
      this.devMaster.minPlotSize = this.devMaster.plotSizeSqft;
    }
    if (this.devMaster.plotSizeSqft && !this.devMaster.maxPlotSize) {
      this.devMaster.maxPlotSize = this.devMaster.plotSizeSqft;
    }
    if (this.devMaster.totalPrice > 0 && !this.devMaster.priceFrom) {
      this.devMaster.priceFrom = this.devMaster.totalPrice;
    }
    if (this.devMaster.totalPrice > 0 && !this.devMaster.priceTo) {
      this.devMaster.priceTo = this.devMaster.totalPrice;
    }
  }

  onDevPricePerSqftChange(): void {
    this.devMaster.totalPrice = calculateTotalPrice(this.devMaster.plotSizeSqft, this.devMaster.pricePerSqft);
    if (this.devMaster.totalPrice > 0 && !this.devMaster.priceFrom) {
      this.devMaster.priceFrom = this.devMaster.totalPrice;
    }
    if (this.devMaster.totalPrice > 0 && !this.devMaster.priceTo) {
      this.devMaster.priceTo = this.devMaster.totalPrice;
    }
  }

  getDevFormattedTotalPrice(): string {
    const total = this.devMaster.totalPrice;
    if (!total || total <= 0) return '₹ 0';
    if (total >= 10000000) return `₹ ${(total / 10000000).toFixed(2)} Cr`;
    if (total >= 100000) return `₹ ${(total / 100000).toFixed(2)} Lakhs`;
    return `₹ ${total.toLocaleString('en-IN')}`;
  }

  // Post New Project Form State (Free option like post-property)
  newProjectForm = {
    title: '',
    propertyType: 'Gated CMDA Plots',
    listingMode: 'plots',
    cityName: 'Chennai',
    localityName: '',
    district: 'Chengalpattu',
    taluk: '',
    corridor: 'GST Road Corridor',
    price: '',
    pricePerSqft: '',
    sqft: '1200 sq.ft',
    bhkBadge: 'DTCP Sanctioned Plot',
    facingOrView: 'East Facing',
    possessionDate: 'Ready to Register',
    projectStatus: 'Ready to Register',
    totalLandParcel: '12.5 Acres Approved Layout',
    totalUnits: '48 Plots',
    reraNumber: '',
    dtcpApprovalNo: '',
    roadWidth: '40',
    mainImageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    description: '',
    highlightsText: '100% Clear Title Patta\nDTCP / CMDA Approved Layout\n40 Ft Wide Bitumen Access Road\nPre-Approved Bank Loans (SBI, HDFC)'
  };

  // Subdivided plots array for the new project
  newProjectPlots = signal<Array<{ plotNumber: string; plotSizeSqft: number; facing: string; totalPrice: string }>>([
    { plotNumber: 'Plot 1', plotSizeSqft: 1200, facing: 'East', totalPrice: '₹ 45.00 Lakhs' },
    { plotNumber: 'Plot 2', plotSizeSqft: 1500, facing: 'North', totalPrice: '₹ 56.25 Lakhs' },
    { plotNumber: 'Plot 3', plotSizeSqft: 1800, facing: 'East', totalPrice: '₹ 67.50 Lakhs' }
  ]);

  // Upcoming project modal / form
  newUpcoming = {
    name: '',
    locality: '',
    city: 'Chennai',
    propertyType: 'Gated CMDA Plots',
    expectedLaunch: 'Q1 2027',
    startingPrice: '₹ 38 Lakhs',
    totalUnits: '64 Plotted Sites',
    bannerUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    description: 'High-yield residential plotted layout abutting major state transport corridor.'
  };

  ngOnInit(): void {
      // Restrict Developer Workspace strictly to authorized developers or admins
      if (!this.authService.isDeveloper() && !this.adminService.verifyAdminAccess()) {
        this.notificationService.show({
          type: 'error',
          title: 'Access Restricted',
          message: 'Developer Workspace is restricted to authorized developers and super admins.',
          icon: 'lock'
        });
        this.router.navigate(['/']);
        return;
      }
      this.loadDevelopersList();
      this.loadPortalData();
    }

    loadDevelopersList(): void {
      this.propertyService.fetchBuilders().subscribe(builders => {
        this.allDevelopers.set((builders || []).filter(b => (b.id || 0) > 0));
      });
    }

    switchDeveloperCompany(devId: number | string): void {
      const numId = Number(devId);
      if(!numId || numId <= 0) return;
    const current = this.authService.currentUser();
    if (current) {
      this.authService.setCurrentUser({ ...current, developerId: numId });
    }
    this.loadPortalData(numId);
  }

  loadPortalData(overrideDevId?: number): void {
    this.isLoading.set(true);
    const user = this.authService.currentUser();
    const userId = user?.id || 105;
    const devId = overrideDevId ?? user?.developerId ?? 1;

    this.authService.getDeveloperPortal(userId, devId).subscribe(res => {
      this.isLoading.set(false);
      if (res && res.success && res.data) {
        this.company.set(res.data.developer);
        this.projects.set(res.data.projects || []);
        this.upcomingProjects.set(res.data.upcomingProjects || []);
        this.stats.set(res.data.stats || {});

        if (res.data.developer?.id) {
          this.loadLinkedAndAvailableProjects(res.data.developer.id, this.projectSearchQuery());
        }

        // Populate customization form with current values
        const d = res.data.developer;
        this.customForm = {
          name: d.name || '',
          reraNumber: d.reraNumber || '',
          logoUrl: d.logoUrl || '',
          coverImageUrl: d.coverImageUrl || '',
          corporateOffice: d.corporateOffice || '',
          contactEmail: d.contactEmail || '',
          contactPhone: d.contactPhone || '',
          websiteUrl: d.websiteUrl || '',
          about: d.about || '',
          establishedYear: d.establishedYear || '2016',
          projectsCompleted: d.projectsCompleted || '0 Projects',
          deliveredSqFt: d.deliveredSqFt || ''
        };

        // Pre-fill RERA & Developer on new project form & master sheet
        if (!this.newProjectForm.reraNumber && d.reraNumber) {
          this.newProjectForm.reraNumber = d.reraNumber;
        }
        this.devMaster.developer = d.name || '';
        this.devMaster.developerId = d.id || null;
        if (!this.devMaster.reraNumber && d.reraNumber) {
          this.devMaster.reraNumber = d.reraNumber;
        }
      } else {
        this.notificationService.show({
          type: 'error',
          title: 'Portal Error',
          message: res?.message || 'Could not load authorized company data',
          icon: 'error'
        });
      }
    });
  }

  setTab(tab: 'overview' | 'projects' | 'link-projects' | 'post-project' | 'upcoming' | 'customize'): void {
    this.activeTab.set(tab);
    if (tab === 'link-projects' && this.company()?.id) {
      this.loadLinkedAndAvailableProjects(this.company()!.id, this.projectSearchQuery());
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  loadLinkedAndAvailableProjects(devId: number, search: string = ''): void {
    this.authService.getDeveloperLinkedProjects(devId, search).subscribe(res => {
      if (res && res.success && res.data) {
        this.linkedProjects.set(res.data.linkedProjects || []);
        this.availableProjects.set(res.data.availableProjects || []);
      }
    });
  }

  onSearchAvailableProjects(query: string): void {
    this.projectSearchQuery.set(query);
    const devId = this.company()?.id || 0;
    this.loadLinkedAndAvailableProjects(devId, query);
  }

  toggleProjectSelection(projectId: string): void {
    this.selectedProjectsToLink.update(list =>
      list.includes(projectId) ? list.filter(id => id !== projectId) : [...list, projectId]
    );
  }

  isProjectSelected(projectId: string): boolean {
    return this.selectedProjectsToLink().includes(projectId);
  }

  linkSelectedProjects(): void {
    const devId = this.company()?.id;
    const ids = this.selectedProjectsToLink();
    if (!devId || ids.length === 0) return;

    this.isLinkingProjects.set(true);
    this.authService.linkDeveloperProjects(devId, ids, 'link').subscribe(res => {
      this.isLinkingProjects.set(false);
      if (res && res.success) {
        this.selectedProjectsToLink.set([]);
        this.loadLinkedAndAvailableProjects(devId, this.projectSearchQuery());
        this.loadPortalData(devId);
        this.loadDevelopersList();
      }
    });
  }

  unlinkProject(projectId: string): void {
    const devId = this.company()?.id;
    if (!devId || !projectId) return;

    this.isLinkingProjects.set(true);
    this.authService.linkDeveloperProjects(devId, [projectId], 'unlink').subscribe(res => {
      this.isLinkingProjects.set(false);
      if (res && res.success) {
        this.loadLinkedAndAvailableProjects(devId, this.projectSearchQuery());
        this.loadPortalData(devId);
        this.loadDevelopersList();
      }
    });
  }

  saveCompanyProfile(): void {
    const comp = this.company();
    if (!comp) return;

    this.isSaving.set(true);
    const payload = {
      id: comp.id,
      developerId: comp.id,
      ...this.customForm,
      upcomingProjects: this.upcomingProjects()
    };

    this.authService.updateDeveloperCompany(payload).subscribe(res => {
      this.isSaving.set(false);
      if (res && res.success) {
        this.company.update(old => old ? { ...old, ...this.customForm } : null);
        this.setTab('overview');
      }
    });
  }

  submitNewProject(): void {
    const comp = this.company();
    if (!comp) return;

    const effectiveTitle = (this.newProjectForm.title || '').trim() || (this.devMaster.projectName || '').trim();
    if (!effectiveTitle) {
      this.notificationService.show({
        type: 'warning',
        title: 'Title Required',
        message: 'Please enter a project name / title',
        icon: 'warning'
      });
      return;
    }

    this.devMaster.projectName = effectiveTitle;
    this.devMaster.developer = comp.name;
    this.devMaster.developerId = comp.id;

    this.isSaving.set(true);
    const highlights = this.newProjectForm.highlightsText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const payload = {
      ...this.newProjectForm,
      title: effectiveTitle,
      propertyType: this.devMaster.category || this.newProjectForm.propertyType,
      listingMode: (this.devMaster.type || this.newProjectForm.listingMode || 'plots').slice(0, 5),
      cityName: (this.devMaster.city || this.newProjectForm.cityName || 'Chennai').trim(),
      localityName: (this.devMaster.villageLocality || this.devMaster.areaLocation || this.newProjectForm.localityName || 'Tambaram').trim(),
      district: (this.devMaster.district || this.newProjectForm.district || 'Chennai').trim(),
      taluk: (this.devMaster.taluk || this.newProjectForm.taluk || '').trim(),
      corridor: (this.devMaster.corridor || this.newProjectForm.corridor || '').trim(),
      price: (this.devMaster.totalPrice > 0 ? this.getDevFormattedTotalPrice() : this.newProjectForm.price || '₹ 45.00 Lakhs').slice(0, 24),
      pricePerSqft: (this.devMaster.pricePerSqft ? `₹ ${this.devMaster.pricePerSqft}/sq.ft` : this.newProjectForm.pricePerSqft || '₹ 3,750/sq.ft').slice(0, 17),
      sqft: (this.devMaster.plotSizeSqft ? `${this.devMaster.plotSizeSqft} sq.ft` : this.newProjectForm.sqft || '1200 sq.ft').slice(0, 31),
      facingOrView: (this.devMaster.facing ? `${this.devMaster.facing} Facing` : this.newProjectForm.facingOrView || 'East Facing').slice(0, 25),
      reraNumber: this.devMaster.reraNumber || this.newProjectForm.reraNumber,
      dtcpApprovalNo: this.devMaster.dtcpApprovalNo || this.newProjectForm.dtcpApprovalNo,
      roadWidth: this.devMaster.roadWidthFt ? String(this.devMaster.roadWidthFt) : this.newProjectForm.roadWidth,
      totalLandParcel: (this.devMaster.totalLayoutArea || this.newProjectForm.totalLandParcel || 'Approved').slice(0, 13),
      totalUnits: this.devMaster.totalUnits || this.newProjectForm.totalUnits,
      projectStatus: this.devMaster.projectStatus || this.newProjectForm.projectStatus,
      possessionDate: this.devMaster.possessionTimeline || this.newProjectForm.possessionDate,
      mainImageUrl: this.devMaster.coverImage || this.newProjectForm.mainImageUrl,
      developerId: comp.id,
      highlights,
      subdividedPlots: this.newProjectPlots(),
      masterData: this.devMaster,
      masterDetails: this.devMaster
    };

    this.authService.postDeveloperProject(payload).subscribe(res => {
      this.isSaving.set(false);
      if (res && res.success) {
        // Reset form
        this.devMaster = createBlankMasterData();
        this.devMaster.developer = comp.name;
        this.devMaster.developerId = comp.id;
        this.devMaster.reraNumber = comp.reraNumber || '';
        this.newProjectForm.title = '';
        this.newProjectForm.localityName = '';
        this.newProjectForm.price = '';
        this.newProjectForm.pricePerSqft = '';
        // Reload portal data to include newly added project
        this.loadPortalData();
        this.setTab('projects');
      }
    });
  }

  addPlotRow(): void {
    const current = this.newProjectPlots();
    const nextNum = current.length + 1;
    this.newProjectPlots.set([
      ...current,
      { plotNumber: `Plot ${nextNum}`, plotSizeSqft: 1200, facing: 'East', totalPrice: '₹ 45.00 Lakhs' }
    ]);
  }

  removePlotRow(index: number): void {
    const current = this.newProjectPlots();
    if (current.length > 1) {
      this.newProjectPlots.set(current.filter((_, idx) => idx !== index));
    }
  }

  addUpcomingProject(): void {
    if (!this.newUpcoming.name.trim()) {
      this.notificationService.show({
        type: 'warning',
        title: 'Name Required',
        message: 'Please enter upcoming project name',
        icon: 'warning'
      });
      return;
    }

    const newItem: DeveloperUpcomingProject = {
      id: 'up-' + Date.now(),
      ...this.newUpcoming
    };

    const updated = [...this.upcomingProjects(), newItem];
    this.upcomingProjects.set(updated);

    // Save to backend
    const comp = this.company();
    if (comp) {
      this.authService.updateDeveloperCompany({
        developerId: comp.id,
        upcomingProjects: updated
      }).subscribe();
    }

    // Reset upcoming form
    this.newUpcoming = {
      name: '',
      locality: '',
      city: 'Chennai',
      propertyType: 'Gated CMDA Plots',
      expectedLaunch: 'Q2 2027',
      startingPrice: '₹ 42 Lakhs',
      totalUnits: '50 Plots',
      bannerUrl: 'https://images.unsplash.com/photo-1524813686514-a57563d77d61?auto=format&fit=crop&w=1200&q=80',
      description: 'Plotted residential enclave with integrated street lights and storm water drainage.'
    };
  }

  deleteUpcomingProject(id: string): void {
    const updated = this.upcomingProjects().filter(p => p.id !== id);
    this.upcomingProjects.set(updated);

    const comp = this.company();
    if (comp) {
      this.authService.updateDeveloperCompany({
        developerId: comp.id,
        upcomingProjects: updated
      }).subscribe();
    }
  }

  viewPublicPage(): void {
    const comp = this.company();
    if (comp) {
      this.router.navigate(['/builder', comp.slug || comp.name]);
    }
  }
}

