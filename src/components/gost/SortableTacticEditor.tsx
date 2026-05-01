import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tactic, Strategy, Objective, PulseFrequency } from '@/types/gost';
import { TacticEditor } from './TacticEditor';
import { ClientPriority } from '@/lib/feedbackService';

interface SortableTacticEditorProps {
  tactic: Tactic;
  strategies: Strategy[];
  objectives: Objective[];
  goal: string;
  onChange: (id: string, updates: Partial<Tactic>) => void;
  onRemove: (id: string) => void;
  onMove: (tacticId: string, newStrategyId: string) => void;
  hasIssue: boolean;
  issueMessage?: string;
  pulseFrequency?: PulseFrequency;
  isFocused?: boolean;
  onClearFocus?: () => void;
  onSwitchToRepository?: (tacticId?: string) => void;
  clientFeedback?: { priority: ClientPriority; note?: string } | null;
}

export function SortableTacticEditor(props: SortableTacticEditorProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.tactic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TacticEditor
        {...props}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}
