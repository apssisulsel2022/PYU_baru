-- Set default value for pickup_points id column
-- Using gen_random_uuid() and casting to text since the current type is TEXT
ALTER TABLE public.pickup_points 
ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Also add a formal foreign key from bookings to pickup_points if it doesn't exist
-- First we need to make sure the data matches, but since it's a new setup, it should be fine.
-- Note: We only do this if we are sure all bookings.pickup_point_id exist in pickup_points.id
-- For now, let's just fix the primary key issue.
