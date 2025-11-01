// Auto-generated types derived from supabase/schema.sql (hand-crafted from repo schema)
// Long-term: replace with `supabase gen types typescript` output when available.

export type OrderStatus = 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Location {
  id: string;
  name: string;
  address?: string | null;
  highlights?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MenuItem {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  category: string;
  is_veg: boolean;
  is_available: boolean;
  image_url?: string | null;
  location_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Profile {
  id: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  landmark?: string | null;
}

export interface Admin {
  id: string;
  role: string;
}

export interface Order {
  id: number;
  order_number: number;
  user_id?: string | null;
  location_id?: string | null;
  total_amount: number;
  delivery_charge?: number | null;
  status: OrderStatus;
  otp?: string | null;
  created_at?: string | null;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  quantity: number;
  price: number;
}

export type OrdersInsert = Partial<Omit<Order, 'id' | 'order_number' | 'created_at'>>;
export type OrdersUpdate = Partial<Pick<Order, 'status' | 'otp'>>;

export type Database = {
  public: {
    Tables: {
      locations: {
        Row: Location;
        Insert: Partial<Location>;
        Update: Partial<Location>;
      };
      menu_items: {
        Row: MenuItem;
        Insert: Partial<MenuItem>;
        Update: Partial<MenuItem>;
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
      };
      admins: {
        Row: Admin;
        Insert: Partial<Admin>;
        Update: Partial<Admin>;
      };
      orders: {
        Row: Order;
        Insert: OrdersInsert;
        Update: OrdersUpdate;
      };
      order_items: {
        Row: OrderItem;
        Insert: Partial<OrderItem>;
        Update: Partial<OrderItem>;
      };
    };
  };
};

export default Database;
