import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { respondError, respondOk } from '@/lib/apiResponse';
import { ReferralApplySchema } from '@/lib/validation';
import { rateLimit, ipKey } from '@/lib/rateLimit';

export async function POST(request: Request) {
    const supabase = await createClient();
    
    try {
        // Rate limit: 10 requests / 5 minutes per IP
        const key = ipKey(request, '/api/referral/apply');
        const rl = rateLimit({ key, windowMs: 5 * 60_000, max: 10 });
        if (!rl.allowed) return respondError('rate_limited', 'Too many referral attempts', 429);
        const json = await request.json().catch(() => null);
        if (!json) return respondError('invalid_json', 'Invalid JSON body', 400);
        const parsed = ReferralApplySchema.safeParse(json);
        if (!parsed.success) {
            return respondError('validation_error', parsed.error.issues.map(i => i.message).join('; '), 400);
        }
        const { userId, referralCode } = parsed.data;
        
        // Find the referrer by referral code
        const { data: referrer, error: referrerError } = await supabase
            .from('profiles')
            .select('id, referral_code')
            .eq('referral_code', referralCode)
            .single();
        
        if (referrerError || !referrer) {
            return respondError('invalid_referral', 'Invalid referral code', 404);
        }
        
        // Can't refer yourself
        if (referrer.id === userId) {
            return respondError('self_referral', 'Cannot use your own referral code', 400);
        }
        
        // Update new user's profile with referred_by
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ referred_by: referrer.id })
            .eq('id', userId);
        
        if (updateError) {
            console.error('Failed to update referred_by:', updateError);
            return respondError('referral_update_failed', 'Failed to apply referral', 500);
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
        
        return respondOk({ message: 'Referral applied! You both got 25 points!' });
        
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Referral error:', msg);
        return respondError('internal_error', 'Internal server error', 500);
    }
}
