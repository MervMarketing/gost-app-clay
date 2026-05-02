import { useState, useEffect } from 'react';
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

type TourStep = (typeof demoTourSteps)[number];

const demoTourSteps = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Welcome',
    description:
      'You will move in one line: homepage audit → backlog tactics → active plan. Same flow whether you use the demo or your own project.',
    tip: 'After this tour, open the Homepage audit tab, run Quick estimate, then add recommendations to All Tactics.',
  },
  {
    id: 'clg-audit',
    icon: ClipboardCheck,
    title: '1 · Homepage audit tab',
    layerLabel: 'Start here',
    description:
      'Rate how clearly your homepage explains what you do, for whom, and why it wins. You get practical fixes sorted by impact and effort.',
    tip: 'Use Quick estimate for an instant pass; live scan is optional if your team connects it.',
  },
  {
    id: 'goal',
    icon: Target,
    title: '2 · Active Plan tab',
    layerLabel: 'Pyramid',
    description:
      'Set your execution goal, objectives, strategies, and the tactics you are running now. Keep the language tied to what the audit surfaced.',
    tip: 'If the audit flagged a weak CTA, at least one objective should name the conversion you are trying to move.',
  },
  {
    id: 'strategies',
    icon: Compass,
    title: '3 · All Tactics tab',
    layerLabel: 'Backlog',
    description:
      'Ideas and queued work live here until you promote them. Send audit rows here in one click, then choose what graduates to the active plan.',
    tip: 'If a tactic is not concrete enough to schedule, leave it here until it is.',
  },
];

function getProjectTourSteps(projectName: string, hasPlanContent: boolean): typeof demoTourSteps {
  const name = projectName?.trim() || 'this project';
  return [
    {
      id: 'welcome',
      icon: Sparkles,
      title: `Welcome — ${name}`,
      description: hasPlanContent
        ? 'This project already has plan data. The workflow is the same: use the homepage audit to sharpen the story, park ideas in All Tactics, and keep Active Plan aligned with what you are actually executing.'
        : 'Start by auditing your homepage, parking ideas under All Tactics, then shaping the pyramid on Active Plan.',
      tip: 'The three tabs across the top are the whole workflow: Homepage audit → All Tactics → Active Plan.',
    },
    {
      id: 'clg-audit',
      icon: ClipboardCheck,
      title: '1 · Homepage audit',
      layerLabel: 'You are here',
      description:
        'Paste your site URL. Quick estimate runs in the browser; live scan needs your team to wire the scanner (optional).',
      tip: 'After you see results, use “Add … to repository” to send fixes into All Tactics.',
    },
    {
      id: 'goal',
      icon: Target,
      title: '2 · Active Plan',
      layerLabel: 'Next',
      description:
        'Goal, objectives, strategies, and promoted tactics describe what you are actually executing this cycle.',
      tip: 'Promote only tactics that are specific enough to own and measure.',
    },
    {
      id: 'strategies',
      icon: Compass,
      title: '3 · All Tactics',
      layerLabel: 'Parking lot',
      description:
        'Backlog and queued ideas stay here until you promote them. Keeps the active plan honest.',
      tip: 'Use views like “Fix first” when you need to clean up links before you promote.',
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

            {/* Tip box */}
            <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">💡 Tip:</span>{' '}
                {step.tip}
              </p>
            </div>
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
                  {variant === 'project' ? 'Go to audit' : 'Start exploring'}
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
