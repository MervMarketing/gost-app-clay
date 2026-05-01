import { useRef, useState, useEffect, useCallback } from 'react';
import { ClientPriority, FeedbackRecord, getFeedbackForProject, clearFeedbackForProject } from '@/lib/feedbackService';
import { useNavigate } from 'react-router-dom';
import { useGOSTData } from '@/hooks/useGOSTData';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { PyramidVisualization } from './PyramidVisualization';
import { InputPanel } from './InputPanel';
import { ViewOnlyPanel } from './ViewOnlyPanel';
import { TimeframeSelector } from './TimeframeSelector';
import { FullScreenOverview } from './FullScreenOverview';
import { IntroPage } from './IntroPage';
import { DemoLoader } from './DemoLoader';
import { SampleDataBanner } from './SampleDataBanner';
import { OnboardingTour } from './OnboardingTour';
import { QuickImport } from './QuickImport';
import { ExportMenu } from './ExportMenu';
import { AlignmentSummary } from './AlignmentSummary';
import { NormalizationPanel } from './NormalizationPanel';
import { GOSTRepository } from './GOSTRepository';
import { ShareDialog } from './ShareDialog';
import { SharedPlanIntro } from './SharedPlanIntro';
import { ClientFeedbackSummary } from './ClientFeedbackSummary';
import { UserMenu } from './UserMenu';
import { ExecutionBulkImport, ExecutionImportData } from './ExecutionBulkImport';
import { FullPlanImport, FullPlanImportData } from './FullPlanImport';
import { PyramidItemEditDialog } from './PyramidItemEditDialog';
import { PyramidLayer, GOSTData, TacticStatus, Objective, Strategy, Tactic, CLGRecommendation } from '@/types/gost';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { RotateCcw, Maximize2, Upload, MoreVertical, Archive, Eye, FileX, ArrowLeft, Rocket, LayoutDashboard, PlayCircle, ClipboardCheck } from 'lucide-react';
import { RepositoryDashboard } from './RepositoryDashboard';
import { CLGAuditPanel } from './CLGAuditPanel';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { parseGOSTFromText } from '@/lib/gostSerializer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GOSTBuilderProps {
  projectId?: string;
  projectName?: string;
  initialData?: GOSTData;
  isViewOnly?: boolean;
  shareId?: string;
  onSave?: (data: GOSTData) => void;
  onBack?: () => void;
}

