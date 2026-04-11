export type UserRole = 'agent' | 'owner' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  subscriptionPlanId: string;
  createdAt: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  type: 'sale' | 'rent';
  category: 'apartment' | 'house' | 'land' | 'commercial';
  images: string[];
  ownerId: string;
  status: 'pending' | 'approved' | 'sold' | 'rented';
  createdAt: string;
  amenities?: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval?: 'month' | 'year';
  duration?: string; // Fallback for old code
  limit?: number | 'unlimited'; // Fallback for old code
  limits?: {
    properties: number;
    images_per_property: number;
  };
  features: string[];
}
