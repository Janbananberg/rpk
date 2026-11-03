import { useState, useEffect } from "react";
import { TournamentBracket } from "./tournament-bracket";
import { MusicPlayerBar, NostalgiaOverlay } from "./music-player";
import { AnimatePresence, motion } from "motion/react";
import { Trophy, Clock, Users, ChevronDown, ChevronUp, Contrast } from "lucide-react";
import { fetchTournamentHistory, type TournamentHistoryEntry, type TournamentHistoryMatchDetail } from "./api";
import { RoadToFinal } from "./tournament-enhancements";
import { AmericanoTournament } from "./americano-tournament";
import { Shuffle, GitBranch } from "lucide-react";

const FONT = "'Titillium Web', sans-serif";

/**
 * Material 3 Dark High-Contrast overrides — scoped to .tournament-high-contrast.
 *
 * M3 "high contrast" dark scheme shifts tonal values towards the extremes:
 *   • on-surface / foreground  →  tone 100  (maximum white)
 *   • on-surface-variant       →  tone 100
 *   • primary                  →  tone 95   (near-white, still identifiably blue)
 *   • secondary                →  tone 100
 *   • outline (border)         →  tone 80   (was variant-30, now much brighter)
 *   • outline-variant          →  tone 60   (was variant-30)
 *   • destructive / error      →  tone 95
 *   • surface-container tiers  →  nudged +2 steps for clearer layering
 *
 * Every value references LKAB palette tokens from lkab-default-palette.css
 * so users can update the palette once and see changes propagate.
 */
const HIGH_CONTRAST_STYLES = `
.tournament-high-contrast {
  /* ── Foreground / text ──────────────────────────────────── */
  --foreground:             var(--lkab-dark-neutral-100);          /* N-96 → N-100 */
  --card-foreground:        var(--lkab-dark-neutral-100);
  --popover-foreground:     var(--lkab-dark-neutral-100);
  --muted-foreground:       var(--lkab-dark-neutral-variant-90);   /* NV-80 → NV-90 */

  /* ── Primary ────────────────────────────────────────────── */
  --primary:                var(--lkab-primary-95);                /* P-80 → P-95 */
  --primary-foreground:     var(--lkab-primary-10);                /* P-20 → P-10 */

  /* ── Secondary ──────────────────────────────────────────── */
  --secondary:              var(--lkab-secondary-100);             /* S-90 → S-100 */
  --secondary-foreground:   var(--lkab-secondary-10);              /* S-30 → S-10 */

  /* ── Accent ─────────────────────────────────────────────── */
  --accent:                 var(--lkab-secondary-60);              /* S-40 → S-60 */
  --accent-foreground:      var(--lkab-secondary-100);             /* S-95 → S-100 */

  /* ── Destructive / Error ────────────────────────────────── */
  --destructive:            var(--lkab-red-95);                    /* R-80 → R-95 */
  --destructive-foreground: var(--lkab-red-10);                    /* R-20 → R-10 */

  /* ── Outline / Border ───────────────────────────────────── */
  --border:                 var(--lkab-dark-neutral-variant-80);   /* NV-30 → NV-80 */
  --border-strong:          var(--lkab-dark-neutral-variant-90);   /* NV-60 → NV-90 */

  /* ── Ring ────────────────────────────────────────────────── */
  --ring:                   var(--lkab-primary-95);

  /* ── Muted ──────────────────────────────────────────────── */
  --muted:                  var(--lkab-dark-neutral-24);           /* N-22 → N-24 */

  /* ── Surface containers — nudge up one tonal step ───────── */
  --surface-container-lowest:  var(--lkab-dark-neutral-6);         /* stays N-4 → N-6 */
  --surface-container-low:     var(--lkab-dark-neutral-12);        /* N-10 → N-12 */
  --surface-container:         var(--lkab-dark-neutral-17);        /* N-12 → N-17 */
  --surface-container-high:    var(--lkab-dark-neutral-22);        /* N-17 → N-22 */
  --surface-container-highest: var(--lkab-dark-neutral-24);        /* N-22 → N-24 */

  /* ── Success / Warning / Info ───────────────────────────── */
  --success:                var(--lkab-green-95);                  /* G-80 → G-95 */
  --success-foreground:     var(--lkab-green-10);
  --warning:                var(--lkab-yellow-95);                 /* Y-80 → Y-95 */
  --warning-foreground:     var(--lkab-yellow-10);
  --info:                   var(--lkab-primary-95);
  --info-foreground:        var(--lkab-primary-10);
}
`;

