import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowRight, Target, Users, Lightbulb, LogIn } from 'lucide-react';

interface IntroPageProps {
  onGetStarted: () => void;
}

export function IntroPage({ onGetStarted }: IntroPageProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="font-display text-lg font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
          >
            Merv
          </button>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button variant="outline" size="sm" onClick={() => navigate('/projects')} className="font-medium">
                My Projects
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate('/auth')} className="font-medium">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-6 pb-20 pt-16 md:px-10 md:pt-20">
          <div className="flex max-w-3xl flex-col items-center text-center">
            <p className="mb-6 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground md:text-xs">
              Execution planning
            </p>
            <h1 className="font-display text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.04em] text-foreground md:text-5xl lg:text-[3.35rem]">
              Turn ideas into a plan your team can actually run.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl md:leading-[1.5]">
              Align goals, objectives, strategies, and tactics in one place — so nothing ships out of order.
            </p>

            <div className="mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button size="lg" className="w-full sm:w-auto" onClick={onGetStarted}>
                Try demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => navigate('/auth')}
                >
                  Sign up free
                </Button>
              )}
            </div>

            {!isAuthenticated && (
              <p className="mt-5 text-center text-xs text-muted-foreground">
                Create an account to save workspaces and projects.
              </p>
            )}
          </div>

          <div className="mt-20 grid w-full max-w-4xl gap-4 md:grid-cols-3 md:gap-5">
            <div className="rounded-2xl border border-border/80 bg-card p-6 text-left shadow-subtle transition-shadow hover:shadow-elevated">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                <Target className="h-5 w-5 text-foreground" />
              </div>
              <h2 className="font-display text-base font-semibold">What is this?</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                A structured GOST builder: Goal, Objectives, Strategies, and Tactics — so the work ladders up.
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card p-6 text-left shadow-subtle transition-shadow hover:shadow-elevated">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                <Users className="h-5 w-5 text-foreground" />
              </div>
              <h2 className="font-display text-base font-semibold">Who is it for?</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Founders, operators, and marketers who need clarity without a sixty-slide strategy deck.
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card p-6 text-left shadow-subtle transition-shadow hover:shadow-elevated md:col-span-1">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                <Lightbulb className="h-5 w-5 text-foreground" />
              </div>
              <h2 className="font-display text-base font-semibold">Why use it?</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Most plans jump to tactics. Merv keeps everything aligned to a single goal you can defend.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
          <p className="text-center text-xs text-muted-foreground">Plan less. Execute better.</p>
        </div>
      </footer>
    </div>
  );
}
