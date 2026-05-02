import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Target, Compass, ArrowRight, ArrowLeft, X, Sparkles, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type OnboardingTourVariant = 'demo' | 'project';

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
  /** `project` = first open of a saved workspace; maps to the real tabs in the header. */
  variant?: OnboardingTourVariant;
  projectName?: string;
  /** When the project already has pyramid data (e.g. template); welcome copy adjusts. */
  hasPlanContent?: boolean;
}

interface TourStep {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Shown only when it adds something the main line does not repeat. */
  tip?: string;
  layerLabel?: string;
}

const demoTourSteps: TourStep[] = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Welcome',
    description:
      'You get a simple homepage score and a short fix list—so your team stops debating and starts shipping. Most people finish the first check in under two minutes.',
  },
  {
    id: 'clg-audit',
    icon: ClipboardCheck,
    title: 'Check your homepage',
    layerLabel: 'Start here',
    description:
      'Paste your site address. Tap Quick estimate for an instant read, or Live scan when your workspace is set up for it.',
  },
  {
    id: 'goal',
    icon: Target,
    title: 'Active Plan',
    layerLabel: 'Where work goes live',
    description:
      'This tab is your real plan for this period—what you are doing now, not someday. Keep it short so everyone knows the priority.',
  },
  {
    id: 'strategies',
    icon: Compass,
    title: 'All Tactics',
    layerLabel: 'Ideas on deck',
    description:
      'Stash extra ideas here. When one is ready, move it into Active Plan so it actually gets done.',
  },
];

function getProjectTourSteps(projectName: string, hasPlanContent: boolean): TourStep[] {
  const name = projectName?.trim() || 'this project';
  return [
    {
      id: 'welcome',
      icon: Sparkles,
      title: `You're in — ${name}`,
      description: hasPlanContent
        ? 'This project already has a plan. Add a quick homepage check to sharpen your story—then keep Active Plan and All Tactics in sync with what you are really doing.'
        : 'You are three tabs away from a clear score, a tidy idea list, and a plan your team can follow. Small steps now save long meetings later.',
    },
    {
      id: 'clg-audit',
      icon: ClipboardCheck,
      title: 'Homepage check',
      layerLabel: 'You are here',
      description:
        'Paste your URL and run Quick estimate for an instant score. Live scan is optional—use it when your app is connected.',
      tip: 'After you see results, one click sends fixes to All Tactics.',
    },
    {
      id: 'goal',
      icon: Target,
      title: 'Active Plan',
      layerLabel: 'Next tab',
      description:
        'Put the work you are actually running this cycle here—goals and tactics your team can own.',
    },
    {
      id: 'strategies',
      icon: Compass,
      title: 'All Tactics',
      layerLabel: 'Ideas on deck',
      description:
        'Hold future ideas here. Promote only what you are ready to execute so Active Plan stays honest.',
    },
  ];
}

export function OnboardingTour({
  onComplete,
  onSkip,
  variant = 'demo',
  projectName = '',
  hasPlanContent = false,
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const tourSteps: TourStep[] =
    variant === 'project' ? getProjectTourSteps(projectName, hasPlanContent) : demoTourSteps;

  const step = tourSteps[currentStep];
  const Icon = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === tourSteps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => prev + 1);
      setIsAnimating(false);
    }, 150);
  };

  const handlePrev = () => {
    if (isFirst) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => prev - 1);
      setIsAnimating(false);
    }, 150);
  };

  // Allow keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, onSkip]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onSkip}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          {/* Progress indicator */}
          <div className="px-6 pt-4 pb-2">
            <div className="flex items-center gap-1.5">
              {tourSteps.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-300",
                    idx < currentStep && "bg-primary",
                    idx === currentStep && "bg-primary",
                    idx > currentStep && "bg-muted"
                  )}
                />
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                Step {currentStep + 1} of {tourSteps.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground -mr-2"
                onClick={onSkip}
              >
                Skip tour
                <X className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div 
            className={cn(
              "px-6 py-6 transition-opacity duration-150",
              isAnimating && "opacity-0"
            )}
          >
            {/* Icon badge */}
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                step.id === 'welcome' && "bg-primary/10 text-primary",
                step.id === 'clg-audit' && "bg-primary/10 text-primary",
                step.id === 'goal' && "bg-pyramid-goal/20 text-pyramid-goal",
                step.id === 'strategies' && "bg-pyramid-strategy/20 text-pyramid-strategy",
              )}>
                <Icon className="w-6 h-6" />
              </div>
              {'layerLabel' in step && step.layerLabel && (
                <div className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  step.id === 'clg-audit' && "bg-primary/10 text-primary",
                  step.id === 'goal' && "bg-pyramid-goal/10 text-pyramid-goal",
                  step.id === 'strategies' && "bg-pyramid-strategy/10 text-pyramid-strategy",
                )}>
                  {step.layerLabel}
                </div>
              )}
            </div>

            <h2 className="text-xl font-semibold text-foreground mb-2">
              {step.title}
            </h2>
            <p className="text-muted-foreground mb-4">
              {step.description}
            </p>

            {step.tip ? (
              <div className="rounded-lg border border-border/50 bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Tip:</span> {step.tip}
                </p>
              </div>
            ) : null}
          </div>

          {/* Navigation */}
          <div className="px-6 pb-6 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={isFirst}
              className={cn(isFirst && "invisible")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <Button onClick={handleNext} className="gap-2">
              {isLast ? (
                <>
                  {variant === 'project' ? 'Open homepage check' : "Let's go"}
                  <Sparkles className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
