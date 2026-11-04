import { ChevronDown, Award, Crown, TrendingUp, Zap, TrendingDown, Flame, Swords } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { SeasonSummary } from "../../lib/insights";

interface SeasonSummaryCardProps {
  seasonSummary: SeasonSummary | null;
  selectedMonth: string;
  isViewingCurrentMonth: boolean;
  setShowSeasonSummary: React.Dispatch<React.SetStateAction<boolean>>;
  showSeasonSummary: boolean;
}

export function SeasonSummaryCard({
  seasonSummary,
  selectedMonth,
  isViewingCurrentMonth,
  setShowSeasonSummary,
  showSeasonSummary,
}: SeasonSummaryCardProps) {
  return (
    <>
      {seasonSummary && selectedMonth !== "total" && (
        <div style={{ order: 1 }} className="mb-4">
          {isViewingCurrentMonth ? (
            /* ── Compact "sneak peek" banner for current/live month ── */
            <button
              onClick={() => setShowSeasonSummary(!showSeasonSummary)}
              className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors hover:bg-muted/20"
              style={{
                background: "color-mix(in srgb, var(--primary) 6%, var(--surface-container))",
                borderRadius: "var(--radius-card)",
                border: "1px dashed color-mix(in srgb, var(--primary) 30%, transparent)",
              }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    fontSize: 10,
                    fontWeight: "var(--font-weight-bold)" as any,
                    background: "color-mix(in srgb, var(--primary) 15%, transparent)",
                    color: "var(--primary)",
                    letterSpacing: "0.05em",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--primary)" }} />
                  LIVE
                </span>
                <span style={{ fontSize: "var(--text-label)", color: "var(--muted-foreground)" }}>
                  {seasonSummary.monthLabel}
                </span>
                <span className="hidden sm:inline" style={{ fontSize: "var(--text-label)", color: "var(--muted-foreground)" }}>·</span>
                <span className="hidden sm:inline" style={{ fontSize: "var(--text-label)", color: "var(--foreground)", fontWeight: "var(--font-weight-semibold)" as any }}>
                  {seasonSummary.totalSessions} omgångar
                </span>
                <span className="hidden sm:inline" style={{ fontSize: "var(--text-label)", color: "var(--muted-foreground)" }}>·</span>
                <span className="hidden sm:inline" style={{ fontSize: "var(--text-label)", color: "var(--foreground)", fontWeight: "var(--font-weight-semibold)" as any }}>
                  {seasonSummary.totalGames} rundor
                </span>
                {seasonSummary.mvp && (
                  <>
                    <span className="hidden md:inline" style={{ fontSize: "var(--text-label)", color: "var(--muted-foreground)" }}>·</span>
                    <span className="hidden md:inline" style={{ fontSize: "var(--text-label)", color: "var(--warning)" }}>
                      <Crown className="w-3.5 h-3.5 inline align-[-2px] mr-1" aria-hidden />{seasonSummary.mvp.name.split(" ")[0]}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className="hidden sm:inline" style={{ fontSize: "var(--text-xs)", color: "var(--primary)", fontWeight: "var(--font-weight-semibold)" as any }}>
                  {showSeasonSummary ? "Dölj" : "Visa sammanfattning"}
                </span>
                <ChevronDown
                  className="w-3.5 h-3.5 transition-transform"
                  style={{ color: "var(--primary)", transform: showSeasonSummary ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </div>
            </button>
          ) : (
            /* ── Standard collapsible header for completed months ── */
            <button
              onClick={() => setShowSeasonSummary(!showSeasonSummary)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border cursor-pointer transition-colors hover:bg-muted/20"
              style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)" }}
            >
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" style={{ color: "var(--primary)" }} />
                <span style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                  Sammanfattning — {seasonSummary.monthLabel}
                </span>
              </div>
              <ChevronDown
                className="w-4 h-4 transition-transform"
                style={{ color: "var(--muted-foreground)", transform: showSeasonSummary ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
          )}
          <AnimatePresence>
            {showSeasonSummary && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div
                  className="mt-2 rounded-lg border overflow-hidden"
                  style={{
                    background: "var(--surface-container)",
                    borderRadius: "var(--radius-card)",
                    borderColor: isViewingCurrentMonth ? "color-mix(in srgb, var(--primary) 20%, transparent)" : "var(--border)",
                  }}
                >
                  {/* Hero stats row */}
                  <div
                    className="px-4 py-4 border-b border-border"
                    style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, var(--surface-container)), var(--surface-container))" }}
                  >
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div>
                        <div style={{ fontSize: "var(--text-h3)", fontWeight: "var(--font-weight-bold)", color: "var(--primary)", lineHeight: 1.1 }}>
                          {seasonSummary.totalSessions}
                        </div>
                        <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Omgångar
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "var(--text-h3)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)", lineHeight: 1.1 }}>
                          {seasonSummary.totalGames}
                        </div>
                        <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Rundor
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MVP + Most Improved + Biggest Upset */}
                  <div className="p-4 space-y-3">
                    {/* MVP */}
                    {seasonSummary.mvp && (
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg border"
                        style={{ background: "var(--surface-container-lowest)", borderColor: "color-mix(in srgb, var(--primary) 30%, var(--border))", borderRadius: "var(--radius-card)" }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
                        >
                          <Crown className="w-5 h-5" style={{ color: "var(--primary)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Månadens spelare
                          </div>
                          <div className="truncate" style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", color: "var(--primary)" }}>
                            {seasonSummary.mvp.name}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>
                            {seasonSummary.mvp.wins}
                          </div>
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>vinster</div>
                        </div>
                      </div>
                    )}

                    {/* Most Improved */}
                    {seasonSummary.mostImproved && seasonSummary.mostImproved.eloDelta !== 0 && (
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg border border-border"
                        style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)" }}
                        >
                          <TrendingUp className="w-5 h-5" style={{ color: "var(--success)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Mest förbättrad
                          </div>
                          <div className="truncate" style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", color: "var(--success)" }}>
                            {seasonSummary.mostImproved.name}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div style={{
                            fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)",
                            color: seasonSummary.mostImproved.eloDelta > 0 ? "var(--success)" : "var(--destructive)",
                          }}>
                            {seasonSummary.mostImproved.eloDelta > 0 ? "+" : ""}{seasonSummary.mostImproved.eloDelta}
                          </div>
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>Elo</div>
                        </div>
                      </div>
                    )}

                    {/* Biggest Upset */}
                    {seasonSummary.biggestUpset && (
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg border border-border"
                        style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "color-mix(in srgb, var(--warning) 15%, transparent)" }}
                        >
                          <Zap className="w-5 h-5" style={{ color: "var(--warning)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Störst skräll
                          </div>
                          <div className="truncate" style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)", color: "var(--warning)" }}>
                            {seasonSummary.biggestUpset.winner}{" "}
                            <span className="text-muted-foreground" style={{ fontWeight: "var(--font-weight-normal)", fontSize: "var(--text-xs)" }}>slog</span>{" "}
                            {seasonSummary.biggestUpset.loser}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)", color: "var(--warning)" }}>
                            {seasonSummary.biggestUpset.eloDiff}
                          </div>
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>Elo-diff</div>
                        </div>
                      </div>
                    )}

                    {/* Longest Win Streak */}
                    {seasonSummary.longestWinStreak && (
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg border border-border"
                        style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
                        >
                          <Flame className="w-5 h-5" style={{ color: "var(--primary)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Längsta vinstraden
                          </div>
                          <div className="truncate" style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                            {seasonSummary.longestWinStreak.name}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)", color: "var(--primary)" }}>
                            {seasonSummary.longestWinStreak.streak}
                          </div>
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>i rad</div>
                        </div>
                      </div>
                    )}

                    {/* Rivalry */}
                    {seasonSummary.rivalry && (
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg border border-border"
                        style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "color-mix(in srgb, var(--destructive) 15%, transparent)" }}
                        >
                          <Swords className="w-5 h-5" style={{ color: "var(--destructive)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Rivalitet
                          </div>
                          <div className="truncate" style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                            {seasonSummary.rivalry.player1}{" "}
                            <span className="text-muted-foreground" style={{ fontWeight: "var(--font-weight-normal)", fontSize: "var(--text-xs)" }}>mot</span>{" "}
                            {seasonSummary.rivalry.player2}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>
                            {seasonSummary.rivalry.record}
                          </div>
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>{seasonSummary.rivalry.meetings} möten</div>
                        </div>
                      </div>
                    )}

                    {/* Biggest Elo Drop */}
                    {seasonSummary.biggestDrop && (
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg border border-border"
                        style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "color-mix(in srgb, var(--destructive) 15%, transparent)" }}
                        >
                          <TrendingDown className="w-5 h-5" style={{ color: "var(--destructive)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Störst Elo-tapp
                          </div>
                          <div className="truncate" style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", color: "var(--destructive)" }}>
                            {seasonSummary.biggestDrop.name}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)", color: "var(--destructive)" }}>
                            {seasonSummary.biggestDrop.eloDelta}
                          </div>
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>Elo</div>
                        </div>
                      </div>
                    )}

                    {/* Extra stats row */}
                    <div className="grid grid-cols-2 gap-2">
                      {seasonSummary.busiestDay && (
                        <div className="p-3 rounded-lg" style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-sm)" }}>
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Populäraste dagen
                          </div>
                          <div style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                            {seasonSummary.busiestDay.day}
                          </div>
                          <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                            {seasonSummary.busiestDay.count} omgångar
                          </div>
                        </div>
                      )}
                      <div className="p-3 rounded-lg" style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-sm)" }}>
                        <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Snitt finaler/omgång
                        </div>
                        <div style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                          {seasonSummary.avgFinalsPerSession}
                        </div>
                      </div>
                    </div>

                    {/* Superlatives */}
                    {seasonSummary.superlatives.length > 0 && (
                      <div>
                        <span
                          className="text-muted-foreground mb-2 block"
                          style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                        >
                          Utmärkelser
                        </span>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                          {seasonSummary.superlatives.map((s) => (
                            <div
                              key={s.name}
                              className="px-2.5 py-2 rounded-lg"
                              style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-sm)" }}
                            >
                              <div className="flex items-center gap-1.5">
                                <span style={{ fontSize: "var(--text-base)", lineHeight: 1 }}>{s.emoji}</span>
                                <span
                                  className="truncate"
                                  style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}
                                >
                                  {s.name}
                                </span>
                              </div>
                              <div
                                className="text-muted-foreground mt-0.5"
                                style={{ fontSize: 10, lineHeight: 1.3 }}
                              >
                                <span style={{ color: "var(--primary)", fontWeight: "var(--font-weight-semibold)" }}>{s.title}</span>{" "}
                                · {s.detail}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {isViewingCurrentMonth && (
                    <div className="px-4 py-2 border-t" style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontStyle: "italic" }}>
                        Baserat på data hittills — uppdateras löpande
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
