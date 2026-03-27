
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS bearing double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active timestamptz;
