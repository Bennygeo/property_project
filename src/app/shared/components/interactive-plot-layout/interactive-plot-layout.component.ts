import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubdividedPlot } from '../../../core/models/subdivided-plot.model';
import { REAL_TREE_CANOPY, REAL_TREE_PALM } from './tree-assets';

@Component({
  selector: 'app-interactive-plot-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interactive-plot-layout.component.html',
  styleUrls: ['./interactive-plot-layout.component.css']
})
export class InteractivePlotLayoutComponent implements OnInit {
  @Input() propertyTitle: string = 'Greenfield Enclave';
  @Input() locality: string = 'Nandambakkam, Chennai';

  @Input() set customPlots(plotsData: SubdividedPlot[] | undefined) {
    if (plotsData && plotsData.length > 0) {
      this.plots.set(plotsData);
      const firstAvail = plotsData.find(p => p.status === 'available') || plotsData[0];
      if (firstAvail) {
        this.selectedPlot.set(firstAvail);
      }
    }
  }

  // Real Photorealistic Architectural Tree Sprites
  readonly realTreeCanopy = REAL_TREE_CANOPY;
  readonly realTreePalm = REAL_TREE_PALM;

  // Unit of display toggle: 'yds' or 'sqft'
  readonly unitMode = signal<'yds' | 'sqft'>('yds');
  
  // 3D Isometric View Mode Toggle
  readonly is3dMode = signal<boolean>(true);

  // Active status filter: 'all' | 'available' | 'sold' | 'reserved'
  readonly activeFilter = signal<'all' | 'available' | 'sold' | 'reserved'>('all');

  // Master 8 Partitioned Plots Definition
  readonly plots = signal<SubdividedPlot[]>([
    // Row 1 (North of 9m Road) - 4 Plots
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
      x: 180,
      y: 70,
      w: 120,
      h: 90
    },
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
      hasTrees: false,
      x: 50,
      y: 70,
      w: 120,
      h: 90
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
      x: 480,
      y: 70,
      w: 120,
      h: 90
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
      x: 610,
      y: 70,
      w: 120,
      h: 90
    },

    // Row 2 (South of 9m Road) - 4 Plots (Our primary available showcase matching the user screenshot)
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
      x: 180,
      y: 250,
      w: 120,
      h: 90
    },
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
      hasTrees: false,
      x: 50,
      y: 250,
      w: 120,
      h: 90
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
      hasTrees: false,
      x: 180,
      y: 350,
      w: 120,
      h: 90
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
      facing: 'North Facing',
      priceInLakhs: 40.5,
      formattedPrice: '₹40.50 L',
      isCorner: false,
      hasTrees: false,
      x: 50,
      y: 350,
      w: 120,
      h: 90
    }
  ]);

  // Selected plot currently inspected
  readonly selectedPlot = signal<SubdividedPlot | null>(null);

  // Hovered plot
  readonly hoveredPlot = signal<SubdividedPlot | null>(null);

  // Filtered plots
  readonly filteredPlots = computed(() => {
    const filter = this.activeFilter();
    const all = this.plots();
    if (filter === 'all') return all;
    return all.filter(p => p.status === filter);
  });

  // Summary Counts
  readonly availableCount = computed(() => this.plots().filter(p => p.status === 'available').length);
  readonly soldCount = computed(() => this.plots().filter(p => p.status === 'sold').length);
  readonly reservedCount = computed(() => this.plots().filter(p => p.status === 'reserved').length);

  ngOnInit(): void {
    // Default select Plot #246 to match the user's design reference immediately!
    const defaultPlot = this.plots().find(p => p.plotNo === '246');
    if (defaultPlot) {
      this.selectedPlot.set(defaultPlot);
    }
  }

  selectPlot(plot: SubdividedPlot): void {
    this.selectedPlot.set(plot);
  }

  hoverPlot(plot: SubdividedPlot | null): void {
    this.hoveredPlot.set(plot);
  }

  closeDetails(): void {
    this.selectedPlot.set(null);
  }

  isPlotActive(plot: SubdividedPlot): boolean {
    const sel = this.selectedPlot();
    const hov = this.hoveredPlot();
    return (sel?.id === plot.id) || (hov?.id === plot.id);
  }

  toggleUnit(): void {
    this.unitMode.update(u => u === 'yds' ? 'sqft' : 'yds');
  }

  toggle3dMode(): void {
    this.is3dMode.update(m => !m);
  }

  getWhatsAppLink(plot: SubdividedPlot): string {
    const area = this.unitMode() === 'yds' ? `${plot.superBuiltUpYds} Yds` : `${plot.superBuiltUpSqft} Sq.Ft`;
    const text = encodeURIComponent(
      `Hi Mannidam Realty, I am interested in Plot No. ${plot.plotNo} (${area}, ${plot.facing}, Price: ${plot.formattedPrice}) at ${this.propertyTitle}. Please share full survey sketch and arrange site visit.`
    );
    return `https://wa.me/919444100000?text=${text}`;
  }
}
