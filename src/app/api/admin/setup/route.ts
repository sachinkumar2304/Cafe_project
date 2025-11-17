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

        // If already super_admin or admin, do not downgrade role
        const { data: existingAdmin } = await supabase
            .from('admins')
            .select('id, role')
            .eq('id', user.id)
            .maybeSingle();

        let admin = existingAdmin;
        if (!existingAdmin) {
            // Insert minimal row with default 'admin' role
            const { data: inserted, error: insertErr } = await supabase
                .from('admins')
                .insert({ id: user.id })
                .select()
                .single();
            if (insertErr) {
                console.error('Error creating admin:', insertErr);
                return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
            }
            admin = inserted;
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