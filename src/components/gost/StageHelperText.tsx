import { Info } from 'lucide-react';
import { PyramidLayer } from '@/types/gost';

interface StageHelperTextProps {
  layer: PyramidLayer;
}

const helperText: Record<PyramidLayer, { title: string; lines: string[] }> = {
  goal: {
    title: 'Goal',
    lines: [
      'The single outcome you want to be true at the end of this period.',
      'Think direction or positioning — not metrics.'
    ]
  },
  objectives: {
    title: 'Objectives',
    lines: [
      'Specific, measurable outcomes that indicate progress toward the goal.',
      'Limit this to what truly matters (3–5 max).'
    ]
  },
  strategies: {
    title: 'Strategies',
    lines: [
      'The repeatable approaches you\'ll use to achieve the objectives.',
      'These describe how, not tasks.'
    ]
  },
  tactics: {
    title: 'Tactics',
    lines: [
      'Concrete actions that execute the strategies.',
      'Tactics should be easy to change or cut.'
    ]
  }
};

export function StageHelperText({ layer }: StageHelperTextProps) {
  const { lines } = helperText[layer];

  return (
    <div className="flex gap-2 p-3 rounded-lg bg-accent/50 border border-accent">
      <Info className="w-4 h-4 text-accent-foreground shrink-0 mt-0.5" />
      <div className="space-y-1">
        {lines.map((line, idx) => (
          <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
