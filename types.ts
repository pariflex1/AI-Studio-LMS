
export type UserRole = 'admin' | 'user';

export interface Profile {
  id: string;
  role: UserRole;
  email: string;
  created_by_admin_id?: string;
  assigned_project_ids: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  admin_id: string;
}

export type LeadStatus = 'New' | 'Interested' | 'Following Up' | 'Booked' | 'Closed' | 'Dead';

export interface Lead {
  id: string;
  client_name: string;
  client_contact: string; // Format: 91XXXXXXXXXX
  email?: string;
  city?: string;
  profession?: string;
  budget?: string;
  pref_location?: string;
  lead_source?: string;
  status: LeadStatus;
  prop_pref?: string;
  client_image_url?: string;
  user_id: string | null;
  project_id: string;
  created_at: string;
  updated_at?: string;
  notes?: string;
}

export interface AuthState {
  user: Profile | null;
  isAuthenticated: boolean;
  loading: boolean;
}
