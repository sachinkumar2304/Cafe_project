import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { respondError, respondOk } from '@/lib/apiResponse';
import { ReferralApplySchema } from '@/lib/validation';
import { rateLimit, ipKey } from '@/lib/rateLimit';

export async function POST(request: Request) {
    const supabase = await createClient();
    try {
        // Auth user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return respondError('unauthorized', 'Login required', 401);

        // Rate limit
        const key = ipKey(request, '/api/referral/apply');
        const rl = rateLimit({ key, windowMs: 5 * 60_000, max: 10 });
        if (!rl.allowed) return respondError('rate_limited', 'Too many referral attempts', 429);

        // Parse body
        const json = await request.json().catch(() => null);
        if (!json) return respondError('invalid_json', 'Invalid JSON body', 400);
        const parsed = ReferralApplySchema.safeParse(json);
        if (!parsed.success) {
            return respondError('validation_error', parsed.error.issues.map(i => i.message).join('; '), 400);
        }
        const { referralCode } = parsed.data;

        // Fetch current user's profile
        const { data: currentProfile, error: currentProfileError } = await supabase
            .from('profiles')
            .select('id, loyalty_points, referred_by')
            .eq('id', user.id)
            .single();
        if (currentProfileError || !currentProfile) return respondError('profile_missing', 'Profile not found', 404);

        // Already referred
        if (currentProfile.referred_by) return respondError('already_referred', 'Referral already applied', 400);

        // Find referrer
        const { data: referrer, error: referrerError } = await supabase
            .from('profiles')
            .select('id, loyalty_points, referral_code')
            .eq('referral_code', referralCode)
            .single();
        if (referrerError || !referrer) return respondError('invalid_referral', 'Invalid referral code', 404);

        // Self referral check
        if (referrer.id === currentProfile.id) return respondError('self_referral', 'Cannot use your own referral code', 400);

        // Update referred_by (NOTE: referred_by column should be UUID; if still VARCHAR(20), consider migration)
        const { error: setRefError } = await supabase
            .from('profiles')
            .update({ referred_by: referrer.id })
            .eq('id', currentProfile.id)
            .is('referred_by', null);
        if (setRefError) return respondError('referral_update_failed', 'Failed to apply referral', 500);

        // Award points (increment, not overwrite)
        const newUserPoints = (currentProfile.loyalty_points || 0) + 25;
        const newReferrerPoints = (referrer.loyalty_points || 0) + 25;
        const { error: userPtsErr } = await supabase
            .from('profiles')
            .update({ loyalty_points: newUserPoints })
            .eq('id', currentProfile.id);
        if (userPtsErr) return respondError('user_points_failed', 'Failed to add user points', 500);
        const { error: refPtsErr } = await supabase
            .from('profiles')
            .update({ loyalty_points: newReferrerPoints })
            .eq('id', referrer.id);
        if (refPtsErr) return respondError('referrer_points_failed', 'Failed to add referrer points', 500);

        // Insert loyalty transactions (best-effort; if fails we still applied referral)
        const { error: txnErr } = await supabase.from('loyalty_transactions').insert([
            {
                user_id: currentProfile.id,
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
        if (txnErr) console.warn('Failed to insert loyalty transactions for referral:', txnErr);

        return respondOk({ message: 'Referral applied! You both got 25 points!' });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Referral error:', msg);
        return respondError('internal_error', 'Internal server error', 500);
    }
}
