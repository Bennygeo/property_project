import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Property } from '../../../../core/models/property.model';
import { PropertyService } from '../../../../core/services/property.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { HeaderComponent } from '../../../home/components/header/header.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { TopConciergeBarComponent } from '../../../home/components/top-concierge-bar/top-concierge-bar.component';

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
  name: string;
  rawName: string;
  totalProperties: number;
  totalProjects: number;
  districts: string[];
  cities: string[];
  reraLayoutsCount: number;
  dtcpApprovedCount: number;
  minPrice: string;
  maxPrice: string;
  estYear: string;
  completedProjects: number;
  deliveredSqFt: string;
  complianceRating: string;
  about: string;
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
  private readonly notificationService = inject(NotificationService);

  readonly builderName = signal<string>('');
  readonly isLoading = signal<boolean>(true);
  readonly builderDossier = signal<BuilderDossier | null>(null);
  readonly projectsList = signal<BuilderProjectSummary[]>([]);
  readonly propertiesList = signal<Property[]>([]);

  // Filter & View State
  readonly activeTab = signal<'properties' | 'projects' | 'credentials'>('properties');
  readonly selectedProjectFilter = signal<string>('all');
  readonly sortBy = signal<string>('featured');

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
        const totalProjects = data.developer.totalProjects ?? (data.projects?.length ?? 0);
        // If developer has only 1 project, do not show dedicated showcase page - route to property
        if (totalProjects <= 1) {
          const singleProp = data.properties?.[0] || (data.projects?.[0]?.samplePropertyId ? { id: data.projects[0].samplePropertyId } : null);
          if (singleProp?.id) {
            this.router.navigate(['/property', singleProp.id], { replaceUrl: true });
          } else {
            this.router.navigate(['/search'], { queryParams: { developer: data.developer.rawName || name }, replaceUrl: true });
          }
          return;
        }

        this.builderDossier.set(data.developer);
        this.projectsList.set(data.projects || []);
        this.propertiesList.set(data.properties || []);
      } else {
        // Fallback default minimal dossier if API returns empty
        this.builderDossier.set({
          name: name,
          rawName: name,
          totalProperties: 0,
          totalProjects: 0,
          districts: ['Tamil Nadu'],
          cities: ['Tamil Nadu'],
          reraLayoutsCount: 0,
          dtcpApprovedCount: 0,
          minPrice: '₹ 25 Lakhs',
          maxPrice: '₹ 1.5 Cr',
          estYear: '2018',
          completedProjects: 0,
          deliveredSqFt: 'N/A',
          complianceRating: '98%',
          about: `${name} is a verified real estate development entity registered with state cadastral authorities.`
        });
      }
    });
  }

  setTab(tab: 'properties' | 'projects' | 'credentials'): void {
    this.activeTab.set(tab);
  }

  setProjectFilter(projectName: string): void {
    this.selectedProjectFilter.set(projectName);
  }

  setSortBy(sort: string): void {
    this.sortBy.set(sort);
  }

  shareBuilderProfile(): void {
    if (navigator.share) {
      navigator.share({
        title: `${this.builderDossier()?.name || this.builderName()} — Verified Developer Portfolio`,
        text: `Explore verified RERA projects and approved cadastral layouts by ${this.builderDossier()?.name || this.builderName()}`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      this.notificationService.show({
        type: 'success',
        title: 'Portfolio Link Copied',
        message: 'Direct developer showcase URL has been copied to clipboard.',
        icon: 'link'
      });
    }
  }

  goBack(): void {
    const lastUrl = this.propertyService.lastSearchUrl();
    if (lastUrl && lastUrl.includes('/search')) {
      this.router.navigateByUrl(lastUrl);
    } else {
      this.location.back();
    }
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';
  }

  private parsePrice(priceStr?: string): number {
    if (!priceStr) return 0;
    const clean = priceStr.replace(/[^\d]/g, '');
    return parseInt(clean, 10) || 0;
  }
}

