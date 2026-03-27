-- Add color column to rayons table
ALTER TABLE public.rayons ADD COLUMN IF NOT EXISTS color TEXT;

-- Update existing rayons with some default colors from our palette if needed
-- (Optional, but good for initial data)
UPDATE public.rayons SET color = '#3b82f6' WHERE color IS NULL AND name ILIKE '%Bandung%';
UPDATE public.rayons SET color = '#10b981' WHERE color IS NULL AND name ILIKE '%Jakarta%';
UPDATE public.rayons SET color = '#f97316' WHERE color IS NULL AND name ILIKE '%Surabaya%';
