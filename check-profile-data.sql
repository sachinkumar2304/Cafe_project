-- Check current profile data for mintaka139@gmail.com
-- Run this in Supabase SQL Editor

-- 1. Check if columns exist in profiles table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles' 
AND column_name IN ('loyalty_points', 'referral_code', 'total_orders', 'referred_by')
ORDER BY column_name;

-- 2. Check your specific profile
SELECT 
    id,
    email,
    name,
    loyalty_points,
    referral_code,
    total_orders,
    referred_by
FROM public.profiles
WHERE email = 'mintaka139@gmail.com';

-- 3. Check all loyalty transactions for your account
SELECT 
    id,
    points,
    transaction_type,
    order_id,
    description,
    created_at
FROM public.loyalty_transactions
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'mintaka139@gmail.com')
ORDER BY created_at DESC
LIMIT 20;

-- 4. If referral_code is NULL, generate one
UPDATE public.profiles
SET referral_code = 'USER' || SUBSTRING(REPLACE(id::text, '-', ''), 1, 6)
WHERE email = 'mintaka139@gmail.com' 
AND referral_code IS NULL;

-- 5. Recalculate loyalty points based on transactions
WITH points_sum AS (
    SELECT 
        user_id,
        SUM(points) as total_points
    FROM public.loyalty_transactions
    WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'mintaka139@gmail.com')
    GROUP BY user_id
)
UPDATE public.profiles p
SET loyalty_points = COALESCE(ps.total_points, 0)
FROM points_sum ps
WHERE p.id = ps.user_id;

-- 6. Verify the updated data
SELECT 
    email,
    name,
    loyalty_points,
    referral_code,
    total_orders
FROM public.profiles
WHERE email = 'mintaka139@gmail.com';
