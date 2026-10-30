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
  MASTER_FLOOD_ZONE_OPTIONS
} from '../../../../core/models/property-master.model';
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PropertyService } from '../../../../core/services/property.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { HeaderComponent } from '../../../home/components/header/header.component';
import { FooterComponent } from '../../../home/components/footer/footer.component';
import { TopConciergeBarComponent } from '../../../home/components/top-concierge-bar/top-concierge-bar.component';
import { ToastComponent } from '../../../home/components/toast/toast.component';
import { PropertyMediaModalComponent } from '../../../home/components/property-media-modal/property-media-modal.component';
import { PlotDetails } from '../../../../core/models/property.model';
import { SubdividedPlot } from '../../../../core/models/subdivided-plot.model';

export interface UploadedImageItem {
  id: string;
  file: File;
  previewUrl: string;
  serverUrl?: string;
  name: string;
  sizeFormatted: string;
  isCover: boolean;
  isUploading: boolean;
  error?: string;
}

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
export class PostPropertyPageComponent {
  readonly propertyService = inject(PropertyService);
  readonly authService = inject(AuthService);
  readonly notificationService = inject(NotificationService);
  readonly router = inject(Router);

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

  onPlotSizeSqftChange(): void {
    this.master.plotSizeCents = calculateCents(this.master.plotSizeSqft);
    this.master.totalPrice = calculateTotalPrice(this.master.plotSizeSqft, this.master.pricePerSqft);
  }

  onPricePerSqftChange(): void {
    this.master.totalPrice = calculateTotalPrice(this.master.plotSizeSqft, this.master.pricePerSqft);
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
  readonly propertyTypes = [
    { id: 'Apartments & Flats', label: 'Apartments & Flats', icon: 'apartment', desc: 'Flats & High-Rise' },
    { id: 'Independent Villas', label: 'Independent Villas', icon: 'villa', desc: 'Villas & Mansions' },
    { id: 'Luxury Penthouses', label: 'Luxury Penthouses', icon: 'balcony', desc: 'Sky Duplex & Terraces' },
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
  sampleImages = [
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
    // Synchronize master sheet fields with top-level listing properties
    if (!this.form.title.trim() && this.master.projectName) {
      this.form.title = this.master.projectName + (this.master.plotNo ? ` - Plot ${this.master.plotNo}` : '');
    }
    if (!this.form.price.trim() && this.master.totalPrice > 0) {
      this.form.price = this.getFormattedTotalPrice();
    }
    if (!this.form.pricePerSqft.trim() && this.master.pricePerSqft) {
      this.form.pricePerSqft = `₹ ${this.master.pricePerSqft.toLocaleString('en-IN')}/sq.ft`;
    }
    if (!this.form.sqft.trim() && this.master.plotSizeSqft) {
      this.form.sqft = `${this.master.plotSizeSqft} sq.ft` + (this.master.plotSizeCents > 0 ? ` (${this.master.plotSizeCents} Cents)` : '');
    }
    if (!this.form.localityName.trim()) {
      this.form.localityName = this.master.villageLocality || this.master.areaLocation || '';
    }
    if (!this.form.cityName.trim()) {
      this.form.cityName = this.master.district || this.master.taluk || 'Chennai';
    }
    if (!this.form.reraNumber.trim() && this.master.reraNumber) {
      this.form.reraNumber = this.master.reraNumber;
    }
    if (!this.form.facingOrView.trim() && this.master.facing) {
      this.form.facingOrView = this.master.facing + ' Facing' + (this.master.cornerPlot === 'Yes' ? ' (Corner)' : '');
    }

    const effectiveTitle = this.form.title.trim() || this.master.projectName?.trim();
    if (!effectiveTitle) {
      this.notificationService.show({
        type: 'error',
        title: 'Project Name Required',
        message: 'Please enter the Project Name in Section 1 before submitting.',
        icon: 'error'
      });
      return;
    }

    const effectivePrice = this.form.price.trim() || (this.master.totalPrice > 0 ? this.getFormattedTotalPrice() : '');
    if (!effectivePrice) {
      this.notificationService.show({
        type: 'error',
        title: 'Plot Pricing Required',
        message: 'Please enter Plot Size (sq.ft) and Price Per Sq.Ft in Section 3.',
        icon: 'error'
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
      userName
    };

    if (this.isPlot()) {
      payload.plotFactsheet = this.plotFactsheet();
      payload.subdividedPlots = this.subdividedPlots();
    }

    this.propertyService.createUserProperty(payload).subscribe(res => {
      this.isSubmitting.set(false);
      if (res.success) {
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
