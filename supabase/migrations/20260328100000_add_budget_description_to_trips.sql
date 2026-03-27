-- Migration to add budget and description to trips table
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS budget NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing trips if needed (optional)
-- UPDATE public.trips SET budget = 0 WHERE budget IS NULL;
