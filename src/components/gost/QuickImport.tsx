import { useState, useRef, useCallback } from 'react';
import { GOSTData } from '@/types/gost';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Clipboard, X, FileText, Check } from 'lucide-react';
import { parseGOSTFromText } from '@/lib/gostSerializer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface QuickImportProps {
  onImport: (data: GOSTData) => void;
  onDismiss: () => void;
}

export function QuickImport({ onImport, onDismiss }: QuickImportProps) {
  const [pasteContent, setPasteContent] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleParse = useCallback(() => {
    if (!pasteContent.trim()) return;
    
    const parsed = parseGOSTFromText(pasteContent);
    if (parsed) {
      onImport(parsed);
      toast.success('GOST framework imported successfully');
    } else {
      toast.error('Could not parse content. Please check the format.');
    }
  }, [pasteContent, onImport]);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const parsed = parseGOSTFromText(text);
        if (parsed) {
          onImport(parsed);
          toast.success('GOST framework imported from file');
        } else {
          setPasteContent(text);
          toast.info('Content loaded. Review and click Import.');
        }
      }
    };
    reader.readAsText(file);
  }, [onImport]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md'))) {
      handleFileUpload(file);
    } else {
      toast.error('Please drop a .txt or .md file');
    }
  }, [handleFileUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const canParse = pasteContent.trim().length > 0;

  return (
    <div className="bg-card rounded-xl border border-border shadow-subtle p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-foreground">Import Existing GOST</h3>
          <p className="text-sm text-muted-foreground">
            Paste your complete GOST framework or upload a text file
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-colors",
          isDragOver ? "border-primary bg-accent/50" : "border-border"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <Textarea
          value={pasteContent}
          onChange={(e) => setPasteContent(e.target.value)}
          placeholder={`Paste your GOST framework here...

Example format:
GOAL
Become the leading photo platform for creators

OBJECTIVES
1. Monthly Active Users: 10K → 50K
2. Revenue: $5K → $25K MRR

STRATEGIES
1. Viral sharing features
2. Creator monetization tools

TACTICS
- Launch social sharing buttons [active]
- Add watermarking feature [planned]`}
          className="min-h-[180px] resize-none border-0 focus-visible:ring-0 bg-transparent"
        />
        
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-accent/80 rounded-lg">
            <div className="text-center">
              <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Drop file here</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
          <span className="text-xs text-muted-foreground">.txt or .md</span>
        </div>
        
        <Button 
          onClick={handleParse}
          disabled={!canParse}
          size="sm"
        >
          <Check className="h-4 w-4 mr-2" />
          Import & Parse
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        <span className="font-medium">Tip:</span> You can also paste GOST text anywhere on the page (outside input fields) to auto-import.
      </p>
    </div>
  );
}
