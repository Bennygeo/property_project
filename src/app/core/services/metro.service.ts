import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { LocalityBenchmark, MetroCityKey, MetroHub } from '../models/metro.model';
import { ArchitecturalCategory } from '../models/category.model';
import { PricingPack } from '../models/pricing-pack.model';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MetroService {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  public readonly activeMetroTab = signal<MetroCityKey>('chennai');

  public metroHubs: MetroHub[] = [
    { cityKey: 'chennai', name: 'Chennai', avgRate: 'Avg ₹8,250/sq.ft', yoyGrowth: '+11.2% YoY', deedCount: '4,820 Deeds' },
    { cityKey: 'bengaluru', name: 'Bengaluru', avgRate: 'Avg ₹9,450/sq.ft', yoyGrowth: '+13.8% YoY', deedCount: '6,140 Deeds' },
    { cityKey: 'hyderabad', name: 'Hyderabad', avgRate: 'Avg ₹7,100/sq.ft', yoyGrowth: '+16.5% YoY', deedCount: '3,980 Deeds' },
    { cityKey: 'mumbai', name: 'Mumbai', avgRate: 'Avg ₹19,200/sq.ft', yoyGrowth: '+7.4% YoY', deedCount: '5,410 Deeds' },
    { cityKey: 'ncr', name: 'Delhi NCR', avgRate: 'Avg ₹7,800/sq.ft', yoyGrowth: '+12.4% YoY', deedCount: '8,060 Deeds' }
  ];

  constructor() {
    this.loadCitiesFromApi();
  }

  public loadCitiesFromApi(): void {
    const url = `${environment.apiUrl}/geo/cities.php`;
    console.info(`[XHR API] Requesting metro cities from MySQL: ${url}`);
    this.http.get<{ success: boolean; data: MetroHub[] }>(url).pipe(
      catchError(err => of(null))
    ).subscribe(res => {
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        console.info(`[XHR API] Successfully loaded ${res.data.length} metro hubs from MySQL Database:`, res.data);
        this.metroHubs = res.data;
      }
    });
  }

  public readonly categories: ArchitecturalCategory[] = [
    { id: 'cat-1', name: 'Luxury Flats', count: '8,420 Listings', icon: 'apartment' },
    { id: 'cat-2', name: 'Gated Villas', count: '2,150 Listings', icon: 'villa' },
    { id: 'cat-3', name: 'Penthouses', count: '640 Listings', icon: 'balcony' },
    { id: 'cat-4', name: 'Commercial', count: '1,890 Spaces', icon: 'domain' },
    { id: 'cat-5', name: 'CMDA Plots', count: '3,410 Deeds', icon: 'terrain' },
    { id: 'cat-6', name: 'Farm Retreats', count: '420 Enclaves', icon: 'yard' }
  ];

  public readonly pricingPacks: PricingPack[] = [
    {
      id: 'pack-1000',
      name: 'Value Pack',
      category: 'Investor Value',
      points: 20,
      bonusPoints: 2,
      totalPoints: 22,
      priceInRupees: 1000,
      pricePerPoint: '₹45.45 / Pt (10% Bonus)',
      subtitle: 'For active buyers scouting across premium villas and residential towers.',
      unlockEstimate: '22 Total Points • Unlocks ~11 Homes',
      features: [
        '20 + 2 Free Bonus Points (22 Pts)',
        'Razorpay Instant Verification',
        '4K Architectural Interior & Balcony Stills',
        'Points Never Expire',
        'Dedicated Priority Concierge Desk'
      ],
      isRecommended: false,
      badgeText: '+2 BONUS POINTS',
      ctaText: 'Buy 22 Pts • ₹1,000'
    },
    {
      id: 'pack-2000',
      name: 'Pro Pack',
      category: 'Most Popular',
      points: 40,
      bonusPoints: 5,
      totalPoints: 45,
      priceInRupees: 2000,
      pricePerPoint: '₹44.44 / Pt (12.5% Bonus)',
      subtitle: 'Comprehensive multi-property due diligence for active investors and buyers.',
      unlockEstimate: '45 Total Points • Unlocks ~22 Homes',
      features: [
        '40 + 5 Free Bonus Points (45 Pts)',
        'Instant 4K Video Tour Unlocking',
        'Full 360° Drone Aerial Boundary Scans',
        'Direct Owner WhatsApp Chat Access',
        'Downloadable SRO & Title Dossiers'
      ],
      isRecommended: true,
      badgeText: 'MOST POPULAR',
      ctaText: 'Buy 45 Pts • ₹2,000'
    },
    {
      id: 'pack-5000',
      name: 'Institutional Vault',
      category: 'Best Value',
      points: 100,
      bonusPoints: 15,
      totalPoints: 115,
      priceInRupees: 5000,
      pricePerPoint: '₹43.47 / Pt (15% Bonus)',
      subtitle: 'For NRI investors, commercial evaluators, and large land parcel portfolios.',
      unlockEstimate: '115 Total Points • Unlocks ~50+ Assets',
      features: [
        '100 + 15 Free Bonus Points (115 Pts)',
        'Full Pan-India Commercial & SCO 4K Tours',
        'High-Resolution Drone Boundary Geo-mapping',
        'Points Never Expire • Lifetime Access',
        'Executive Concierge & Legal SRO Assistance'
      ],
      isRecommended: false,
      badgeText: '+15 BONUS POINTS',
      ctaText: 'Buy 115 Pts • ₹5,000'
    }
  ];

  public readonly cityData: Record<MetroCityKey, LocalityBenchmark[]> = {
    chennai: [
      { loc: "Anna Nagar (East & West)", sub: "Metro Corridor Phase 1", tag: "Prime Residential", rate: "₹14,200", growth: "+8.4%", yield: "3.2%", supply: "482 Units" },
      { loc: "Old Mahabalipuram Rd (OMR)", sub: "Thoraipakkam to Siruseri", tag: "IT & Residential Hub", rate: "₹6,850", growth: "+12.1%", yield: "4.6%", supply: "1,240 Units" },
      { loc: "East Coast Road (ECR)", sub: "Palavakkam to Kovalam", tag: "Plots & Luxury Villas", rate: "₹9,400", growth: "+14.8%", yield: "2.8%", supply: "390 Plots" },
      { loc: "Guindy – Mount Road", sub: "Kathipara Junction Radius", tag: "Grade-A Commercial", rate: "₹16,800", growth: "+6.5%", yield: "6.9%", supply: "118 Spaces" }
    ],
    bengaluru: [
      { loc: "Indiranagar & Defense Colony", sub: "100ft Road / 12th Main", tag: "Luxury Residential", rate: "₹18,500", growth: "+11.2%", yield: "3.8%", supply: "210 Units" },
      { loc: "Whitefield & ITPL", sub: "Hope Farm to Kadugodi", tag: "Residential Tech", rate: "₹8,900", growth: "+15.4%", yield: "4.8%", supply: "1,850 Units" },
      { loc: "Sarjapur Road Corridor", sub: "Carmelaram to Dommasandra", tag: "Villas & Gated", rate: "₹7,600", growth: "+13.1%", yield: "4.2%", supply: "920 Units" },
      { loc: "Outer Ring Road (ORR)", sub: "Bellandur to Marathahalli", tag: "Prime Office Parks", rate: "₹15,200", growth: "+9.0%", yield: "7.2%", supply: "140 Spaces" }
    ],
    hyderabad: [
      { loc: "Gachibowli & Financial District", sub: "Nanakramguda Ring", tag: "High-Rise Apartments", rate: "₹9,200", growth: "+16.8%", yield: "4.5%", supply: "1,450 Units" },
      { loc: "Jubilee Hills & Banjara Hills", sub: "Road No. 36 & 45", tag: "Super Luxury", rate: "₹22,000", growth: "+8.2%", yield: "2.9%", supply: "95 Villas" },
      { loc: "Kondapur & Madhapur", sub: "HITEC City Sector", tag: "Residential Hub", rate: "₹8,400", growth: "+14.0%", yield: "4.9%", supply: "890 Units" },
      { loc: "Kokapet Neopolis", sub: "SEZ & High Density", tag: "Grade-A Commercial", rate: "₹11,500", growth: "+21.4%", yield: "6.8%", supply: "320 Spaces" }
    ],
    mumbai: [
      { loc: "BKC Bandra Kurla Complex", sub: "G-Block Financial Core", tag: "Institutional Prime", rate: "₹48,000", growth: "+7.2%", yield: "7.5%", supply: "88 Spaces" },
      { loc: "Worli Sea Face Corridor", sub: "South Mumbai High-Rise", tag: "Ultra Luxury", rate: "₹62,000", growth: "+5.1%", yield: "2.5%", supply: "140 Units" },
      { loc: "Powai & Kanjurmarg", sub: "Hiranandani Vicinity", tag: "Integrated Township", rate: "₹24,500", growth: "+8.9%", yield: "3.9%", supply: "430 Units" },
      { loc: "Thane West (Ghodbunder)", sub: "Kavesar to Waghbil", tag: "Suburban Residential", rate: "₹12,400", growth: "+10.6%", yield: "3.4%", supply: "1,600 Units" }
    ],
    ncr: [
      { loc: "Golf Course Extension, GGM", sub: "Sector 58 to 67", tag: "Luxury Condos", rate: "₹16,500", growth: "+18.2%", yield: "3.5%", supply: "1,120 Units" },
      { loc: "Dwarka Expressway, GGM", sub: "Sector 102 to 113", tag: "New Development", rate: "₹11,800", growth: "+22.5%", yield: "4.1%", supply: "2,300 Units" },
      { loc: "Noida Expressway", sub: "Sector 128 to 137", tag: "Integrated Sectors", rate: "₹8,200", growth: "+14.3%", yield: "4.4%", supply: "1,800 Units" },
      { loc: "Barakhamba / CP, Delhi", sub: "Central Business Dist", tag: "Heritage Commercial", rate: "₹42,000", growth: "+4.2%", yield: "6.2%", supply: "45 Spaces" }
    ]
  };

  downloadBenchmarkCsv(): void {
    const activeCity = this.activeMetroTab();
    const rows = this.cityData[activeCity];
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Micro-Market,Sub-Corridor,Asset Classification,Avg Rate (INR/sq.ft),YoY Growth,Rental Yield,Verified Supply\n';
    
    rows.forEach(item => {
      csvContent += `"${item.loc}","${item.sub}","${item.tag}","${item.rate}","${item.growth}","${item.yield}","${item.supply}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mannidam-sro-benchmark-${activeCity}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.notificationService.show({
      type: 'success',
      title: 'Benchmark CSV Downloaded',
      message: `Downloaded real-time cadastral indices for ${activeCity.toUpperCase()}.`,
      icon: 'download_done'
    });
  }
}
