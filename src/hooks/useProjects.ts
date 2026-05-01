import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { GOSTData } from '@/types/gost';

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface GostProject {
  id: string;
  workspace_id: string;
  owner_id: string;
  name: string;
  description: string | null;
  data: GOSTData;
  created_at: string;
  updated_at: string;
}

export function useProjects() {
  const { user, isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<GostProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setWorkspaces(data);
    }
  }, [user]);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('gost_projects')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (!error && data) {
      // Parse JSONB data field with error handling
      const parsed = data.map(p => {
        try {
          return {
            ...p,
            data: typeof p.data === 'string' ? JSON.parse(p.data) : p.data
          };
        } catch (parseError) {
          console.error('Failed to parse project data:', parseError);
          return { ...p, data: {} }; // Return empty data as fallback
        }
      });
      setProjects(parsed as GostProject[]);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      Promise.all([fetchWorkspaces(), fetchProjects()]).finally(() => {
        setLoading(false);
      });
    } else {
      setWorkspaces([]);
      setProjects([]);
      setLoading(false);
    }
  }, [isAuthenticated, fetchWorkspaces, fetchProjects]);

  const createWorkspace = async (name: string, description?: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        owner_id: user.id,
        name,
        description: description || null
      })
      .select()
      .single();
    
    if (!error && data) {
      setWorkspaces(prev => [...prev, data]);
    }
    
    return { data, error };
  };

  const updateWorkspace = async (id: string, updates: Partial<Pick<Workspace, 'name' | 'description'>>) => {
    const { data, error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (!error && data) {
      setWorkspaces(prev => prev.map(w => w.id === id ? data : w));
    }
    
    return { data, error };
  };

  const deleteWorkspace = async (id: string) => {
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setWorkspaces(prev => prev.filter(w => w.id !== id));
      setProjects(prev => prev.filter(p => p.workspace_id !== id));
    }
    
    return { error };
  };

  const createProject = async (workspaceId: string, name: string, description?: string, initialData?: GOSTData) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const { data, error } = await supabase
      .from('gost_projects')
      .insert({
        workspace_id: workspaceId,
        owner_id: user.id,
        name,
        description: description || null,
        data: initialData || {}
      })
      .select()
      .single();
    
    if (!error && data) {
      try {
        const parsed = {
          ...data,
          data: typeof data.data === 'string' ? JSON.parse(data.data) : data.data
        };
        setProjects(prev => [parsed as GostProject, ...prev]);
      } catch (parseError) {
        console.error('Failed to parse new project data:', parseError);
        setProjects(prev => [{ ...data, data: {} } as GostProject, ...prev]);
      }
    }
    
    return { data, error };
  };

  const updateProject = async (id: string, updates: Partial<Pick<GostProject, 'name' | 'description' | 'data'>>) => {
    const { data, error } = await supabase
      .from('gost_projects')
      .update({
        ...updates,
        data: updates.data ? JSON.parse(JSON.stringify(updates.data)) : undefined
      })
      .eq('id', id)
      .select()
      .single();
    
    if (!error && data) {
      try {
        const parsed = {
          ...data,
          data: typeof data.data === 'string' ? JSON.parse(data.data) : data.data
        };
        setProjects(prev => prev.map(p => p.id === id ? parsed as GostProject : p));
      } catch (parseError) {
        console.error('Failed to parse updated project data:', parseError);
        setProjects(prev => prev.map(p => p.id === id ? { ...data, data: {} } as GostProject : p));
      }
    }
    
    return { data, error };
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase
      .from('gost_projects')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
    
    return { error };
  };

  const getProjectsByWorkspace = (workspaceId: string) => {
    return projects.filter(p => p.workspace_id === workspaceId);
  };

  return {
    workspaces,
    projects,
    loading,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    createProject,
    updateProject,
    deleteProject,
    getProjectsByWorkspace,
    refresh: () => Promise.all([fetchWorkspaces(), fetchProjects()])
  };
}
