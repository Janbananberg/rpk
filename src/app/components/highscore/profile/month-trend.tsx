import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { formatMonthLabel } from "../../../lib/dates";
import type { PlayerStats } from "../../../lib/stats";

interface ProfileMonthTrendProps {
  prevPlayerStats: PlayerStats | null;
  selectedPlayer: PlayerStats;
  selectedMonth: string;
  setDevSectionOpen: React.Dispatch<React.SetStateAction<boolean>>;
  devSectionOpen: boolean;
}

export function ProfileMonthTrend({
  prevPlayerStats,
  selectedPlayer,
  selectedMonth,
  setDevSectionOpen,
  devSectionOpen,
}: ProfileMonthTrendProps) {
  return (
    <>
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
                  style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  Jämfört med {prevMonthLabel}
                </span>
              </div>
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{
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
                      style={{ fontSize: "var(--text-label)" }}
                    >
                      {row.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      style={{
                        fontSize: "var(--text-label)",
                        fontWeight: "var(--font-weight-bold)",
                        color: row.delta > 0 ? "var(--success)" : "var(--destructive)",
                      }}
                    >
                      {row.delta > 0 ? "+" : ""}{row.delta.toFixed(1)}%
                    </span>
                    <span
                      className="text-muted-foreground"
                      style={{ fontSize: "var(--text-xs)" }}
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
                      style={{ fontSize: "var(--text-label)" }}
                    >
                      {row.label}
                    </span>
                  </div>
                  <span
                    className="tabular-nums"
                    style={{
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
    </>
  );
}
