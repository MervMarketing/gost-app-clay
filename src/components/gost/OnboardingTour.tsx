import { useState, useEffect } from 'react';
import { Target, Compass, ArrowRight, ArrowLeft, X, Sparkles, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

const tourSteps = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Welcome',
    description:
      'Every plan starts with a CLG homepage audit. Its scores and recommendations shape what you add to the repository and promote into your GOST pyramid.',
    tip: 'Run the audit first, push recommendations into the repository, then align goal, objectives, strategies, and tactics with that backlog.',
  },
  {
    id: 'clg-audit',
    icon: ClipboardCheck,
    title: 'Step 1: CLG Audit (start here)',
    layerLabel: 'Starting point',
    description:
      'Capture how your homepage reads today. You get tiered recommendations (DIY / DWY / DFY) grounded in clarity, positioning, structure, and conversion.',
    tip: 'Add visible recommendations to the repository, then promote the ones that belong in your active plan. Tier 1 + DIY is the default “small start.”',
  },
  {
    id: 'goal',
    icon: Target,
    title: 'Step 2: Goal + Objectives',
    layerLabel: 'Layer 1 of 3',
    description:
      'Set your 90-day goal and measurable objectives so they reflect what the audit exposed — not generic placeholders.',
    tip: 'If the audit flagged a conversion gap, make sure at least one objective names the metric you are trying to move.',
  },
  {
    id: 'strategies',
    icon: Compass,
    title: 'Step 3: Strategies + Tactics',
    layerLabel: 'Layer 2–3 of 3',
    description:
      'Strategies and tactics should ladder up from the same story the audit is telling. Pull from repository items you already prioritized.',
    tip: 'If a tactic cannot be assigned and dated, rewrite it until it can — or leave it in the repository until it is concrete enough.',
  },
];

export function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

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
  }, [currentStep]);

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
                  Start Exploring
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
