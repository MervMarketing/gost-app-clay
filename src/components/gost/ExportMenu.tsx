import { GOSTData } from '@/types/gost';
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
import { generateGOSTText } from '@/lib/gostSerializer';

interface ExportMenuProps {
  data: GOSTData;
  pyramidRef: React.RefObject<HTMLDivElement>;
  iconOnly?: boolean;
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}

export function ExportMenu({ data, pyramidRef, iconOnly }: ExportMenuProps) {
  const [includeCutTactics, setIncludeCutTactics] = useState(false);

  const copyToClipboard = useCallback(async () => {
    const text = generateGOSTText(data, { includeCutTactics });
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }, [data, includeCutTactics]);

  const exportPNG = useCallback(async () => {
    if (!pyramidRef.current) return;

    try {
      const pyramidDataUrl = await toPng(pyramidRef.current, {
        backgroundColor: '#f8fafc',
        pixelRatio: 2,
      });

      const textWrap = document.createElement('div');
      textWrap.style.boxSizing = 'border-box';
      textWrap.style.padding = '24px';
      textWrap.style.background = '#f8fafc';
      const w = pyramidRef.current.offsetWidth;
      textWrap.style.width = `${Math.max(w, 640)}px`;
      const pre = document.createElement('pre');
      pre.style.margin = '0';
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.wordBreak = 'break-word';
      pre.style.fontFamily =
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      pre.style.fontSize = '11px';
      pre.style.lineHeight = '1.45';
      pre.style.color = '#0f172a';
      pre.textContent = generateGOSTText(data, { includeCutTactics });
      textWrap.appendChild(pre);
      textWrap.style.position = 'fixed';
      textWrap.style.left = '-10000px';
      textWrap.style.top = '0';
      document.body.appendChild(textWrap);

      let textDataUrl: string;
      try {
        textDataUrl = await toPng(textWrap, {
          backgroundColor: '#f8fafc',
          pixelRatio: 2,
          cacheBust: true,
        });
      } finally {
        document.body.removeChild(textWrap);
      }

      const imgPyramid = await loadImageFromDataUrl(pyramidDataUrl);
      const imgText = await loadImageFromDataUrl(textDataUrl);
      const gap = 16;
      const canvas = document.createElement('canvas');
      const cw = Math.max(imgPyramid.width, imgText.width);
      const ch = imgPyramid.height + gap + imgText.height;
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unsupported');
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(imgPyramid, (cw - imgPyramid.width) / 2, 0);
      ctx.drawImage(imgText, (cw - imgText.width) / 2, imgPyramid.height + gap);

      const link = document.createElement('a');
      link.download = `merv-plan-${data.timeframe}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('PNG exported');
    } catch {
      toast.error('Failed to export PNG');
    }
  }, [pyramidRef, data, includeCutTactics]);

  const exportPDF = useCallback(async () => {
    if (!pyramidRef.current) return;

    try {
      const dataUrl = await toPng(pyramidRef.current, {
        backgroundColor: '#f8fafc',
        pixelRatio: 2,
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const margin = 10;
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(dataUrl);
      const availW = pageW - 2 * margin;
      const availH = pageH - 2 * margin;
      let drawW = availW;
      let drawH = (imgProps.height * drawW) / imgProps.width;
      if (drawH > availH) {
        drawH = availH;
        drawW = (imgProps.width * drawH) / imgProps.height;
      }
      const x = margin + (availW - drawW) / 2;
      const y = margin + (availH - drawH) / 2;
      pdf.addImage(dataUrl, 'PNG', x, y, drawW, drawH);

      const body = generateGOSTText(data, { includeCutTactics });
      pdf.addPage('a4', 'portrait');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      const textPageW = pdf.internal.pageSize.getWidth();
      const textPageH = pdf.internal.pageSize.getHeight();
      const textMargin = 15;
      const lineHeightMm = 5;
      const maxLineWidth = textPageW - 2 * textMargin;
      const splitLines = pdf.splitTextToSize(body, maxLineWidth);
      let cursorY = textMargin;
      for (let i = 0; i < splitLines.length; i++) {
        const line = splitLines[i];
        if (cursorY + lineHeightMm > textPageH - textMargin) {
          pdf.addPage('a4', 'portrait');
          cursorY = textMargin;
        }
        pdf.text(line, textMargin, cursorY);
        cursorY += lineHeightMm;
      }

      pdf.save(`merv-plan-${data.timeframe}.pdf`);
      toast.success('PDF exported');
    } catch {
      toast.error('Failed to export PDF');
    }
  }, [pyramidRef, data, includeCutTactics]);

  const cutTacticsCount = data.tactics.filter((t) => t.status === 'cut').length;

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
