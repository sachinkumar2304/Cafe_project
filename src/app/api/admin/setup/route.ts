import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    // Use server-side client (service role key) so we can insert privileged rows despite RLS
    const supabase = createServerClient();
    
    try {
        // Get current user from the session
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        // With a server client we can safely validate the token and perform inserts
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Insert user as admin
        const { data: admin, error: adminError } = await supabase
            .from('admins')
            .upsert([
                {
                    id: user.id,
                    role: 'admin'
                }
            ])
            .select()
            .single();

        if (adminError) {
            console.error('Error creating admin:', adminError);
            return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
        }

        // Update user metadata
        await supabase.auth.updateUser({
            data: { isAdmin: true }
        });

        return NextResponse.json({ success: true, admin });

    } catch (error) {
        console.error('Error in admin setup:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}