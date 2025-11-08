-- Fix RLS Policy for loyalty_transactions table
-- Run this in Supabase SQL Editor

-- Drop existing policies that might be blocking
DROP POLICY IF EXISTS "Users can view own loyalty transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "Admins can view all loyalty transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "Service role can manage transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON public.loyalty_transactions;

-- Create comprehensive policies

-- 1. Users can view their own transactions
CREATE POLICY "Users can view own loyalty transactions" 
ON public.loyalty_transactions
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Admins can view all transactions
CREATE POLICY "Admins can view all loyalty transactions" 
ON public.loyalty_transactions
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.admins 
        WHERE admins.id = auth.uid()
    )
);

-- 3. Allow service role and authenticated users to insert (for database functions)
CREATE POLICY "Allow inserts for authenticated users" 
ON public.loyalty_transactions
FOR INSERT 
WITH CHECK (true);

-- 4. Allow system to update/delete (for refunds)
CREATE POLICY "Allow updates for authenticated users" 
ON public.loyalty_transactions
FOR UPDATE 
USING (true);

-- Grant permissions to authenticated role
GRANT ALL ON public.loyalty_transactions TO authenticated;
GRANT ALL ON public.loyalty_transactions TO service_role;

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'loyalty_transactions';

SELECT 'RLS policies fixed successfully!' as message;
