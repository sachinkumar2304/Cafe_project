import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface Admin {
    id: string;
}

interface Profile {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
    landmark: string | null;
}

interface Order {
    id: string;
    user_id: string;
    status: string;
    otp: string;
    created_at: string;
    updated_at: string;
    profiles?: Profile;
}

interface OrderUpdateBody {
    orderId: string;
    status?: string;
    otp?: string;
}

// GET handler for admins to fetch all orders
export async function GET(request: Request) {
    const supabase = await createClient();
    
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.error('No user found:', userError);
            return NextResponse.json({ error: 'Unauthorized - No user' }, { status: 401 });
        }

        console.log('Checking admin status for user:', user.id);

        // Check admin status in database
        const { data: admin, error: adminError } = await supabase
            .from('admins')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

        if (adminError || !admin) {
            console.error('Admin check failed:', adminError);
            return NextResponse.json({ error: 'Forbidden: Not an admin' }, { status: 403 });
        }

        console.log('Admin verified:', admin);

        // 2. Fetch all orders with user profiles
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select(`
                *,
                profiles ( name, email, phone, address, city, pincode, landmark )
            `)
            .order('created_at', { ascending: false })
            .returns<Order[]>();

        if (ordersError) throw ordersError;

        return NextResponse.json(orders || []);

    } catch (error) {
        console.error('Error fetching all orders:', error);
        return NextResponse.json({ error: 'Could not fetch orders.' }, { status: 500 });
    }
}

// PUT handler for admins to update order status or verify OTP
export async function PUT(request: Request) {
    const supabase = await createClient();
    try {
        // Get user (more secure than getSession)
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized - No user' }, { status: 401 });
        }

        // Verify admin status
        const { data: adminData, error: adminCheckError } = await supabase
            .from('admins')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

        if (adminCheckError || !adminData) {
            return NextResponse.json({ error: 'Forbidden: Not an admin' }, { status: 403 });
        }

        // 2. Get update data from request body
        const { orderId, status, otp }: OrderUpdateBody = await request.json();

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
        }

        // A. Handle OTP verification
        if (otp) {
            const { data: order, error: fetchError } = await supabase
                .from('orders')
                .select('otp')
                .eq('id', orderId)
                .maybeSingle();

            if (fetchError || !order) {
                return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
            }

            if (order.otp === otp) {
                // Correct OTP: Update status to 'delivered'
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({ status: 'delivered' })
                    .eq('id', orderId);

                if (updateError) throw updateError;
                return NextResponse.json({ success: true, message: 'Order marked as delivered.' });
            } else {
                // Incorrect OTP
                return NextResponse.json({ error: 'Invalid OTP.' }, { status: 400 });
            }
        }

        // B. Handle status change
        if (status) {
            const { error: updateError } = await supabase
                .from('orders')
                .update({ status })
                .eq('id', orderId);

            if (updateError) throw updateError;
            return NextResponse.json({ success: true, message: 'Order status updated.' });
        }

        return NextResponse.json({ error: 'No valid action specified (status or OTP).' }, { status: 400 });

    } catch (error) {
        console.error('Error updating order:', error);
        return NextResponse.json({ error: 'Could not update order.' }, { status: 500 });
    }
}
