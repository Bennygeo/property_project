export type PipelineStageId =
  | 'new_enquiry'
  | 'contact_attempted'
  | 'customer_contacted'
  | 'requirement_understood'
  | 'projects_recommended'
  | 'shortlist_completed'
  | 'site_visit_scheduled'
  | 'site_visit_completed'
  | 'booking_in_progress'
  | 'booked_converted'
  | 'lost_on_hold';

export interface PipelineStageDefinition {
  id: PipelineStageId;
  step: number;
  title: string;
  department: string;
  dept_label: string;
  color: string;
  description: string;
  active_count: number;
  drop_count: number;
}

export interface PipelineHistoryItem {
  id: number;
  from_stage: string | null;
  to_stage: string;
  department: string;
  action_type: string;
  notes: string | null;
  changed_by_name: string | null;
  created_at: string;
  metadata?: any;
}

export interface PipelineViewedProperty {
  id: string;
  title: string;
  price: string;
  locality: string;
  image: string;
}

export interface PipelineShortlistedProperty {
  property_id: string;
  title: string;
  shortlisted_at: string;
}

export interface PipelineSiteVisit {
  id: number;
  property_id: string;
  property_title: string;
  visit_date: string;
  visit_slot: string;
  assigned_executive_name: string;
  status: string;
}

export interface PipelineStaffMember {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  assigned_count: number;
}

export interface PipelineStaffByRole {
  sales_executive: PipelineStaffMember[];
  property_advisor: PipelineStaffMember[];
  operations_executive: PipelineStaffMember[];
  finance_admin?: PipelineStaffMember[];
  content_gis_admin?: PipelineStaffMember[];
}

export interface PipelineLead {
  user_id: number;
  name: string;
  phone: string;
  email: string;
  role: string;
  user_created_at: string;
  interaction_id: number | null;
  status: PipelineStageId;
  intention: string;
  notes: string;
  advisor_notes?: string;
  ops_notes?: string;
  preferred_location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  assigned_sales_id: number | null;
  assigned_sales_name?: string | null;
  assigned_advisor_id: number | null;
  assigned_advisor_name?: string | null;
  assigned_ops_id: number | null;
  assigned_ops_name?: string | null;
  scheduled_visit_at: string | null;
  exit_stage: PipelineStageId | null;
  exit_reason_category: string | null;
  competitor_name: string | null;
  exit_notes: string | null;
  reengage_date: string | null;
  discontinued_at: string | null;
  booked_property_id: string | null;
  plot_no: string | null;
  booking_amount: number | null;
  final_price: number | null;
  registration_date: string | null;
  deal_notes: string | null;
  transferred_at: string | null;
  last_activity_at: string | null;
  subscription_plan: string | null;
  viewed_properties: PipelineViewedProperty[];
  viewed_properties_count: number;
  shortlisted_properties: PipelineShortlistedProperty[];
  shortlisted_count: number;
  site_visits: PipelineSiteVisit[];
  site_visits_count: number;
  history: PipelineHistoryItem[];
}

export interface PipelineKpis {
  totalLeads: number;
  activeInFunnel: number;
  bookedConverted: number;
  lostOnHold: number;
  conversionRate: string;
  discontinuationRate: string;
}

export interface PipelineDataResponse {
  admin: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  kpis: PipelineKpis;
  stages: PipelineStageDefinition[];
  reasonBreakdown: Array<{ reason: string; count: number }>;
  staffByRole?: PipelineStaffByRole;
  allStaff?: PipelineStaffMember[];
  leads: PipelineLead[];
  filtersApplied: {
    stage: string;
    search: string;
    date_from: string;
    date_to: string;
  };
}
