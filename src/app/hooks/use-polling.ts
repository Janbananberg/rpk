import { useEffect } from "react";

/** How often pages re-fetch shared data while the tab is visible. */
export const POLL_INTERVAL_MS = 30_000;

interface PollingOptions {
  intervalMs?: number;
  /** When false, `load` runs once and is never repeated. */
  enabled?: boolean;
}

/**
 * Runs `load` now, then every `intervalMs` while the tab is visible. A hidden tab doesn't poll,
 * and coming back to it fetches straight away. Pass a stable `load` (useCallback): a new
 * function restarts the polling and loads again, like a change in its dependencies should.
 */
export function usePolling(load: () => unknown, { intervalMs = POLL_INTERVAL_MS, enabled = true }: PollingOptions = {}) {
  useEffect(() => {
    load();
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (timer === undefined) timer = setInterval(load, intervalMs);
    };
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        load();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [load, enabled, intervalMs]);
}
