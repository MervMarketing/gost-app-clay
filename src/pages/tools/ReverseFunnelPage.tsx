import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { UserMenu } from '@/components/gost/UserMenu';
import { ReverseFunnelTool } from '@/components/tools/ReverseFunnelTool';
import { Button } from '@/components/ui/button';
import { buildInitialGOSTDataFromReverseFunnel } from '@/lib/reverseFunnelMath';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { isMissingDatabaseTablesError } from '@/lib/supabaseSetupHint';

export default function ReverseFunnelPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { workspaces, createProject } = useProjects();
  const [buildBusy, setBuildBusy] = useState(false);

  const handleBuild = async (initialData: ReturnType<typeof buildInitialGOSTDataFromReverseFunnel>) => {
    if (workspaces.length === 0) {
      toast.error('Create a workspace from Projects first, then try again.');
      navigate('/projects');
      return;
    }
    setBuildBusy(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await createProject(
      workspaces[0].id,
      `${today} reverse-funnel plan`,
      'Created from Reverse Funnel tool',
      initialData,
    );
    setBuildBusy(false);
    if (error) {
      const msg = error.message || 'Could not create project';
      if (isMissingDatabaseTablesError(msg)) {
        toast.error(
          'Database tables missing. Run Supabase migrations (see repo supabase/migrations), then retry.',
          { duration: 12_000 },
        );
      } else {
        toast.error(msg);
      }
      return;
    }
    if (data?.id) {
      toast.success('Project created');
      navigate(`/project/${data.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" className="shrink-0 gap-1" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="min-w-0">
              <h1 className="font-display text-base font-semibold truncate md:text-lg">
                Reverse funnel
              </h1>
              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                How many visitors do you need—at your rates and channel mix?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {authLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
            {!authLoading && isAuthenticated ? (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
                  Projects
                </Button>
                <UserMenu />
              </>
            ) : !authLoading ? (
              <Button size="sm" onClick={() => navigate(`/auth?next=${encodeURIComponent('/tools/reverse-funnel')}`)}>
                Sign in
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto flex-1 px-4 py-8 md:px-8">
        <ReverseFunnelTool onBuildNewProject={handleBuild} buildBusy={buildBusy} />
      </main>
    </div>
  );
}
