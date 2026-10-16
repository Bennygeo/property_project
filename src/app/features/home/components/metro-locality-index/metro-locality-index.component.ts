import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetroService } from '../../../../core/services/metro.service';
import { MetroCityKey } from '../../../../core/models/metro.model';
import { PropertyService } from '../../../../core/services/property.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-metro-locality-index',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="max-w-content metro-index-section" id="cadastral-index">
      <!-- Section Header -->
      <div class="index-section-header">
        <div class="header-titles">
          <span class="editorial-tag text-red">PAN-INDIA CADASTRAL SRO BENCHMARK</span>
          <h2 class="index-title">Metro &amp; Micro-Market Valuation Index</h2>
          <p class="index-subtitle">
            Real-time transaction rate averages, annual capital appreciation, and verified zero-brokerage supply across major economic corridors.
          </p>
        </div>
        <div class="header-live-badge">
          <span class="pulse-indicator"></span>
          <span class="cadastral-live-stamp">SRO REGISTRY SYNC: HOURLY</span>
        </div>
      </div>

      <!-- Google Material Controls Bar: Dropdown + Chips + Live Search Filter -->
      <div class="material-controls-bar">
        <div class="controls-left-group">
          <!-- Material Outlined Dropdown: Metro Jurisdiction Selection -->
          <div 
            class="mat-dropdown-container mat-city-select-field"
            [class.is-open]="isCityDropdownOpen()"
            (click)="$event.stopPropagation()">
            <div 
              class="mat-field-outlined mat-dropdown-trigger"
              role="combobox"
              [attr.aria-expanded]="isCityDropdownOpen()"
              aria-haspopup="listbox"
              aria-label="Select Metro Jurisdiction"
              tabindex="0"
              (click)="toggleCityDropdown()"
              (keydown.enter)="toggleCityDropdown()"
              (keydown.space)="toggleCityDropdown(); $event.preventDefault()">
              <label class="mat-field-label">Jurisdiction / Metro</label>
              <div class="mat-field-control-row">
                <span class="material-symbols-outlined mat-leading-icon">location_city</span>
                <span class="mat-selected-value">{{ getActiveHubName() }}</span>
                <span class="material-symbols-outlined mat-chevron-icon" [class.rotated]="isCityDropdownOpen()">expand_more</span>
              </div>
            </div>

            @if (isCityDropdownOpen()) {
              <div class="mat-dropdown-panel" role="listbox" aria-label="Metro Jurisdictions">
                <div class="mat-dropdown-panel-inner">
                  @for (hub of metroService.metroHubs; track hub.cityKey) {
                    <div 
                      class="mat-dropdown-item"
                      role="option"
                      [attr.aria-selected]="metroService.activeMetroTab() === hub.cityKey"
                      [class.selected]="metroService.activeMetroTab() === hub.cityKey"
                      (click)="selectCity(hub.cityKey)">
                      <div class="item-left">
                        <span class="material-symbols-outlined item-icon">domain</span>
                        <div class="item-text-group">
                          <span class="item-label">{{ hub.name }}</span>
                          <span class="item-sub">{{ hub.avgRate }} • {{ hub.yoyGrowth }}</span>
                        </div>
                      </div>
                      @if (metroService.activeMetroTab() === hub.cityKey) {
                        <span class="material-symbols-outlined item-check">check</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Material 3 Quick Filter Chips -->
          <div class="mat-chips-group" role="tablist" aria-label="Quick Metro Selection">
            @for (hub of metroService.metroHubs; track hub.cityKey) {
              <button 
                type="button" 
                role="tab"
                class="mat-chip" 
                [class.active]="metroService.activeMetroTab() === hub.cityKey"
                [attr.aria-selected]="metroService.activeMetroTab() === hub.cityKey"
                (click)="onSelectCity(hub.cityKey)">
                <span class="material-symbols-outlined chip-icon">
                  {{ metroService.activeMetroTab() === hub.cityKey ? 'check_circle' : 'apartment' }}
                </span>
                <span>{{ hub.name }}</span>
                <span class="chip-badge">{{ hub.yoyGrowth }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Material Outlined Search Text Input: Micro-Market Filter -->
        <div class="mat-field-outlined mat-search-field">
          <label for="micro-market-search" class="mat-field-label">Filter Micro-Markets</label>
          <div class="mat-field-control-row">
            <span class="material-symbols-outlined mat-leading-icon">search</span>
            <input 
              id="micro-market-search"
              type="text" 
              class="mat-input-text" 
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
              placeholder="Search locality, sector or corridor..."
              aria-label="Filter micro markets">
            @if (searchQuery()) {
              <button 
                type="button" 
                class="mat-clear-btn" 
                (click)="clearSearch()" 
                aria-label="Clear filter search">
                <span class="material-symbols-outlined">cancel</span>
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Material 3 Styled Table Container -->
      <div class="table-frame">
        <table class="benchmark-table">
          <thead>
            <tr>
              <th class="th-left">Micro-Market</th>
              <th class="th-left">Asset Classification</th>
              <th class="th-right">Avg Rate (₹/sq.ft)</th>
              <th class="th-right">YoY Growth</th>
              <th class="th-right">Rental Yield</th>
              <th class="th-center">Verified Supply</th>
              <th class="th-right">Action</th>
            </tr>
          </thead>
          <tbody>
            @for (row of filteredRows(); track row.loc) {
              <tr class="table-row">
                <td class="td-market">
                  <div class="market-name">{{ row.loc }}</div>
                  <span class="sub-corridor">{{ row.sub }}</span>
                </td>
                <td class="td-tag">
                  <span class="table-tag-pill">{{ row.tag }}</span>
                </td>
                <td class="td-rate font-mono">{{ row.rate }}</td>
                <td class="td-growth font-mono">{{ row.growth }}</td>
                <td class="td-yield font-mono">{{ row.yield }}</td>
                <td class="td-supply font-mono">{{ row.supply }}</td>
                <td class="td-action">
                  <button 
                    type="button"
                    class="btn-table-view mat-btn-table" 
                    (click)="onViewMicroMarket(row.loc)">
                    <span>View Dossier</span>
                    <span class="material-symbols-outlined">arrow_forward</span>
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="table-empty-cell">
                  <div class="empty-state-box">
                    <span class="material-symbols-outlined empty-icon">search_off</span>
                    <p class="empty-text">No micro-markets found matching "<strong>{{ searchQuery() }}</strong>" in {{ metroService.activeMetroTab() | uppercase }}.</p>
                    <button type="button" class="mat-chip active" (click)="clearSearch()">
                      <span class="material-symbols-outlined chip-icon">restart_alt</span>
                      Reset Search Filter
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- CSV Export Bar -->
      <div class="csv-bar">
        <span class="csv-info">Complete raw registry sale deed price averages across 180 Indian sub-districts and SRO circles.</span>
        <button type="button" class="btn-download-csv mat-download-btn" (click)="metroService.downloadBenchmarkCsv()">
          <span class="material-symbols-outlined">download</span>
          <span>Download SRO Benchmark CSV</span>
        </button>
      </div>
    </section>
  `,
  styles: [`
    .metro-index-section {
      padding-top: 3.5rem;
      padding-bottom: 4rem;
      background: #ffffff;
      border-top: 1px solid var(--hairline-border);
    }
    .index-section-header {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.75rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--hairline-border);
    }
    @media (min-width: 768px) {
      .index-section-header {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
      }
    }
    .text-red {
      color: var(--brand-red);
    }
    .index-title {
      font-size: 1.625rem;
      font-weight: 800;
      color: var(--text-slate-950);
      letter-spacing: -0.02em;
      margin-top: 0.25rem;
    }
    @media (min-width: 640px) {
      .index-title {
        font-size: 1.875rem;
      }
    }
    .index-subtitle {
      font-size: 0.875rem;
      color: var(--text-slate-600);
      margin-top: 0.25rem;
      max-width: 720px;
    }
    .header-live-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      padding: 6px 14px;
      border-radius: 9999px;
      border: 1px solid #e2e8f0;
      align-self: flex-start;
    }
    @media (min-width: 768px) {
      .header-live-badge {
        align-self: auto;
      }
    }
    .pulse-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
      animation: pulseGreen 2s infinite;
    }
    @keyframes pulseGreen {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.7; }
    }
    .cadastral-live-stamp {
      font-size: 11px;
      font-family: ui-monospace, monospace;
      color: var(--text-slate-700);
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .material-controls-bar {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    @media (min-width: 1024px) {
      .material-controls-bar {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    .controls-left-group {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    @media (min-width: 640px) {
      .controls-left-group {
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
      }
    }
    .mat-city-select-field {
      min-width: 250px;
    }
    .mat-chips-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .chip-badge {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
      background: #f1f5f9;
      color: #047857;
      font-family: ui-monospace, monospace;
      font-weight: 700;
      transition: all 0.15s ease;
    }
    .mat-chip.active .chip-badge {
      background: rgba(199, 52, 52, 0.15);
      color: var(--brand-red);
    }
    .mat-search-field {
      min-width: 300px;
    }
    .mat-clear-btn {
      background: none;
      border: none;
      padding: 0;
      display: inline-flex;
      align-items: center;
      color: #94a3b8;
      cursor: pointer;
      transition: color 0.15s ease;
    }
    .mat-clear-btn:hover {
      color: var(--brand-red);
    }
    .mat-clear-btn span {
      font-size: 18px;
    }
    .table-frame {
      width: 100%;
      overflow-x: auto;
      border-radius: 0.75rem;
      border: 1.5px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      background: #ffffff;
    }
    .benchmark-table {
      width: 100%;
      text-align: left;
      border-collapse: collapse;
      font-size: 14px;
      min-width: 780px;
    }
    thead tr {
      background: #f8fafc;
      color: var(--text-slate-700);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
      border-bottom: 1.5px solid #e2e8f0;
    }
    th {
      padding: 0.875rem 1rem;
      font-weight: 700;
    }
    .th-left { text-align: left; }
    .th-right { text-align: right; }
    .th-center { text-align: center; }
    tbody tr {
      border-bottom: 1px solid var(--hairline-border);
      transition: background 0.15s;
    }
    tbody tr:last-child {
      border-bottom: none;
    }
    tbody tr:hover {
      background: #f8fafc;
    }
    td {
      padding: 0.875rem 1rem;
    }
    .td-market .market-name {
      font-weight: 700;
      color: var(--text-slate-950);
    }
    .td-market .sub-corridor {
      display: block;
      font-size: 12px;
      font-family: ui-monospace, monospace;
      color: var(--text-slate-500);
      margin-top: 2px;
    }
    .td-tag {
      font-size: 12px;
    }
    .table-tag-pill {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      background: #f1f5f9;
      color: var(--text-slate-700);
      border: 1px solid #e2e8f0;
      letter-spacing: 0.02em;
    }
    .td-rate {
      text-align: right;
      font-family: ui-monospace, monospace;
      font-weight: 700;
      color: var(--text-slate-950);
    }
    .td-growth {
      text-align: right;
      font-family: ui-monospace, monospace;
      color: #047857;
      font-weight: 700;
    }
    .td-yield {
      text-align: right;
      font-family: ui-monospace, monospace;
      color: var(--text-slate-700);
      font-weight: 600;
    }
    .td-supply {
      text-align: center;
      font-family: ui-monospace, monospace;
      color: var(--text-slate-600);
    }
    .td-action {
      text-align: right;
    }
    .mat-btn-table {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      color: var(--brand-red);
      background: var(--brand-red-subtle);
      border: 1px solid var(--brand-red-border);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .mat-btn-table:hover {
      background: var(--brand-red);
      color: #ffffff;
      box-shadow: 0 2px 4px rgba(199, 52, 52, 0.25);
      transform: translateX(2px);
    }
    .mat-btn-table span.material-symbols-outlined {
      font-size: 14px;
      transition: transform 0.15s ease;
    }
    .mat-btn-table:hover span.material-symbols-outlined {
      transform: translateX(2px);
    }
    .table-empty-cell {
      text-align: center;
      padding: 3.5rem 1rem;
    }
    .empty-state-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    .empty-icon {
      font-size: 38px;
      color: #94a3b8;
    }
    .empty-text {
      font-size: 14px;
      color: var(--text-slate-600);
    }
    .csv-bar {
      margin-top: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      font-size: 13px;
      color: var(--text-slate-600);
      font-weight: 500;
    }
    @media (min-width: 640px) {
      .csv-bar {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    .mat-download-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      background: #ffffff;
      border: 1.5px solid var(--brand-red);
      color: var(--brand-red);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(199, 52, 52, 0.08);
    }
    .mat-download-btn:hover {
      background: var(--brand-red);
      color: #ffffff;
      box-shadow: 0 4px 10px rgba(199, 52, 52, 0.25);
    }
    .mat-download-btn span.material-symbols-outlined {
      font-size: 18px;
    }
  `]
})
export class MetroLocalityIndexComponent {
  readonly metroService = inject(MetroService);
  readonly propertyService = inject(PropertyService);
  readonly notificationService = inject(NotificationService);

  readonly searchQuery = signal<string>('');

  readonly filteredRows = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const rows = this.metroService.cityData[this.metroService.activeMetroTab()] || [];
    if (!query) {
      return rows;
    }
    return rows.filter(r => 
      r.loc.toLowerCase().includes(query) ||
      r.sub.toLowerCase().includes(query) ||
      r.tag.toLowerCase().includes(query)
    );
  });

  readonly isCityDropdownOpen = signal<boolean>(false);

  toggleCityDropdown(): void {
    this.isCityDropdownOpen.update(v => !v);
  }

  selectCity(cityKey: string): void {
    this.onSelectCity(cityKey);
    this.isCityDropdownOpen.set(false);
  }

  getActiveHubName(): string {
    const hub = this.metroService.metroHubs.find(h => h.cityKey === this.metroService.activeMetroTab());
    return hub ? `${hub.name} • ${hub.avgRate}` : 'Select Jurisdiction';
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.isCityDropdownOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isCityDropdownOpen.set(false);
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  onSelectCity(cityKey: string): void {
    this.metroService.activeMetroTab.set(cityKey as MetroCityKey);
    this.notificationService.show({
      type: 'info',
      title: 'Jurisdiction Filter',
      message: `Cadastral registry index updated for ${cityKey.toUpperCase()}.`,
      icon: 'insights'
    });
  }

  onViewMicroMarket(locality: string): void {
    this.propertyService.searchQuery.set(locality);
    this.notificationService.show({
      type: 'info',
      title: 'Micro-Market Filtered',
      message: `Showing properties in ${locality}.`,
      icon: 'filter_alt'
    });
    // Scroll to search or properties section
    document.getElementById('featured-section')?.scrollIntoView({ behavior: 'smooth' });
  }
}
