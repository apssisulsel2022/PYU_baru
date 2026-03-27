
-- Create drivers table
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  plate TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  rating DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_trips INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read drivers" ON public.drivers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert drivers" ON public.drivers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update drivers" ON public.drivers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete drivers" ON public.drivers FOR DELETE TO anon, authenticated USING (true);

-- Create pickup_points table
CREATE TABLE public.pickup_points (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  minutes_from_start INTEGER NOT NULL DEFAULT 0,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL
);

ALTER TABLE public.pickup_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read pickup_points" ON public.pickup_points FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert pickup_points" ON public.pickup_points FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update pickup_points" ON public.pickup_points FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Create trips table
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  base_price INTEGER NOT NULL DEFAULT 0,
  total_seats INTEGER NOT NULL DEFAULT 16,
  booked_seats INTEGER[] NOT NULL DEFAULT '{}',
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read trips" ON public.trips FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert trips" ON public.trips FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update trips" ON public.trips FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete trips" ON public.trips FOR DELETE TO anon, authenticated USING (true);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT NOT NULL,
  pickup_point_id TEXT NOT NULL,
  seat_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  total_price INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'paid',
  booked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read bookings" ON public.bookings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert bookings" ON public.bookings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update bookings" ON public.bookings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete bookings" ON public.bookings FOR DELETE TO anon, authenticated USING (true);

-- Enable realtime on all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_points;
