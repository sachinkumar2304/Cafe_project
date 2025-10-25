import { NextRequest } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';
import { getMenuItems, addMenuItem, updateMenuItem, deleteMenuItem, clearAllMenuItems, clearHardcodedData } from '../../../lib/menuStorage';

export async function GET() {
  try {
    // Get menu items from storage
    const menuItems = getMenuItems();
    
    // Convert to API format
    const apiFormat = menuItems.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      is_veg: item.isVeg,
      is_available: item.isAvailable,
      image_url: item.imageUrl,
      location_id: item.locationId,
      created_at: item.createdAt,
      updated_at: item.updatedAt
    }));
    
    return Response.json(apiFormat);
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
    const body = await req.json();
    console.log('POST request received:', body);
    
    // Convert API format to storage format
    const newItem = addMenuItem({
      name: body.name,
      description: body.description,
      price: body.price,
      category: body.category,
      isVeg: body.is_veg,
      isAvailable: body.is_available,
      imageUrl: body.image_url,
      locationId: body.location_id
    });
    
    console.log('New item created:', newItem);
    
    // Convert back to API format
    const apiFormat = {
      id: newItem.id,
      name: newItem.name,
      description: newItem.description,
      price: newItem.price,
      category: newItem.category,
      is_veg: newItem.isVeg,
      is_available: newItem.isAvailable,
      image_url: newItem.imageUrl,
      location_id: newItem.locationId,
      created_at: newItem.createdAt,
      updated_at: newItem.updatedAt
    };
    
    console.log('Returning API format:', apiFormat);
    return Response.json(apiFormat, { status: 201 });
  } catch (error) {
    console.error('API POST error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...fields } = body;
    
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
    // Convert API format to storage format
    const updates: any = {};
    if (fields.name !== undefined) updates.name = fields.name;
    if (fields.description !== undefined) updates.description = fields.description;
    if (fields.price !== undefined) updates.price = fields.price;
    if (fields.category !== undefined) updates.category = fields.category;
    if (fields.is_veg !== undefined) updates.isVeg = fields.is_veg;
    if (fields.is_available !== undefined) updates.isAvailable = fields.is_available;
    if (fields.image_url !== undefined) updates.imageUrl = fields.image_url;
    if (fields.location_id !== undefined) updates.locationId = fields.location_id;
    
    const updatedItem = updateMenuItem(id, updates);
    
    if (!updatedItem) {
      return new Response(JSON.stringify({ error: 'Item not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Convert back to API format
    const apiFormat = {
      id: updatedItem.id,
      name: updatedItem.name,
      description: updatedItem.description,
      price: updatedItem.price,
      category: updatedItem.category,
      is_veg: updatedItem.isVeg,
      is_available: updatedItem.isAvailable,
      image_url: updatedItem.imageUrl,
      location_id: updatedItem.locationId,
      created_at: updatedItem.createdAt,
      updated_at: updatedItem.updatedAt
    };
    
    return Response.json(apiFormat);
  } catch (error) {
    console.error('API PUT error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;
    
    if (!id) return new Response(JSON.stringify({ error: 'id required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
    const success = deleteMenuItem(id);
    
    if (!success) {
      return new Response(JSON.stringify({ error: 'Item not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('API DELETE error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}



