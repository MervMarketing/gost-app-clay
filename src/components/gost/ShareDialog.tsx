import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, Copy, Check, Eye, Pencil, Loader2, Camera, Radio } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  createShareLink,
  createLiveShareLink,
  SharePermission,
  ShareType,
  CreateShareResult,
} from '@/lib/shareService';
import { GOSTData } from '@/types/gost';

interface ShareDialogProps {
  data: GOSTData;
  projectId?: string;
  iconOnly?: boolean;
}

export function ShareDialog({ data, projectId, iconOnly }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<SharePermission>('view');
  const [shareType, setShareType] = useState<ShareType>('snapshot');
  const [copied, setCopied] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  /** Lets us ignore stale async results when permission/type changes quickly */
  const requestIdRef = useRef(0);

  const canUseLiveLink = !!projectId;

  const applyResult = (result: CreateShareResult) => {
    if (result.success && result.url) {
      setGeneratedUrl(result.url);
      if (result.isLegacyFallback) {
        toast.warning(
          'Saved a full link in the URL (short link server unavailable). The link still works when copied.',
        );
      }
      return result.url;
    }
    toast.error(result.error || 'Failed to create share link');
    return null;
  };

  const handleGenerateLink = async (): Promise<string | null> => {
    const id = ++requestIdRef.current;
    setIsGenerating(true);
    try {
      let result: CreateShareResult;
      if (shareType === 'live' && projectId) {
        result = await createLiveShareLink(projectId, permission);
      } else {
        result = await createShareLink(data, permission);
      }
      if (id !== requestIdRef.current) return result.success ? result.url ?? null : null;
      return applyResult(result);
    } finally {
      if (id === requestIdRef.current) {
        setIsGenerating(false);
      }
    }
  };

  const handleCopy = async () => {
    let urlToCopy = generatedUrl;
    if (!urlToCopy) {
      const url = await handleGenerateLink();
      if (!url) return;
      urlToCopy = url;
    }
    await navigator.clipboard.writeText(urlToCopy);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      void handleGenerateLink();
    } else {
      setCopied(false);
      setGeneratedUrl('');
      setIsGenerating(false);
    }
  };

  const regenerateLink = async (type: ShareType, perm: SharePermission) => {
    const id = ++requestIdRef.current;
    setIsGenerating(true);
    try {
      let result: CreateShareResult;
      if (type === 'live' && projectId) {
        result = await createLiveShareLink(projectId, perm);
      } else {
        result = await createShareLink(data, perm);
      }
      if (id !== requestIdRef.current) return;
      applyResult(result);
    } finally {
      if (id === requestIdRef.current) {
        setIsGenerating(false);
      }
    }
  };

  const handlePermissionChange = async (value: SharePermission) => {
    setPermission(value);
    setGeneratedUrl('');
    await regenerateLink(shareType, value);
  };

  const handleShareTypeChange = async (value: ShareType) => {
    setShareType(value);
    setGeneratedUrl('');
    await regenerateLink(value, permission);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button variant="outline" size="icon" title="Share">
            <Link className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm">
            <Link className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share GOST Framework</DialogTitle>
          <DialogDescription>
            Choose the link type and access level.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Link Type Selection */}
          {canUseLiveLink && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Link type</Label>
              <RadioGroup
                value={shareType}
                onValueChange={(v) => void handleShareTypeChange(v as ShareType)}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="snapshot"
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all",
                    shareType === 'snapshot'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <RadioGroupItem value="snapshot" id="snapshot" className="sr-only" />
                  <div className={cn(
                    "p-2 rounded-full",
                    shareType === 'snapshot' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <Camera className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">Snapshot</p>
                    <p className="text-xs text-muted-foreground">Fixed point-in-time</p>
                  </div>
                </Label>

                <Label
                  htmlFor="live"
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all",
                    shareType === 'live'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <RadioGroupItem value="live" id="live" className="sr-only" />
                  <div className={cn(
                    "p-2 rounded-full",
                    shareType === 'live' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <Radio className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">Live</p>
                    <p className="text-xs text-muted-foreground">Always up-to-date</p>
                  </div>
                </Label>
              </RadioGroup>
            </div>
          )}

          {/* Permission Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Who can access</Label>
            <RadioGroup
              value={permission}
              onValueChange={(v) => void handlePermissionChange(v as SharePermission)}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="view"
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all",
                  permission === 'view'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <RadioGroupItem value="view" id="view" className="sr-only" />
                <div className={cn(
                  "p-2 rounded-full",
                  permission === 'view' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Eye className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">View only</p>
                  <p className="text-xs text-muted-foreground">Can view but not edit</p>
                </div>
              </Label>

              <Label
                htmlFor="edit"
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all",
                  permission === 'edit'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <RadioGroupItem value="edit" id="edit" className="sr-only" />
                <div className={cn(
                  "p-2 rounded-full",
                  permission === 'edit' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Pencil className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">Can edit</p>
                  <p className="text-xs text-muted-foreground">Full editing access</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {/* Generated Link */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Shareable link</Label>
            <div className="flex gap-2">
              <Input
                value={isGenerating ? 'Generating…' : generatedUrl}
                readOnly
                className="flex-1 text-sm bg-muted"
                placeholder={
                  isGenerating ? undefined : 'Link will appear here — use Copy if empty'
                }
              />
              <Button onClick={() => void handleCopy()} className="shrink-0" disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Info text */}
          <p className="text-xs text-muted-foreground">
            {shareType === 'live' ? (
              permission === 'view'
                ? "Recipients always see your latest saved version. They can view but cannot make changes."
                : "Recipients always see your latest saved version. Changes they make only affect their local copy."
            ) : (
              permission === 'view' 
                ? "Recipients see a snapshot from when this link was created. They can view but cannot edit."
                : "Recipients see a snapshot from when this link was created. Changes only affect their local copy."
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
