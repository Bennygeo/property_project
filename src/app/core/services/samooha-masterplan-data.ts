export interface SamoohaPlot {
  id: string;
  plotNumber: string;
  x: number; // normalized coordinate [-0.5, 0.5] relative to map width
  z: number; // normalized coordinate [-0.5, 0.5] relative to map height
  status: 'Available' | 'Booked' | 'Sold';
  areaSqft: number;
  areaFormatted: string;
  areaSubtext: string;
  dimensionsText: string;
  dimensionsShort: string;
  frontageFeet: number;
  depthFeet: number;
  facing: string;
  roadWidth: string;
  category: string;
  block: string;
  price: string;
}

export interface MasterplanGalleryItem {
  id: string;
  title: string;
  image: string;
  caption: string;
  cameraPos?: { x: number; y: number; z: number };
  cameraTarget?: { x: number; y: number; z: number };
}

export const SAMOOHA_GALLERY: MasterplanGalleryItem[] = [
  {
    id: 'overall',
    title: 'Overall View',
    image: 'assets/master-plan.png',
    caption: 'Master Community 3D Scale Model Overview',
    cameraPos: { x: 3.5, y: 20, z: 27 },
    cameraTarget: { x: 0, y: 0, z: 0 }
  },
  {
    id: 'entrance',
    title: 'Main Entrance',
    image: 'assets/gallery-entrance.jpg',
    caption: 'Grand Entrance Boulevard & 24/7 RFID Security Gate',
    cameraPos: { x: 8, y: 9, z: 12 },
    cameraTarget: { x: 5, y: 0, z: 4 }
  },
  {
    id: 'clubhouse',
    title: 'Clubhouse',
    image: 'assets/gallery-clubhouse.jpg',
    caption: 'Signature 15,000 sq ft Residents Clubhouse & Pool',
    cameraPos: { x: 4, y: 8, z: -4 },
    cameraTarget: { x: 2, y: 0, z: -6 }
  },
  {
    id: 'park',
    title: 'Park & Green Area',
    image: 'assets/gallery-park.jpg',
    caption: 'Landscaped Central Park, Children Play Enclave & Amphitheatre',
    cameraPos: { x: -6, y: 8, z: -2 },
    cameraTarget: { x: -3, y: 0, z: 0 }
  },
  {
    id: 'road',
    title: 'Internal Road',
    image: 'assets/gallery-road.jpg',
    caption: 'Wide 40ft & 50ft Tree-Lined Internal Avenues',
    cameraPos: { x: -2, y: 6, z: 6 },
    cameraTarget: { x: -2, y: 0, z: 2 }
  },
  {
    id: 'plot',
    title: 'Sample Plot View',
    image: 'assets/gallery-plot.jpg',
    caption: 'Demarcated Villa Plot with Corner Boundary Stones',
    cameraPos: { x: -5, y: 7, z: 7 },
    cameraTarget: { x: -5.5, y: 0, z: 7.2 }
  }
];

