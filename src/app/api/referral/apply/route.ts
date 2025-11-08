import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    const supabase = await createClient();
    
    try {
        const { userId, referralCode } = await request.json();
        
        if (!userId || !referralCode) {
            return NextResponse.json({ error: 'Missing userId or referralCode' }, { status: 400 });
        }
        
        // Find the referrer by referral code
        const { data: referrer, error: referrerError } = await supabase
            .from('profiles')
            .select('id, referral_code')
            .eq('referral_code', referralCode)
            .single();
        
        if (referrerError || !referrer) {
            return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
        }
        
        // Can't refer yourself
        if (referrer.id === userId) {
            return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 });
        }
        
        // Update new user's profile with referred_by
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ referred_by: referrer.id })
            .eq('id', userId);
        
        if (updateError) {
            console.error('Failed to update referred_by:', updateError);
            return NextResponse.json({ error: 'Failed to apply referral' }, { status: 500 });
        }
        
        // Award 25 points to new user
        await supabase
            .from('profiles')
            .update({ loyalty_points: 25 })
            .eq('id', userId);
        
        // Award referrer 25 points - fetch current then update
        const { data: currentReferrer } = await supabase
            .from('profiles')
            .select('loyalty_points')
            .eq('id', referrer.id)
            .single();
        
        const currentPoints = currentReferrer?.loyalty_points || 0;
        await supabase
            .from('profiles')
            .update({ loyalty_points: currentPoints + 25 })
            .eq('id', referrer.id);
        
        // Log transactions
        await supabase.from('loyalty_transactions').insert([
            {
                user_id: userId,
                points: 25,
                transaction_type: 'referral_bonus',
                description: 'Welcome bonus for using referral code'
            },
            {
                user_id: referrer.id,
                points: 25,
                transaction_type: 'referral_reward',
                description: `Referred a new user: ${referralCode}`
            }
        ]);
        
        return NextResponse.json({ 
            success: true, 
            message: 'Referral applied! You both got 25 points!' 
        });
        
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Referral error:', msg);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
