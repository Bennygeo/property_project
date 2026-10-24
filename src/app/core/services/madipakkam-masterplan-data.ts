import { SubdividedPlot } from '../models/subdivided-plot.model';

export interface LayoutAmenityPin {
  id: number;
  number: number;
  name: string;
  category: string;
  phase: 'Phase 1' | 'Phase 2' | 'Central';
  u: number;
  v: number;
  x: number;
  z: number;
  description: string;
}

export const MASTERPLAN_WORLD_WIDTH = 33.94;
export const MASTERPLAN_WORLD_HEIGHT = 24.0;

export const MADIPAKKAM_LAYOUT_AMENITIES: LayoutAmenityPin[] = [
  {
    id: 1,
    number: 1,
    name: 'Grand Boulevard Arch & 24/7 Security RFID Gate',
    category: 'Security & Access',
    phase: 'Phase 1',
    u: 0.527,
    v: 0.055,
    x: (0.527 - 0.5) * MASTERPLAN_WORLD_WIDTH,
    z: (0.055 - 0.5) * MASTERPLAN_WORLD_HEIGHT,
    description: 'Double-lane boom barrier, ANPR surveillance, visitor concierge and security desk.'
  },
  {
    id: 2,
    number: 2,
    name: 'Clubhouse Azure & Infinity Edge Pool',
    category: 'Recreation',
    phase: 'Phase 1',
    u: 0.74,
    v: 0.30,
    x: (0.74 - 0.5) * MASTERPLAN_WORLD_WIDTH,
    z: (0.30 - 0.5) * MASTERPLAN_WORLD_HEIGHT,
    description: '15,000 sq.ft private residents club with gym, squash court, rooftop cafe, and lap pool.'
  },
  {
    id: 3,
    number: 3,
    name: 'Central Meandering Lotus Stream & Boardwalk',
    category: 'Nature & Landscape',
    phase: 'Central',
    u: 0.45,
    v: 0.47,
    x: (0.45 - 0.5) * MASTERPLAN_WORLD_WIDTH,
    z: (0.47 - 0.5) * MASTERPLAN_WORLD_HEIGHT,
    description: 'Naturalized freshwater bioswale corridor with water lilies, stepping stones, and reed beds.'
  },
  {
    id: 4,
    number: 4,
    name: 'Championship Tennis & Pickleball Courts',
    category: 'Sports',
    phase: 'Phase 1',
    u: 0.82,
    v: 0.32,
    x: (0.82 - 0.5) * MASTERPLAN_WORLD_WIDTH,
    z: (0.32 - 0.5) * MASTERPLAN_WORLD_HEIGHT,
    description: 'Floodlit hard courts with tournament synthetic surfacing and spectator benches.'
  },
  {
    id: 5,
    number: 5,
    name: 'Children’s Biophilic Adventure Play Enclave',
    category: 'Kids & Family',
    phase: 'Phase 2',
    u: 0.28,
    v: 0.68,
    x: (0.28 - 0.5) * MASTERPLAN_WORLD_WIDTH,
    z: (0.68 - 0.5) * MASTERPLAN_WORLD_HEIGHT,
    description: 'Soft-fall rubberized play surface, timber obstacle climbing ropes, and sand pit.'
  },
  {
    id: 6,
    number: 6,
    name: 'Senior Citizens Fragrance Garden & Gazebo',
    category: 'Wellness',
    phase: 'Phase 2',
    u: 0.18,
    v: 0.74,
    x: (0.18 - 0.5) * MASTERPLAN_WORLD_WIDTH,
    z: (0.74 - 0.5) * MASTERPLAN_WORLD_HEIGHT,
    description: 'Aromatherapy herb borders, shaded classical gazebo, and reflexology pebble path.'
  },
  {
    id: 7,
    number: 7,
    name: 'Tiered Open-Air Lawn Amphitheatre',
    category: 'Community',
    phase: 'Central',
    u: 0.42,
    v: 0.44,
    x: (0.42 - 0.5) * MASTERPLAN_WORLD_WIDTH,
    z: (0.44 - 0.5) * MASTERPLAN_WORLD_HEIGHT,
    description: 'Grass-terraced gathering hub for community cultural evenings, cinema nights, and yoga.'
  },
  {
    id: 8,
    number: 8,
    name: 'Organic Citrus & Miyawaki Micro-Forest Grove',
    category: 'Eco-Living',
    phase: 'Phase 2',
    u: 0.14,
    v: 0.82,
    x: (0.14 - 0.5) * MASTERPLAN_WORLD_WIDTH,
    z: (0.82 - 0.5) * MASTERPLAN_WORLD_HEIGHT,
    description: 'Dense native oxygen forest with 400+ medicinal plants and organic fruit trees.'
  },
  {
    id: 9,
    number: 9,
    name: 'Lakeside Jogging Track & Fitness Station',
    category: 'Fitness',
    phase: 'Phase 2',
    u: 0.20,
    v: 0.88,
    x: (0.20 - 0.5) * MASTERPLAN_WORLD_WIDTH,
    z: (0.88 - 0.5) * MASTERPLAN_WORLD_HEIGHT,
    description: 'Continuous 1.8km rubberized running circuit encircling the southern water promenade.'
  },
  {
    id: 10,
    number: 10,
    name: 'Aromatherapy Herb Sanctuary & Butterfly Park',
    category: 'Wellness',
    phase: 'Central',
    u: 0.38,
    v: 0.54,
    x: (0.38 - 0.5) * MASTERPLAN_WORLD_WIDTH,
    z: (0.54 - 0.5) * MASTERPLAN_WORLD_HEIGHT,
    description: 'Perennial pollinator flower garden with stone walkways and educational botanical tags.'
  }
];

