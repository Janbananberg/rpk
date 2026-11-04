import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, X, Pencil, UserMinus, Flame, Snowflake, Info } from "lucide-react";
import { ELO_START } from "../../lib/elo";
import type { EloEntry } from "../../lib/elo";
import { computePlayerAchievements, ALL_ACHIEVEMENTS, MYTHIC_COMPLETIONIST } from "../../lib/achievements";
import type { PlayerStats } from "../../lib/stats";
import type { PlayerInsights, RevengeTarget } from "../../lib/insights";
import { AchievementDisplay } from "../achievement-display";
import type { GameSession, SavedPlayerAchievements } from "../api";
import { FormDots } from "./form-dots";
import { ProfileStatsGrid } from "./profile/stats-grid";
import { ProfileMonthTrend } from "./profile/month-trend";
import { ProfileEloCard } from "./profile/elo-card";
import { ProfileStreakAndTrophies } from "./profile/streak-and-trophies";
import { ProfileTimeInsights } from "./profile/time-insights";
import { ProfileRivals } from "./profile/rivals";

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
  hasFormData: boolean;
  hasStreakData: boolean;
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
  eloResetTimestamp: number | null;
  achievementOwnerCounts: Record<string, number>;
  showLockedAchievements: boolean;
  setShowLockedAchievements: React.Dispatch<React.SetStateAction<boolean>>;
  confirmRemovePlayer: string | null;
  handleRemovePlayer: (name: string) => Promise<void>;
  setConfirmRemovePlayer: React.Dispatch<React.SetStateAction<string | null>>;
}

type ProfileTab = "oversikt" | "statistik" | "rivaler" | "achievements";

const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: "oversikt", label: "Översikt" },
  { id: "statistik", label: "Statistik" },
  { id: "rivaler", label: "Rivaler" },
  { id: "achievements", label: "Achievements" },
];

/** Shown after a tab panel only when every card in it rendered nothing (peer-empty). */
function ProfileTabEmpty({ text }: { text: string }) {
  return (
    <p
      className="hidden peer-empty:flex flex-col items-center gap-2 py-8 text-center text-muted-foreground"
      style={{ fontSize: "var(--text-sm)" }}
    >
      <Info className="w-5 h-5" aria-hidden />
      {text}
    </p>
  );
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
  eloResetTimestamp,
  achievementOwnerCounts,
  showLockedAchievements,
  setShowLockedAchievements,
  confirmRemovePlayer,
  handleRemovePlayer,
  setConfirmRemovePlayer,
}: PlayerProfileModalProps) {
  // The chosen tab belongs to one player; opening another profile starts on Översikt.
  const [tabState, setTabState] = useState<{ player: string | null; tab: ProfileTab }>({ player: null, tab: "oversikt" });
  const activeTab: ProfileTab = tabState.player === selectedPlayer?.name ? tabState.tab : "oversikt";
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
                            <Flame className="w-3 h-3" aria-hidden />{selectedPlayer.currentStreak} raka vinster
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
                            <Snowflake className="w-3 h-3" aria-hidden />{selectedPlayer.coldStreak} raka förluster
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
                {/* Tabs */}
                <div role="tablist" aria-label="Spelarprofil" className="flex gap-1 mt-3 -mb-3 overflow-x-auto">
                  {PROFILE_TABS.map((t) => {
                    const active = activeTab === t.id;
                    return (
                      <button
                        key={t.id}
                        id={`profile-tab-${t.id}`}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-controls={`profile-panel-${t.id}`}
                        onClick={() => setTabState({ player: selectedPlayer.name, tab: t.id })}
                        className="relative flex-1 md:flex-none px-3 py-2.5 whitespace-nowrap cursor-pointer transition-colors hover:text-foreground"
                        style={{
                          fontSize: "var(--text-sm)",
                          fontWeight: active ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                          color: active ? "var(--primary)" : "var(--muted-foreground)",
                        }}
                      >
                        {t.label}
                        {active && (
                          <motion.span
                            layoutId="profile-tab-underline"
                            className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full"
                            style={{ background: "var(--primary)" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 md:p-6 space-y-5">
                {/* Each panel is shown on its own tab; a panel whose cards all render nothing shows the hint after it */}
                {activeTab === "oversikt" && (
                <div role="tabpanel" id="profile-panel-oversikt" aria-labelledby="profile-tab-oversikt" className="space-y-5">
                {/* Stats grid — count + integrated percentage per card + delta from prev month */}
                <ProfileStatsGrid
                  selectedPlayer={selectedPlayer}
                  prevPlayerStats={prevPlayerStats}
                  sessionAttendance={sessionAttendance}
                />

                {/* ── Elo Rating Card with Gruvrank ── */}
                <ProfileEloCard
                  eloRatings={eloRatings}
                  selectedPlayer={selectedPlayer}
                  isMonthView={isMonthView}
                  monthlyEloDelta={monthlyEloDelta}
                  stats={stats}
                  monthlyRoundsPlayed={monthlyRoundsPlayed}
                  eloHistory={eloHistory}
                />

                {/* Streak — only show when there's actual streak data */}
                <ProfileStreakAndTrophies
                  hasStreakData={hasStreakData}
                  selectedPlayer={selectedPlayer}
                  handleRemoveCard={handleRemoveCard}
                  handleGiveCard={handleGiveCard}
                />
                </div>
                )}

                {activeTab === "statistik" && (
                <div role="tabpanel" id="profile-panel-statistik" aria-labelledby="profile-tab-statistik">
                <div className="peer space-y-5">
                {/* ── Utveckling sedan förra månaden ── */}
                <ProfileMonthTrend
                  prevPlayerStats={prevPlayerStats}
                  selectedPlayer={selectedPlayer}
                  selectedMonth={selectedMonth}
                  setDevSectionOpen={setDevSectionOpen}
                  devSectionOpen={devSectionOpen}
                />

                {/* ── Time & Weekday Insights ── */}
                <ProfileTimeInsights
                  playerInsights={playerInsights}
                />
                </div>
                <ProfileTabEmpty text="Ingen fördjupad statistik än. Den fylls på när spelaren har spelat omgångar i den här vyn." />
                </div>
                )}

                {activeTab === "rivaler" && (
                <div role="tabpanel" id="profile-panel-rivaler" aria-labelledby="profile-tab-rivaler">
                <div className="peer space-y-5">
                {/* Nemesis & Prey — only show when there's actual session data */}
                <ProfileRivals
                  hasFormData={hasFormData}
                  selectedPlayer={selectedPlayer}
                  revengeData={revengeData}
                  h2hElo={h2hElo}
                />
                </div>
                <ProfileTabEmpty text="Inga finalmöten än. Rivalerna dyker upp här när spelaren har mött någon i en final." />
                </div>
                )}

                {activeTab === "achievements" && (
                <div role="tabpanel" id="profile-panel-achievements" aria-labelledby="profile-tab-achievements">
                {/* ── Achievements (persistent) ── */}
                <AchievementDisplay
                  unlocked={computePlayerAchievements(selectedPlayer, allSessions, eloRatings, stats, savedAchievements, eloResetTimestamp)}
                  allAchievements={[...ALL_ACHIEVEMENTS, MYTHIC_COMPLETIONIST]}
                  achievementOwnerCounts={achievementOwnerCounts}
                  showLocked={showLockedAchievements}
                  onToggleLocked={() => setShowLockedAchievements(!showLockedAchievements)}
                />
                </div>
                )}

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
