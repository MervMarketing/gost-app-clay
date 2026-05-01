-- Create workspaces table (for grouping projects by company/team)
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create GOST projects table
CREATE TABLE public.gost_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gost_projects ENABLE ROW LEVEL SECURITY;

-- Workspace policies: owners can do everything
CREATE POLICY "Users can view their own workspaces" 
ON public.workspaces FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can create workspaces" 
ON public.workspaces FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own workspaces" 
ON public.workspaces FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own workspaces" 
ON public.workspaces FOR DELETE 
USING (auth.uid() = owner_id);

-- Project policies: owners can do everything
CREATE POLICY "Users can view their own projects" 
ON public.gost_projects FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can create projects in their workspaces" 
ON public.gost_projects FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own projects" 
ON public.gost_projects FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own projects" 
ON public.gost_projects FOR DELETE 
USING (auth.uid() = owner_id);

-- Add triggers for updated_at
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gost_projects_updated_at
BEFORE UPDATE ON public.gost_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for faster queries
CREATE INDEX idx_workspaces_owner_id ON public.workspaces(owner_id);
CREATE INDEX idx_gost_projects_workspace_id ON public.gost_projects(workspace_id);
CREATE INDEX idx_gost_projects_owner_id ON public.gost_projects(owner_id);