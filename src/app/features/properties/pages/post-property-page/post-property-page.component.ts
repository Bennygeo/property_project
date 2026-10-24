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

  // Form Model
  form = {
    title: '',
    propertyType: 'Apartments & Flats',
    listingMode: 'buy',
    cityName: 'Chennai',
    localityName: 'Anna Nagar',
    price: '',
    pricePerSqft: '',
    sqft: '',
    bhkBadge: '3 BHK',
    facingOrView: 'East Facing',
    reraNumber: '',
    mainImageUrl: '',
    description: '',
    // Dynamic Plot & Specialized Fields
    plotApproval: 'CMDA Approved',
    roadWidth: '30 Feet Road',
    plotDimensions: '',
    boundaryWall: 'Gated & Compounded',
    commercialType: 'Commercial Office Space',
    powerBackup: '100% DG Redundancy',
    waterSource: 'Dedicated Borewell & Canal',
    interactiveMapUrl: 'assets/secura-masterplan-3d.html'
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
    layoutSanctionNo: 'CMDA Sanctioned Layout PPD/LO No. 48/2023',
    reraLayoutNo: 'TN/01/Layout/0291/2024',
    frontageRoadWidth: '40 Feet Wide Bitumen Road',
    waterTableDepth: 'Sweet Potable Water at 18–24 Feet',
    soilBearingCapacity: 'Certified 220 kN/sq.m (Tested by IIT Madras)',
    fsiPermissible: '2.0 FSI (G+3 Floors Permissible)',
    ebSubstation: 'Dedicated 11kV Substation Commissioned',
    boundaryWall: '6-Foot Reinforced Perimeter Wall with Gated Security',
    drainageSystem: 'Underground Stormwater & Sewerage Grid Ready',
    pattaStatus: 'Individual Computerized Patta Issued',
    dimensionRanges: '40 ft x 60 ft (2,400 sq.ft standard corner)'
  });

  readonly subdividedPlots = signal<SubdividedPlot[]>([
    {
      id: 248,
      plotNo: '248',
      status: 'sold',
      superBuiltUpYds: 172.50,
      netPlotAreaYds: 118.20,
      superBuiltUpSqft: 1552,
      widthMeters: 12.50,
      lengthMeters: 7.80,
      widthFeet: 41.0,
      lengthFeet: 25.6,
      facing: 'South Facing (Corner)',
      priceInLakhs: 44.0,
      formattedPrice: '₹44.00 L',
      isCorner: true,
      hasTrees: true,
      x: -28,
      y: -15,
      w: 13,
      h: 11
    },
    {
      id: 247,
      plotNo: '247',
      status: 'sold',
      superBuiltUpYds: 165.20,
      netPlotAreaYds: 110.50,
      superBuiltUpSqft: 1487,
      widthMeters: 11.80,
      lengthMeters: 7.80,
      widthFeet: 38.7,
      lengthFeet: 25.6,
      facing: 'South Facing',
      priceInLakhs: 41.5,
      formattedPrice: '₹41.50 L',
      isCorner: false,
      hasTrees: false,
      x: -12,
      y: -15,
      w: 13,
      h: 11
    },
    {
      id: 221,
      plotNo: '221',
      status: 'sold',
      superBuiltUpYds: 158.40,
      netPlotAreaYds: 106.00,
      superBuiltUpSqft: 1425,
      widthMeters: 11.20,
      lengthMeters: 7.80,
      widthFeet: 36.7,
      lengthFeet: 25.6,
      facing: 'South Facing',
      priceInLakhs: 39.8,
      formattedPrice: '₹39.80 L',
      isCorner: false,
      hasTrees: false,
      x: 12,
      y: -15,
      w: 13,
      h: 11
    },
    {
      id: 222,
      plotNo: '222',
      status: 'available',
      superBuiltUpYds: 172.50,
      netPlotAreaYds: 118.20,
      superBuiltUpSqft: 1552,
      widthMeters: 12.50,
      lengthMeters: 7.80,
      widthFeet: 41.0,
      lengthFeet: 25.6,
      facing: 'South Facing (Corner)',
      priceInLakhs: 44.0,
      formattedPrice: '₹44.00 L',
      isCorner: true,
      hasTrees: false,
      x: 28,
      y: -15,
      w: 13,
      h: 11
    },
    {
      id: 249,
      plotNo: '249',
      status: 'available',
      superBuiltUpYds: 155.00,
      netPlotAreaYds: 104.50,
      superBuiltUpSqft: 1395,
      widthMeters: 11.50,
      lengthMeters: 7.59,
      widthFeet: 37.7,
      lengthFeet: 24.9,
      facing: 'North Facing',
      priceInLakhs: 39.0,
      formattedPrice: '₹39.00 L',
      isCorner: false,
      hasTrees: true,
      x: -28,
      y: 15,
      w: 13,
      h: 11
    },
    {
      id: 246,
      plotNo: '246',
      status: 'available',
      superBuiltUpYds: 150.76,
      netPlotAreaYds: 101.18,
      superBuiltUpSqft: 1357,
      widthMeters: 11.37,
      lengthMeters: 7.59,
      widthFeet: 37.3,
      lengthFeet: 24.9,
      facing: 'North Facing',
      priceInLakhs: 38.0,
      formattedPrice: '₹38.00 L',
      isCorner: false,
      hasTrees: true,
      x: -12,
      y: 15,
      w: 13,
      h: 11
    },
    {
      id: 245,
      plotNo: '245',
      status: 'available',
      superBuiltUpYds: 150.76,
      netPlotAreaYds: 101.18,
      superBuiltUpSqft: 1357,
      widthMeters: 11.37,
      lengthMeters: 7.59,
      widthFeet: 37.3,
      lengthFeet: 24.9,
      facing: 'North Facing',
      priceInLakhs: 38.0,
      formattedPrice: '₹38.00 L',
      isCorner: false,
      hasTrees: true,
      x: 12,
      y: 15,
      w: 13,
      h: 11
    },
    {
      id: 250,
      plotNo: '250',
      status: 'available',
      superBuiltUpYds: 162.00,
      netPlotAreaYds: 109.20,
      superBuiltUpSqft: 1458,
      widthMeters: 11.80,
      lengthMeters: 7.59,
      widthFeet: 38.7,
      lengthFeet: 24.9,
      facing: 'North Facing (Corner)',
      priceInLakhs: 40.5,
      formattedPrice: '₹40.50 L',
      isCorner: true,
      hasTrees: false,
      x: 28,
      y: 15,
      w: 13,
      h: 11
    }
  ]);

  constructor() {
    // Default preset initialized for fallback
    this.form.mainImageUrl = this.sampleImages[0].url;
  }

  // Active cover preview computed from uploaded cover image, or direct URL
  readonly activeCoverPreview = computed(() => {
    if (this.activeMediaTab() === 'upload') {
      const cover = this.uploadedImages().find(img => img.isCover);
      if (cover) {
        return cover.previewUrl || cover.serverUrl;
      }
    }
    return this.form.mainImageUrl || this.sampleImages[0].url;
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
    if (!this.form.title.trim()) {
      this.notificationService.show({
        type: 'error',
        title: 'Title Required',
        message: 'Please enter a property title before submitting.',
        icon: 'error'
      });
      return;
    }

    if (!this.form.price.trim()) {
      this.notificationService.show({
        type: 'error',
        title: 'Price Required',
        message: 'Please enter the expected valuation (e.g. ₹ 1.45 Cr).',
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
      this.notificationService.show({
        type: 'error',
        title: 'Image Required',
        message: 'Please upload at least one property photo or select a showcase cover.',
        icon: 'photo_camera'
      });
      return;
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

    const payload: any = {
      ...this.form,
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
