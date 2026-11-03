import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, X, Pencil, ChevronDown, TrendingUp, Flame, Trophy, CalendarDays, Coffee, Sun, Users, UserMinus, Clock, Shield, Target } from "lucide-react";
import { ELO_START, SEED_MIN_ROUNDS, weightedDelta } from "../../lib/elo";
import type { EloEntry } from "../../lib/elo";
import { formatMonthLabel } from "../../lib/dates";
import { computePlayerPercentile, getCSGORank } from "../../lib/rank";
import { computePlayerAchievements, ALL_ACHIEVEMENTS, MYTHIC_COMPLETIONIST } from "../../lib/achievements";
import type { PlayerStats } from "../../lib/stats";
import type { PlayerInsights, RevengeTarget } from "../../lib/insights";
import { AchievementDisplay } from "../achievement-display";
import type { GameSession, SavedPlayerAchievements } from "../api";
import { FONT } from "./constants";
import { FormDots } from "./form-dots";
import { EloSparkline } from "./elo-sparkline";

interface PlayerProfileModalProps {
  selectedPlayer: PlayerStats | null;
  setSelectedPlayer: React.Dispatch<React.SetStateAction<PlayerStats | null>>;
  isMobile: boolean;
  setRenamingPlayer: React.Dispatch<React.SetStateAction<boolean>>;
  renamingPlayer: boolean;
  renameValue: string;
  setRenameValue: React.Dispatch<React.SetStateAction<string>>;
  handleRenamePlayer: (oldName: string, newName: string) => Promise<void>;
  isViewingCurrentMonth: boolean;
  eloRatings: Record<string, EloEntry>;
  isMonthView: boolean;
  monthlyEloDelta: Record<string, number> | undefined;
  hasFormData: true;
  hasStreakData: true;
  prevPlayerStats: PlayerStats | null;
  sessionAttendance: Record<string, { attended: number; total: number; rate: number; }>;
  selectedMonth: string;
  setDevSectionOpen: React.Dispatch<React.SetStateAction<boolean>>;
  devSectionOpen: boolean;
  stats: PlayerStats[];
  monthlyRoundsPlayed: Record<string, number> | undefined;
  eloHistory: Record<string, number[]>;
  handleRemoveCard: (name: string, type: "yellow" | "red") => Promise<void>;
  handleGiveCard: (name: string, type: "yellow" | "red") => Promise<void>;
  playerInsights: PlayerInsights | null;
  revengeData: RevengeTarget[];
  h2hElo: Record<string, Record<string, number>>;
  allSessions: GameSession[];
  savedAchievements: SavedPlayerAchievements;
  achievementOwnerCounts: Record<string, number>;
  showLockedAchievements: boolean;
  setShowLockedAchievements: React.Dispatch<React.SetStateAction<boolean>>;
  confirmRemovePlayer: string | null;
  handleRemovePlayer: (name: string) => Promise<void>;
  setConfirmRemovePlayer: React.Dispatch<React.SetStateAction<string | null>>;
}

