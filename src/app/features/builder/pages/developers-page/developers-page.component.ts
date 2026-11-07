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
  readonly displayLimit = signal<number>(36);

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
        if (builders && builders.length > 0) {
          this.allDevelopers.set(builders);
        } else {
          this.fallbackDevelopers();
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.fallbackDevelopers();
      }
    });
  }

  private fallbackDevelopers(): void {
    const fallbacks: DeveloperSummary[] = [
      {
        name: 'Sameeraa Foundations',
        projectCount: 6,
        propertyCount: 18,
        districts: ['Chengalpattu', 'Kancheepuram'],
        initials: 'SF'
      },
      {
        name: 'G Square Housing',
        projectCount: 14,
        propertyCount: 32,
        districts: ['Chennai', 'Coimbatore', 'Kancheepuram'],
        initials: 'GS'
      },
      {
        name: 'Casagrand Builder Private Limited',
        projectCount: 22,
        propertyCount: 45,
        districts: ['Chennai', 'Chengalpattu', 'Coimbatore'],
        initials: 'CB'
      },
      {
        name: 'Puravankara Limited',
        projectCount: 11,
        propertyCount: 20,
        districts: ['Chennai', 'Coimbatore'],
        initials: 'PL'
      },
      {
        name: 'Wisdom Housing & Properties',
        projectCount: 5,
        propertyCount: 12,
        districts: ['Kancheepuram', 'Thiruvallur'],
        initials: 'WH'
      },
      {
        name: 'Ashok Leyland Staff Housing',
        projectCount: 3,
        propertyCount: 8,
        districts: ['Dharmapuri', 'Hosur'],
        initials: 'AL'
      }
    ];
    this.allDevelopers.set(fallbacks);
  }

  loadMore(): void {
    this.displayLimit.update(curr => curr + 36);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedDistrict.set('all');
  }

  getBrandColor(name: string): { bg: string; text: string; border: string } {
    const palette = [
      { bg: '#f1f5f9', text: '#0f172a', border: '#cbd5e1' },
      { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
      { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
      { bg: '#fdf4ff', text: '#86198f', border: '#f5d0fe' },
      { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
      { bg: '#f8fafc', text: '#334155', border: '#e2e8f0' }
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % palette.length;
    return palette[idx];
  }
}

