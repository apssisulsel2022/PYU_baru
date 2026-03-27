-- Function to get all login info in one call to reduce RTT
CREATE OR REPLACE FUNCTION get_user_login_info(_user_id uuid)
RETURNS json AS $$
DECLARE
  _is_admin boolean;
  _is_driver boolean;
  _driver_status text;
  _rejection_reason text;
BEGIN
  -- Check if admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  ) INTO _is_admin;

  -- Check if driver
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = 'driver'
  ) INTO _is_driver;

  -- Get driver status if driver
  IF _is_driver THEN
    SELECT approval_status, rejection_reason 
    INTO _driver_status, _rejection_reason
    FROM drivers 
    WHERE user_id = _user_id
    LIMIT 1;
  END IF;

  RETURN json_build_object(
    'is_admin', _is_admin,
    'is_driver', _is_driver,
    'driver_status', _driver_status,
    'rejection_reason', _rejection_reason
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
-- profiles uses 'id' as primary key which is the user_id, so index is on 'id'
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
