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
import { Component, OnInit, OnDestroy, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  PropertyService,
  DeveloperSummary,
  GeoLookupPincodeResult,
  GeoLookupLocalityResult
} from '../../../../core/services/property.service';
import { LocationService } from '../../../../core/services/location.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AdminService } from '../../../../core/services/admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReraValidationService, ReraValidationResult } from '../../../../core/services/rera-validation.service';
import { CanComponentDeactivate } from '../../../../core/guards/post-property-leave.guard';
import { HeaderComponent } from '../../../home/components/header/header.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { TopConciergeBarComponent } from '../../../home/components/top-concierge-bar/top-concierge-bar.component';
import { ToastComponent } from '../../../home/components/toast/toast.component';
import { PropertyMediaModalComponent } from '../../../home/components/property-media-modal/property-media-modal.component';
import { PlotDetails } from '../../../../core/models/property.model';
import { SubdividedPlot } from '../../../../core/models/subdivided-plot.model';

export interface WizardStageDef {
  step: number;
  shortLabel: string;
  fullTitle: string;
  icon: string;
}

export interface UploadedImageItem {
  id: string;
  file?: File;
  previewUrl: string;
  serverUrl?: string;
  name: string;
  sizeFormatted: string;
  isCover: boolean;
  isUploading: boolean;
  error?: string;
}

const LOCAL_DRAFT_STORAGE_KEY = 'fap_post_property_draft_v1';
const LOCAL_SESSION_STORAGE_KEY = 'fap_post_property_session_key';

@Component({
  selector: 'app-post-property-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    HeaderComponent,
    FooterComponent,
    TopConciergeBarComponent,
    ToastComponent,
    PropertyMediaModalComponent
  ],
  templateUrl: './post-property-page.component.html',
  styleUrls: ['./post-property-page.component.css']
})
export class PostPropertyPageComponent implements OnInit, OnDestroy, CanComponentDeactivate {
  readonly propertyService = inject(PropertyService);
  readonly locationService = inject(LocationService);
  readonly authService = inject(AuthService);
  readonly adminService = inject(AdminService);
  readonly notificationService = inject(NotificationService);
  readonly reraValidator = inject(ReraValidationService);
  readonly router = inject(Router);

  readonly isAdminPrivilege = computed<boolean>(() => this.authService.isAdmin() || this.adminService.verifyAdminAccess());

  // =========================================================================
  // 7-STAGE INTERACTIVE STEPPER, DB DRAFT PERSISTENCE & REFRESH GUARD
  // =========================================================================
  readonly wizardStages: WizardStageDef[] = [
    { step: 1, shortLabel: 'Project & Legal', fullTitle: '1. Project & Legal Details', icon: 'gavel' },
    { step: 2, shortLabel: 'Location', fullTitle: '2. Cadastral & Geographical Location', icon: 'pin_drop' },
    { step: 3, shortLabel: 'Plot & Pricing', fullTitle: '3. Plot Details & Valuation', icon: 'square_foot' },
    { step: 4, shortLabel: 'Nearby', fullTitle: '4. Nearby Facilities & Distances', icon: 'near_me' },
    { step: 5, shortLabel: 'Suitability', fullTitle: '5. Suitability & Possession', icon: 'verified' },
    { step: 6, shortLabel: 'Utilities', fullTitle: '6. Infrastructure & On-Site Utilities', icon: 'engineering' },
    { step: 7, shortLabel: 'Risk & Media', fullTitle: '7. Risk Audit, Contact & Media', icon: 'shield' }
  ];

  readonly currentStage = signal<number>(1);
  readonly highestStageReached = signal<number>(1);
  readonly visitedStages = signal<Set<number>>(new Set([1]));
  readonly formRevision = signal<number>(0);

  // Draft & Sync Status Signals
  readonly draftId = signal<string | null>(null);
  readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'offline'>('idle');
  readonly lastSavedTime = signal<string>('');
  readonly isOffline = signal<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  // Resume Draft Banner State
  readonly pendingDraft = signal<any | null>(null);
  readonly showResumeBanner = signal<boolean>(false);

  // In-App Accidental Leave Confirmation Modal State
  readonly showLeaveConfirmModal = signal<boolean>(false);
  private leaveConfirmResolver: ((allow: boolean) => void) | null = null;
  private bypassLeaveGuard = false;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionKey = '';

  readonly currentStageDef = computed<WizardStageDef>(() => {
    return this.wizardStages.find(s => s.step === this.currentStage()) || this.wizardStages[0];
  });

  readonly stageCheckpoints = computed(() => {
    // Depend on formRevision, uploadedImages, currentStage, visitedStages, highestStageReached
    this.formRevision();
    this.uploadedImages();
    const active = this.currentStage();
    const visited = this.visitedStages();
    const highest = this.highestStageReached();

    return this.wizardStages.map(s => {
      const missing = this.getStageMissingFields(s.step);
      const isVisited = visited.has(s.step) || s.step < highest;
      let status: 'active' | 'completed' | 'incomplete' | 'upcoming' = 'upcoming';

      if (s.step === active) {
        status = 'active';
      } else if (missing.length === 0 && isVisited) {
        status = 'completed';
      } else if (isVisited || s.step < active) {
        status = 'incomplete';
      }

      return {
        ...s,
        status,
        missingCount: missing.length,
        missingFields: missing
      };
    });
  });

  readonly completionPercent = computed<number>(() => {
    this.formRevision();
    this.uploadedImages();
    let totalReq = 0;
    let filledReq = 0;
    for (let step = 1; step <= 7; step++) {
      const { total, missing } = this.evaluateStageRequiredFields(step);
      totalReq += total;
      filledReq += Math.max(0, total - missing.length);
    }
    if (totalReq === 0) return 0;
    return Math.round((filledReq / totalReq) * 100);
  });

  readonly incompleteEarlierStagesCount = computed<number>(() => {
    return this.stageCheckpoints().filter(c => c.status === 'incomplete').length;
  });

  @HostListener('window:online')
  onWindowOnline(): void {
    this.isOffline.set(false);
    if (this.hasActiveDraftContent()) {
      this.persistStageDraft(false);
    }
  }

