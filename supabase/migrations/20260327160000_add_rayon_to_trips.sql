-- Add rayon_id and start_pickup_point_id to trips table
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS rayon_id UUID REFERENCES public.rayons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS start_pickup_point_id TEXT REFERENCES public.pickup_points(id) ON DELETE SET NULL;

-- Enable realtime for the new columns
-- (Usually automatic for the table, but good to keep in mind)
