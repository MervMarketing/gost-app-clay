import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Sparkles } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SampleDataBannerProps {
  onStartFresh: () => void;
  onDismiss: () => void;
}

export function SampleDataBanner({ onStartFresh, onDismiss }: SampleDataBannerProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleStartFreshClick = () => {
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    onStartFresh();
  };

  return (
    <>
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20 animate-fade-in">
        <div className="container max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  You're exploring sample data
                </p>
                <p className="text-xs text-muted-foreground">
                  This is the Fotofetch + CLG tiered example. Changes won't be saved.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="default" 
                size="sm"
                onClick={handleStartFreshClick}
              >
                Start Fresh
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={onDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start with a fresh plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all the sample data. You'll start with a blank canvas to build your own execution plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Yes, start fresh</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
