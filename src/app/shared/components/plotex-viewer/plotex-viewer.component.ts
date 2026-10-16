import { 
  Component, 
  ElementRef, 
  Input, 
  OnInit, 
  AfterViewInit, 
  OnDestroy, 
  ViewChild, 
  signal, 
  computed, 
  HostListener 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SubdividedPlot } from '../../../core/models/subdivided-plot.model';
import { REALISTIC_TREE_CROWN, REALISTIC_PALM_FROND } from './foliage-assets';

interface PlotMeshUserData {
  plot: SubdividedPlot;
  baseColor: number;
  highlightColor: number;
  baseY: number;
}

@Component({
  selector: 'app-plotex-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plotex-viewer.component.html',
  styleUrls: ['./plotex-viewer.component.css']
})
export class PlotexViewerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() propertyTitle: string = 'Greenfield Enclave';
  @Input() locality: string = 'Nandambakkam, Chennai';

  @Input() set customPlots(data: SubdividedPlot[] | undefined) {
    if (data && data.length > 0) {
      this.plots.set(data);
      const defaultPlot = data.find(p => p.status === 'available') || data[0];
      if (defaultPlot) {
        this.selectedPlot.set(defaultPlot);
      }
      if (this.scene) {
        this.rebuildPlotMeshes();
      }
    }
  }

  @ViewChild('webglContainer', { static: false }) webglContainer!: ElementRef<HTMLDivElement>;

  // Controls & States
  readonly unitMode = signal<'yds' | 'sqft'>('yds');
  readonly isAutoRotating = signal<boolean>(false);
  readonly currentCameraView = signal<'drone' | 'top' | 'eye'>('drone');
  readonly activeFilter = signal<'all' | 'available' | 'sold'>('all');
  readonly compassAngle = signal<number>(0); // Dynamic compass needle heading angle

  // Master 8 Partitioned Plots Data
  readonly plots = signal<SubdividedPlot[]>([
    // Row 1 (North of 9M Road - South Facing towards Avenue)
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
      hasTrees: true,
      x: 12,
      y: -15,
      w: 13,
      h: 11
    },
    {
      id: 222,
      plotNo: '222',
      status: 'sold',
      superBuiltUpYds: 180.00,
      netPlotAreaYds: 124.00,
      superBuiltUpSqft: 1620,
      widthMeters: 12.80,
      lengthMeters: 7.80,
      widthFeet: 42.0,
      lengthFeet: 25.6,
      facing: 'South Facing (Corner)',
      priceInLakhs: 46.5,
      formattedPrice: '₹46.50 L',
      isCorner: true,
      hasTrees: false,
      x: 28,
      y: -15,
      w: 13,
      h: 11
    },

    // Row 2 (South of 9M Road - North Facing towards Avenue)
    {
      id: 249,
      plotNo: '249',
      status: 'available',
      superBuiltUpYds: 154.20,
      netPlotAreaYds: 104.50,
      superBuiltUpSqft: 1388,
      widthMeters: 11.45,
      lengthMeters: 7.59,
      widthFeet: 37.5,
      lengthFeet: 24.9,
      facing: 'North Facing (Corner)',
      priceInLakhs: 39.5,
      formattedPrice: '₹39.50 L',
      isCorner: true,
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

  readonly selectedPlot = signal<SubdividedPlot | null>(null);
  readonly availableCount = computed(() => this.plots().filter(p => p.status === 'available').length);
  readonly soldCount = computed(() => this.plots().filter(p => p.status === 'sold').length);

  // Three.js Core Objects
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private animationFrameId!: number;
  private plotMeshes: THREE.Mesh[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private pointerDownPos = { x: 0, y: 0 };
  private activePlotMesh: THREE.Mesh | null = null;
  private selectionBoxHelper: THREE.BoxHelper | null = null;

  // Smooth Compass Realignment
  private isResettingNorth = false;
  private resetNorthStartTime = 0;
  private resetNorthStartPos = new THREE.Vector3();
  private resetNorthEndPos = new THREE.Vector3();
  private readonly RESET_NORTH_DURATION = 350;

  ngOnInit(): void {
    const defaultPlot = this.plots().find(p => p.plotNo === '246');
    if (defaultPlot) {
      this.selectedPlot.set(defaultPlot);
    }
  }

  ngAfterViewInit(): void {
    this.initThreeScene();
    this.animate();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.renderer?.dispose();
    this.controls?.dispose();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (!this.webglContainer?.nativeElement || !this.renderer || !this.camera) return;
    const width = this.webglContainer.nativeElement.clientWidth;
    const height = this.webglContainer.nativeElement.clientHeight || 520;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private initThreeScene(): void {
    const container = this.webglContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight || 520;

    // 1. Scene with Architectural Daylight Sky (NO FOG - view never fades out)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdcebf7);
    // Explicitly no fog so the 3D model is crystal clear at any distance or angle

    // 2. Camera (Plotex-style 3D Isometric / Drone Angle)
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    this.setCameraPreset('drone');

    // 3. Renderer with Soft Shadows & Tone Mapping
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls (Smooth inertia rotation, zoom & pan like Plotex)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04; // Prevent camera going underground
    this.controls.minDistance = 12;
    this.controls.maxDistance = 160;
    this.controls.target.set(0, 0, 0);

    // 5. Lighting: Crisp Architectural Daylight Sunlight + Clear Ambient
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffdf5, 2.2);
    sunLight.position.set(50, 75, 40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 250;
    sunLight.shadow.camera.left = -70;
    sunLight.shadow.camera.right = 70;
    sunLight.shadow.camera.top = 70;
    sunLight.shadow.camera.bottom = -70;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    // Soft sky blue fill light from opposite angle
    const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.5);
    fillLight.position.set(-40, 40, -40);
    this.scene.add(fillLight);

    // 6. Build the Site (Ground, Roads, Curbs, Plots, Trees, Streetlights)
    this.buildSiteLayout();

    // 7. Raycasting Events for Plot Clicking
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      if (dist < 6) { // It's a click, not a camera drag
        this.onCanvasClick(e);
      }
    });

    // Select default plot in 3D
    const defaultPlot = this.plots().find(p => p.plotNo === '246');
    if (defaultPlot) {
      setTimeout(() => this.highlightPlotIn3D(defaultPlot), 200);
    }
  }

  private buildSiteLayout(): void {
    // A. Main Grass Terrain Base (Expansive - Never cuts off or fades)
    const groundGeo = new THREE.PlaneGeometry(360, 300);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x487545,
      roughness: 0.88,
      metalness: 0.02
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Distant Outer Landscape extending to horizon
    const outerGroundGeo = new THREE.PlaneGeometry(900, 800);
    const outerGroundMat = new THREE.MeshStandardMaterial({
      color: 0x3d633b,
      roughness: 0.95
    });
    const outerGround = new THREE.Mesh(outerGroundGeo, outerGroundMat);
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.08;
    outerGround.receiveShadow = true;
    this.scene.add(outerGround);

    // Boundary Hedge Border
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x1f3d20, roughness: 0.8 });
    const topHedge = new THREE.Mesh(new THREE.BoxGeometry(116, 1.2, 2), borderMat);
    topHedge.position.set(0, 0.6, -38);
    topHedge.castShadow = true;
    this.scene.add(topHedge);

    const bottomHedge = new THREE.Mesh(new THREE.BoxGeometry(116, 1.2, 2), borderMat);
    bottomHedge.position.set(0, 0.6, 38);
    bottomHedge.castShadow = true;
    this.scene.add(bottomHedge);

    // B. Main 9-Meter Road (East-West Highway)
    const roadWidth = 9;
    const roadLength = 110;
    const roadGeo = new THREE.PlaneGeometry(roadLength, roadWidth);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x22272e,
      roughness: 0.85,
      metalness: 0.1
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, 0);
    road.receiveShadow = true;
    this.scene.add(road);

    // Dashed Centerline Markings
    const dashCount = 20;
    const dashGeo = new THREE.PlaneGeometry(2.4, 0.25);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < dashCount; i++) {
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(-50 + i * 5.2, 0.02, 0);
      this.scene.add(dash);
    }

    // Concrete Sidewalk Curbs along 9M Road
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.7 });
    const northCurb = new THREE.Mesh(new THREE.BoxGeometry(roadLength, 0.25, 0.8), curbMat);
    northCurb.position.set(0, 0.12, -(roadWidth / 2 + 0.4));
    northCurb.castShadow = true;
    northCurb.receiveShadow = true;
    this.scene.add(northCurb);

    const southCurb = new THREE.Mesh(new THREE.BoxGeometry(roadLength, 0.25, 0.8), curbMat);
    southCurb.position.set(0, 0.12, (roadWidth / 2 + 0.4));
    southCurb.castShadow = true;
    southCurb.receiveShadow = true;
    this.scene.add(southCurb);

    // Connecting 7.5M Access Road (North-South Cross Street)
    const crossRoad = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 76), roadMat);
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.set(0, 0.01, 0);
    crossRoad.receiveShadow = true;
    this.scene.add(crossRoad);

    // C. Extruded 3D Subdivided Plots
    this.buildPlotMeshes();

    // D. Real Photorealistic 3D Trees
    this.build3DTrees();

    // E. Modern Scale Vehicles on 9M Road
    this.buildScaleVehicles();

    // F. Street Lighting Poles with Ambient Lights
    this.buildStreetLights();
  }

  rebuildPlotMeshes(): void {
    if (!this.scene) return;
    this.plotMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    this.plotMeshes = [];
    if (this.selectionBoxHelper) {
      this.scene.remove(this.selectionBoxHelper);
      this.selectionBoxHelper.dispose();
      this.selectionBoxHelper = null;
    }
    this.buildPlotMeshes();
  }

  private buildPlotMeshes(): void {
    // Exact 3D Cadastral Coordinates by Plot Number
    // The central avenue is 9 meters wide at Z = 0 (Z in [-4.5, 4.5], curbs at Z = +/- 4.9).
    // The cross street is 7.5 meters wide at X = 0 (X in [-3.75, 3.75]).
    // Row 1 (North of 9M road, South-facing towards avenue): Z = -15
    // Row 2 (South of 9M road, North-facing towards avenue): Z = +15
    const presetPositions: Record<string, { x: number; z: number }> = {
      // Row 1 (North side of 9m road)
      '248': { x: -28, z: -15 },
      '247': { x: -12, z: -15 },
      '221': { x: 12, z: -15 },
      '222': { x: 28, z: -15 },
      // Row 2 (South side of 9m road)
      '249': { x: -28, z: 15 },
      '246': { x: -12, z: 15 },
      '245': { x: 12, z: 15 },
      '250': { x: 28, z: 15 }
    };

    const plotList = this.plots();
    const count = plotList.length;

    plotList.forEach((plot, index) => {
      const isAvailable = plot.status === 'available';
      const isReserved = plot.status === 'reserved';
      const baseColor = isAvailable ? 0x22c55e : (isReserved ? 0xf59e0b : 0xef4444); // Green vs Amber vs Red
      const highlightColor = 0xfacc15; // Golden yellow

      // 3D Extruded Slab
      const plotWidth = plot.w ? Math.max(8, Math.min(plot.w, 24)) : 13;
      const plotDepth = plot.h ? Math.max(8, Math.min(plot.h, 24)) : 11;
      const plotHeight = 0.4;

      const geometry = new THREE.BoxGeometry(plotWidth, plotHeight, plotDepth);
      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.45,
        metalness: 0.1
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Clean plot number (e.g. "Plot 248" -> "248", "248" -> "248")
      const cleanNum = (plot.plotNo || '').replace(/\D/g, '');
      const preset = presetPositions[cleanNum] || presetPositions[String(plot.id)] || presetPositions[plot.plotNo];

      let posX: number;
      let posZ: number;

      if (preset) {
        posX = preset.x;
        posZ = preset.z;
      } else {
        const facingLower = (plot.facing || '').toLowerCase();
        const isSouthFacing = facingLower.includes('south');
        const isNorthFacing = facingLower.includes('north');

        // Determine safe Z: Plots must NEVER sit on the 9M avenue (Z in [-9, 9])
        if (plot.y !== undefined && Math.abs(plot.y) >= 9) {
          posZ = plot.y;
        } else if (isSouthFacing) {
          posZ = -15; // North of road, facing South
        } else if (isNorthFacing) {
          posZ = 15;  // South of road, facing North
        } else {
          posZ = index < Math.ceil(count / 2) ? -15 : 15;
        }

        // Determine X coordinate: flank cross street (X in [-3.75, 3.75])
        if (plot.x !== undefined && Math.abs(plot.x) >= 6 && Math.abs(plot.x) <= 45) {
          posX = plot.x;
        } else {
          const half = Math.max(1, Math.ceil(count / 2));
          const col = posZ < 0 ? (index % half) : ((index - half) % half);
          const xSlots = [-28, -12, 12, 28];
          posX = xSlots[Math.abs(col) % xSlots.length] ?? (col * 16 - 24);
        }
      }

      // CRITICAL ROAD CLEARANCE FAIL-SAFE:
      // Under no circumstance may any plot slab touch the road corridor (Z in [-9, 9])
      if (Math.abs(posZ) < 9) {
        const isSouth = (plot.facing || '').toLowerCase().includes('south');
        posZ = isSouth ? -15 : 15;
      }
      // Cross street clearance fail-safe (X in [-3.75, 3.75])
      if (Math.abs(posX) < 5) {
        posX = posX < 0 ? -12 : 12;
      }

      const posY = plotHeight / 2;

      mesh.position.set(posX, posY, posZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Store plot data in mesh userData for raycaster detection
      mesh.userData = {
        plot,
        baseColor,
        highlightColor,
        baseY: posY
      } as PlotMeshUserData;

      // Add 3D Plot Number Text Plate
      const labelCanvas = this.createPlotNumberCanvas(plot.plotNo, isAvailable);
      const labelTex = new THREE.CanvasTexture(labelCanvas);
      labelTex.anisotropy = 4;
      const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
      const labelPlane = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), labelMat);
      labelPlane.rotation.x = -Math.PI / 2;
      labelPlane.position.set(0, plotHeight / 2 + 0.05, 0);
      mesh.add(labelPlane);

      // Edge outline
      const edges = new THREE.EdgesGeometry(geometry);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x0f172a, linewidth: 2 }));
      mesh.add(line);

      this.scene.add(mesh);
      this.plotMeshes.push(mesh);
    });
  }

  private createPlotNumberCanvas(plotNo: string, isAvailable: boolean): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 170;
    const ctx = canvas.getContext('2d')!;

    // Clean semi-transparent dark plate
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(18, 18, 220, 134, 18);
    ctx.fill();

    ctx.strokeStyle = isAvailable ? '#4ade80' : '#f87171';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Plot Number
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 78px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(plotNo, 128, 75);

    // Status pill text
    ctx.fillStyle = isAvailable ? '#86efac' : '#fca5a5';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(isAvailable ? 'AVAILABLE' : 'SOLD', 128, 122);

    return canvas;
  }

  private build3DTrees(): void {
    const textureLoader = new THREE.TextureLoader();
    const crownTex = textureLoader.load(REALISTIC_TREE_CROWN);
    crownTex.anisotropy = 4;

    const palmFrondTex = textureLoader.load(REALISTIC_PALM_FROND);
    palmFrondTex.anisotropy = 4;

    // 1. Mature 3D Canopy Trees along 9M Road Curbs & Plots
    const canopyTreeConfigs = [
      // Along 9M Road North Curb (Avenue Promenade)
      { x: -38, z: -7.0, scale: 1.15, seed: 1 },
      { x: -20, z: -7.0, scale: 1.05, seed: 2 },
      { x: 20, z: -7.0, scale: 1.05, seed: 3 },
      { x: 38, z: -7.0, scale: 1.15, seed: 4 },

      // Along 9M Road South Curb
      { x: -38, z: 7.0, scale: 1.15, seed: 5 },
      { x: -20, z: 7.0, scale: 1.05, seed: 6 },
      { x: 20, z: 7.0, scale: 1.05, seed: 7 },
      { x: 38, z: 7.0, scale: 1.15, seed: 8 },

      // Feature Trees within Plots (Realistic estate landscape)
      { x: -6, z: 12, scale: 0.95, seed: 9 },   // Inside Plot 246
      { x: 16, z: -12, scale: 0.95, seed: 10 }, // Inside Plot 221
      { x: -33, z: -12, scale: 0.92, seed: 11 }, // Inside Plot 248
      { x: 32, z: 12, scale: 0.92, seed: 12 },  // Inside Plot 250

      // Perimeter Green Belt Buffer
      { x: -52, z: -20, scale: 1.25, seed: 13 },
      { x: -52, z: 20, scale: 1.25, seed: 14 },
      { x: 52, z: -20, scale: 1.25, seed: 15 },
      { x: 52, z: 20, scale: 1.25, seed: 16 }
    ];

    canopyTreeConfigs.forEach(cfg => {
      const tree = this.create3DCanopyTree(cfg.scale, cfg.seed, crownTex);
      tree.position.set(cfg.x, 0, cfg.z);
      this.scene.add(tree);
    });

    // 2. Majestic 3D Royal Palms in Corner Parks & Main Boulevard Entrance
    const palmConfigs = [
      // Corner Parks
      { x: -48, z: -32, scale: 1.2, leanX: 0.08, leanZ: 0.04 },
      { x: -48, z: 32, scale: 1.15, leanX: 0.06, leanZ: -0.05 },
      { x: 48, z: -32, scale: 1.2, leanX: -0.08, leanZ: 0.04 },
      { x: 48, z: 32, scale: 1.15, leanX: -0.06, leanZ: -0.05 },

      // Twin Boulevard Entrance Palms at West Entry
      { x: -54, z: -4.8, scale: 1.1, leanX: 0.04, leanZ: 0.02 },
      { x: -54, z: 4.8, scale: 1.1, leanX: 0.04, leanZ: -0.02 },

      // East Cul-de-sac Boundary Palms
      { x: 54, z: -4.8, scale: 1.1, leanX: -0.04, leanZ: 0.02 },
      { x: 54, z: 4.8, scale: 1.1, leanX: -0.04, leanZ: -0.02 }
    ];

    palmConfigs.forEach(cfg => {
      const palm = this.create3DPalmTree(cfg.scale, cfg.leanX, cfg.leanZ, palmFrondTex);
      palm.position.set(cfg.x, 0, cfg.z);
      this.scene.add(palm);
    });

    // 3. Trimmed 3D Landscape Shrubs along Avenue Curbs
    const shrubPositions = [
      { x: -29, z: -6.5 },
      { x: -10, z: -6.5 },
      { x: 10, z: -6.5 },
      { x: 29, z: -6.5 },
      { x: -29, z: 6.5 },
      { x: -10, z: 6.5 },
      { x: 10, z: 6.5 },
      { x: 29, z: 6.5 }
    ];

    shrubPositions.forEach(pos => {
      const shrub = this.create3DShrub(0.9, crownTex);
      shrub.position.set(pos.x, 0, pos.z);
      this.scene.add(shrub);
    });
  }

  /**
   * Generates a photorealistic volumetric 3D Canopy Tree
   * Uses realistic wood bark trunk with branch forks and 4-way crossed + diagonal
   * photorealistic leaf canopy shells with sharp alpha transparency.
   */
  private create3DCanopyTree(scale = 1, seed = 0, crownTex: THREE.Texture): THREE.Group {
    const treeGroup = new THREE.Group();

    // 1. Natural Wood Bark Trunk & Branches
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x3a2618,
      roughness: 0.92,
      metalness: 0.04
    });

    // Main Trunk (Height ~4.0 units)
    const trunkHeight = 4.0 * scale;
    const trunkGeo = new THREE.CylinderGeometry(0.24 * scale, 0.48 * scale, trunkHeight, 10);
    const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
    trunkMesh.position.y = trunkHeight / 2;
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    treeGroup.add(trunkMesh);

    // Root Flare Base at ground
    const rootGeo = new THREE.CylinderGeometry(0.5 * scale, 0.78 * scale, 0.45 * scale, 8);
    const rootMesh = new THREE.Mesh(rootGeo, trunkMat);
    rootMesh.position.y = 0.22 * scale;
    rootMesh.castShadow = true;
    treeGroup.add(rootMesh);

    // 4 Organic Branch Forks spreading into the canopy
    const branchGeo = new THREE.CylinderGeometry(0.12 * scale, 0.2 * scale, 2.4 * scale, 6);
    const branchAngles = [0.2, 1.8, 3.4, 4.9];
    branchAngles.forEach((angle) => {
      const branch = new THREE.Mesh(branchGeo, trunkMat);
      branch.position.set(0, trunkHeight * 0.65, 0);
      branch.rotation.z = 0.62;
      branch.rotation.y = angle + (seed * 0.2);
      branch.position.x += Math.sin(angle) * 0.35 * scale;
      branch.position.z += Math.cos(angle) * 0.35 * scale;
      branch.castShadow = true;
      treeGroup.add(branch);
    });

    // 2. Photorealistic Volumetric Crossed Foliage Shells
    const leafMat = new THREE.MeshStandardMaterial({
      map: crownTex,
      transparent: true,
      depthWrite: true,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      roughness: 0.68,
      metalness: 0.03
    });

    const canopyGroup = new THREE.Group();
    canopyGroup.position.y = trunkHeight + 1.2 * scale;

    const crownDiameter = 7.6 * scale;
    const crownHeight = 7.2 * scale;

    // 4 Crossed Vertical Foliage Planes at 0°, 45°, 90°, 135°
    const angles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4];
    angles.forEach((rotAngle) => {
      const planeGeo = new THREE.PlaneGeometry(crownDiameter, crownHeight);
      const planeMesh = new THREE.Mesh(planeGeo, leafMat);
      planeMesh.rotation.y = rotAngle + (seed * 0.1);
      planeMesh.castShadow = true;
      planeMesh.receiveShadow = true;
      canopyGroup.add(planeMesh);
    });

    // Diagonal Tilted Domes for 3D fullness from all viewpoints
    const diagPlane1 = new THREE.Mesh(new THREE.PlaneGeometry(crownDiameter * 0.92, crownHeight * 0.92), leafMat);
    diagPlane1.rotation.set(Math.PI / 5, Math.PI / 3, 0);
    diagPlane1.castShadow = true;
    canopyGroup.add(diagPlane1);

    const diagPlane2 = new THREE.Mesh(new THREE.PlaneGeometry(crownDiameter * 0.92, crownHeight * 0.92), leafMat);
    diagPlane2.rotation.set(-Math.PI / 5, -Math.PI / 3, 0);
    diagPlane2.castShadow = true;
    canopyGroup.add(diagPlane2);

    // Horizontal Top-Down Canopy Disc for aerial & drone view
    const topDiscGeo = new THREE.PlaneGeometry(crownDiameter * 0.95, crownDiameter * 0.95);
    const topDisc = new THREE.Mesh(topDiscGeo, leafMat);
    topDisc.rotation.x = -Math.PI / 2;
    topDisc.position.y = 0.6 * scale;
    topDisc.castShadow = true;
    canopyGroup.add(topDisc);

    treeGroup.add(canopyGroup);

    // Natural variation rotation
    treeGroup.rotation.y = seed * 1.414;

    return treeGroup;
  }

  /**
   * Generates a photorealistic 3D Royal Palm Tree
   * Features: Segmented curved ring trunk, 12 arching 3D textured fronds, and coconut cluster.
   */
  private create3DPalmTree(scale = 1, leanX = 0.08, leanZ = 0.04, palmFrondTex: THREE.Texture): THREE.Group {
    const palmGroup = new THREE.Group();

    // 1. Natural Curved Trunk (7 Ring Segments)
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5a4533,
      roughness: 0.88,
      metalness: 0.05
    });

    const numSegs = 7;
    const totalTrunkHeight = 6.8 * scale;
    const segHeight = totalTrunkHeight / numSegs;
    let currY = 0;
    let currX = 0;
    let currZ = 0;

    for (let i = 0; i < numSegs; i++) {
      const bottomR = (0.36 - (i * 0.022)) * scale;
      const topR = (0.33 - (i * 0.022)) * scale;
      const segGeo = new THREE.CylinderGeometry(topR, bottomR, segHeight, 9);
      const segMesh = new THREE.Mesh(segGeo, trunkMat);
      segMesh.position.set(currX, currY + segHeight / 2, currZ);
      segMesh.rotation.z = -leanX * (i / numSegs);
      segMesh.rotation.x = leanZ * (i / numSegs);
      segMesh.castShadow = true;
      segMesh.receiveShadow = true;
      palmGroup.add(segMesh);

      currY += segHeight * 0.98;
      currX += leanX * segHeight;
      currZ += leanZ * segHeight;
    }

    // 2. Photorealistic Palm Fronds
    const frondMat = new THREE.MeshStandardMaterial({
      map: palmFrondTex,
      transparent: true,
      depthWrite: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.62,
      metalness: 0.03
    });

    const frondCount = 12;
    for (let f = 0; f < frondCount; f++) {
      const angle = (f / frondCount) * Math.PI * 2;
      const frondPivot = new THREE.Group();
      frondPivot.position.set(currX, currY, currZ);
      frondPivot.rotation.y = angle;

      const frondLen = 5.2 * scale;
      const frondWidth = 2.4 * scale;

      // Primary Frond Plane arching down
      const frondGeo = new THREE.PlaneGeometry(frondLen, frondWidth);
      const frondMesh = new THREE.Mesh(frondGeo, frondMat);
      frondMesh.position.set(frondLen * 0.45, -0.6 * scale, 0);
      frondMesh.rotation.z = -0.32; // arch downward
      frondMesh.rotation.x = Math.PI / 4; // V-shape ridge
      frondMesh.castShadow = true;

      frondPivot.add(frondMesh);
      palmGroup.add(frondPivot);
    }

    // 3. Crown Coconut Cluster
    const nutMat = new THREE.MeshStandardMaterial({ color: 0x483420, roughness: 0.8 });
    for (let n = 0; n < 4; n++) {
      const nut = new THREE.Mesh(new THREE.SphereGeometry(0.26 * scale, 7, 7), nutMat);
      const nAngle = (n / 4) * Math.PI * 2;
      nut.position.set(currX + Math.cos(nAngle) * 0.3 * scale, currY - 0.2 * scale, currZ + Math.sin(nAngle) * 0.3 * scale);
      nut.castShadow = true;
      palmGroup.add(nut);
    }

    return palmGroup;
  }

  /**
   * Generates a photorealistic trimmed garden shrub
   */
  private create3DShrub(scale = 1, crownTex: THREE.Texture): THREE.Group {
    const shrubGroup = new THREE.Group();
    const leafMat = new THREE.MeshStandardMaterial({
      map: crownTex,
      transparent: true,
      depthWrite: true,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      roughness: 0.72
    });

    const shrubDiameter = 2.4 * scale;
    const shrubHeight = 2.2 * scale;

    const p1 = new THREE.Mesh(new THREE.PlaneGeometry(shrubDiameter, shrubHeight), leafMat);
    p1.position.y = shrubHeight / 2;
    p1.castShadow = true;
    shrubGroup.add(p1);

    const p2 = new THREE.Mesh(new THREE.PlaneGeometry(shrubDiameter, shrubHeight), leafMat);
    p2.position.y = shrubHeight / 2;
    p2.rotation.y = Math.PI / 2;
    p2.castShadow = true;
    shrubGroup.add(p2);

    return shrubGroup;
  }

  private buildScaleVehicles(): void {
    // 1. Modern White SUV parked along curb
    const suvMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });

    const suvBody = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.4, 2.0), suvMat);
    suvBody.position.set(-10, 0.8, -3.2);
    suvBody.castShadow = true;
    this.scene.add(suvBody);

    const suvCabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.8), glassMat);
    suvCabin.position.set(-10.2, 1.8, -3.2);
    suvCabin.castShadow = true;
    this.scene.add(suvCabin);

    // 2. Modern Blue Sedan heading east on 9m road
    const sedanMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.7 });
    const sedanBody = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.1, 1.8), sedanMat);
    sedanBody.position.set(24, 0.65, 2.2);
    sedanBody.castShadow = true;
    this.scene.add(sedanBody);
  }

  private buildStreetLights(): void {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const lightPositions = [
      { x: -28, z: -4.8 },
      { x: 0, z: -4.8 },
      { x: 28, z: -4.8 },
      { x: -28, z: 4.8 },
      { x: 0, z: 4.8 },
      { x: 28, z: 4.8 }
    ];

    lightPositions.forEach(pos => {
      // Pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.0, 8), poleMat);
      pole.position.set(pos.x, 2.5, pos.z);
      pole.castShadow = true;
      this.scene.add(pole);

      // Lamp Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), lampMat);
      head.position.set(pos.x, 5.1, pos.z);
      this.scene.add(head);

      // Warm ground light point
      const pointLight = new THREE.PointLight(0xfef08a, 1.5, 12);
      pointLight.position.set(pos.x, 4.8, pos.z);
      this.scene.add(pointLight);
    });
  }

  private onCanvasClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.plotMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const data = hitMesh.userData as PlotMeshUserData;
      if (data?.plot) {
        this.selectPlot(data.plot);
      }
    }
  }

  selectPlot(plot: SubdividedPlot): void {
    this.selectedPlot.set(plot);
    this.highlightPlotIn3D(plot);
  }

  private highlightPlotIn3D(plot: SubdividedPlot): void {
    // Reset previous active mesh
    if (this.activePlotMesh) {
      const prevData = this.activePlotMesh.userData as PlotMeshUserData;
      (this.activePlotMesh.material as THREE.MeshStandardMaterial).color.setHex(prevData.baseColor);
      this.activePlotMesh.position.y = prevData.baseY;
      if (this.selectionBoxHelper) {
        this.scene.remove(this.selectionBoxHelper);
        this.selectionBoxHelper = null;
      }
    }

    // Find and highlight target mesh
    const targetMesh = this.plotMeshes.find(m => (m.userData as PlotMeshUserData).plot.id === plot.id);
    if (targetMesh) {
      const data = targetMesh.userData as PlotMeshUserData;
      // Change color to vibrant golden yellow
      (targetMesh.material as THREE.MeshStandardMaterial).color.setHex(0xfacc15);
      
      // Elevate in 3D (lifts up by 0.6 units)
      targetMesh.position.y = data.baseY + 0.6;
      this.activePlotMesh = targetMesh;

      // Add Glowing 3D Bounding Beacon
      this.selectionBoxHelper = new THREE.BoxHelper(targetMesh, 0xffffff);
      this.scene.add(this.selectionBoxHelper);
    }
  }

  setCameraPreset(preset: 'drone' | 'top' | 'eye'): void {
    this.currentCameraView.set(preset);
    if (!this.camera || !this.controls) return;

    if (preset === 'drone') {
      // Plotex Flagship 3D Isometric View
      this.camera.position.set(38, 44, 52);
      this.controls.target.set(0, 0, 0);
    } else if (preset === 'top') {
      // 2D Surveyor Plan View
      this.camera.position.set(0, 85, 0.01);
      this.controls.target.set(0, 0, 0);
    } else if (preset === 'eye') {
      // First-person eye level along the 9m road
      this.camera.position.set(-42, 3.2, 0);
      this.controls.target.set(20, 1.8, 0);
    }
    this.controls.update();
  }

  toggleAutoRotate(): void {
    this.isAutoRotating.update(r => !r);
    this.controls.autoRotate = this.isAutoRotating();
    this.controls.autoRotateSpeed = 1.2;
  }

  resetCamera(): void {
    this.setCameraPreset('drone');
  }

  closeDetails(): void {
    this.selectedPlot.set(null);
    if (this.activePlotMesh) {
      const data = this.activePlotMesh.userData as PlotMeshUserData;
      (this.activePlotMesh.material as THREE.MeshStandardMaterial).color.setHex(data.baseColor);
      this.activePlotMesh.position.y = data.baseY;
      if (this.selectionBoxHelper) {
        this.scene.remove(this.selectionBoxHelper);
        this.selectionBoxHelper = null;
      }
      this.activePlotMesh = null;
    }
  }

  toggleUnit(): void {
    this.unitMode.update(u => u === 'yds' ? 'sqft' : 'yds');
  }

  getWhatsAppLink(plot: SubdividedPlot): string {
    const area = this.unitMode() === 'yds' ? `${plot.superBuiltUpYds} Yds` : `${plot.superBuiltUpSqft} Sq.Ft`;
    const text = encodeURIComponent(
      `Hi Mannidam Realty, I am viewing the 3D Interactive Masterplan for ${this.propertyTitle} and interested in Plot No. ${plot.plotNo} (${area}, ${plot.facing}, Price: ${plot.formattedPrice}). Please arrange a site inspection.`
    );
    return `https://wa.me/919444100000?text=${text}`;
  }

  resetNorth(): void {
    if (!this.camera || !this.controls) return;
    const x = this.camera.position.x;
    const z = this.camera.position.z;
    const y = this.camera.position.y;
    const radius = Math.hypot(x, z);
    
    // Smooth animated realignment to true North (-Z)
    this.resetNorthStartPos.copy(this.camera.position);
    this.resetNorthEndPos.set(0.001, y, radius);
    this.resetNorthStartTime = performance.now();
    this.isResettingNorth = true;
    this.controls.target.set(0, 0, 0);
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Smooth compass North reset animation
    if (this.isResettingNorth && this.camera && this.controls) {
      const elapsed = performance.now() - this.resetNorthStartTime;
      const progress = Math.min(elapsed / this.RESET_NORTH_DURATION, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // Smooth cubic ease-out
      this.camera.position.lerpVectors(this.resetNorthStartPos, this.resetNorthEndPos, ease);
      this.controls.target.set(0, 0, 0);
      if (progress >= 1) {
        this.isResettingNorth = false;
      }
    }

    this.controls?.update();

    // Dynamically update compass heading angle as user rotates
    if (this.controls) {
      const az = this.controls.getAzimuthalAngle();
      this.compassAngle.set(-az * (180 / Math.PI));
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };
}
