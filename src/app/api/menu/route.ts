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
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Auth error in POST:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (adminError || !adminData) {
      console.error('Admin check error:', adminError);
      return NextResponse.json({ error: 'Forbidden: Not an admin' }, { status: 403 });
    }

    const body = await request.json();
    const { name, price, category } = body;

    if (!name || !price || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('Creating new menu item:', body);

    const { data, error } = await supabase
      .from('menu_items')
      .insert([body])
      .select()
      .returns<MenuItem[]>();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    console.log('Menu item created successfully:', data);
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
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Auth error in PUT:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (adminError || !adminData) {
      console.error('Admin check error:', adminError);
      return NextResponse.json({ error: 'Forbidden: Not an admin' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required for update' }, { status: 400 });
    }

    console.log('Updating menu item:', id, updateData);

    const { data, error } = await supabase
      .from('menu_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .returns<MenuItem[]>();

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    console.log('Menu item updated successfully:', data);
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
  console.log('🗑️ DELETE /api/menu called');
  
  try {
    const supabase = await createClient();
    console.log('✅ Supabase client created');
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('👤 User check:', user?.id || 'No user', userError ? `Error: ${userError.message}` : 'No error');

    if (userError || !user) {
      console.error('❌ Auth error in DELETE:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    console.log('🔍 Checking admin status for user:', user.id);
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    console.log('👮 Admin check result:', adminData ? 'IS ADMIN' : 'NOT ADMIN', adminError ? `Error: ${adminError.message}` : 'No error');

    if (adminError || !adminData) {
      console.error('❌ Admin check failed:', adminError);
      return NextResponse.json({ error: 'Forbidden: Not an admin' }, { status: 403 });
    }

    // Parse request body
    console.log('📦 Parsing request body...');
    let body;
    try {
      body = await request.json();
      console.log('✅ Body parsed:', body);
    } catch (e) {
      console.error('❌ Failed to parse request body:', e);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { id } = body;
    console.log('🆔 Received ID:', id, 'Type:', typeof id);

    if (!id) {
      console.error('❌ No ID provided');
      return NextResponse.json({ error: 'ID is required for delete' }, { status: 400 });
    }

    // Convert id to number if it's a string (bigserial in DB is number type)
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    console.log('🔢 Numeric ID:', numericId);

    if (isNaN(numericId)) {
      console.error('❌ Invalid ID format');
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    console.log('🗑️ Attempting to delete menu item with ID:', numericId);

    // Try to hard delete first
    const { data: deleteData, error: deleteError } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', numericId)
      .select();

    console.log('🔍 Delete result:', deleteData, deleteError ? `Error: ${deleteError.message}` : 'No error');

    // If foreign key constraint error (item used in orders), do soft delete instead
    if (deleteError && deleteError.code === '23503') {
      console.log('⚠️ Item is referenced in orders, doing soft delete (setting is_available=false)');
      
      const { data: softDeleteData, error: softDeleteError } = await supabase
        .from('menu_items')
        .update({ is_available: false })
        .eq('id', numericId)
        .select();

      if (softDeleteError) {
        console.error('❌ Soft delete error:', softDeleteError);
        return NextResponse.json({ error: softDeleteError.message }, { status: 500 });
      }

      console.log('✅ Menu item soft-deleted (marked unavailable):', numericId);
      return NextResponse.json({ 
        message: 'Item cannot be deleted as it exists in orders. Item has been marked as unavailable instead.',
        softDelete: true 
      });
    }

    if (deleteError) {
      console.error('❌ Supabase delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    console.log('✅ Menu item deleted successfully:', numericId);
    return NextResponse.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('💥 CATCH BLOCK - Error in DELETE /api/menu:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' }, 
      { status: 500 }
    );
  }
}