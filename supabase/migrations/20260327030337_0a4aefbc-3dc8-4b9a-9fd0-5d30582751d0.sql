ALTER TABLE drivers ADD COLUMN approval_status text NOT NULL DEFAULT 'pending';
ALTER TABLE drivers ADD COLUMN ktp_url text;
ALTER TABLE drivers ADD COLUMN sim_url text;
ALTER TABLE drivers ADD COLUMN photo_url text;
ALTER TABLE drivers ADD COLUMN rejection_reason text;
ALTER TABLE drivers ADD COLUMN assigned_vehicle text;