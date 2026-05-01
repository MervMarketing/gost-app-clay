import { useState } from 'react';
import { ClientPriority, PRIORITY_CONFIG, upsertFeedback } from '@/lib/feedbackService';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Check, X, HelpCircle } from 'lucide-react';

interface ClientFeedbackButtonsProps {
  shareId: string;
  tacticId: string;
  currentPriority?: ClientPriority | null;
  currentNote?: string | null;
  onFeedbackSaved: (tacticId: string, priority: ClientPriority, note?: string) => void;
}

export function ClientFeedbackButtons({
  shareId,
  tacticId,
  currentPriority,
  currentNote,
  onFeedbackSaved,
}: ClientFeedbackButtonsProps) {
  const [selected, setSelected] = useState<ClientPriority | null>(currentPriority ?? null);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(currentNote ?? '');
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleSelect = async (priority: ClientPriority) => {
    setSelected(priority);
    setSaving(true);
    setShowSaved(false);
    const success = await upsertFeedback(shareId, tacticId, priority, note || undefined);
    setSaving(false);
    if (success) {
      onFeedbackSaved(tacticId, priority, note || undefined);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    }
  };

  const handleSaveNote = async () => {
    // If no priority selected, don't auto-select one — just save the note without a visible priority
    const priority = selected || 'medium';
    setSaving(true);
    const success = await upsertFeedback(shareId, tacticId, priority, note || undefined);
    setSaving(false);
    if (success) {
      onFeedbackSaved(tacticId, priority, note || undefined);
      setShowNote(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    }
  };

  const priorities: ClientPriority[] = ['high', 'medium', 'low', 'scratch'];

  return (
    <div className="space-y-2">
      <div className="relative flex items-center gap-1.5 flex-nowrap overflow-x-auto">
        {!selected && (
          <span className="text-[11px] text-muted-foreground mr-1 italic">Rate →</span>
        )}
        {priorities.map((p) => {
          const config = PRIORITY_CONFIG[p];
          const isSelected = selected === p;
          return (
            <button
              key={p}
              disabled={saving}
              onClick={() => handleSelect(p)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-all",
                isSelected
                  ? cn(config.bgColor, config.color, "shadow-sm scale-105")
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="text-xs">{config.emoji}</span>
              <span>{config.label}</span>
            </button>
          );
        })}

        {/* Note toggle */}
        <button
          onClick={() => setShowNote(!showNote)}
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-1 rounded-full text-[11px] transition-colors",
            showNote || note
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="h-3 w-3" />
          {note && <Check className="h-2.5 w-2.5" />}
        </button>

        {/* Clarify button */}
        <button
          onClick={() => {
            if (!note.includes('Need clarification')) {
              setNote(prev => prev ? `${prev}\nNeed clarification on this` : 'Need clarification on this');
            }
            setShowNote(true);
          }}
          className="inline-flex items-center gap-1 px-1.5 py-1 rounded-full text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <HelpCircle className="h-3 w-3" />
          <span className="hidden sm:inline">Clarify</span>
        </button>

        {/* Saved confirmation - absolute so it doesn't shift layout */}
        {showSaved && (
          <span className="absolute -top-5 right-0 inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
            <Check className="h-2.5 w-2.5" />
            Saved
          </span>
        )}
      </div>

      {/* Note input */}
      {showNote && (
        <div className="flex items-start gap-2 ml-1">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note..."
            className="text-xs h-16 resize-none flex-1"
          />
          <div className="flex flex-col gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveNote} disabled={saving}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowNote(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
