import { useEffect } from "react";
import { API_BASE, fetchDataVersion } from "../components/api";

/** How often pages check for new shared data while the tab is visible. */
export const POLL_INTERVAL_MS = 30_000;

interface PollingOptions {
  intervalMs?: number;
  /** When false, `load` runs once and is never repeated. */
  enabled?: boolean;
}

/**
 * Runs `load` now, then checks every `intervalMs` while the tab is visible. A check asks the
 * backend for its data version and only runs `load` when the version has changed, so an idle
 * page costs one tiny request per interval. A hidden tab doesn't poll, and coming back to it
 * checks straight away. Pass a stable `load` (useCallback): a new function restarts the
 * polling and loads again, like a change in its dependencies should.
 */
export function usePolling(load: () => unknown, { intervalMs = POLL_INTERVAL_MS, enabled = true }: PollingOptions = {}) {
  useEffect(() => {
    let cancelled = false;
    let lastVersion: number | null = null;

    // Read the version before loading: a write that lands in between then shows up as a
    // change on the next check instead of being missed.
    const loadFresh = async () => {
      if (API_BASE) lastVersion = await fetchDataVersion();
      if (!cancelled) load();
    };
    const check = async () => {
      const version = await fetchDataVersion();
      if (cancelled) return;
      // No version (an old backend or a failed request): fall back to loading every time.
      if (version !== null && version === lastVersion) return;
      lastVersion = version;
      load();
    };

    loadFresh();
    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (timer === undefined) timer = setInterval(check, intervalMs);
    };
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        check();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [load, enabled, intervalMs]);
}
