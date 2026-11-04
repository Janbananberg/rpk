import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Maximize, Minimize } from "lucide-react";
import {
  discoverMonths,
  fetchEloResetTimestamp,
  fetchHighscorePlayers,
  fetchHistoricalStats,
  fetchMonthList,
  fetchMonthlySessions,
} from "./api";
import type { GameSession } from "./api";
import { usePolling } from "../hooks/use-polling";
import { computeBigScreenData } from "../lib/big-screen";
import type { BigScreenData } from "../lib/big-screen";
import { formatMonthLabel, getCurrentMonth } from "../lib/dates";
import { RpkLogo } from "./rpk-logo";
import { BIG_SCREEN_SLIDES, availableSlides, u } from "./big-screen/slides";
import type { SlideKey } from "./big-screen/slides";

// Storbildsläge: a full-screen, read-only view for the office TV. It rotates between a few
// slides and refreshes its own data with usePolling. Everything is sized in `--u`, a unit
// that keeps the 16:9 layout inside the viewport, so nothing ever scrolls.

const SLIDE_MS = 15_000;
const CURSOR_IDLE_MS = 3_000;

function hasContent(data: BigScreenData): boolean {
  return data.leaderboard.length > 0 || data.latestSession !== null;
}

export function BigScreenPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<BigScreenData | null>(null);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [cursorHidden, setCursorHidden] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dataRef = useRef<BigScreenData | null>(null);

  // Read-only: only fetchers and pure lib functions, never the highscore page's seeding/migration.
  const load = useCallback(async () => {
    const month = getCurrentMonth();
    const [players, monthList, discovered, historical, eloReset] = await Promise.all([
      fetchHighscorePlayers(),
      fetchMonthList(),
      discoverMonths(),
      fetchHistoricalStats(),
      fetchEloResetTimestamp(),
    ]);
    const months = Array.from(new Set([...monthList, ...discovered, month])).sort();
    const perMonth = await Promise.all(months.map((m) => fetchMonthlySessions(m)));
    const sessionsByMonth: Record<string, GameSession[]> = {};
    months.forEach((m, i) => { sessionsByMonth[m] = perMonth[i]; });

    const next = computeBigScreenData(sessionsByMonth, players, historical, eloReset, month);
    // The fetchers answer empty on network errors; don't blank the TV over a failed poll.
    if (!hasContent(next) && dataRef.current && hasContent(dataRef.current)) return;
    dataRef.current = next;
    setData(next);
    setLoadedAt(Date.now());
  }, []);
  usePolling(load);

  const slides: SlideKey[] = data ? availableSlides(data) : [];
  const slideCount = slides.length;
  const slide = slideCount > 0 ? slides[tick % slideCount] : null;
  const factIndex = slideCount > 0 ? Math.floor(tick / slideCount) : 0;

  // Rotation and clock
  useEffect(() => {
    const rotate = setInterval(() => setTick((t) => t + 1), SLIDE_MS);
    const clock = setInterval(() => setNow(Date.now()), 10_000);
    return () => {
      clearInterval(rotate);
      clearInterval(clock);
    };
  }, [tick]);

  // Keyboard: arrows step through slides, Escape goes back to the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") setTick((t) => t + 1);
      else if (e.key === "ArrowLeft") setTick((t) => Math.max(0, t - 1));
      else if (e.key === "Escape" && !document.fullscreenElement) navigate("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  // Hide the mouse pointer while nobody touches it, so it doesn't sit on the TV picture.
  useEffect(() => {
    let timer = setTimeout(() => setCursorHidden(true), CURSOR_IDLE_MS);
    const onMove = () => {
      setCursorHidden(false);
      clearTimeout(timer);
      timer = setTimeout(() => setCursorHidden(true), CURSOR_IDLE_MS);
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const clock = new Date(now);
  const rootStyle = {
    "--u": "min(1vh, 0.5625vw)",
    background: "var(--background)",
    color: "var(--foreground)",
    cursor: cursorHidden ? "none" : undefined,
  } as CSSProperties;

  const controlClass =
    "flex items-center justify-center rounded-full border border-border text-muted-foreground opacity-40 hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden select-none" style={rootStyle}>
      {/* ── Header ── */}
      <header className="flex items-center shrink-0" style={{ height: u(12), padding: `0 ${u(5)}`, gap: u(2.5) }}>
        <RpkLogo style={{ height: u(7), aspectRatio: "786 / 690" }} />
        <div className="flex flex-col" style={{ lineHeight: 1.05 }}>
          <span style={{ fontSize: u(4), fontWeight: "var(--font-weight-bold)" }}>Rundpingis</span>
          <span className="text-muted-foreground" style={{ fontSize: u(2.4) }}>
            {formatMonthLabel(getCurrentMonth())}
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex flex-col items-end" style={{ lineHeight: 1.05 }}>
          <span className="tabular-nums" style={{ fontSize: u(5), fontWeight: "var(--font-weight-bold)" }}>
            {clock.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="text-muted-foreground" style={{ fontSize: u(2.2) }}>
            {clock.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
        {/* Small, unobtrusive controls */}
        <div className="flex flex-col" style={{ gap: u(1), marginLeft: u(2) }}>
          <Link to="/" className={controlClass} style={{ width: u(4.4), height: u(4.4) }} aria-label="Tillbaka till appen" title="Tillbaka till appen (Esc)">
            <ArrowLeft style={{ width: u(2.4), height: u(2.4) }} />
          </Link>
          <button type="button" onClick={toggleFullscreen} className={controlClass} style={{ width: u(4.4), height: u(4.4), background: "transparent" }} aria-label={isFullscreen ? "Lämna helskärm" : "Helskärm"} title={isFullscreen ? "Lämna helskärm" : "Helskärm"}>
            {isFullscreen ? <Minimize style={{ width: u(2.2), height: u(2.2) }} /> : <Maximize style={{ width: u(2.2), height: u(2.2) }} />}
          </button>
        </div>
      </header>

      {/* ── Slide ── */}
      <main className="flex-1 min-h-0 relative" style={{ padding: `${u(1)} ${u(6)}` }}>
        {data === null ? (
          <div className="h-full flex items-center justify-center">
            <div className="border-primary border-t-transparent rounded-full animate-spin" style={{ width: u(8), height: u(8), borderWidth: u(0.8) }} />
          </div>
        ) : slide === null ? (
          <div className="h-full flex flex-col items-center justify-center text-center" style={{ gap: u(2) }}>
            <span style={{ fontSize: u(7), fontWeight: "var(--font-weight-bold)" }}>Inga omgångar än</span>
            <span className="text-muted-foreground" style={{ fontSize: u(3.4), maxWidth: u(120) }}>
              Spela en runda och registrera den i appen, så dyker topplistan upp här.
            </span>
          </div>
        ) : (
          // Both slides are absolutely positioned: the old one fades out quickly and the new one
          // fades in just after, on a timer, so it never waits on the exit animation.
          <AnimatePresence initial={false}>
            <motion.div
              key={`${slide}-${tick}`}
              className="absolute inset-0 flex flex-col"
              style={{ padding: `${u(1)} ${u(6)}` }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.25 } }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            >
              {BIG_SCREEN_SLIDES[slide].render(data, factIndex)}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* ── Footer: slide progress ── */}
      <footer className="shrink-0 flex items-center" style={{ height: u(7), padding: `0 ${u(6)}`, gap: u(3) }}>
        <div className="flex items-center" style={{ gap: u(2.5) }}>
          {slides.map((key, i) => {
            const active = key === slide;
            return (
              <span
                key={key}
                className={active ? "text-foreground" : "text-muted-foreground"}
                style={{ fontSize: u(2.2), fontWeight: active ? "var(--font-weight-bold)" : "var(--font-weight-normal)", opacity: active ? 1 : 0.6 }}
              >
                {i > 0 && <span className="text-muted-foreground" style={{ marginRight: u(2.5), opacity: 0.5 }}>·</span>}
                {BIG_SCREEN_SLIDES[key].label}
              </span>
            );
          })}
        </div>
        <div className="flex-1 rounded-full overflow-hidden" style={{ height: u(0.6), background: "var(--surface-container-high)" }}>
          {slideCount > 1 && (
            <motion.div
              key={tick}
              className="h-full rounded-full"
              style={{ background: "var(--primary)" }}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: SLIDE_MS / 1000, ease: "linear" }}
            />
          )}
        </div>
        {loadedAt !== null && (
          <span className="text-muted-foreground tabular-nums" style={{ fontSize: u(2) }}>
            Uppdaterad {new Date(loadedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </footer>
    </div>
  );
}
