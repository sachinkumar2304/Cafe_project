import { NextRequest } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function GET() {
  try {
    // Always use localStorage-based storage for consistency
    const locations = [
      {
        id: 'loc1',
        name: 'Rameshwaram Dosa Center',
        address: '123 Main Street, Downtown',
        highlights: 'Famous for Traditional Dosas'
      },
      {
        id: 'loc2',
        name: 'Vighnaharta Sweet & Snacks Corner',
        address: '456 Park Avenue, Midtown',
        highlights: 'Best South Indian Sweets'
      },
      {
        id: 'loc3',
        name: 'Vighnaharta Snacks Corner',
        address: '789 Oak Street, Uptown',
        highlights: 'Quick Bites & Snacks'
      }
    ];
    
    return Response.json(locations);
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
    const { data, error } = await supabase
      .from('locations')
      .insert([{ ...body }])
      .select('*')
      .single();
    
    if (error) {
      console.error('Supabase POST error:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('API POST error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