interface RowConfig {
  phase: 'Phase 1' | 'Phase 2';
  startNo: number;
  count: number;
  uStart: number;
  uEnd: number;
  v: number;
  facing: string;
  roadWidth: string;
  baseSqft: number;
}

const MASTER_ROW_CONFIGS: RowConfig[] = [
  // ============================================================
  // PHASE 1: NORTH-EAST MASTER SECTOR (Plots 1 to 290)
  // ============================================================
  // Block 1A: Upper Sector (North)
  { phase: 'Phase 1', startNo: 1, count: 24, uStart: 0.40, uEnd: 0.66, v: 0.14, facing: 'South Facing', roadWidth: '40 ft Internal Avenue', baseSqft: 1850 },
  { phase: 'Phase 1', startNo: 25, count: 24, uStart: 0.40, uEnd: 0.66, v: 0.17, facing: 'North Facing', roadWidth: '40 ft Internal Avenue', baseSqft: 1200 },
  { phase: 'Phase 1', startNo: 49, count: 26, uStart: 0.40, uEnd: 0.70, v: 0.21, facing: 'South Facing', roadWidth: '40 ft Internal Avenue', baseSqft: 1500 },
  { phase: 'Phase 1', startNo: 75, count: 26, uStart: 0.40, uEnd: 0.70, v: 0.25, facing: 'North Facing', roadWidth: '40 ft Internal Avenue', baseSqft: 1500 },

  // Block 1B: Central Phase 1 Boulevard
  { phase: 'Phase 1', startNo: 101, count: 28, uStart: 0.41, uEnd: 0.72, v: 0.29, facing: 'South Facing', roadWidth: '50 ft Primary Boulevard', baseSqft: 1500 },
  { phase: 'Phase 1', startNo: 129, count: 28, uStart: 0.41, uEnd: 0.72, v: 0.33, facing: 'North Facing', roadWidth: '50 ft Primary Boulevard', baseSqft: 1200 },
  { phase: 'Phase 1', startNo: 157, count: 28, uStart: 0.42, uEnd: 0.73, v: 0.37, facing: 'South Facing', roadWidth: '40 ft Internal Avenue', baseSqft: 1200 },
  { phase: 'Phase 1', startNo: 185, count: 28, uStart: 0.42, uEnd: 0.73, v: 0.41, facing: 'North Facing', roadWidth: '40 ft Internal Avenue', baseSqft: 1500 },

  // Block 1C: Eastern Wing & Clubhouse Enclave
  { phase: 'Phase 1', startNo: 213, count: 22, uStart: 0.70, uEnd: 0.88, v: 0.32, facing: 'South Facing', roadWidth: '40 ft Internal Avenue', baseSqft: 1800 },
  { phase: 'Phase 1', startNo: 235, count: 22, uStart: 0.70, uEnd: 0.88, v: 0.36, facing: 'North Facing', roadWidth: '50 ft Primary Boulevard', baseSqft: 1800 },
  { phase: 'Phase 1', startNo: 257, count: 20, uStart: 0.72, uEnd: 0.89, v: 0.48, facing: 'South Facing', roadWidth: '40 ft Internal Avenue', baseSqft: 1500 },
  { phase: 'Phase 1', startNo: 277, count: 14, uStart: 0.80, uEnd: 0.89, v: 0.64, facing: 'North Facing', roadWidth: '40 ft Internal Avenue', baseSqft: 1500 },

  // ============================================================
  // PHASE 2: SOUTH-WEST MASTER SECTOR (Plots 291 to 510)
  // ============================================================
  // Block 2A: Connecting & Upper Phase 2 (South of central stream)
  { phase: 'Phase 2', startNo: 291, count: 22, uStart: 0.35, uEnd: 0.52, v: 0.48, facing: 'South Facing', roadWidth: '40 ft Internal Avenue', baseSqft: 1200 },
  { phase: 'Phase 2', startNo: 313, count: 22, uStart: 0.34, uEnd: 0.50, v: 0.52, facing: 'North Facing', roadWidth: '40 ft Internal Avenue', baseSqft: 1200 },
  { phase: 'Phase 2', startNo: 335, count: 24, uStart: 0.28, uEnd: 0.48, v: 0.57, facing: 'South Facing', roadWidth: '50 ft Primary Boulevard', baseSqft: 1500 },

  // Block 2B: Central Phase 2 Avenues
  { phase: 'Phase 2', startNo: 359, count: 26, uStart: 0.24, uEnd: 0.48, v: 0.62, facing: 'South Facing', roadWidth: '40 ft Internal Avenue', baseSqft: 1500 },
  { phase: 'Phase 2', startNo: 385, count: 26, uStart: 0.22, uEnd: 0.47, v: 0.67, facing: 'North Facing', roadWidth: '40 ft Internal Avenue', baseSqft: 1500 },
  { phase: 'Phase 2', startNo: 411, count: 26, uStart: 0.20, uEnd: 0.46, v: 0.72, facing: 'South Facing', roadWidth: '40 ft Internal Avenue', baseSqft: 1200 },
  { phase: 'Phase 2', startNo: 437, count: 26, uStart: 0.18, uEnd: 0.45, v: 0.77, facing: 'North Facing', roadWidth: '40 ft Internal Avenue', baseSqft: 1200 },

  // Block 2C: Southern Lakeside & Forest Promenade
  { phase: 'Phase 2', startNo: 463, count: 24, uStart: 0.14, uEnd: 0.42, v: 0.83, facing: 'South Facing', roadWidth: '40 ft Internal Avenue', baseSqft: 1800 },
  { phase: 'Phase 2', startNo: 487, count: 24, uStart: 0.12, uEnd: 0.40, v: 0.88, facing: 'North Facing', roadWidth: '50 ft Primary Boulevard', baseSqft: 2400 }
];

