-- Improve handle_new_user() function with duplicate prevention for safer SECURITY DEFINER usage
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if profile doesn't already exist (prevents duplicates and reduces DEFINER risk)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add comment documenting security considerations
COMMENT ON FUNCTION public.handle_new_user() IS 'SECURITY NOTICE: This function uses SECURITY DEFINER to auto-create user profiles on signup. Keep insert logic simple with only trigger-provided data. Never add user-controllable parameters or dynamic SQL.';