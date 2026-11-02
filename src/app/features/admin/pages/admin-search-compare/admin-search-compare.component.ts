import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Property, PropertyType } from '../../../../core/models/property.model';
import { PropertyService, DistrictItem } from '../../../../core/services/property.service';
import { CompareService } from '../../../../core/services/compare.service';
import { AdminService } from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PropertyCardComponent } from '../../../home/components/property-card/property-card.component';
import { PropertyCompareDockComponent } from '../../../../shared/components/property-compare/property-compare-dock/property-compare-dock.component';
import { PropertyCompareModalComponent } from '../../../../shared/components/property-compare/property-compare-modal/property-compare-modal.component';
import { formatPriceIndian } from '../../../../core/utils/price-helper';

function parsePriceToNumber(priceStr: string | undefined): number {
  if (!priceStr) return 0;
  const clean = priceStr.replace(/₹|,/g, '').trim().toLowerCase();
  if (clean.includes('cr')) {
    const num = parseFloat(clean.replace('cr', '').trim());
    return isNaN(num) ? 0 : num * 10000000;
  }
  if (clean.includes('lakh') || clean.includes('l')) {
    const num = parseFloat(clean.replace(/lakh|l/g, '').trim());
    return isNaN(num) ? 0 : num * 100000;
  }
  const direct = parseFloat(clean);
  return isNaN(direct) ? 0 : direct;
}

@Component({
  selector: 'app-admin-search-compare',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    PropertyCardComponent,
    PropertyCompareDockComponent,
    PropertyCompareModalComponent
  ],
  templateUrl: './admin-search-compare.component.html',
  styleUrls: ['./admin-search-compare.component.css']
})
export class AdminSearchCompareComponent implements OnInit {
  private readonly router = inject(Router);
  readonly propertyService = inject(PropertyService);
  readonly compareService = inject(CompareService);
  readonly adminService = inject(AdminService);
  readonly authService = inject(AuthService);
  readonly notificationService = inject(NotificationService);
  readonly formatPriceIndian = formatPriceIndian;

  // Filter signals
  readonly searchQuery = signal<string>('');
  readonly selectedDistrict = signal<string>('');
  readonly selectedType = signal<string>('all');
  readonly selectedBudget = signal<string>('all');
  readonly onlyVerified = signal<boolean>(false);
  readonly sortBy = signal<'featured' | 'price-asc' | 'price-desc' | 'newest'>('featured');
  readonly viewMode = signal<'grid' | 'list'>('grid');

  // Districts for dropdown
  readonly districtsList = signal<DistrictItem[]>([]);

  // Budget options
  readonly budgetRanges = [
    { value: 'all', label: 'All Budgets', min: 0, max: Infinity },
    { value: 'under-50l', label: 'Under ₹50 Lakhs', min: 0, max: 5000000 },
    { value: '50l-1cr', label: '₹50 L - ₹1 Crore', min: 5000000, max: 10000000 },
    { value: '1cr-2cr', label: '₹1 Cr - ₹2 Crore', min: 10000000, max: 20000000 },
    { value: 'above-2cr', label: 'Above ₹2 Crore', min: 20000000, max: Infinity }
  ];

  // Property types matching PropertyType definitions
  readonly propertyTypes: Array<{ value: string; label: string; icon: string }> = [
    { value: 'all', label: 'All Classifications', icon: 'grid_view' },
    { value: 'Gated CMDA Plots', label: 'Plots & Land', icon: 'landscape' },
    { value: 'Independent Villas', label: 'Villas & Houses', icon: 'villa' },
    { value: 'Apartments & Flats', label: 'Apartments', icon: 'apartment' },
    { value: 'Commercial Spaces', label: 'Commercial', icon: 'storefront' },
    { value: 'Luxury Penthouses', label: 'Luxury Penthouses', icon: 'balcony' }
  ];

  ngOnInit(): void {
    // Load Tamil Nadu districts dynamically
    this.propertyService.fetchDistricts().subscribe({
      next: (resp) => {
        if (resp && resp.allDistricts) {
          this.districtsList.set(resp.allDistricts);
        }
      },
      error: () => {
        this.districtsList.set([]);
      }
    });
  }

  // Filtered Properties Computation
  readonly filteredProperties = computed(() => {
    let list = this.propertyService.properties() || [];

    // Filter by query (title, district, locality, reraId, builder, developer)
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(p => 
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.district && p.district.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.locality && p.locality.toLowerCase().includes(q)) ||
        (p.badges?.rera && p.badges.rera.toLowerCase().includes(q)) ||
        (p.developer?.name && p.developer.name.toLowerCase().includes(q)) ||
        (p.developerName && p.developerName.toLowerCase().includes(q)) ||
        (p.corridor && p.corridor.toLowerCase().includes(q))
      );
    }

    // Filter by district
    const d = this.selectedDistrict();
    if (d) {
      list = list.filter(p => 
        (p.district && p.district.toLowerCase() === d.toLowerCase()) ||
        (p.city && p.city.toLowerCase() === d.toLowerCase())
      );
    }

    // Filter by propertyType
    const t = this.selectedType();
    if (t !== 'all') {
      list = list.filter(p => p.propertyType === t);
    }

    // Filter by budget
    const b = this.selectedBudget();
    if (b !== 'all') {
      const budgetObj = this.budgetRanges.find(item => item.value === b);
      if (budgetObj) {
        list = list.filter(p => {
          const numPrice = parsePriceToNumber(p.price);
          return numPrice >= budgetObj.min && numPrice <= budgetObj.max;
        });
      }
    }

    // Filter verified only
    if (this.onlyVerified()) {
      list = list.filter(p => 
        (p.badges && p.badges.rera && !p.badges.rera.toLowerCase().includes('pending')) || 
        p.cadastralAudit?.reraRegNo
      );
    }

    // Sorting
    const sort = this.sortBy();
    const sorted = [...list];
    if (sort === 'price-asc') {
      sorted.sort((a, b) => parsePriceToNumber(a.price) - parsePriceToNumber(b.price));
    } else if (sort === 'price-desc') {
      sorted.sort((a, b) => parsePriceToNumber(b.price) - parsePriceToNumber(a.price));
    } else if (sort === 'newest') {
      sorted.sort((a, b) => (b.id > a.id ? 1 : -1));
    }

    return sorted;
  });

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedDistrict.set('');
    this.selectedType.set('all');
    this.selectedBudget.set('all');
    this.onlyVerified.set(false);
    this.sortBy.set('featured');
  }

  toggleCompare(prop: Property): void {
    this.compareService.toggleCompare(prop);
  }

  isInCompare(id: string): boolean {
    return this.compareService.isInCompare(id);
  }

  openCompareModal(): void {
    if (this.compareService.selectedProperties().length < 2) {
      this.notificationService.show({
        type: 'info',
        title: 'Select 2 Properties',
        message: 'Please select 2 properties to compare side-by-side.',
        icon: 'compare_arrows'
      });
      return;
    }
    this.compareService.openCompare();
  }

  clearCompare(): void {
    this.compareService.clearAll();
  }

  onSignOut(): void {
    this.adminService.logout();
    this.router.navigate(['/admin/login']);
  }
}
