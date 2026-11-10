export interface SiteVisitItem {
  id: number;
  user_id: number;
  property_id: string;
  property_title: string;
  locality: string;
  visit_date: string;
  visit_slot: string;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
  assigned_executive_name: string;
  assigned_executive_phone: string;
  pickup_location?: string;
  admin_notes?: string;
  created_at: string;
  user_name?: string;
  user_phone?: string;
}

export interface AdvisoryConsultationItem {
  id: number;
  user_id: number;
  advisor_name: string;
  advisor_role: string;
  consultation_date: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'rescheduled';
  advisor_notes: string;
  recommendations?: {
    id: string;
    title: string;
    locality: string;
    price: string;
    reason: string;
  }[];
  dossier_pdf_url?: string;
  created_at: string;
  user_name?: string;
  user_phone?: string;
}

export interface SavedSearchItem {
  id: number;
  user_id: number;
  search_name: string;
  filters: {
    district?: string;
    locality?: string;
    propertyType?: string;
    budgetMin?: number;
    budgetMax?: number;
  };
  email_alerts_enabled: boolean | number;
  whatsapp_alerts_enabled: boolean | number;
  matches_count: number;
  last_notified_at?: string;
  created_at: string;
  user_name?: string;
  user_phone?: string;
}

export interface PlotBookingItem {
  id: number;
  user_id: number;
  property_id: string;
  property_title: string;
  plot_number: string;
  plot_extent_sqft: number;
  total_price: number | string;
  token_advance_paid: number | string;
  status: 'enquiry' | 'plot_on_hold' | 'token_paid' | 'document_verification' | 'registration_in_progress' | 'registered_completed' | 'cancelled';
  assigned_legal_officer: string;
  target_registration_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_phone?: string;
}

export interface UserWorkspaceData {
  userId: number;
  membership: {
    subscription: {
      plan_id: string;
      plan_name: string;
      badge_text: string;
      status: string;
      price_inr: number;
      expires_at?: string;
    };
    entitlements: {
      plan_id: string;
      project_views_used: number;
      project_view_limit: number;
      comparisons_used: number;
      comparison_limit: number;
      advisory_sessions_used: number;
      advisory_session_limit: number;
      site_visits_used: number;
      site_visit_limit: number;
    };
    daysRemaining: number;
  };
  siteVisits: SiteVisitItem[];
  consultations: AdvisoryConsultationItem[];
  savedSearches: SavedSearchItem[];
  plotBookings: PlotBookingItem[];
}

export interface AdminWorkspaceOverview {
  users: {
    id: number;
    name: string;
    phone: string;
    email: string;
    created_at: string;
    plan_id: string;
    plan_name: string;
    total_visits: number;
    total_consultations: number;
    total_saved_searches: number;
    total_bookings: number;
  }[];
  allVisits: SiteVisitItem[];
  allConsultations: AdvisoryConsultationItem[];
  allSearches: SavedSearchItem[];
  allBookings: PlotBookingItem[];
}
