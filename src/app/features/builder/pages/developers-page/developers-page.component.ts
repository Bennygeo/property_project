import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PropertyService, DeveloperSummary } from '../../../../core/services/property.service';
import { HeaderComponent } from '../../../home/components/header/header.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { TopConciergeBarComponent } from '../../../home/components/top-concierge-bar/top-concierge-bar.component';

@Component({
  selector: 'app-developers-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TopConciergeBarComponent,
    HeaderComponent,
    FooterComponent
  ],
  templateUrl: './developers-page.component.html',
  styleUrls: ['./developers-page.component.css']
})
export class DevelopersPageComponent implements OnInit {
  private readonly propertyService = inject(PropertyService);

  readonly allDevelopers = signal<DeveloperSummary[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly searchQuery = signal<string>('');
  readonly selectedDistrict = signal<string>('all');
  readonly displayLimit = signal<number>(48);

  private readonly failedLogos = new Set<string>();

  // Curated internet dummy corporate/real-estate brand logo URLs for developers without a custom uploaded logo
  private readonly dummyLogos: string[] = [
    'https://placehold.co/240x160/ffffff/0f172a/png?text=TRIBE+GROUP&font=montserrat',
    'https://placehold.co/240x160/3d5a45/ffffff/png?text=ZENVIAN&font=playfair-display',
    'https://api.dicebear.com/9.x/shapes/svg?seed=TMCGroup&backgroundColor=ffffff',
    'https://placehold.co/240x160/ffffff/9a8446/png?text=ORIGEN+REALTY&font=lato',
    'https://placehold.co/240x160/ffffff/3b1d75/png?text=ASBL&font=raleway',
    'https://ui-avatars.com/api/?name=T&background=1d70e8&color=ffffff&size=200&bold=true&font-size=0.55',
    'https://placehold.co/240x160/ffffff/1e293b/png?text=TRISHALA&font=poppins',
    'https://placehold.co/240x160/f1f5f9/0f172a/png?text=ASSETZ&font=oswald',
    'https://placehold.co/240x160/ffffff/b45309/png?text=EMBASSY&font=montserrat',
    'https://placehold.co/240x160/ffffff/475569/png?text=VISHUDDH&font=playfair-display',
    'https://api.dicebear.com/9.x/icons/svg?seed=HorizonEstates&backgroundColor=eff6ff',
    'https://placehold.co/240x160/0f172a/f8fafc/png?text=CREST+HOMES&font=raleway',
    'https://api.dicebear.com/9.x/shapes/svg?seed=ApexPromoters&backgroundColor=f8fafc',
    'https://placehold.co/240x160/ffffff/047857/png?text=VERDANT&font=poppins',
    'https://ui-avatars.com/api/?name=SD&background=0f766e&color=ffffff&size=200&bold=true',
    'https://placehold.co/240x160/1e293b/fbbf24/png?text=CROWN+LAND&font=lato'
  ];

  // Available districts from current catalog
  readonly availableDistricts = computed<string[]>(() => {
    const set = new Set<string>();
    for (const d of this.allDevelopers()) {
      if (d.districts && Array.isArray(d.districts)) {
        d.districts.forEach(dist => {
          if (dist && dist !== 'Tamil Nadu') set.add(dist);
        });
      }
    }
    return Array.from(set).sort();
  });

  // Filtered developers based on search and district
  readonly filteredDevelopers = computed<DeveloperSummary[]>(() => {
    let list = this.allDevelopers();
    const q = this.searchQuery().trim().toLowerCase();
    const dist = this.selectedDistrict();

    if (dist !== 'all') {
      list = list.filter(d => d.districts?.some(item => item.toLowerCase() === dist.toLowerCase()));
    }

    if (q) {
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.districts?.some(di => di.toLowerCase().includes(q))
      );
    }

    return list;
  });

  // Paginated/windowed list for fast initial render
  readonly visibleDevelopers = computed<DeveloperSummary[]>(() => {
    return this.filteredDevelopers().slice(0, this.displayLimit());
  });

  readonly hasMore = computed<boolean>(() => {
    return this.visibleDevelopers().length < this.filteredDevelopers().length;
  });

  readonly totalProjectsCount = computed<number>(() => {
    return this.allDevelopers().reduce((acc, d) => acc + (d.projectCount || 1), 0);
  });

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'instant' });
    this.loadDevelopers();
  }

  loadDevelopers(): void {
    this.isLoading.set(true);
    this.propertyService.fetchBuilders().subscribe({
      next: (builders) => {
        this.isLoading.set(false);
        this.allDevelopers.set(builders || []);
      },
      error: () => {
        this.isLoading.set(false);
        this.allDevelopers.set([]);
      }
    });
  }

  loadMore(): void {
    this.displayLimit.update(curr => curr + 48);
  }

  viewAllDevelopers(): void {
    this.clearFilters();
    this.displayLimit.set(Math.max(this.allDevelopers().length, 100));
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedDistrict.set('all');
  }

  getDeveloperLogo(dev: DeveloperSummary): string {
    if (dev.logoUrl && !this.failedLogos.has(dev.name)) {
      return dev.logoUrl;
    }
    const idx = this.hashName(dev.name) % this.dummyLogos.length;
    return this.dummyLogos[idx];
  }

  onLogoError(event: Event, dev: DeveloperSummary): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    if (dev.logoUrl && !this.failedLogos.has(dev.name)) {
      this.failedLogos.add(dev.name);
      const idx = this.hashName(dev.name) % this.dummyLogos.length;
      img.src = this.dummyLogos[idx];
      return;
    }
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(dev.name)}&background=0066ff&color=fff&size=200&bold=true&rounded=false`;
    if (img.src !== fallbackUrl) {
      img.src = fallbackUrl;
    }
  }

  private hashName(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

