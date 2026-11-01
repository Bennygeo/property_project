import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CompareService } from '../../../../core/services/compare.service';
import { formatPriceIndian } from '../../../../core/utils/price-helper';

@Component({
  selector: 'app-property-compare-dock',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (compareService.selectedProperties().length > 0) {
      <div class="compare-dock-container" role="region" aria-label="Property comparison dock">
        <div class="dock-inner">
          <!-- Left: Slots for 2 properties -->
          <div class="dock-slots-group">
            <div class="dock-badge-indicator">
              <span class="material-symbols-outlined dock-icon">compare_arrows</span>
              <span class="dock-title-text">Compare ({{ compareService.selectedProperties().length }}/2)</span>
            </div>

            <div class="slots-container">
              <!-- Slot 1 (Left) -->
              @if (compareService.propertyLeft(); as p1) {
                <div class="slot-item filled" [title]="p1.title">
                  <div class="slot-thumb-wrap">
                    <img [src]="p1.imageUrl" [alt]="p1.title" (error)="onImgError($event)" class="slot-thumb" />
                    <span class="slot-pos-tag left-tag">Left</span>
                  </div>
                  <div class="slot-info">
                    <span class="slot-title">{{ p1.title }}</span>
                    <span class="slot-price">{{ formatPriceIndian(p1.price) }}</span>
                  </div>
                  <button type="button" class="btn-slot-remove" (click)="compareService.removeProperty(p1.id)" title="Remove property">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
              }

              <!-- VS Badge -->
              <div class="vs-divider">
                <span class="vs-circle">VS</span>
              </div>

              <!-- Slot 2 (Right) -->
              @if (compareService.propertyRight(); as p2) {
                <div class="slot-item filled" [title]="p2.title">
                  <div class="slot-thumb-wrap">
                    <img [src]="p2.imageUrl" [alt]="p2.title" (error)="onImgError($event)" class="slot-thumb" />
                    <span class="slot-pos-tag right-tag">Right</span>
                  </div>
                  <div class="slot-info">
                    <span class="slot-title">{{ p2.title }}</span>
                    <span class="slot-price">{{ formatPriceIndian(p2.price) }}</span>
                  </div>
                  <button type="button" class="btn-slot-remove" (click)="compareService.removeProperty(p2.id)" title="Remove property">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
              } @else {
                <div class="slot-item empty">
                  <span class="material-symbols-outlined empty-icon">add_circle</span>
                  <div class="empty-info">
                    <span class="empty-title">Select 2nd Property</span>
                    <span class="empty-sub">Pick from cards to compare</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Right: Actions -->
          <div class="dock-actions-group">
            <button 
              type="button" 
              class="btn-dock-compare"
              [class.pulse-active]="compareService.selectedProperties().length === 2"
              (click)="compareService.openCompare()">
              <span class="material-symbols-outlined">compare</span>
              <span>Compare Side-by-Side</span>
              <span class="dock-count-chip">{{ compareService.selectedProperties().length }}/2</span>
            </button>

            <button 
              type="button" 
              class="btn-dock-clear" 
              (click)="compareService.clearAll()"
              title="Clear comparison">
              <span class="material-symbols-outlined">delete_sweep</span>
              <span class="clear-text">Clear</span>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .compare-dock-container {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1040;
      width: calc(100% - 32px);
      max-width: 960px;
      animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translate(-50%, 28px);
      }
      to {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    }

    .dock-inner {
      background: #09131d;
      border: 1px solid rgba(255, 255, 255, 0.16);
      box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(2, 132, 199, 0.25);
      border-radius: 18px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      backdrop-filter: blur(16px);
      color: #ffffff;
    }

    .dock-slots-group {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
      min-width: 0;
    }

    .dock-badge-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 700;
      color: #34d399;
      white-space: nowrap;
      padding-right: 6px;
      border-right: 1px solid rgba(255, 255, 255, 0.12);
    }

    .dock-icon {
      font-size: 18px;
    }

    .slots-container {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }

    .slot-item {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 6px 10px 6px 6px;
      flex: 1;
      min-width: 0;
      max-width: 320px;
      position: relative;
    }

    .slot-item.empty {
      border: 1px dashed rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, 0.02);
      padding: 8px 12px;
    }

    .slot-thumb-wrap {
      position: relative;
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      border-radius: 8px;
      overflow: hidden;
      background: #1e293b;
    }

    .slot-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .slot-pos-tag {
      position: absolute;
      bottom: 2px;
      left: 2px;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 4px;
      text-transform: uppercase;
      line-height: 1.1;
    }

    .left-tag {
      background: #059669;
      color: #ffffff;
    }

    .right-tag {
      background: #059669;
      color: #ffffff;
    }

    .slot-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }

    .slot-title {
      font-size: 12px;
      font-weight: 600;
      color: #f1f5f9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .slot-price {
      font-size: 12px;
      font-weight: 700;
      color: #34d399;
    }

    .btn-slot-remove {
      background: rgba(255, 255, 255, 0.08);
      border: none;
      color: #94a3b8;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .btn-slot-remove:hover {
      background: rgba(239, 68, 68, 0.25);
      color: #ef4444;
    }

    .btn-slot-remove .material-symbols-outlined {
      font-size: 14px;
    }

    .vs-divider {
      flex-shrink: 0;
    }

    .vs-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: -0.5px;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .empty-icon {
      font-size: 24px;
      color: #64748b;
      flex-shrink: 0;
    }

    .empty-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .empty-title {
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
    }

    .empty-sub {
      font-size: 11px;
      color: #64748b;
    }

    .dock-actions-group {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .btn-dock-compare {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 9px 16px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .btn-dock-compare:hover {
      background: linear-gradient(135deg, #047857 0%, #064e3b 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(5, 150, 105, 0.55);
    }

    .btn-dock-compare.pulse-active {
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.35), 0 4px 14px rgba(5, 150, 105, 0.4);
    }

    .btn-dock-compare .material-symbols-outlined {
      font-size: 18px;
    }

    .dock-count-chip {
      background: rgba(255, 255, 255, 0.22);
      padding: 2px 7px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 800;
    }

    .btn-dock-clear {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #94a3b8;
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-dock-clear:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      color: #ef4444;
    }

    .btn-dock-clear .material-symbols-outlined {
      font-size: 16px;
    }

    @media (max-width: 768px) {
      .compare-dock-container {
        bottom: 16px;
        width: calc(100% - 20px);
      }

      .dock-inner {
        flex-direction: column;
        padding: 10px;
        gap: 10px;
      }

      .dock-badge-indicator {
        display: none;
      }

      .dock-slots-group {
        width: 100%;
      }

      .dock-actions-group {
        width: 100%;
        justify-content: stretch;
      }

      .btn-dock-compare {
        flex: 1;
        justify-content: center;
      }
    }
  `]
})
export class PropertyCompareDockComponent {
  readonly compareService = inject(CompareService);
  readonly formatPriceIndian = formatPriceIndian;

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/property-placeholder.jpg';
  }
}

