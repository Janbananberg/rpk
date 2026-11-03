import { motion } from "motion/react";
import type { PlayerStats } from "../../../lib/stats";
import { FONT } from "../constants";

interface ProfileStatsGridProps {
  selectedPlayer: PlayerStats;
  prevPlayerStats: PlayerStats | null;
  sessionAttendance: Record<string, { attended: number; total: number; rate: number; }>;
}

export function ProfileStatsGrid({
  selectedPlayer,
  prevPlayerStats,
  sessionAttendance,
}: ProfileStatsGridProps) {
  return (
    <>
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
    </>
  );
}
