-- EMERGENCY FIX: Check and Fix RLS for orders table
-- Run this in Supabase SQL Editor

-- 1. Check current RLS policies on orders table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'orders';

-- 2. Add policy to allow authenticated users to UPDATE their own orders
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;
CREATE POLICY "Users can update own orders" 
ON public.orders
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'orders';

-- 4. Grant UPDATE permission
GRANT UPDATE ON public.orders TO authenticated;

SELECT 'Orders table RLS policy fixed!' as message;
