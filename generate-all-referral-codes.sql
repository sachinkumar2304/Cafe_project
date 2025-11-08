-- Generate referral codes for all existing users without one
-- Run this in Supabase SQL Editor

-- Update all profiles without referral codes
UPDATE public.profiles
SET referral_code = 'USER' || SUBSTRING(REPLACE(id::text, '-', ''), 1, 6)
WHERE referral_code IS NULL;

-- Verify all users now have referral codes
SELECT 
    COUNT(*) as total_users,
    COUNT(referral_code) as users_with_codes,
    COUNT(*) - COUNT(referral_code) as users_without_codes
FROM public.profiles;

-- Show all referral codes
SELECT 
    email,
    name,
    referral_code,
    loyalty_points,
    total_orders
FROM public.profiles
ORDER BY email;