// Helper to generate the complete dataset of 500+ plots across all blocks
function generateSamoohaPlots(): SamoohaPlot[] {
  const plots: SamoohaPlot[] = [];

  // Key hero plot 124 exactly as in reference UI:
  // Plot 124, Available, 1200 sq ft (30 x 40), 30 ft (Frontage) x 40 ft, East Facing, 30 ft road, Block C, Price: On Request
  plots.push({
    id: '124',
    plotNumber: '124',
    x: -0.23,
    z: 0.30,
    status: 'Available',
    areaSqft: 1200,
    areaFormatted: '1,200 sq ft',
    areaSubtext: '(30 × 40)',
    dimensionsText: '30 ft (Frontage) × 40 ft',
    dimensionsShort: '30 ft × 40 ft',
    frontageFeet: 30,
    depthFeet: 40,
    facing: 'East Facing',
    roadWidth: '30 ft',
    category: 'Residential Plot',
    block: 'C',
    price: 'On Request'
  });

  // Block C: Plots 101 to 160 (Lower-Left / Central-West)
  for (let i = 101; i <= 160; i++) {
    if (i === 124) continue; // Already added as hero
    const offset = i - 124;
    const col = offset % 10;
    const row = Math.floor(offset / 10);
    const x = -0.23 + col * 0.028;
    const z = 0.30 + row * 0.038;

    let status: 'Available' | 'Booked' | 'Sold' = 'Available';
    if (i === 125 || i === 132 || i === 142 || i === 155 || i % 7 === 0) {
      status = 'Booked';
    } else if (i === 126 || i === 129 || i === 138 || i % 4 === 0) {
      status = 'Sold';
    }

    const frontage = (i % 5 === 0) ? 40 : 30;
    const depth = (i % 3 === 0) ? 50 : 40;
    const sqft = frontage * depth;
    const facing = (i % 2 === 0) ? 'North Facing' : (i % 3 === 0) ? 'West Facing' : 'East Facing';

    plots.push({
      id: String(i),
      plotNumber: String(i),
      x: Math.round(x * 1000) / 1000,
      z: Math.round(z * 1000) / 1000,
      status,
      areaSqft: sqft,
      areaFormatted: `${sqft.toLocaleString('en-US')} sq ft`,
      areaSubtext: `(${frontage} × ${depth})`,
      dimensionsText: `${frontage} ft (Frontage) × ${depth} ft`,
      dimensionsShort: `${frontage} ft × ${depth} ft`,
      frontageFeet: frontage,
      depthFeet: depth,
      facing,
      roadWidth: '30 ft',
      category: 'Residential Plot',
      block: 'C',
      price: status === 'Sold' ? '—' : 'On Request'
    });
  }

  // Block A: Plots 1 to 50 (North-West Sector)
  for (let i = 1; i <= 50; i++) {
    const col = (i - 1) % 10;
    const row = Math.floor((i - 1) / 10);
    const x = -0.42 + col * 0.025;
    const z = -0.38 + row * 0.040;

    let status: 'Available' | 'Booked' | 'Sold' = 'Available';
    if (i % 6 === 0) status = 'Booked';
    else if (i % 3 === 0) status = 'Sold';

    const frontage = (i % 6 === 0) ? 40 : 30;
    const depth = 40;
    const sqft = frontage * depth;

    plots.push({
      id: String(i),
      plotNumber: String(i),
      x: Math.round(x * 1000) / 1000,
      z: Math.round(z * 1000) / 1000,
      status,
      areaSqft: sqft,
      areaFormatted: `${sqft.toLocaleString('en-US')} sq ft`,
      areaSubtext: `(${frontage} × ${depth})`,
      dimensionsText: `${frontage} ft (Frontage) × ${depth} ft`,
      dimensionsShort: `${frontage} ft × ${depth} ft`,
      frontageFeet: frontage,
      depthFeet: depth,
      facing: (i % 2 === 0) ? 'North Facing' : 'South Facing',
      roadWidth: '40 ft',
      category: 'Residential Plot',
      block: 'A',
      price: status === 'Sold' ? '—' : 'On Request'
    });
  }

  // Block B: Plots 51 to 100 (North-Central Sector)
  for (let i = 51; i <= 100; i++) {
    const col = (i - 51) % 10;
    const row = Math.floor((i - 51) / 10);
    const x = -0.15 + col * 0.027;
    const z = -0.36 + row * 0.038;

    let status: 'Available' | 'Booked' | 'Sold' = 'Available';
    if (i % 5 === 0) status = 'Booked';
    else if (i % 4 === 0) status = 'Sold';

    const frontage = 35;
    const depth = 45;
    const sqft = frontage * depth;

    plots.push({
      id: String(i),
      plotNumber: String(i),
      x: Math.round(x * 1000) / 1000,
      z: Math.round(z * 1000) / 1000,
      status,
      areaSqft: sqft,
      areaFormatted: `${sqft.toLocaleString('en-US')} sq ft`,
      areaSubtext: `(${frontage} × ${depth})`,
      dimensionsText: `${frontage} ft (Frontage) × ${depth} ft`,
      dimensionsShort: `${frontage} ft × ${depth} ft`,
      frontageFeet: frontage,
      depthFeet: depth,
      facing: (i % 2 === 0) ? 'East Facing' : 'West Facing',
      roadWidth: '40 ft',
      category: 'Residential Plot',
      block: 'B',
      price: status === 'Sold' ? '—' : 'On Request'
    });
  }

  // Block D: Plots 161 to 240 (Central & Park Enclave)
  for (let i = 161; i <= 240; i++) {
    const col = (i - 161) % 10;
    const row = Math.floor((i - 161) / 10);
    const x = -0.05 + col * 0.026;
    const z = -0.05 + row * 0.036;

    let status: 'Available' | 'Booked' | 'Sold' = 'Available';
    if (i % 7 === 0) status = 'Booked';
    else if (i % 5 === 0) status = 'Sold';

    const frontage = 30;
    const depth = 50;
    const sqft = 1500;

    plots.push({
      id: String(i),
      plotNumber: String(i),
      x: Math.round(x * 1000) / 1000,
      z: Math.round(z * 1000) / 1000,
      status,
      areaSqft: sqft,
      areaFormatted: `${sqft.toLocaleString('en-US')} sq ft`,
      areaSubtext: `(${frontage} × ${depth})`,
      dimensionsText: `${frontage} ft (Frontage) × ${depth} ft`,
      dimensionsShort: `${frontage} ft × ${depth} ft`,
      frontageFeet: frontage,
      depthFeet: depth,
      facing: (i % 2 === 0) ? 'East Facing' : 'South Facing',
      roadWidth: '50 ft Primary Boulevard',
      category: 'Residential Plot',
      block: 'D',
      price: status === 'Sold' ? '—' : 'On Request'
    });
  }

  // Block E: Plots 241 to 320 (East & Grand Avenue Sector)
  for (let i = 241; i <= 320; i++) {
    const col = (i - 241) % 10;
    const row = Math.floor((i - 241) / 10);
    const x = 0.16 + col * 0.025;
    const z = -0.28 + row * 0.040;

    let status: 'Available' | 'Booked' | 'Sold' = 'Available';
    if (i % 8 === 0) status = 'Booked';
    else if (i % 3 === 0) status = 'Sold';

    const frontage = 40;
    const depth = 45;
    const sqft = 1800;

    plots.push({
      id: String(i),
      plotNumber: String(i),
      x: Math.round(x * 1000) / 1000,
      z: Math.round(z * 1000) / 1000,
      status,
      areaSqft: sqft,
      areaFormatted: `${sqft.toLocaleString('en-US')} sq ft`,
      areaSubtext: `(${frontage} × ${depth})`,
      dimensionsText: `${frontage} ft (Frontage) × ${depth} ft`,
      dimensionsShort: `${frontage} ft × ${depth} ft`,
      frontageFeet: frontage,
      depthFeet: depth,
      facing: (i % 2 === 0) ? 'North Facing' : 'East Facing',
      roadWidth: '40 ft',
      category: 'Residential Plot',
      block: 'E',
      price: status === 'Sold' ? '—' : 'On Request'
    });
  }

  // Block F: Plots 321 to 400 (South-East Waterfront Enclave)
  for (let i = 321; i <= 400; i++) {
    const col = (i - 321) % 8;
    const row = Math.floor((i - 321) / 8);
    const x = 0.22 + col * 0.024;
    const z = 0.10 + row * 0.038;

    let status: 'Available' | 'Booked' | 'Sold' = 'Available';
    if (i % 6 === 0) status = 'Booked';
    else if (i % 4 === 0) status = 'Sold';

    const frontage = 30;
    const depth = 40;
    const sqft = 1200;

    plots.push({
      id: String(i),
      plotNumber: String(i),
      x: Math.round(x * 1000) / 1000,
      z: Math.round(z * 1000) / 1000,
      status,
      areaSqft: sqft,
      areaFormatted: `${sqft.toLocaleString('en-US')} sq ft`,
      areaSubtext: `(${frontage} × ${depth})`,
      dimensionsText: `${frontage} ft (Frontage) × ${depth} ft`,
      dimensionsShort: `${frontage} ft × ${depth} ft`,
      frontageFeet: frontage,
      depthFeet: depth,
      facing: (i % 2 === 0) ? 'North Facing' : 'West Facing',
      roadWidth: '30 ft',
      category: 'Residential Plot',
      block: 'F',
      price: status === 'Sold' ? '—' : 'On Request'
    });
  }

  // Block G: Plots 401 to 510 (Lakeside & Perimeter Luxury Plots)
  for (let i = 401; i <= 510; i++) {
    const col = (i - 401) % 11;
    const row = Math.floor((i - 401) / 11);
    const x = -0.35 + col * 0.030;
    const z = -0.18 + row * 0.035;

    let status: 'Available' | 'Booked' | 'Sold' = 'Available';
    if (i % 5 === 0) status = 'Booked';
    else if (i % 7 === 0) status = 'Sold';

    const frontage = 40;
    const depth = 60;
    const sqft = 2400;

    plots.push({
      id: String(i),
      plotNumber: String(i),
      x: Math.round(x * 1000) / 1000,
      z: Math.round(z * 1000) / 1000,
      status,
      areaSqft: sqft,
      areaFormatted: `${sqft.toLocaleString('en-US')} sq ft`,
      areaSubtext: `(${frontage} × ${depth})`,
      dimensionsText: `${frontage} ft (Frontage) × ${depth} ft`,
      dimensionsShort: `${frontage} ft × ${depth} ft`,
      frontageFeet: frontage,
      depthFeet: depth,
      facing: (i % 2 === 0) ? 'South Facing' : 'East Facing',
      roadWidth: '50 ft Boulevard',
      category: 'Residential Plot',
      block: 'G',
      price: status === 'Sold' ? '—' : 'On Request'
    });
  }

  return plots;
}

export const SAMOOHA_MASTERPLAN_PLOTS: SamoohaPlot[] = generateSamoohaPlots();
