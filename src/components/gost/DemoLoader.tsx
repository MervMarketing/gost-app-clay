import { useState, useEffect } from 'react';
import { Target, Flag, Compass, CheckSquare, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DemoLoaderProps {
  onComplete: () => void;
}

const steps = [
  { 
    id: 'goal', 
    activeLabel: 'Setting 90-Day Goal', 
    completeLabel: '90-Day Goal Set',
    icon: Target,
    description: 'The north star for this execution cycle'
  },
  { 
    id: 'objectives', 
    activeLabel: 'Loading Objectives', 
    completeLabel: 'Objectives Loaded',
    icon: Flag,
    description: 'Measurable outcomes to hit'
  },
  { 
    id: 'strategies', 
    activeLabel: 'Mapping Strategies', 
    completeLabel: 'Strategies Mapped',
    icon: Compass,
    description: 'How you\'ll achieve each objective'
  },
  { 
    id: 'tactics', 
    activeLabel: 'Adding Tactics', 
    completeLabel: 'Tactics Added',
    icon: CheckSquare,
    description: 'Specific actions to execute'
  },
  { 
    id: 'ready', 
    activeLabel: 'Preparing Demo', 
    completeLabel: 'Ready to Explore',
    icon: Sparkles,
    description: 'Your demo framework is loaded'
  }
];

export function DemoLoader({ onComplete }: DemoLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isReady, setIsReady] = useState(false);
  const [stepProgress, setStepProgress] = useState(0);

  useEffect(() => {
    if (currentStep >= steps.length) {
      setIsReady(true);
      return;
    }

    // Reset progress for new step
    setStepProgress(0);
    
    const duration = currentStep === steps.length - 1 ? 1200 : 1000;
    const progressInterval = 30; // Update every 30ms for smooth animation
    const progressIncrement = 100 / (duration / progressInterval);
    
    const progressTimer = setInterval(() => {
      setStepProgress(prev => Math.min(prev + progressIncrement, 100));
    }, progressInterval);

    const timeout = setTimeout(() => {
      clearInterval(progressTimer);
      setStepProgress(100);
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => prev + 1);
    }, duration);

    return () => {
      clearTimeout(timeout);
      clearInterval(progressTimer);
    };
  }, [currentStep]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-sm text-muted-foreground animate-fade-in mb-2">
            Loading guided demo
          </p>
          <h2 className="text-2xl font-bold text-foreground animate-fade-in">
            Fotofetch Growth + CLG Playbook
          </h2>
          <p className="mt-3 text-sm text-muted-foreground/80 animate-fade-in">
            Includes tiered DIY / DWY / DFY recommendations
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isActive = currentStep === index;
            const isCompleted = completedSteps.has(index);
            const isPending = currentStep < index;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all duration-300",
                  isActive && "border-primary bg-primary/5 scale-[1.02]",
                  isCompleted && "border-primary/30 bg-primary/5",
                  isPending && "border-border bg-card opacity-40"
                )}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
                    isActive && "bg-primary text-primary-foreground animate-pulse",
                    isCompleted && "bg-primary/20 text-primary",
                    isPending && "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-medium transition-colors duration-300",
                      isActive && "text-foreground",
                      isCompleted && "text-foreground",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {isCompleted ? step.completeLabel : step.activeLabel}
                  </p>
                  <p
                    className={cn(
                      "text-xs transition-colors duration-300 mb-2",
                      isActive && "text-muted-foreground",
                      isCompleted && "text-muted-foreground/70",
                      isPending && "text-muted-foreground/50"
                    )}
                  >
                    {step.description}
                  </p>
                  {/* Step progress bar */}
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full bg-primary transition-all duration-100 ease-out",
                        isPending && "bg-muted-foreground/30"
                      )}
                      style={{
                        width: isCompleted ? '100%' : isActive ? `${stepProgress}%` : '0%'
                      }}
                    />
                  </div>
                </div>

                {/* Status indicator */}
                <div className="shrink-0">
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                  {isCompleted && (
                    <svg
                      className="w-5 h-5 text-primary animate-scale-in"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-8">
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{
                width: `${((currentStep) / steps.length) * 100}%`
              }}
            />
          </div>
        </div>

        {/* CTA Button */}
        {isReady && (
          <div className="mt-8 animate-fade-in">
            <Button 
              size="lg" 
              onClick={onComplete}
              className="w-full gap-2"
            >
              See How It Works
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