export function GOSTBuilder({ projectId, projectName, initialData, isViewOnly: isViewOnlyProp, shareId, onSave, onBack }: GOSTBuilderProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const pyramidRef = useRef<HTMLDivElement>(null);
  const detailsPanelRef = useRef<HTMLDivElement>(null);
  const [showIntro, setShowIntro] = useState(!projectId && !initialData);
  const [showDemoLoader, setShowDemoLoader] = useState(false);
  const [showSampleBanner, setShowSampleBanner] = useState(false);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [showSharedIntro, setShowSharedIntro] = useState(() => {
    if (!isViewOnlyProp || !shareId) return false;
    return !localStorage.getItem(`merv-shared-intro-${shareId}`);
  });
  const [showQuickImport, setShowQuickImport] = useState(false);
  const [activeLayer, setActiveLayer] = useState<PyramidLayer>('goal');
  const [confirmedStages, setConfirmedStages] = useState<Set<PyramidLayer>>(new Set());
  const [activeTab, setActiveTab] = useState<'builder' | 'repository' | 'audit'>('builder');
  const [clientFeedbackMap, setClientFeedbackMap] = useState<Record<string, { priority: ClientPriority; note?: string }>>({});
  
  // Load client feedback for admin view
  useEffect(() => {
    if (projectId && !isViewOnlyProp) {
      getFeedbackForProject(projectId).then((records) => {
        const map: Record<string, { priority: ClientPriority; note?: string }> = {};
        records.forEach((r) => {
          map[r.tactic_id] = { priority: r.priority as ClientPriority, note: r.note || undefined };
        });
        setClientFeedbackMap(map);
      });
    }
  }, [projectId, isViewOnlyProp]);

  // Import confirmation dialog state
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  // Pyramid item edit state
  const [pyramidEditOpen, setPyramidEditOpen] = useState(false);
  const [pyramidEditType, setPyramidEditType] = useState<'objective' | 'strategy' | 'tactic' | null>(null);
  const [pyramidEditItem, setPyramidEditItem] = useState<Objective | Strategy | Tactic | null>(null);
  
  // Focused item in repository (for navigation from Active Plan)
  const [focusedRepositoryItemId, setFocusedRepositoryItemId] = useState<string | null>(null);
  
  // Focused tactic in Active Plan (for navigation from All Tactics)
  const [focusedTacticId, setFocusedTacticId] = useState<string | null>(null);
  const showAuditTab = !isViewOnly && (data.objectives.length > 0 || Boolean(data.clgAudit));
  
  // Handler for layer clicks - scrolls to details panel on mobile
  const handleLayerClick = useCallback((layer: PyramidLayer) => {
    setActiveLayer(layer);
    // On mobile in view-only mode, scroll to the details panel
    if (isMobile && isViewOnlyProp && detailsPanelRef.current) {
      setTimeout(() => {
        detailsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isMobile, isViewOnlyProp]);
  
  const {
    data,
    isViewOnly,
    updateExecutionGoal,
    updateObjective,
    addObjective,
    bulkAddObjectives,
    removeObjective,
    updateStrategy,
    addStrategy,
    bulkAddStrategies,
    bulkAddStrategiesWithObjectives,
    structuredBulkImport,
    executionBulkImport,
    fullPlanImport,
    removeStrategy,
    updateTactic,
    addTactic,
    bulkAddTactics,
    removeTactic,
    moveTactic,
    reorderTactics,
    addRepositoryItem,
    bulkAddRepositoryItems,
    updateRepositoryItem,
    bulkUpdateRepositoryItems,
    removeRepositoryItem,
    promoteRepositoryItem,
    setTimeframe,
    updatePlanMeta,
    updatePulseFrequency,
    resetToPreset,
    startFresh,
    importData,
    getShareableURL,
    alignmentIssues,
    hasIssue,
    getIssueMessage,
    executionStats
  } = useGOSTData({ initialData, isViewOnly: isViewOnlyProp, onSave });

  // Handler for execution bulk import (legacy - strategies + tactics)
  const handleExecutionImport = (strategies: ExecutionImportData[]) => {
    const result = executionBulkImport(strategies);
    setShowIntro(false);
    setConfirmedStages(new Set(['goal', 'objectives', 'strategies', 'tactics']));
    
    const parts = [];
    if (result.strategiesAdded > 0) parts.push(`${result.strategiesAdded} strategies`);
    if (result.tacticsAdded > 0) parts.push(`${result.tacticsAdded} active tactics`);
    if (result.backlogAdded > 0) parts.push(`${result.backlogAdded} backlog items`);
    
    toast.success(`Imported ${parts.join(', ')}`);
  };

  // Handler for full plan import (Goal + Objectives + Strategies + Tactics)
  const handleFullPlanImport = (planData: FullPlanImportData) => {
    const result = fullPlanImport(planData);
    setShowIntro(false);
    setShowImportDialog(false);
    setConfirmedStages(new Set(['goal', 'objectives', 'strategies', 'tactics']));
    
    const parts = [];
    if (result.goalSet) parts.push('goal set');
    if (result.objectivesAdded > 0) parts.push(`${result.objectivesAdded} objectives`);
    if (result.strategiesAdded > 0) parts.push(`${result.strategiesAdded} strategies`);
    if (result.tacticsAdded > 0) parts.push(`${result.tacticsAdded} active tactics`);
    if (result.backlogAdded > 0) parts.push(`${result.backlogAdded} backlog items`);
    
    toast.success(`Plan imported: ${parts.join(', ')}`);
  };

  // Check if there's existing plan data
  const hasExistingPlan = Boolean(
    data?.executionGoal?.text?.trim() ||
    data?.objectives?.length > 0 ||
    data?.strategies?.length > 0 ||
    data?.tactics?.length > 0
  );

  // Handler for import button click - shows confirmation if plan exists
  const handleImportClick = () => {
    if (hasExistingPlan) {
      setShowImportConfirm(true);
    } else {
      setShowImportDialog(true);
    }
  };

  const handleConfirmReplace = () => {
    setShowImportConfirm(false);
    setShowImportDialog(true);
  };


  // Check URL for encoded data or projectId - set confirmed stages based on actual content
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gost') || projectId) {
      setShowIntro(false);
    }
  }, [projectId]);

  // Separate effect to set confirmed stages based on data content
  // This runs when data changes and ensures stages are confirmed based on actual content
  useEffect(() => {
    if (!projectId && !new URLSearchParams(window.location.search).get('gost')) {
      return; // Only apply to loaded projects
    }
    
    // Only confirm stages that have actual content
    const confirmed = new Set<PyramidLayer>();
    if (data?.executionGoal?.text?.trim()) {
      confirmed.add('goal');
    }
    if (data?.objectives?.length > 0) {
      confirmed.add('goal'); // Goal must be confirmed to have objectives
      confirmed.add('objectives');
    }
    if (data?.strategies?.length > 0) {
      confirmed.add('goal');
      confirmed.add('objectives');
      confirmed.add('strategies');
    }
    if (data?.tactics?.length > 0) {
      confirmed.add('goal');
      confirmed.add('objectives');
      confirmed.add('strategies');
      confirmed.add('tactics');
    }
    setConfirmedStages(confirmed);
  }, [projectId, data?.executionGoal?.text, data?.objectives?.length, data?.strategies?.length, data?.tactics?.length]);

  const handleConfirmStage = (layer: PyramidLayer) => {
    setConfirmedStages(prev => new Set([...prev, layer]));
    const layers: PyramidLayer[] = ['goal', 'objectives', 'strategies', 'tactics'];
    const currentIdx = layers.indexOf(layer);
    if (currentIdx < layers.length - 1) {
      setActiveLayer(layers[currentIdx + 1]);
    }
  };

  // Global paste listener for auto-import
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const text = e.clipboardData?.getData('text');
      if (!text) return;

      const parsed = parseGOSTFromText(text);
      if (parsed) {
        e.preventDefault();
        importData(parsed);
        setShowIntro(false);
        setShowQuickImport(false);
        setConfirmedStages(new Set(['goal', 'objectives', 'strategies', 'tactics']));
        toast.success('Plan imported from clipboard');
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [importData]);


  const handleImport = (newData: typeof data) => {
    importData(newData);
    setShowIntro(false);
    setShowQuickImport(false);
    setConfirmedStages(new Set(['goal', 'objectives', 'strategies', 'tactics']));
  };

  const handleReset = () => {
    resetToPreset();
    setConfirmedStages(new Set());
    setActiveLayer('goal');
  };

  const handleStartFresh = () => {
    startFresh();
    setConfirmedStages(new Set());
    setActiveLayer('goal');
    setIsDemoMode(false);
    setShowSampleBanner(false);
    toast.success('Started with a fresh plan');
  };

  const handleDemoStart = () => {
    setShowIntro(false);
    setShowDemoLoader(true);
  };

  const handleDemoLoaderComplete = () => {
    setShowDemoLoader(false);
    // Check if user has seen the tour before
    const hasSeenTour = localStorage.getItem('gost-onboarding-complete');
    if (!hasSeenTour) {
      setShowOnboardingTour(true);
    }
    setIsDemoMode(true);
    setShowSampleBanner(true);
    setConfirmedStages(new Set(['goal', 'objectives', 'strategies', 'tactics']));
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('gost-onboarding-complete', 'true');
    setShowOnboardingTour(false);
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('gost-onboarding-complete', 'true');
    setShowOnboardingTour(false);
  };

  const handleBannerStartFresh = () => {
    if (isAuthenticated) {
      navigate('/projects');
    } else {
      handleStartFresh();
    }
  };

  // Handler for pyramid badge clicks
  const handlePyramidItemClick = (type: 'objective' | 'strategy' | 'tactic', item: Objective | Strategy | Tactic) => {
    setPyramidEditType(type);
    setPyramidEditItem(item);
    setPyramidEditOpen(true);
  };

  // Show intro page
  if (showIntro) {
    return <IntroPage onGetStarted={handleDemoStart} />;
  }

  // Show demo loader animation
  if (showDemoLoader) {
    return <DemoLoader onComplete={handleDemoLoaderComplete} />;
  }

  return (
    <>
      {showOnboardingTour && (
        <OnboardingTour 
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
      {showFullScreen && (
        <FullScreenOverview data={data} onClose={() => setShowFullScreen(false)} />
      )}
      
      {/* Pyramid Item Edit Dialog */}
      <PyramidItemEditDialog
        open={pyramidEditOpen}
        onOpenChange={setPyramidEditOpen}
        itemType={pyramidEditType}
        item={pyramidEditItem}
        objectives={data.objectives}
        strategies={data.strategies}
        onUpdateObjective={updateObjective}
        onUpdateStrategy={updateStrategy}
        onUpdateTactic={updateTactic}
        onRemoveObjective={removeObjective}
        onRemoveStrategy={removeStrategy}
        onRemoveTactic={removeTactic}
      />
    <div className="min-h-screen bg-background">
      {/* Simplified Header */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="container max-w-6xl mx-auto px-3 sm:px-6 md:px-10 py-3 sm:py-4">
          {/* Mobile: stacked layout, Desktop: row layout */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Top row: Back + Title + User Menu (mobile) */}
            <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-6">
              <div className="flex items-center gap-3 sm:gap-6">
                {onBack && (
                  <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 sm:h-9 sm:w-9 shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div className="min-w-0">
                  <h1 className="font-display text-base sm:text-xl font-semibold tracking-tight text-foreground truncate">
                    {projectName || 'Merv'}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {isViewOnly ? 'View only' : 'Execution planning'}
                  </p>
                </div>
              </div>
              
              {/* Mobile-only: User menu on top row */}
              <div className="sm:hidden">
                <UserMenu />
              </div>
            </div>
            
            {/* Bottom row on mobile: Actions */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
              {/* Timeframe selector - hide in view mode */}
              {!isViewOnly && <TimeframeSelector value={data.timeframe} onChange={setTimeframe} />}
              
              {/* Primary Import - hide on very small screens, show in dropdown */}
              {!isViewOnly && (
                <>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="gap-1.5 shrink-0 hidden sm:flex" 
                    onClick={handleImportClick}
                  >
                    <Rocket className="h-4 w-4" />
                    <span className="hidden md:inline">Import Plan</span>
                  </Button>
                  
                  {/* Confirmation dialog when plan exists */}
                  <AlertDialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
                    <AlertDialogContent className="mx-4 max-w-[calc(100%-2rem)] sm:max-w-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Replace existing plan?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You already have a plan with goals, objectives, strategies, or tactics. Importing a new plan will replace your current work.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                        <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmReplace} className="w-full sm:w-auto">
                          Replace Plan
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  {/* Import dialog - controlled externally */}
                  <FullPlanImport
                    onImport={handleFullPlanImport}
                    open={showImportDialog}
                    onOpenChange={setShowImportDialog}
                  />
                </>
              )}
              
              {isViewOnly && (
                <span className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground border border-border/80 bg-muted/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shrink-0">
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground/80" />
                  View only
                </span>
              )}
              
              {/* Spacer for desktop */}
              <div className="hidden sm:block flex-1" />
              
              {/* Right-side actions */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Dashboard - visible to all including view-only */}
                <Dialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                          <LayoutDashboard className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Dashboard</TooltipContent>
                  </Tooltip>
                  <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto mx-2 sm:mx-auto border-border/80">
                    <DialogHeader>
                      <DialogTitle>Plan dashboard</DialogTitle>
                    </DialogHeader>
                    {/* Client Feedback Summary */}
                    {Object.keys(clientFeedbackMap).length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          📋 Client Feedback
                        </h3>
                        <ClientFeedbackSummary 
                          data={data} 
                          feedbackMap={clientFeedbackMap}
                          onClearFeedback={async () => {
                            if (projectId) {
                              const success = await clearFeedbackForProject(projectId);
                              if (success) {
                                setClientFeedbackMap({});
                                toast.success('All feedback cleared');
                              } else {
                                toast.error('Failed to clear feedback');
                              }
                            }
                          }}
                        />
                      </div>
                    )}
                    <RepositoryDashboard 
                      data={data} 
                      onUpdateTactic={updateTactic}
                      onUpdateRepositoryItem={updateRepositoryItem}
                      onUpdatePulseFrequency={updatePulseFrequency}
                    />
                  </DialogContent>
                </Dialog>
                
                {/* Only show share if not in view mode */}
                {!isViewOnly && <ShareDialog data={data} projectId={projectId} iconOnly />}
                
                {/* Export - hide in view mode */}
                {!isViewOnly && <ExportMenu data={data} pyramidRef={pyramidRef} iconOnly />}
                
                {/* Overview - hide on mobile, available in more menu */}
                {!isViewOnly && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => setShowFullScreen(true)} className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9">
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Overview</TooltipContent>
                  </Tooltip>
                )}
                
                {/* More options - only in edit mode */}
                {!isViewOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Mobile-only: Import Plan option */}
                      <DropdownMenuItem onClick={handleImportClick} className="sm:hidden">
                        <Rocket className="h-4 w-4 mr-2" />
                        Import Plan
                      </DropdownMenuItem>
                      {/* Mobile-only: Overview option */}
                      <DropdownMenuItem onClick={() => setShowFullScreen(true)} className="sm:hidden">
                        <Maximize2 className="h-4 w-4 mr-2" />
                        Overview
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="sm:hidden" />
                      <ExecutionBulkImport
                        objectives={data.objectives}
                        onImport={handleExecutionImport}
                        trigger={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Rocket className="h-4 w-4 mr-2" />
                            Import Strategies + Tactics
                          </DropdownMenuItem>
                        }
                      />
                      <DropdownMenuItem onClick={() => setShowQuickImport(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Import from Text
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleStartFresh}>
                        <FileX className="h-4 w-4 mr-2" />
                        Start Fresh
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleReset} className="text-muted-foreground">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset to Example
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {/* User menu - desktop only (mobile is in top row) */}
                <div className="hidden sm:block">
                  <UserMenu />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sample data banner for demo mode */}
      {showSampleBanner && isDemoMode && (
        <SampleDataBanner 
          onStartFresh={handleBannerStartFresh}
          onDismiss={() => setShowSampleBanner(false)}
        />
      )}

      {/* Main content */}
      <main className="container max-w-6xl mx-auto px-3 sm:px-6 md:px-10 py-4 sm:py-8">
        {/* View-only banner */}
        {isViewOnly && !showSharedIntro && (
          <Alert className="mb-6 border-border/80 bg-muted/40 text-foreground">
            <Eye className="h-4 w-4 text-foreground/70" />
            <AlertDescription className="text-muted-foreground">
              You&apos;re viewing a read-only version of this plan.
            </AlertDescription>
          </Alert>
        )}

        {/* Shared plan intro overlay */}
        {showSharedIntro && (
          <SharedPlanIntro
            goalText={data.executionGoal?.text}
            hasFeedback={!!shareId}
            onDismiss={() => {
              setShowSharedIntro(false);
              if (shareId) localStorage.setItem(`merv-shared-intro-${shareId}`, '1');
              setActiveLayer('tactics');
              // Scroll to details panel on mobile
              if (isMobile && detailsPanelRef.current) {
                setTimeout(() => {
                  detailsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }
            }}
          />
        )}

        {/* Quick Import Panel - shown when user wants to import */}
        {showQuickImport && !isViewOnly && (
          <QuickImport 
            onImport={handleImport} 
            onDismiss={() => setShowQuickImport(false)} 
          />
        )}

        {/* Tabs for Builder vs Repository */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'builder' | 'repository' | 'audit')} className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="builder" className="gap-1.5 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm">
                <PlayCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="sm:inline">Active Plan</span>
              </TabsTrigger>
              {!isViewOnly && (
                <TabsTrigger value="repository" className="gap-1.5 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm">
                  <Archive className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="sm:inline">All Tactics</span>
                  {data.repository.length > 0 && (
                    <span className="ml-1 text-[10px] sm:text-xs bg-muted px-1 sm:px-1.5 py-0.5 rounded-full">
                      {data.repository.filter(i => i.status === 'backlog' || i.status === 'queued').length}
                    </span>
                  )}
                </TabsTrigger>
              )}
              {showAuditTab && (
                <TabsTrigger value="audit" className="gap-1.5 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm">
                  <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="sm:inline">CLG Audit</span>
                </TabsTrigger>
              )}
            </TabsList>
            
            {/* Quick switch links - hidden on mobile since tabs are already visible */}
            {!isViewOnly && activeTab === 'builder' && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={() => setActiveTab('repository')}
              >
                <Archive className="h-3.5 w-3.5" />
                View All Tactics
              </Button>
            )}
            {!isViewOnly && activeTab === 'repository' && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={() => setActiveTab('builder')}
              >
                <PlayCircle className="h-3.5 w-3.5" />
                View Active Plan
              </Button>
            )}
          </div>

          <TabsContent value="builder" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pyramid visualization */}
              <div className="order-2 lg:order-1">
                <div 
                  ref={pyramidRef}
                  className="bg-card rounded-2xl border border-border/80 shadow-subtle p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Strategic pyramid
                    </h2>
                    {alignmentIssues.length > 0 && (
                      <span className="text-xs bg-warning-muted text-warning px-2 py-1 rounded-full">
                        {alignmentIssues.length} alignment {alignmentIssues.length === 1 ? 'issue' : 'issues'}
                      </span>
                    )}
                  </div>
                  <PyramidVisualization
                    data={data}
                    alignmentIssues={alignmentIssues}
                    activeLayer={activeLayer}
                    onLayerClick={handleLayerClick}
                    onItemClick={!isViewOnly ? handlePyramidItemClick : undefined}
                  />
                </div>

                {/* Alignment summary */}
                {alignmentIssues.length > 0 && (
                  <div className="mt-4">
                    <AlignmentSummary issues={alignmentIssues} />
                  </div>
                )}

                {/* Normalization panel - hidden in view-only mode */}
                {!isViewOnly && (
                  <div className="mt-4 p-4 bg-card rounded-2xl border border-border/80 shadow-subtle">
                    <NormalizationPanel data={data} />
                  </div>
                )}
                
                {/* Execution-aware stats */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  {[
                    { 
                      label: 'Goal', 
                      value: data.executionGoal.text ? '✓' : '—', 
                      active: activeLayer === 'goal', 
                      confirmed: confirmedStages.has('goal'),
                      subtitle: null
                    },
                    { 
                      label: 'Objectives', 
                      value: executionStats.objectives.total, 
                      active: activeLayer === 'objectives', 
                      confirmed: confirmedStages.has('objectives'),
                      subtitle: executionStats.objectives.active > 0 ? `${executionStats.objectives.active} active` : null
                    },
                    { 
                      label: 'Strategies', 
                      value: executionStats.strategies.total, 
                      active: activeLayer === 'strategies', 
                      confirmed: confirmedStages.has('strategies'),
                      subtitle: executionStats.strategies.active > 0 ? `${executionStats.strategies.active} active` : null
                    },
                    { 
                      label: 'Tactics', 
                      value: executionStats.tactics.total - executionStats.tactics.cut, 
                      active: activeLayer === 'tactics', 
                      confirmed: confirmedStages.has('tactics'),
                      subtitle: `${executionStats.tactics.active} active · ${executionStats.tactics.completed} done`
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`text-center p-3 rounded-xl border transition-colors cursor-pointer ${
                        stat.active 
                          ? 'border-foreground/20 bg-muted/60 shadow-subtle' 
                          : 'border-border/80 bg-card hover:border-foreground/15 hover:bg-muted/30'
                      }`}
                      onClick={() => handleLayerClick(stat.label.toLowerCase() as PyramidLayer)}
                    >
                      <div className="text-2xl font-semibold font-display text-foreground">
                        {stat.value}
                        {stat.confirmed && <span className="text-success ml-1 text-sm">✓</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                      {stat.subtitle && (
                        <div className="text-[10px] text-muted-foreground/70 mt-0.5">{stat.subtitle}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Input panel or View-only panel */}
              <div className="order-1 lg:order-2" ref={detailsPanelRef}>
                {isViewOnly ? (
                  <ViewOnlyPanel data={data} activeLayer={activeLayer} shareId={shareId} />
                ) : (
                  <InputPanel
                    data={data}
                    activeLayer={activeLayer}
                    confirmedStages={confirmedStages}
                    onConfirmStage={handleConfirmStage}
                    updateExecutionGoal={updateExecutionGoal}
                    updateObjective={updateObjective}
                    addObjective={addObjective}
                    bulkAddObjectives={bulkAddObjectives}
                    removeObjective={removeObjective}
                    updateStrategy={updateStrategy}
                    addStrategy={addStrategy}
                    bulkAddStrategies={bulkAddStrategies}
                    bulkAddStrategiesWithObjectives={bulkAddStrategiesWithObjectives}
                    structuredBulkImport={structuredBulkImport}
                    removeStrategy={removeStrategy}
                    updateTactic={updateTactic}
                    addTactic={addTactic}
                    bulkAddTactics={bulkAddTactics}
                    removeTactic={removeTactic}
                    moveTactic={moveTactic}
                    reorderTactics={reorderTactics}
                    hasIssue={hasIssue}
                    getIssueMessage={getIssueMessage}
                    isViewOnly={isViewOnly}
                    focusedTacticId={focusedTacticId}
                    onClearTacticFocus={() => setFocusedTacticId(null)}
                    onSwitchToRepository={(tacticId) => {
                      // Find the corresponding repository item by matching the tactic
                      const tactic = data.tactics.find(t => t.id === tacticId);
                      if (tactic) {
                        // Search for repository item with matching description
                        const repoItem = data.repository.find(r => 
                          r.description === tactic.description && r.type === 'tactic'
                        );
                        if (repoItem) {
                          setFocusedRepositoryItemId(repoItem.id);
                        }
                      }
                      setActiveTab('repository');
                    }}
                    clientFeedbackMap={clientFeedbackMap}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          {/* Repository tab - hide in view mode */}
          {!isViewOnly && (
            <TabsContent value="repository" className="mt-6">
              <GOSTRepository 
                data={data}
                onAdd={addRepositoryItem}
                onBulkAdd={bulkAddRepositoryItems}
                onUpdate={updateRepositoryItem}
                onUpdateTactic={updateTactic}
                onBulkUpdate={bulkUpdateRepositoryItems}
                onRemove={removeRepositoryItem}
                onPromote={promoteRepositoryItem}
                onAddObjective={addObjective}
                onUpdateObjective={updateObjective}
                onAddStrategy={addStrategy}
                onUpdateStrategy={updateStrategy}
                focusedItemId={focusedRepositoryItemId}
                onClearFocus={() => setFocusedRepositoryItemId(null)}
                onSwitchToActivePlan={(tacticDescription) => {
                  // Find the tactic by description in Active Plan
                  const tactic = data.tactics.find(t => t.description === tacticDescription);
                  if (tactic) {
                    setFocusedTacticId(tactic.id);
                  }
                  setActiveTab('builder');
                  setActiveLayer('tactics');
                }}
              />
            </TabsContent>
          )}
          {showAuditTab && (
            <TabsContent value="audit" className="mt-6">
              <CLGAuditPanel
                data={data}
                onSaveAudit={(audit) => updatePlanMeta('clgAudit', audit)}
                onCreateRecommendations={(recommendations: CLGRecommendation[]) => {
                  recommendations.forEach((rec) => {
                    const abilityToExecute =
                      rec.effort === 'low' ? 'high' : rec.effort === 'medium' ? 'medium' : 'low';
                    const timeHorizon = rec.window === '30-day' ? 'short' : rec.window === '60-day' ? 'medium' : 'long';
                    addRepositoryItem({
                      type: 'tactic',
                      description: rec.text,
                      notes: `CLG recommendation · impact=${rec.impact} · effort=${rec.effort} · window=${rec.window}`,
                      outcomeSupported: null,
                      growthStage: 'scaling',
                      companyContext: 'small_team',
                      abilityToExecute,
                      timeHorizon,
                      status: 'backlog',
                      executionWindow: rec.window,
                    });
                  });
                  toast.success(`Added ${recommendations.length} recommendations to repository`);
                  setActiveTab('repository');
                }}
              />
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/70 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-6 py-6 md:px-10">
          <p className="text-center text-xs text-muted-foreground">
            GOST framework — Ideas are cheap. Execution is selective.
          </p>
        </div>
      </footer>
    </div>
    </>
  );
}
