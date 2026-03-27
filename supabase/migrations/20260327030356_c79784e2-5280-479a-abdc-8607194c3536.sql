INSERT INTO storage.buckets (id, name, public) VALUES ('driver-documents', 'driver-documents', true);

CREATE POLICY "Drivers upload own docs" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read driver docs" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'driver-documents');

CREATE POLICY "Drivers update own docs" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Drivers delete own docs" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);