function generate510MasterplanPlots(): SubdividedPlot[] {
  const plots: SubdividedPlot[] = [];

  MASTER_ROW_CONFIGS.forEach((row) => {
    const stepU = (row.uEnd - row.uStart) / Math.max(1, row.count - 1);

    for (let i = 0; i < row.count; i++) {
      const plotNum = row.startNo + i;
      const u = row.uStart + i * stepU;
      const v = row.v;
      const isCorner = (i === 0 || i === row.count - 1);

      // Status distribution (~60% available, ~25% sold, ~15% booked)
      let status: 'available' | 'sold' | 'reserved' = 'available';
      if (plotNum % 7 === 0 || plotNum % 11 === 0 || (plotNum >= 120 && plotNum <= 135 && plotNum % 2 === 0)) {
        status = 'sold';
      } else if (plotNum % 9 === 0 || plotNum % 13 === 0) {
        status = 'reserved'; // Booked
      }

      // Special highlight plots guarantee: Plot 14 and Plot 124 and Plot 246 are available
      if (plotNum === 14 || plotNum === 124 || plotNum === 246) {
        status = 'available';
      }

      const sqft = plotNum === 14 ? 1850 : (isCorner ? Math.round(row.baseSqft * 1.3) : row.baseSqft);
      const yds = Math.round((sqft / 9) * 10) / 10;
      const widthFeet = isCorner ? 40 : 30;
      const lengthFeet = Math.round(sqft / widthFeet);
      const widthMeters = Math.round(widthFeet * 0.3048 * 10) / 10;
      const lengthMeters = Math.round(lengthFeet * 0.3048 * 10) / 10;

      const ratePerSqft = plotNum === 14 ? 3351 : (row.roadWidth.includes('50') ? 3450 : 3200);
      const priceLakhs = plotNum === 14 ? 62.0 : Math.round((sqft * ratePerSqft) / 10000) / 10;
      const formattedPrice = `₹${priceLakhs.toFixed(2)} L`;

      let facing = row.facing;
      if (plotNum === 14) {
        facing = 'North-East Facing';
      } else if (isCorner) {
        facing = i === 0 
          ? (row.phase === 'Phase 1' ? 'South-East Facing (Corner)' : 'South-West Facing (Corner)')
          : (row.phase === 'Phase 1' ? 'North-East Facing (Corner)' : 'North-West Facing (Corner)');
      }

      let amenityProximity: string | undefined;
      if (row.v <= 0.25) {
        amenityProximity = '50m from Grand Entrance Arch & Security RFID Gate';
      } else if (row.v >= 0.28 && row.v <= 0.40 && u >= 0.68) {
        amenityProximity = 'Overlooking Clubhouse Azure & Infinity Pool';
      } else if (row.v >= 0.44 && row.v <= 0.55) {
        amenityProximity = 'Fronting Central Lotus Stream & Boardwalk';
      } else if (row.v >= 0.80) {
        amenityProximity = 'Adjacent to Children Adventure Park & Southern Lake';
      }

      // Three.js world coordinates
      const worldX = (u - 0.5) * MASTERPLAN_WORLD_WIDTH;
      const worldZ = (v - 0.5) * MASTERPLAN_WORLD_HEIGHT;

      // 3D plot dimensions (scaled to fit rows snugly)
      const plotWidthWorld = Math.max(0.65, Math.abs(stepU * MASTERPLAN_WORLD_WIDTH * 0.88));
      const plotDepthWorld = 0.65;

      plots.push({
        id: plotNum,
        plotNo: String(plotNum),
        phase: row.phase,
        status,
        superBuiltUpYds: yds,
        netPlotAreaYds: Math.round(yds * 0.76 * 10) / 10,
        superBuiltUpSqft: sqft,
        widthMeters,
        lengthMeters,
        widthFeet,
        lengthFeet,
        facing,
        priceInLakhs: priceLakhs,
        formattedPrice,
        isCorner,
        hasTrees: (plotNum % 4 === 0),
        amenityProximity,
        roadWidth: row.roadWidth,
        u: Math.round(u * 1000) / 1000,
        v: Math.round(v * 1000) / 1000,
        worldX: Math.round(worldX * 100) / 100,
        worldZ: Math.round(worldZ * 100) / 100,
        x: Math.round(worldX * 100) / 100,
        y: Math.round(worldZ * 100) / 100,
        w: Math.round(plotWidthWorld * 100) / 100,
        h: plotDepthWorld
      });
    }
  });

  return plots;
}

export const MADIPAKKAM_MASTERPLAN_PLOTS: SubdividedPlot[] = generate510MasterplanPlots();
