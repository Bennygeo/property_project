import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { HeaderComponent } from '../../../home/components/header/header.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { TopConciergeBarComponent } from '../../../home/components/top-concierge-bar/top-concierge-bar.component';

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
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly activeTab = signal<'overview' | 'projects' | 'post-project' | 'upcoming' | 'customize'>('overview');

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
    // If user is not developer, automatically switch to developer session for demonstration / authorized access
    const user = this.authService.currentUser();
    if (!user || user.role !== 'developer') {
      this.authService.switchRole('developer', 1);
    }
    this.loadPortalData();
  }

  loadPortalData(): void {
    this.isLoading.set(true);
    const user = this.authService.currentUser();
    const userId = user?.id || 105;
    const devId = user?.developerId || 1;

    this.authService.getDeveloperPortal(userId, devId).subscribe(res => {
      this.isLoading.set(false);
      if (res && res.success && res.data) {
        this.company.set(res.data.developer);
        this.projects.set(res.data.projects || []);
        this.upcomingProjects.set(res.data.upcomingProjects || []);
        this.stats.set(res.data.stats || {});

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
          projectsCompleted: d.projectsCompleted || '25+ Projects',
          deliveredSqFt: d.deliveredSqFt || '12M+ sq.ft'
        };

        // Pre-fill RERA on new project form if empty
        if (!this.newProjectForm.reraNumber && d.reraNumber) {
          this.newProjectForm.reraNumber = d.reraNumber;
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

  setTab(tab: 'overview' | 'projects' | 'post-project' | 'upcoming' | 'customize'): void {
    this.activeTab.set(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

    if (!this.newProjectForm.title.trim()) {
      this.notificationService.show({
        type: 'warning',
        title: 'Title Required',
        message: 'Please enter a project title',
        icon: 'warning'
      });
      return;
    }

    this.isSaving.set(true);
    const highlights = this.newProjectForm.highlightsText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const payload = {
      ...this.newProjectForm,
      developerId: comp.id,
      highlights,
      subdividedPlots: this.newProjectPlots()
    };

    this.authService.postDeveloperProject(payload).subscribe(res => {
      this.isSaving.set(false);
      if (res && res.success) {
        // Reset form
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

