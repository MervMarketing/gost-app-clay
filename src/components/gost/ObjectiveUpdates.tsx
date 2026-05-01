import { useState } from 'react';
import { ObjectiveUpdate } from '@/types/gost';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ObjectiveUpdatesProps {
  updates: ObjectiveUpdate[];
  onAddUpdate: (update: ObjectiveUpdate) => void;
}

export function ObjectiveUpdates({ updates, onAddUpdate }: ObjectiveUpdatesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');

  const handleAdd = () => {
    if (!value.trim()) return;
    
    const newUpdate: ObjectiveUpdate = {
      id: crypto.randomUUID(),
      value: value.trim(),
      note: note.trim() || undefined,
      recordedAt: new Date().toISOString(),
    };
    
    onAddUpdate(newUpdate);
    setValue('');
    setNote('');
    setIsAdding(false);
  };

  const handleCancel = () => {
    setValue('');
    setNote('');
    setIsAdding(false);
  };

  // Sort updates by date, most recent first
  const sortedUpdates = [...updates].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">Updates</span>
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add update
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="space-y-2 mb-3 p-3 rounded-md bg-muted/50">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Current state (e.g., Orders/day ≈ 23)"
            className="text-sm h-8"
            autoFocus
          />
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (e.g., After funnel changes went live)"
            className="text-sm min-h-[60px] resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleAdd}
              disabled={!value.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {sortedUpdates.length > 0 ? (
        <div className="space-y-2">
          {sortedUpdates.map((update) => (
            <div
              key={update.id}
              className="text-sm p-2 rounded bg-muted/30"
            >
              <div className="flex items-start gap-2">
                <Clock className="h-3 w-3 mt-1 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(update.recordedAt), 'MMM d')}
                    </span>
                    <span className="text-foreground">{update.value}</span>
                  </div>
                  {update.note && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">
                      {update.note}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !isAdding ? (
        <p className="text-xs text-muted-foreground italic">No updates yet</p>
      ) : null}
    </div>
  );
}
