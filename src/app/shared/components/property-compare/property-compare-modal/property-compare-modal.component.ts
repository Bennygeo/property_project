import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CompareService } from '../../../../core/services/compare.service';
import { formatPriceIndian } from '../../../../core/utils/price-helper';

@Component({
  selector: 'app-property-compare-modal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (compareService.isCompareModalOpen()) {
      <div class="compare-backdrop" (click)="onBackdropClick($event)">
        <div class="compare-modal-card" role="dialog" aria-modal="true" aria-labelledby="compare-modal-title">
          
          <!-- MODAL HEADER -->
          <div class="modal-header">
            <div class="header-left">
            </div>

            <div class="header-right-controls">
              <!-- Show Differences Only Toggle -->
              <label class="diff-toggle-wrap" title="Toggle to show only specifications that differ between both properties">
                <input 
                  type="checkbox" 
                  [checked]="compareService.showOnlyDifferences()" 
                  (change)="compareService.toggleShowOnlyDifferences()" />
                <span class="toggle-slider"></span>
                <span class="toggle-label">
                  <span class="material-symbols-outlined" style="font-size: 15px;">tune</span>
                  <span>Differences Only</span>
                </span>
              </label>

              <!-- Swap Button -->
              @if (compareService.propertyRight()) {
                <button type="button" class="btn-swap" (click)="compareService.swapProperties()" title="Swap Left and Right properties">
                  <span class="material-symbols-outlined">swap_horiz</span>
                  <span class="swap-text">Swap</span>
                </button>
              }

              <!-- Close Button -->
              <button type="button" class="btn-modal-close" (click)="compareService.closeCompare()" title="Close comparison (Esc)">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <!-- MODAL BODY (Scrollable) -->
          <div class="modal-body-scrollable">

            <!-- PROPERTIES HERO COMPARISON (LEFT VS RIGHT) -->
            <div class="heroes-compare-grid">
              
              <!-- LEFT PROPERTY (Slot 1) -->
              @if (compareService.propertyLeft(); as p1) {
                <div class="hero-col hero-left">
                  <div class="hero-col-header">
                    <span class="col-indicator-badge left-indicator">
                      <span class="material-symbols-outlined badge-ic">west</span>
                      <span>Property 1 (Left)</span>
                    </span>
                    <button type="button" class="btn-remove-prop" (click)="compareService.removeProperty(p1.id)" title="Remove property">
                      <span class="material-symbols-outlined">delete</span>
                      <span>Remove</span>
                    </button>
                  </div>

                  <div class="hero-card-content">
                    <div class="hero-img-wrap" [routerLink]="['/property', p1.id]" (click)="compareService.closeCompare()">
                      <img [src]="p1.imageUrl" [alt]="p1.title" (error)="onImgError($event)" class="hero-img" />
                      <div class="hero-overlay-tag">
                        <span>{{ p1.propertyType }}</span>
                        @if (p1.badges?.rera) {
                          <span class="rera-pill">{{ p1.badges.rera }}</span>
                        }
                      </div>
                    </div>

                    <div class="hero-details">
                      <div class="hero-price-row">
                        <span class="hero-price">{{ formatPriceIndian(p1.price) }}</span>
                        <span class="hero-rate">{{ p1.pricePerSqFt }}</span>
                      </div>
                      
                      <h3 class="hero-title">
                        <a [routerLink]="['/property', p1.id]" (click)="compareService.closeCompare()">{{ p1.title }}</a>
                      </h3>

                      <p class="hero-locality">
                        <span class="material-symbols-outlined loc-ic">location_on</span>
                        <span>{{ p1.locality }}, {{ p1.city }}</span>
                        @if (p1.distanceKm !== undefined && p1.distanceKm !== null) {
                          <span class="hero-dist-chip">{{ p1.distanceKm }} km away</span>
                        }
                      </p>

                      @if (p1.developerName || p1.masterDetails?.developer || p1.developer?.name) {
                        <div class="hero-builder">
                          <span class="material-symbols-outlined">corporate_fare</span>
                          <span>By {{ p1.developerName || p1.masterDetails?.developer || p1.developer?.name }}</span>
                        </div>
                      }

                      <div class="hero-actions">
                        <a [routerLink]="['/property', p1.id]" (click)="compareService.closeCompare()" class="btn-hero-primary">
                          <span class="material-symbols-outlined">visibility</span>
                          <span>View</span>
                        </a>

                      </div>
                    </div>
                  </div>
                </div>
              }

              <!-- CENTRAL "VS" DIVIDER -->
              <div class="central-vs-column">
                <div class="vs-circle-large">VS</div>
                <div class="vs-line"></div>
              </div>

              <!-- RIGHT PROPERTY (Slot 2) -->
              @if (compareService.propertyRight(); as p2) {
                <div class="hero-col hero-right">
                  <div class="hero-col-header">
                    <span class="col-indicator-badge right-indicator">
                      <span>Property 2 (Right)</span>
                      <span class="material-symbols-outlined badge-ic">east</span>
                    </span>
                    <button type="button" class="btn-remove-prop" (click)="compareService.removeProperty(p2.id)" title="Remove property">
                      <span class="material-symbols-outlined">delete</span>
                      <span>Remove</span>
                    </button>
                  </div>

                  <div class="hero-card-content">
                    <div class="hero-img-wrap" [routerLink]="['/property', p2.id]" (click)="compareService.closeCompare()">
                      <img [src]="p2.imageUrl" [alt]="p2.title" (error)="onImgError($event)" class="hero-img" />
                      <div class="hero-overlay-tag">
                        <span>{{ p2.propertyType }}</span>
                        @if (p2.badges?.rera) {
                          <span class="rera-pill">{{ p2.badges.rera }}</span>
                        }
                      </div>
                    </div>

                    <div class="hero-details">
                      <div class="hero-price-row">
                        <span class="hero-price">{{ formatPriceIndian(p2.price) }}</span>
                        <span class="hero-rate">{{ p2.pricePerSqFt }}</span>
                      </div>
                      
                      <h3 class="hero-title">
                        <a [routerLink]="['/property', p2.id]" (click)="compareService.closeCompare()">{{ p2.title }}</a>
                      </h3>

                      <p class="hero-locality">
                        <span class="material-symbols-outlined loc-ic">location_on</span>
                        <span>{{ p2.locality }}, {{ p2.city }}</span>
                        @if (p2.distanceKm !== undefined && p2.distanceKm !== null) {
                          <span class="hero-dist-chip">{{ p2.distanceKm }} km away</span>
                        }
                      </p>

                      @if (p2.developerName || p2.masterDetails?.developer || p2.developer?.name) {
                        <div class="hero-builder">
                          <span class="material-symbols-outlined">corporate_fare</span>
                          <span>By {{ p2.developerName || p2.masterDetails?.developer || p2.developer?.name }}</span>
                        </div>
                      }

                      <div class="hero-actions">
                        <a [routerLink]="['/property', p2.id]" (click)="compareService.closeCompare()" class="btn-hero-primary">
                          <span class="material-symbols-outlined">visibility</span>
                          <span>View</span>
                        </a>

                      </div>
                    </div>
                  </div>
                </div>
              } @else {
                <!-- Empty Right Slot Placeholder -->
                <div class="hero-col hero-empty-col">
                  <div class="empty-slot-card">
                    <div class="empty-slot-icon-wrap">
                      <span class="material-symbols-outlined empty-slot-icon">add_circle_outline</span>
                    </div>
                    <h3 class="empty-slot-title">Add Second Property to Compare</h3>
                    <p class="empty-slot-desc">
                      Browse properties and click the "Compare" button on any card to place it side-by-side with Property 1.
                    </p>
                    <button type="button" class="btn-browse-more" (click)="compareService.closeCompare()">
                      <span class="material-symbols-outlined">search</span>
                      <span>Browse More Properties</span>
                    </button>
                  </div>
                </div>
              }

            </div>

            <!-- CORE DIFFERENCES SUMMARY BOX -->
            @if (compareService.propertyLeft() && compareService.propertyRight()) {
              <div class="differences-summary-section">
                <div class="diff-summary-header">
                  <div class="diff-header-title">
                    <span class="material-symbols-outlined diff-title-icon">auto_awesome</span>
                    <h3>Core Differences &amp; Value Analysis</h3>
                  </div>
                  <span class="diff-count-badge">
                    {{ compareService.coreDifferences().length }} Differences Detected
                  </span>
                </div>

                @if (compareService.coreDifferences().length > 0) {
                  <div class="differences-cards-grid">
                    @for (diff of compareService.coreDifferences(); track diff.title) {
                      <div class="diff-card" [class.winner-left]="diff.winnerIndex === 0" [class.winner-right]="diff.winnerIndex === 1">
                        <div class="diff-card-top">
                          <span class="diff-card-title">{{ diff.title }}</span>
                          <span class="diff-advantage-badge" [class.badge-left]="diff.winnerIndex === 0" [class.badge-right]="diff.winnerIndex === 1">
                            @if (diff.winnerIndex === 0) {
                              <span class="material-symbols-outlined">arrow_back</span>
                              <span>Left Advantage: {{ diff.badgeText }}</span>
                            } @else if (diff.winnerIndex === 1) {
                              <span>Right Advantage: {{ diff.badgeText }}</span>
                              <span class="material-symbols-outlined">arrow_forward</span>
                            } @else {
                              <span>{{ diff.badgeText }}</span>
                            }
                          </span>
                        </div>
                        <p class="diff-card-summary">{{ diff.summary }}</p>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="diff-all-identical">
                    <span class="material-symbols-outlined">task_alt</span>
                    <span>Both properties share very similar core price points, dimensions, and sanction specs.</span>
                  </div>
                }
              </div>
            }

            <!-- DETAILED SPECIFICATIONS MATRIX TABLE (SIDE-BY-SIDE) -->
            <div class="specs-matrix-section">
              <div class="specs-matrix-header">
                <h3 class="specs-section-title">
                  <span class="material-symbols-outlined">format_list_bulleted</span>
                  <span>Detailed Specifications Matrix</span>
                </h3>
                @if (compareService.showOnlyDifferences()) {
                  <span class="active-filter-alert">
                    <span class="material-symbols-outlined">filter_alt</span>
                    Showing only {{ compareService.filteredComparisonSpecs().length }} differing attributes
                  </span>
                }
              </div>

              <div class="table-responsive-wrapper">
                <table class="compare-table">
                  <thead>
                    <tr>
                      <th class="th-spec-name">Attribute / Specification</th>
                      <th class="th-prop-col th-left">
                        <div class="th-content">
                          <span class="pos-dot left-dot"></span>
                          <span>{{ compareService.propertyLeft()?.title || 'Property 1' }}</span>
                        </div>
                      </th>
                      <th class="th-prop-col th-right">
                        <div class="th-content">
                          <span class="pos-dot right-dot"></span>
                          <span>{{ compareService.propertyRight()?.title || 'Property 2' }}</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of compareService.filteredComparisonSpecs(); track row.category + row.label) {
                      <tr [class.row-diff]="row.isDifferent" [class.row-same]="!row.isDifferent">
                        <!-- Attribute Name -->
                        <td class="td-label">
                          <div class="label-wrapper">
                            <span class="material-symbols-outlined spec-icon">{{ row.icon }}</span>
                            <div class="label-text-box">
                              <span class="spec-label-title">{{ row.label }}</span>
                              <span class="spec-category-tag">{{ row.category }}</span>
                            </div>
                            @if (row.isDifferent) {
                              <span class="diff-dot-pill" title="Values differ">Diff</span>
                            }
                          </div>
                        </td>

                        <!-- Property 1 Value (Left) -->
                        <td class="td-value td-left" [class.has-advantage]="row.advantageIndex === 0">
                          <div class="val-container">
                            <span class="value-text">{{ row.value1 }}</span>
                            @if (row.advantageIndex === 0 && row.advantageLabel) {
                              <span class="adv-badge" [title]="row.advantageLabel">
                                <span class="material-symbols-outlined adv-star">verified</span>
                                <span>{{ row.advantageLabel }}</span>
                              </span>
                            }
                          </div>
                        </td>

                        <!-- Property 2 Value (Right) -->
                        <td class="td-value td-right" [class.has-advantage]="row.advantageIndex === 1">
                          <div class="val-container">
                            <span class="value-text">{{ row.value2 }}</span>
                            @if (row.advantageIndex === 1 && row.advantageLabel) {
                              <span class="adv-badge" [title]="row.advantageLabel">
                                <span class="material-symbols-outlined adv-star">verified</span>
                                <span>{{ row.advantageLabel }}</span>
                              </span>
                            }
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

            </div>

          </div>

          <!-- MODAL FOOTER -->
          <div class="modal-footer">
            <div class="footer-left-info">
              <span class="material-symbols-outlined">info</span>
              <span>Need help deciding? Contact our real estate advisors for title deed verification and site inspections.</span>
            </div>
            <div class="footer-actions">
              <a 
                [href]="comparisonWhatsAppUrl" 
                target="_blank" 
                rel="noopener" 
                class="btn-footer-whatsapp" 
                title="Chat on WhatsApp">
                <span class="material-symbols-outlined">chat</span>
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .compare-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.78);
      backdrop-filter: blur(8px);
      z-index: 1060;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.22s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .compare-modal-card {
      background: #ffffff;
      border-radius: 20px;
      box-shadow: none !important;
      width: 100%;
      max-width: 1160px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      animation: zoomIn 0.24s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes zoomIn {
      from {
        opacity: 0;
        transform: scale(0.96) translateY(12px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    /* HEADER */
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      gap: 16px;
    }

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.8px;
      color: #5e8f72;
      text-transform: uppercase;
    }

    .header-icon {
      font-size: 16px;
    }

    .modal-title {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-sub {
      font-size: 14px;
      font-weight: 500;
      color: #64748b;
    }

    .header-right-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Differences Only Toggle */
    .diff-toggle-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 6px 12px;
      border-radius: 9999px;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
    }

    .diff-toggle-wrap:hover {
      border-color: #5e8f72;
      background: #eef6f1;
    }

    .diff-toggle-wrap input {
      display: none;
    }

    .toggle-slider {
      width: 32px;
      height: 18px;
      background: #cbd5e1;
      border-radius: 9999px;
      position: relative;
      transition: background 0.2s ease;
    }

    .toggle-slider::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 14px;
      height: 14px;
      background: #ffffff;
      border-radius: 50%;
      transition: transform 0.2s ease;
      box-shadow: none;
    }

    .diff-toggle-wrap input:checked + .toggle-slider {
      background: #5e8f72;
    }

    .diff-toggle-wrap input:checked + .toggle-slider::after {
      transform: translateX(14px);
    }

    .toggle-label {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .btn-swap {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 6px 12px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-swap:hover {
      border-color: #5e8f72;
      color: #5e8f72;
      background: #eef6f1;
    }

    .btn-swap .material-symbols-outlined {
      font-size: 16px;
    }

    .btn-modal-close {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .btn-modal-close:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    /* SCROLLABLE BODY */
    .modal-body-scrollable {
      padding: 20px 24px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* HEROES COMPARISON GRID (LEFT VS RIGHT) */
    .heroes-compare-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 16px;
      align-items: stretch;
    }

    .hero-col {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: none !important;
      transition: border-color 0.2s ease;
    }

    .hero-left {
      /* Clean flat border */
    }

    .hero-right {
      /* Clean flat border */
    }

    .hero-col-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: #f8fafc;
      border-bottom: 1px solid #f1f5f9;
    }

    .col-indicator-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }

    .left-indicator {
      background: #f1f5f9;
      color: #334155;
    }

    .right-indicator {
      background: #e5f7ec;
      color: #2c4938;
    }

    .badge-ic {
      font-size: 13px;
    }

    .btn-remove-prop {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.15s ease;
    }

    .btn-remove-prop:hover {
      background: #fee2e2;
      color: #dc2626;
    }

    .btn-remove-prop .material-symbols-outlined {
      font-size: 14px;
    }

    .hero-card-content {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
    }

    .hero-img-wrap {
      width: 100%;
      height: 160px;
      border-radius: 10px;
      overflow: hidden;
      position: relative;
      cursor: default;
      background: #f1f5f9;
    }

    .hero-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .hero-img-wrap:hover .hero-img {
      transform: none;
    }

    .hero-overlay-tag {
      position: absolute;
      bottom: 8px;
      left: 8px;
      display: flex;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #ffffff;
      background: rgba(15, 23, 42, 0.82);
      padding: 3px 8px;
      border-radius: 6px;
      backdrop-filter: blur(4px);
    }

    .rera-pill {
      color: #5e8f72;
    }

    .hero-details {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }

    .hero-price-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .hero-price {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }

    .hero-rate {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
    }

    .hero-title {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      line-height: 1.3;
    }

    .hero-title a {
      color: #0f172a;
      text-decoration: none;
    }

    .hero-title a:hover {
      color: #5e8f72;
    }

    .hero-locality {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #475569;
    }

    .loc-ic {
      font-size: 14px;
      color: #5e8f72;
    }

    .hero-dist-chip {
      background: #e5f7ec;
      color: #2c4938;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 11px;
    }

    .hero-builder {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #3d684e;
    }

    .hero-builder .material-symbols-outlined {
      font-size: 13px;
    }

    .hero-actions {
      display: flex;
      gap: 8px;
      margin-top: auto;
      padding-top: 8px;
    }

    .btn-hero-primary {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: #5e8f72;
      color: #ffffff;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      transition: background 0.15s ease;
    }

    .btn-hero-primary:hover {
      background: #497259;
    }

    .btn-hero-primary .material-symbols-outlined {
      font-size: 15px;
    }



    /* CENTRAL VS DIVIDER */
    .central-vs-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      position: relative;
    }

    .vs-circle-large {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #0f172a;
      color: #72a987;
      font-weight: 900;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: none !important;
      border: 3px solid #ffffff;
      z-index: 2;
    }

    .vs-line {
      position: absolute;
      top: 10%;
      bottom: 10%;
      width: 2px;
      background: #e2e8f0;
      z-index: 1;
    }

    /* EMPTY SLOT (RIGHT) */
    .hero-empty-col {
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-slot-card {
      padding: 30px 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      max-width: 320px;
    }

    .empty-slot-icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
    }

    .empty-slot-icon {
      font-size: 32px;
    }

    .empty-slot-title {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
    }

    .empty-slot-desc {
      margin: 0;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }

    .btn-browse-more {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #5e8f72;
      color: #ffffff;
      border: none;
      padding: 9px 16px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-browse-more:hover {
      background: #497259;
    }

    .btn-browse-more .material-symbols-outlined {
      font-size: 16px;
    }

    /* CORE DIFFERENCES SUMMARY BOX */
    .differences-summary-section {
      background: linear-gradient(135deg, #f2f8f4 0%, #e5f7ec 100%);
      border: 1px solid #c1dccb;
      border-radius: 16px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .diff-summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .diff-header-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .diff-title-icon {
      font-size: 20px;
      color: #5e8f72;
    }

    .diff-header-title h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }

    .diff-count-badge {
      background: #ffffff;
      border: 1px solid #c1dccb;
      color: #2c4938;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 9999px;
    }

    .differences-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }

    .diff-card {
      background: #ffffff;
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      border: 1px solid #e2e8f0;
      box-shadow: none !important;
      transition: transform 0.15s ease;
    }

    .diff-card:hover {
      transform: none;
    }

    .diff-card.winner-left {
      /* border removed */
    }

    .diff-card.winner-right {
      /* border removed */
    }

    .diff-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .diff-card-title {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }

    .diff-advantage-badge {
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      white-space: nowrap;
    }

    .diff-advantage-badge .material-symbols-outlined {
      font-size: 11px;
    }

    .badge-left {
      background: #f1f5f9;
      color: #334155;
    }

    .badge-right {
      background: #e5f7ec;
      color: #2c4938;
    }

    .diff-card-summary {
      margin: 0;
      font-size: 12px;
      color: #475569;
      line-height: 1.4;
    }

    .diff-all-identical {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #2c4938;
      font-weight: 600;
      padding: 8px 12px;
      background: #e5f7ec;
      border-radius: 8px;
    }

    /* SPECS MATRIX SECTION */
    .specs-matrix-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .specs-matrix-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .specs-section-title {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .specs-section-title .material-symbols-outlined {
      color: #5e8f72;
      font-size: 20px;
    }

    .active-filter-alert {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #2c4938;
      background: #e5f7ec;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .active-filter-alert .material-symbols-outlined {
      font-size: 14px;
    }

    .table-responsive-wrapper {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
    }

    .compare-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }

    .compare-table thead tr {
      background: #f1f5f9;
      border-bottom: 2px solid #cbd5e1;
    }

    .th-spec-name {
      padding: 12px 16px;
      width: 32%;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.6px;
    }

    .th-prop-col {
      padding: 12px 16px;
      width: 34%;
      font-weight: 700;
      color: #0f172a;
    }

    .th-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pos-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .left-dot {
      background: #64748b;
    }

    .right-dot {
      background: #5e8f72;
    }

    .compare-table tbody tr {
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.15s ease;
    }

    .compare-table tbody tr:hover {
      /* Hover effect removed */
    }

    /* Highlight differing rows */
    .row-diff {
      background: #fafcfe;
    }

    .td-label {
      padding: 12px 16px;
      vertical-align: middle;
    }

    .label-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .spec-icon {
      font-size: 18px;
      color: #64748b;
      flex-shrink: 0;
    }

    .label-text-box {
      display: flex;
      flex-direction: column;
    }

    .spec-label-title {
      font-weight: 700;
      color: #1e293b;
    }

    .spec-category-tag {
      font-size: 10px;
      color: #94a3b8;
      font-weight: 600;
    }

    .diff-dot-pill {
      margin-left: auto;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      background: #fef3c7;
      color: #d97706;
      padding: 1px 5px;
      border-radius: 4px;
    }

    .td-value {
      padding: 12px 16px;
      vertical-align: middle;
      color: #334155;
    }

    .val-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .value-text {
      font-weight: 600;
      color: #1e293b;
    }

    .has-advantage {
      background: rgba(34, 197, 94, 0.06);
    }

    .adv-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      background: #e5f7ec;
      color: #2c4938;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }

    .adv-star {
      font-size: 12px;
    }

    /* FOOTER */
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 24px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      gap: 16px;
    }

    .footer-left-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #64748b;
    }

    .footer-left-info .material-symbols-outlined {
      font-size: 16px;
      color: #5e8f72;
    }

    .btn-footer-whatsapp {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #25d366;
      color: #ffffff;
      border: none;
      padding: 9px 20px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      box-shadow: none !important;
      transition: background 0.15s ease;
    }

    .btn-footer-whatsapp:hover {
      background: #1eb857;
      box-shadow: none !important;
    }

    .btn-footer-whatsapp .material-symbols-outlined {
      font-size: 18px;
    }

    @media (max-width: 900px) {
      .heroes-compare-grid {
        grid-template-columns: 1fr;
      }

      .central-vs-column {
        display: none;
      }

      .th-spec-name {
        width: 40%;
      }

      .th-prop-col {
        width: 30%;
      }
    }
  `]
})
export class PropertyCompareModalComponent {
  readonly formatPriceIndian = formatPriceIndian;
  readonly compareService = inject(CompareService);

  get comparisonWhatsAppUrl(): string {
    const p1 = this.compareService.propertyLeft();
    const p2 = this.compareService.propertyRight();
    let text = 'Hi Find a Plot, I am comparing properties: ';
    if (p1 && p2) {
      text += `${p1.title} (${p1.id}) vs ${p2.title} (${p2.id}). Please assist with site visit and cadastral details.`;
    } else if (p1) {
      text += `${p1.title} (${p1.id}). Please share more details.`;
    } else {
      text += 'properties on Find a Plot. Please assist.';
    }
    return `https://wa.me/919444100000?text=${encodeURIComponent(text)}`;
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('compare-backdrop')) {
      this.compareService.closeCompare();
    }
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/property-placeholder.jpg';
  }
}

