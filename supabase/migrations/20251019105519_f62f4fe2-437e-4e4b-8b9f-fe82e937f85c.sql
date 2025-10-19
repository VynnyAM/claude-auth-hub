-- Add phone column to profiles table
ALTER TABLE public.profiles
ADD COLUMN phone text;

-- Add index for phone lookups
CREATE INDEX idx_profiles_phone ON public.profiles(phone);