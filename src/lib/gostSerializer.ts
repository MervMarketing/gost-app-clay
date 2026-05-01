import { GOSTData, Objective, Strategy, Tactic, TacticStatus, ExecutionGoal, RepositoryItem, ExecutionWindow, TimeHorizon } from '@/types/gost';
import { fotofetchPreset } from '@/data/presetFotofetch';
import { getObjectiveDisplayName, getStrategyDisplayName, getTacticDisplayName } from '@/lib/gostDisplay';

/**
 * Convert legacy timeHorizon to executionWindow
 */
function migrateTimeHorizonToExecutionWindow(timeHorizon: TimeHorizon): ExecutionWindow {
  switch (timeHorizon) {
    case 'short': return '30-day';
    case 'medium': return '60-day';
    case 'long': return '90-day';
    default: return '90-day';
  }
}

export type SharePermission = 'view' | 'edit';

export interface DecodedGOSTResult {
  data: GOSTData;
  permission: SharePermission;
}

// URL encoding/decoding for shareable links
// Uses URL-safe base64 encoding to prevent issues with + and / characters
function toUrlSafeBase64(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromUrlSafeBase64(str: string): string {
  // Add back padding if needed
  let padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  if (pad) {
    padded += '='.repeat(4 - pad);
  }
  return atob(padded);
}

export function encodeGOSTToURL(data: GOSTData, permission: SharePermission = 'edit'): string {
  const payload = { data, permission };
  const json = JSON.stringify(payload);
  const compressed = toUrlSafeBase64(encodeURIComponent(json));
  return compressed;
}

export function decodeGOSTFromURL(encoded: string): DecodedGOSTResult | null {
  try {
    // Try URL-safe base64 first
    let json: string;
    try {
      json = decodeURIComponent(fromUrlSafeBase64(encoded));
    } catch {
      // Fallback to standard base64 for backwards compatibility
      json = decodeURIComponent(atob(encoded));
    }
    
    const parsed = JSON.parse(json);
    
    // Handle new format with permission
    let data: GOSTData;
    let permission: SharePermission = 'edit';
    
    if (parsed.data && parsed.permission) {
      data = parsed.data;
      permission = parsed.permission;
    } else {
      // Legacy format - just the data object
      data = parsed as GOSTData;
    }
    
    // Basic validation - check for executionGoal or legacy goal
    if ((data.executionGoal || (data as any).goal) && data.objectives && data.strategies && data.tactics && data.timeframe) {
      // Migrate legacy goal to executionGoal
      if (!data.executionGoal && (data as any).goal) {
        data.executionGoal = (data as any).goal;
        delete (data as any).goal;
      }
      // Ensure repository exists
      if (!data.repository) {
        data.repository = [];
      }
      // Migrate repository items: backfill executionWindow from timeHorizon
      data.repository = data.repository.map(item => {
        if (!item.executionWindow && item.timeHorizon) {
          return {
            ...item,
            executionWindow: migrateTimeHorizonToExecutionWindow(item.timeHorizon)
          };
        }
        return item;
      });
      return { data, permission };
    }
    return null;
  } catch {
    return null;
  }
}

// Plain text parsing
export function parseGOSTFromText(text: string): GOSTData | null {
  try {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    const result: GOSTData = {
      executionGoal: { text: '' },
      objectives: [],
      strategies: [],
      tactics: [],
      timeframe: '90-day',
      repository: []
    };

    let currentSection: 'goal' | 'objectives' | 'strategies' | 'tactics' | null = null;
    let currentStrategyId: string | null = null;
    let objectiveIndex = 0;
    let strategyIndex = 0;
    let tacticIndex = 0;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Detect section headers
      if (lowerLine.includes('gost framework') || lowerLine.match(/^=+$/)) {
        continue;
      }
      if (lowerLine === 'goal' || lowerLine.startsWith('goal:') || lowerLine.includes('90-day execution goal') || lowerLine.includes('execution goal')) {
        currentSection = 'goal';
        const afterColon = line.split(':').slice(1).join(':').trim();
        if (afterColon) result.executionGoal.text = afterColon;
        continue;
      }
      if (lowerLine === 'objectives' || lowerLine.startsWith('objectives:')) {
        currentSection = 'objectives';
        continue;
      }
      if (lowerLine === 'strategies' || lowerLine.startsWith('strategies:')) {
        currentSection = 'strategies';
        continue;
      }
      if (lowerLine === 'tactics' || lowerLine.startsWith('tactics:')) {
        currentSection = 'tactics';
        continue;
      }
      
      // Skip separator lines
      if (line.match(/^[-=]+$/)) continue;

      // Parse content based on section
      if (currentSection === 'goal' && !result.executionGoal.text) {
        result.executionGoal.text = line;
      } else if (currentSection === 'objectives') {
        // Parse objective: "1. Metric Name" or "Baseline: X → Target: Y (timeframe)"
        const numMatch = line.match(/^(\d+)\.\s*(.+)/);
        if (numMatch) {
          objectiveIndex++;
          const obj: Objective = {
            id: `obj-${objectiveIndex}`,
            metricName: numMatch[2],
            baseline: '',
            target: '',
            timeframe: '90 days'
          };
          result.objectives.push(obj);
        } else if (line.toLowerCase().includes('baseline') && result.objectives.length > 0) {
          // Parse baseline/target line
          const baselineMatch = line.match(/baseline:\s*([^→]+)/i);
          const targetMatch = line.match(/target:\s*([^(]+)/i);
          const timeMatch = line.match(/\(([^)]+)\)/);
          
          const lastObj = result.objectives[result.objectives.length - 1];
          if (baselineMatch) lastObj.baseline = baselineMatch[1].trim();
          if (targetMatch) lastObj.target = targetMatch[1].trim();
          if (timeMatch) lastObj.timeframe = timeMatch[1].trim();
        }
      } else if (currentSection === 'strategies') {
        const numMatch = line.match(/^(\d+)\.\s*(.+)/);
        if (numMatch) {
          strategyIndex++;
          const str: Strategy = {
            id: `str-${strategyIndex}`,
            statement: numMatch[2],
            objectiveId: result.objectives[0]?.id || null,
            primaryObjectiveId: result.objectives[0]?.id || null,
            secondaryObjectiveIds: []
          };
          result.strategies.push(str);
          currentStrategyId = str.id;
        } else if (line.toLowerCase().includes('supports:') && result.strategies.length > 0) {
          // Link to objective by name
          const supportsMatch = line.match(/supports:\s*(.+)/i);
          if (supportsMatch) {
            const objName = supportsMatch[1].trim();
            const matchingObj = result.objectives.find(o => 
              o.metricName.toLowerCase().includes(objName.toLowerCase()) ||
              objName.toLowerCase().includes(o.metricName.toLowerCase())
            );
            if (matchingObj) {
              result.strategies[result.strategies.length - 1].objectiveId = matchingObj.id;
            }
          }
        }
      } else if (currentSection === 'tactics') {
        // Check if this is a strategy header within tactics
        const strategyHeaderMatch = line.match(/^(.+):$/);
        if (strategyHeaderMatch && !line.includes('●') && !line.includes('○') && !line.includes('✕')) {
          const stratName = strategyHeaderMatch[1].trim();
          const matchingStr = result.strategies.find(s => 
            s.statement.toLowerCase().includes(stratName.toLowerCase()) ||
            stratName.toLowerCase().includes(s.statement.toLowerCase())
          );
          currentStrategyId = matchingStr?.id || result.strategies[0]?.id || null;
          continue;
        }
        
        // Parse tactic line
        const tacticMatch = line.match(/^[●○✕◐⏱✓\-•]\s*(.+?)(?:\s*\[(\w+(?:_\w+)?)\])?$/);
        if (tacticMatch) {
          tacticIndex++;
          let status: TacticStatus = 'planned';
          const statusText = tacticMatch[2]?.toLowerCase();
          if (line.includes('●') || statusText === 'active') status = 'active';
          if (line.includes('◐') || statusText === 'in_progress') status = 'in_progress';
          if (line.includes('✓') || statusText === 'completed') status = 'completed';
          if (line.includes('✕') || statusText === 'cut') status = 'cut';
          
          const tac: Tactic = {
            id: `tac-${tacticIndex}`,
            description: tacticMatch[1].trim(),
            status,
            strategyId: currentStrategyId || result.strategies[0]?.id || ''
          };
          result.tactics.push(tac);
        }
      }
    }

    // Validate we got something useful
    if (!result.executionGoal.text && result.objectives.length === 0 && result.strategies.length === 0) {
      return null;
    }

    return result;
  } catch {
    return null;
  }
}

