import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { GOSTData, ExecutionGoal, Objective, Strategy, Tactic, TacticStatus, RepositoryItem, PulseFrequency } from '@/types/gost';
import { fotofetchPreset } from '@/data/presetFotofetch';
import { encodeGOSTToURL, decodeGOSTFromURL, SharePermission } from '@/lib/gostSerializer';
import { getPublicAppOrigin } from '@/lib/appOrigin';
import { normalizePlanTimeframe, planTimeframeToObjectiveString } from '@/lib/planTimeframe';

interface UseGOSTDataOptions {
  initialData?: GOSTData;
  isViewOnly?: boolean;
  onSave?: (data: GOSTData) => void;
}

interface InitialState {
  data: GOSTData;
  isViewOnly: boolean;
}

function isValidGOSTData(data: unknown): data is GOSTData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<GOSTData>;
  return (
    d.executionGoal !== undefined &&
    Array.isArray(d.objectives) &&
    Array.isArray(d.strategies) &&
    Array.isArray(d.tactics)
  );
}

function getEmptyGOSTData(): GOSTData {
  return {
    executionGoal: { text: '' },
    objectives: [],
    strategies: [],
    tactics: [],
    timeframe: '90-day',
    repository: []
  };
}

// Normalize data to fix inconsistencies (e.g., startedAt with "planned" status)
function normalizeGOSTData(data: GOSTData): GOSTData {
  return {
    ...data,
    timeframe: normalizePlanTimeframe(data.timeframe),
    tactics: data.tactics.map(tactic => {
      // If a tactic has startedAt but is still "planned", update to "active"
      if (tactic.startedAt && tactic.status === 'planned') {
        return { ...tactic, status: 'active' as const };
      }
      return tactic;
    })
  };
}

function getInitialData(providedData?: GOSTData, providedIsViewOnly?: boolean): InitialState {
  // If initial data is provided and valid (from database), use it
  if (providedData && isValidGOSTData(providedData)) {
    // Ensure repository exists
    if (!providedData.repository) {
      providedData.repository = [];
    }
    // Normalize data to fix inconsistencies
    const normalized = normalizeGOSTData(providedData);
    return { data: normalized, isViewOnly: providedIsViewOnly ?? false };
  }
  
  // If provided data exists but is empty/invalid, return empty state
  if (providedData && !isValidGOSTData(providedData)) {
    return { data: getEmptyGOSTData(), isViewOnly: false };
  }
  
  // Check URL for encoded data (legacy format)
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('gost');
  if (encoded) {
    const decoded = decodeGOSTFromURL(encoded);
    if (decoded) {
      // Normalize shared data as well
      const normalized = normalizeGOSTData(decoded.data);
      return { 
        data: normalized, 
        isViewOnly: decoded.permission === 'view' 
      };
    }
  }
  return { data: fotofetchPreset, isViewOnly: false };
}

