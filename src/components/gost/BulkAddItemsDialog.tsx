import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ListPlus, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ParsedItem {
  id: string;
  text: string;
  selected: boolean;
}

interface BulkAddItemsDialogProps {
  itemType: 'objective' | 'strategy';
  onAdd: (items: string[]) => void;
  maxItems?: number;
  currentCount: number;
  trigger?: React.ReactNode;
}

export function BulkAddItemsDialog({ 
  itemType, 
  onAdd, 
  maxItems,
  currentCount,
  trigger 
}: BulkAddItemsDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [rawText, setRawText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);

  const itemLabel = itemType === 'objective' ? 'objective' : 'strategy';
  const itemLabelPlural = itemType === 'objective' ? 'objectives' : 'strategies';
  const placeholder = itemType === 'objective' 
    ? `Enter objectives, one per line:

- Orders per day
- Signup → First Order Conversion
- Time to First Order
- Monthly active users
• Customer satisfaction score`
    : `Enter strategies, one per line:

- Buyer-First Funnel Simplification
- Activation Before Acquisition
- Lifecycle Automation
- Template-Driven Ordering
• Repeat Order Acceleration`;

  const remainingSlots = maxItems ? maxItems - currentCount : Infinity;

  const handleParse = () => {
    const lines = rawText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
      .filter(line => line.length > 0);
    
    const items: ParsedItem[] = lines.map((line, index) => ({
      id: `bulk-${index}-${Date.now()}`,
      text: line,
      selected: index < remainingSlots // Auto-select up to remaining slots
    }));
    
    setParsedItems(items);
    setStep('review');
  };

  const toggleItem = (id: string) => {
    const currentSelected = parsedItems.filter(i => i.selected).length;
    setParsedItems(items => 
      items.map(item => {
        if (item.id !== id) return item;
        // Don't allow selecting more than remaining slots
        if (!item.selected && currentSelected >= remainingSlots) return item;
        return { ...item, selected: !item.selected };
      })
    );
  };

  const removeItem = (id: string) => {
    setParsedItems(items => items.filter(item => item.id !== id));
  };

  const selectAll = () => {
    setParsedItems(items => 
      items.map((item, index) => ({ ...item, selected: index < remainingSlots }))
    );
  };

  const deselectAll = () => {
    setParsedItems(items => items.map(item => ({ ...item, selected: false })));
  };

  const handleSubmit = () => {
    const selectedItems = parsedItems
      .filter(item => item.selected)
      .map(item => item.text);
    
    if (selectedItems.length > 0) {
      onAdd(selectedItems);
    }
    
    handleClose();
  };

  const handleBack = () => {
    setStep('input');
  };

  const handleClose = () => {
    setRawText('');
    setParsedItems([]);
    setStep('input');
    setOpen(false);
  };

  const selectedCount = parsedItems.filter(i => i.selected).length;
  const canSelectMore = selectedCount < remainingSlots;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ListPlus className="h-4 w-4 mr-2" />
            Add Multiple
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'input' ? `Add Multiple ${itemLabelPlural.charAt(0).toUpperCase() + itemLabelPlural.slice(1)}` : 'Review Items'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'input' ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Paste your list (one per line)</Label>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={placeholder}
                className="min-h-[180px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Supports bullet points (-, •, *) and numbered lists. 
                {maxItems && (
                  <span className="text-primary"> You can add up to {remainingSlots} more {itemLabelPlural}.</span>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Select all header */}
            <div 
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => selectedCount === parsedItems.length ? deselectAll() : selectAll()}
            >
              <Checkbox
                checked={selectedCount === Math.min(parsedItems.length, remainingSlots)}
                onCheckedChange={(checked) => checked ? selectAll() : deselectAll()}
                className="h-5 w-5"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Select All</p>
                <p className="text-xs text-muted-foreground">
                  {selectedCount} of {parsedItems.length} selected
                  {maxItems && selectedCount >= remainingSlots && (
                    <span className="text-warning"> (max {remainingSlots} remaining)</span>
                  )}
                </p>
              </div>
            </div>

            <ScrollArea className="h-[280px] rounded-md border">
              <div className="p-3 space-y-2">
                {parsedItems.map((item) => (
                  <div 
                    key={item.id}
                    className={cn(
                      "flex items-start gap-3 p-2 rounded-md transition-colors cursor-pointer",
                      item.selected ? "bg-accent/50" : "bg-muted/30 opacity-60",
                      !item.selected && !canSelectMore && "cursor-not-allowed"
                    )}
                    onClick={() => toggleItem(item.id)}
                  >
                    <Checkbox
                      checked={item.selected}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="mt-0.5"
                      disabled={!item.selected && !canSelectMore}
                    />
                    <p className="flex-1 text-sm">{item.text}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <p className="text-xs text-muted-foreground">
              {itemType === 'objective' 
                ? 'Each objective will be created with empty baseline/target fields for you to fill in.'
                : 'Each strategy will be created without an outcome link—assign outcomes after creation.'}
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'input' ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleParse} disabled={!rawText.trim()}>
                Parse & Review
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button onClick={handleSubmit} disabled={selectedCount === 0}>
                <Check className="h-4 w-4 mr-2" />
                Add {selectedCount} {selectedCount === 1 ? itemLabel : itemLabelPlural}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