export function PlayerProfileModal({
  selectedPlayer,
  setSelectedPlayer,
  isMobile,
  setRenamingPlayer,
  renamingPlayer,
  renameValue,
  setRenameValue,
  handleRenamePlayer,
  isViewingCurrentMonth,
  eloRatings,
  isMonthView,
  monthlyEloDelta,
  hasFormData,
  hasStreakData,
  prevPlayerStats,
  sessionAttendance,
  selectedMonth,
  setDevSectionOpen,
  devSectionOpen,
  stats,
  monthlyRoundsPlayed,
  eloHistory,
  handleRemoveCard,
  handleGiveCard,
  playerInsights,
  revengeData,
  h2hElo,
  allSessions,
  savedAchievements,
  achievementOwnerCounts,
  showLockedAchievements,
  setShowLockedAchievements,
  confirmRemovePlayer,
  handleRemovePlayer,
  setConfirmRemovePlayer,
}: PlayerProfileModalProps) {
  return (
    <>
      <AnimatePresence>
        {selectedPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-stretch md:items-center justify-center"
            onClick={() => setSelectedPlayer(null)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md hidden md:block" />
            <div className="absolute inset-0 md:hidden" style={{ background: "var(--surface-container)" }} />
            <motion.div
              initial={isMobile ? { y: "100%", opacity: 0.5 } : { scale: 0.95, opacity: 0 }}
              animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
              exit={isMobile ? { y: "100%", opacity: 0.5 } : { scale: 0.95, opacity: 0 }}
              transition={isMobile ? { type: "spring", damping: 28, stiffness: 300 } : { duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full h-full md:h-auto md:max-w-2xl md:mx-6 md:rounded-2xl md:border border-border overflow-hidden md:max-h-[85vh] overflow-y-auto overscroll-contain"
              style={{ background: "var(--surface-container)", boxShadow: "var(--elevation-sm)", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
            >
              {/* Header */}
              <div
                className="sticky top-0 z-10 px-4 md:px-6 pt-4 md:pt-5 pb-3 border-b border-border"
                style={{ background: "var(--surface-container-high)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Mobile back arrow */}
                  <button
                    onClick={() => { setSelectedPlayer(null); setRenamingPlayer(false); }}
                    className="md:hidden p-2 -ml-2 rounded-lg hover:bg-muted/30 text-foreground cursor-pointer shrink-0"
                    style={{ borderRadius: "var(--radius-card)" }}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    {renamingPlayer ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenamePlayer(selectedPlayer.name, renameValue);
                            if (e.key === "Escape") setRenamingPlayer(false);
                          }}
                          className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-border bg-surface-container-lowest text-foreground outline-none focus:border-primary"
                          style={{
                            fontFamily: FONT,
                            fontSize: "var(--text-base)",
                            background: "var(--surface-container-lowest)",
                            borderRadius: "var(--radius-card)",
                          }}
                        />
                        <button
                          onClick={() => handleRenamePlayer(selectedPlayer.name, renameValue)}
                          className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
                          style={{ borderRadius: "var(--radius-card)" }}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRenamingPlayer(false)}
                          className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground cursor-pointer"
                          style={{ borderRadius: "var(--radius-card)" }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3
                          className="text-foreground truncate"
                          style={{
                            fontFamily: FONT,
                            fontSize: "var(--text-h4)",
                            fontWeight: "var(--font-weight-semibold)",
                          }}
                        >
                          {selectedPlayer.name}
                        </h3>
                        {isViewingCurrentMonth && (
                          <button
                            onClick={() => {
                              setRenameValue(selectedPlayer.name);
                              setRenamingPlayer(true);
                            }}
                            className="p-1 rounded-md hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                            style={{ borderRadius: "var(--radius-card)" }}
                            title="Byt smeknamn"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                    {!renamingPlayer && (
                      <div className="flex items-center gap-2 mt-1">
                        {/* Elo badge — always shows absolute Elo */}
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                          style={{
                            fontFamily: FONT,
                            fontSize: "var(--text-xs)",
                            fontWeight: "var(--font-weight-bold)",
                            background: "color-mix(in srgb, var(--primary) 15%, transparent)",
                            color: "var(--primary)",
                          }}
                        >
                          Elo {eloRatings[selectedPlayer.name]?.elo ?? ELO_START}
                        </span>
                        {/* Monthly Elo delta badge — only when viewing a specific month */}
                        {isMonthView && monthlyEloDelta && (() => {
                          const d = monthlyEloDelta[selectedPlayer.name] ?? 0;
                          return (
                            <span
                              className="flex items-center gap-0.5 px-2 py-0.5 rounded-full"
                              style={{
                                fontFamily: FONT,
                                fontSize: "var(--text-xs)",
                                fontWeight: "var(--font-weight-bold)",
                                background: d > 0
                                  ? "color-mix(in srgb, var(--success) 15%, transparent)"
                                  : d < 0
                                    ? "color-mix(in srgb, var(--destructive) 15%, transparent)"
                                    : "color-mix(in srgb, var(--muted-foreground) 12%, transparent)",
                                color: d > 0 ? "var(--success)" : d < 0 ? "var(--destructive)" : "var(--muted-foreground)",
                              }}
                            >
                              Δ {d > 0 ? "+" : ""}{d}
                            </span>
                          );
                        })()}
                        {hasFormData && <FormDots form={selectedPlayer.recentForm} />}
                        {hasStreakData && selectedPlayer.currentStreak >= 2 && (
                          <span
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                            style={{
                              fontSize: "var(--text-xs)",
                              fontWeight: "var(--font-weight-semibold)",
                              background: "var(--warning)",
                              color: "var(--warning-foreground)",
                            }}
                          >
                            🔥 {selectedPlayer.currentStreak} streak
                          </span>
                        )}
                        {hasStreakData && selectedPlayer.coldStreak >= 2 && (
                          <span
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                            style={{
                              fontSize: "var(--text-xs)",
                              fontWeight: "var(--font-weight-semibold)",
                              background: "var(--info)",
                              color: "var(--info-foreground)",
                            }}
                          >
                            🥶 {selectedPlayer.coldStreak} streak
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setSelectedPlayer(null); setRenamingPlayer(false); }}
                    className="hidden md:flex p-2 rounded-lg hover:bg-muted/30 text-muted-foreground cursor-pointer shrink-0 items-center justify-center"
                    style={{ borderRadius: "var(--radius-card)" }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 md:p-6 space-y-5">
                {/* Stats grid — count + integrated percentage per card + delta from prev month */}
                {(() => {
                  const hasData = selectedPlayer.gamesPlayed > 0;
                  const prev = prevPlayerStats;
                  const cards = [
                    {
                      label: "Vinster",
                      value: selectedPlayer.wins,
                      color: "var(--success)",
                      pctLabel: "Vinst%",
                      pct: selectedPlayer.bwp,
                      den: selectedPlayer.gamesPlayed,
                      fraction: `${selectedPlayer.wins} / ${selectedPlayer.gamesPlayed}`,
                      delta: prev ? selectedPlayer.wins - prev.wins : null,
                      pctDelta: prev ? selectedPlayer.bwp - prev.bwp : null,
                    },
                    {
                      label: "Finaler",
                      value: selectedPlayer.finals,
                      color: "var(--primary)",
                      pctLabel: "Finalvinst%",
                      pct: selectedPlayer.vfPct,
                      den: selectedPlayer.finals,
                      fraction: `${selectedPlayer.wins} / ${selectedPlayer.finals}`,
                      delta: prev ? selectedPlayer.finals - prev.finals : null,
                      pctDelta: prev ? selectedPlayer.vfPct - prev.vfPct : null,
                    },
                    {
                      label: "Spelade",
                      value: selectedPlayer.gamesPlayed,
                      color: "var(--warning)",
                      pctLabel: "Final%",
                      pct: selectedPlayer.finalPct,
                      den: selectedPlayer.gamesPlayed,
                      fraction: `${selectedPlayer.finals} / ${selectedPlayer.gamesPlayed}`,
                      delta: prev ? selectedPlayer.gamesPlayed - prev.gamesPlayed : null,
                      pctDelta: prev ? selectedPlayer.finalPct - prev.finalPct : null,
                    },
                  ];
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      {cards.map(({ label, value, color, pctLabel, pct, den, fraction, delta, pctDelta }) => (
                        <div
                          key={label}
                          className="p-3 rounded-lg border border-border flex flex-col"
                          style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                        >
                          {/* Count + delta badge */}
                          <div className="flex items-center justify-center gap-1">
                            <div
                              style={{
                                fontFamily: FONT,
                                fontSize: "var(--text-h4)",
                                fontWeight: "var(--font-weight-semibold)",
                                color,
                                lineHeight: 1.1,
                              }}
                            >
                              {value}
                            </div>
                            {delta !== null && delta !== 0 && (
                              <span
                                style={{
                                  fontFamily: FONT,
                                  fontSize: "var(--text-xs)",
                                  fontWeight: "var(--font-weight-semibold)",
                                  color: delta > 0 ? "var(--success)" : "var(--destructive)",
                                  lineHeight: 1,
                                  opacity: 0.9,
                                }}
                              >
                                {delta > 0 ? `+${delta}` : delta}
                              </span>
                            )}
                          </div>
                          <div
                            className="text-center text-muted-foreground"
                            style={{ fontFamily: FONT, fontSize: "var(--text-xs)", marginBottom: hasData ? "8px" : 0 }}
                          >
                            {label}
                          </div>

                          {/* Integrated percentage (only when data exists) */}
                          {hasData && den > 0 && (
                            <div className="mt-auto">
                              {/* Progress bar */}
                              <div
                                className="h-1 rounded-full overflow-hidden mb-1.5"
                                style={{ background: "var(--border)" }}
                              >
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, pct)}%` }}
                                  transition={{ duration: 0.6, ease: "easeOut" }}
                                  className="h-full rounded-full"
                                  style={{ background: color, opacity: 0.8 }}
                                />
                              </div>
                              {/* Percentage + fraction + pct delta */}
                              <div className="flex items-baseline justify-between">
                                <span className="flex items-baseline gap-0.5">
                                  <span
                                    style={{
                                      fontFamily: FONT,
                                      fontSize: "var(--text-sm)",
                                      fontWeight: "var(--font-weight-bold)",
                                      color,
                                      lineHeight: 1,
                                    }}
                                  >
                                    {pct.toFixed(1)}%
                                  </span>
                                  {pctDelta !== null && Math.abs(pctDelta) >= 0.1 && (
                                    <span
                                      style={{
                                        fontFamily: FONT,
                                        fontSize: 9,
                                        fontWeight: "var(--font-weight-semibold)",
                                        color: pctDelta > 0 ? "var(--success)" : "var(--destructive)",
                                        lineHeight: 1,
                                      }}
                                    >
                                      {pctDelta > 0 ? "▲" : "▼"}
                                    </span>
                                  )}
                                </span>
                                <span
                                  className="text-muted-foreground"
                                  style={{ fontFamily: FONT, fontSize: "var(--text-xs)", lineHeight: 1 }}
                                >
                                  {fraction}
                                </span>
                              </div>
                              {/* Label */}
                              <div
                                className="text-muted-foreground text-center"
                                style={{
                                  fontFamily: FONT,
                                  fontSize: "var(--text-xs)",
                                  letterSpacing: "0.06em",
                                  textTransform: "uppercase" as const,
                                  marginTop: "2px",
                                  opacity: 0.7,
                                }}
                              >
                                {pctLabel}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* ── Session Attendance Rate ── */}
                {(() => {
                  const att = sessionAttendance[selectedPlayer.name];
                  if (!att || att.total === 0) return null;
                  return (
                    null
                  );
                })()}

                {/* ── Utveckling sedan förra månaden ── */}
                {prevPlayerStats && selectedPlayer.gamesPlayed > 0 && (() => {
                  const prev = prevPlayerStats;
                  const dWins = selectedPlayer.wins - prev.wins;
                  const dFinals = selectedPlayer.finals - prev.finals;
                  const dGames = selectedPlayer.gamesPlayed - prev.gamesPlayed;
                  const dBwp = selectedPlayer.bwp - prev.bwp;
                  const dFinalPct = selectedPlayer.finalPct - prev.finalPct;
                  const dVfPct = selectedPlayer.vfPct - prev.vfPct;

                  // Compute previous month label
                  let prevMonthLabel = "förra månaden";
                  if (typeof selectedMonth === "string" && selectedMonth !== "total") {
                    const [y, mo] = selectedMonth.split("-").map(Number);
                    const prevMo = mo === 1 ? 12 : mo - 1;
                    const prevYr = mo === 1 ? y - 1 : y;
                    prevMonthLabel = formatMonthLabel(`${prevYr}-${String(prevMo).padStart(2, "0")}`);
                  }

                  const pctRows = [
                    { label: "Vinst%", current: selectedPlayer.bwp, delta: dBwp },
                    { label: "Final%", current: selectedPlayer.finalPct, delta: dFinalPct },
                    { label: "Finalvinst%", current: selectedPlayer.vfPct, delta: dVfPct },
                  ].filter(r => Math.abs(r.delta) >= 0.1);

                  const countRows = [
                    { label: "Vinster", delta: dWins },
                    { label: "Finaler", delta: dFinals },
                    { label: "Spelade", delta: dGames },
                  ].filter(r => r.delta !== 0);

                  if (countRows.length === 0 && pctRows.length === 0) return null;

                  // Determine overall trend
                  const overallTrend = dBwp > 1 ? "up" : dBwp < -1 ? "down" : "neutral";

                  return (
                    <div>
                      <button
                        onClick={() => setDevSectionOpen(!devSectionOpen)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border cursor-pointer transition-colors hover:bg-muted/20"
                        style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className="w-3.5 h-3.5 transition-transform"
                            style={{
                              color: "var(--muted-foreground)",
                              transform: devSectionOpen ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          />
                          <span
                            className="text-muted-foreground"
                            style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT }}
                          >
                            Jämfört med {prevMonthLabel}
                          </span>
                        </div>
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                          style={{
                            fontFamily: FONT,
                            fontSize: "var(--text-xs)",
                            fontWeight: "var(--font-weight-semibold)",
                            background: overallTrend === "up"
                              ? "color-mix(in srgb, var(--success) 15%, transparent)"
                              : overallTrend === "down"
                              ? "color-mix(in srgb, var(--destructive) 15%, transparent)"
                              : "color-mix(in srgb, var(--muted-foreground) 15%, transparent)",
                            color: overallTrend === "up"
                              ? "var(--success)"
                              : overallTrend === "down"
                              ? "var(--destructive)"
                              : "var(--muted-foreground)",
                          }}
                        >
                          {overallTrend === "up" ? "▲ Uppåt" : overallTrend === "down" ? "▼ Nedåt" : "● Stabil"}
                        </span>
                      </button>
                      <AnimatePresence>
                        {devSectionOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                      <div
                        className="rounded-lg border border-border overflow-hidden mt-2"
                        style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                      >
                        {/* Percentage changes */}
                        {pctRows.map((row, i) => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between px-3 py-2.5"
                            style={{
                              borderBottom: (i < pctRows.length - 1 || countRows.length > 0) ? "1px solid var(--border)" : "none",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-5 h-5 flex items-center justify-center rounded-full"
                                style={{
                                  fontSize: 10,
                                  background: row.delta > 0
                                    ? "color-mix(in srgb, var(--success) 15%, transparent)"
                                    : "color-mix(in srgb, var(--destructive) 15%, transparent)",
                                  color: row.delta > 0 ? "var(--success)" : "var(--destructive)",
                                }}
                              >
                                {row.delta > 0 ? "▲" : "▼"}
                              </span>
                              <span
                                className="text-foreground"
                                style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
                              >
                                {row.label}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span
                                style={{
                                  fontFamily: FONT,
                                  fontSize: "var(--text-label)",
                                  fontWeight: "var(--font-weight-bold)",
                                  color: row.delta > 0 ? "var(--success)" : "var(--destructive)",
                                }}
                              >
                                {row.delta > 0 ? "+" : ""}{row.delta.toFixed(1)}%
                              </span>
                              <span
                                className="text-muted-foreground"
                                style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}
                              >
                                ({row.current.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        ))}
                        {/* Count changes */}
                        {countRows.map((row, i) => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between px-3 py-2.5"
                            style={{
                              borderBottom: i < countRows.length - 1 ? "1px solid var(--border)" : "none",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-5 h-5 flex items-center justify-center rounded-full"
                                style={{
                                  fontSize: 10,
                                  background: "color-mix(in srgb, var(--muted-foreground) 10%, transparent)",
                                  color: "var(--muted-foreground)",
                                }}
                              >
                                {row.delta > 0 ? "+" : "−"}
                              </span>
                              <span
                                className="text-foreground"
                                style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
                              >
                                {row.label}
                              </span>
                            </div>
                            <span
                              className="tabular-nums"
                              style={{
                                fontFamily: FONT,
                                fontSize: "var(--text-label)",
                                fontWeight: "var(--font-weight-semibold)",
                                color: "var(--foreground)",
                              }}
                            >
                              {row.delta > 0 ? "+" : ""}{row.delta}
                            </span>
                          </div>
                        ))}
                      </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })()}

                {/* ── Elo Rating Card with Gruvrank ── */}
                {(() => {
                  const entry = eloRatings[selectedPlayer.name] ?? { name: selectedPlayer.name, elo: 1000, peakElo: 1000, matches: 0, delta: 0 };
                  const allElos = Object.values(eloRatings).map((e) => e.elo);
                  const percentile = computePlayerPercentile(entry.elo, allElos);
                  const csgoRank = getCSGORank(percentile);
                  return (
                    <div
                      className="rounded-lg border border-border overflow-hidden"
                      style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                    >
                      {/* Top row: Elo rating */}
                      <div className="p-3 flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)", borderRadius: "var(--radius-card)" }}
                        >
                          <TrendingUp className="w-4 h-4" style={{ color: "var(--primary)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span
                              style={{
                                fontFamily: FONT,
                                fontSize: "var(--text-h4)",
                                fontWeight: "var(--font-weight-bold)",
                                color: "var(--primary)",
                                lineHeight: 1.1,
                              }}
                            >
                              {entry.elo}
                            </span>
                            {entry.delta !== 0 && (
                              <span
                                style={{
                                  fontFamily: FONT,
                                  fontSize: "var(--text-xs)",
                                  fontWeight: "var(--font-weight-semibold)",
                                  color: entry.delta > 0 ? "var(--success)" : "var(--destructive)",
                                }}
                              >
                                {entry.delta > 0 ? "+" : ""}{entry.delta}
                              </span>
                            )}
                            <span
                              className="text-muted-foreground"
                              style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}
                            >
                              Elo Rating
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>
                              Peak <strong style={{ color: "var(--foreground)" }}>{entry.peakElo}</strong>
                            </span>
                            <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>
                              {entry.matches} rundor
                            </span>
                          </div>
                        </div>
                        {/* Monthly Elo delta column */}
                        {isMonthView && monthlyEloDelta && (() => {
                          const d = monthlyEloDelta[selectedPlayer.name] ?? 0;
                          const monthRankList = Object.entries(monthlyEloDelta)
                            .filter(([n]) => stats.some(s => s.name === n && s.gamesPlayed >= SEED_MIN_ROUNDS))
                            .sort(([nameA, a], [nameB, b]) => {
                              const wA = weightedDelta(a, monthlyRoundsPlayed?.[nameA] ?? 1);
                              const wB = weightedDelta(b, monthlyRoundsPlayed?.[nameB] ?? 1);
                              return wB - wA || b - a;
                            });
                          const monthRankIdx = monthRankList.findIndex(([n]) => n === selectedPlayer.name);
                          const monthRank = monthRankIdx >= 0 ? monthRankIdx + 1 : null;
                          return (
                            <div
                              className="flex flex-col items-center justify-center shrink-0 px-3 py-1.5 rounded-lg"
                              style={{
                                background: d > 0
                                  ? "rgba(54,225,140,0.10)"
                                  : d < 0
                                    ? "rgba(255,80,80,0.10)"
                                    : "rgba(160,160,160,0.08)",
                                borderRadius: "var(--radius-card)",
                              }}
                            >
                              {(() => {
                                const rounds = monthlyRoundsPlayed?.[selectedPlayer.name] ?? 0;
                                const wd = weightedDelta(d, rounds);
                                const effColor = wd > 0 ? "var(--success)" : wd < 0 ? "var(--destructive)" : "var(--muted-foreground)";
                                return (
                                  <>
                                    <span
                                      style={{
                                        fontFamily: FONT,
                                        fontSize: "var(--text-h4)",
                                        fontWeight: "var(--font-weight-bold)",
                                        color: effColor,
                                        lineHeight: 1.1,
                                      }}
                                    >
                                      {rounds > 0 ? `${wd > 0 ? "+" : ""}${wd.toFixed(1)}` : "—"}
                                    </span>
                                    <span
                                      className="text-muted-foreground"
                                      style={{ fontFamily: FONT, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginTop: 2 }}
                                    >
                                      Eff. Δ
                                    </span>
                                    <span
                                      style={{
                                        fontFamily: FONT,
                                        fontSize: 9,
                                        color: "var(--muted-foreground)",
                                        marginTop: 2,
                                        lineHeight: 1,
                                        opacity: 0.75,
                                      }}
                                    >
                                      (Δ {d > 0 ? "+" : ""}{d} på {rounds} rundor)
                                    </span>
                                  </>
                                );
                              })()}
                              {monthRank !== null && (
                                <span
                                  style={{
                                    fontFamily: FONT,
                                    fontSize: 9,
                                    fontWeight: "var(--font-weight-semibold)",
                                    color: monthRank <= 3 ? "var(--warning)" : "var(--muted-foreground)",
                                    letterSpacing: "0.03em",
                                    marginTop: 3,
                                    lineHeight: 1,
                                  }}
                                >
                                  #{monthRank} av {monthRankList.length}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      {/* Elo sparkline chart */}
                      {eloHistory[selectedPlayer.name] && eloHistory[selectedPlayer.name].length >= 2 && (
                        <div className="px-3 py-2 border-t" style={{ borderColor: "var(--border)" }}>
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className="text-muted-foreground"
                              style={{ fontFamily: FONT, fontSize: "var(--text-xs)", letterSpacing: "0.05em", textTransform: "uppercase" as const }}
                            >
                              Elo-utveckling
                            </span>
                            <div className="flex items-center gap-2">
                              {isMonthView && monthlyEloDelta && (() => {
                                return (
                                  null
                                );
                              })()}
                              <span
                                className="text-muted-foreground"
                                style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}
                              >
                                Senaste {Math.min(eloHistory[selectedPlayer.name].length, 20)} matcher
                              </span>
                            </div>
                          </div>
                          <EloSparkline data={eloHistory[selectedPlayer.name]} width={380} height={44} strokeWidth={2} interactive responsive />
                        </div>
                      )}
                      {/* Gruvrank row */}
                      <div
                        className="px-3 py-2.5 flex items-center gap-3 border-t"
                        style={{ borderColor: "var(--border)", background: csgoRank.bgColor }}
                      >
                        {/* Rank badge */}
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: `color-mix(in srgb, ${csgoRank.color} 25%, transparent)`,
                            border: `1.5px solid color-mix(in srgb, ${csgoRank.color} 40%, transparent)`,
                            borderRadius: "var(--radius-card)",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: FONT,
                              fontSize: csgoRank.shortName.length > 3 ? "var(--text-xs)" : "var(--text-sm)",
                              fontWeight: "var(--font-weight-bold)",
                              color: csgoRank.color,
                              lineHeight: 1,
                            }}
                          >
                            {csgoRank.shortName}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span
                            className="block truncate"
                            style={{
                              fontFamily: FONT,
                              fontSize: "var(--text-sm)",
                              fontWeight: "var(--font-weight-semibold)",
                              color: csgoRank.color,
                              lineHeight: 1.2,
                            }}
                          >
                            {csgoRank.name}
                          </span>
                          <span
                            className="block"
                            style={{
                              fontFamily: FONT,
                              fontSize: "var(--text-xs)",
                              color: "var(--muted-foreground)",
                              marginTop: 1,
                            }}
                          >
                            {percentile >= 100 ? "#1" : `Topp ${(100 - percentile).toFixed(1)}% av spelarna`}
                          </span>
                        </div>
                        {/* Tier progress */}
                        <div className="flex flex-col items-end shrink-0">
                          <div className="flex gap-px">
                            {Array.from({ length: 7 }, (_, i) => (
                              <div
                                key={i}
                                style={{
                                  width: 4,
                                  height: i < csgoRank.tier ? 12 : 6,
                                  borderRadius: 1.5,
                                  background: i < csgoRank.tier ? csgoRank.color : "var(--border)",
                                  opacity: i < csgoRank.tier ? (0.4 + 0.6 * (i / 6)) : 0.3,
                                  alignSelf: "flex-end",
                                }}
                              />
                            ))}
                          </div>
                          <span style={{ fontFamily: FONT, fontSize: 9, color: "var(--muted-foreground)", marginTop: 2 }}>
                            {csgoRank.tier}/7
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Streak — only show when there's actual streak data */}
                {hasStreakData && selectedPlayer.bestStreak > 0 && (
                  <div
                    className="relative overflow-hidden rounded-lg border border-border"
                    style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                  >
                    {/* Warm gradient accent strip */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: "linear-gradient(135deg, color-mix(in srgb, var(--warning) 10%, transparent) 0%, transparent 60%)",
                      }}
                    />
                    <div className="relative flex items-center gap-3 px-4 py-3">
                      {/* Icon badge */}
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "var(--radius-card)",
                          background: "color-mix(in srgb, var(--warning) 12%, transparent)",
                        }}
                      >
                        <Flame className="w-[18px] h-[18px] text-warning" />
                      </div>
                      {/* Text content */}
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span
                          className="text-muted-foreground"
                          style={{
                            fontFamily: FONT,
                            fontSize: "var(--text-xs)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Bästa streak
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="text-warning"
                            style={{
                              fontFamily: FONT,
                              fontSize: "var(--text-lg)",
                              fontWeight: "var(--font-weight-bold)",
                              lineHeight: 1.1,
                            }}
                          >
                            {selectedPlayer.bestStreak}
                          </span>
                          <span
                            className="text-muted-foreground"
                            style={{
                              fontFamily: FONT,
                              fontSize: "var(--text-label)",
                            }}
                          >
                            raka vinster
                          </span>
                        </div>
                      </div>
                      {/* Visual flame repeaters */}
                      <div className="ml-auto flex items-center gap-0.5 shrink-0">
                        {Array.from({ length: Math.min(selectedPlayer.bestStreak, 7) }).map((_, i) => (
                          <Flame
                            key={i}
                            className="text-warning"
                            style={{
                              width: 10 + i * 1.5,
                              height: 10 + i * 1.5,
                              opacity: 0.25 + (i / Math.min(selectedPlayer.bestStreak, 7)) * 0.75,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Tournament Wins section ── */}
                {selectedPlayer.tournamentWins > 0 && (
                  <div>
                    <span
                      className="text-muted-foreground mb-2 block"
                      style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT }}
                    >
                      Turneringsvinster
                    </span>
                    <div
                      className="p-3 rounded-lg border border-border"
                      style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
                        >
                          <Trophy className="w-5 h-5" style={{ color: "var(--primary)" }} />
                        </div>
                        <div>
                          <div
                            style={{
                              fontFamily: FONT,
                              fontSize: "var(--text-h4)",
                              fontWeight: "var(--font-weight-bold)",
                              color: "var(--primary)",
                              lineHeight: 1.1,
                            }}
                          >
                            {selectedPlayer.tournamentWins}
                          </div>
                          <div
                            className="text-muted-foreground"
                            style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}
                          >
                            {selectedPlayer.tournamentWins === 1 ? "turnering vunnen" : "turneringar vunna"}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {selectedPlayer.tournamentEntries.map((t) => {
                          const d = new Date(t.date);
                          const dateStr = d.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
                          return (
                            <div
                              key={t.id}
                              className="flex items-center justify-between px-3 py-2 rounded-lg"
                              style={{ background: "var(--surface-container)", borderRadius: "var(--radius-sm)" }}
                            >
                              <div className="flex items-center gap-2">
                                <span style={{ fontSize: "var(--text-base)" }}>🏆</span>
                                <span
                                  className="text-foreground"
                                  style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
                                >
                                  Mästare
                                </span>
                              </div>
                              <span
                                className="text-muted-foreground"
                                style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}
                              >
                                {dateStr}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Cards section ── */}
                <div>
                  <span
                    className="text-muted-foreground mb-2 block"
                    style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                  >
                    Kort
                  </span>
                  <div className="flex items-center gap-3">
                    {/* Yellow card */}
                    <div
                      className="flex items-center gap-2 p-3 rounded-lg border border-border flex-1"
                      style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                    >
                      <div
                        className="w-5 h-7 rounded-sm"
                        style={{ background: "var(--warning)", borderRadius: "2px" }}
                      />
                      <span
                        style={{ fontSize: "var(--text-h4)", fontWeight: "var(--font-weight-semibold)", color: "var(--warning)" }}
                      >
                        {selectedPlayer.yellowCards}
                      </span>
                      <div className="ml-auto flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveCard(selectedPlayer.name, "yellow"); }}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{ fontSize: "var(--text-base)", borderRadius: "var(--radius-card)" }}
                          disabled={selectedPlayer.yellowCards === 0}
                        >
                          −
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleGiveCard(selectedPlayer.name, "yellow"); }}
                          className="w-6 h-6 rounded flex items-center justify-center text-warning hover:bg-warning/20 transition-colors cursor-pointer"
                          style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", borderRadius: "var(--radius-card)" }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    {/* Red card */}
                    <div
                      className="flex items-center gap-2 p-3 rounded-lg border border-border flex-1"
                      style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                    >
                      <div
                        className="w-5 h-7 rounded-sm"
                        style={{ background: "var(--destructive)", borderRadius: "2px" }}
                      />
                      <span
                        style={{ fontSize: "var(--text-h4)", fontWeight: "var(--font-weight-semibold)", color: "var(--destructive)" }}
                      >
                        {selectedPlayer.redCards}
                      </span>
                      <div className="ml-auto flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveCard(selectedPlayer.name, "red"); }}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{ fontSize: "var(--text-base)", borderRadius: "var(--radius-card)" }}
                          disabled={selectedPlayer.redCards === 0}
                        >
                          −
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleGiveCard(selectedPlayer.name, "red"); }}
                          className="w-6 h-6 rounded flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                          style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", borderRadius: "var(--radius-card)" }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Time & Weekday Insights ── */}
                {playerInsights && playerInsights.sessionCount > 0 && (
                  <div className="space-y-3 md:space-y-4">
                    <span
                      className="text-muted-foreground block"
                      style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                    >
                      Spelinsikter
                    </span>

                    {/* Best weekday + Time preference + Crowd preference row */}
                    <div className="grid grid-cols-3 gap-3">
                      {/* Best weekday */}
                      {playerInsights.bestWeekday && (
                        <div
                          className="p-3 rounded-lg border border-border"
                          style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <CalendarDays className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                            <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Bästa dag
                            </span>
                          </div>
                          <div style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", color: "var(--primary)" }}>
                            {playerInsights.bestWeekday.day}
                          </div>
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                            {playerInsights.bestWeekday.winRate.toFixed(1)}% finalvinst
                          </div>
                        </div>
                      )}

                      {/* Time of day preference */}
                      <div
                        className="p-3 rounded-lg border border-border"
                        style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {playerInsights.timePreference === "morning" ? (
                            <Coffee className="w-3.5 h-3.5" style={{ color: "var(--warning)" }} />
                          ) : (
                            <Sun className="w-3.5 h-3.5" style={{ color: "var(--info)" }} />
                          )}
                          <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Bästa tid
                          </span>
                        </div>
                        <div style={{
                          fontFamily: FONT,
                          fontSize: "var(--text-base)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: playerInsights.timePreference === "morning" ? "var(--warning)" : "var(--info)",
                        }}>
                          {playerInsights.timePreference === "morning"
                            ? "Förmiddag"
                            : playerInsights.timePreference === "afternoon"
                            ? "Eftermiddag"
                            : "Ingen skillnad"}
                        </div>
                        <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                          {playerInsights.timePreference === "morning"
                            ? `${playerInsights.beforeLunch.winRate.toFixed(1)}% finalvinst`
                            : playerInsights.timePreference === "afternoon"
                            ? `${playerInsights.afterLunch.winRate.toFixed(1)}% finalvinst`
                            : playerInsights.beforeLunch.games > 0 && playerInsights.afterLunch.games > 0
                            ? `Fm ${playerInsights.beforeLunch.winRate.toFixed(1)}% · Em ${playerInsights.afterLunch.winRate.toFixed(1)}%`
                            : "För lite data"}
                        </div>
                      </div>

                      {/* eXtrovert / Introvert */}
                      <div
                        className="p-3 rounded-lg border border-border"
                        style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {playerInsights.crowdPreference === "extrovert" ? (
                            <Users className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
                          ) : playerInsights.crowdPreference === "introvert" ? (
                            <UserMinus className="w-3.5 h-3.5" style={{ color: "var(--info)" }} />
                          ) : (
                            <Users className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
                          )}
                          <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Gruppstorlek
                          </span>
                        </div>
                        <div style={{
                          fontFamily: FONT,
                          fontSize: "var(--text-base)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: playerInsights.crowdPreference === "extrovert"
                            ? "var(--success)"
                            : playerInsights.crowdPreference === "introvert"
                            ? "var(--info)"
                            : "var(--muted-foreground)",
                        }}>
                          {playerInsights.crowdPreference === "extrovert"
                            ? "Bäst i stort gäng"
                            : playerInsights.crowdPreference === "introvert"
                            ? "Bäst i litet gäng"
                            : "Ingen skillnad"}
                        </div>
                        <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                          {playerInsights.crowdPreference === "extrovert"
                            ? `${playerInsights.largeCrowd.winRate.toFixed(1)}% finalvinst vid 6+ spelare`
                            : playerInsights.crowdPreference === "introvert"
                            ? `${playerInsights.smallCrowd.winRate.toFixed(1)}% finalvinst vid <6 spelare`
                            : playerInsights.largeCrowd.games > 0 && playerInsights.smallCrowd.games > 0
                            ? `6+: ${playerInsights.largeCrowd.winRate.toFixed(0)}% · <6: ${playerInsights.smallCrowd.winRate.toFixed(0)}%`
                            : "För lite data"}
                        </div>
                      </div>
                    </div>

                    {/* Before/After lunch + Weekday breakdown - side by side on desktop */}
                    <div className="md:grid md:grid-cols-2 md:gap-4 space-y-3 md:space-y-0">
                    {/* Before/After lunch comparison bar */}
                    {(playerInsights.beforeLunch.games > 0 || playerInsights.afterLunch.games > 0) && (
                      <div
                        className="p-3 rounded-lg border border-border"
                        style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Före vs efter lunch
                          </span>
                          <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                            (kl 12:00)
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="flex items-center gap-1.5" style={{ fontSize: "var(--text-sm)", color: "var(--warning)", fontFamily: "'Titillium Web', sans-serif" }}>
                                <Coffee className="w-3.5 h-3.5" /> Förmiddag
                              </span>
                              <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", fontFamily: "'Titillium Web', sans-serif" }}>
                                {playerInsights.beforeLunch.winRate.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, playerInsights.beforeLunch.winRate)}%`,
                                  background: "var(--warning)",
                                }}
                              />
                            </div>
                            <div className="text-muted-foreground mt-1" style={{ fontSize: "var(--text-xs)", fontFamily: "'Titillium Web', sans-serif" }}>
                              {playerInsights.beforeLunch.wins} vinster av {playerInsights.beforeLunch.games} finaler
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="flex items-center gap-1.5" style={{ fontSize: "var(--text-sm)", color: "var(--info)", fontFamily: "'Titillium Web', sans-serif" }}>
                                <Sun className="w-3.5 h-3.5" /> Eftermiddag
                              </span>
                              <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", fontFamily: "'Titillium Web', sans-serif" }}>
                                {playerInsights.afterLunch.winRate.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, playerInsights.afterLunch.winRate)}%`,
                                  background: "var(--info)",
                                }}
                              />
                            </div>
                            <div className="text-muted-foreground mt-1" style={{ fontSize: "var(--text-xs)", fontFamily: "'Titillium Web', sans-serif" }}>
                              {playerInsights.afterLunch.wins} vinster av {playerInsights.afterLunch.games} finaler
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Weekday breakdown mini-chart */}
                    {playerInsights.weekdays.some((d) => d.games > 0) && (
                      <div
                        className="p-3 rounded-lg border border-border"
                        style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                      >
                        <div className="flex items-center gap-1.5 mb-3">
                          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Per veckodag
                          </span>
                        </div>
                        {/* Bar area — bars grow upward from bottom */}
                        <div className="flex items-end gap-1.5" style={{ height: 56 }}>
                          {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                            const d = playerInsights.weekdays[dayIdx];
                            const maxGames = Math.max(...playerInsights.weekdays.map((w) => w.games), 1);
                            const barH = d.games > 0 ? Math.max(8, (d.games / maxGames) * 48) : 4;
                            const hasData = d.games > 0;
                            const isBest = playerInsights.bestWeekday?.day === d.day;
                            return (
                              <div
                                key={d.dayIndex}
                                className="flex-1"
                                title={
                                  hasData
                                    ? `${d.day}: ${d.wins} vinster av ${d.games} finaler (${d.winRate.toFixed(1)}%)`
                                    : `${d.day}: Ingen data`
                                }
                              >
                                <div
                                  className="w-full rounded-sm transition-all duration-300"
                                  style={{
                                    height: barH,
                                    background: !hasData ? "var(--border)" : "var(--primary)",
                                    opacity: !hasData ? 0.3 : isBest ? 1 : 0.4,
                                    borderRadius: "var(--radius-sm)",
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                        {/* Percentage labels — separate row below bars */}
                        <div className="flex gap-1.5 mt-1.5">
                          {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                            const d = playerInsights.weekdays[dayIdx];
                            const hasData = d.games > 0;
                            const isBest = playerInsights.bestWeekday?.day === d.day;
                            return (
                              <div key={`pct-${d.dayIndex}`} className="flex-1 text-center" style={{ minHeight: 12 }}>
                                {hasData && (
                                  <span style={{
                                    fontSize: "var(--text-xs)",
                                    fontFamily: "'Titillium Web', sans-serif",
                                    fontWeight: "var(--font-weight-semibold)",
                                    color: isBest ? "var(--primary)" : "var(--muted-foreground)",
                                    lineHeight: 1,
                                  }}>
                                    {d.winRate.toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {/* Day name labels — separate row below percentages */}
                        <div className="flex gap-1.5 mt-0.5">
                          {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                            const d = playerInsights.weekdays[dayIdx];
                            const isBest = playerInsights.bestWeekday?.day === d.day;
                            return (
                              <div key={`lbl-${d.dayIndex}`} className="flex-1 text-center">
                                <span style={{
                                  fontSize: "var(--text-xs)",
                                  fontFamily: "'Titillium Web', sans-serif",
                                  color: isBest ? "var(--primary)" : "var(--muted-foreground)",
                                  fontWeight: isBest ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                                  lineHeight: 1,
                                }}>
                                  {d.dayShort}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {/* Legend */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                          <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                            Höjd = antal finaler
                          </span>
                          {playerInsights.peakHourLabel && (
                            <span className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                              <Clock className="w-3 h-3" />
                              Mest aktiv: {playerInsights.peakHourLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    </div>{/* end 2-col grid for lunch + weekday */}

                    {/* Worst weekday callout */}
                    {playerInsights.worstWeekday && playerInsights.bestWeekday &&
                      playerInsights.worstWeekday.day !== playerInsights.bestWeekday.day && (
                      <div
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
                        style={{
                          background: "var(--surface-container-lowest)",
                          borderColor: "var(--destructive)",
                          borderRadius: "var(--radius-card)",
                          opacity: 0.85,
                        }}
                      >
                        <span style={{ fontSize: "var(--text-base)" }}>⚠️</span>
                        <span className="text-muted-foreground" style={{ fontSize: "var(--text-sm)", lineHeight: 1.4 }}>
                          Undvik <strong style={{ color: "var(--destructive)", fontWeight: "var(--font-weight-semibold)" }}>{playerInsights.worstWeekday.day}ar</strong> — bara{" "}
                          {playerInsights.worstWeekday.winRate.toFixed(1)}% finalvinst jämfört med{" "}
                          {playerInsights.bestWeekday.winRate.toFixed(1)}% på {playerInsights.bestWeekday.day}ar.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Nemesis & Prey — only show when there's actual session data */}
                {hasFormData && (selectedPlayer.nemesis || selectedPlayer.prey) && (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedPlayer.nemesis && (
                      <div
                        className="p-3 rounded-lg border border-destructive/20"
                        style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                      >
                        <div className="text-muted-foreground mb-1" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Nemesis 💀
                        </div>
                        <div className="text-destructive" style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>
                          {selectedPlayer.nemesis}
                        </div>
                        {selectedPlayer.h2h[selectedPlayer.nemesis] && (
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                            {selectedPlayer.h2h[selectedPlayer.nemesis].wins}V – {selectedPlayer.h2h[selectedPlayer.nemesis].losses}F
                          </div>
                        )}
                      </div>
                    )}
                    {selectedPlayer.prey && (
                      <div
                        className="p-3 rounded-lg border border-success/20"
                        style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                      >
                        <div className="text-muted-foreground mb-1" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Byte 🎯
                        </div>
                        <div className="text-success" style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>
                          {selectedPlayer.prey}
                        </div>
                        {selectedPlayer.h2h[selectedPlayer.prey] && (
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                            {selectedPlayer.h2h[selectedPlayer.prey].wins}V – {selectedPlayer.h2h[selectedPlayer.prey].losses}F
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Revenge Meter ── */}
                {revengeData.length > 0 && (
                  <div>
                    <span
                      className="text-muted-foreground mb-2 block"
                      style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Shield className="w-3 h-3" /> Ohämnade förluster
                        <span
                          className="px-1.5 py-0.5 rounded-full"
                          style={{
                            fontSize: 10,
                            fontWeight: "var(--font-weight-bold)",
                            background: "color-mix(in srgb, var(--destructive) 15%, transparent)",
                            color: "var(--destructive)",
                          }}
                        >
                          {revengeData.length}
                        </span>
                      </span>
                    </span>
                    <div className="space-y-1.5">
                      {revengeData.slice(0, 5).map((rv) => {
                        const dateStr = new Date(rv.lastLossDate).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
                        const severity = rv.lossStreak >= 3 ? "high" : rv.lossStreak >= 2 ? "medium" : "low";
                        return (
                          <div
                            key={rv.opponent}
                            className="px-3 py-2.5 rounded-lg border"
                            style={{
                              background: "var(--surface-container-lowest)",
                              borderColor: severity === "high" ? "var(--destructive)" : severity === "medium" ? "color-mix(in srgb, var(--destructive) 40%, var(--border))" : "var(--border)",
                              borderRadius: "var(--radius-card)",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Target
                                className="w-3.5 h-3.5 shrink-0"
                                style={{ color: severity === "high" ? "var(--destructive)" : severity === "medium" ? "var(--warning)" : "var(--muted-foreground)" }}
                              />
                              <span
                                className="flex-1 truncate"
                                style={{
                                  fontFamily: FONT,
                                  fontSize: "var(--text-label)",
                                  fontWeight: "var(--font-weight-semibold)",
                                  color: "var(--foreground)",
                                }}
                              >
                                {rv.opponent}
                              </span>
                              <span
                                className="shrink-0 px-1.5 py-0.5 rounded-full"
                                style={{
                                  fontSize: 10,
                                  fontWeight: "var(--font-weight-bold)",
                                  fontFamily: FONT,
                                  background: severity === "high"
                                    ? "color-mix(in srgb, var(--destructive) 15%, transparent)"
                                    : severity === "medium"
                                    ? "color-mix(in srgb, var(--warning) 15%, transparent)"
                                    : "color-mix(in srgb, var(--muted-foreground) 15%, transparent)",
                                  color: severity === "high" ? "var(--destructive)" : severity === "medium" ? "var(--warning)" : "var(--muted-foreground)",
                                }}
                              >
                                {rv.lossStreak}× förlust i rad
                              </span>
                            </div>
                            {/* Mini revenge bar */}
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${rv.totalWins > 0 ? (rv.totalWins / (rv.totalWins + rv.totalLosses)) * 100 : 0}%`,
                                    background: "var(--success)",
                                    transition: "width 0.4s ease",
                                  }}
                                />
                              </div>
                              <span
                                className="text-muted-foreground shrink-0"
                                style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}
                              >
                                {rv.totalWins}V–{rv.totalLosses}F
                              </span>
                              <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                                · {dateStr}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {revengeData.length > 5 && (
                        <span className="text-muted-foreground block text-center" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                          +{revengeData.length - 5} till
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Head-to-head records */}
                {hasFormData && Object.keys(selectedPlayer.h2h).length > 0 && (
                  <div>
                    <span
                      className="text-muted-foreground mb-2 block"
                      style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT }}
                    >
                      Alla finalmöten
                    </span>
                    <div className="space-y-1.5 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
                      {Object.entries(selectedPlayer.h2h)
                        .sort(([, a], [, b]) => b.wins + b.losses - (a.wins + a.losses))
                        .map(([opp, record]) => (
                          <div
                            key={opp}
                            className="flex items-center justify-between px-3 py-2 rounded-lg"
                            style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                          >
                            <span
                              className="text-foreground"
                              style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
                            >
                              vs {opp}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                style={{
                                  fontFamily: FONT,
                                  fontSize: "var(--text-label)",
                                  fontWeight: "var(--font-weight-semibold)",
                                  color: record.wins >= record.losses ? "var(--success)" : "var(--destructive)",
                                }}
                              >
                                {record.wins}V – {record.losses}F
                              </span>
                              {h2hElo[selectedPlayer.name]?.[opp] !== undefined && h2hElo[selectedPlayer.name][opp] !== 0 && (
                                <span
                                  title="Netto Elo vunnet/förlorat mot denna spelare"
                                  style={{
                                    fontFamily: FONT,
                                    fontSize: "var(--text-xs)",
                                    fontWeight: "var(--font-weight-semibold)",
                                    color: h2hElo[selectedPlayer.name][opp] > 0 ? "var(--success)" : "var(--destructive)",
                                    background: h2hElo[selectedPlayer.name][opp] > 0 ? "color-mix(in srgb, var(--success) 12%, transparent)" : "color-mix(in srgb, var(--destructive) 12%, transparent)",
                                    padding: "1px 6px",
                                    borderRadius: "var(--radius-card)",
                                    cursor: "help",
                                  }}
                                >
                                  {h2hElo[selectedPlayer.name][opp] > 0 ? "+" : ""}{h2hElo[selectedPlayer.name][opp]} Elo
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* ── Achievements (persistent) ── */}
                <AchievementDisplay
                  unlocked={computePlayerAchievements(selectedPlayer, allSessions, eloRatings, stats, savedAchievements)}
                  allAchievements={[...ALL_ACHIEVEMENTS, MYTHIC_COMPLETIONIST]}
                  achievementOwnerCounts={achievementOwnerCounts}
                  showLocked={showLockedAchievements}
                  onToggleLocked={() => setShowLockedAchievements(!showLockedAchievements)}
                />

                {/* ── Remove player ── */}
                {isViewingCurrentMonth && (
                  <div className="pt-2 border-t border-border" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
                    {confirmRemovePlayer === selectedPlayer.name ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="text-destructive flex-1"
                          style={{ fontSize: "var(--text-label)" }}
                        >
                          Säker? Spelaren tas bort permanent.
                        </span>
                        <button
                          onClick={() => handleRemovePlayer(selectedPlayer.name)}
                          className="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                          style={{
                            fontSize: "var(--text-label)",
                            fontWeight: "var(--font-weight-semibold)",
                            background: "var(--destructive)",
                            color: "var(--destructive-foreground)",
                            borderRadius: "var(--radius-card)",
                          }}
                        >
                          Ta bort
                        </button>
                        <button
                          onClick={() => setConfirmRemovePlayer(null)}
                          className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                          style={{ fontSize: "var(--text-label)", borderRadius: "var(--radius-card)" }}
                        >
                          Avbryt
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemovePlayer(selectedPlayer.name)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-all cursor-pointer w-full"
                        style={{ fontSize: "var(--text-label)", borderRadius: "var(--radius-card)" }}
                      >
                        <UserMinus className="w-4 h-4" />
                        Ta bort spelare
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
