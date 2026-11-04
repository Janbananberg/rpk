import { useState } from "react";
import { motion } from "motion/react";
import { ChevronRight, Target, ClipboardList, Moon, Trophy, Flame, Snowflake, TrendingDown, Columns3 } from "lucide-react";
import type { PlayerStats, SortTab } from "../../lib/stats";
import { SEED_MIN_ROUNDS, ELO_START, weightedDelta } from "../../lib/elo";
import type { EloEntry } from "../../lib/elo";
import { INACTIVE_WEEKS } from "./constants";
import { getRankIcon } from "./rank-icon";
import { EloSparkline } from "./elo-sparkline";
import { FormDots } from "./form-dots";
import { AnimatedNumber } from "./animated-number";

interface LeaderboardTableProps {
  sortedStats: PlayerStats[];
  hasFormData: boolean;
  handleHeaderSort: (key: SortTab) => void;
  sortTab: SortTab;
  isMonthView: boolean;
  SortArrow: ({ column }: { column: SortTab; }) => JSX.Element | null;
  lastPlayedMap: Record<string, number>;
  setDevSectionOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedPlayer: React.Dispatch<React.SetStateAction<PlayerStats | null>>;
  selectedPlayer: PlayerStats | null;
  eloRatings: Record<string, EloEntry>;
  monthlyEloDelta: Record<string, number> | undefined;
  monthlyRoundsPlayed: Record<string, number> | undefined;
  eloHistory: Record<string, number[]>;
  hasStreakData: boolean;
  /** Let Elo numbers tick to new values (after a saved round). */
  animateChanges?: boolean;
  /** Rows animate to new positions when this changes. */
  layoutKey?: string;
  /** Briefly highlighted row, e.g. the winner of the round just saved. */
  highlightPlayer?: string | null;
}

const SHOW_ALL_STATS_KEY = "rpk-highscore-show-all-stats";

