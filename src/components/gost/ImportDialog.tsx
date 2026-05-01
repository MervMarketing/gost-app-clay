import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { parseGOSTFromText } from '@/lib/gostSerializer';
import { GOSTData } from '@/types/gost';
import { toast } from 'sonner';
import { AlertCircle, FileText } from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: GOSTData) => void;
}

const EXAMPLE_TEXT = `GOAL
Become the leading e-commerce platform for sustainable products

OBJECTIVES
1. Monthly Active Users
   Baseline: 50,000 → Target: 150,000 (90 days)
2. Conversion Rate
   Baseline: 2.1% → Target: 3.5% (90 days)

STRATEGIES
1. Mobile-First Experience
   → Supports: Monthly Active Users
2. Checkout Optimization
   → Supports: Conversion Rate

TACTICS
Mobile-First Experience:
● Launch progressive web app [active]
○ Add mobile payment options [planned]

Checkout Optimization:
○ A/B test checkout flow [planned]
○ Add guest checkout [planned]`;

export function ImportDialog({ open, onOpenChange, onImport }: ImportDialogProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    setError(null);
    
    if (!text.trim()) {
      setError('Please paste some text to import');
      return;
    }

    const parsed = parseGOSTFromText(text);
    
    if (!parsed) {
      setError('Could not parse the text. Make sure it follows the expected format.');
      return;
    }

    onImport(parsed);
    toast.success('Plan imported successfully');
    setText('');
    onOpenChange(false);
  };

  const handleLoadExample = () => {
    setText(EXAMPLE_TEXT);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Plan</DialogTitle>
          <DialogDescription>
            Paste your plan text below. Use the format from "Copy Text" export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Expected format: Goal, Objectives, Strategies, Tactics
            </span>
            <Button variant="ghost" size="sm" onClick={handleLoadExample}>
              <FileText className="h-4 w-4 mr-2" />
              Load Example
            </Button>
          </div>

          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            placeholder="Paste your plan text here..."
            className="min-h-[300px] font-mono text-sm"
          />

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
