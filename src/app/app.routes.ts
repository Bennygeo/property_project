import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/pages/home-page/home-page.component').then(m => m.HomePageComponent),
    title: 'Find a Plot — See Every Detail. Choose with Confidence.'
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/pages/search-page/search-page.component').then(m => m.SearchPageComponent),
    title: 'Search Properties, Plots & Apartments — Find a Plot Verified Registry'
  },
  {
    path: 'property/:id',
    loadComponent: () => import('./features/property-details/pages/property-details-page/property-details-page.component').then(m => m.PropertyDetailsPageComponent),
    title: 'Property Details — Find a Plot Verified Registry'
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/pages/user-profile-page/user-profile-page.component').then(m => m.UserProfilePageComponent),
    title: 'Investor Dashboard & Profile — Find a Plot Verified Registry'
  },
  {
    path: 'wallet',
    loadComponent: () => import('./features/wallet/pages/wallet-page/wallet-page.component').then(m => m.WalletPageComponent),
    title: 'Media Points Wallet & Payments — Find a Plot Verified Registry'
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./features/admin/pages/admin-login/admin-login.component').then(m => m.AdminLoginComponent),
    title: 'Administrative Sign In — Find a Plot Compliance Portal'
  },
  {
    path: 'admin/profile',
    loadComponent: () => import('./features/admin/pages/admin-profile/admin-profile.component').then(m => m.AdminProfileComponent),
    title: 'Admin Officer Profile & Audit Logs — Find a Plot Portal'
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    title: 'Four-Eyes Review & Admin Compliance Portal — Find a Plot'
  },
  {
    path: 'post-property',
    loadComponent: () => import('./features/properties/pages/post-property-page/post-property-page.component').then(m => m.PostPropertyPageComponent),
    title: 'Post Property — Verified Direct Registry — Find a Plot'
  },
  {
    path: 'ai',
    loadComponent: () => import('./features/home/components/ai-chat-modal/ai-chat-modal.component').then(m => m.AiChatModalComponent),
    title: 'Find a Plot AI Concierge — Conversational Property Intelligence'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
