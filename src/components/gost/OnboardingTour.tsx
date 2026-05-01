import { useState, useEffect } from 'react';
import { Target, Flag, Compass, CheckSquare, ArrowRight, ArrowLeft, X, Sparkles } from 'lucide-react';
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
    description: 'Start simple: set one clear 90-day goal, then build down from it.',
    tip: 'You can ignore advanced tools until your core plan is in place.',
  },
  {
    id: 'goal',
    icon: Target,
    title: 'Step 1: Goal + Objectives',
    description: 'Define one goal and 3-5 measurable objectives.',
    tip: 'If this part is clear, everything else gets easier.',
    highlight: 'goal',
  },
  {
    id: 'strategies',
    icon: Compass,
    title: 'Step 2: Strategies + Tactics',
    description: 'Choose your approach, then add concrete actions.',
    tip: 'If a tactic is vague, rewrite it until it is assignable.',
    highlight: 'strategies',
  },
  {
    id: 'advanced',
    icon: Flag,
    title: 'Step 3: Optional CLG Audit',
    description: 'Once your base plan exists, use CLG Audit for homepage recommendations.',
    tip: 'Start with Tier 1 (small + DIY). Unlock more only when needed.',
    highlight: 'objectives',
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
                step.id === 'goal' && "bg-pyramid-goal/20 text-pyramid-goal",
                step.id === 'objectives' && "bg-pyramid-objective/20 text-pyramid-objective",
                step.id === 'strategies' && "bg-pyramid-strategy/20 text-pyramid-strategy",
                step.id === 'tactics' && "bg-pyramid-tactic/20 text-pyramid-tactic",
              )}>
                <Icon className="w-6 h-6" />
              </div>
              {step.highlight && (
                <div className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  step.id === 'goal' && "bg-pyramid-goal/10 text-pyramid-goal",
                  step.id === 'objectives' && "bg-pyramid-objective/10 text-pyramid-objective",
                  step.id === 'strategies' && "bg-pyramid-strategy/10 text-pyramid-strategy",
                  step.id === 'tactics' && "bg-pyramid-tactic/10 text-pyramid-tactic",
                )}>
                  Layer {Math.max(currentStep, 1)} of 3
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
