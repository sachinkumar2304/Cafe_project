-- Simple verification queries for loyalty system
-- Run these one by one in Supabase SQL Editor

-- 1. Check your current profile data
SELECT 
    email,
    name,
    loyalty_points,
    referral_code,
    total_orders,
    referred_by
FROM public.profiles
WHERE email = 'mintaka139@gmail.com';

-- 2. Check all loyalty transactions
SELECT 
    points,
    transaction_type,
    order_id,
    description,
    created_at
FROM public.loyalty_transactions
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'mintaka139@gmail.com')
ORDER BY created_at DESC;

-- 3. Calculate actual points from transactions
SELECT 
    SUM(points) as calculated_points
FROM public.loyalty_transactions
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'mintaka139@gmail.com');

-- 4. Count total orders
SELECT COUNT(*) as total_orders
FROM public.orders
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'mintaka139@gmail.com');

-- 5. Check if points match transactions (should both be same)
SELECT 
    p.loyalty_points as points_in_profile,
    COALESCE(SUM(lt.points), 0) as points_from_transactions,
    p.loyalty_points - COALESCE(SUM(lt.points), 0) as difference
FROM public.profiles p
LEFT JOIN public.loyalty_transactions lt ON lt.user_id = p.id
WHERE p.email = 'mintaka139@gmail.com'
GROUP BY p.id, p.loyalty_points;
