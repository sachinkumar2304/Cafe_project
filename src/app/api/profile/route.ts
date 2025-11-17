import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET handler to fetch the current user's profile
export async function GET(request: Request) {
    const supabase = await createClient();
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) {
            // No profile row yet (PGRST116) -> create minimal row so referral & loyalty system works uniformly
            if (profileError.code === 'PGRST116') {
                const { error: insertErr } = await supabase
                    .from('profiles')
                    .insert({ id: user.id, email: user.email });
                if (insertErr) {
                    console.error('Failed creating initial profile row:', insertErr);
                    return NextResponse.json({ 
                        email: user.email || '', 
                        loyalty_points: 0,
                        total_orders: 0 
                    });
                }
                // Re-fetch newly created profile
                const { data: newProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                profile = newProfile || null;
            } else {
                throw profileError;
            }
        }

        // Ensure referral_code exists for existing profiles (post-migration backfill)
        if (!profile.referral_code) {
            // Try to deterministically generate like DB trigger: 'USER' + first 6 chars of UUID without dashes
            const baseId = (user.id || '').replace(/-/g, '');
            const candidateFromId = `USER${baseId.substring(0, 6)}`;

            const generateFallback = () => {
                const ts = Date.now().toString(36).toUpperCase();
                const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
                return `USER${ts}${rand}`.slice(0, 20); // keep within VARCHAR(20)
            };

            const tryCodes = [candidateFromId, generateFallback(), generateFallback()];
            for (const code of tryCodes) {
                const { error: setCodeError } = await supabase
                    .from('profiles')
                    .update({ referral_code: code })
                    .eq('id', user.id)
                    .is('referral_code', null);

                // If no error, or unique violation not triggered (supabase may surface as 23505), break
                if (!setCodeError) {
                    profile.referral_code = code;
                    break;
                }
                // If unique violation, continue to next code; otherwise log and break
                const msg = setCodeError?.message || '';
                if (!/duplicate key|unique/i.test(msg)) {
                    console.warn('Failed setting referral_code:', setCodeError);
                    break;
                }
            }

            // If still missing, re-fetch once (in case another concurrent request set it)
            if (!profile.referral_code) {
                const { data: refreshed } = await supabase
                    .from('profiles')
                    .select('referral_code')
                    .eq('id', user.id)
                    .single();
                if (refreshed?.referral_code) profile.referral_code = refreshed.referral_code;
            }
        }

        // Count total orders for this user
        const { count: totalOrders } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        return NextResponse.json({ 
            ...profile, 
            email: user.email || '',
            total_orders: totalOrders || 0
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Error fetching profile:', msg);
        return new NextResponse(JSON.stringify({ error: 'Could not fetch profile.' }), { status: 500 });
    }
}

// PUT handler to update the current user's profile
export async function PUT(request: Request) {
    const supabase = await createClient();
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        console.log('PUT /api/profile - User:', user?.id, 'Error:', userError?.message);

        if (userError || !user) {
            console.log('PUT /api/profile - Unauthorized: No user found');
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const profileData = await request.json();

        // Server-side validation
        if (!profileData.name || !profileData.address || !profileData.city || !profileData.pincode || !profileData.phone) {
            return new NextResponse(JSON.stringify({ error: 'Missing required fields.' }), { status: 400 });
        }

        // Validate phone number (must be 10 digits)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(profileData.phone)) {
            return new NextResponse(JSON.stringify({ error: 'Phone number must be exactly 10 digits.' }), { status: 400 });
        }

        // Validate pincode (must be 6 digits)
        const pincodeRegex = /^[0-9]{6}$/;
        if (!pincodeRegex.test(profileData.pincode)) {
            return new NextResponse(JSON.stringify({ error: 'Pincode must be exactly 6 digits.' }), { status: 400 });
        }

        // Validate city against serviceable_cities table
        const { data: cityData, error: cityError } = await supabase
            .from('serviceable_cities')
            .select('name')
            .eq('name', profileData.city)
            .single();

        if (cityError || !cityData) {
            return new NextResponse(JSON.stringify({ error: 'City is not serviceable.' }), { status: 400 });
        }

        // Use upsert to insert or update profile
        const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                name: profileData.name,
                phone: profileData.phone,
                address: profileData.address,
                city: profileData.city,
                pincode: profileData.pincode,
                landmark: profileData.landmark,
            }, {
                onConflict: 'id'
            });

        if (upsertError) {
            throw upsertError;
        }

        return NextResponse.json({ success: true, message: 'Profile updated successfully.' });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Error updating profile:', msg);
        return new NextResponse(JSON.stringify({ error: 'Could not update profile.' }), { status: 500 });
    }
}
