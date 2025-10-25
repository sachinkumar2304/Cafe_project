import { NextRequest } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function GET() {
  try {
    // Check if Supabase client is available
    if (!supabase) {
      return new Response(JSON.stringify({ 
        error: 'Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        users(*),
        order_items(
          *,
          menu_items(*)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return Response.json(data || []);
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check if Supabase client is available
    if (!supabase) {
      return new Response(JSON.stringify({ 
        error: 'Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { orderItems, ...orderData } = body;

    // Start a transaction
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([orderData])
      .select('*')
      .single();
    
    if (orderError) {
      console.error('Supabase order creation error:', orderError);
      return new Response(JSON.stringify({ error: orderError.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert order items
    const orderItemsWithOrderId = orderItems.map((item: any) => ({
      ...item,
      order_id: order.id
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsWithOrderId);
    
    if (itemsError) {
      console.error('Supabase order items error:', itemsError);
      return new Response(JSON.stringify({ error: itemsError.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return Response.json(order, { status: 201 });
  } catch (error) {
    console.error('API POST error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