function readShowAllStats(): boolean {
  try {
    return localStorage.getItem(SHOW_ALL_STATS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeShowAllStats(value: boolean) {
  try {
    localStorage.setItem(SHOW_ALL_STATS_KEY, value ? "1" : "0");
  } catch {
    // Storage can be blocked (private mode); the toggle still works for this visit.
  }
}

export function LeaderboardTable({
  sortedStats,
  hasFormData,
  handleHeaderSort,
  sortTab,
  isMonthView,
  SortArrow,
  lastPlayedMap,
  setDevSectionOpen,
  setSelectedPlayer,
  selectedPlayer,
  eloRatings,
  monthlyEloDelta,
  monthlyRoundsPlayed,
  eloHistory,
  hasStreakData,
  animateChanges = false,
  layoutKey = "idle",
  highlightPlayer = null,
}: LeaderboardTableProps) {
  // Default view: placering, spelare, Elo (+Δ), form, vinster. The rest behind "Visa all statistik".
  const [showAllStats, setShowAllStats] = useState(readShowAllStats);
  const toggleShowAllStats = () => {
    setShowAllStats((prev) => {
      writeShowAllStats(!prev);
      return !prev;
    });
  };
  const gridColumns = (showAllStats
    ? ["36px", "1fr", "96px", "64px", hasFormData ? "90px" : "", "64px", "64px", "64px", "64px", "80px"]
    : ["36px", "1fr", "104px", hasFormData ? "90px" : "", "72px"]
  ).filter(Boolean).join(" ");

  // Elo with its change: the month's weighted Δ (what the month view ranks on), otherwise the last round's Δ.
  const renderEloCell = (s: PlayerStats, compact: boolean, muted = false) => {
    const elo = eloRatings[s.name]?.elo ?? ELO_START;
    let delta: number | null = null;
    let deltaDecimals = 0;
    let deltaTitle: string | undefined;
    if (isMonthView && monthlyEloDelta) {
      const d = monthlyEloDelta[s.name] ?? 0;
      const rounds = monthlyRoundsPlayed?.[s.name] ?? 0;
      if (rounds > 0) {
        delta = weightedDelta(d, rounds);
        deltaDecimals = 1;
        deltaTitle = `Viktat Elo-delta denna månad: Δ ${d > 0 ? "+" : ""}${d} / √${rounds}`;
      }
    } else {
      const d = eloRatings[s.name]?.delta ?? 0;
      if (d !== 0) {
        delta = d;
        deltaTitle = "Elo-förändring i senaste rundan";
      }
    }
    const deltaColor = muted || delta === null || delta === 0
      ? "var(--muted-foreground)"
      : delta > 0 ? "var(--success)" : "var(--destructive)";
    return (
      <span className="flex items-baseline justify-end gap-1.5 tabular-nums shrink-0">
        <span
          style={{
            fontSize: compact ? "var(--text-label)" : "var(--text-base)",
            fontWeight: "var(--font-weight-semibold)",
            color: muted ? "var(--muted-foreground)" : "var(--foreground)",
          }}
        >
          <AnimatedNumber value={elo} animateChanges={animateChanges} />
        </span>
        {delta !== null && (
          <span
            style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: deltaColor }}
            title={deltaTitle}
          >
            <AnimatedNumber value={delta} decimals={deltaDecimals} signed animateChanges={animateChanges} />
          </span>
        )}
      </span>
    );
  };

  // Row wrapper: slides to its new place when layoutKey changes, and can flash a highlight.
  const rowMotion = (name: string) => ({
    layout: "position" as const,
    layoutDependency: layoutKey,
    transition: { layout: { duration: 0.6, ease: "easeInOut" as const } },
    style: {
      background: highlightPlayer === name ? "color-mix(in srgb, var(--primary) 14%, transparent)" : "transparent",
      transition: "background-color 0.6s ease",
    },
  });

  const renderSparkline = (s: PlayerStats, width: number, height: number, strokeWidth?: number) =>
    eloHistory[s.name] && eloHistory[s.name].length >= 2 ? (
      <EloSparkline data={eloHistory[s.name]} width={width} height={height} strokeWidth={strokeWidth} />
    ) : (
      <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>—</span>
    );

  return (
    <div style={{ order: 2 }}>
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={toggleShowAllStats}
          aria-pressed={showAllStats}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer hover:text-foreground"
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-semibold)",
            color: showAllStats ? "var(--primary)" : "var(--muted-foreground)",
            borderColor: showAllStats ? "color-mix(in srgb, var(--primary) 40%, var(--border))" : "var(--border)",
            background: showAllStats ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
            borderRadius: "var(--radius-button)",
          }}
        >
          <Columns3 className="w-3.5 h-3.5" aria-hidden />
          {showAllStats ? "Visa mindre" : "Visa all statistik"}
        </button>
      </div>
      <div
        className="rounded-lg border border-border overflow-hidden"
        style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)" }}
      >
          {/* Mobile card layout + Desktop table */}
          {sortedStats.length === 0 ? (
            <div
              className="px-4 py-8 text-center text-muted-foreground"
              style={{ fontSize: "var(--text-base)" }}
            >
              Inga spelare registrerade ännu
            </div>
          ) : (
            <>
              {/* Desktop table header */}
              <div
                className="hidden md:grid px-4 py-3 border-b border-border items-center"
                style={{
                  gridTemplateColumns: gridColumns,
                  columnGap: 8,
                  background: "var(--surface-container-high)",
                }}
              >
                {/* # */}
                <span
                  className="text-muted-foreground"
                  style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.05em", textTransform: "uppercase" as const }}
                >
                  #
                </span>
                {/* Spelare */}
                <span
                  className="text-muted-foreground"
                  style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.05em", textTransform: "uppercase" as const }}
                >
                  Spelare
                </span>
                {/* Elo header */}
                <button
                  onClick={() => handleHeaderSort("elo")}
                  className="text-right flex items-center justify-end gap-0.5 cursor-pointer hover:text-foreground transition-colors"
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase" as const,
                    color: sortTab === "elo" ? "var(--primary)" : "var(--muted-foreground)",
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                >
                  {isMonthView ? "Elo Δ" : "Elo"}<SortArrow column="elo" />
                </button>
                {/* Trend (sparkline, not sortable) */}
                {showAllStats && (
                  <span
                    className="text-muted-foreground text-center"
                    style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.05em", textTransform: "uppercase" as const }}
                  >
                    Trend
                  </span>
                )}
                {/* Form (not sortable) */}
                {hasFormData && (
                  <span
                    className="text-muted-foreground text-center"
                    style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.05em", textTransform: "uppercase" as const }}
                  >
                    Form
                  </span>
                )}
                {/* Vinster */}
                <button
                  onClick={() => handleHeaderSort("vinster")}
                  className="text-right flex items-center justify-end gap-0.5 cursor-pointer hover:text-foreground transition-colors"
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase" as const,
                    color: sortTab === "vinster" ? "var(--primary)" : "var(--muted-foreground)",
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                >
                  Vinster<SortArrow column="vinster" />
                </button>
                {showAllStats && (<>
                {/* Finaler */}
                <button
                  onClick={() => handleHeaderSort("finaler")}
                  className="text-right flex items-center justify-end gap-0.5 cursor-pointer hover:text-foreground transition-colors"
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase" as const,
                    color: sortTab === "finaler" ? "var(--primary)" : "var(--muted-foreground)",
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                >
                  Finaler<SortArrow column="finaler" />
                </button>
                {/* Vinst% */}
                <button
                  onClick={() => handleHeaderSort("bwp")}
                  className="text-right flex items-center justify-end gap-0.5 cursor-pointer hover:text-foreground transition-colors"
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase" as const,
                    color: sortTab === "bwp" ? "var(--primary)" : "var(--muted-foreground)",
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                >
                  Vinst%<SortArrow column="bwp" />
                </button>
                {/* Final% */}
                <button
                  onClick={() => handleHeaderSort("finalprocent")}
                  className="text-right flex items-center justify-end gap-0.5 cursor-pointer hover:text-foreground transition-colors"
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase" as const,
                    color: sortTab === "finalprocent" ? "var(--primary)" : "var(--muted-foreground)",
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                >
                  Final%<SortArrow column="finalprocent" />
                </button>
                {/* Finalvinst% */}
                <button
                  onClick={() => handleHeaderSort("vf")}
                  className="text-right flex items-center justify-end gap-0.5 cursor-pointer hover:text-foreground transition-colors"
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase" as const,
                    color: sortTab === "vf" ? "var(--primary)" : "var(--muted-foreground)",
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                >
                  Finalvinst%<SortArrow column="vf" />
                </button>
                </>)}
                {/* Kort & Streak visas nu efter spelarnamnet */}
              </div>

              {/* Rows — split into seeded, unseeded, and inactive (no play in 4 weeks) */}
              {(() => {
                const inactiveCutoff = Date.now() - INACTIVE_WEEKS * 7 * 24 * 60 * 60 * 1000;

                const isInactive = (s: PlayerStats) => {
                  const lp = lastPlayedMap[s.name];
                  return !lp || lp < inactiveCutoff;
                };

                const active = sortedStats.filter((s) => !isInactive(s));
                const inactive = sortedStats.filter((s) => isInactive(s));
                const seeded = active.filter((s) => s.gamesPlayed >= SEED_MIN_ROUNDS);
                const unseeded = active.filter((s) => s.gamesPlayed < SEED_MIN_ROUNDS);

                const renderRow = (s: PlayerStats, rank: number, isSeeded: boolean) => (
                  <motion.div key={s.name} {...rowMotion(s.name)}>
                    {/* Desktop row */}
                    <div
                      className="hidden md:grid px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer items-center"
                      style={{
                        gridTemplateColumns: gridColumns,
                        columnGap: 8,
                      }}
                      onClick={() => { setDevSectionOpen(false); setSelectedPlayer(selectedPlayer?.name === s.name ? null : s); }}
                    >
                      <div className="flex items-center">{isSeeded ? getRankIcon(rank) : <span className="text-muted-foreground" style={{ fontSize: "var(--text-label)" }}>—</span>}</div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`truncate ${isSeeded && rank <= 3 ? "text-primary" : "text-foreground"}`}
                          style={{
                            fontSize: "var(--text-base)",
                            fontWeight:
                              isSeeded && rank <= 3
                                ? "var(--font-weight-semibold)"
                                : "var(--font-weight-normal)",
                          }}
                        >
                          {s.name}
                        </span>
                        {/* Seed progress badge for unseeded players */}
                        {!isSeeded && (
                          <span
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shrink-0"
                            style={{
                              fontSize: "var(--text-xs)",
                              fontWeight: "var(--font-weight-semibold)",
                              background: "color-mix(in srgb, var(--muted-foreground) 12%, transparent)",
                              color: "var(--muted-foreground)",
                            }}
                          >
                            {s.gamesPlayed}/{SEED_MIN_ROUNDS}
                          </span>
                        )}
                        {/* Trophy inline */}
                        {s.tournamentWins > 0 && (
                          <span
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shrink-0"
                            style={{
                              fontSize: "var(--text-xs)",
                              fontWeight: "var(--font-weight-bold)",
                              background: "color-mix(in srgb, var(--primary) 15%, transparent)",
                              color: "var(--primary)",
                            }}
                          >
                            <Trophy className="w-3 h-3" aria-hidden />{s.tournamentWins}
                          </span>
                        )}
                        {/* Cards inline */}
                        {(s.yellowCards > 0 || s.redCards > 0) && (
                          <div className="flex items-center gap-1 shrink-0">
                            {s.yellowCards > 0 && (
                              <span
                                className="flex items-center gap-0.5 px-1 py-0.5 rounded"
                                style={{
                                  fontSize: "var(--text-xs)",
                                  fontWeight: "var(--font-weight-semibold)",
                                  background: "var(--warning)",
                                  color: "var(--warning-foreground)",
                                  borderRadius: "3px",
                                  minWidth: 16,
                                  textAlign: "center" as const,
                                }}
                              >
                                {s.yellowCards}
                              </span>
                            )}
                            {s.redCards > 0 && (
                              <span
                                className="flex items-center gap-0.5 px-1 py-0.5 rounded"
                                style={{
                                  fontSize: "var(--text-xs)",
                                  fontWeight: "var(--font-weight-semibold)",
                                  background: "var(--destructive)",
                                  color: "var(--destructive-foreground)",
                                  borderRadius: "3px",
                                  minWidth: 16,
                                  textAlign: "center" as const,
                                }}
                              >
                                {s.redCards}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Streak inline */}
                        {s.currentStreak >= 2 && (
                          <span
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shrink-0"
                            style={{
                              fontSize: "var(--text-xs)",
                              fontWeight: "var(--font-weight-semibold)",
                              background: "var(--warning)",
                              color: "var(--warning-foreground)",
                            }}
                          >
                            <Flame className="w-3 h-3" aria-hidden />{s.currentStreak}
                          </span>
                        )}
                        {s.coldStreak >= 2 && (
                          <span
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shrink-0"
                            style={{
                              fontSize: "var(--text-xs)",
                              fontWeight: "var(--font-weight-semibold)",
                              background: "var(--info)",
                              color: "var(--info-foreground)",
                            }}
                          >
                            <Snowflake className="w-3 h-3" aria-hidden />{s.coldStreak}
                          </span>
                        )}
                      </div>
                      {/* Elo + Δ column */}
                      <div className="flex items-center justify-end">
                        {renderEloCell(s, false)}
                      </div>
                      {/* Trend (sparkline) column */}
                      {showAllStats && (
                        <div className="flex items-center justify-center">
                          {renderSparkline(s, 56, 20)}
                        </div>
                      )}
                      {hasFormData && (
                        <div className="flex items-center justify-center">
                          <FormDots form={s.recentForm} />
                        </div>
                      )}
                      <span
                        className="text-foreground text-right flex items-center justify-end"
                        style={{ fontSize: "var(--text-base)" }}
                      >
                        {s.wins}
                      </span>
                      {showAllStats && (<>
                      <span
                        className="text-muted-foreground text-right flex items-center justify-end"
                        style={{ fontSize: "var(--text-base)" }}
                      >
                        {s.finals}
                      </span>
                      <span
                        className="text-primary text-right flex items-center justify-end"
                        style={{ fontSize: "var(--text-label)" }}
                      >
                        {s.bwp.toFixed(1)}%
                      </span>
                      <span
                        className="text-muted-foreground text-right flex items-center justify-end"
                        style={{ fontSize: "var(--text-label)" }}
                      >
                        {s.finalPct.toFixed(1)}%
                      </span>
                      <span
                        className="text-primary text-right flex items-center justify-end"
                        style={{ fontSize: "var(--text-label)" }}
                      >
                        {s.vfPct.toFixed(1)}%
                      </span>
                      </>)}
                      {/* Kort & Streak visas nu inline efter spelarnamnet */}
                    </div>

                    {/* Mobile card */}
                    <div
                      className="md:hidden px-3 py-2.5 border-b border-border last:border-b-0 cursor-pointer active:bg-muted/20 transition-colors"
                      onClick={() => { setDevSectionOpen(false); setSelectedPlayer(selectedPlayer?.name === s.name ? null : s); }}
                    >
                      {/* Row 1: rank + name + elo (+Δ) + chevron */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 text-center shrink-0">{isSeeded ? getRankIcon(rank) : <span className="text-muted-foreground" style={{ fontSize: "var(--text-label)" }}>—</span>}</div>
                        <span
                          className={`flex-1 min-w-0 truncate ${isSeeded && rank <= 3 ? "text-primary" : "text-foreground"}`}
                          style={{
                            fontSize: "var(--text-base)",
                            fontWeight: isSeeded && rank <= 3 ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                          }}
                        >
                          {s.name}
                        </span>
                        {renderEloCell(s, true)}
                        {!isSeeded && (
                          <span
                            className="px-1 py-0.5 rounded-full shrink-0"
                            style={{ fontSize: 10, fontWeight: "var(--font-weight-semibold)", background: "color-mix(in srgb, var(--muted-foreground) 12%, transparent)", color: "var(--muted-foreground)" }}
                          >
                            {s.gamesPlayed}/{SEED_MIN_ROUNDS}
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      </div>
                      {/* Row 2: badges + compact stats + form */}
                      <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 mt-1 ml-8">
                        {s.tournamentWins > 0 && (
                          <span
                            className="flex items-center gap-0.5 px-1 py-0.5 rounded-full shrink-0"
                            style={{ fontSize: 10, fontWeight: "var(--font-weight-bold)", background: "color-mix(in srgb, var(--primary) 15%, transparent)", color: "var(--primary)" }}
                          >
                            <Trophy className="w-2.5 h-2.5" aria-hidden />{s.tournamentWins}
                          </span>
                        )}
                        {hasStreakData && s.currentStreak >= 2 && (
                          <span
                            className="flex items-center gap-0.5 px-1 py-0.5 rounded-full shrink-0"
                            style={{ fontSize: 10, fontWeight: "var(--font-weight-semibold)", background: "var(--warning)", color: "var(--warning-foreground)" }}
                          >
                            <Flame className="w-2.5 h-2.5" aria-hidden />{s.currentStreak}
                          </span>
                        )}
                        {hasStreakData && s.coldStreak >= 2 && (
                          <span
                            className="flex items-center gap-0.5 px-1 py-0.5 rounded-full shrink-0"
                            style={{ fontSize: 10, fontWeight: "var(--font-weight-semibold)", background: "var(--info)", color: "var(--info-foreground)" }}
                          >
                            <Snowflake className="w-2.5 h-2.5" aria-hidden />{s.coldStreak}
                          </span>
                        )}
                        {s.yellowCards > 0 && (
                          <span className="px-1 py-0.5 rounded shrink-0" style={{ fontSize: 10, fontWeight: "var(--font-weight-semibold)", background: "var(--warning)", color: "var(--warning-foreground)", borderRadius: "3px" }}>
                            {s.yellowCards}
                          </span>
                        )}
                        {s.redCards > 0 && (
                          <span className="px-1 py-0.5 rounded shrink-0" style={{ fontSize: 10, fontWeight: "var(--font-weight-semibold)", background: "var(--destructive)", color: "var(--destructive-foreground)", borderRadius: "3px" }}>
                            {s.redCards}
                          </span>
                        )}
                        {showAllStats ? (<>
                        <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                          {s.wins}V {s.finals}F {s.gamesPlayed}S
                        </span>
                        <span className="text-border" style={{ fontSize: 10 }}>·</span>
                        <span className="text-primary shrink-0" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" }}>
                          {s.bwp.toFixed(0)}%
                        </span>
                        <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--text-xs)" }}>
                          F {s.finalPct.toFixed(0)}%
                        </span>
                        <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--text-xs)" }}>
                          FV {s.vfPct.toFixed(0)}%
                        </span>
                        <span className="shrink-0">{renderSparkline(s, 36, 14, 1)}</span>
                        </>) : (
                        <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                          {s.wins} {s.wins === 1 ? "vinst" : "vinster"}
                        </span>
                        )}
                        {hasFormData && (
                          <div className="ml-auto shrink-0">
                            <FormDots form={s.recentForm} />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );

                return (
                  <>
                    {/* ── Seeded section ── */}
                    {seeded.length > 0 && (
                      <div
                        className="flex items-center gap-2 px-4 py-2 border-b border-border"
                        style={{
                          background: "color-mix(in srgb, var(--success) 6%, var(--surface-container))",
                        }}
                      >
                        <Target className="w-3.5 h-3.5" style={{ color: "var(--success)" }} aria-hidden />
                        <span style={{
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--font-weight-bold)",
                          color: "var(--success)",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase" as const,
                        }}>
                          Seedade
                        </span>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                          ({seeded.length} spelare · {SEED_MIN_ROUNDS}+ rundor)
                        </span>
                      </div>
                    )}
                    {seeded.map((s, i) => renderRow(s, i + 1, true))}

                    {/* ── Unseeded section ── */}
                    {unseeded.length > 0 && (
                      <div
                        className="flex items-center gap-2 px-4 py-2 border-b border-border"
                        style={{
                          background: "color-mix(in srgb, var(--muted-foreground) 6%, var(--surface-container))",
                          marginTop: seeded.length > 0 ? 2 : 0,
                        }}
                      >
                        <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
                        <span style={{
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--font-weight-bold)",
                          color: "var(--muted-foreground)",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase" as const,
                        }}>
                          Ej seedade
                        </span>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                          ({unseeded.length} spelare · &lt;{SEED_MIN_ROUNDS} rundor)
                        </span>
                      </div>
                    )}
                    {unseeded.map((s, i) => renderRow(s, i + 1, false))}

                    {/* ── Inactive section ── */}
                    {inactive.length > 0 && (
                      <div
                        className="flex items-center gap-2 px-4 py-2 border-b border-border"
                        style={{
                          background: "color-mix(in srgb, var(--muted-foreground) 4%, var(--surface-container))",
                          marginTop: (seeded.length > 0 || unseeded.length > 0) ? 2 : 0,
                        }}
                      >
                        <Moon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
                        <span style={{
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--font-weight-bold)",
                          color: "var(--muted-foreground)",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase" as const,
                        }}>
                          Inaktiva
                        </span>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                          ({inactive.length} spelare · ej spelat på {INACTIVE_WEEKS}+ veckor)
                        </span>
                      </div>
                    )}
                    {inactive.map((s) => {
                      const weeksAgo = lastPlayedMap[s.name]
                        ? Math.floor((Date.now() - lastPlayedMap[s.name]) / (7 * 24 * 60 * 60 * 1000))
                        : null;
                      return (
                        <motion.div key={s.name} {...rowMotion(s.name)}>
                          {/* Desktop row — inactive */}
                          <div
                            className="hidden md:grid px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer items-center opacity-50"
                            style={{
                              gridTemplateColumns: gridColumns,
                              columnGap: 8,
                            }}
                            onClick={() => { setDevSectionOpen(false); setSelectedPlayer(selectedPlayer?.name === s.name ? null : s); }}
                          >
                            <div className="flex items-center"><span className="text-muted-foreground" style={{ fontSize: "var(--text-label)" }}>—</span></div>
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="truncate text-muted-foreground"
                                style={{
                                  fontSize: "var(--text-base)",
                                  fontWeight: "var(--font-weight-normal)",
                                }}
                              >
                                {s.name}
                              </span>
                              <span
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shrink-0"
                                style={{
                                  fontSize: "var(--text-xs)",
                                  fontWeight: "var(--font-weight-semibold)",
                                  background: "color-mix(in srgb, var(--muted-foreground) 12%, transparent)",
                                  color: "var(--muted-foreground)",
                                }}
                              >
                                <Moon className="w-3 h-3" aria-hidden />{weeksAgo != null ? `${weeksAgo}v sedan` : "aldrig"}
                              </span>
                            </div>
                            {/* Elo column — inactive players lose Elo over time, hence the falling icon */}
                            <div className="flex items-center justify-end gap-1" title="Elo sjunker när man inte spelar">
                              <TrendingDown className="w-3 h-3 shrink-0" style={{ color: "var(--destructive)" }} aria-hidden />
                              {renderEloCell(s, false, true)}
                            </div>
                            {showAllStats && (
                              <div className="flex items-center justify-center">
                                {renderSparkline(s, 56, 20)}
                              </div>
                            )}
                            {hasFormData && <div />}
                            <span className="text-muted-foreground text-right flex items-center justify-end" style={{ fontSize: "var(--text-base)" }}>{s.wins}</span>
                            {showAllStats && (<>
                            <span className="text-muted-foreground text-right flex items-center justify-end" style={{ fontSize: "var(--text-base)" }}>{s.finals}</span>
                            <span className="text-muted-foreground text-right flex items-center justify-end" style={{ fontSize: "var(--text-label)" }}>{s.bwp.toFixed(1)}%</span>
                            <span className="text-muted-foreground text-right flex items-center justify-end" style={{ fontSize: "var(--text-label)" }}>{s.finalPct.toFixed(1)}%</span>
                            <span className="text-muted-foreground text-right flex items-center justify-end" style={{ fontSize: "var(--text-label)" }}>{s.vfPct.toFixed(1)}%</span>
                            </>)}
                          </div>

                          {/* Mobile card — inactive */}
                          <div
                            className="md:hidden px-3 py-2.5 border-b border-border last:border-b-0 cursor-pointer active:bg-muted/20 transition-colors opacity-50"
                            onClick={() => { setDevSectionOpen(false); setSelectedPlayer(selectedPlayer?.name === s.name ? null : s); }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 text-center shrink-0"><span className="text-muted-foreground" style={{ fontSize: "var(--text-label)" }}>—</span></div>
                              <span
                                className="flex-1 truncate text-muted-foreground"
                                style={{
                                  fontSize: "var(--text-base)",
                                  fontWeight: "var(--font-weight-normal)",
                                }}
                              >
                                {s.name}
                              </span>
                              <span
                                className="px-1 py-0.5 rounded-full shrink-0"
                                style={{ fontSize: 10, fontWeight: "var(--font-weight-semibold)", background: "color-mix(in srgb, var(--muted-foreground) 12%, transparent)", color: "var(--muted-foreground)" }}
                              >
                                <Moon className="w-2.5 h-2.5 inline align-[-1px] mr-0.5" aria-hidden />{weeksAgo != null ? `${weeksAgo}v` : "—"}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            </div>
                            <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 mt-1 ml-8">
                              {showAllStats ? (<>
                              <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                                {s.wins}V {s.finals}F {s.gamesPlayed}S
                              </span>
                              <span className="text-border" style={{ fontSize: 10 }}>·</span>
                              <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--text-xs)" }}>
                                {s.bwp.toFixed(0)}%
                              </span>
                              </>) : (
                              <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                                {s.wins} {s.wins === 1 ? "vinst" : "vinster"}
                              </span>
                              )}
                              <span className="text-border" style={{ fontSize: 10 }}>·</span>
                              <span className="shrink-0" style={{ fontSize: "var(--text-xs)", color: "var(--destructive)" }}>
                                <TrendingDown className="w-3 h-3 inline align-[-2px] mr-0.5" aria-hidden />{eloRatings[s.name]?.elo ?? ELO_START}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </>
                );
              })()}
            </>
          )}
      </div>
    </div>
  );
}
