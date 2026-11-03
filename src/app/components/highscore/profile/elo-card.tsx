import { TrendingUp } from "lucide-react";
import { computePlayerPercentile, getCSGORank } from "../../../lib/rank";
import { SEED_MIN_ROUNDS, weightedDelta } from "../../../lib/elo";
import type { EloEntry } from "../../../lib/elo";
import type { PlayerStats } from "../../../lib/stats";
import { FONT } from "../constants";
import { EloSparkline } from "../elo-sparkline";

interface ProfileEloCardProps {
  eloRatings: Record<string, EloEntry>;
  selectedPlayer: PlayerStats;
  isMonthView: boolean;
  monthlyEloDelta: Record<string, number> | undefined;
  stats: PlayerStats[];
  monthlyRoundsPlayed: Record<string, number> | undefined;
  eloHistory: Record<string, number[]>;
}

export function ProfileEloCard({
  eloRatings,
  selectedPlayer,
  isMonthView,
  monthlyEloDelta,
  stats,
  monthlyRoundsPlayed,
  eloHistory,
}: ProfileEloCardProps) {
  return (
    <>
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
    </>
  );
}
