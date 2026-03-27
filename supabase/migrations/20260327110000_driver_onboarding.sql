-- Migration 1: Add driver approval columns
ALTER TABLE drivers ADD COLUMN approval_status text NOT NULL DEFAULT 'pending';
-- Values: pending, approved, rejected
ALTER TABLE drivers ADD COLUMN ktp_url text;
ALTER TABLE drivers ADD COLUMN sim_url text;
ALTER TABLE drivers ADD COLUMN photo_url text;
ALTER TABLE drivers ADD COLUMN rejection_reason text;

-- Migration 2: Create storage bucket for driver documents
INSERT INTO storage.buckets (id, name, public) VALUES ('driver-documents', 'driver-documents', true);

CREATE POLICY "Drivers upload own docs" ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read driver docs" ON storage.objects FOR SELECT TO anon, authenticated 
USING (bucket_id = 'driver-documents');

CREATE POLICY "Drivers update own docs" ON storage.objects FOR UPDATE TO authenticated 
USING (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Migration 3: Add vehicle assignment column
ALTER TABLE drivers ADD COLUMN assigned_vehicle text;
-- Admin sets this (e.g., "Toyota Hiace - B 1234 XY")
