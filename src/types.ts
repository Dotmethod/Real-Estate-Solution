export type UserRole = 'agent' | 'owner' | 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  subscriptionPlanId: string;
  createdAt: string;
  avatar_url?: string;
  full_name?: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  last_message_at: string;
  property_id?: string;
  participants: string[]; // User IDs
}

export interface Message {
  id: string;
  created_at: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
}

export interface ChatParticipant extends User {
  last_read_at?: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  beds: number;
  baths: number;
  sqft: number;
  type: string;
  listing_status: string;
  images: string[];
  agent_id: string;
  status: 'pending' | 'approved' | 'sold' | 'rented' | 'deleted';
  created_at: string;
  amenities?: string[];
  agency_fee?: number;
  inspection_fee?: number;
  video_url?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  limits?: {
    properties: number;
    images_per_property: number;
  };
  features: string[];
}
