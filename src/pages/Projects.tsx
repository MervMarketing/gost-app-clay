import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjects, Workspace, GostProject } from '@/hooks/useProjects';
import { UserMenu } from '@/components/gost/UserMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  FolderOpen, 
  FileText, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Loader2,
  Building2,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fotofetchPreset } from '@/data/presetFotofetch';
import type { GOSTData } from '@/types/gost';
import { Checkbox } from '@/components/ui/checkbox';

export default function Projects() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { 
    workspaces, 
    projects, 
    loading, 
    createWorkspace, 
    updateWorkspace,
    deleteWorkspace,
    createProject,
    updateProject,
    deleteProject,
    getProjectsByWorkspace 
  } = useProjects();

  // Dialogs state
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [editWorkspaceOpen, setEditWorkspaceOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [deleteWorkspaceOpen, setDeleteWorkspaceOpen] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  
  // Form state
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDesc, setWorkspaceDesc] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [editingProject, setEditingProject] = useState<GostProject | null>(null);
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);
  const [deletingProject, setDeletingProject] = useState<GostProject | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [useFotofetchTemplate, setUseFotofetchTemplate] = useState(false);
  const fotofetchBootstrapRef = useRef(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Open "Create project" with Fotofetch preset when arriving from demo (?template=fotofetch).
  useEffect(() => {
    if (loading || fotofetchBootstrapRef.current) return;
    if (searchParams.get('template') !== 'fotofetch') return;
    if (workspaces.length === 0) return;

    fotofetchBootstrapRef.current = true;
    setUseFotofetchTemplate(true);
    setProjectName('Fotofetch');
    setProjectDesc('Growth plan + CLG tiered example');
    setSelectedWorkspaceId(workspaces[0].id);
    setNewProjectOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete('template');
    setSearchParams(next, { replace: true });
  }, [loading, workspaces, searchParams, setSearchParams]);

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) return;
    
    setSubmitting(true);
    const { error } = await createWorkspace(workspaceName.trim(), workspaceDesc.trim() || undefined);
    setSubmitting(false);
    
    if (error) {
      toast.error('Failed to create workspace');
    } else {
      toast.success('Workspace created');
      setNewWorkspaceOpen(false);
      setWorkspaceName('');
      setWorkspaceDesc('');
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim() || !selectedWorkspaceId) return;
    
    setSubmitting(true);
    const initialData: GOSTData | undefined = useFotofetchTemplate
      ? JSON.parse(JSON.stringify(fotofetchPreset)) as GOSTData
      : undefined;
    const { data, error } = await createProject(
      selectedWorkspaceId,
      projectName.trim(),
      projectDesc.trim() || undefined,
      initialData,
    );
    setSubmitting(false);
    
    if (error) {
      toast.error('Failed to create project');
    } else if (data) {
      toast.success(useFotofetchTemplate ? 'Fotofetch project saved — opening…' : 'Project created');
      setUseFotofetchTemplate(false);
      navigate(`/project/${data.id}`);
    }
  };

  const handleUpdateWorkspace = async () => {
    if (!editingWorkspace || !workspaceName.trim()) return;
    
    setSubmitting(true);
    const { error } = await updateWorkspace(editingWorkspace.id, {
      name: workspaceName.trim(),
      description: workspaceDesc.trim() || null
    });
    setSubmitting(false);
    
    if (error) {
      toast.error('Failed to update workspace');
    } else {
      toast.success('Workspace updated');
      setEditWorkspaceOpen(false);
      setEditingWorkspace(null);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !projectName.trim()) return;
    
    setSubmitting(true);
    const { error } = await updateProject(editingProject.id, {
      name: projectName.trim(),
      description: projectDesc.trim() || null
    });
    setSubmitting(false);
    
    if (error) {
      toast.error('Failed to update project');
    } else {
      toast.success('Project updated');
      setEditProjectOpen(false);
      setEditingProject(null);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!deletingWorkspace) return;
    
    setSubmitting(true);
    const { error } = await deleteWorkspace(deletingWorkspace.id);
    setSubmitting(false);
    
    if (error) {
      toast.error('Failed to delete workspace');
    } else {
      toast.success('Workspace deleted');
      setDeleteWorkspaceOpen(false);
      setDeletingWorkspace(null);
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    
    setSubmitting(true);
    const { error } = await deleteProject(deletingProject.id);
    setSubmitting(false);
    
    if (error) {
      toast.error('Failed to delete project');
    } else {
      toast.success('Project deleted');
      setDeleteProjectOpen(false);
      setDeletingProject(null);
    }
  };

  const openEditWorkspace = (workspace: Workspace) => {
    setEditingWorkspace(workspace);
    setWorkspaceName(workspace.name);
    setWorkspaceDesc(workspace.description || '');
    setEditWorkspaceOpen(true);
  };

  const openEditProject = (project: GostProject) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDesc(project.description || '');
    setEditProjectOpen(true);
  };

  const openNewProject = (workspaceId: string, opts?: { fotofetch?: boolean }) => {
    setSelectedWorkspaceId(workspaceId);
    if (opts?.fotofetch) {
      setUseFotofetchTemplate(true);
      setProjectName('Fotofetch');
      setProjectDesc('Growth plan + CLG tiered example');
    } else {
      setUseFotofetchTemplate(false);
      setProjectName('');
      setProjectDesc('');
    }
    setNewProjectOpen(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="container max-w-6xl mx-auto px-6 py-4 md:px-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">My Projects</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Organize your plans by company or team
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={newWorkspaceOpen} onOpenChange={setNewWorkspaceOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Workspace
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Workspace</DialogTitle>
                    <DialogDescription>
                      Workspaces help you organize projects by company or team.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="workspace-name">Name</Label>
                      <Input
                        id="workspace-name"
                        placeholder="e.g., Acme Corp"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workspace-desc">Description (optional)</Label>
                      <Input
                        id="workspace-desc"
                        placeholder="Brief description"
                        value={workspaceDesc}
                        onChange={(e) => setWorkspaceDesc(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewWorkspaceOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateWorkspace} disabled={!workspaceName.trim() || submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container max-w-6xl mx-auto px-6 py-8 md:px-10">
        {workspaces.length === 0 && searchParams.get('template') === 'fotofetch' && (
          <p className="mb-4 text-sm text-amber-800 dark:text-amber-200/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 rounded-xl px-4 py-3">
            Create a workspace below first. Then we’ll open the dialog to save the full Fotofetch plan to your account.
          </p>
        )}
        {workspaces.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-2">No workspaces yet</h2>
              <p className="text-muted-foreground mb-4">
                Create your first workspace to start organizing your plans.
              </p>
              <Button onClick={() => setNewWorkspaceOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Workspace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border-dashed border-border/80 bg-muted/15">
              <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">Fotofetch example plan</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Save the full demo (goal, objectives, strategies, tactics, CLG audit) as a real project—editable and backed up in your account.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => openNewProject(workspaces[0].id, { fotofetch: true })}
                >
                  Create Fotofetch project
                </Button>
              </CardContent>
            </Card>
            {workspaces.map((workspace) => {
              const workspaceProjects = getProjectsByWorkspace(workspace.id);
              
              return (
                <Card key={workspace.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FolderOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{workspace.name}</CardTitle>
                          {workspace.description && (
                            <CardDescription>{workspace.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openNewProject(workspace.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          New Project
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditWorkspace(workspace)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setDeletingWorkspace(workspace);
                                setDeleteWorkspaceOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {workspaceProjects.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No projects yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {workspaceProjects.map((project) => (
                          <div
                            key={project.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                          >
                            <button
                              className="flex items-center gap-3 flex-1 text-left"
                              onClick={() => navigate(`/project/${project.id}`)}
                            >
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{project.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditProject(project)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setDeletingProject(project);
                                    setDeleteProjectOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Workspace Dialog */}
      <Dialog open={editWorkspaceOpen} onOpenChange={setEditWorkspaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-workspace-name">Name</Label>
              <Input
                id="edit-workspace-name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-workspace-desc">Description</Label>
              <Input
                id="edit-workspace-desc"
                value={workspaceDesc}
                onChange={(e) => setWorkspaceDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditWorkspaceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateWorkspace} disabled={!workspaceName.trim() || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Project Dialog */}
      <Dialog
        open={newProjectOpen}
        onOpenChange={(open) => {
          setNewProjectOpen(open);
          if (!open) setUseFotofetchTemplate(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Start a new GOST framework for a 90-day execution cycle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="e.g., Fotofetch"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-desc">Description (optional)</Label>
              <Input
                id="project-desc"
                placeholder="Brief description"
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
              />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/80 bg-muted/20 px-3 py-3">
              <Checkbox
                id="fotofetch-template"
                checked={useFotofetchTemplate}
                onCheckedChange={(v) => setUseFotofetchTemplate(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm leading-snug">
                <span className="font-medium text-foreground">Load Fotofetch example plan</span>
                <span className="block text-muted-foreground">
                  Includes goal, objectives, strategies, tactics, repository samples, and CLG audit—same as the homepage demo.
                </span>
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewProjectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={!projectName.trim() || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={editProjectOpen} onOpenChange={setEditProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project-name">Name</Label>
              <Input
                id="edit-project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-desc">Description</Label>
              <Input
                id="edit-project-desc"
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProjectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProject} disabled={!projectName.trim() || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Confirmation */}
      <AlertDialog open={deleteWorkspaceOpen} onOpenChange={setDeleteWorkspaceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingWorkspace?.name}" and all its projects. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteWorkspace}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Project Confirmation */}
      <AlertDialog open={deleteProjectOpen} onOpenChange={setDeleteProjectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingProject?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
