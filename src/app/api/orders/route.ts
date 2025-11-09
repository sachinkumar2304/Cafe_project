import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { respondError, respondOk } from '@/lib/apiResponse';
import { OrderPayloadSchema } from '@/lib/validation';
import { rateLimit, ipKey } from '@/lib/rateLimit';

// POST handler for creating a new order
export async function POST(request: Request) {
    const supabase = await createClient();

    try {
            // Rate limit: 20 requests / 60s per IP
            const key = ipKey(request, '/api/orders');
            const rl = rateLimit({ key, windowMs: 60_000, max: 20 });
            if (!rl.allowed) return respondError('rate_limited', 'Too many requests', 429);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return respondError('unauthorized', 'Unauthorized', 401);
        }

        // Parse and validate body
        const json = await request.json().catch(() => null);
        if (!json) return respondError('invalid_json', 'Invalid JSON body', 400);
        const parsed = OrderPayloadSchema.safeParse(json);
        if (!parsed.success) {
            return respondError('validation_error', parsed.error.issues.map(i => i.message).join('; '), 400);
        }
        const { cart, summary, locationId, pointsUsed, discountFromPoints, paymentMethod } = parsed.data;

        // 1. Validate user profile and serviceable area
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('city')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || !profile.city) {
            return respondError('incomplete_profile', 'User profile is incomplete. Please provide a delivery address.', 400);
        }

        const { data: cityData, error: cityError } = await supabase
            .from('serviceable_cities')
            .select('name')
            .eq('name', profile.city)
            .single();

        if (cityError || !cityData) {
            return respondError('city_unserviceable', 'Sorry, delivery is not available in your city.', 400);
        }

        // 3. Format cart items for the database function
        const cartItemsForDb = cart.map((item) => ({
            menu_item_id: item.id,
            quantity: item.quantity,
        }));

        // 4. Call the transactional function in the database
        const { data: newOrderId, error: createOrderError } = await supabase.rpc('create_order', {
            p_user_id: user.id,
            p_location_id: locationId,
            p_delivery_charge: summary.deliveryCharge,
            p_cart_items: cartItemsForDb,
            p_points_used: pointsUsed,
            p_discount_from_points: discountFromPoints,
            p_payment_method: paymentMethod,
        });

        if (createOrderError) {
            console.error('Database function error:', createOrderError);
            return respondError('order_failed', createOrderError.message || 'Order creation failed', 500);
        }

        return respondOk({ orderId: newOrderId });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Error creating order:', msg, error);
        return respondError('internal_error', 'Could not create order.', 500);
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
                payment_method,
                is_cancelled,
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

        return NextResponse.json(orders || []);

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Error fetching orders:', msg);
        return NextResponse.json({ error: 'Could not fetch orders.' }, { status: 500 });
    }
}