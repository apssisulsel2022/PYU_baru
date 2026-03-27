
CREATE TABLE public.driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  bearing DOUBLE PRECISION NOT NULL DEFAULT 0,
  speed DOUBLE PRECISION NOT NULL DEFAULT 0,
  current_stop_index INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allow public read/write (no auth for now, matching mock data pattern)
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read driver locations"
  ON public.driver_locations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert driver locations"
  ON public.driver_locations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update driver locations"
  ON public.driver_locations FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Unique constraint so we upsert per trip
ALTER TABLE public.driver_locations ADD CONSTRAINT unique_trip UNIQUE (trip_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
