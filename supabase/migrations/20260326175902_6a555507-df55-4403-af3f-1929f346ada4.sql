
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  trip_id uuid NOT NULL,
  driver_id text NOT NULL,
  passenger_name text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  comment text NOT NULL DEFAULT '',
  trip_date text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert reviews" ON public.reviews FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public delete reviews" ON public.reviews FOR DELETE TO anon, authenticated USING (true);

ALTER TABLE public.pickup_points
  ADD COLUMN IF NOT EXISTS address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS operating_hours text DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
