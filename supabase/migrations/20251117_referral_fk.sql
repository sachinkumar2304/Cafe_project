-- Migration: Convert referred_by to UUID foreign key
-- Run this in Supabase SQL editor BEFORE deploying updated code.
-- Safe steps: null out invalid/truncated values, then alter type, then add FK.
BEGIN;
-- 1. Null any non-UUID (length < 36) existing values
UPDATE public.profiles SET referred_by = NULL WHERE referred_by IS NOT NULL AND length(referred_by::text) < 36;
-- 2. Alter type to UUID using cast (will fail if any remaining invalid values)
ALTER TABLE public.profiles ALTER COLUMN referred_by TYPE UUID USING NULLIF(referred_by::text,'')::uuid;
-- 3. Ensure FK (DROP if exists then add to avoid duplication)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_referred_by_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
COMMIT;
-- Rollback (manual): If issues arise, you can: ALTER TABLE public.profiles ALTER COLUMN referred_by TYPE VARCHAR(20);
