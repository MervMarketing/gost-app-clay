-- Create shared_plans table for storing shareable plan snapshots
CREATE TABLE public.shared_plans (
  id TEXT PRIMARY KEY DEFAULT substring(encode(gen_random_bytes(6), 'base64') from 1 for 8),
  data JSONB NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  owner_id UUID DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.shared_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view shared plans (they're meant to be public via the share link)
CREATE POLICY "Anyone can view shared plans"
ON public.shared_plans
FOR SELECT
USING (true);

-- Anyone can create shared plans (including anonymous users in demo mode)
CREATE POLICY "Anyone can create shared plans"
ON public.shared_plans
FOR INSERT
WITH CHECK (true);

-- Owners can update their own shared plans
CREATE POLICY "Owners can update their own shared plans"
ON public.shared_plans
FOR UPDATE
USING (auth.uid() = owner_id);

-- Owners can delete their own shared plans
CREATE POLICY "Owners can delete their own shared plans"
ON public.shared_plans
FOR DELETE
USING (auth.uid() = owner_id);