  @HostListener('window:offline')
  onWindowOffline(): void {
    this.isOffline.set(true);
    this.saveStatus.set('offline');
    this.saveLocalDraftSnapshot();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasActiveDraftContent() && !this.isSuccessModalOpen() && !this.bypassLeaveGuard) {
      // Immediately flush latest stage to localStorage + DB via sendBeacon
      this.saveLocalDraftSnapshot();
      this.flushDraftWithBeacon();
      // Trigger native browser accidental refresh / tab close warning
      event.preventDefault();
      event.returnValue = '';
    }
  }

  canDeactivate(): boolean | Promise<boolean> {
    if (!this.hasActiveDraftContent() || this.isSuccessModalOpen() || this.bypassLeaveGuard) {
      return true;
    }
    this.showLeaveConfirmModal.set(true);
    return new Promise<boolean>((resolve) => {
      this.leaveConfirmResolver = resolve;
    });
  }

  confirmStayOnForm(): void {
    this.showLeaveConfirmModal.set(false);
    if (this.leaveConfirmResolver) {
      this.leaveConfirmResolver(false);
      this.leaveConfirmResolver = null;
    }
  }

  confirmSaveAndLeave(): void {
    this.showLeaveConfirmModal.set(false);
    this.saveLocalDraftSnapshot();
    this.persistStageDraft(false);
    this.bypassLeaveGuard = true;
    if (this.leaveConfirmResolver) {
      this.leaveConfirmResolver(true);
      this.leaveConfirmResolver = null;
    }
  }

  onFormFieldActivity(): void {
    this.formRevision.update(v => v + 1);
    this.scheduleDebouncedDraftSave();
  }

  private scheduleDebouncedDraftSave(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    this.autoSaveTimer = setTimeout(() => {
      this.saveLocalDraftSnapshot();
      if (this.hasActiveDraftContent()) {
        this.persistStageDraft(false);
      }
    }, 2200);
  }

  goToStage(step: number): void {
    if (step < 1 || step > 7 || step === this.currentStage()) return;
    // Save current stage to DB before transitioning
    this.persistStageDraft(false);
    this.currentStage.set(step);
    this.highestStageReached.update(h => Math.max(h, step));
    this.visitedStages.update(set => {
      const next = new Set(set);
      next.add(step);
      return next;
    });
    this.saveLocalDraftSnapshot();
    this.scrollFormToTop();
    this.scrollActiveMobilePillIntoView(step);
  }

  nextStage(): void {
    const curr = this.currentStage();
    if (curr >= 7) return;
    const next = curr + 1;
    this.highestStageReached.update(h => Math.max(h, next));
    this.visitedStages.update(set => {
      const updated = new Set(set);
      updated.add(curr);
      updated.add(next);
      return updated;
    });
    this.currentStage.set(next);
    // Persist every stage transition to MySQL DB + localStorage
    this.persistStageDraft(true);
    this.scrollFormToTop();
    this.scrollActiveMobilePillIntoView(next);
  }

  prevStage(): void {
    const curr = this.currentStage();
    if (curr <= 1) return;
    this.persistStageDraft(false);
    const prev = curr - 1;
    this.currentStage.set(prev);
    this.visitedStages.update(set => {
      const updated = new Set(set);
      updated.add(prev);
      return updated;
    });
    this.saveLocalDraftSnapshot();
    this.scrollFormToTop();
    this.scrollActiveMobilePillIntoView(prev);
  }

  private scrollFormToTop(): void {
    if (typeof document === 'undefined') return;
    const sheet = document.querySelector('.form-sheet-card');
    if (sheet) {
      sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private scrollActiveMobilePillIntoView(step: number): void {
    if (typeof document === 'undefined') return;
    setTimeout(() => {
      const el = document.getElementById(`wizard-mobile-pill-${step}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 30);
  }

  hasActiveDraftContent(): boolean {
    const m = this.master;
    return !!(
      (m.projectName && m.projectName.trim()) ||
      (m.developer && m.developer.trim()) ||
      (m.areaLocation && m.areaLocation.trim()) ||
      (m.villageLocality && m.villageLocality.trim()) ||
      (m.city && m.city.trim()) ||
      (m.district && m.district.trim()) ||
      (m.pincode && m.pincode.trim()) ||
      (m.plotNo && m.plotNo.trim()) ||
      (m.plotSizeSqft && m.plotSizeSqft > 0) ||
      (m.minPlotSize && m.minPlotSize > 0) ||
      (m.priceFrom && m.priceFrom > 0) ||
      (m.pricePerSqft && m.pricePerSqft > 0) ||
      (m.contactPersonPhone && m.contactPersonPhone.trim()) ||
      this.uploadedImages().length > 0 ||
      (this.form.title && this.form.title.trim())
    );
  }

  getStageMissingFields(step: number): string[] {
    return this.evaluateStageRequiredFields(step).missing;
  }

  private evaluateStageRequiredFields(step: number): { total: number; missing: string[] } {
    const m = this.master;
    const missing: string[] = [];
    let total = 0;

    const reqStr = (val: any, label: string) => {
      total++;
      if (!val || String(val).trim() === '') missing.push(label);
    };
    const reqNum = (val: any, label: string) => {
      total++;
      if (!val || Number(val) <= 0) missing.push(label);
    };

    switch (step) {
      case 1:
        reqStr(m.projectName, 'Project Name');
        reqStr(m.dtcpApproved, 'DTCP Approved');
        reqStr(m.pattaType, 'Patta Type');
        reqStr(m.clearTitleAvailable, 'Clear Title / EC');
        reqStr(m.bankLoanApproved, 'Bank Loan Approved');
        break;
      case 2:
        reqStr(m.pincode, 'Pincode');
        reqStr(m.city, 'City');
        reqStr(m.district, 'District');
        reqStr(m.areaLocation, 'Area / Location');
        reqStr(m.villageLocality, 'Village / Locality');
        break;
      case 3:
        if (this.isAdminPrivilege()) {
          reqNum(m.minPlotSize, 'Min Plot Size');
          reqNum(m.maxPlotSize, 'Max Plot Size');
          reqNum(m.priceFrom, 'Starting Price');
          reqNum(m.priceTo, 'Max Price');
        } else {
          reqStr(m.plotNo, 'Plot No.');
          reqNum(m.plotSizeSqft, 'Plot Size (sq.ft)');
          reqNum(m.pricePerSqft, 'Price per sq.ft');
        }
        reqStr(m.facing, 'Facing');
        reqStr(m.cornerPlot, 'Corner Plot');
        reqStr(m.landUse, 'Land Use');
        break;
      case 4:
        reqStr(m.corridor, 'Strategic Corridor');
        break;
      case 5:
        reqStr(m.suitedFor, 'Suited For');
        break;
      case 6:
        reqStr(m.electricity, 'Electricity');
        reqStr(m.waterConnection, 'Water Connection');
        reqStr(m.drainageFacility, 'Drainage Facility');
        reqNum(m.roadWidthFt, 'Road Width (ft)');
        reqStr(m.roadType, 'Road Type');
        reqStr(m.streetLights, 'Street Lights');
        reqStr(m.compoundWallGated, 'Compound Wall / Gated');
        reqStr(m.park, 'Park / Open Space');
        break;
      case 7:
        reqStr(m.floodZone, 'Flood Zone Risk');
        reqStr(m.waterloggingHistory, 'Waterlogging History');
        reqStr(m.contactPersonPhone, 'Contact Person / Phone');
        if (this.uploadedImages().some(img => !!img.error)) {
          total++;
          missing.push('Retry failed photo upload');
        }
        break;
    }

    return { total, missing };
  }

  private getOrCreateSessionKey(): string {
    if (this.sessionKey) return this.sessionKey;
    if (typeof window !== 'undefined' && window.localStorage) {
      let existing = localStorage.getItem(LOCAL_SESSION_STORAGE_KEY);
      if (!existing) {
        existing = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, existing);
      }
      this.sessionKey = existing;
      return existing;
    }
    this.sessionKey = 'sess_ssr';
    return this.sessionKey;
  }

  private buildDraftPayload(): any {
    const user = this.authService.currentUser();
    const persistedImages = this.uploadedImages()
      .filter(img => !!img.serverUrl)
      .map(img => ({
        id: img.id,
        previewUrl: img.serverUrl || '',
        serverUrl: img.serverUrl,
        name: img.name,
        sizeFormatted: img.sizeFormatted,
        isCover: img.isCover,
        isUploading: false
      }));

    return {
      draftId: this.draftId() || undefined,
      userId: user?.id || undefined,
      sessionKey: this.getOrCreateSessionKey(),
      userName: user?.name || undefined,
      userPhone: user?.phone || undefined,
      userEmail: user?.email || undefined,
      currentStage: this.currentStage(),
      highestStageReached: this.highestStageReached(),
      completionPercent: this.completionPercent(),
      payload: {
        master: this.master,
        form: this.form,
        activeMediaTab: this.activeMediaTab(),
        uploadedImages: persistedImages,
        visitedStages: Array.from(this.visitedStages())
      }
    };
  }

  private saveLocalDraftSnapshot(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (!this.hasActiveDraftContent()) return;
    try {
      const snapshot = {
        ...this.buildDraftPayload(),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(LOCAL_DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore storage quota errors
    }
  }

  private clearLocalDraftSnapshot(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.removeItem(LOCAL_DRAFT_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  private flushDraftWithBeacon(): void {
    if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return;
    if (!this.hasActiveDraftContent()) return;
    try {
      const url = this.propertyService.getPropertyDraftEndpointUrl();
      const body = JSON.stringify({ action: 'save', ...this.buildDraftPayload() });
      const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
      navigator.sendBeacon(url, blob);
    } catch {
      // Ignore beacon failures
    }
  }

  persistStageDraft(showToastOnManual: boolean = false): void {
    this.saveLocalDraftSnapshot();
    if (!this.hasActiveDraftContent()) {
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.isOffline.set(true);
      this.saveStatus.set('offline');
      return;
    }

    this.saveStatus.set('saving');
    const payload = this.buildDraftPayload();
    this.propertyService.savePropertyDraft(payload).subscribe(res => {
      if (res.success) {
        if (res.draftId) {
          this.draftId.set(res.draftId);
          this.saveLocalDraftSnapshot();
        }
        this.saveStatus.set('saved');
        this.lastSavedTime.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        if (showToastOnManual) {
          this.notificationService.show({
            type: 'success',
            title: `Stage ${this.currentStage() - 1 > 0 ? this.currentStage() - 1 : 1} Saved`,
            message: 'Your progress is safely stored in our registry.',
            icon: 'cloud_done'
          });
        }
      } else {
        this.saveStatus.set('offline');
      }
    });
  }

  saveDraftManually(): void {
    if (!this.hasActiveDraftContent()) {
      this.notificationService.show({
        type: 'info',
        title: 'Nothing to Save Yet',
        message: 'Enter at least a project name or location to save a draft.',
        icon: 'info'
      });
      return;
    }
    this.saveLocalDraftSnapshot();
    this.saveStatus.set('saving');
    this.propertyService.savePropertyDraft(this.buildDraftPayload()).subscribe(res => {
      if (res.success) {
        if (res.draftId) this.draftId.set(res.draftId);
        this.saveStatus.set('saved');
        this.lastSavedTime.set(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        this.notificationService.show({
          type: 'success',
          title: 'Draft Saved to Registry',
          message: `Stage ${this.currentStage()} of 7 (${this.completionPercent()}%) saved. You can safely resume anytime.`,
          icon: 'cloud_done'
        });
      } else {
        this.saveStatus.set('offline');
        this.notificationService.show({
          type: 'warning',
          title: 'Saved Locally (Offline)',
          message: 'Your draft is saved on this device and will sync once connected.',
          icon: 'cloud_off'
        });
      }
    });
  }

  private checkForExistingDraft(): void {
    let localDraft: any = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(LOCAL_DRAFT_STORAGE_KEY);
        if (raw) {
          localDraft = JSON.parse(raw);
        }
      } catch {
        localDraft = null;
      }
    }

    const user = this.authService.currentUser();
    const sk = this.getOrCreateSessionKey();

    // Query MySQL for latest in-progress draft for this user or browser session
    this.propertyService.getLatestPropertyDraft({
      userId: user?.id,
      sessionKey: sk,
      draftId: localDraft?.draftId
    }).subscribe(res => {
      const dbDraft = res.success && res.draft ? res.draft : null;
      const candidate = dbDraft || localDraft;
      if (candidate && candidate.payload && this.draftHasMeaningfulData(candidate.payload)) {
        this.pendingDraft.set(candidate);
        this.showResumeBanner.set(true);
      }
    });
  }

  private draftHasMeaningfulData(payload: any): boolean {
    const m = payload?.master || {};
    const f = payload?.form || {};
    return !!(
      (m.projectName && String(m.projectName).trim()) ||
      (m.developer && String(m.developer).trim()) ||
      (m.areaLocation && String(m.areaLocation).trim()) ||
      (m.district && String(m.district).trim()) ||
      (m.contactPersonPhone && String(m.contactPersonPhone).trim()) ||
      (f.title && String(f.title).trim())
    );
  }

  resumeSavedDraft(): void {
    const draft = this.pendingDraft();
    if (!draft || !draft.payload) return;

    if (draft.draftId) {
      this.draftId.set(draft.draftId);
    }
    if (draft.payload.master) {
      this.master = { ...createBlankMasterData(), ...draft.payload.master };
      this.postDeveloperQuery.set(this.master.developer || '');
      this.postReraInput.set(this.master.reraNumber || '');
    }
    if (draft.payload.form) {
      this.form = { ...this.form, ...draft.payload.form };
    }
    if (draft.payload.activeMediaTab) {
      this.activeMediaTab.set(draft.payload.activeMediaTab);
    }
    if (Array.isArray(draft.payload.uploadedImages) && draft.payload.uploadedImages.length > 0) {
      this.uploadedImages.set(draft.payload.uploadedImages);
    }

    const stage = Math.max(1, Math.min(7, Number(draft.currentStage) || 1));
    const highest = Math.max(stage, Math.min(7, Number(draft.highestStageReached) || stage));
    this.currentStage.set(stage);
    this.highestStageReached.set(highest);

    const visitedArr: number[] = Array.isArray(draft.payload.visitedStages) ? draft.payload.visitedStages : [];
    const visitedSet = new Set<number>(visitedArr);
    for (let i = 1; i <= highest; i++) visitedSet.add(i);
    this.visitedStages.set(visitedSet);

    this.showResumeBanner.set(false);
    this.pendingDraft.set(null);
    this.saveStatus.set('saved');
    this.formRevision.update(v => v + 1);
    this.scrollActiveMobilePillIntoView(stage);

    this.notificationService.show({
      type: 'success',
      title: 'Draft Restored',
      message: `Resumed at Stage ${stage} of 7 (${this.completionPercent()}% complete).`,
      icon: 'restore'
    });
  }

  discardSavedDraft(): void {
    const draft = this.pendingDraft();
    if (draft?.draftId) {
      this.propertyService.updatePropertyDraftStatus(draft.draftId, 'discard').subscribe();
    }
    this.clearLocalDraftSnapshot();
    this.pendingDraft.set(null);
    this.showResumeBanner.set(false);
    this.draftId.set(null);
    this.notificationService.show({
      type: 'info',
      title: 'Started Fresh',
      message: 'Previous unfinished draft was cleared.',
      icon: 'delete_sweep'
    });
  }

  // Existing Developers from Database for Auto-population
  readonly developersList = signal<DeveloperSummary[]>([]);
  readonly isDeveloperDropdownOpen = signal<boolean>(false);
  readonly postDeveloperQuery = signal<string>('');
  readonly postReraInput = signal<string>('');

  readonly matchingDevelopers = computed<DeveloperSummary[]>(() => {
    const list = this.developersList();
    const query = this.postDeveloperQuery().trim().toLowerCase();
    if (!query) {
      return list.slice(0, 8);
    }
    return list
      .filter(d => (d.name && d.name.toLowerCase().includes(query)) || (d.reraNumber && d.reraNumber.toLowerCase().includes(query)))
      .slice(0, 10);
  });

  readonly postPropReraValidation = computed<ReraValidationResult>(() => {
    const raw = this.postReraInput();
    return this.reraValidator.validate(raw, this.master.category || this.form.propertyType);
  });

  onDeveloperInput(val: string): void {
    const query = val || '';
    this.master.developer = query;
    this.postDeveloperQuery.set(query);
    this.openDeveloperDropdown();
  }

  onReraInput(val: string): void {
    const rera = val || '';
    this.master.reraNumber = rera;
    this.form.reraNumber = rera;
    this.postReraInput.set(rera);
  }

  ngOnInit(): void {
    // Default district and city from active header location if not already set
    const activeDist = this.locationService.selectedDistrict();
    if (activeDist && !this.master.district) {
      this.master.district = activeDist;
      if (!this.master.city) {
        this.master.city = activeDist;
      }
      if (!this.form.cityName) {
        this.form.cityName = activeDist;
      }
    }
    this.loadDevelopers();
    this.checkForExistingDraft();
  }

  ngOnDestroy(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
  }

  loadDevelopers(): void {
    this.propertyService.fetchBuilders().subscribe(builders => {
      if (builders && builders.length > 0) {
        this.developersList.set(builders);
      }
    });
  }

  openDeveloperDropdown(): void {
    this.isDeveloperDropdownOpen.set(true);
  }

  closeDeveloperDropdown(): void {
    setTimeout(() => {
      this.isDeveloperDropdownOpen.set(false);
    }, 250);
  }

  selectDeveloper(d: DeveloperSummary): void {
    this.master.developer = d.name;
    this.postDeveloperQuery.set(d.name);
    if (d.id) {
      this.master.developerId = d.id;
    }
    if (d.reraNumber) {
      this.onReraInput(d.reraNumber);
    }
    if (d.districts && d.districts.length > 0 && !this.master.district) {
      this.master.district = d.districts[0];
      this.form.cityName = d.districts[0];
    }
    this.isDeveloperDropdownOpen.set(false);
    this.notificationService.show({
      type: 'info',
      title: 'Developer Selected',
      message: `${d.name}${d.reraNumber ? ' • RERA: ' + d.reraNumber : ''}`,
      icon: 'verified'
    });
  }

  // =========================================================================
  // STAGE 2 HYBRID GEO AUTO-POPULATION (Pincode <-> Locality/City)
  // =========================================================================
  readonly isPincodeResolving = signal<boolean>(false);
  readonly pincodeResolvedSource = signal<string | null>(null);
  readonly pincodeSuggestedLocalities = signal<string[]>([]);
  readonly localitySuggestions = signal<GeoLookupLocalityResult[]>([]);
  readonly isAreaDropdownOpen = signal<boolean>(false);
  readonly isVillageDropdownOpen = signal<boolean>(false);
  readonly isAreaResolving = signal<boolean>(false);

  readonly filteredPincodeAreas = computed<string[]>(() => {
    const list = this.pincodeSuggestedLocalities();
    const q = (this.master.areaLocation || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(loc => loc.toLowerCase().includes(q));
  });

  readonly filteredPincodeVillages = computed<string[]>(() => {
    const list = this.pincodeSuggestedLocalities();
    const q = (this.master.villageLocality || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter(loc => loc.toLowerCase().includes(q));
  });

  onPincodeInput(val: string): void {
    const raw = String(val || '');
    this.master.pincode = raw;
    this.onFormFieldActivity();

    const cleanPin = raw.replace(/\D/g, '').trim();
    if (cleanPin.length === 6) {
      this.isPincodeResolving.set(true);
      this.propertyService.lookupByPincode(cleanPin).subscribe({
        next: (res) => {
          this.isPincodeResolving.set(false);
          if (res && res.district) {
            this.master.district = res.district;
            this.master.city = res.city || res.district;
            if (res.taluk) {
              this.master.taluk = res.taluk;
            }
            this.form.cityName = this.master.city;
            this.pincodeResolvedSource.set(res.source || 'resolved');
            const locs = res.localities || [];
            this.pincodeSuggestedLocalities.set(locs);
            this.localitySuggestions.set([]);

            // If Area was already typed (e.g. "padi"), keep it; if not, do not auto-overwrite
            this.onFormFieldActivity();
            this.notificationService.show({
              type: 'info',
              title: 'Pincode Resolved',
              message: `${locs.length} options found for PIN ${cleanPin} in ${this.master.city}`,
              icon: 'pin_drop'
            });
          } else {
            this.pincodeResolvedSource.set(null);
            this.pincodeSuggestedLocalities.set([]);
            this.localitySuggestions.set([]);
          }
        },
        error: () => {
          this.isPincodeResolving.set(false);
          this.pincodeResolvedSource.set(null);
          this.localitySuggestions.set([]);
        }
      });
    } else {
      this.pincodeResolvedSource.set(null);
      this.pincodeSuggestedLocalities.set([]);
      this.localitySuggestions.set([]);
      this.isAreaDropdownOpen.set(false);
      this.isVillageDropdownOpen.set(false);
    }
  }

    selectAreaOption(locName: string): void {
      this.master.areaLocation = locName;
      if(!this.master.villageLocality) {
      this.master.villageLocality = locName;
    }
    this.form.localityName = locName;
    this.isAreaDropdownOpen.set(false);
    this.onFormFieldActivity();
    this.notificationService.show({
      type: 'info',
      title: 'Area Selected',
      message: locName,
      icon: 'check_circle'
    });
  }

  selectVillageOption(locName: string): void {
    this.master.villageLocality = locName;
    if (!this.master.areaLocation) {
      this.master.areaLocation = locName;
    }
    this.form.localityName = locName;
    this.isVillageDropdownOpen.set(false);
    this.onFormFieldActivity();
    this.notificationService.show({
      type: 'info',
      title: 'Village / Locality Selected',
      message: locName,
      icon: 'check_circle'
    });
  }

  onAreaInput(val: string): void {
    const query = String(val || '');
    this.master.areaLocation = query;
    this.onFormFieldActivity();
    this.isAreaDropdownOpen.set(true);

    const cleanQ = query.trim();
      if (cleanQ.length >= 2 && this.pincodeSuggestedLocalities().length === 0) {
        this.fetchLocalitySuggestions(cleanQ);
      }
    }

      openAreaDropdown(): void {
        if(this.pincodeSuggestedLocalities().length > 0 || (this.master.areaLocation && this.master.areaLocation.trim().length >= 2)) {
        this.isAreaDropdownOpen.set(true);
      }
    }

      closeAreaDropdown(): void {
        setTimeout(() => {
          this.isAreaDropdownOpen.set(false);
        }, 250);
      }

  onVillageInput(val: string): void {
        const query = String(val || '');
        this.master.villageLocality = query;
        this.onFormFieldActivity();
        this.isVillageDropdownOpen.set(true);
      }

  openVillageDropdown(): void {
        if (this.pincodeSuggestedLocalities().length > 0) {
          this.isVillageDropdownOpen.set(true);
        }
      }

  closeVillageDropdown(): void {
        setTimeout(() => {
          this.isVillageDropdownOpen.set(false);
        }, 250);
      }

  fetchLocalitySuggestions(query: string): void {
    this.isAreaResolving.set(true);
    this.propertyService.lookupByLocality(query, this.master.pincode, this.master.district).subscribe({
      next: (items) => {
        this.isAreaResolving.set(false);
        this.localitySuggestions.set(items || []);
      },
      error: () => {
        this.isAreaResolving.set(false);
        this.localitySuggestions.set([]);
      }
    });
  }

  selectLocalitySuggestion(item: GeoLookupLocalityResult): void {
        this.master.areaLocation = item.locality;
        if (!this.master.villageLocality) {
          this.master.villageLocality = item.locality;
        }
        this.master.city = item.city;
        this.master.district = item.district;
        if (item.taluk) {
          this.master.taluk = item.taluk;
        }
        if (item.pincode) {
          this.master.pincode = item.pincode;
          this.pincodeResolvedSource.set('locality');
        }
        this.form.cityName = item.city;
        this.form.localityName = item.locality;
        this.isAreaDropdownOpen.set(false);
        this.onFormFieldActivity();

        this.notificationService.show({
          type: 'info',
          title: 'Area Auto-Populated',
          message: `${item.locality} • ${item.city}, ${item.district}${item.pincode ? ' (PIN: ' + item.pincode + ')' : ''}`,
          icon: 'location_on'
        });
      }

  readonly isSubmitting = signal<boolean>(false);
      readonly submittedPropId = signal<string | null>(null);
      readonly isSuccessModalOpen = signal<boolean>(false);

      // Advertisement State (Supports Left or Right Side Display)
      readonly isAdVisible = signal<boolean>(true);
      readonly adPosition = signal<'left' | 'right'>('right');

      // Media Tab: 'upload' | 'url' | 'presets'
      readonly activeMediaTab = signal<'upload' | 'url' | 'presets'>('upload');
      readonly isDragging = signal<boolean>(false);
      readonly uploadedImages = signal<UploadedImageItem[]>([]);
      readonly isUploadingAny = computed(() => this.uploadedImages().some(img => img.isUploading));

      // Comprehensive Property Master Data from Excel Schema
      master: PropertyMasterData = createBlankMasterData();

      // Excel Dropdown Options
      readonly yesNoOptions = MASTER_YES_NO_OPTIONS;
      readonly facingOptions = MASTER_FACING_OPTIONS;
      readonly pattaOptions = MASTER_PATTA_OPTIONS;
      readonly landUseOptions = MASTER_LAND_USE_OPTIONS;
      readonly availabilityOptions = MASTER_AVAILABILITY_OPTIONS;
      readonly corridorOptions = MASTER_CORRIDOR_OPTIONS;
      readonly suitedForOptions = MASTER_SUITED_FOR_OPTIONS;
      readonly utilityOptions = MASTER_UTILITY_OPTIONS;
      readonly drainageOptions = MASTER_DRAINAGE_OPTIONS;
      readonly roadTypeOptions = MASTER_ROAD_TYPE_OPTIONS;
      readonly floodZoneOptions = MASTER_FLOOD_ZONE_OPTIONS;
      readonly categoryOptions = MASTER_CATEGORY_OPTIONS;
      readonly typeOptions = MASTER_TYPE_OPTIONS;
      readonly projectStageOptions = MASTER_PROJECT_STAGE_OPTIONS;
      readonly projectStatusOptions = MASTER_PROJECT_STATUS_OPTIONS;
      readonly approvalAuthorityOptions = MASTER_APPROVAL_AUTHORITY_OPTIONS;

      formatCurrencyAmount(val: number | null | undefined): string {
        const num = Number(val) || 0;
        if (num <= 0) return '₹ 0';
        if (num >= 10000000) {
          const cr = num / 10000000;
          return `₹ ${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
        }
        if (num >= 100000) {
          const l = num / 100000;
          return `₹ ${l % 1 === 0 ? l.toFixed(0) : l.toFixed(2)} L`;
        }
        return `₹ ${num.toLocaleString('en-IN')}`;
      }

  getFormattedPriceRange(): string {
        const from = this.master.priceFrom;
        const to = this.master.priceTo;
        if (!from && !to) {
          return this.master.totalPrice > 0 ? this.getFormattedTotalPrice() : '₹ 0';
        }
        if (from && to && to > from) {
          return `${this.formatCurrencyAmount(from)} – ${this.formatCurrencyAmount(to)}`;
        }
        if (from) {
          return `Starting ${this.formatCurrencyAmount(from)}`;
        }
        if (to) {
          return `Up to ${this.formatCurrencyAmount(to)}`;
        }
        return '₹ 0';
      }

  getFormattedPlotRange(): string {
        const min = this.master.minPlotSize;
        const max = this.master.maxPlotSize;
        if (min && max && min !== max) {
          return `${min} – ${max} sq.ft`;
        }
        if (min) return `${min} sq.ft`;
        if (max) return `${max} sq.ft`;
        if (this.master.plotSizeSqft) return `${this.master.plotSizeSqft} sq.ft`;
        return '0 sq.ft';
      }

  getPlotRangeCents(): string {
        const min = this.master.minPlotSize || this.master.plotSizeSqft || 0;
        const max = this.master.maxPlotSize || this.master.plotSizeSqft || 0;
        const minCents = (min / 435.6).toFixed(2);
        const maxCents = (max / 435.6).toFixed(2);
        if (min > 0 && max > 0 && min !== max) {
          return `${minCents} – ${maxCents} Cents`;
        }
        if (min > 0) return `${minCents} Cents`;
        return '0 Cents';
      }

  onPlotRangeChange(): void {
        const min = this.master.minPlotSize;
        const max = this.master.maxPlotSize;
        if (min && max && min !== max) {
          this.master.availablePlotSizes = `${min} - ${max} sq.ft`;
        } else if (min) {
          this.master.availablePlotSizes = `${min} sq.ft`;
        }
        if (min && !this.master.plotSizeSqft) {
          this.master.plotSizeSqft = min;
        }
        if (this.master.plotSizeSqft) {
          this.master.plotSizeCents = calculateCents(this.master.plotSizeSqft);
        }
        if (this.master.priceFrom && min && (!this.master.pricePerSqft || this.master.pricePerSqft <= 0)) {
          this.master.pricePerSqft = Math.round(this.master.priceFrom / min);
        }
      }

  onPriceRangeChange(): void {
        const from = this.master.priceFrom;
        const to = this.master.priceTo;
        if (from && from > 0) {
          this.master.totalPrice = from;
          if (this.master.minPlotSize && (!this.master.pricePerSqft || this.master.pricePerSqft <= 0)) {
            this.master.pricePerSqft = Math.round(from / this.master.minPlotSize);
          }
        } else if (to && to > 0) {
          this.master.totalPrice = to;
        }
      }

  onPlotSizeSqftChange(): void {
        this.master.plotSizeCents = calculateCents(this.master.plotSizeSqft);
        this.master.totalPrice = calculateTotalPrice(this.master.plotSizeSqft, this.master.pricePerSqft);
        if (this.master.plotSizeSqft && !this.master.minPlotSize) {
          this.master.minPlotSize = this.master.plotSizeSqft;
        }
        if (this.master.plotSizeSqft && !this.master.maxPlotSize) {
          this.master.maxPlotSize = this.master.plotSizeSqft;
        }
        if (this.master.totalPrice > 0 && !this.master.priceFrom) {
          this.master.priceFrom = this.master.totalPrice;
        }
        if (this.master.totalPrice > 0 && !this.master.priceTo) {
          this.master.priceTo = this.master.totalPrice;
        }
      }

  onPricePerSqftChange(): void {
        this.master.totalPrice = calculateTotalPrice(this.master.plotSizeSqft, this.master.pricePerSqft);
        if (this.master.totalPrice > 0 && !this.master.priceFrom) {
          this.master.priceFrom = this.master.totalPrice;
        }
        if (this.master.totalPrice > 0 && !this.master.priceTo) {
          this.master.priceTo = this.master.totalPrice;
        }
      }

  getFormattedTotalPrice(): string {
        const total = this.master.totalPrice;
        if (!total || total <= 0) return '₹ 0';
        if (total >= 10000000) {
          return `₹ ${(total / 10000000).toFixed(2)} Cr`;
        }
        if (total >= 100000) {
          return `₹ ${(total / 100000).toFixed(2)} Lakhs`;
        }
        return `₹ ${total.toLocaleString('en-IN')}`;
      }

  // Form Model
  form = {
        title: '',
        propertyType: 'Gated CMDA Plots',
        listingMode: 'plots',
        cityName: '',
        localityName: '',
        price: '',
        pricePerSqft: '',
        sqft: '',
        bhkBadge: 'Sanctioned Plot',
        facingOrView: '',
        reraNumber: '',
        mainImageUrl: '',
        description: '',
        // Dynamic Plot & Specialized Fields
        plotApproval: '',
        roadWidth: '',
        plotDimensions: '',
        boundaryWall: '',
        commercialType: '',
        powerBackup: '',
        waterSource: '',
        interactiveMapUrl: ''
      };

      // Property Type Visual Card Selector Definitions
      readonly propertyTypes =[
        { id: 'Independent Villas', label: 'Independent Villas', icon: 'villa', desc: 'Villas & Mansions' },
        { id: 'Gated CMDA Plots', label: 'Plots & Land', icon: 'terrain', desc: 'CMDA / DTCP Layouts' },
        { id: 'Commercial Spaces', label: 'Commercial Spaces', icon: 'domain', desc: 'Offices & Retail' },
        { id: 'Farm Land & Estates', label: 'Farm Land & Estates', icon: 'yard', desc: 'Agricultural Acreage' }
      ];

      isPlot(): boolean {
        return this.form.propertyType === 'Gated CMDA Plots';
      }

  isCommercial(): boolean {
        return this.form.propertyType === 'Commercial Spaces';
      }

  isFarmLand(): boolean {
        return this.form.propertyType === 'Farm Land & Estates';
      }

  isResidential(): boolean {
        return !this.isPlot() && !this.isCommercial() && !this.isFarmLand();
      }

  selectPropertyType(typeId: string): void {
        this.form.propertyType = typeId;
        if (this.isPlot()) {
          this.form.bhkBadge = 'Sanctioned Plot';
          this.form.listingMode = 'plots';
        } else if (this.isCommercial()) {
          this.form.bhkBadge = 'Commercial Space';
          this.form.listingMode = 'commercial';
        } else if (this.isFarmLand()) {
          this.form.bhkBadge = 'Agricultural Land';
          this.form.listingMode = 'plots';
        } else {
          if (['Sanctioned Plot', 'Commercial Space', 'Agricultural Land'].includes(this.form.bhkBadge)) {
            this.form.bhkBadge = '3 BHK';
          }
          if (this.form.listingMode === 'plots' || this.form.listingMode === 'commercial') {
            this.form.listingMode = 'buy';
          }
        }
      }

  getAreaLabel(): string {
        if (this.isPlot()) return 'Plot Extent / Land Area *';
        if (this.isFarmLand()) return 'Land Extent (Acres / Cents) *';
        if (this.isCommercial()) return 'Super Built-up Area *';
        return 'Super Built-up Area *';
      }

  getAreaPlaceholder(): string {
        if (this.isPlot()) return 'e.g. 2,400 sq.ft or 2.5 Cents';
        if (this.isFarmLand()) return 'e.g. 2.5 Acres or 60 Cents';
        if (this.isCommercial()) return 'e.g. 4,500 sq.ft';
        return 'e.g. 1,650 sq.ft';
      }

  getPricePerUnitLabel(): string {
        if (this.isPlot()) return 'Rate per Sq.Ft or Cent';
        if (this.isFarmLand()) return 'Rate per Acre or Cent';
        return 'Price per Sq.Ft (Approx.)';
      }

  getPricePerUnitPlaceholder(): string {
        if (this.isPlot()) return 'e.g. ₹ 4,200/sq.ft or ₹ 18 Lakhs/Cent';
        if (this.isFarmLand()) return 'e.g. ₹ 45 Lakhs / Acre';
        return 'e.g. ₹ 9,200/sq.ft';
      }

  // Sample quick presets to easily pick
  sampleImages =[
        { label: 'Modern Villa', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80' },
        { label: 'Sky Penthouse', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80' },
        { label: 'Architectural Mansion', url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80' },
        { label: 'Green Plot', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80' }
      ];

      // Master Layout Factsheet for Plots
      readonly plotFactsheet = signal<PlotDetails>({
        layoutSanctionNo: '',
        reraLayoutNo: '',
        frontageRoadWidth: '',
        waterTableDepth: '',
        soilBearingCapacity: '',
        fsiPermissible: '',
        ebSubstation: '',
        boundaryWall: '',
        drainageSystem: '',
        pattaStatus: '',
        dimensionRanges: ''
      });

      readonly subdividedPlots = signal<SubdividedPlot[]>([]);

      constructor() {
        // Default preset initialized for fallback
        this.form.mainImageUrl = '';
      }

  // Active cover preview computed from uploaded cover image, or direct URL
  readonly activeCoverPreview = computed(() => {
        if (this.activeMediaTab() === 'upload') {
          const cover = this.uploadedImages().find(img => img.isCover);
          if (cover) {
            return cover.previewUrl || cover.serverUrl;
          }
        }
        return this.form.mainImageUrl || '';
      });

      setMediaTab(tab: 'upload' | 'url' | 'presets'): void {
        this.activeMediaTab.set(tab);
        if (tab === 'upload') {
          const cover = this.uploadedImages().find(img => img.isCover);
          if (cover) {
            this.form.mainImageUrl = cover.serverUrl || cover.previewUrl;
          }
        } else if (tab === 'presets' && !this.form.mainImageUrl) {
          this.form.mainImageUrl = this.sampleImages[0].url;
        }
      }

  // Drag and drop event handlers
  onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(true);
      }

  onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(false);
      }

  onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(false);

        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
          this.handleFiles(event.dataTransfer.files);
        }
      }

  onFilesSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
          this.handleFiles(input.files);
          // Reset input value so same files can be re-selected if removed
          input.value = '';
        }
      }

  handleFiles(fileList: FileList | File[]): void {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/avif'];
        const maxSizeBytes = 15 * 1024 * 1024; // 15MB
        const files = Array.from(fileList);

        const validFiles: File[] = [];

        for (const file of files) {
          // Validate type
          if (!file.type.startsWith('image/') && !allowedTypes.includes(file.type.toLowerCase())) {
            this.notificationService.show({
              type: 'error',
              title: 'Unsupported File Format',
              message: `"${file.name}" is not a supported image. Please upload JPG, PNG, WEBP, or GIF.`,
              icon: 'image_not_supported'
            });
            continue;
          }

          // Validate size
          if (file.size > maxSizeBytes) {
            this.notificationService.show({
              type: 'error',
              title: 'File Too Large',
              message: `"${file.name}" exceeds the 15MB limit (${this.formatBytes(file.size)}).`,
              icon: 'warning'
            });
            continue;
          }

          validFiles.push(file);
        }

        if (validFiles.length === 0) return;

        validFiles.forEach((file) => {
          const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          const isFirst = this.uploadedImages().length === 0;

          // Create immediate preview reader
          const reader = new FileReader();
          reader.onload = (e) => {
            const previewUrl = e.target?.result as string;
            const item: UploadedImageItem = {
              id,
              file,
              previewUrl,
              name: file.name,
              sizeFormatted: this.formatBytes(file.size),
              isCover: isFirst,
              isUploading: true
            };

            this.uploadedImages.update(list => [...list, item]);

            if (isFirst) {
              this.form.mainImageUrl = previewUrl;
            }

            // Upload to backend API
            this.uploadImageFile(item);
          };

          reader.readAsDataURL(file);
        });

        this.activeMediaTab.set('upload');
      }

  private uploadImageFile(item: UploadedImageItem): void {
        if (!item.file) return;
        this.propertyService.uploadPropertyImage(item.file).subscribe({
          next: (res) => {
            this.uploadedImages.update(list =>
              list.map(img => {
                if (img.id === item.id) {
                  return {
                    ...img,
                    isUploading: false,
                    serverUrl: res.success ? res.url : undefined,
                    error: res.success ? undefined : (res.message || 'Upload failed')
                  };
                }
                return img;
              })
            );

            if (res.success && res.url) {
              // If this is the cover photo, update form.mainImageUrl to use the server URL
              const currentImg = this.uploadedImages().find(img => img.id === item.id);
              if (currentImg?.isCover) {
                this.form.mainImageUrl = res.url;
              }
              this.notificationService.show({
                type: 'success',
                title: 'Image Uploaded',
                message: `"${item.name}" uploaded to registry media server.`,
                icon: 'cloud_done'
              });
            } else {
              // Retain local preview even if server upload fails (e.g. offline dev mode)
              console.warn('Image upload error:', res.message);
            }
          },
          error: (err) => {
            this.uploadedImages.update(list =>
              list.map(img => (img.id === item.id ? { ...img, isUploading: false, error: 'Network error during upload' } : img))
            );
          }
        });
      }

  setCoverImage(targetImg: UploadedImageItem): void {
        this.uploadedImages.update(list =>
          list.map(img => ({
            ...img,
            isCover: img.id === targetImg.id
          }))
        );

        this.form.mainImageUrl = targetImg.serverUrl || targetImg.previewUrl;
        this.notificationService.show({
          type: 'info',
          title: 'Cover Image Updated',
          message: `"${targetImg.name}" is now the primary showcase cover.`,
          icon: 'photo_camera'
        });
      }

  removeImage(imageId: string): void {
        const list = this.uploadedImages();
        const removed = list.find(img => img.id === imageId);
        const updated = list.filter(img => img.id !== imageId);

        // If removed image was cover, assign cover to first remaining image
        if (removed?.isCover && updated.length > 0) {
          updated[0].isCover = true;
          this.form.mainImageUrl = updated[0].serverUrl || updated[0].previewUrl;
        } else if (updated.length === 0) {
          this.form.mainImageUrl = this.sampleImages[0].url;
        }

        this.uploadedImages.set(updated);
      }

  selectImage(url: string): void {
        this.form.mainImageUrl = url;
        // Mark uploaded items as not cover if preset is chosen
        this.uploadedImages.update(list => list.map(img => ({ ...img, isCover: false })));
      }

  private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      }

  onSubmit(): void {
        const isAdmin = this.isAdminPrivilege();

        // Synchronize master sheet fields with top-level listing properties
        if (!this.form.title.trim() && this.master.projectName) {
          this.form.title = this.master.projectName + (this.master.plotNo ? ` - Plot ${this.master.plotNo}` : '');
        }

        if (isAdmin) {
          // Sync ranges
          if (this.master.minPlotSize && !this.master.plotSizeSqft) {
            this.master.plotSizeSqft = this.master.minPlotSize;
            this.master.plotSizeCents = calculateCents(this.master.minPlotSize);
          }
          if (this.master.priceFrom && (!this.master.totalPrice || this.master.totalPrice <= 0)) {
            this.master.totalPrice = this.master.priceFrom;
          }
          if (this.master.priceFrom || this.master.priceTo) {
            this.form.price = this.getFormattedPriceRange();
          } else if (!this.form.price.trim() && this.master.totalPrice > 0) {
            this.form.price = this.getFormattedTotalPrice();
          }
          if (this.master.minPlotSize && this.master.maxPlotSize && this.master.minPlotSize !== this.master.maxPlotSize) {
            this.form.sqft = `${this.master.minPlotSize} - ${this.master.maxPlotSize} sq.ft`;
          } else if (!this.form.sqft.trim() && this.master.plotSizeSqft) {
            this.form.sqft = `${this.master.plotSizeSqft} sq.ft` + (this.master.plotSizeCents > 0 ? ` (${this.master.plotSizeCents} Cents)` : '');
          } else if (!this.form.sqft.trim() && this.master.minPlotSize) {
            this.form.sqft = `${this.master.minPlotSize} sq.ft`;
          }
          if (!this.form.pricePerSqft.trim()) {
            if (this.master.pricePerSqft) {
              this.form.pricePerSqft = `₹ ${this.master.pricePerSqft.toLocaleString('en-IN')}/sq.ft`;
            } else if (this.master.priceFrom && this.master.minPlotSize) {
              this.form.pricePerSqft = `₹ ${Math.round(this.master.priceFrom / this.master.minPlotSize).toLocaleString('en-IN')}/sq.ft`;
            }
          }
        } else {
          if (!this.form.price.trim() && this.master.totalPrice > 0) {
            this.form.price = this.getFormattedTotalPrice();
          }
          if (!this.form.pricePerSqft.trim() && this.master.pricePerSqft) {
            this.form.pricePerSqft = `₹ ${this.master.pricePerSqft.toLocaleString('en-IN')}/sq.ft`;
          }
          if (!this.form.sqft.trim() && this.master.plotSizeSqft) {
            this.form.sqft = `${this.master.plotSizeSqft} sq.ft` + (this.master.plotSizeCents > 0 ? ` (${this.master.plotSizeCents} Cents)` : '');
          }
        }

        if (!this.form.localityName.trim()) {
          this.form.localityName = this.master.villageLocality || this.master.areaLocation || '';
        }
        if (!this.form.cityName.trim()) {
          this.form.cityName = this.master.city || this.master.district || this.master.taluk || 'Chennai';
        }
        if (this.master.category) {
          this.form.propertyType = this.master.category;
        }
        if (this.master.interactiveMap && !this.form.interactiveMapUrl.trim()) {
          this.form.interactiveMapUrl = this.master.interactiveMap;
        }
        if (!this.form.reraNumber.trim() && this.master.reraNumber) {
          this.form.reraNumber = this.master.reraNumber;
        }
        if (!this.form.facingOrView.trim() && this.master.facing) {
          this.form.facingOrView = this.master.facing + ' Facing' + (this.master.cornerPlot === 'Yes' ? ' (Corner)' : '');
        }

        const effectiveTitle = this.form.title.trim() || this.master.projectName?.trim();
        if (!effectiveTitle) {
          this.currentStage.set(1);
          this.scrollFormToTop();
          this.notificationService.show({
            type: 'error',
            title: 'Project Name Required',
            message: 'Please enter the Project Name in Stage 1 before submitting.',
            icon: 'error'
          });
          return;
        }

        const effectivePrice = this.form.price.trim() ||
          (isAdmin && (this.master.priceFrom || this.master.priceTo) ? this.getFormattedPriceRange() : '') ||
          (this.master.totalPrice > 0 ? this.getFormattedTotalPrice() : '');

        if (!effectivePrice) {
          this.currentStage.set(3);
          this.scrollFormToTop();
          this.notificationService.show({
            type: 'error',
            title: 'Plot Pricing Required',
            message: isAdmin
              ? 'Please enter Price Range (Starting Price / Price From) in Stage 3.'
              : 'Please enter Plot Size (sq.ft) and Price Per Sq.Ft in Stage 3.',
            icon: 'error'
          });
          return;
        }

        if (isAdmin && !(this.master.minPlotSize || this.master.plotSizeSqft || this.form.sqft.trim())) {
          this.currentStage.set(3);
          this.scrollFormToTop();
          this.notificationService.show({
            type: 'error',
            title: 'Plot Range Required',
            message: 'Please enter Min Plot Size in Stage 3.',
            icon: 'error'
          });
          return;
        }

        // Statutory RERA Validation
        const effectiveRera = (this.master.reraNumber || this.form.reraNumber || '').trim();
        if (effectiveRera) {
          const reraVal = this.reraValidator.validate(effectiveRera, this.form.propertyType);
          if (!reraVal.isValid) {
            this.notificationService.show({
              type: 'warning',
              title: 'Invalid RERA Reference',
              message: `${reraVal.message} ${reraVal.warning || ''}`,
              icon: 'gavel'
            });
            return;
          }
          if (reraVal.canonicalRera) {
            this.form.reraNumber = reraVal.canonicalRera;
            this.master.reraNumber = reraVal.canonicalRera;
          }
        } else if (this.reraValidator.isReraStrictlyRequired(this.form.propertyType)) {
          this.notificationService.show({
            type: 'warning',
            title: 'RERA Registration Required',
            message: 'Statutory RERA registration reference or exemption status is required for this property category.',
            icon: 'gavel'
          });
          return;
        }

        // Determine final mainImageUrl
        let finalMainImageUrl = this.form.mainImageUrl;
        const coverUploaded = this.uploadedImages().find(img => img.isCover);
        if (this.activeMediaTab() === 'upload' && coverUploaded) {
          if (coverUploaded.serverUrl) {
            finalMainImageUrl = coverUploaded.serverUrl;
          } else if (coverUploaded.isUploading) {
            this.notificationService.show({
              type: 'warning',
              title: 'Upload in Progress',
              message: 'Please wait for your property photo to finish uploading.',
              icon: 'hourglass_top'
            });
            return;
          } else {
            this.notificationService.show({
              type: 'error',
              title: 'Upload Incomplete',
              message: coverUploaded.error || 'Photo upload failed. Please try re-uploading.',
              icon: 'cloud_off'
            });
            return;
          }
        }

        if (!finalMainImageUrl) {
          // Default placeholder if none chosen
          finalMainImageUrl = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80';
        }

        // Additional gallery images (only valid server URLs)
        const galleryImages = this.uploadedImages()
          .map(img => img.serverUrl)
          .filter((url): url is string => !!url && url !== finalMainImageUrl);

        const user = this.authService.currentUser();
        const userId = user?.id || 1;
        const userName = user?.name || 'Verified User';

        // Ensure appropriate badge for non-residential properties without bedrooms
        let finalBhkBadge = this.form.bhkBadge;
        if (this.isPlot()) {
          finalBhkBadge = this.form.plotApproval || 'Sanctioned Plot';
        } else if (this.isCommercial()) {
          finalBhkBadge = this.form.commercialType || 'Commercial Space';
        } else if (this.isFarmLand()) {
          finalBhkBadge = 'Agricultural Land';
        }

        const customHighlights: string[] = [];
        if (this.isPlot()) {
          if (this.form.plotApproval) customHighlights.push(this.form.plotApproval);
          if (this.form.roadWidth) customHighlights.push(`Frontage: ${this.form.roadWidth}`);
          if (this.form.plotDimensions) customHighlights.push(`Dimensions: ${this.form.plotDimensions}`);
          if (this.form.boundaryWall) customHighlights.push(`Perimeter: ${this.form.boundaryWall}`);
        } else if (this.isCommercial()) {
          if (this.form.commercialType) customHighlights.push(this.form.commercialType);
          if (this.form.powerBackup) customHighlights.push(this.form.powerBackup);
        } else if (this.isFarmLand()) {
          if (this.form.waterSource) customHighlights.push(this.form.waterSource);
          if (this.form.boundaryWall) customHighlights.push(this.form.boundaryWall);
        }

        this.isSubmitting.set(true);

        const payload: any = {
          ...this.form,
          title: effectiveTitle,
          price: effectivePrice,
          masterData: this.master,
          masterDetails: this.master,
          bhkBadge: finalBhkBadge,
          highlights: customHighlights,
          mainImageUrl: finalMainImageUrl,
          galleryImages,
          userId,
          userName,
          draftId: this.draftId() || undefined,
          sessionKey: this.getOrCreateSessionKey()
        };

        if (this.isPlot()) {
          payload.plotFactsheet = this.plotFactsheet();
          payload.subdividedPlots = this.subdividedPlots();
        }

        this.propertyService.createUserProperty(payload).subscribe(res => {
          this.isSubmitting.set(false);
          if (res.success) {
            const activeDraftId = this.draftId();
            if (activeDraftId) {
              this.propertyService.updatePropertyDraftStatus(activeDraftId, 'mark_submitted', res.propertyId).subscribe();
            }
            this.clearLocalDraftSnapshot();
            this.draftId.set(null);
            this.saveStatus.set('idle');
            this.lastSavedTime.set('');
            this.currentStage.set(1);
            this.highestStageReached.set(1);
            this.visitedStages.set(new Set([1]));
            this.formRevision.set(0);

            this.submittedPropId.set(res.propertyId || 'prop-submitted');
            this.isSuccessModalOpen.set(true);
            this.master = createBlankMasterData();
            this.uploadedImages.set([]);
            this.form = {
              title: '',
              propertyType: 'Gated CMDA Plots',
              listingMode: 'plots',
              cityName: '',
              localityName: '',
              price: '',
              pricePerSqft: '',
              sqft: '',
              bhkBadge: 'Sanctioned Plot',
              facingOrView: '',
              reraNumber: '',
              mainImageUrl: '',
              description: '',
              plotApproval: '',
              roadWidth: '',
              plotDimensions: '',
              boundaryWall: '',
              commercialType: '',
              powerBackup: '',
              waterSource: '',
              interactiveMapUrl: ''
            };
            this.notificationService.show({
              type: 'success',
              title: 'Property Submitted!',
              message: 'Your listing is now under verification by our architectural registry admin team.',
              icon: 'verified_user'
            });
          } else {
            this.notificationService.show({
              type: 'error',
              title: 'Submission Failed',
              message: res.message || 'Failed to submit property listing.',
              icon: 'error'
            });
          }
        });
      }

  toggleAdPosition(): void {
        this.adPosition.update(pos => pos === 'right' ? 'left' : 'right');
        this.notificationService.show({
          type: 'info',
          title: 'Ad Position Updated',
          message: `Sponsored showcase moved to the ${this.adPosition()} side.`,
          icon: 'swap_horiz'
        });
      }

  dismissAd(): void {
        this.isAdVisible.set(false);
      }

  openSampleShoot(): void {
        const plot = this.propertyService.properties().find(p => p.propertyType === 'Gated CMDA Plots') || this.propertyService.properties()[0];
        if (plot) {
          this.propertyService.openMediaModal(plot, 'premium');
        }
      }

  goToProfileListings(): void {
        this.isSuccessModalOpen.set(false);
        this.router.navigate(['/profile']);
      }
    }
