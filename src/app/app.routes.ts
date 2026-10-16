import { Routes } from '@angular/router';
import { HomePageComponent } from './features/home/pages/home-page/home-page.component';
import { SearchPageComponent } from './features/search/pages/search-page/search-page.component';
import { PropertyDetailsPageComponent } from './features/property-details/pages/property-details-page/property-details-page.component';

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
    title: 'Mannidam — Architectural Real Estate Registry & No-Brokerage Marketplace'
  },
  {
    path: 'search',
    component: SearchPageComponent,
    title: 'Search Properties, Plots & Apartments — Mannidam Verified Registry'
  },
  {
    path: 'property/:id',
    component: PropertyDetailsPageComponent,
    title: 'Property Details — Mannidam Verified Registry'
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/pages/user-profile-page/user-profile-page.component').then(m => m.UserProfilePageComponent),
    title: 'Investor Dashboard & Profile — Mannidam Verified Registry'
  },
  {
    path: 'wallet',
    loadComponent: () => import('./features/wallet/pages/wallet-page/wallet-page.component').then(m => m.WalletPageComponent),
    title: 'Media Points Wallet & Payments — Mannidam Verified Registry'
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./features/admin/pages/admin-login/admin-login.component').then(m => m.AdminLoginComponent),
    title: 'Administrative Sign In — Mannidam Compliance Portal'
  },
  {
    path: 'admin/profile',
    loadComponent: () => import('./features/admin/pages/admin-profile/admin-profile.component').then(m => m.AdminProfileComponent),
    title: 'Admin Officer Profile & Audit Logs — Mannidam Portal'
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    title: 'Four-Eyes Review & Admin Compliance Portal — Mannidam'
  },
  {
    path: 'post-property',
    loadComponent: () => import('./features/properties/pages/post-property-page/post-property-page.component').then(m => m.PostPropertyPageComponent),
    title: 'Post Property FREE — Zero Brokerage Registry — Mannidam'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
