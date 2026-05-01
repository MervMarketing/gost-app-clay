import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-8 text-center shadow-subtle">
        <p className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Error
        </p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight text-foreground">
          404
        </h1>
        <p className="mt-3 text-muted-foreground">That page doesn&apos;t exist.</p>
        <Button className="mt-6 w-full rounded-xl" asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
