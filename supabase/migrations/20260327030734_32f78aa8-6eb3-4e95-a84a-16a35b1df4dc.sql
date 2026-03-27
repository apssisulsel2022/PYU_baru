CREATE OR REPLACE FUNCTION public.assign_driver_role(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'driver')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;