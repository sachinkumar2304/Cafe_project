import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { ShopLocation } from '@/lib/menuStorage';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name', { ascending: true })
      .returns<ShopLocation[]>();

    if (error) {
      console.error('Supabase error fetching locations:', error);
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    // If no locations in database, return default locations
    if (!data || data.length === 0) {
      const { defaultLocations } = await import('@/lib/menuStorage');
      return NextResponse.json(defaultLocations);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in locations GET route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}