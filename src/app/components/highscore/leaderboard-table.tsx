import { ChevronRight } from "lucide-react";
import type { PlayerStats, SortTab } from "../../lib/stats";
import { SEED_MIN_ROUNDS, ELO_START, weightedDelta } from "../../lib/elo";
import type { EloEntry } from "../../lib/elo";
import { FONT } from "./constants";
import { getRankIcon } from "./rank-icon";
import { EloSparkline } from "./elo-sparkline";
import { FormDots } from "./form-dots";

interface LeaderboardTableProps {
  sortedStats: PlayerStats[];
  hasFormData: true;
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
  hasStreakData: true;
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
}: LeaderboardTableProps) {
  return (
    <>
      <div
        className="rounded-lg border border-border overflow-hidden"
        style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)", order: 2 }}
      >
          {/* Mobile card layout + Desktop table */}
          {sortedStats.length === 0 ? (
            <div
              className="px-4 py-8 text-center text-muted-foreground"
              style={{ fontFamily: FONT, fontSize: "var(--text-base)" }}
            >
              Inga spelare registrerade ännu
            </div>
          ) : (
            <>
              {/* Desktop table header */}
              <div
                className="hidden md:grid px-4 py-3 border-b border-border items-center"
                style={{
                  gridTemplateColumns: [
                    "36px",
                    "1fr",
                    "64px",
                    hasFormData ? "90px" : "",
                    "72px",
                    "80px",
                    "64px",
                    "64px",
                    "80px",
                  ].filter(Boolean).join(" "),
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
                    fontFamily: FONT,
                  }}
                >
                  {isMonthView ? "Elo Δ" : "Elo"}<SortArrow column="elo" />
                </button>
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
                {/* Förluster */}
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
                {/* Kort & Streak visas nu efter spelarnamnet */}
              </div>

              {/* Rows — split into seeded, unseeded, and inactive (no play in 4 weeks) */}
              {(() => {
                const INACTIVE_WEEKS = 4;
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
                  <div key={s.name}>
                    {/* Desktop row */}
                    <div
                      className="hidden md:grid px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer items-center"
                      style={{
                        gridTemplateColumns: [
                          "36px",
                          "1fr",
                          "64px",
                          hasFormData ? "90px" : "",
                          "72px",
                          "80px",
                          "64px",
                          "64px",
                          "80px",
                        ].filter(Boolean).join(" "),
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
                              fontFamily: FONT,
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
                              fontFamily: FONT,
                            }}
                          >
                            🏆 {s.tournamentWins}
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
                            🔥 {s.currentStreak}
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
                            🥶 {s.coldStreak}
                          </span>
                        )}
                      </div>
                      {/* Elo sparkline column */}
                      <div className="flex items-center justify-center" title={`Elo: ${eloRatings[s.name]?.elo ?? ELO_START}`}>
                        {isMonthView && monthlyEloDelta ? (() => {
                          const d = monthlyEloDelta[s.name] ?? 0;
                          const rounds = monthlyRoundsPlayed?.[s.name] ?? 0;
                          const wd = rounds > 0 ? weightedDelta(d, rounds) : 0;
                          return (
                            <span
                              className="text-right flex items-center justify-end"
                              style={{
                                fontSize: "var(--text-base)",
                                fontWeight: "var(--font-weight-semibold)",
                                fontFamily: FONT,
                                color: wd > 0 ? "var(--success)" : wd < 0 ? "var(--destructive)" : "var(--muted-foreground)",
                              }}
                              title={`Δ ${d > 0 ? "+" : ""}${d} / √${rounds}`}
                            >
                              {wd > 0 ? "+" : ""}{wd.toFixed(1)}
                            </span>
                          );
                        })() : eloHistory[s.name] && eloHistory[s.name].length >= 2 ? (
                          <EloSparkline data={eloHistory[s.name]} width={56} height={20} />
                        ) : (
                          <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>—</span>
                        )}
                      </div>
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
                      {/* Kort & Streak visas nu inline efter spelarnamnet */}
                    </div>

                    {/* Mobile card */}
                    <div
                      className="md:hidden px-3 py-2.5 border-b border-border last:border-b-0 cursor-pointer active:bg-muted/20 transition-colors"
                      onClick={() => { setDevSectionOpen(false); setSelectedPlayer(selectedPlayer?.name === s.name ? null : s); }}
                    >
                      {/* Row 1: rank + name + elo + sparkline + chevron */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 text-center shrink-0">{isSeeded ? getRankIcon(rank) : <span className="text-muted-foreground" style={{ fontSize: "var(--text-label)" }}>—</span>}</div>
                        <span
                          className={`flex-1 truncate ${isSeeded && rank <= 3 ? "text-primary" : "text-foreground"}`}
                          style={{
                            fontSize: "var(--text-base)",
                            fontWeight: isSeeded && rank <= 3 ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                            fontFamily: FONT,
                          }}
                        >
                          {s.name}
                        </span>
                        {isMonthView && monthlyEloDelta ? (() => {
                          const d = monthlyEloDelta[s.name] ?? 0;
                          const rounds = monthlyRoundsPlayed?.[s.name] ?? 0;
                          const wd = rounds > 0 ? weightedDelta(d, rounds) : 0;
                          return (
                            <span
                              className="shrink-0"
                              style={{
                                fontSize: "var(--text-xs)",
                                fontWeight: "var(--font-weight-semibold)",
                                fontFamily: FONT,
                                color: wd > 0 ? "var(--success)" : wd < 0 ? "var(--destructive)" : "var(--muted-foreground)",
                              }}
                              title={`Δ ${d > 0 ? "+" : ""}${d} / √${rounds}`}
                            >
                              {wd > 0 ? "+" : ""}{wd.toFixed(1)}
                            </span>
                          );
                        })() : eloHistory[s.name] && eloHistory[s.name].length >= 2 && (
                          <div className="shrink-0">
                            <EloSparkline data={eloHistory[s.name]} width={36} height={14} strokeWidth={1} />
                          </div>
                        )}
                        {!isSeeded && (
                          <span
                            className="px-1 py-0.5 rounded-full shrink-0"
                            style={{ fontSize: 10, fontWeight: "var(--font-weight-semibold)", background: "color-mix(in srgb, var(--muted-foreground) 12%, transparent)", color: "var(--muted-foreground)", fontFamily: FONT }}
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
                            style={{ fontSize: 10, fontWeight: "var(--font-weight-bold)", background: "color-mix(in srgb, var(--primary) 15%, transparent)", color: "var(--primary)", fontFamily: FONT }}
                          >
                            🏆{s.tournamentWins}
                          </span>
                        )}
                        {hasStreakData && s.currentStreak >= 2 && (
                          <span
                            className="flex items-center gap-0.5 px-1 py-0.5 rounded-full shrink-0"
                            style={{ fontSize: 10, fontWeight: "var(--font-weight-semibold)", background: "var(--warning)", color: "var(--warning-foreground)" }}
                          >
                            🔥{s.currentStreak}
                          </span>
                        )}
                        {hasStreakData && s.coldStreak >= 2 && (
                          <span
                            className="flex items-center gap-0.5 px-1 py-0.5 rounded-full shrink-0"
                            style={{ fontSize: 10, fontWeight: "var(--font-weight-semibold)", background: "var(--info)", color: "var(--info-foreground)" }}
                          >
                            🥶{s.coldStreak}
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
                        <span className="text-border" style={{ fontSize: 10 }}>·</span>
                        <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                          {s.wins}V {s.finals}F {s.gamesPlayed}S
                        </span>
                        <span className="text-border" style={{ fontSize: 10 }}>·</span>
                        <span className="text-primary shrink-0" style={{ fontSize: "var(--text-xs)", fontFamily: FONT, fontWeight: "var(--font-weight-semibold)" }}>
                          {s.bwp.toFixed(0)}%
                        </span>
                        <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                          FV {s.vfPct.toFixed(0)}%
                        </span>
                        {hasFormData && (
                          <div className="ml-auto shrink-0">
                            <FormDots form={s.recentForm} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );

                return (
                  <>
                    {/* ── Seeded section ── */}
                    {seeded.length > 0 && (
                      <div
                        className="flex items-center gap-2 px-4 py-2 border-b border-border"
                        style={{
                          background: "color-mix(in srgb, var(--success) 6%, var(--surface-container))",
                          fontFamily: FONT,
                        }}
                      >
                        <span style={{ fontSize: "13px", lineHeight: 1 }}>🎯</span>
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
                          fontFamily: FONT,
                          marginTop: seeded.length > 0 ? 2 : 0,
                        }}
                      >
                        <span style={{ fontSize: "13px", lineHeight: 1 }}>📋</span>
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
                          fontFamily: FONT,
                          marginTop: (seeded.length > 0 || unseeded.length > 0) ? 2 : 0,
                        }}
                      >
                        <span style={{ fontSize: "13px", lineHeight: 1 }}>💤</span>
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
                        <div key={s.name}>
                          {/* Desktop row — inactive */}
                          <div
                            className="hidden md:grid px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer items-center opacity-50"
                            style={{
                              gridTemplateColumns: [
                                "36px",
                                "1fr",
                                "64px",
                                hasFormData ? "90px" : "",
                                "72px",
                                "80px",
                                "64px",
                                "64px",
                                "80px",
                              ].filter(Boolean).join(" "),
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
                                  fontFamily: FONT,
                                }}
                              >
                                💤 {weeksAgo != null ? `${weeksAgo}v sedan` : "aldrig"}
                              </span>
                              <span
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shrink-0"
                                style={{
                                  fontSize: "var(--text-xs)",
                                  fontWeight: "var(--font-weight-semibold)",
                                  background: "color-mix(in srgb, var(--destructive) 15%, transparent)",
                                  color: "var(--destructive)",
                                  fontFamily: FONT,
                                }}
                              >
                                📉 {eloRatings[s.name]?.elo ?? ELO_START} Elo
                              </span>
                            </div>
                            <div className="flex items-center justify-center">
                              {eloHistory[s.name] && eloHistory[s.name].length >= 2 ? (
                                <EloSparkline data={eloHistory[s.name]} width={56} height={20} />
                              ) : (
                                <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>—</span>
                              )}
                            </div>
                            {hasFormData && <div />}
                            <span className="text-muted-foreground text-right flex items-center justify-end" style={{ fontSize: "var(--text-base)" }}>{s.wins}</span>
                            <span className="text-muted-foreground text-right flex items-center justify-end" style={{ fontSize: "var(--text-base)" }}>{s.finals}</span>
                            <span className="text-muted-foreground text-right flex items-center justify-end" style={{ fontSize: "var(--text-label)" }}>{s.bwp.toFixed(1)}%</span>
                            <span className="text-muted-foreground text-right flex items-center justify-end" style={{ fontSize: "var(--text-label)" }}>{s.finalPct.toFixed(1)}%</span>
                            <span className="text-muted-foreground text-right flex items-center justify-end" style={{ fontSize: "var(--text-label)" }}>{s.vfPct.toFixed(1)}%</span>
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
                                  fontFamily: FONT,
                                }}
                              >
                                {s.name}
                              </span>
                              <span
                                className="px-1 py-0.5 rounded-full shrink-0"
                                style={{ fontSize: 10, fontWeight: "var(--font-weight-semibold)", background: "color-mix(in srgb, var(--muted-foreground) 12%, transparent)", color: "var(--muted-foreground)", fontFamily: FONT }}
                              >
                                💤 {weeksAgo != null ? `${weeksAgo}v` : "—"}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            </div>
                            <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 mt-1 ml-8">
                              <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                                {s.wins}V {s.finals}F {s.gamesPlayed}S
                              </span>
                              <span className="text-border" style={{ fontSize: 10 }}>·</span>
                              <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                                {s.bwp.toFixed(0)}%
                              </span>
                              <span className="text-border" style={{ fontSize: 10 }}>·</span>
                              <span className="shrink-0" style={{ fontSize: "var(--text-xs)", fontFamily: FONT, color: "var(--destructive)" }}>
                                📉 {eloRatings[s.name]?.elo ?? ELO_START}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </>
          )}
      </div>
    </>
  );
}
