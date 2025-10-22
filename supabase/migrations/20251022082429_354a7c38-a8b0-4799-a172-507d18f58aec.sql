-- Add notes column to genograms table
ALTER TABLE public.genograms 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';