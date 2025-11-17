-- Loyalty Points & Referral System Schema
-- Run this in Supabase SQL Editor

-- Add loyalty points column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS loyalty_points INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_orders INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- Create loyalty_transactions table to track points history
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    points INT NOT NULL, -- positive for earn, negative for redeem
    transaction_type VARCHAR(50) NOT NULL, -- 'order', 'referral', 'redeem'
    order_id BIGINT REFERENCES public.orders(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_user_id ON public.loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_created_at ON public.loyalty_transactions(created_at DESC);

-- Add cancellation fields to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
ADD COLUMN IF NOT EXISTS points_used INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_from_points NUMERIC(10,2) DEFAULT 0;

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate code from user ID and random string (e.g., USER123ABC)
    NEW.referral_code := 'USER' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 6);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate referral code on profile creation
DROP TRIGGER IF EXISTS set_referral_code ON public.profiles;
CREATE TRIGGER set_referral_code
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_referral_code();

-- Function to award loyalty points after order
CREATE OR REPLACE FUNCTION public.award_loyalty_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Award 10 points when order is delivered
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        -- Update user's loyalty points
        UPDATE public.profiles
        SET 
            loyalty_points = loyalty_points + 10,
            total_orders = total_orders + 1
        WHERE id = NEW.user_id;
        
        -- Record transaction
        INSERT INTO public.loyalty_transactions (user_id, points, transaction_type, order_id, description)
        VALUES (NEW.user_id, 10, 'order', NEW.id, 'Points earned from order #' || NEW.order_number);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to award points on order delivery
DROP TRIGGER IF EXISTS trigger_award_points ON public.orders;
CREATE TRIGGER trigger_award_points
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.award_loyalty_points();

-- Enable RLS on new table
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own transactions
DROP POLICY IF EXISTS "Users can view own loyalty transactions" ON public.loyalty_transactions;
CREATE POLICY "Users can view own loyalty transactions" ON public.loyalty_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Admins can view all transactions
DROP POLICY IF EXISTS "Admins can view all loyalty transactions" ON public.loyalty_transactions;
CREATE POLICY "Admins can view all loyalty transactions" ON public.loyalty_transactions
    FOR ALL USING (public.is_admin(auth.uid()));

-- Grant permissions
GRANT ALL ON public.loyalty_transactions TO authenticated;
GRANT ALL ON public.loyalty_transactions TO service_role;
