-- Debug Query: Check Order #1018 status
-- Run this in Supabase SQL Editor to see exact database state

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
WHERE order_number = 1018;

-- Also check if column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'orders' 
  AND column_name IN ('status', 'is_cancelled', 'cancelled_at', 'payment_method')
ORDER BY column_name;
