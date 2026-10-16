export interface SubdividedPlot {
  id: number;
  plotNo: string;
  status: 'available' | 'sold' | 'reserved';
  superBuiltUpYds: number;
  netPlotAreaYds: number;
  superBuiltUpSqft: number;
  widthMeters: number;
  lengthMeters: number;
  widthFeet: number;
  lengthFeet: number;
  facing: string;
  priceInLakhs: number;
  formattedPrice: string;
  isCorner: boolean;
  hasTrees: boolean;
  // SVG coordinates: x, y, width, height for grid layout
  x: number;
  y: number;
  w: number;
  h: number;
}