// Generate text format for export (matching the export format)
export function generateGOSTText(data: GOSTData): string {
  const lines: string[] = [];
  
  lines.push(`GOST Framework (${data.timeframe})`);
  lines.push('='.repeat(40));
  lines.push('');
  
  lines.push('90-DAY EXECUTION GOAL');
  lines.push('-'.repeat(20));
  lines.push(data.executionGoal.text || '(Not defined)');
  lines.push('');
  
  lines.push('OBJECTIVES');
  lines.push('-'.repeat(20));
  data.objectives.forEach((obj, i) => {
    lines.push(`${i + 1}. ${getObjectiveDisplayName(obj) || '(Unnamed)'}`);
    lines.push(`   Baseline: ${obj.baseline || '-'} → Target: ${obj.target || '-'} (${obj.timeframe})`);
  });
  lines.push('');
  
  lines.push('STRATEGIES');
  lines.push('-'.repeat(20));
  data.strategies.forEach((str, i) => {
    const primaryId = str.primaryObjectiveId ?? str.objectiveId;
    const primaryObjective = data.objectives.find(o => o.id === primaryId);
    const secondaryObjectives = (str.secondaryObjectiveIds ?? [])
      .map(id => data.objectives.find(o => o.id === id))
      .filter(Boolean);
    lines.push(`${i + 1}. ${getStrategyDisplayName(str) || '(Unnamed)'}`);
    if (primaryObjective) {
      lines.push(`   → Primary: ${getObjectiveDisplayName(primaryObjective)}`);
    }
    if (secondaryObjectives.length > 0) {
      lines.push(`   → Secondary: ${secondaryObjectives.map(o => getObjectiveDisplayName(o!)).join(', ')}`);
    }
  });
  lines.push('');
  
  lines.push('TACTICS');
  lines.push('-'.repeat(20));
  data.strategies.forEach(str => {
    const tactics = data.tactics.filter(t => t.strategyId === str.id);
    if (tactics.length > 0) {
      lines.push(`${getStrategyDisplayName(str) || '(Unnamed strategy)'}:`);
      tactics.forEach(tac => {
        const statusIcon = 
          tac.status === 'active' ? '●' : 
          tac.status === 'in_progress' ? '◐' : 
          tac.status === 'completed' ? '✓' : 
          tac.status === 'planned' ? '○' : '✕';
        lines.push(`  ${statusIcon} ${getTacticDisplayName(tac) || '(Unnamed)'} [${tac.status}]`);
      });
    }
  });
  
  return lines.join('\n');
}