export function TournamentPage() {
  const [nostalgiaMode, setNostalgiaMode] = useState(false);
  const [history, setHistory] = useState<TournamentHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [highContrast, setHighContrast] = useState(() => {
    try { return localStorage.getItem("tournament-hc") === "1"; } catch { return false; }
  });
  const [tournamentMode, setTournamentMode] = useState<"klassisk" | "americano">(() => {
    try { return (localStorage.getItem("tournament-mode") as "klassisk" | "americano") || "klassisk"; } catch { return "klassisk"; }
  });

  useEffect(() => {
    try { localStorage.setItem("tournament-hc", highContrast ? "1" : "0"); } catch {}
  }, [highContrast]);

  useEffect(() => {
    try { localStorage.setItem("tournament-mode", tournamentMode); } catch {}
  }, [tournamentMode]);

  useEffect(() => {
    (async () => {
      setLoadingHistory(true);
      const h = await fetchTournamentHistory();
      setHistory(h);
      setLoadingHistory(false);
    })();
  }, []);

  // Refresh history when bracket changes (e.g. tournament saved)
  const refreshHistory = async () => {
    const h = await fetchTournamentHistory();
    setHistory(h);
  };

  return (
    <div className={`relative min-h-full ${highContrast ? "tournament-high-contrast" : ""}`}>
      {/* Inject high-contrast scoped styles */}
      <style>{HIGH_CONTRAST_STYLES}</style>

      {/* Subtle ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/[0.02] blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/[0.03] blur-[100px] rounded-full" />
      </div>

      {/* Main content */}
      <AnimatePresence>
        {!nostalgiaMode && (
          <motion.div
            key="main-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -20 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex flex-col gap-4 md:gap-5 px-3 sm:px-6 py-3 sm:py-4 pb-40 md:pb-32 max-w-4xl mx-auto"
          >
            {/* Mode selector + contrast toggle row */}
            <div className="flex items-center gap-2">
              <div
                className="flex-1 flex gap-1 p-1 rounded-[var(--radius-card)]"
                style={{ background: "var(--surface-container)" }}
              >
                {([
                  { key: "klassisk" as const, label: "Klassisk", icon: <GitBranch className="w-4 h-4" />, desc: "Slutspelsträd" },
                  { key: "americano" as const, label: "Americano", icon: <Shuffle className="w-4 h-4" />, desc: "Alla möter alla" },
                ]).map((mode) => {
                  const active = tournamentMode === mode.key;
                  return (
                    <button
                      key={mode.key}
                      onClick={() => setTournamentMode(mode.key)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-button)] border transition-all cursor-pointer ${
                        active
                          ? "border-primary/40 text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                      style={{
                        background: active ? "color-mix(in srgb, var(--primary) 10%, var(--surface-container-high))" : "transparent",
                        fontFamily: FONT,
                        fontSize: "var(--text-label)",
                        fontWeight: active ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                      }}
                    >
                      {mode.icon}
                      <span>{mode.label}</span>
                      <span
                        className="hidden sm:inline text-muted-foreground"
                        style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-normal)" }}
                      >
                        · {mode.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* High contrast toggle */}
              <button
                onClick={() => setHighContrast((v) => !v)}
                className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-button)] border transition-all duration-300 cursor-pointer ${
                  highContrast
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border/60"
                }`}
                title={highContrast ? "Stäng av ökad kontrast" : "Slå på ökad kontrast"}
              >
                <Contrast className={`w-4 h-4 transition-transform duration-300 ${highContrast ? "scale-110" : "group-hover:scale-105"}`} />
                <span className="hidden sm:inline" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>
                  {highContrast ? "På" : "Kontrast"}
                </span>
              </button>
            </div>

            {/* Tournament content */}
            <AnimatePresence mode="wait">
              {tournamentMode === "klassisk" ? (
                <motion.div
                  key="klassisk"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.25 }}
                >
                  <TournamentBracket onTournamentSaved={refreshHistory} />
                </motion.div>
              ) : (
                <motion.div
                  key="americano"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  <AmericanoTournament />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tournament History Section */}
            <section className="w-full">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between px-1 py-2 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-surface-container-high">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span
                    className="text-foreground"
                    style={{
                      fontFamily: FONT,
                      fontSize: "var(--text-base)",
                      fontWeight: "var(--font-weight-semibold)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Turneringshistorik
                  </span>
                  {history.length > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full bg-surface-container-highest text-muted-foreground tabular-nums"
                      style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700 }}
                    >
                      {history.length}
                    </span>
                  )}
                </div>
                {showHistory ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    {loadingHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      </div>
                    ) : history.length === 0 ? (
                      <div
                        className="flex flex-col items-center gap-2 py-10 text-muted-foreground"
                      >
                        <Trophy className="w-8 h-8 opacity-30" />
                        <span
                          style={{
                            fontFamily: FONT,
                            fontSize: "var(--text-label)",
                          }}
                        >
                          Inga avslutade turneringar
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 mt-2">
                        {history.map((entry) => (
                          <HistoryCard key={entry.id} entry={entry} />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nostalgia overlay */}
      <AnimatePresence>
        {nostalgiaMode && (
          <NostalgiaOverlay onClose={() => setNostalgiaMode(false)} />
        )}
      </AnimatePresence>

      {/* Spotify-style bottom bar */}
      <MusicPlayerBar
        onNostalgiaToggle={() => setNostalgiaMode((m) => !m)}
        nostalgiaActive={nostalgiaMode}
      />
    </div>
  );
}

function HistoryCard({ entry }: { entry: TournamentHistoryEntry }) {
  const date = new Date(entry.date);
  const dateStr = date.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="rounded-[var(--radius-card)] border border-border/40 p-4 transition-colors hover:border-border/60"
      style={{ background: "var(--surface-container)" }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Champion + details */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary/10">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className="text-primary truncate"
              style={{
                fontFamily: FONT,
                fontSize: "var(--text-base)",
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              {entry.champion}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="text-muted-foreground"
                style={{ fontFamily: FONT, fontSize: "12px" }}
              >
                {dateStr} {timeStr}
              </span>
              <span className="text-muted-foreground/40">|</span>
              <span
                className="text-muted-foreground"
                style={{ fontFamily: FONT, fontSize: "12px" }}
              >
                Bo{entry.bestOfSemi}/{entry.bestOfFinal}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Players */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Users className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span
            className="text-muted-foreground"
            style={{ fontFamily: FONT, fontSize: "12px" }}
          >
            {entry.players.length}
          </span>
        </div>
      </div>

      {/* Bracket summary */}
      {entry.matches ? (
        <MatchScoresSummary matches={entry.matches} />
      ) : (
        <div className="mt-3 flex gap-3">
          <div className="flex-1 flex flex-col gap-1">
            <span
              className="text-muted-foreground/60 uppercase"
              style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}
            >
              SF1
            </span>
            <span
              className="text-foreground truncate"
              style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
            >
              {entry.semi1Winner}
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <span
              className="text-muted-foreground/60 uppercase"
              style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}
            >
              SF2
            </span>
            <span
              className="text-foreground truncate"
              style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
            >
              {entry.semi2Winner}
            </span>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <span
              className="text-primary/60 uppercase"
              style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}
            >
              Final
            </span>
            <span
              className="text-primary truncate"
              style={{
                fontFamily: FONT,
                fontSize: "var(--text-label)",
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              {entry.champion}
            </span>
          </div>
        </div>
      )}

      {/* Road to the Final (feature 14) */}
      <RoadToFinal entry={entry} />
    </div>
  );
}

function MatchScoresSummary({ matches }: { matches: NonNullable<TournamentHistoryEntry["matches"]> }) {
  const matchOrder: { key: keyof typeof matches; label: string; isFinal?: boolean }[] = [
    { key: "qf1", label: "KF1" },
    { key: "qf2", label: "KF2" },
    { key: "qf3", label: "KF3" },
    { key: "qf4", label: "KF4" },
    { key: "semi1", label: "SF1" },
    { key: "semi2", label: "SF2" },
    { key: "final", label: "Final", isFinal: true },
  ];

  function formatScore(m: TournamentHistoryMatchDetail): string {
    // Show set scores like "11-7, 9-11, 11-5"
    const sets: string[] = [];
    for (let i = 0; i < m.scores1.length; i++) {
      if (m.scores1[i] === 0 && m.scores2[i] === 0) continue;
      sets.push(`${m.scores1[i]}-${m.scores2[i]}`);
    }
    return sets.length > 0 ? sets.join(", ") : `${m.wins1}-${m.wins2}`;
  }

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {/* QF row */}
      <div className="grid grid-cols-4 gap-2">
        {matchOrder.slice(0, 4).map(({ key, label }) => {
          const m = matches[key];
          if (!m) return <div key={key} />;
          return (
            <MatchScoreLine key={key} label={label} match={m} formatScore={formatScore} />
          );
        })}
      </div>
      {/* SF + Final row */}
      <div className="grid grid-cols-3 gap-2">
        {matchOrder.slice(4).map(({ key, label, isFinal }) => {
          const m = matches[key];
          if (!m) return <div key={key} />;
          return (
            <MatchScoreLine key={key} label={label} match={m} formatScore={formatScore} isFinal={isFinal} />
          );
        })}
      </div>
    </div>
  );
}

function MatchScoreLine({ label, match, formatScore, isFinal }: {
  label: string;
  match: TournamentHistoryMatchDetail;
  formatScore: (m: TournamentHistoryMatchDetail) => string;
  isFinal?: boolean;
}) {
  const isP1Winner = match.winner === match.player1;
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={`uppercase ${isFinal ? "text-primary/60" : "text-muted-foreground/60"}`}
        style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}
      >
        {label}
      </span>
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <span
            className={`truncate ${isP1Winner ? (isFinal ? "text-primary" : "text-foreground") : "text-muted-foreground/70"}`}
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-xs)",
              fontWeight: isP1Winner ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
            }}
          >
            {match.player1}
          </span>
          <span className="text-muted-foreground/40 tabular-nums" style={{ fontFamily: FONT, fontSize: "10px" }}>
            {match.wins1}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`truncate ${!isP1Winner ? (isFinal ? "text-primary" : "text-foreground") : "text-muted-foreground/70"}`}
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-xs)",
              fontWeight: !isP1Winner ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
            }}
          >
            {match.player2}
          </span>
          <span className="text-muted-foreground/40 tabular-nums" style={{ fontFamily: FONT, fontSize: "10px" }}>
            {match.wins2}
          </span>
        </div>
      </div>
      <span
        className="text-muted-foreground/50 tabular-nums"
        style={{ fontFamily: FONT, fontSize: "9px" }}
      >
        {formatScore(match)}
      </span>
    </div>
  );
}