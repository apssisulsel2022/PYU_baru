-- Add service_type and extend status for real-time tracking
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS service_type text DEFAULT 'mobil';
-- service_type: 'motor', 'mobil'
-- status: 'online', 'offline', 'busy', 'on_trip'

-- Enable realtime for drivers table if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'drivers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
  END IF;
END $$;
