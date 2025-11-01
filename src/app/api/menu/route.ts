import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { MenuItem } from '@/lib/menuStorage';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category', { ascending: true })
      .returns<MenuItem[]>();

    if (error) {
      console.error('Supabase error fetching menu items:', error);
      return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json([]);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in menu GET route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id });
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, price, category } = body;

    if (!name || !price || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('menu_items')
      .insert([body])
      .select()
      .returns<MenuItem[]>();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST /api/menu:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id });
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required for update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('menu_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .returns<MenuItem[]>();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/menu:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id });
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required for delete' }, { status: 400 });
    }

    const { error } = await supabase.from('menu_items').delete().eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/menu:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' }, 
      { status: 500 }
    );
  }
}