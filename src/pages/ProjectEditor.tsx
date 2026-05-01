import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, GostProject } from '@/hooks/useProjects';
import { GOSTBuilder } from '@/components/gost/GOSTBuilder';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GOSTData } from '@/types/gost';

export default function ProjectEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { updateProject } = useProjects();
  const [project, setProject] = useState<GostProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
      return;
    }

    if (id && isAuthenticated) {
      fetchProject();
    }
  }, [id, isAuthenticated, authLoading, navigate]);

  const fetchProject = async () => {
    if (!id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('gost_projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      setError('Project not found');
    } else if (data) {
      try {
        const parsed = {
          ...data,
          data: typeof data.data === 'string' ? JSON.parse(data.data) : data.data
        };
        setProject(parsed as GostProject);
      } catch (parseError) {
        console.error('Failed to parse project data:', parseError);
        setError('Project data is corrupted');
      }
    }
    setLoading(false);
  };

  const handleSave = useCallback(async (data: GOSTData) => {
    if (!id) return;
    await updateProject(id, { data });
  }, [id, updateProject]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">{error || 'Project not found'}</p>
        <Button onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <GOSTBuilder 
      projectId={project.id}
      projectName={project.name}
      initialData={project.data}
      onSave={handleSave}
      onBack={() => navigate('/projects')}
    />
  );
}
