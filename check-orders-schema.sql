-- Check if orders table has cancellation columns
-- Run this in Supabase SQL Editor to verify schema

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders'
ORDER BY ordinal_position;

-- Check if specific columns exist
SELECT 
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'is_cancelled'
    ) as has_is_cancelled,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'cancelled_at'
    ) as has_cancelled_at,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'cancel_reason'
    ) as has_cancel_reason,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'points_used'
    ) as has_points_used,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'payment_method'
    ) as has_payment_method;

-- Check recent orders with cancellation info
SELECT 
    id,
    order_number,
    status,
    is_cancelled,
    cancelled_at,
    payment_method,
    created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;
