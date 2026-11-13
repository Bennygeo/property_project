import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Property } from '../../../../core/models/property.model';
import { PropertyService } from '../../../../core/services/property.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { HeaderComponent } from '../../../home/components/header/header.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { TopConciergeBarComponent } from '../../../home/components/top-concierge-bar/top-concierge-bar.component';
import { PropertyCardComponent } from '../../../home/components/property-card/property-card.component';

export interface UpcomingProjectItem {
  id?: string;
  name: string;
  locality?: string;
  city?: string;
  propertyType?: string;
  expectedLaunch?: string;
  startingPrice?: string;
  totalUnits?: string;
  bannerUrl?: string;
  description?: string;
}

export interface BuilderProjectSummary {
  name: string;
  locality: string;
  district: string;
  taluk?: string;
  corridor?: string;
  reraNumber?: string;
  dtcpApprovalNo?: string;
  startingPrice?: string;
  startingSqft?: string;
  thumbnail: string;
  propertyCount: number;
  samplePropertyId?: string;
  highwayName?: string;
}

export interface BuilderDossier {
  id?: number;
  name: string;
  rawName: string;
  slug?: string;
  reraNumber?: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  bgGradient?: string | null;
  corporateOffice?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  totalProperties: number;
  totalProjects: number;
  activeProjectsCount?: number;
  upcomingProjectsCount?: number;
  districts: string[];
  cities: string[];
  reraLayoutsCount: number;
  dtcpApprovedCount: number;
  minPrice: string;
  maxPrice: string;
  estYear: string;
  completedProjects: number | string;
  deliveredSqFt: string;
  complianceRating: string;
  about: string;
  upcomingProjects?: UpcomingProjectItem[];
}

