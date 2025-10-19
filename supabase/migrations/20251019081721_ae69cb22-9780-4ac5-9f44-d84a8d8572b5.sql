-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('basic', 'standard', 'premium');

-- Add plan column to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN plan public.subscription_plan DEFAULT 'basic';

-- Update existing subscriptions to have a plan
UPDATE public.subscriptions SET plan = 'basic' WHERE plan IS NULL;