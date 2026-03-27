-- Create rayons table
CREATE TABLE IF NOT EXISTS public.rayons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS and policies for rayons
ALTER TABLE public.rayons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read rayons" ON public.rayons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert rayons" ON public.rayons FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update rayons" ON public.rayons FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete rayons" ON public.rayons FOR DELETE TO anon, authenticated USING (true);

-- Add missing columns to pickup_points
ALTER TABLE public.pickup_points
  ADD COLUMN IF NOT EXISTS rayon_id UUID REFERENCES public.rayons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add unique constraint for name within same rayon (excluding deleted ones)
CREATE UNIQUE INDEX IF NOT EXISTS pickup_points_name_rayon_id_idx 
ON public.pickup_points (name, rayon_id) 
WHERE deleted_at IS NULL;

-- Enable realtime for rayons
ALTER PUBLICATION supabase_realtime ADD TABLE public.rayons;
