-- DIRECT DATABASE CHECK - Orders #1013, #1014, #1018
-- Run this in Supabase SQL Editor to see EXACT database state

-- Check specific orders
SELECT 
    id,
    order_number,
    status,
    is_cancelled,
    cancelled_at,
    cancel_reason,
    payment_method,
    created_at,
    total_amount
FROM orders
WHERE order_number IN (1013, 1014, 1018)
ORDER BY order_number DESC;

-- Count cancelled orders
SELECT 
    status,
    COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY status;

-- Check if columns exist
SELECT EXISTS (
    SELECT 1 FROM orders 
    WHERE is_cancelled = true
) as has_cancelled_orders;

-- Check enum type
SELECT enum_range(NULL::order_status);
