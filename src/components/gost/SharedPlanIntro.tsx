import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SharedPlanIntroProps {
  goalText?: string;
  hasFeedback?: boolean;
  onDismiss: () => void;
}

export function SharedPlanIntro({ goalText, hasFeedback, onDismiss }: SharedPlanIntroProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-lg max-w-sm w-full p-6 sm:p-8 space-y-5 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Greeting */}
        <div className="space-y-3">
          <p className="text-2xl">👋</p>
          <h1 className="text-lg sm:text-xl font-semibold text-foreground leading-snug">
            Help me review {goalText ? 'our plan' : 'this plan'}
          </h1>
          {goalText && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {goalText}
            </p>
          )}
        </div>

        {/* What to do */}
        <div className="rounded-lg bg-accent/50 border border-accent p-3 space-y-1.5">
          <p className="text-sm text-foreground font-medium">
            Here's what I need from you:
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Look through the tactics and rate each one — <span className="font-medium text-foreground">🔥 Must do</span>, <span className="font-medium text-foreground">⚡ Nice</span>, <span className="font-medium text-foreground">🕐 Later</span>, or <span className="font-medium text-foreground">✂️ Skip</span>.
          </p>
        </div>

        {/* CTA */}
        <Button
          size="lg"
          className="w-full"
          onClick={onDismiss}
        >
          Show me the tactics
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
