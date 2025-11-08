-- COMPREHENSIVE FIX: Add all missing columns to orders table
-- Run this in Supabase SQL Editor if columns are missing

-- Add cancellation columns
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
ADD COLUMN IF NOT EXISTS points_used INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_from_points NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cod';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_is_cancelled ON public.orders(is_cancelled);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders(payment_method);

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders'
  AND column_name IN ('is_cancelled', 'cancelled_at', 'cancel_reason', 'points_used', 'payment_method')
ORDER BY column_name;

SELECT 'Columns added successfully!' as message;
