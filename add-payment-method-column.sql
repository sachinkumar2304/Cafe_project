-- Add payment_method column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cod';

-- Update existing orders to have COD as payment method
UPDATE public.orders 
SET payment_method = 'cod' 
WHERE payment_method IS NULL;
