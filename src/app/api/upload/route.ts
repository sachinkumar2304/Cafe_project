import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const supabase = createServerClient();

    // Expect a multipart/form-data request
    const form = await request.formData();
    const file = form.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const filename = `${Date.now()}-${file.name || 'upload'}`;
    const bucket = process.env.SUPABASE_MENU_BUCKET || 'menu-images';
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    const { error } = await supabase.storage.from(bucket).upload(filename, fileBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true
    });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: 'Upload failed', details: error }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filename);
    return NextResponse.json({ publicUrl: publicUrlData.publicUrl });
  } catch (err) {
    console.error('Upload handler error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
