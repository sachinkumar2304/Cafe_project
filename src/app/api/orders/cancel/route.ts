import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    const supabase = await createClient();
    
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { orderId } = await request.json();
        
        if (!orderId) {
            return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
        }
        
        // Fetch order details
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, user_id, created_at, status, payment_method, points_used, is_cancelled')
            .eq('id', orderId)
            .single();
        
        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        
        // Verify order belongs to user
        if (order.user_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
        
        // Check if already cancelled
        if (order.is_cancelled || order.status === 'cancelled') {
            return NextResponse.json({ error: 'Order already cancelled' }, { status: 400 });
        }
        
        // Check if order is confirmed status
        if (order.status !== 'confirmed') {
            return NextResponse.json({ error: 'Only confirmed orders can be cancelled' }, { status: 400 });
        }
        
        // Check if COD payment
        if (order.payment_method !== 'cod') {
            return NextResponse.json({ error: 'Only Cash on Delivery orders can be cancelled' }, { status: 400 });
        }
        
        // Check 5 minute window
        const orderTime = new Date(order.created_at).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (now - orderTime > fiveMinutes) {
            return NextResponse.json({ error: 'Cancel window expired (5 minutes)' }, { status: 400 });
        }
        
        // Cancel the order
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                status: 'cancelled',
                is_cancelled: true,
                cancelled_at: new Date().toISOString(),
                cancel_reason: 'Cancelled by customer'
            })
            .eq('id', orderId);
        
        if (updateError) {
            console.error('Failed to cancel order:', updateError);
            return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
        }
        
        console.log('✅ Order cancelled successfully in database:', orderId);
        
        // Refund loyalty points if any were used
        if (order.points_used && order.points_used > 0) {
            // Get current points
            const { data: profile } = await supabase
                .from('profiles')
                .select('loyalty_points')
                .eq('id', user.id)
                .single();
            
            const currentPoints = profile?.loyalty_points || 0;
            
            // Refund points
            await supabase
                .from('profiles')
                .update({ loyalty_points: currentPoints + order.points_used })
                .eq('id', user.id);
            
            // Log refund transaction
            await supabase.from('loyalty_transactions').insert({
                user_id: user.id,
                points: order.points_used,
                transaction_type: 'refund',
                description: `Refund for cancelled order #${orderId}`
            });
        }
        
        return NextResponse.json({ 
            success: true, 
            message: 'Order cancelled successfully' 
        });
        
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Cancel order error:', msg);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
