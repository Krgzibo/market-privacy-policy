export type UserType = 'customer' | 'business';

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  user_type: UserType;
  created_at: string;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  is_active: boolean;
  payment_methods?: string[];
  opening_time?: string;
  closing_time?: string;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  price: number;
  is_available: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  business_id: string;
  status: OrderStatus;
  total_amount: number;
  notes?: string;
  pickup_time?: string;
  order_code?: string;
  customer_name: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product_name: string;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
  business?: Business;
}

export interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  sender_type: 'customer' | 'business';
  message: string;
  created_at: string;
}
