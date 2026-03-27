-- Update trips table with date information
ALTER TABLE public.trips ADD COLUMN departure_date TIMESTAMPTZ;
ALTER TABLE public.trips ADD COLUMN estimated_completion TIMESTAMPTZ;
ALTER TABLE public.trips ADD COLUMN actual_completion TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN public.trips.departure_date IS 'Tanggal keberangkatan trip';
COMMENT ON COLUMN public.trips.estimated_completion IS 'Estimasi tanggal selesai trip';
COMMENT ON COLUMN public.trips.actual_completion IS 'Tanggal aktual penyelesaian trip oleh driver';
