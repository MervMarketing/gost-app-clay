import { useState } from 'react';
import { Tactic } from '@/types/gost';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getCurrentProgress, createPulseCheck } from '@/lib/pulseCheck';
import { CheckCircle2 } from 'lucide-react';

interface PulseCheckDialogProps {
  tactic: Tactic;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (tacticId: string, progress: 0 | 25 | 50 | 75 | 100, note?: string) => void;
}

const progressOptions: { value: 0 | 25 | 50 | 75 | 100; label: string }[] = [
  { value: 0, label: '0%' },
  { value: 25, label: '25%' },
  { value: 50, label: '50%' },
  { value: 75, label: '75%' },
  { value: 100, label: '100% (Done)' },
];

export function PulseCheckDialog({ tactic, open, onOpenChange, onSubmit }: PulseCheckDialogProps) {
  const currentProgress = getCurrentProgress(tactic);
  const [selectedProgress, setSelectedProgress] = useState<0 | 25 | 50 | 75 | 100>(currentProgress as 0 | 25 | 50 | 75 | 100);
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    onSubmit(tactic.id, selectedProgress, note || undefined);
    setNote('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Quick pulse check — is this moving?</DialogTitle>
          <DialogDescription className="sr-only">
            Update progress for this tactic
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          {/* Tactic description */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-foreground">{tactic.description || 'Unnamed tactic'}</p>
          </div>

          {/* Progress selection */}
          <div className="grid grid-cols-5 gap-2">
            {progressOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedProgress(option.value)}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all",
                  selectedProgress === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                {option.value === 100 ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-1" />
                ) : (
                  <span className="text-lg font-semibold">{option.value}%</span>
                )}
                {option.value === 100 && (
                  <span className="text-xs text-muted-foreground">Done</span>
                )}
              </button>
            ))}
          </div>

          {/* Optional note */}
          <div>
            <Textarea
              placeholder="Optional short note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[60px] resize-none text-sm"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {note.length}/200
            </p>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Save Pulse
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
