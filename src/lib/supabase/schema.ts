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

export interface SupabaseSchema {
    public: {
        Tables: {
            orders: {
                Row: Order;
                Insert: Partial<Order>;
                Update: Partial<Order>;
            };
            admins: {
                Row: {
                    id: string;
                    role: string;
                };
                Insert: {
                    id?: string;
                    role?: string;
                };
                Update: {
                    role?: string;
                };
            };
            profiles: {
                Row: Profile;
                Insert: Partial<Profile>;
                Update: Partial<Profile>;
            };
        };
    };
}

// Helper global types (optional) — use explicitly when needed
declare global {
    type Tables<T extends keyof SupabaseSchema['public']['Tables']> = SupabaseSchema['public']['Tables'][T]['Row'];
    type TablesInsert<T extends keyof SupabaseSchema['public']['Tables']> = SupabaseSchema['public']['Tables'][T]['Insert'];
    type TablesUpdate<T extends keyof SupabaseSchema['public']['Tables']> = SupabaseSchema['public']['Tables'][T]['Update'];
}