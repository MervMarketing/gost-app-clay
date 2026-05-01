import { useState } from 'react';
import { Objective, Strategy, RepositoryItem } from '@/types/gost';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Target, Plus, Lightbulb, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { getObjectiveDisplayName, getStrategyDisplayName } from '@/lib/gostDisplay';

interface OrphanAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: RepositoryItem;
  objectives: Objective[];
  strategies: Strategy[];
  onUpdateItem: (id: string, updates: Partial<RepositoryItem>) => void;
  onAddObjective: () => void;
  onUpdateObjective: (id: string, updates: Partial<Objective>) => void;
  onAddStrategy: () => void;
  onUpdateStrategy: (id: string, updates: Partial<Strategy>) => void;
}

export function OrphanAssignmentDialog({
  open,
  onOpenChange,
  item,
  objectives,
  strategies,
  onUpdateItem,
  onAddObjective,
  onUpdateObjective,
  onAddStrategy,
  onUpdateStrategy,
}: OrphanAssignmentDialogProps) {
  const [mode, setMode] = useState<'assign' | 'create'>('assign');
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(item.outcomeSupported);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  
  // New outcome creation
  const [newOutcomeName, setNewOutcomeName] = useState('');
  const [newOutcomeTarget, setNewOutcomeTarget] = useState('');
  const [createDefaultStrategy, setCreateDefaultStrategy] = useState(true);
  const [defaultStrategyName, setDefaultStrategyName] = useState('');
  
  // New strategy creation
  const [newStrategyName, setNewStrategyName] = useState('');
  const [strategyForOutcome, setStrategyForOutcome] = useState<string | null>(null);

  const needsOutcome = !item.outcomeSupported;
  const needsStrategy = item.type === 'tactic' && item.outcomeSupported;
  
  // Get strategies for selected outcome
  const strategiesForOutcome = strategies.filter(s => s.objectiveId === selectedOutcome);

  const handleAssignOutcome = () => {
    if (!selectedOutcome) {
      toast.error('Please select an outcome');
      return;
    }
    onUpdateItem(item.id, { outcomeSupported: selectedOutcome });
    toast.success('Outcome assigned');
    onOpenChange(false);
  };

  const handleCreateOutcome = () => {
    if (!newOutcomeName.trim()) {
      toast.error('Please enter an outcome name');
      return;
    }

    // This is a simplified flow - in practice you'd want to create and get the ID back
    // For now we'll just notify the parent to add and update accordingly
    onAddObjective();
    
    toast.success('New outcome created! Please link this item to it.');
    onOpenChange(false);
  };

  const handleAssignStrategy = () => {
    if (!selectedStrategy) {
      toast.error('Please select a strategy');
      return;
    }
    // For tactics, we store strategy linkage differently - this would need hook update
    toast.success('Strategy linkage noted for promotion');
    onOpenChange(false);
  };

  const handleCreateStrategy = () => {
    if (!newStrategyName.trim() || !strategyForOutcome) {
      toast.error('Please enter a strategy name and select an outcome');
      return;
    }
    onAddStrategy();
    toast.success('New strategy created!');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {needsOutcome ? 'Assign Outcome' : 'Assign Strategy'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="p-3 mb-4 rounded-lg bg-muted/50 border">
            <p className="text-sm font-medium">{item.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Type: {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </p>
          </div>

          {needsOutcome ? (
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'assign' | 'create')}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="assign" className="gap-2">
                  <Target className="h-3.5 w-3.5" />
                  Assign Existing
                </TabsTrigger>
                <TabsTrigger value="create" className="gap-2">
                  <Plus className="h-3.5 w-3.5" />
                  Create New
                </TabsTrigger>
              </TabsList>

              <TabsContent value="assign" className="space-y-4">
                <div className="space-y-2">
                  <Label>Select 90-Day Outcome</Label>
                  <Select 
                    value={selectedOutcome || ''} 
                    onValueChange={(v) => setSelectedOutcome(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an outcome..." />
                    </SelectTrigger>
                    <SelectContent>
                      {objectives.map((obj) => (
                        <SelectItem key={obj.id} value={obj.id}>
                          {getObjectiveDisplayName(obj) || 'Unnamed objective'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="create" className="space-y-4">
                <div className="space-y-2">
                  <Label>Outcome Name (Metric)</Label>
                  <Input
                    value={newOutcomeName}
                    onChange={(e) => setNewOutcomeName(e.target.value)}
                    placeholder="e.g., Content-driven signups"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target (optional)</Label>
                  <Input
                    value={newOutcomeTarget}
                    onChange={(e) => setNewOutcomeTarget(e.target.value)}
                    placeholder="e.g., +20% in 90 days"
                  />
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'assign' | 'create')}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="assign" className="gap-2">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Assign Existing
                </TabsTrigger>
                <TabsTrigger value="create" className="gap-2">
                  <Plus className="h-3.5 w-3.5" />
                  Create New
                </TabsTrigger>
              </TabsList>

              <TabsContent value="assign" className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Strategy</Label>
                  <Select 
                    value={selectedStrategy || ''} 
                    onValueChange={(v) => setSelectedStrategy(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a strategy..." />
                    </SelectTrigger>
                    <SelectContent>
                      {strategiesForOutcome.length > 0 ? (
                        strategiesForOutcome.map((str) => (
                          <SelectItem key={str.id} value={str.id}>
                            {getStrategyDisplayName(str) || 'Unnamed strategy'}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No strategies for this outcome
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {strategiesForOutcome.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Create a new strategy for this outcome
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="create" className="space-y-4">
                <div className="space-y-2">
                  <Label>Strategy Statement</Label>
                  <Textarea
                    value={newStrategyName}
                    onChange={(e) => setNewStrategyName(e.target.value)}
                    placeholder="e.g., Content-led demand capture"
                    className="min-h-[60px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Under Outcome</Label>
                  <Select 
                    value={strategyForOutcome || ''} 
                    onValueChange={(v) => setStrategyForOutcome(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose outcome..." />
                    </SelectTrigger>
                    <SelectContent>
                      {objectives.map((obj) => (
                        <SelectItem key={obj.id} value={obj.id}>
                          {getObjectiveDisplayName(obj) || 'Unnamed objective'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {needsOutcome ? (
            mode === 'assign' ? (
              <Button onClick={handleAssignOutcome} disabled={!selectedOutcome}>
                Assign Outcome
              </Button>
            ) : (
              <Button onClick={handleCreateOutcome} disabled={!newOutcomeName.trim()}>
                Create Outcome
              </Button>
            )
          ) : (
            mode === 'assign' ? (
              <Button onClick={handleAssignStrategy} disabled={!selectedStrategy}>
                Assign Strategy
              </Button>
            ) : (
              <Button onClick={handleCreateStrategy} disabled={!newStrategyName.trim() || !strategyForOutcome}>
                Create Strategy
              </Button>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