export function useGOSTData(options: UseGOSTDataOptions = {}) {
  const { initialData, isViewOnly: providedIsViewOnly, onSave } = options;
  const initialState = getInitialData(initialData, providedIsViewOnly);
  const [data, setData] = useState<GOSTData>(initialState.data);
  const [isViewOnly] = useState<boolean>(initialState.isViewOnly);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Auto-save when data changes (debounced)
  // Using a ref for onSave to avoid retriggering on callback identity changes
  useEffect(() => {
    if (onSaveRef.current && !isViewOnly) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        console.log('[AutoSave] Saving data, tactics count:', data.tactics.length);
        onSaveRef.current?.(data);
      }, 1000); // 1 second debounce
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, isViewOnly]);

  // Execution Goal operations
  const updateExecutionGoal = useCallback((executionGoal: ExecutionGoal) => {
    setData(prev => ({ ...prev, executionGoal }));
  }, []);

  // Objective operations
  const updateObjective = useCallback((id: string, updates: Partial<Objective>) => {
    setData(prev => ({
      ...prev,
      objectives: prev.objectives.map(obj =>
        obj.id === id ? { ...obj, ...updates } : obj
      )
    }));
  }, []);

  const addObjective = useCallback(() => {
    if (data.objectives.length >= 5) return;
    const newObjective: Objective = {
      id: `obj-${Date.now()}`,
      metricName: '',
      baseline: '',
      target: '',
      timeframe: planTimeframeToObjectiveString(normalizePlanTimeframe(data.timeframe))
    };
    setData(prev => ({
      ...prev,
      objectives: [...prev.objectives, newObjective]
    }));
  }, [data.objectives.length, data.timeframe]);

  const bulkAddObjectives = useCallback((metricNames: string[]) => {
    const remaining = 5 - data.objectives.length;
    const toAdd = metricNames.slice(0, remaining);
    const timeframe = planTimeframeToObjectiveString(normalizePlanTimeframe(data.timeframe));
    
    const newObjectives: Objective[] = toAdd.map((name, index) => ({
      id: `obj-${Date.now()}-${index}`,
      metricName: name,
      baseline: '',
      target: '',
      timeframe
    }));
    
    setData(prev => ({
      ...prev,
      objectives: [...prev.objectives, ...newObjectives]
    }));
  }, [data.objectives.length, data.timeframe]);

  const removeObjective = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      objectives: prev.objectives.filter(obj => obj.id !== id),
      // Also unlink strategies (primary and secondary)
      strategies: prev.strategies.map(str => ({
        ...str,
        objectiveId: str.objectiveId === id ? null : str.objectiveId,
        primaryObjectiveId: str.primaryObjectiveId === id ? null : str.primaryObjectiveId,
        secondaryObjectiveIds: str.secondaryObjectiveIds.filter(secId => secId !== id)
      })),
      // Also unlink tactics (primary and secondary)
      tactics: prev.tactics.map(tac => ({
        ...tac,
        primaryObjectiveId: tac.primaryObjectiveId === id ? null : tac.primaryObjectiveId,
        secondaryObjectiveIds: (tac.secondaryObjectiveIds ?? []).filter(secId => secId !== id)
      }))
    }));
  }, []);

  // Strategy operations
  const updateStrategy = useCallback((id: string, updates: Partial<Strategy>) => {
    setData(prev => ({
      ...prev,
      strategies: prev.strategies.map(str =>
        str.id === id ? { ...str, ...updates } : str
      )
    }));
  }, []);

  const addStrategy = useCallback(() => {
    if (data.strategies.length >= 10) return;
    const newStrategy: Strategy = {
      id: `str-${Date.now()}`,
      statement: '',
      objectiveId: null,
      primaryObjectiveId: null,
      secondaryObjectiveIds: []
    };
    setData(prev => ({
      ...prev,
      strategies: [...prev.strategies, newStrategy]
    }));
  }, [data.strategies.length]);

  const bulkAddStrategies = useCallback((statements: string[]) => {
    const remaining = 8 - data.strategies.length;
    const toAdd = statements.slice(0, remaining);
    
    const newStrategies: Strategy[] = toAdd.map((statement, index) => ({
      id: `str-${Date.now()}-${index}`,
      statement,
      objectiveId: null,
      primaryObjectiveId: null,
      secondaryObjectiveIds: []
    }));
    
    setData(prev => ({
      ...prev,
      strategies: [...prev.strategies, ...newStrategies]
    }));
  }, [data.strategies.length]);

  // Bulk add strategies with objective assignments
  const bulkAddStrategiesWithObjectives = useCallback((items: { text: string; primaryObjectiveId: string | null }[]) => {
    const remaining = 8 - data.strategies.length;
    const toAdd = items.slice(0, remaining);
    
    const newStrategies: Strategy[] = toAdd.map((item, index) => ({
      id: `str-${Date.now()}-${index}`,
      statement: item.text,
      objectiveId: item.primaryObjectiveId,
      primaryObjectiveId: item.primaryObjectiveId,
      secondaryObjectiveIds: []
    }));
    
    setData(prev => ({
      ...prev,
      strategies: [...prev.strategies, ...newStrategies]
    }));
  }, [data.strategies.length]);

  // Structured bulk import: strategies with nested tactics in one operation
  const structuredBulkImport = useCallback((strategies: {
    statement: string;
    primaryObjectiveId: string | null;
    secondaryObjectiveIds: string[];
    tactics: { description: string; primaryObjectiveId: string | null; secondaryObjectiveIds: string[] }[];
  }[]) => {
    const remainingStrategySlots = 8 - data.strategies.length;
    const strategiesToAdd = strategies.slice(0, remainingStrategySlots);
    
    const newStrategies: Strategy[] = [];
    const newTactics: Tactic[] = [];
    const timestamp = Date.now();
    
    strategiesToAdd.forEach((strategyData, sIndex) => {
      const strategyId = `str-${timestamp}-${sIndex}`;
      
      // Create strategy
      newStrategies.push({
        id: strategyId,
        statement: strategyData.statement,
        objectiveId: strategyData.primaryObjectiveId,
        primaryObjectiveId: strategyData.primaryObjectiveId,
        secondaryObjectiveIds: strategyData.secondaryObjectiveIds
      });
      
      // Create tactics under this strategy
      strategyData.tactics.forEach((tacticData, tIndex) => {
        newTactics.push({
          id: `tac-${timestamp}-${sIndex}-${tIndex}`,
          description: tacticData.description,
          status: 'planned' as TacticStatus,
          strategyId: strategyId,
          primaryObjectiveId: tacticData.primaryObjectiveId,
          secondaryObjectiveIds: tacticData.secondaryObjectiveIds
        });
      });
    });
    
    setData(prev => ({
      ...prev,
      strategies: [...prev.strategies, ...newStrategies],
      tactics: [...prev.tactics, ...newTactics]
    }));
    
    return { strategiesAdded: newStrategies.length, tacticsAdded: newTactics.length };
  }, [data.strategies.length]);

  // Execution bulk import: strategies + tactics with priority, status, and context (Active vs Backlog)
  type PriorityBucketImport = 'Quick Win' | 'Phase 2';
  
  const executionBulkImport = useCallback((strategies: {
    statement: string;
    primaryObjectiveId: string | null;
    tactics: {
      description: string;
      primaryObjectiveId: string | null;
      status: TacticStatus;
      priority: PriorityBucketImport | null;
      about: string | null;
      why: string | null;
      isBacklog: boolean;
    }[];
  }[]) => {
    const remainingStrategySlots = 8 - data.strategies.length;
    const strategiesToAdd = strategies.slice(0, remainingStrategySlots);
    
    const newStrategies: Strategy[] = [];
    const newTactics: Tactic[] = [];
    const newRepoItems: RepositoryItem[] = [];
    const timestamp = Date.now();
    
    strategiesToAdd.forEach((strategyData, sIndex) => {
      const strategyId = `str-${timestamp}-${sIndex}`;
      
      // Create strategy
      newStrategies.push({
        id: strategyId,
        statement: strategyData.statement,
        objectiveId: strategyData.primaryObjectiveId,
        primaryObjectiveId: strategyData.primaryObjectiveId,
        secondaryObjectiveIds: []
      });
      
      // Create tactics - either in Active Plan or Repository based on isBacklog
      strategyData.tactics.forEach((tacticData, tIndex) => {
        // Build description with context notes
        let fullDescription = tacticData.description;
        const notes: string[] = [];
        if (tacticData.about) notes.push(`About: ${tacticData.about}`);
        if (tacticData.why) notes.push(`Why: ${tacticData.why}`);
        if (tacticData.priority) notes.push(`Priority: ${tacticData.priority}`);
        
        if (tacticData.isBacklog) {
          // Create in Repository as backlog item
          newRepoItems.push({
            id: `repo-${timestamp}-${sIndex}-${tIndex}`,
            type: 'tactic',
            description: fullDescription,
            outcomeSupported: tacticData.primaryObjectiveId,
            growthStage: 'scaling',
            companyContext: 'small_team',
            abilityToExecute: tacticData.priority === 'Quick Win' ? 'high' : 'medium',
            timeHorizon: tacticData.priority === 'Quick Win' ? 'short' : 'medium',
            status: 'backlog',
            createdAt: new Date().toISOString()
          });
        } else {
          // Create in Active Plan
          newTactics.push({
            id: `tac-${timestamp}-${sIndex}-${tIndex}`,
            description: fullDescription,
            status: tacticData.status,
            strategyId: strategyId,
            primaryObjectiveId: tacticData.primaryObjectiveId,
            secondaryObjectiveIds: [],
            startedAt: tacticData.status === 'active' ? new Date().toISOString() : undefined
          });
        }
      });
    });
    
    setData(prev => ({
      ...prev,
      strategies: [...prev.strategies, ...newStrategies],
      tactics: [...prev.tactics, ...newTactics],
      repository: [...prev.repository, ...newRepoItems]
    }));
    
    return { 
      strategiesAdded: newStrategies.length, 
      tacticsAdded: newTactics.length,
      backlogAdded: newRepoItems.length
    };
  }, [data.strategies.length]);

  // Full plan import: Goal + Objectives + Strategies + Tactics with auto-placement (top 10 Active, rest Backlog)
  const fullPlanImport = useCallback((planData: {
    goal: { text: string; about: string | null } | null;
    objectives: { title: string; about: string | null; why: string | null }[];
    strategies: {
      title: string;
      primaryObjectiveIndex: number | null;
      secondaryObjectiveIndex: number | null;
      about: string | null;
      why: string | null;
      tactics: {
        title: string;
        about: string | null;
        why: string | null;
        isActive: boolean;
        priority: number;
      }[];
    }[];
  }) => {
    const timestamp = Date.now();
    
    // 1. Create objectives and build ID map
    const newObjectives: Objective[] = planData.objectives.slice(0, 5).map((obj, index) => ({
      id: `obj-${timestamp}-${index}`,
      metricName: obj.title,
      baseline: '',
      target: '',
      timeframe: planTimeframeToObjectiveString(normalizePlanTimeframe(data.timeframe))
    }));
    
    // Map 1-based index to objective ID
    const objectiveIdMap = new Map<number, string>();
    newObjectives.forEach((obj, i) => {
      objectiveIdMap.set(i + 1, obj.id);
    });
    
    // 2. Create strategies and tactics
    const newStrategies: Strategy[] = [];
    const newTactics: Tactic[] = [];
    const newRepoItems: RepositoryItem[] = [];
    
    const strategiesToAdd = planData.strategies.slice(0, 8);
    
    strategiesToAdd.forEach((strategyData, sIndex) => {
      const strategyId = `str-${timestamp}-${sIndex}`;
      const primaryObjectiveId = strategyData.primaryObjectiveIndex 
        ? objectiveIdMap.get(strategyData.primaryObjectiveIndex) ?? null 
        : null;
      const secondaryObjectiveIds = strategyData.secondaryObjectiveIndex
        ? [objectiveIdMap.get(strategyData.secondaryObjectiveIndex)].filter(Boolean) as string[]
        : [];
      
      // Create strategy
      newStrategies.push({
        id: strategyId,
        statement: strategyData.title,
        objectiveId: primaryObjectiveId,
        primaryObjectiveId: primaryObjectiveId,
        secondaryObjectiveIds: secondaryObjectiveIds
      });
      
      // Create tactics - Active go to tactics, Backlog go to repository
      strategyData.tactics.forEach((tacticData, tIndex) => {
        if (tacticData.isActive) {
          // Active Plan
          newTactics.push({
            id: `tac-${timestamp}-${sIndex}-${tIndex}`,
            description: tacticData.title,
            status: 'planned' as TacticStatus,
            strategyId: strategyId,
            primaryObjectiveId: primaryObjectiveId,
            secondaryObjectiveIds: []
          });
        } else {
          // Repository / Backlog
          newRepoItems.push({
            id: `repo-${timestamp}-${sIndex}-${tIndex}`,
            type: 'tactic',
            description: tacticData.title,
            outcomeSupported: primaryObjectiveId,
            growthStage: 'scaling',
            companyContext: 'small_team',
            abilityToExecute: tacticData.priority <= 15 ? 'medium' : 'low',
            timeHorizon: tacticData.priority <= 15 ? 'medium' : 'long',
            status: 'backlog',
            createdAt: new Date().toISOString()
          });
        }
      });
    });
    
    // 3. Update state with new goal + objectives + strategies + tactics + backlog
    setData(prev => ({
      ...prev,
      executionGoal: planData.goal 
        ? { text: planData.goal.text }
        : prev.executionGoal,
      objectives: [...prev.objectives, ...newObjectives],
      strategies: [...prev.strategies, ...newStrategies],
      tactics: [...prev.tactics, ...newTactics],
      repository: [...prev.repository, ...newRepoItems]
    }));
    
    return {
      goalSet: !!planData.goal?.text,
      objectivesAdded: newObjectives.length,
      strategiesAdded: newStrategies.length,
      tacticsAdded: newTactics.length,
      backlogAdded: newRepoItems.length
    };
  }, [data.timeframe]);

  // Bulk add tactics with objective and strategy assignments
  const bulkAddTactics = useCallback((items: { text: string; primaryObjectiveId: string | null; strategyId?: string }[]) => {
    const newTactics: Tactic[] = items.map((item, index) => {
      // If no strategyId provided, try to find a strategy linked to the same objective
      let assignedStrategyId = item.strategyId;
      if (!assignedStrategyId && item.primaryObjectiveId) {
        // Find a strategy that has the same primary objective
        const matchingStrategy = data.strategies.find(s => 
          (s.primaryObjectiveId || s.objectiveId) === item.primaryObjectiveId
        );
        assignedStrategyId = matchingStrategy?.id;
      }
      // If still no strategy, fall back to first strategy only as last resort
      if (!assignedStrategyId) {
        assignedStrategyId = data.strategies[0]?.id || '';
      }
      
      return {
        id: `tac-${Date.now()}-${index}`,
        description: item.text,
        status: 'planned' as TacticStatus,
        strategyId: assignedStrategyId,
        primaryObjectiveId: item.primaryObjectiveId,
        secondaryObjectiveIds: []
      };
    });
    
    setData(prev => ({
      ...prev,
      tactics: [...prev.tactics, ...newTactics]
    }));
  }, [data.strategies]);

  const removeStrategy = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      strategies: prev.strategies.filter(str => str.id !== id),
      // Also remove tactics linked to this strategy
      tactics: prev.tactics.filter(tac => tac.strategyId !== id)
    }));
  }, []);

  // Tactic operations
  const updateTactic = useCallback((id: string, updates: Partial<Tactic>) => {
    setData(prev => {
      const existingTactic = prev.tactics.find(t => t.id === id);
      if (!existingTactic) return prev;

      // Auto-capture timestamps based on status changes
      let updatedTactic = { ...existingTactic, ...updates };

      if (updates.status) {
        const oldStatus = existingTactic.status;
        const newStatus = updates.status;

        // Moving to active or in_progress: capture start time
        if (['active', 'in_progress'].includes(newStatus) && !['active', 'in_progress'].includes(oldStatus)) {
          updatedTactic.startedAt = new Date().toISOString();
        }

        // Moving to completed: capture completion time
        if (newStatus === 'completed' && oldStatus !== 'completed') {
          updatedTactic.completedAt = new Date().toISOString();
          // Ensure start time exists
          if (!updatedTactic.startedAt) {
            updatedTactic.startedAt = new Date().toISOString();
          }
        }
      }

      // Auto-update status when startedAt is set but status is still 'planned'
      // This ensures data consistency: if something has started, it can't be "planned"
      if (updatedTactic.startedAt && updatedTactic.status === 'planned') {
        updatedTactic.status = 'active';
      }

      const next: GOSTData = {
        ...prev,
        tactics: prev.tactics.map(tac => (tac.id === id ? updatedTactic : tac))
      };

      // Important: pulse checks are often followed by an immediate refresh.
      // Persist immediately so users don't lose the update while the debounce timer is pending.
      const isPulseUpdate = 'pulseChecks' in updates;
      if (isPulseUpdate && onSave && !isViewOnly) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        onSave(next);
      }

      return next;
    });
  }, [onSave, isViewOnly]);

  const addTactic = useCallback((strategyId: string) => {
    const newTactic: Tactic = {
      id: `tac-${Date.now()}`,
      description: '',
      status: 'planned',
      strategyId
    };
    setData(prev => ({
      ...prev,
      tactics: [...prev.tactics, newTactic]
    }));
  }, []);

  const removeTactic = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      tactics: prev.tactics.filter(tac => tac.id !== id)
    }));
  }, []);

  const moveTactic = useCallback((tacticId: string, newStrategyId: string) => {
    setData(prev => ({
      ...prev,
      tactics: prev.tactics.map(tac =>
        tac.id === tacticId ? { ...tac, strategyId: newStrategyId } : tac
      )
    }));
  }, []);

  // Reorder tactics within the same strategy
  const reorderTactics = useCallback((strategyId: string, orderedTacticIds: string[]) => {
    setData(prev => {
      // Separate tactics into those in this strategy and others
      const strategyTactics = prev.tactics.filter(t => t.strategyId === strategyId);
      const otherTactics = prev.tactics.filter(t => t.strategyId !== strategyId);
      
      // Create a map for quick lookup
      const tacticMap = new Map(strategyTactics.map(t => [t.id, t]));
      
      // Reorder based on the provided order
      const reorderedStrategyTactics = orderedTacticIds
        .map(id => tacticMap.get(id))
        .filter(Boolean) as Tactic[];
      
      // Add any tactics that weren't in the ordered list (safety)
      const orderedSet = new Set(orderedTacticIds);
      strategyTactics.forEach(t => {
        if (!orderedSet.has(t.id)) {
          reorderedStrategyTactics.push(t);
        }
      });
      
      return {
        ...prev,
        tactics: [...otherTactics, ...reorderedStrategyTactics]
      };
    });
  }, []);

  // Pulse frequency update
  const updatePulseFrequency = useCallback((frequency: PulseFrequency) => {
    setData(prev => ({ ...prev, pulseFrequency: frequency }));
  }, []);

  // Repository operations
  const addRepositoryItem = useCallback((item: Omit<RepositoryItem, 'id' | 'createdAt'>) => {
    const newItem: RepositoryItem = {
      ...item,
      id: `repo-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      repository: [...prev.repository, newItem]
    }));
  }, []);

  const bulkAddRepositoryItems = useCallback((items: Omit<RepositoryItem, 'id' | 'createdAt'>[]) => {
    const newItems: RepositoryItem[] = items.map((item, index) => ({
      ...item,
      id: `repo-${Date.now()}-${index}`,
      createdAt: new Date().toISOString()
    }));
    setData(prev => ({
      ...prev,
      repository: [...prev.repository, ...newItems]
    }));
  }, []);

  const updateRepositoryItem = useCallback((id: string, updates: Partial<RepositoryItem>) => {
    setData(prev => {
      const next: GOSTData = {
        ...prev,
        repository: prev.repository.map(item => (item.id === id ? { ...item, ...updates } : item))
      };

      const isPulseUpdate = 'pulseChecks' in updates;
      if (isPulseUpdate && onSave && !isViewOnly) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        onSave(next);
      }

      return next;
    });
  }, [onSave, isViewOnly]);

  const bulkUpdateRepositoryItems = useCallback((ids: string[], updates: Partial<RepositoryItem>) => {
    const idSet = new Set(ids);
    setData(prev => ({
      ...prev,
      repository: prev.repository.map(item =>
        idSet.has(item.id) ? { ...item, ...updates } : item
      )
    }));
  }, []);

  const removeRepositoryItem = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      repository: prev.repository.filter(item => item.id !== id)
    }));
  }, []);

  const promoteRepositoryItem = useCallback((id: string) => {
    setData(prev => {
      const item = prev.repository.find(i => i.id === id);
      if (!item) return prev;

      // Mark as promoted in repository
      const updatedRepository = prev.repository.map(i =>
        i.id === id ? { ...i, status: 'promoted' as const, promotedAt: new Date().toISOString() } : i
      );

      // Create the appropriate item in the active GOST
      if (item.type === 'tactic') {
        // Find first strategy linked to the supported outcome (check primaryObjectiveId first)
        const strategy = prev.strategies.find(s => 
          (s.primaryObjectiveId ?? s.objectiveId) === item.outcomeSupported
        );
        const newTactic: Tactic = {
          id: `tac-${Date.now()}`,
          description: item.description,
          status: 'planned',
          strategyId: strategy?.id || prev.strategies[0]?.id || '',
          primaryObjectiveId: item.outcomeSupported,
          secondaryObjectiveIds: []
        };
        return {
          ...prev,
          repository: updatedRepository,
          tactics: [...prev.tactics, newTactic]
        };
      } else if (item.type === 'strategy') {
        const newStrategy: Strategy = {
          id: `str-${Date.now()}`,
          statement: item.description,
          objectiveId: item.outcomeSupported,
          primaryObjectiveId: item.outcomeSupported,
          secondaryObjectiveIds: []
        };
        return {
          ...prev,
          repository: updatedRepository,
          strategies: [...prev.strategies, newStrategy]
        };
      } else if (item.type === 'objective') {
        const newObjective: Objective = {
          id: `obj-${Date.now()}`,
          metricName: item.description,
          baseline: '',
          target: '',
          timeframe: planTimeframeToObjectiveString(normalizePlanTimeframe(prev.timeframe))
        };
        return {
          ...prev,
          repository: updatedRepository,
          objectives: [...prev.objectives, newObjective]
        };
      }

      return prev;
    });
  }, []);

  // Timeframe
  const setTimeframe = useCallback((timeframe: GOSTData['timeframe']) => {
    setData(prev => ({ ...prev, timeframe: normalizePlanTimeframe(timeframe) }));
  }, []);

  const updatePlanMeta = useCallback((key: string, value: unknown) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Reset to preset
  const resetToPreset = useCallback(() => {
    setData(fotofetchPreset);
    // Clear URL params
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  // Start fresh with empty data
  const startFresh = useCallback(() => {
    const emptyData: GOSTData = {
      executionGoal: { text: '' },
      objectives: [],
      strategies: [],
      tactics: [],
      timeframe: '90-day',
      repository: []
    };
    setData(emptyData);
    // Clear URL params
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  // Import data
  const importData = useCallback((newData: GOSTData) => {
    // Ensure repository exists
    if (!newData.repository) {
      newData.repository = [];
    }
    setData(normalizeGOSTData(newData));
  }, []);

  // Generate shareable URL with permission
  // Always use the published domain so links work without Lovable login
  const getShareableURL = useCallback((permission: SharePermission = 'edit') => {
    const encoded = encodeGOSTToURL(data, permission);
    const origin = getPublicAppOrigin() || window.location.origin;
    const url = new URL(origin);
    url.pathname = '/';
    url.search = `?gost=${encoded}`;
    return url.toString();
  }, [data]);

  // Alignment checks
  const alignmentIssues = useMemo(() => {
    const issues: { type: 'tactic' | 'strategy' | 'objective'; id: string; message: string }[] = [];

    // Check tactics linked to valid strategies
    data.tactics.forEach(tactic => {
      const strategy = data.strategies.find(s => s.id === tactic.strategyId);
      if (!strategy) {
        issues.push({
          type: 'tactic',
          id: tactic.id,
          message: 'This tactic is not linked to any strategy'
        });
      }
    });

    // Check strategies linked to objectives (use primaryObjectiveId for alignment)
    data.strategies.forEach(strategy => {
      const primaryId = strategy.primaryObjectiveId ?? strategy.objectiveId;
      if (!primaryId) {
        issues.push({
          type: 'strategy',
          id: strategy.id,
          message: 'This strategy needs a Primary Objective to maintain alignment'
        });
      } else {
        const objective = data.objectives.find(o => o.id === primaryId);
        if (!objective) {
          issues.push({
            type: 'strategy',
            id: strategy.id,
            message: 'This strategy is linked to a non-existent objective'
          });
        }
      }
    });

    // Check objectives (they implicitly support the goal if they exist)
    data.objectives.forEach(objective => {
      if (!objective.metricName.trim()) {
        issues.push({
          type: 'objective',
          id: objective.id,
          message: 'This objective needs a metric name'
        });
      }
    });

    return issues;
  }, [data]);

  const hasIssue = useCallback((type: 'tactic' | 'strategy' | 'objective', id: string) => {
    return alignmentIssues.some(issue => issue.type === type && issue.id === id);
  }, [alignmentIssues]);

  const getIssueMessage = useCallback((type: 'tactic' | 'strategy' | 'objective', id: string) => {
    const issue = alignmentIssues.find(i => i.type === type && i.id === id);
    return issue?.message;
  }, [alignmentIssues]);

  // Execution stats
  const executionStats = useMemo(() => {
    const activeTactics = data.tactics.filter(t => t.status === 'active' || t.status === 'in_progress');
    const completedTactics = data.tactics.filter(t => t.status === 'completed');
    const plannedTactics = data.tactics.filter(t => t.status === 'planned');
    const cutTactics = data.tactics.filter(t => t.status === 'cut');

    // Active strategies = strategies that have active tactics
    const activeStrategyIds = new Set(activeTactics.map(t => t.strategyId));
    const activeStrategies = data.strategies.filter(s => activeStrategyIds.has(s.id));

    // Active objectives = objectives that have active strategies (use primaryObjectiveId)
    const activeObjectiveIds = new Set(
      activeStrategies.map(s => s.primaryObjectiveId ?? s.objectiveId).filter(Boolean)
    );
    const activeObjectives = data.objectives.filter(o => activeObjectiveIds.has(o.id));

    return {
      objectives: { total: data.objectives.length, active: activeObjectives.length },
      strategies: { total: data.strategies.length, active: activeStrategies.length },
      tactics: { 
        total: data.tactics.length, 
        active: activeTactics.length,
        completed: completedTactics.length,
        planned: plannedTactics.length,
        cut: cutTactics.length
      }
    };
  }, [data]);

  return {
    data,
    isViewOnly,
    updateExecutionGoal,
    updateObjective,
    addObjective,
    bulkAddObjectives,
    removeObjective,
    updateStrategy,
    addStrategy,
    bulkAddStrategies,
    bulkAddStrategiesWithObjectives,
    structuredBulkImport,
    executionBulkImport,
    fullPlanImport,
    removeStrategy,
    updateTactic,
    addTactic,
    bulkAddTactics,
    removeTactic,
    moveTactic,
    reorderTactics,
    addRepositoryItem,
    bulkAddRepositoryItems,
    updateRepositoryItem,
    bulkUpdateRepositoryItems,
    removeRepositoryItem,
    promoteRepositoryItem,
    setTimeframe,
    updatePlanMeta,
    updatePulseFrequency,
    resetToPreset,
    startFresh,
    importData,
    getShareableURL,
    alignmentIssues,
    hasIssue,
    getIssueMessage,
    executionStats
  };
}
