import {
  Component,
  ElementRef,
  Input,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  MADIPAKKAM_LAYOUT_AMENITIES,
  MADIPAKKAM_MASTERPLAN_PLOTS,
  MASTERPLAN_WORLD_WIDTH,
  MASTERPLAN_WORLD_HEIGHT,
  LayoutAmenityPin
} from '../../../core/services/madipakkam-masterplan-data';
import { SubdividedPlot } from '../../../core/models/subdivided-plot.model';

export interface GalleryPreset {
  id: string;
  title: string;
  image: string;
  caption: string;
  cameraPos: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
}

@Component({
  selector: 'app-plotex-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plotex-viewer.component.html',
  styleUrls: ['./plotex-viewer.component.css']
})
export class PlotexViewerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() propertyTitle: string = 'Madipakkam Prime Residential Plot';
  @Input() locality: string = 'Madipakkam, Chennai';
  @Input() set customPlots(plotsData: SubdividedPlot[] | undefined) {
    if (plotsData && plotsData.length > 0) {
      this.plots.set(plotsData);
    }
  }

  @ViewChild('webglContainer', { static: false }) webglContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('galleryTrack', { static: false }) galleryTrack!: ElementRef<HTMLDivElement>;

  // Master plots signal
  readonly plots = signal<SubdividedPlot[]>(MADIPAKKAM_MASTERPLAN_PLOTS);

  // Selected & Hovered Plot
  readonly selectedPlot = signal<SubdividedPlot | null>(null);
  readonly hoveredPlot = signal<SubdividedPlot | null>(null);
  readonly selectedAmenity = signal<LayoutAmenityPin | null>(null);

  // Active Phase Filter: 'all' | 'Phase 1' | 'Phase 2'
  readonly activePhase = signal<'all' | 'Phase 1' | 'Phase 2'>('all');

  // Status Filter: 'all' | 'available' | 'reserved' | 'sold'
  readonly activeStatusFilter = signal<'all' | 'available' | 'reserved' | 'sold'>('all');

  // Display Unit: 'sqft' | 'yds'
  readonly unitMode = signal<'sqft' | 'yds'>('sqft');

  // UI state
  readonly activeNavTab = signal<string>('Master Plan');
  readonly is2DMode = signal<boolean>(false);
  readonly isAutoRotating = signal<boolean>(false);
  readonly compassRotation = signal<number>(0);
  readonly isFullscreen = signal<boolean>(false);
  readonly toastMessage = signal<string>('');
  readonly isShortlisted = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  // 3D Pin screen coordinate for selected plot
  readonly selectedPinScreenX = signal<number>(-999);
  readonly selectedPinScreenY = signal<number>(-999);
  readonly isPinVisible = signal<boolean>(false);

  // Amenity pins list
  readonly layoutAmenities = signal<LayoutAmenityPin[]>(MADIPAKKAM_LAYOUT_AMENITIES);

  // Gallery presets with viewpoints
  readonly galleryItems = signal<GalleryPreset[]>([
    {
      id: 'overall',
      title: 'Full Masterplan',
      image: 'assets/master-plan.png',
      caption: 'Complete Township Overview (Phase 1 & Phase 2)',
      cameraPos: { x: 0, y: 26, z: 24 },
      cameraTarget: { x: 0, y: 0, z: 0 }
    },
    {
      id: 'phase1',
      title: 'Phase 1 Enclave',
      image: 'assets/gallery-road.jpg',
      caption: 'North-East Sector (Plots 1 to 290) with Grand Boulevard',
      cameraPos: { x: 5.5, y: 16, z: 12 },
      cameraTarget: { x: 5.5, y: 0, z: -4.5 }
    },
    {
      id: 'phase2',
      title: 'Phase 2 Enclave',
      image: 'assets/gallery-park.jpg',
      caption: 'South-West Sector (Plots 291 to 510) & Southern Lake Promenade',
      cameraPos: { x: -6.5, y: 16, z: 20 },
      cameraTarget: { x: -6.5, y: 0, z: 4.5 }
    },
    {
      id: 'entrance',
      title: 'Grand Entrance Gate',
      image: 'assets/gallery-entrance.jpg',
      caption: 'Double-Lane Security Archway & 24/7 RFID Boom Barrier',
      cameraPos: { x: 1.0, y: 8, z: -4 },
      cameraTarget: { x: 1.0, y: 0, z: -10.6 }
    },
    {
      id: 'clubhouse',
      title: 'Clubhouse Azure',
      image: 'assets/gallery-clubhouse.jpg',
      caption: '15,000 sq.ft Residents Club & Infinity Edge Pool',
      cameraPos: { x: 9.0, y: 9, z: -1 },
      cameraTarget: { x: 8.5, y: 0, z: -4.8 }
    },
    {
      id: 'plot14',
      title: 'Plot 14 (Featured)',
      image: 'assets/gallery-plot.jpg',
      caption: 'Madipakkam Prime 1,850 sq.ft North-East Villa Plot',
      cameraPos: { x: -0.1, y: 7, z: -4.5 },
      cameraTarget: { x: -0.1, y: 0, z: -8.4 }
    }
  ]);
  readonly activeGalleryId = signal<string>('overall');

  // Stats Counters
  readonly availableCount = computed(() => this.plots().filter(p => p.status === 'available').length);
  readonly bookedCount = computed(() => this.plots().filter(p => p.status === 'reserved').length);
  readonly soldCount = computed(() => this.plots().filter(p => p.status === 'sold').length);

  // Three.js Core
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private animationFrameId?: number;
  private resizeObserver?: ResizeObserver;

  // Scene Meshes & Groups
  private mapGroup = new THREE.Group();
  private plotMeshList: THREE.Mesh[] = [];
  private plotMeshMap = new Map<number, THREE.Mesh>();
  private activeHighlightBox?: THREE.LineSegments;
  private hoveredPlotMesh?: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  // Camera Animation Tween
  private isCameraTransitioning = false;
  private camStartPos = new THREE.Vector3();
  private camTargetPos = new THREE.Vector3();
  private lookStartPos = new THREE.Vector3();
  private lookTargetPos = new THREE.Vector3();
  private transitionStartTime = 0;
  private transitionDuration = 800; // ms

  // Reset North Animation
  private isResettingNorth = false;
  private resetNorthStartTime = 0;
  private resetNorthStartPos = new THREE.Vector3();
  private resetNorthTargetPos = new THREE.Vector3();

  private toastTimeout?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    const heroPlot = this.plots().find(p => p.plotNo === '14') ||
                     this.plots().find(p => p.plotNo === '124') ||
                     this.plots()[0];
    if (heroPlot) {
      this.selectedPlot.set(heroPlot);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initThreeJs();
    }, 60);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.controls) {
      this.controls.dispose();
    }
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  private initThreeJs(): void {
    const container = this.webglContainer.nativeElement;
    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 780;

    // 1. Scene with clean modern architectural background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#101D24');

    // 2. Camera: Bird's-eye architectural perspective
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    this.camera.position.set(0, 26, 24);

    // 3. High-Performance Renderer with tone mapping
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = 6;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI * 0.48; // Prevent going beneath ground
    this.controls.minPolarAngle = 0.05;

    // 5. Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 1.8);
    this.scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xfff8e7, 1.6);
    sun.position.set(-15, 30, 20);
    this.scene.add(sun);

    const softFill = new THREE.DirectionalLight(0xdbeafe, 0.8);
    softFill.position.set(15, 20, -15);
    this.scene.add(softFill);

    // 6. Floor Ambient Ground Plane
    const floorGeo = new THREE.PlaneGeometry(160, 160);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0A1318,
      roughness: 0.98,
      metalness: 0.02
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.7;
    this.scene.add(floor);

    this.scene.add(this.mapGroup);

    // 7. Load Real Masterplan Texture on 3D Diorama Plinth
    this.loadRealMasterplanTexture();

    // 8. Event Listeners for Raycasting
    const dom = this.renderer.domElement;
    dom.addEventListener('pointermove', (e) => this.onPointerMove(e));
    dom.addEventListener('click', (e) => this.onPointerClick(e));

    // 9. Resize Observer
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(container);

    // 10. Start Animation Loop
    this.animate();

    // If an initial plot is selected, trigger its highlight box
    const initPlot = this.selectedPlot();
    if (initPlot) {
      setTimeout(() => {
        this.selectPlot(initPlot, false);
      }, 300);
    }
  }

  // =========================================================================
  // LOAD REAL MASTERPLAN TEXTURE ON THREE.JS 3D PLINTH
  // =========================================================================
  private loadRealMasterplanTexture(): void {
    const loader = new THREE.TextureLoader();
    const base = (typeof document !== 'undefined' && document.baseURI) ? document.baseURI : (typeof window !== 'undefined' ? window.location.origin + '/' : '/');
    const imgUrl = new URL('assets/master-plan.png', base).href;

    loader.load(
      imgUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        if (this.renderer) {
          texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        }

        const width = MASTERPLAN_WORLD_WIDTH;
        const height = MASTERPLAN_WORLD_HEIGHT;

        // A. 3D Architectural Exhibition Plinth (Beveled Gallery Display Slab)
        const plinthGeo = new THREE.BoxGeometry(width + 0.8, 0.5, height + 0.8);
        const plinthMat = new THREE.MeshStandardMaterial({
          color: 0x1E2D36,
          roughness: 0.8,
          metalness: 0.15
        });
        const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
        plinthMesh.position.set(0, -0.26, 0);
        this.mapGroup.add(plinthMesh);

        // Plinth Border Highlight Edge
        const plinthEdge = new THREE.LineSegments(
          new THREE.EdgesGeometry(plinthGeo),
          new THREE.LineBasicMaterial({ color: 0x334B59, linewidth: 1.5 })
        );
        plinthMesh.add(plinthEdge);

        // B. Masterplan Image Plane (Pure faithful color rendering)
        const planeGeo = new THREE.PlaneGeometry(width, height);
        const planeMat = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide
        });
        const planeMesh = new THREE.Mesh(planeGeo, planeMat);
        planeMesh.rotation.x = -Math.PI / 2;
        planeMesh.position.y = 0.005; // Resting smoothly on plinth
        this.mapGroup.add(planeMesh);

        // C. Build 3D Interactive Plot Boundary Meshes
        this.buildAll3DPlots();

        // D. Build 3D Landmark & Amenity Pins
        this.buildAmenityPins();

        this.showToast('Masterplan 3D Explorer loaded successfully');
      },
      undefined,
      (err) => {
        console.error('Master plan texture load error, trying fallback:', err);
        const fallbackUrl = new URL('assets/madipakkam-masterplan.png', base).href;
        loader.load(fallbackUrl, (fallbackTex) => {
          fallbackTex.colorSpace = THREE.SRGBColorSpace;
          const planeGeo = new THREE.PlaneGeometry(MASTERPLAN_WORLD_WIDTH, MASTERPLAN_WORLD_HEIGHT);
          const planeMat = new THREE.MeshBasicMaterial({ map: fallbackTex, side: THREE.DoubleSide });
          const planeMesh = new THREE.Mesh(planeGeo, planeMat);
          planeMesh.rotation.x = -Math.PI / 2;
          this.mapGroup.add(planeMesh);
          this.buildAll3DPlots();
        });
      }
    );
  }

  // =========================================================================
  // BUILD INTERACTIVE 3D PLOT BOUNDARY TILES OVER THE MASTERPLAN
  // =========================================================================
  private buildAll3DPlots(): void {
    this.plotMeshList = [];
    this.plotMeshMap.clear();

    const plots = this.plots();

    plots.forEach((plot) => {
      const w = plot.w || 0.85;
      const h = plot.h || 0.65;
      const wx = plot.worldX ?? ((plot.u || 0.5) - 0.5) * MASTERPLAN_WORLD_WIDTH;
      const wz = plot.worldZ ?? ((plot.v || 0.5) - 0.5) * MASTERPLAN_WORLD_HEIGHT;

      // Color code based on status
      let hexColor = 0x5E8F72; // Available (Emerald Green)
      if (plot.status === 'sold') {
        hexColor = 0xC76F56; // Sold (Terracotta Red)
      } else if (plot.status === 'reserved') {
        hexColor = 0xD5B357; // Booked (Amber Gold)
      }

      const geo = new THREE.BoxGeometry(w, 0.08, h);
      const mat = new THREE.MeshStandardMaterial({
        color: hexColor,
        roughness: 0.4,
        metalness: 0.1,
        transparent: true,
        opacity: 0.38
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(wx, 0.04, wz);

      // Clean white boundary outline
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({
          color: 0xFFFFFF,
          transparent: true,
          opacity: 0.65
        })
      );
      mesh.add(edges);

      mesh.userData = {
        plot,
        baseColor: hexColor,
        baseY: 0.04,
        baseOpacity: 0.38
      };

      this.mapGroup.add(mesh);
      this.plotMeshList.push(mesh);
      this.plotMeshMap.set(plot.id, mesh);
    });

    this.applyFiltersToMeshes();
  }

  // =========================================================================
  // BUILD 3D AMENITY PINS MATCHING MASTERPLAN YELLOW NUMBERED BADGES
  // =========================================================================
  private buildAmenityPins(): void {
    const amenities = this.layoutAmenities();

    amenities.forEach((amenity) => {
      const pinGroup = new THREE.Group();
      pinGroup.position.set(amenity.x, 0.06, amenity.z);

      // Yellow Circular Base Disc
      const discGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 24);
      const discMat = new THREE.MeshStandardMaterial({
        color: 0xFACC15,
        roughness: 0.3,
        metalness: 0.2
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      pinGroup.add(disc);

      // Dark Outer Rim
      const rimGeo = new THREE.TorusGeometry(0.35, 0.04, 8, 24);
      const rimMat = new THREE.MeshBasicMaterial({ color: 0x0F172A });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.x = Math.PI / 2;
      pinGroup.add(rim);

      // Vertical Marker Needle
      const needleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
      const needleMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.5 });
      const needle = new THREE.Mesh(needleGeo, needleMat);
      needle.position.y = 0.2;
      pinGroup.add(needle);

      // Spherical Pin Head
      const sphereGeo = new THREE.SphereGeometry(0.14, 12, 12);
      const sphereMat = new THREE.MeshStandardMaterial({ color: 0xEF4444, roughness: 0.3 });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.y = 0.42;
      pinGroup.add(sphere);

      pinGroup.userData = { amenity };
      this.mapGroup.add(pinGroup);
    });
  }

  // =========================================================================
  // POINTER INTERACTIONS & SELECTION
  // =========================================================================
  private onPointerMove(e: MouseEvent): void {
    if (!this.renderer || !this.camera) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.plotMeshList, false);

    if (intersects.length > 0) {
      const topMesh = intersects[0].object as THREE.Mesh;
      if (this.hoveredPlotMesh !== topMesh) {
        this.resetHoveredMesh();

        this.hoveredPlotMesh = topMesh;
        const data = topMesh.userData as Record<string, unknown>;
        if (data && topMesh !== this.getMeshForPlot(this.selectedPlot())) {
          (topMesh.material as THREE.MeshStandardMaterial).opacity = 0.75;
          topMesh.position.y = ((data['baseY'] as number) || 0.04) + 0.12;
        }
        this.hoveredPlot.set((data?.['plot'] as SubdividedPlot) || null);
        this.renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      if (this.hoveredPlotMesh) {
        this.resetHoveredMesh();
        this.hoveredPlot.set(null);
        this.renderer.domElement.style.cursor = 'grab';
      }
    }
  }

  private resetHoveredMesh(): void {
    if (this.hoveredPlotMesh) {
      const data = this.hoveredPlotMesh.userData as Record<string, unknown>;
      if (data && this.hoveredPlotMesh !== this.getMeshForPlot(this.selectedPlot())) {
        (this.hoveredPlotMesh.material as THREE.MeshStandardMaterial).opacity =
          (data['baseOpacity'] as number) || 0.38;
        this.hoveredPlotMesh.position.y = (data['baseY'] as number) || 0.04;
      }
      this.hoveredPlotMesh = undefined;
    }
  }

  private onPointerClick(e: MouseEvent): void {
    if (!this.renderer || !this.camera) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.plotMeshList, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const plot = hitMesh.userData?.['plot'] as SubdividedPlot;
      if (plot) {
        this.selectPlot(plot, true);
      }
    }
  }

  selectPlot(plot: SubdividedPlot, animateCamera = true): void {
    this.selectedPlot.set(plot);
    this.selectedAmenity.set(null);
    this.searchQuery.set(plot.plotNo);

    // Update active highlight frame in 3D
    const mesh = this.getMeshForPlot(plot);
    if (mesh) {
      this.highlightPlotMesh(mesh);

      if (animateCamera) {
        const targetX = mesh.position.x;
        const targetZ = mesh.position.z;
        const camY = this.is2DMode() ? 18 : 12;
        const camZ = this.is2DMode() ? targetZ + 0.01 : targetZ + 10;
        this.smoothTransitionCamera(
          new THREE.Vector3(targetX, camY, camZ),
          new THREE.Vector3(targetX, 0, targetZ)
        );
      }
    }

    this.showToast(`Selected Plot ${plot.plotNo} (${plot.phase || 'Master Community'})`);
  }

  private highlightPlotMesh(mesh: THREE.Mesh): void {
    if (this.activeHighlightBox && this.activeHighlightBox.parent) {
      this.activeHighlightBox.parent.remove(this.activeHighlightBox);
      this.activeHighlightBox = undefined;
    }

    // Reset all plot elevations to base
    this.plotMeshList.forEach((m) => {
      const data = m.userData as Record<string, unknown>;
      if (data) {
        m.position.y = (data['baseY'] as number) || 0.04;
        (m.material as THREE.MeshStandardMaterial).opacity =
          (data['baseOpacity'] as number) || 0.38;
      }
    });

    // Elevate selected mesh
    mesh.position.y = 0.22;
    (mesh.material as THREE.MeshStandardMaterial).opacity = 0.92;

    // Golden glowing bounding box around selected plot
    const geo = mesh.geometry;
    const highlightEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({
        color: 0xF59E0B,
        linewidth: 3
      })
    );
    highlightEdges.position.set(0, 0, 0);
    mesh.add(highlightEdges);
    this.activeHighlightBox = highlightEdges;
  }

  private getMeshForPlot(plot: SubdividedPlot | null): THREE.Mesh | undefined {
    if (!plot) return undefined;
    return this.plotMeshMap.get(plot.id);
  }

  closeDetails(): void {
    this.selectedPlot.set(null);
    if (this.activeHighlightBox && this.activeHighlightBox.parent) {
      this.activeHighlightBox.parent.remove(this.activeHighlightBox);
      this.activeHighlightBox = undefined;
    }
    this.plotMeshList.forEach((m) => {
      const data = m.userData as Record<string, unknown>;
      if (data) {
        m.position.y = (data['baseY'] as number) || 0.04;
        (m.material as THREE.MeshStandardMaterial).opacity =
          (data['baseOpacity'] as number) || 0.38;
      }
    });
  }

  // =========================================================================
  // SEARCH PLOT BY ID
  // =========================================================================
  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  searchPlot(): void {
    const query = this.searchQuery().trim().toLowerCase().replace('plot', '').trim();
    if (!query) return;

    const found = this.plots().find(
      (p) => p.plotNo.toLowerCase() === query || String(p.id) === query
    );

    if (found) {
      this.selectPlot(found, true);
    } else {
      this.showToast(`Plot ${this.searchQuery()} not found in masterplan directory`);
    }
  }

  // =========================================================================
  // PHASE & STATUS FILTERS
  // =========================================================================
  setPhase(phase: 'all' | 'Phase 1' | 'Phase 2'): void {
    this.activePhase.set(phase);
    this.applyFiltersToMeshes();

    if (phase === 'Phase 1') {
      this.smoothTransitionCamera(
        new THREE.Vector3(5.5, 17, 13),
        new THREE.Vector3(5.5, 0, -4.5)
      );
      this.showToast('Focusing on Phase 1 (North-East Enclave)');
    } else if (phase === 'Phase 2') {
      this.smoothTransitionCamera(
        new THREE.Vector3(-6.5, 17, 21),
        new THREE.Vector3(-6.5, 0, 4.5)
      );
      this.showToast('Focusing on Phase 2 (South-West Enclave)');
    } else {
      this.recenter();
    }
  }

  setStatusFilter(status: 'all' | 'available' | 'reserved' | 'sold'): void {
    this.activeStatusFilter.set(status);
    this.applyFiltersToMeshes();
  }

  private applyFiltersToMeshes(): void {
    const phase = this.activePhase();
    const status = this.activeStatusFilter();

    this.plotMeshList.forEach((m) => {
      const data = m.userData as Record<string, unknown>;
      const plot = data?.['plot'] as SubdividedPlot;
      if (!plot) return;

      const phaseMatch = phase === 'all' || plot.phase === phase;
      const statusMatch = status === 'all' || plot.status === status;

      const mat = m.material as THREE.MeshStandardMaterial;

      if (phaseMatch && statusMatch) {
        mat.opacity = (data['baseOpacity'] as number) || 0.38;
        m.visible = true;
      } else {
        mat.opacity = 0.08; // Dim out
        m.visible = true;
      }
    });
  }

  // =========================================================================
  // VIEW MODE TOGGLES (2D / 3D, ROTATE, RECENTER, FULLSCREEN)
  // =========================================================================
  toggle2DMode(): void {
    this.is2DMode.update((v) => !v);
    if (this.is2DMode()) {
      if (this.controls) {
        this.controls.maxPolarAngle = 0.01;
      }
      this.smoothTransitionCamera(
        new THREE.Vector3(0.001, 32, 0),
        new THREE.Vector3(0, 0, 0)
      );
      this.showToast('2D Top-Down Aerial View');
    } else {
      if (this.controls) {
        this.controls.maxPolarAngle = Math.PI * 0.48;
      }
      this.smoothTransitionCamera(
        new THREE.Vector3(0, 26, 24),
        new THREE.Vector3(0, 0, 0)
      );
      this.showToast('3D Perspective Orbit View');
    }
  }

  recenter(): void {
    this.activePhase.set('all');
    this.applyFiltersToMeshes();
    if (this.is2DMode()) {
      this.smoothTransitionCamera(
        new THREE.Vector3(0.001, 32, 0),
        new THREE.Vector3(0, 0, 0)
      );
    } else {
      this.smoothTransitionCamera(
        new THREE.Vector3(0, 26, 24),
        new THREE.Vector3(0, 0, 0)
      );
    }
    this.showToast('Camera recentered to full masterplan');
  }

  resetNorth(): void {
    if (!this.camera || !this.controls) return;
    const rad = Math.hypot(this.camera.position.x, this.camera.position.z);
    const targetY = this.camera.position.y;

    this.resetNorthStartPos.copy(this.camera.position);
    this.resetNorthTargetPos.set(0.001, targetY, rad);
    this.resetNorthStartTime = performance.now();
    this.isResettingNorth = true;
    this.controls.target.set(0, 0, 0);
    this.showToast('Oriented to True North');
  }

  zoomIn(): void {
    if (!this.camera || !this.controls) return;
    this.camera.position.multiplyScalar(0.82);
    this.controls.update();
  }

  zoomOut(): void {
    if (!this.camera || !this.controls) return;
    this.camera.position.multiplyScalar(1.22);
    this.controls.update();
  }

  toggleAutoRotate(): void {
    this.isAutoRotating.update((r) => !r);
    if (this.controls) {
      this.controls.autoRotate = this.isAutoRotating();
      this.controls.autoRotateSpeed = 1.0;
    }
    this.showToast(this.isAutoRotating() ? '360° Cinema Tour Started' : 'Tour Paused');
  }

  toggleFullscreen(): void {
    this.isFullscreen.update((f) => !f);
    setTimeout(() => {
      this.onResize();
    }, 100);
  }

  toggleUnit(): void {
    this.unitMode.update((u) => (u === 'sqft' ? 'yds' : 'sqft'));
  }

  toggleShortlist(): void {
    this.isShortlisted.update((s) => !s);
    this.showToast(
      this.isShortlisted()
        ? `Added Plot ${this.selectedPlot()?.plotNo} to Shortlist`
        : `Removed from Shortlist`
    );
  }

  sharePlot(): void {
    const plot = this.selectedPlot();
    if (!plot) return;
    const url = `${window.location.origin}${window.location.pathname}#plot=${plot.plotNo}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.showToast(`Direct link copied for Plot ${plot.plotNo}`);
      });
    } else {
      this.showToast(`Share URL: ${url}`);
    }
  }

  getWhatsAppLink(plot: SubdividedPlot): string {
    const area = this.unitMode() === 'sqft' ? `${plot.superBuiltUpSqft} Sq.Ft` : `${plot.superBuiltUpYds} Yds`;
    const msg = encodeURIComponent(
      `Hello Find a Plot Realty, I am viewing the 3D Master Community map for ${this.propertyTitle} and interested in ${plot.phase || ''} Plot No. ${plot.plotNo} (${area}, ${plot.facing}, Price: ${plot.formattedPrice}). Please share cadastral factsheet and schedule site inspection.`
    );
    return `https://wa.me/919444100000?text=${msg}`;
  }

  // =========================================================================
  // GALLERY CAROUSEL SELECTOR
  // =========================================================================
  selectGalleryItem(item: GalleryPreset): void {
    this.activeGalleryId.set(item.id);

    if (item.id === 'plot14') {
      const p14 = this.plots().find((p) => p.plotNo === '14');
      if (p14) this.selectPlot(p14, false);
    } else if (item.id === 'phase1') {
      this.setPhase('Phase 1');
      return;
    } else if (item.id === 'phase2') {
      this.setPhase('Phase 2');
      return;
    }

    this.smoothTransitionCamera(
      new THREE.Vector3(item.cameraPos.x, item.cameraPos.y, item.cameraPos.z),
      new THREE.Vector3(item.cameraTarget.x, item.cameraTarget.y, item.cameraTarget.z)
    );
    this.showToast(item.title);
  }

  scrollGallery(direction: 'left' | 'right'): void {
    if (!this.galleryTrack) return;
    const el = this.galleryTrack.nativeElement;
    const offset = direction === 'left' ? -220 : 220;
    el.scrollBy({ left: offset, behavior: 'smooth' });
  }

  // =========================================================================
  // CAMERA SMOOTH TRANSITION
  // =========================================================================
  private smoothTransitionCamera(targetPos: THREE.Vector3, targetLook: THREE.Vector3): void {
    if (!this.camera || !this.controls) return;
    this.camStartPos.copy(this.camera.position);
    this.camTargetPos.copy(targetPos);
    this.lookStartPos.copy(this.controls.target);
    this.lookTargetPos.copy(targetLook);
    this.transitionStartTime = performance.now();
    this.isCameraTransitioning = true;
  }

  // =========================================================================
  // TOAST NOTIFICATIONS
  // =========================================================================
  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set('');
    }, 2800);
  }

  private onResize(): void {
    if (!this.renderer || !this.camera || !this.webglContainer) return;
    const container = this.webglContainer.nativeElement;
    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 780;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // =========================================================================
  // ANIMATION LOOP
  // =========================================================================
  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Camera tween interpolation
    if (this.isCameraTransitioning && this.camera && this.controls) {
      const elapsed = performance.now() - this.transitionStartTime;
      const progress = Math.min(elapsed / this.transitionDuration, 1.0);
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease out

      this.camera.position.lerpVectors(this.camStartPos, this.camTargetPos, ease);
      this.controls.target.lerpVectors(this.lookStartPos, this.lookTargetPos, ease);

      if (progress >= 1.0) {
        this.isCameraTransitioning = false;
      }
    }

    // Reset North lerp
    if (this.isResettingNorth && this.camera && this.controls) {
      const elapsed = performance.now() - this.resetNorthStartTime;
      const progress = Math.min(elapsed / 500, 1.0);
      const ease = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(this.resetNorthStartPos, this.resetNorthTargetPos, ease);
      this.controls.target.set(0, 0, 0);

      if (progress >= 1.0) {
        this.isResettingNorth = false;
      }
    }

    // Update Controls
    if (this.controls) {
      this.controls.update();

      // Update Compass dial angle in real-time
      const azimuth = this.controls.getAzimuthalAngle();
      this.compassRotation.set(-azimuth * (180 / Math.PI));
    }

    // Project 3D Pin screen coordinates for selected plot
    this.updateScreenPinPosition();

    // Render Scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private updateScreenPinPosition(): void {
    const sel = this.selectedPlot();
    const mesh = this.getMeshForPlot(sel);
    if (!mesh || !this.camera || !this.webglContainer) {
      this.isPinVisible.set(false);
      return;
    }

    const pos = new THREE.Vector3();
    mesh.getWorldPosition(pos);
    pos.y += 0.45; // Above plot

    pos.project(this.camera);

    const container = this.webglContainer.nativeElement;
    const halfW = container.clientWidth / 2;
    const halfH = container.clientHeight / 2;

    const screenX = pos.x * halfW + halfW;
    const screenY = -(pos.y * halfH) + halfH;

    // Check if behind camera
    if (pos.z > 1.0 || screenX < 0 || screenX > container.clientWidth || screenY < 0 || screenY > container.clientHeight) {
      this.isPinVisible.set(false);
    } else {
      this.selectedPinScreenX.set(Math.round(screenX));
      this.selectedPinScreenY.set(Math.round(screenY));
      this.isPinVisible.set(true);
    }
  }
}
