import { createClient, createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { respondError, respondOk } from '@/lib/apiResponse';
import { rateLimit, ipKey } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // Rate limit: 50 requests / 10 minutes per IP (increased for admin operations)
    const key = ipKey(request, '/api/upload');
    const rl = rateLimit({ key, windowMs: 10 * 60_000, max: 50 });
    if (!rl.allowed) return respondError('rate_limited', 'Too many uploads', 429);

    // Use regular client for auth check
    const supabase = await createClient();
    // Verify admin status
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return respondError('unauthorized', 'Unauthorized', 401);
    const { data: adminRow } = await supabase.from('admins').select('id').eq('id', user.id).single();
    if (!adminRow) return respondError('forbidden', 'Only admins can upload files', 403);

    // Expect a multipart/form-data request
    const form = await request.formData();
    const file = form.get('file') as File | null;

    if (!file) return respondError('no_file', 'No file provided', 400);

    // Validate content type and size (max 5MB)
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const maxBytes = 5 * 1024 * 1024;
    const contentType = file.type || 'application/octet-stream';
    if (!allowed.includes(contentType)) {
      return respondError('unsupported_type', 'Only JPG, PNG, or WEBP images are allowed', 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength > maxBytes) {
      return respondError('file_too_large', 'Max upload size is 5MB', 400);
    }

    const safeName = (file.name || 'upload').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filename = `${Date.now()}-${safeName}`;
    const bucket = process.env.SUPABASE_MENU_BUCKET || 'menu-images';
    const fileBuffer = new Uint8Array(arrayBuffer);

    // CRITICAL FIX: Use service role client for storage to bypass RLS
    const supabaseAdmin = await createServerClient();
    const { error } = await supabaseAdmin.storage.from(bucket).upload(filename, fileBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true
    });

    if (error) {
      console.error('❌ Supabase Storage Upload Error:', {
        error: error,
        errorMessage: error.message,
        bucket: bucket,
        filename: filename,
        fileSize: arrayBuffer.byteLength,
        contentType: file.type
      });
      return respondError('upload_failed', `Upload failed: ${error.message || 'Unknown error'}`, 500);
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(filename);
    return respondOk({ publicUrl: publicUrlData.publicUrl });
  } catch (err) {
    console.error('Upload handler error:', err);
    return respondError('internal_error', 'Internal server error', 500);
  }
}
