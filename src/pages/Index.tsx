import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { GOSTBuilder } from '@/components/gost/GOSTBuilder';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getSharedPlan } from '@/lib/shareService';
import { GOSTData } from '@/types/gost';

// -- Types -------------------------------------------------------------------

interface SharedPlanState {
  data: GOSTData;
  isViewOnly: boolean;
  isLive?: boolean;
}

// -- Sub-components ----------------------------------------------------------

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const ErrorScreen = ({
  message,
  onReturnHome,
}: {
  message: string;
  onReturnHome: () => void;
}) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
    <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-8 text-center shadow-subtle">
      <p className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Share link
      </p>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      <Button className="mt-6 w-full rounded-xl" variant="outline" onClick={onReturnHome}>
        Go to homepage
      </Button>
    </div>
  </div>
);

// -- Main component ----------------------------------------------------------

const Index = () => {
  const navigate = useNavigate();

  // useSearchParams keeps URL reads reactive and inside React Router's model,
  // unlike accessing window.location.search directly.
  const [searchParams] = useSearchParams();
  const legacyGostParam = searchParams.get('gost');
  const shareId = searchParams.get('share');
  const hasSharedData = Boolean(legacyGostParam || shareId);

  const { isAuthenticated, loading } = useAuth();

  const [sharedPlan, setSharedPlan] = useState<SharedPlanState | null>(null);
  const [loadingShare, setLoadingShare] = useState(Boolean(shareId));
  const [shareError, setShareError] = useState<string | null>(null);

  // Fetch shared plan from the database when a share ID is present.
  // The cancellation guard prevents stale state updates if the component
  // unmounts or shareId changes while the request is still in flight.
  useEffect(() => {
    if (!shareId) return;

    let cancelled = false;
    setLoadingShare(true);
    setShareError(null);

    getSharedPlan(shareId).then((result) => {
      if (cancelled) return;

      setLoadingShare(false);

      if (result.success && result.data) {
        setSharedPlan({
          data: result.data,
          isViewOnly: result.permission === 'view',
          isLive: result.shareType === 'live',
        });
      } else {
        setShareError(result.error ?? 'Failed to load shared plan');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [shareId]);

  // Redirect authenticated users who aren't viewing shared content to /projects.
  useEffect(() => {
    if (!loading && isAuthenticated && !hasSharedData) {
      navigate('/projects');
    }
  }, [isAuthenticated, loading, hasSharedData, navigate]);

  if (loading || loadingShare) return <LoadingScreen />;

  if (shareError) {
    return (
      <ErrorScreen
        message={shareError}
        onReturnHome={() => navigate('/')}
      />
    );
  }

  // Short-link share: pass resolved data and permissions directly to GOSTBuilder.
  if (sharedPlan) {
    return (
      <GOSTBuilder
        initialData={sharedPlan.data}
        isViewOnly={sharedPlan.isViewOnly}
        shareId={shareId || undefined}
      />
    );
  }

  // Legacy ?gost= format or unauthenticated demo mode:
  // let GOSTBuilder handle URL parsing internally.
  return <GOSTBuilder />;
};

export default Index;
