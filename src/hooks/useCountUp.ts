import { useEffect, useRef, useState } from 'react';

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Smoothly interpolates displayed value when `target` changes (requestAnimationFrame).
 * First paint matches `target` with no animation; later changes animate from the last displayed value.
 */
export function useCountUp(target: number, durationMs = 680): number {
  const [display, setDisplay] = useState(() => (Number.isFinite(target) ? target : 0));
  const displayRef = useRef(display);
  displayRef.current = display;

  const rafRef = useRef(0);
  const isFirstTarget = useRef(true);

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setDisplay(target);
      return;
    }

    if (isFirstTarget.current) {
      isFirstTarget.current = false;
      setDisplay(target);
      return;
    }

    cancelAnimationFrame(rafRef.current);
    const from = Number.isFinite(displayRef.current) ? displayRef.current : target;
    if (Math.abs(from - target) < 1e-9) {
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      const next = from + (target - from) * eased;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, durationMs]);

  return display;
}