@Component({
  selector: 'app-builder-showcase-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TopConciergeBarComponent,
    HeaderComponent,
    FooterComponent,
    PropertyCardComponent
  ],
  templateUrl: './builder-showcase-page.component.html',
  styleUrls: ['./builder-showcase-page.component.css']
})
export class BuilderShowcasePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  readonly propertyService = inject(PropertyService);
  readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);

  readonly builderName = signal<string>('');
  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly builderDossier = signal<BuilderDossier | null>(null);
  readonly projectsList = signal<BuilderProjectSummary[]>([]);
  readonly propertiesList = signal<Property[]>([]);

  // Filter & View State
  readonly activeTab = signal<'properties' | 'projects' | 'amenities' | 'location' | 'upcoming' | 'credentials' | 'customize'>('properties');
  readonly selectedProjectFilter = signal<string>('all');
  readonly selectedSizeFilter = signal<string>('all');
  readonly sortBy = signal<string>('featured');

  // Categorized Plotted Layout Amenities
  readonly amenityCategories = [
    {
      name: 'Core Infrastructure',
      icon: 'engineering',
      items: [
        '30–50 ft Wide Bitumen Tar Roads',
        'Underground Electrical & Fiber Optics',
        'Stormwater Concrete Drainage Network',
        'Dedicated Sewage Treatment Plant (STP)',
        'Individual Potable Water Connections',
        'Avenue LED Street Illumination'
      ]
    },
    {
      name: 'Security & Compound',
      icon: 'shield',
      items: [
        '24/7 Manned Entry Arch Security',
        'Boom Barrier Access Control',
        'Perimeter Concrete Compound Wall',
        'High-Definition CCTV Surveillance',
        'Dedicated Security Patrol Booth'
      ]
    },
    {
      name: 'Recreation & Green Spaces',
      icon: 'park',
      items: [
        'Sanctioned OSR Landscaped Park',
        'Equipped Children\'s Play Zone',
        'Paved Jogging & Walking Tracks',
        'Sports Half-Court (Basketball/Badminton)',
        'Tree-Lined Green Buffer Corridors'
      ]
    }
  ];

  // Strategic Commute & Connectivity Highlights
  readonly connectivityHighlights = [
    {
      category: 'IT & Employment Corridors',
      icon: 'business_center',
      items: [
        { name: 'SIPCOT IT Park (Siruseri)', time: '15 Mins' },
        { name: 'ETA Technopark & Pacifica', time: '18 Mins' },
        { name: 'Sholinganallur Junction & SEZ', time: '25 Mins' }
      ]
    },
    {
      category: 'Educational Institutions',
      icon: 'school',
      items: [
        { name: 'SSN College of Engineering', time: '5 Mins' },
        { name: 'Hindustan University (HITS)', time: '10 Mins' },
        { name: 'Chettinad Health City Campus', time: '10 Mins' },
        { name: 'Sishya School / Gateway International', time: '12 Mins' }
      ]
    },
    {
      category: 'Healthcare & Hospitals',
      icon: 'local_hospital',
      items: [
        { name: 'Chettinad Super Speciality Hospital', time: '10 Mins' },
        { name: 'Supreme Speciality Hospital', time: '15 Mins' },
        { name: 'Apollo Speciality OMR', time: '20 Mins' }
      ]
    },
    {
      category: 'Transit & Highways',
      icon: 'alt_route',
      items: [
        { name: 'OMR Roadway Direct Access', time: '2 Mins' },
        { name: 'Kelambakkam Junction', time: '8 Mins' },
        { name: 'ECR Kovalam Beach Corridor', time: '15 Mins' }
      ]
    }
  ];

  // Check if current user is authorized to customize this developer
  readonly isAuthorizedDeveloper = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'developer') {
      const dossier = this.builderDossier();
      if (!dossier) return true;
      // If user's developerId matches or name matches
      if (user.developerId && dossier.id && user.developerId === dossier.id) return true;
      if (user.companyName && dossier.name && user.companyName.toLowerCase() === dossier.name.toLowerCase()) return true;
      // Allow authorized developer access
      return true;
    }
    return false;
  });

  // Upcoming projects list
  readonly upcomingProjects = computed<UpcomingProjectItem[]>(() => {
    return this.builderDossier()?.upcomingProjects || [];
  });

  // In-page Customization form state
  readonly defaultCoverImage = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=80';
  readonly isUploadingCover = signal<boolean>(false);
  readonly isUploadingLogo = signal<boolean>(false);

  readonly architecturalCoverPresets = [
    { label: 'Executive Skyline', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=80' },
    { label: 'Modern Prestige', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=80' },
    { label: 'Plotted Land Corridor', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1800&q=80' },
    { label: 'Green Gated Layout', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1800&q=80' }
  ];

  readonly mildGradientPresets = [
    { label: 'Emerald Sage Breeze', value: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 50%, #e8f5e9 100%)', badge: 'Eco & Plotted' },
    { label: 'Coastal Marine Mist', value: 'linear-gradient(135deg, #f0f9ff 0%, #f8fafc 50%, #e0f2fe 100%)', badge: 'Maritime & Teal' },
    { label: 'Warm Champagne', value: 'linear-gradient(135deg, #fffbeb 0%, #f8fafc 50%, #fef3c7 100%)', badge: 'Heritage Luxury' },
    { label: 'Slate Platinum', value: 'linear-gradient(135deg, #f1f5f9 0%, #f8fafc 50%, #e2e8f0 100%)', badge: 'Executive Modern' },
    { label: 'Nordic Botanical Mint', value: 'linear-gradient(135deg, #ecfdf5 0%, #f8fafc 50%, #d1fae5 100%)', badge: 'Gated Townships' },
    { label: 'Rose Blush Whisper', value: 'linear-gradient(135deg, #fff1f2 0%, #f8fafc 50%, #ffe4e6 100%)', badge: 'Boutique Estates' },
    { label: 'Lavender Royal Mist', value: 'linear-gradient(135deg, #f5f3ff 0%, #f8fafc 50%, #ede9fe 100%)', badge: 'Royal Enclaves' },
    { label: 'Pure Studio Canvas', value: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)', badge: 'Minimalist Clean' }
  ];

  readonly mildFlatColorPresets = [
    { label: 'Pure White', value: '#ffffff', badge: 'Crisp Minimalist' },
    { label: 'Soft Alabaster', value: '#fafafa', badge: 'Warm Neutral' },
    { label: 'Cool Slate Canvas', value: '#f8fafc', badge: 'Executive Modern' },
    { label: 'Mild Sage Tint', value: '#f0fdf4', badge: 'Eco Meadow' },
    { label: 'Coastal Sky Blue', value: '#f0f9ff', badge: 'Maritime Calm' },
    { label: 'Champagne Cream', value: '#fffbeb', badge: 'Heritage Luxury' },
    { label: 'Soft Botanical Mint', value: '#ecfdf5', badge: 'Botanical Flat' },
    { label: 'Rose Quartz Tint', value: '#fff1f2', badge: 'Boutique Estates' },
    { label: 'Lavender Royal Tint', value: '#f5f3ff', badge: 'Royal Enclave' },
    { label: 'Warm Sandstone', value: '#fefce8', badge: 'Earth & Plotted' }
  ];

  readonly defaultPageGradient = 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 50%, #e8f5e9 100%)';

  selectCoverPreset(url: string): void {
    this.customEditForm.coverImageUrl = url;
  }

  selectGradientPreset(gradient: string): void {
    this.customEditForm.bgGradient = gradient;
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
          this.customEditForm.coverImageUrl = res.url;
          this.notificationService.show({
            type: 'success',
            title: 'Image Uploaded',
            message: 'Background cover photo ready. Click Save Profile to apply.',
            icon: 'wallpaper'
          });
        } else {
          this.notificationService.show({
            type: 'error',
            title: 'Upload Failed',
            message: res?.message || 'Failed to upload image.',
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
          this.customEditForm.logoUrl = res.url;
          this.notificationService.show({
            type: 'success',
            title: 'Logo Uploaded',
            message: 'Developer company logo uploaded successfully. Click Save Profile to apply.',
            icon: 'verified'
          });
        } else {
          this.notificationService.show({
            type: 'error',
            title: 'Upload Failed',
            message: res?.message || 'Failed to upload logo image.',
            icon: 'error'
          });
        }
      },
      error: () => {
        this.isUploadingLogo.set(false);
        this.notificationService.show({
          type: 'error',
          title: 'Upload Error',
          message: 'Error communicating with upload server.',
          icon: 'error'
        });
      }
    });
  }

  customEditForm = {
    name: '',
    reraNumber: '',
    logoUrl: '',
    coverImageUrl: '',
    bgGradient: '',
    corporateOffice: '',
    contactPhone: '',
    contactEmail: '',
    websiteUrl: '',
    about: '',
    establishedYear: '',
    projectsCompleted: '',
    deliveredSqFt: ''
  };

  // Add upcoming modal state
  newUpcoming = {
    name: '',
    locality: '',
    city: 'Chennai',
    propertyType: 'Gated CMDA Plots',
    expectedLaunch: 'Q1 2027',
    startingPrice: '₹ 45 Lakhs',
    totalUnits: '50 Plots',
    bannerUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    description: '40-ft bitumen frontage layout with individual patta and DTCP sanction.'
  };

  // Computed Filtered Properties
  readonly filteredProperties = computed<Property[]>(() => {
    let list = this.propertiesList();
    const projFilter = this.selectedProjectFilter();

    if (projFilter !== 'all') {
      list = list.filter(p => (p.projectName || p.title).toLowerCase() === projFilter.toLowerCase());
    }

    const sizeFilter = this.selectedSizeFilter();
    if (sizeFilter === 'compact') {
      list = list.filter(p => (p.plotSizeSqft || this.parseSqft(p.sqft)) < 1000);
    } else if (sizeFilter === 'standard') {
      list = list.filter(p => {
        const sq = p.plotSizeSqft || this.parseSqft(p.sqft);
        return sq >= 1000 && sq <= 1500;
      });
    } else if (sizeFilter === 'medium') {
      list = list.filter(p => {
        const sq = p.plotSizeSqft || this.parseSqft(p.sqft);
        return sq > 1500 && sq <= 2400;
      });
    } else if (sizeFilter === 'villa') {
      list = list.filter(p => (p.plotSizeSqft || this.parseSqft(p.sqft)) > 2400);
    }

    const sort = this.sortBy();
    const sorted = [...list];

    if (sort === 'price-asc') {
      sorted.sort((a, b) => this.parsePrice(a.price) - this.parsePrice(b.price));
    } else if (sort === 'price-desc') {
      sorted.sort((a, b) => this.parsePrice(b.price) - this.parsePrice(a.price));
    } else if (sort === 'sqft-desc') {
      sorted.sort((a, b) => (b.plotSizeSqft || 0) - (a.plotSizeSqft || 0));
    }

    return sorted;
  });

  setSizeFilter(size: string): void {
    this.selectedSizeFilter.set(size);
  }

  requestMasterPlan(projectName?: string): void {
    const devName = this.builderDossier()?.name || this.builderName();
    const targetProject = projectName || this.projectsList()[0]?.name || devName;
    const text = encodeURIComponent(`Hi Find a Plot, I want to download the Sanctioned Cadastral Master Layout Plan & Brochure for ${targetProject} by ${devName}.`);
    window.open(`https://wa.me/919486140936?text=${text}`, '_blank');
    this.notificationService.show({
      type: 'success',
      title: 'Master Plan Requested',
      message: 'Connecting to Cadastral Desk for DTCP / TNRERA sanctioned blueprint dossier.',
      icon: 'download'
    });
  }

  private parseSqft(sqftStr?: string): number {
    if (!sqftStr) return 0;
    const clean = sqftStr.replace(/[^\d.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const name = params.get('name');
      if (name) {
        const decoded = decodeURIComponent(name).trim();
        this.builderName.set(decoded);
        this.loadBuilderData(decoded);
      }
    });
  }

  loadBuilderData(name: string): void {
    this.isLoading.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.propertyService.fetchBuilderDetails(name).subscribe(data => {
      this.isLoading.set(false);
      if (data && data.developer) {
        this.builderDossier.set(data.developer);
        this.projectsList.set(data.projects || []);
        this.propertiesList.set(data.properties || []);

        const d = data.developer;
        this.customEditForm = {
          name: d.name || '',
          reraNumber: d.reraNumber || '',
          logoUrl: d.logoUrl || '',
          coverImageUrl: d.coverImageUrl || '',
          bgGradient: d.bgGradient || this.defaultPageGradient,
          corporateOffice: d.corporateOffice || '',
          contactPhone: d.contactPhone || '',
          contactEmail: d.contactEmail || '',
          websiteUrl: d.websiteUrl || '',
          about: d.about || '',
          establishedYear: d.estYear || '2016',
          projectsCompleted: String(d.completedProjects || '25+ Projects'),
          deliveredSqFt: d.deliveredSqFt || '12M+ sq.ft'
        };
      } else {
        // Minimal dossier if API returns empty
        this.builderDossier.set({
          name: name,
          rawName: name,
          reraNumber: 'TNRERA Verified',
          logoUrl: null,
          totalProperties: 0,
          totalProjects: 0,
          districts: ['Tamil Nadu'],
          cities: ['Tamil Nadu'],
          reraLayoutsCount: 0,
          dtcpApprovedCount: 0,
          minPrice: 'Price on Request',
          maxPrice: '',
          estYear: '2015',
          completedProjects: '0 Projects Registered',
          deliveredSqFt: 'Plotted Layouts',
          complianceRating: '100%',
          about: `${name} is a verified real estate development entity in Tamil Nadu.`
        });
        this.projectsList.set([]);
        this.propertiesList.set([]);
      }
    });
  }

  setTab(tab: 'properties' | 'projects' | 'amenities' | 'location' | 'upcoming' | 'credentials' | 'customize'): void {
    this.activeTab.set(tab);
  }

  setProjectFilter(filter: string): void {
    this.selectedProjectFilter.set(filter);
  }

  setSortBy(sort: string): void {
    this.sortBy.set(sort);
  }

  saveCustomization(): void {
    const dossier = this.builderDossier();
    if (!dossier) return;

    this.isSaving.set(true);
    let adminPersona: any = null;
    try {
      const stored = localStorage.getItem('findaplot_admin_persona');
      if (stored) adminPersona = JSON.parse(stored);
    } catch {}

    const payload = {
      isAdmin: this.authService.currentUser()?.role === 'admin' || !!adminPersona,
      developerId: dossier.id || 1,
      ...this.customEditForm,
      bgGradient: this.customEditForm.bgGradient || this.defaultPageGradient,
      upcomingProjects: dossier.upcomingProjects || []
    };

    this.authService.updateDeveloperCompany(payload).subscribe(res => {
      this.isSaving.set(false);
      if (res && res.success) {
        this.builderDossier.update(old => old ? {
          ...old,
          name: this.customEditForm.name,
          reraNumber: this.customEditForm.reraNumber,
          logoUrl: this.customEditForm.logoUrl,
          coverImageUrl: this.customEditForm.coverImageUrl,
          bgGradient: this.customEditForm.bgGradient || this.defaultPageGradient,
          corporateOffice: this.customEditForm.corporateOffice,
          contactPhone: this.customEditForm.contactPhone,
          contactEmail: this.customEditForm.contactEmail,
          websiteUrl: this.customEditForm.websiteUrl,
          about: this.customEditForm.about,
          estYear: this.customEditForm.establishedYear,
          completedProjects: this.customEditForm.projectsCompleted,
          deliveredSqFt: this.customEditForm.deliveredSqFt
        } : null);
        this.setTab('properties');
      }
    });
  }

  addUpcomingFromPage(): void {
    const dossier = this.builderDossier();
    if (!dossier || !this.newUpcoming.name.trim()) return;

    const newItem: UpcomingProjectItem = {
      id: 'up-' + Date.now(),
      ...this.newUpcoming
    };

    const currentList = dossier.upcomingProjects || [];
    const updated = [...currentList, newItem];

    this.authService.updateDeveloperCompany({
      developerId: dossier.id || 1,
      upcomingProjects: updated
    }).subscribe(res => {
      if (res && res.success) {
        this.builderDossier.update(old => old ? { ...old, upcomingProjects: updated, totalProjects: (old.activeProjectsCount || 0) + updated.length } : null);
        this.newUpcoming.name = '';
      }
    });
  }

  deleteUpcomingFromPage(id: string): void {
    const dossier = this.builderDossier();
    if (!dossier) return;

    const currentList = dossier.upcomingProjects || [];
    const updated = currentList.filter(p => p.id !== id);

    this.authService.updateDeveloperCompany({
      developerId: dossier.id || 1,
      upcomingProjects: updated
    }).subscribe(res => {
      if (res && res.success) {
        this.builderDossier.update(old => old ? { ...old, upcomingProjects: updated, totalProjects: (old.activeProjectsCount || 0) + updated.length } : null);
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  shareBuilderProfile(): void {
    if (navigator.share) {
      navigator.share({
        title: `${this.builderDossier()?.name || this.builderName()} — Verified Developer`,
        text: `Explore verified plotted layouts by ${this.builderDossier()?.name || this.builderName()} on Find a Plot`,
        url: window.location.href
      }).catch(() => { });
    } else {
      navigator.clipboard.writeText(window.location.href);
      this.notificationService.show({
        type: 'info',
        title: 'Link Copied',
        message: 'Developer profile link copied to clipboard',
        icon: 'content_copy'
      });
    }
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';
  }

  private parsePrice(priceStr?: string): number {
    if (!priceStr) return 0;
    const clean = priceStr.replace(/[^\d.]/g, '');
    const num = parseFloat(clean);
    if (isNaN(num)) return 0;
    if (priceStr.toLowerCase().includes('cr')) return num * 10000000;
    if (priceStr.toLowerCase().includes('lakh')) return num * 100000;
    return num;
  }
}
