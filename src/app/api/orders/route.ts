import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST handler for creating a new order
export async function POST(request: Request) {
    const supabase = await createClient();

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        // 1. Validate user profile and serviceable area
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('city')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || !profile.city) {
            return new NextResponse(JSON.stringify({ error: 'User profile is incomplete. Please provide a delivery address.' }), { status: 400 });
        }

        const { data: cityData, error: cityError } = await supabase
            .from('serviceable_cities')
            .select('name')
            .eq('name', profile.city)
            .single();

        if (cityError || !cityData) {
            return new NextResponse(JSON.stringify({ error: 'Sorry, delivery is not available in your city.' }), { status: 400 });
        }

        // 2. Get cart items from request body
        const { cart, summary, locationId } = await request.json();

        if (!cart || cart.length === 0 || !summary || !locationId) {
            return new NextResponse(JSON.stringify({ error: 'Invalid order data.' }), { status: 400 });
        }

        // 3. Format cart items for the database function
        const cartItemsForDb = (cart as Array<{ id: string | number; quantity: number }>).map((item) => ({
            menu_item_id: item.id,
            quantity: item.quantity,
        }));

        // 4. Call the transactional function in the database
        const { data: newOrderId, error: createOrderError } = await supabase.rpc('create_order', {
            p_user_id: user.id,
            p_location_id: locationId,
            p_delivery_charge: summary.deliveryCharge,
            p_cart_items: cartItemsForDb,
        });

        if (createOrderError) {
            console.error('Database function error:', createOrderError);
            throw new Error(`Order creation failed: ${createOrderError.message || JSON.stringify(createOrderError)}`);
        }

        return NextResponse.json({ success: true, orderId: newOrderId });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Error creating order:', msg, error);
        return new NextResponse(JSON.stringify({ error: msg || 'Could not create order.' }), { status: 500 });
    }
}

// GET handler for fetching a user's order history
export async function GET(request: Request) {
    const supabase = await createClient();

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select(`
                id,
                order_number,
                created_at,
                status,
                total_amount,
                otp,
                order_items (
                    quantity,
                    price,
                    menu_items (
                        name,
                        image_url,
                        is_veg
                    )
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (ordersError) {
            throw ordersError;
        }

        return NextResponse.json(orders);

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Error fetching orders:', msg);
        return new NextResponse(JSON.stringify({ error: 'Could not fetch orders.' }), { status: 500 });
    }
}