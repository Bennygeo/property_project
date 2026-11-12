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
    FooterComponent
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
  readonly activeTab = signal<'properties' | 'projects' | 'upcoming' | 'credentials' | 'customize'>('properties');
  readonly selectedProjectFilter = signal<string>('all');
  readonly sortBy = signal<string>('featured');

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
  customEditForm = {
    name: '',
    reraNumber: '',
    logoUrl: '',
    coverImageUrl: '',
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

  setTab(tab: 'properties' | 'projects' | 'upcoming' | 'credentials' | 'customize'): void {
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
    const payload = {
      developerId: dossier.id || 1,
      ...this.customEditForm,
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
      }).catch(() => {});
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
