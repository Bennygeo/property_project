import { PropertyMasterData } from './property-master.model';
export type PropertyReviewStatus = 
  | 'published' 
  | 'pending_review' 
  | 'pending_peer_review' 
  | 'rejected' 
  | 'revision_requested' 
  | 'draft';

export interface AdminPropertyItem {
  id: string;
  title: string;
  propertyType: string;
  listingMode: string;
  localityName: string;
  cityName: string;
  price: string;
  pricePerSqft: string;
  sqft: string;
  bhkBadge: string;
  facingOrView: string;
  mainImageUrl: string;
  reraNumber: string;
  status: PropertyReviewStatus;
  submittedByUserId?: number | null;
  submittedByName?: string | null;
  submittedByRole?: string | null;
  reviewedByUserId?: number | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminStats {
  total: number;
  pendingUserReviews: number;
  pendingPeerReviews: number;
  published: number;
  rejected: number;
}

export interface AdminPersona {
  id: number;
  name: string;
  role: 'admin' | 'co_admin';
  title: string;
  avatarInitials: string;
  email: string;
  department?: string;
  responsibility?: string;
}

export interface PostPropertyPayload {
  title: string;
  propertyType: string;
  listingMode: string;
  localityName: string;
  cityName: string;
  price: string;
  pricePerSqft: string;
  sqft: string;
  bhkBadge: string;
  facingOrView: string;
  mainImageUrl: string;
  reraNumber: string;
  authorId: number;
  authorName: string;
  authorRole: string;
  galleryImages?: string[];
  masterDetails?: PropertyMasterData;
}

export interface ReviewDecisionPayload {
  propertyId: string;
  reviewerId: number;
  reviewerName: string;
  action: 'approve' | 'reject' | 'request_revision';
  notes?: string;
}

export interface AdminActivityItem {
  id: number;
  adminId: number;
  adminName: string;
  actionType: 'post_property' | 'approve_peer_review' | 'approve_user_review' | 'reject_property' | 'request_revision' | 'admin_login';
  propertyId?: string | null;
  propertyTitle?: string | null;
  notes?: string | null;
  targetUserId?: number | null;
  targetUserName?: string | null;
  createdAt: string;
}

export interface AdminActivitySummary {
  totalMyActions: number;
  myPosts: number;
  myPeerApprovals: number;
  myUserApprovals: number;
  myRejections: number;
  coAdminTotalActions: number;
}

export interface AdminProfileData {
  admin: AdminPersona & {
    clearanceLevel: string;
    createdAt: string;
    phone?: string;
  };
  summary: AdminActivitySummary;
  myActivities: AdminActivityItem[];
  otherAdminActivities: AdminActivityItem[];
}

