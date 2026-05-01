import { ExecutionGoal } from '@/types/gost';
import { Textarea } from '@/components/ui/textarea';
import { Target } from 'lucide-react';

interface ExecutionGoalEditorProps {
  goal: ExecutionGoal;
  onChange: (goal: ExecutionGoal) => void;
}

const MAX_CHARS = 150;

const examples = [
  "Maintain growth momentum above the $1M ARR trendline",
  "Increase revenue velocity without adding headcount",
  "Stabilize activation and repeat usage post-$1M ARR"
];

export function ExecutionGoalEditor({ goal, onChange }: ExecutionGoalEditorProps) {
  const charCount = goal.text.length;
  const isNearLimit = charCount > MAX_CHARS * 0.8;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="p-2 rounded-lg bg-primary/10">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold text-foreground">90-Day Execution Goal</h3>
          <p className="text-sm text-muted-foreground">
            The most important outcome for this planning cycle. 
            This reflects what leadership cares about right now.
          </p>
        </div>
      </div>

      <div className="relative">
        <Textarea
          value={goal.text}
          onChange={(e) => onChange({ text: e.target.value.slice(0, MAX_CHARS) })}
          placeholder="What must be true 90 days from now?"
          className="min-h-[80px] resize-none text-base pr-16"
        />
        <span className={`absolute bottom-2 right-3 text-xs ${isNearLimit ? 'text-warning' : 'text-muted-foreground'}`}>
          {charCount}/{MAX_CHARS}
        </span>
      </div>

      {!goal.text && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Examples:</p>
          <div className="flex flex-wrap gap-2">
            {examples.map((example, i) => (
              <button
                key={i}
                onClick={() => onChange({ text: example })}
                className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
