export interface MetroHub {
  cityKey: string;
  name: string;
  avgRate: string;
  yoyGrowth: string;
  deedCount: string;
}

export interface LocalityBenchmark {
  loc: string;
  sub: string;
  tag: string;
  rate: string;
  growth: string;
  yield: string;
  supply: string;
}

export type MetroCityKey = 'chennai' | 'bengaluru' | 'hyderabad' | 'mumbai' | 'ncr';
