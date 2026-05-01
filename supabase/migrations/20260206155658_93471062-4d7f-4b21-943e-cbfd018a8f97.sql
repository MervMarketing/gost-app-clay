-- Add share_type and project_id columns to shared_plans
ALTER TABLE shared_plans ADD COLUMN share_type text NOT NULL DEFAULT 'snapshot';
ALTER TABLE shared_plans ADD COLUMN project_id uuid REFERENCES gost_projects(id) ON DELETE CASCADE;

-- Create a SECURITY DEFINER function to fetch live project data
-- This allows anyone with a valid live share link to read the project
CREATE OR REPLACE FUNCTION public.get_live_shared_plan(share_id text)
RETURNS TABLE(data jsonb, permission text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT gp.data, sp.permission
  FROM shared_plans sp
  JOIN gost_projects gp ON gp.id = sp.project_id
  WHERE sp.id = share_id 
    AND sp.share_type = 'live'
    AND (sp.expires_at IS NULL OR sp.expires_at > now());
END;
$$;