import { Component, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ADMIN_DASHBOARD_HOST } from './admin-dashboard-host.token';
import type { AdminDashboardComponent } from '../admin-dashboard.component';

export interface AdminOperationsModalsComponent extends AdminDashboardComponent { }

@Component({
  selector: 'app-admin-operations-modals',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ],
  templateUrl: './admin-operations-modals.component.html',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' }
})
export class AdminOperationsModalsComponent {
  constructor() {
    const parent = inject(ADMIN_DASHBOARD_HOST);
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === 'symbol' || String(prop).startsWith('__')) {
          return Reflect.get(target, prop, receiver);
        }
        const val = (parent as any)[prop];
        if (typeof val === 'function' && !Object.prototype.hasOwnProperty.call(parent, prop)) {
          return val.bind(parent);
        }
        return val;
      },
      set(target, prop, value, receiver) {
        if (typeof prop === 'symbol' || String(prop).startsWith('__')) {
          return Reflect.set(target, prop, value, receiver);
        }
        (parent as any)[prop] = value;
        return true;
      }
    });
  }
}

