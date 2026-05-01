import { GOSTData, TacticStatus } from '@/types/gost';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

interface ExportMenuProps {
  data: GOSTData;
  pyramidRef: React.RefObject<HTMLDivElement>;
  iconOnly?: boolean;
}

export function ExportMenu({ data, pyramidRef, iconOnly }: ExportMenuProps) {
  const [includeCutTactics, setIncludeCutTactics] = useState(false);

  const getStatusIcon = (status: TacticStatus): string => {
    switch (status) {
      case 'active': return '●';
      case 'in_progress': return '◐';
      case 'completed': return '✓';
      case 'planned': return '○';
      case 'cut': return '✕';
    }
  };

  const generateTextSummary = useCallback((includeCut: boolean = false) => {
    const lines: string[] = [];
    
    lines.push(`Merv Plan (${data.timeframe})`);
    lines.push('='.repeat(40));
    lines.push('');
    
    lines.push('90-DAY EXECUTION GOAL');
    lines.push('-'.repeat(20));
    lines.push(data.executionGoal.text || '(Not defined)');
    lines.push('');
    
    lines.push('OBJECTIVES');
    lines.push('-'.repeat(20));
    data.objectives.forEach((obj, i) => {
      lines.push(`${i + 1}. ${obj.metricName || '(Unnamed)'}`);
      lines.push(`   Baseline: ${obj.baseline || '-'} → Target: ${obj.target || '-'} (${obj.timeframe})`);
    });
    lines.push('');
    
    lines.push('STRATEGIES');
    lines.push('-'.repeat(20));
    data.strategies.forEach((str, i) => {
      const objective = data.objectives.find(o => o.id === str.objectiveId);
      lines.push(`${i + 1}. ${str.statement || '(Unnamed)'}`);
      if (objective) {
        lines.push(`   → Supports: ${objective.metricName}`);
      }
    });
    lines.push('');
    
    lines.push('TACTICS');
    lines.push('-'.repeat(20));
    data.strategies.forEach(str => {
      const allTactics = data.tactics.filter(t => t.strategyId === str.id);
      const tactics = includeCut ? allTactics : allTactics.filter(t => t.status !== 'cut');
      if (tactics.length > 0) {
        lines.push(`${str.statement || '(Unnamed strategy)'}:`);
        tactics.forEach(tac => {
          const statusIcon = getStatusIcon(tac.status);
          lines.push(`  ${statusIcon} ${tac.description || '(Unnamed)'} [${tac.status}]`);
        });
      }
    });
    
    return lines.join('\n');
  }, [data]);

  const copyToClipboard = useCallback(async () => {
    const text = generateTextSummary(includeCutTactics);
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }, [generateTextSummary, includeCutTactics]);

  const exportPNG = useCallback(async () => {
    if (!pyramidRef.current) return;
    
    try {
      const dataUrl = await toPng(pyramidRef.current, {
        backgroundColor: '#f8fafc',
        pixelRatio: 2
      });
      
      const link = document.createElement('a');
      link.download = `merv-plan-${data.timeframe}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('PNG exported');
    } catch (err) {
      toast.error('Failed to export PNG');
    }
  }, [pyramidRef, data.timeframe]);

  const exportPDF = useCallback(async () => {
    if (!pyramidRef.current) return;
    
    try {
      const dataUrl = await toPng(pyramidRef.current, {
        backgroundColor: '#f8fafc',
        pixelRatio: 2
      });
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth() - 20;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', 10, 10, pdfWidth, pdfHeight);
      pdf.save(`merv-plan-${data.timeframe}.pdf`);
      toast.success('PDF exported');
    } catch (err) {
      toast.error('Failed to export PDF');
    }
  }, [pyramidRef, data.timeframe]);

  const cutTacticsCount = data.tactics.filter(t => t.status === 'cut').length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {iconOnly ? (
          <Button variant="outline" size="icon" title="Export">
            <Download className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={copyToClipboard}>
          Copy as Text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPNG}>
          Download PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPDF}>
          Download PDF
        </DropdownMenuItem>
        {cutTacticsCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm">Include cut tactics</span>
              <Switch 
                checked={includeCutTactics} 
                onCheckedChange={setIncludeCutTactics}
                className="scale-75"
              />
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
