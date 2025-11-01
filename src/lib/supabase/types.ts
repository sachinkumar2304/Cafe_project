import type { SupabaseClient } from '@supabase/supabase-js';

export type OrderStatus = 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Order {
    id: number;
    order_number: number;
    created_at: string;
    status: OrderStatus;
    total_amount: number;
    delivery_charge: number;
    otp: string;
    profiles: Profile | null;
    order_items: OrderItem[];
}

export interface Profile {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
    landmark: string;
}

export interface OrderItem {
    id: number;
    quantity: number;
    price: number;
    menu_item: {
        name: string;
        description: string;
        is_veg: boolean;
    };
}

export type OrdersUpdate = {
    status?: OrderStatus;
    otp?: string;
};

export type Database = {
    public: {
        Tables: {
            orders: {
                Row: Order;
                Insert: Partial<Order>;
                Update: OrdersUpdate;
            };
            admins: {
                Row: {
                    id: string;
                    role: string;
                };
            };
            profiles: {
                Row: Profile;
            };
        };
    };
};

export type SupabaseDatabase = SupabaseClient<Database>;