-- ============================================
-- SNACKIFY SQL MAINTENANCE SCRIPTS
-- Collection of diagnostic and fix queries
-- ============================================

-- ============================================
-- 1. CHECK CANCELLED ORDERS
-- ============================================
-- Purpose: Verify order status and cancellation flags

SELECT 
    order_number,
    status,
    is_cancelled,
    cancelled_at,
    cancel_reason,
    created_at
FROM public.orders
WHERE order_number IN (1013, 1014, 1018, 1019, 1021)
ORDER BY order_number;

-- Check enum values
SELECT enum_range(NULL::order_status);

-- ============================================
-- 2. FIX RLS POLICIES
-- ============================================
-- Purpose: Allow users to update their own orders (for cancellation)

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

-- Create new policy
CREATE POLICY "Users can update own orders" 
ON public.orders
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant UPDATE permission
GRANT UPDATE ON public.orders TO authenticated;

-- Fix loyalty transactions RLS
DROP POLICY IF EXISTS "Users can insert own loyalty transactions" ON public.loyalty_transactions;
CREATE POLICY "Users can insert own loyalty transactions"
ON public.loyalty_transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

GRANT INSERT ON public.loyalty_transactions TO authenticated;

-- ============================================
-- 3. VERIFY LOYALTY POINTS SYSTEM
-- ============================================
-- Purpose: Check if loyalty points match transaction history

-- Check specific user's profile
SELECT 
    email,
    name,
    loyalty_points,
    referral_code,
    total_orders
FROM public.profiles
WHERE email = 'mintaka139@gmail.com';

-- Check all loyalty transactions
SELECT 
    points,
    transaction_type,
    order_id,
    description,
    created_at
FROM public.loyalty_transactions
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'mintaka139@gmail.com')
ORDER BY created_at DESC
LIMIT 20;

-- Calculate total points from transactions
SELECT 
    SUM(points) as calculated_points
FROM public.loyalty_transactions
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'mintaka139@gmail.com');

-- Verify points match
SELECT 
    p.loyalty_points as points_in_profile,
    COALESCE(SUM(lt.points), 0) as points_from_transactions,
    p.loyalty_points - COALESCE(SUM(lt.points), 0) as difference
FROM public.profiles p
LEFT JOIN public.loyalty_transactions lt ON lt.user_id = p.id
WHERE p.email = 'mintaka139@gmail.com'
GROUP BY p.id, p.loyalty_points;

-- ============================================
-- 4. GENERATE REFERRAL CODES
-- ============================================
-- Purpose: Create referral codes for all users without one

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

-- ============================================
-- 5. CHECK PROFILE DATA
-- ============================================
-- Purpose: Verify profile columns and data integrity

-- Check if columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles' 
AND column_name IN ('loyalty_points', 'referral_code', 'total_orders', 'referred_by')
ORDER BY column_name;

-- Check specific profile
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

-- Recalculate loyalty points based on transactions
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

-- ============================================
-- 6. DEBUG SPECIFIC ORDER
-- ============================================
-- Purpose: Detailed order information

-- Replace ORDER_NUMBER with actual number
SELECT 
    o.order_number,
    o.status,
    o.is_cancelled,
    o.payment_method,
    o.total_amount,
    o.created_at,
    p.email as user_email,
    p.name as user_name
FROM public.orders o
LEFT JOIN public.profiles p ON o.user_id = p.id
WHERE o.order_number = 1018;

-- ============================================
-- 7. CHECK ORDERS SCHEMA
-- ============================================
-- Purpose: Verify order table structure

-- Check columns
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'orders'
ORDER BY ordinal_position;

-- Check constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.orders'::regclass;

-- ============================================
-- 8. FIX ORDERS COLUMNS
-- ============================================
-- Purpose: Add missing columns to orders table

-- Add payment_method if not exists
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'COD';

-- Add cancellation fields if not exist
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Add loyalty points fields if not exist
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS points_used INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_from_points NUMERIC(10,2) DEFAULT 0;

-- Verify columns added
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'orders' 
AND column_name IN ('payment_method', 'is_cancelled', 'cancelled_at', 'cancel_reason', 'points_used', 'discount_from_points');

-- ============================================
-- 9. CHECK ORDER COUNTS
-- ============================================
-- Purpose: Get order statistics

-- Total orders by status
SELECT status, COUNT(*) as count
FROM public.orders
GROUP BY status
ORDER BY count DESC;

-- Orders by user
SELECT 
    p.email,
    p.name,
    COUNT(o.id) as total_orders,
    SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
    SUM(CASE WHEN o.is_cancelled = true THEN 1 ELSE 0 END) as cancelled_orders
FROM public.profiles p
LEFT JOIN public.orders o ON p.id = o.user_id
GROUP BY p.id, p.email, p.name
ORDER BY total_orders DESC;

-- ============================================
-- 10. CLEAN UP TEST DATA (CAUTION!)
-- ============================================
-- Purpose: Remove test orders (USE CAREFULLY!)

-- UNCOMMENT ONLY IF YOU WANT TO DELETE TEST DATA
-- DELETE FROM public.orders WHERE order_number < 1000;
-- DELETE FROM public.loyalty_transactions WHERE description LIKE '%test%';

-- ============================================
-- END OF MAINTENANCE SCRIPTS
-- ============================================
