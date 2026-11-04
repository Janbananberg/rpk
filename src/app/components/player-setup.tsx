import { useState, useEffect, useMemo } from "react";
import { ArrowRight, Shuffle, ChevronDown, TrendingUp, Calendar, X, Check, UserMinus, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface BwpEntry {
  name: string;
  eloDelta: number;
  gamesPlayed: number;
}

interface PlayerSetupProps {
  onStart: (names: [string, string, string, string, string, string, string, string], bestOfs: { quarter: number; semi: number; final: number }) => void;
  availablePlayers?: string[];
  loadingPlayers?: boolean;
  top8Bwp?: BwpEntry[];
  loadingBwp?: boolean;
  bwpMonth?: string;
  bwpDebugInfo?: { sessionCount: number; playerCount: number };
  availableMonths?: string[];
  selectedBwpMonth?: string;
  setSelectedBwpMonth?: (month: string) => void;
}

const SEED_MATCHUPS = [
  { qf: "KF 1", s1: 0, s2: 7 },
  { qf: "KF 2", s1: 3, s2: 4 },
  { qf: "KF 3", s1: 1, s2: 6 },
  { qf: "KF 4", s1: 2, s2: 5 },
];

export function PlayerSetup({
  onStart,
  availablePlayers = [],
  loadingPlayers = false,
  top8Bwp = [],
  loadingBwp = false,
  bwpMonth = "",
  bwpDebugInfo = { sessionCount: 0, playerCount: 0 },
  availableMonths = [],
  selectedBwpMonth = "",
  setSelectedBwpMonth,
}: PlayerSetupProps) {
  const [names, setNames] = useState(["", "", "", "", "", "", "", ""]);
  const [quarterBestOf, setQuarterBestOf] = useState(3);
  const [semiBestOf, setSemiBestOf] = useState(3);
  const [finalBestOf, setFinalBestOf] = useState(3);
  const [showSelector, setShowSelector] = useState(false);
  const [excludedNames, setExcludedNames] = useState<Set<string>>(new Set());

  // When available players load, auto-fill if exactly 8
  useEffect(() => {
    if (availablePlayers.length === 8 && names.every((n) => !n)) {
      setNames([...availablePlayers]);
    }
  }, [availablePlayers]);

  const updateName = (i: number, val: string) => {
    setNames((prev) => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  };

  const allFilled = names.every((n) => n.trim().length > 0);

  // Players already selected in other slots
  const selectedInSlot = (slotIndex: number) =>
    names.filter((n, idx) => idx !== slotIndex && n.trim().length > 0);

  const shuffleNames = () => {
    setNames((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  };

  const hasRankedPlayers = top8Bwp.length > 0 && !loadingBwp;

  // Compute the active (non-excluded) ranked players
  const activeRanked = useMemo(() => {
    return top8Bwp.filter((p) => !excludedNames.has(p.name));
  }, [top8Bwp, excludedNames]);

  const selectedTop8 = activeRanked.slice(0, 8);
  const canConfirmTop8 = selectedTop8.length === 8;

  // When opening selector, reset exclusions
  const openSelector = () => {
    setExcludedNames(new Set());
    setShowSelector(true);
  };

  const toggleExclude = (name: string) => {
    setExcludedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const confirmSelection = () => {
    if (!canConfirmTop8) return;
    setNames(selectedTop8.map((p) => p.name));
    setShowSelector(false);
  };

  // Current month label for display
  const monthLabel = (() => {
    if (bwpMonth && /^\d{4}-\d{2}$/.test(bwpMonth)) {
      const [year, m] = bwpMonth.split("-");
      const d = new Date(Number(year), Number(m) - 1, 1);
      return d.toLocaleString("sv-SE", { month: "long", year: "numeric" });
    }
    return new Date().toLocaleString("sv-SE", { month: "long" });
  })();

  const qfLabels = ["Kvartsfinal 1", "Kvartsfinal 2", "Kvartsfinal 3", "Kvartsfinal 4"];

  // Actual QF pairings must match handleStart in tournament-bracket:
  // QF1: names[0] vs names[7] (seed 1 vs 8)
  // QF2: names[3] vs names[4] (seed 4 vs 5)
  // QF3: names[1] vs names[6] (seed 2 vs 7)
  // QF4: names[2] vs names[5] (seed 3 vs 6)
  const qfPairs: [number, number][] = [
    [0, 7], // QF1: seed 1 vs seed 8
    [3, 4], // QF2: seed 4 vs seed 5
    [1, 6], // QF3: seed 2 vs seed 7
    [2, 5], // QF4: seed 3 vs seed 6
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full max-w-md mx-auto px-4 pt-1">
      {/* Player selects */}
      <div className="w-full flex flex-col gap-5">
        {/* ── Ranked player selector ── */}
        {!loadingPlayers && availablePlayers.length >= 8 && (
          <div className="flex flex-col gap-2">
            {/* Month selector */}
            {availableMonths.length > 0 && setSelectedBwpMonth && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="relative flex-1 min-w-0">
                  <select
                    value={selectedBwpMonth}
                    onChange={(e) => setSelectedBwpMonth(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-8 rounded-[var(--radius-button)] bg-surface-container/60 border border-border/40 text-foreground focus:outline-none focus:border-primary/40 transition-all duration-200 cursor-pointer"
                    style={{
                      fontSize: "var(--text-xs)",
                    }}
                  >
                    <option value="">
                      Innevarande månad
                    </option>
                    {availableMonths.map((m) => {
                      const [y, mo] = m.split("-");
                      const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleString("sv-SE", { month: "long", year: "numeric" });
                      return (
                        <option key={m} value={m}>
                          {label.charAt(0).toUpperCase() + label.slice(1)}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            )}

            {/* Open selector button */}
            <button
              type="button"
              onClick={openSelector}
              disabled={!hasRankedPlayers}
              className={`group w-full flex items-center gap-3 px-4 py-3.5 rounded-[var(--radius-card)] border transition-all duration-300 cursor-pointer disabled:cursor-not-allowed ${
                hasRankedPlayers
                  ? "border-primary/30 bg-primary/[0.06] hover:bg-primary/[0.10] hover:border-primary/50"
                  : "border-border/30 bg-surface-container/40 opacity-50"
              }`}
              title={hasRankedPlayers ? `Välj spelare från ranking för ${monthLabel}` : "Inte tillräckligt med data denna månad"}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                hasRankedPlayers ? "bg-primary/15" : "bg-surface-container-high"
              }`}>
                {loadingBwp ? (
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <TrendingUp className={`w-4 h-4 transition-colors ${hasRankedPlayers ? "text-primary" : "text-muted-foreground"}`} />
                )}
              </div>
              <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
                <span
                  className={`transition-colors ${hasRankedPlayers ? "text-foreground" : "text-muted-foreground"}`}
                  style={{
                    fontSize: "var(--text-label)",
                    fontWeight: "var(--font-weight-semibold)",
                  }}
                >
                  Välj topp 8 — {monthLabel}
                </span>
                {hasRankedPlayers ? (
                  <span
                    className="text-muted-foreground"
                    style={{ fontSize: "var(--text-xs)" }}
                  >
                    {top8Bwp.length} rankade spelare tillgängliga
                  </span>
                ) : (
                  <span
                    className="text-muted-foreground/60"
                    style={{ fontSize: "var(--text-xs)" }}
                  >
                    {loadingBwp
                      ? "Beräknar ranking..."
                      : bwpDebugInfo.sessionCount === 0
                      ? "Inga speltillfällen hittades"
                      : bwpDebugInfo.playerCount < 8
                      ? `Hittade ${bwpDebugInfo.playerCount} spelare med >30 rundor`
                      : "Behöver minst 8 spelare med data"}
                  </span>
                )}
              </div>
              {hasRankedPlayers && (
                <span
                  className="text-primary/70 group-hover:text-primary shrink-0 transition-colors"
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Välj
                </span>
              )}
            </button>
          </div>
        )}

        {qfPairs.map(([idxA, idxB], qfIdx) => (
          <div key={qfIdx} className="flex flex-col gap-2">
            {/* Section header */}
            <div className="flex items-center gap-2 mb-0.5">
              <div className="h-px flex-1 bg-border/50" />
              <span
                className="text-muted-foreground shrink-0"
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                {qfLabels[qfIdx]}
              </span>
              <div className="h-px flex-1 bg-border/50" />
            </div>

            {[idxA, idxB].map((i) => {
              const usedNames = selectedInSlot(i);
              const options = availablePlayers.filter((p) => !usedNames.includes(p));

              return (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="text-muted-foreground w-5 text-center shrink-0"
                    style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-bold)" }}
                  >
                    {i + 1}
                  </span>

                  {/* Dropdown select — only registered players */}
                  <div className="relative flex-1 min-w-0">
                    <select
                      value={names[i]}
                      onChange={(e) => updateName(i, e.target.value)}
                      disabled={loadingPlayers || availablePlayers.length === 0}
                      className="w-full appearance-none px-4 py-3 pr-10 rounded-[var(--radius-card)] bg-surface-container border border-border/60 text-foreground focus:outline-none focus:border-primary/60 focus:bg-surface-container-high transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        fontSize: "var(--text-base)",
                        color: names[i] ? "var(--foreground)" : "var(--muted-foreground)",
                      }}
                    >
                      <option value="" disabled style={{ color: "var(--muted-foreground)" }}>
                        Välj spelare {i + 1}...
                      </option>
                      {options.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                      {/* If this slot already has a value not in options (e.g. already selected), keep it */}
                      {names[i] && !options.includes(names[i]) && (
                        <option key={names[i]} value={names[i]}>
                          {names[i]}
                        </option>
                      )}
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {loadingPlayers && (
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
              Laddar spelare...
            </span>
          </div>
        )}

        {!loadingPlayers && availablePlayers.length === 0 && (
          <div
            className="flex flex-col items-center gap-2 py-4 px-3 rounded-[var(--radius-card)] border border-border/40 bg-surface-container/40"
          >
            <span
              className="text-muted-foreground text-center"
              style={{ fontSize: "var(--text-label)" }}
            >
              Inga spelare registrerade ännu.
            </span>
            <span
              className="text-muted-foreground/60 text-center"
              style={{ fontSize: "var(--text-sm)" }}
            >
              Lägg till spelare via <strong className="text-foreground">Spela</strong>-fliken först.
            </span>
          </div>
        )}
      </div>

      {/* Match format chips */}
      <div className="w-full flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border/50" />
          <span
            className="text-muted-foreground shrink-0"
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: "var(--font-weight-semibold)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Matchformat
          </span>
          <div className="h-px flex-1 bg-border/50" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Quarterfinal format */}
          <div
            className="flex flex-col gap-2.5 p-4 rounded-[var(--radius-card)] bg-surface-container/60 border border-border/40"
          >
            <span
              className="text-muted-foreground"
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-semibold)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Kvartsfinaler
            </span>
            <div className="flex gap-2">
              {[3, 5, 7].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setQuarterBestOf(opt)}
                  className={`flex-1 py-2 rounded-[var(--radius-button)] border transition-all duration-200 cursor-pointer ${
                    quarterBestOf === opt
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-surface-container-high/50 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"
                  }`}
                  style={{
                    fontSize: "var(--text-label)",
                    fontWeight: "var(--font-weight-semibold)",
                  }}
                >
                  Bo{opt}
                </button>
              ))}
            </div>
          </div>

          {/* Semifinal format */}
          <div
            className="flex flex-col gap-2.5 p-4 rounded-[var(--radius-card)] bg-surface-container/60 border border-border/40"
          >
            <span
              className="text-muted-foreground"
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-semibold)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Semifinaler
            </span>
            <div className="flex gap-2">
              {[3, 5, 7].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSemiBestOf(opt)}
                  className={`flex-1 py-2 rounded-[var(--radius-button)] border transition-all duration-200 cursor-pointer ${
                    semiBestOf === opt
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-surface-container-high/50 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"
                  }`}
                  style={{
                    fontSize: "var(--text-label)",
                    fontWeight: "var(--font-weight-semibold)",
                  }}
                >
                  Bo{opt}
                </button>
              ))}
            </div>
          </div>

          {/* Final format */}
          <div
            className="flex flex-col gap-2.5 p-4 rounded-[var(--radius-card)] bg-surface-container/60 border border-border/40"
          >
            <span
              className="text-muted-foreground"
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-semibold)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Final
            </span>
            <div className="flex gap-2">
              {[3, 5, 7].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFinalBestOf(opt)}
                  className={`flex-1 py-2 rounded-[var(--radius-button)] border transition-all duration-200 cursor-pointer ${
                    finalBestOf === opt
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-surface-container-high/50 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"
                  }`}
                  style={{
                    fontSize: "var(--text-label)",
                    fontWeight: "var(--font-weight-semibold)",
                  }}
                >
                  Bo{opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 w-full">
        <button
          onClick={shuffleNames}
          disabled={!allFilled}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--radius-button)] text-muted-foreground hover:text-foreground hover:bg-surface-container-high/60 disabled:opacity-50 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
          style={{ fontSize: "var(--text-label)" }}
          title="Slumpa ordning"
        >
          <Shuffle className="w-4 h-4" />
          Slumpa
        </button>
        <button
          onClick={() => onStart(names as [string, string, string, string, string, string, string, string], { quarter: quarterBestOf, semi: semiBestOf, final: finalBestOf })}
          disabled={!allFilled}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-[var(--radius-button)] bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
          style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}
        >
          Starta turnering
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Player Selector Modal ── */}
      <AnimatePresence>
        {showSelector && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSelector(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Panel */}
            <motion.div
              className="relative w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] rounded-t-[var(--radius-card)] sm:rounded-[var(--radius-card)] border border-border/40 overflow-hidden flex flex-col"
              style={{
                background: "var(--popover)",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
              }}
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b border-border/40 shrink-0"
                style={{ background: "var(--surface-container-low)" }}
              >
                <div className="flex flex-col gap-0.5">
                  <h3
                    className="text-foreground"
                    style={{
                      fontSize: "var(--text-lg)",
                      fontWeight: "var(--font-weight-semibold)",
                    }}
                  >
                    Välj deltagare
                  </h3>
                  <span
                    className="text-muted-foreground"
                    style={{ fontSize: "var(--text-xs)" }}
                  >
                    {monthLabel} — Välj bort spelare som inte kan delta
                  </span>
                </div>
                <button
                  onClick={() => setShowSelector(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container-high transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status bar */}
              <div
                className="flex items-center justify-between px-5 py-3 border-b border-border/30 shrink-0"
                style={{ background: "var(--surface-container)" }}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span
                    className="text-muted-foreground"
                    style={{ fontSize: "var(--text-xs)" }}
                  >
                    {activeRanked.length} aktiva av {top8Bwp.length} rankade
                  </span>
                </div>
                <span
                  className={activeRanked.length >= 8 ? "text-primary" : "text-destructive"}
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                  }}
                >
                  {activeRanked.length >= 8 ? "8 spelare redo" : `Behöver ${8 - Math.min(activeRanked.length, 8)} till`}
                </span>
              </div>

              {/* Player list */}
              <div className="flex-1 overflow-y-auto px-3 py-2" style={{ minHeight: 0 }}>
                {top8Bwp.map((player) => {
                  const isExcluded = excludedNames.has(player.name);
                  // Compute the effective rank (position among active players)
                  const activeIdx = isExcluded ? -1 : activeRanked.findIndex((p) => p.name === player.name);
                  const isInTop8 = activeIdx >= 0 && activeIdx < 8;
                  // Find which QF seed slot this maps to
                  const seedLabel = isInTop8 ? `Seed ${activeIdx + 1}` : null;

                  return (
                    <motion.button
                      key={player.name}
                      layout
                      onClick={() => toggleExclude(player.name)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-button)] border transition-all duration-200 cursor-pointer mb-1 ${
                        isExcluded
                          ? "border-border/20 bg-surface-container/30 opacity-50"
                          : isInTop8
                          ? "border-primary/30 bg-primary/[0.06]"
                          : "border-border/30 bg-surface-container/40"
                      }`}
                    >
                      {/* Rank number */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          isExcluded
                            ? "bg-surface-container-high"
                            : isInTop8
                            ? "bg-primary/15"
                            : "bg-surface-container-high"
                        }`}
                      >
                        {isExcluded ? (
                          <UserMinus className="w-3.5 h-3.5 text-muted-foreground/50" />
                        ) : (
                          <span
                            className={isInTop8 ? "text-primary" : "text-muted-foreground"}
                            style={{
                              fontSize: "var(--text-xs)",
                              fontWeight: "var(--font-weight-bold)",
                            }}
                          >
                            {activeIdx + 1}
                          </span>
                        )}
                      </div>

                      {/* Player info */}
                      <div className="flex flex-col items-start gap-0 min-w-0 flex-1">
                        <span
                          className={`truncate w-full text-left ${isExcluded ? "text-muted-foreground line-through" : "text-foreground"}`}
                          style={{
                            fontSize: "var(--text-label)",
                            fontWeight: "var(--font-weight-semibold)",
                          }}
                        >
                          {player.name}
                        </span>
                        <span
                          className="text-muted-foreground"
                          style={{ fontSize: "var(--text-xs)" }}
                        >
                          <span className={player.eloDelta >= 0 ? "text-primary/70" : "text-destructive/70"}>
                            {player.eloDelta >= 0 ? "+" : ""}{player.eloDelta} Elo
                          </span>
                          {" · "}{player.gamesPlayed} rundor
                        </span>
                      </div>

                      {/* Seed badge */}
                      {seedLabel && !isExcluded && (
                        <span
                          className="px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0"
                          style={{
                            fontSize: "var(--text-xs)",
                            fontWeight: "var(--font-weight-semibold)",
                          }}
                        >
                          {seedLabel}
                        </span>
                      )}

                      {/* Toggle indicator */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                          isExcluded
                            ? "border-border/40 bg-transparent"
                            : "border-primary/40 bg-primary/15"
                        }`}
                      >
                        {!isExcluded && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Bracket preview + confirm */}
              <div
                className="shrink-0 border-t border-border/40 px-5 py-4 flex flex-col gap-3"
                style={{ background: "var(--surface-container-low)" }}
              >
                {/* QF matchup preview */}
                {canConfirmTop8 && (
                  <div className="grid grid-cols-2 gap-2">
                    {SEED_MATCHUPS.map(({ qf, s1, s2 }) => (
                      <div
                        key={qf}
                        className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-button)] bg-surface-container/60 border border-border/30"
                      >
                        <span
                          className="text-muted-foreground shrink-0"
                          style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" }}
                        >
                          {qf}
                        </span>
                        <div className="flex flex-col min-w-0 flex-1" style={{ fontSize: "var(--text-xs)" }}>
                          <span className="text-foreground truncate">
                            <span className="text-primary/60">#{s1 + 1}</span> {selectedTop8[s1]?.name}
                          </span>
                          <span className="text-foreground truncate">
                            <span className="text-primary/60">#{s2 + 1}</span> {selectedTop8[s2]?.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={confirmSelection}
                  disabled={!canConfirmTop8}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-[var(--radius-button)] bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
                  style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}
                >
                  <Check className="w-4 h-4" />
                  Bekräfta seedning
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}