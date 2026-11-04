import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { GameSession } from "./api";
import { CalendarDays, ChevronDown } from "lucide-react";

const FONT = "'Titillium Web', sans-serif";

/** Strip leading emoji(s) from a player name */
function stripEmoji(name: string): string {
  return name.replace(/^(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}|\u200d|\ufe0f|[\u{1f3fb}-\u{1f3ff}])+\s*/gu, "").trim();
}

// ── H2H Matrix Component ──
interface H2HRecord {
  wins: number;
  losses: number;
}

interface PlayerStatsMinimal {
  name: string;
  h2h: Record<string, H2HRecord>;
  wins: number;
}

export function H2HMatrix({ stats }: { stats: PlayerStatsMinimal[] }) {
  // Only show players with H2H data
  const matrixPlayers = useMemo(() => {
    return stats
      .filter((s) => Object.keys(s.h2h).length > 0)
      .sort((a, b) => b.wins - a.wins);
  }, [stats]);

  const [expanded, setExpanded] = useState(false);
  const displayPlayers = expanded ? matrixPlayers : matrixPlayers.slice(0, 10);

  if (matrixPlayers.length < 2) {
    return (
      <div
        className="p-6 text-center text-muted-foreground"
        style={{ fontFamily: FONT, fontSize: "var(--text-base)" }}
      >
        Behöver minst 2 spelare med finalmöten för att visa matrisen
      </div>
    );
  }

  // Short display name
  const shortName = (name: string) => {
    const stripped = stripEmoji(name).trim();
    // Take first word, max 6 chars
    const first = stripped.split(" ")[0];
    return first.length > 7 ? first.slice(0, 6) + "." : first;
  };

  // Resolve the H2H between two players (handling name matching)
  const getH2H = (p1: PlayerStatsMinimal, p2Name: string): H2HRecord | null => {
    // Direct match
    if (p1.h2h[p2Name]) return p1.h2h[p2Name];
    // Try stripped match
    const stripped2 = stripEmoji(p2Name).trim();
    for (const [opp, record] of Object.entries(p1.h2h)) {
      if (stripEmoji(opp).trim() === stripped2) return record;
    }
    return null;
  };

  // Color intensity based on win rate
  const getCellStyle = (record: H2HRecord | null): React.CSSProperties => {
    if (!record || (record.wins + record.losses) === 0) {
      return { background: "var(--surface-container-lowest)", color: "var(--muted-foreground)" };
    }
    const total = record.wins + record.losses;
    const winRate = record.wins / total;
    if (winRate > 0.65) return { background: "color-mix(in srgb, var(--success) 25%, var(--surface-container))", color: "var(--success)" };
    if (winRate > 0.5) return { background: "color-mix(in srgb, var(--success) 12%, var(--surface-container))", color: "var(--success)" };
    if (winRate < 0.35) return { background: "color-mix(in srgb, var(--destructive) 20%, var(--surface-container))", color: "var(--destructive)" };
    if (winRate < 0.5) return { background: "color-mix(in srgb, var(--destructive) 10%, var(--surface-container))", color: "var(--destructive)" };
    return { background: "color-mix(in srgb, var(--warning) 12%, var(--surface-container))", color: "var(--warning)" };
  };

  return (
    <div>
      <div className="overflow-x-auto -mx-4 px-4">
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: displayPlayers.length * 48 + 80 }}>
          <thead>
            <tr>
              <th
                className="sticky left-0 z-10 text-left px-2 py-2"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-xs)",
                  color: "var(--muted-foreground)",
                  background: "var(--surface-container)",
                  fontWeight: "var(--font-weight-semibold)",
                  minWidth: 80,
                }}
              >
                VS
              </th>
              {displayPlayers.map((p) => (
                <th
                  key={p.name}
                  className="px-1 py-2 text-center"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-xs)",
                    color: "var(--muted-foreground)",
                    fontWeight: "var(--font-weight-normal)",
                    writingMode: "vertical-lr",
                    transform: "rotate(180deg)",
                    whiteSpace: "nowrap",
                    height: 70,
                  }}
                >
                  {shortName(p.name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayPlayers.map((row) => (
              <tr key={row.name}>
                <td
                  className="sticky left-0 z-10 px-2 py-1.5 truncate"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-xs)",
                    color: "var(--foreground)",
                    fontWeight: "var(--font-weight-semibold)",
                    background: "var(--surface-container)",
                    maxWidth: 80,
                  }}
                  title={row.name}
                >
                  {shortName(row.name)}
                </td>
                {displayPlayers.map((col) => {
                  if (row.name === col.name) {
                    return (
                      <td
                        key={col.name}
                        className="text-center"
                        style={{
                          background: "var(--surface-container-high)",
                          width: 48,
                          height: 36,
                          fontFamily: FONT,
                          fontSize: "var(--text-xs)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        —
                      </td>
                    );
                  }
                  const record = getH2H(row, col.name);
                  const cellStyle = getCellStyle(record);
                  return (
                    <td
                      key={col.name}
                      className="text-center"
                      style={{
                        ...cellStyle,
                        width: 48,
                        height: 36,
                        fontFamily: FONT,
                        fontSize: "var(--text-xs)",
                        fontWeight: record && (record.wins + record.losses) > 0 ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                        borderRight: "1px solid var(--border)",
                        borderBottom: "1px solid var(--border)",
                      }}
                      title={record ? `${stripEmoji(row.name)} vs ${stripEmoji(col.name)}: ${record.wins}-${record.losses}` : "Inga möten"}
                    >
                      {record && (record.wins + record.losses) > 0
                        ? `${record.wins}-${record.losses}`
                        : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {matrixPlayers.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1.5 mx-auto text-primary cursor-pointer hover:underline"
          style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
        >
          <ChevronDown className="w-3.5 h-3.5" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }} />
          {expanded ? "Visa färre" : `Visa alla (${matrixPlayers.length})`}
        </button>
      )}
    </div>
  );
}

// ── Weekday Heatmap Component (GitHub-style) ──
const WEEKDAY_SHORT = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
const WEEKDAY_MAP = [6, 0, 1, 2, 3, 4, 5]; // JS Sunday=0, we want Mon=0
const TIME_SLOTS = ["07–09", "09–11", "11–13", "13–15", "15–17"];
const TIME_SLOT_RANGES: [number, number][] = [[7, 9], [9, 11], [11, 13], [13, 15], [15, 17]];

export function WeekdayHeatmap({ sessions }: { sessions: GameSession[] }) {
  // Count rounds per weekday+timeslot
  const heatData = useMemo(() => {
    // grid[weekday][timeslot] = round count
    const grid: number[][] = Array.from({ length: 7 }, () => Array(TIME_SLOTS.length).fill(0));
    let maxVal = 0;

    for (const session of sessions) {
      const d = new Date(session.date);
      const dayIdx = WEEKDAY_MAP[d.getDay()]; // Convert to Mon=0
      const hour = d.getHours();

      // Find matching time slot
      let slotIdx = -1;
      for (let i = 0; i < TIME_SLOT_RANGES.length; i++) {
        if (hour >= TIME_SLOT_RANGES[i][0] && hour < TIME_SLOT_RANGES[i][1]) {
          slotIdx = i;
          break;
        }
      }
      if (slotIdx === -1) continue;

      const roundCount = session.rounds.length;
      grid[dayIdx][slotIdx] += roundCount;
      if (grid[dayIdx][slotIdx] > maxVal) maxVal = grid[dayIdx][slotIdx];
    }

    return { grid, maxVal };
  }, [sessions]);

  if (heatData.maxVal === 0) {
    return (
      <div
        className="p-6 text-center text-muted-foreground"
        style={{ fontFamily: FONT, fontSize: "var(--text-base)" }}
      >
        Inga speltillfällen med tidsstämplar att visa
      </div>
    );
  }

  const getOpacity = (val: number) => {
    if (val === 0) return 0;
    return 0.15 + (val / heatData.maxVal) * 0.85;
  };

  // Find peak
  let peakDay = 0, peakSlot = 0, peakVal = 0;
  for (let d = 0; d < 7; d++) {
    for (let s = 0; s < TIME_SLOTS.length; s++) {
      if (heatData.grid[d][s] > peakVal) {
        peakVal = heatData.grid[d][s];
        peakDay = d;
        peakSlot = s;
      }
    }
  }

  // Total per weekday
  const dayTotals = heatData.grid.map((row) => row.reduce((a, b) => a + b, 0));
  const totalRounds = dayTotals.reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* Heatmap grid */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div style={{ minWidth: 360 }}>
          {/* Time slot headers */}
          <div className="flex items-center mb-1" style={{ paddingLeft: 44 }}>
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot}
                className="flex-1 text-center"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-xs)",
                  color: "var(--muted-foreground)",
                }}
              >
                {slot}
              </div>
            ))}
          </div>

          {/* Rows */}
          {WEEKDAY_SHORT.map((day, dayIdx) => (
            <div key={day} className="flex items-center gap-1 mb-1">
              <span
                className="w-10 text-right pr-1 shrink-0"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-xs)",
                  color: "var(--muted-foreground)",
                }}
              >
                {day}
              </span>
              {TIME_SLOTS.map((_, slotIdx) => {
                const val = heatData.grid[dayIdx][slotIdx];
                const isPeak = dayIdx === peakDay && slotIdx === peakSlot;
                return (
                  <div
                    key={slotIdx}
                    className="flex-1 flex items-center justify-center rounded-sm transition-all"
                    style={{
                      height: 32,
                      background:
                        val > 0
                          ? `color-mix(in srgb, var(--primary) ${Math.round(getOpacity(val) * 100)}%, var(--surface-container-lowest))`
                          : "var(--surface-container-lowest)",
                      border: isPeak ? "2px solid var(--primary)" : "1px solid var(--border)",
                      borderRadius: "var(--radius-card)",
                    }}
                    title={`${day} ${TIME_SLOTS[slotIdx]}: ${val} rundor`}
                  >
                    {val > 0 && (
                      <span
                        style={{
                          fontFamily: FONT,
                          fontSize: "var(--text-xs)",
                          fontWeight: isPeak ? "var(--font-weight-bold)" : "var(--font-weight-semibold)",
                          color: getOpacity(val) > 0.5 ? "var(--primary-foreground)" : "var(--primary)",
                        }}
                      >
                        {val}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between mt-4 px-1">
        <span style={{ fontFamily: FONT, fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
          Flest:{" "}
          <span style={{ color: "var(--primary)", fontWeight: "var(--font-weight-semibold)" }}>
            {WEEKDAY_SHORT[peakDay]} {TIME_SLOTS[peakSlot]}
          </span>
          {" "}({peakVal} rundor)
        </span>
        <span style={{ fontFamily: FONT, fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
          Totalt: {totalRounds} rundor
        </span>
      </div>

      {/* Day distribution bar */}
      <div className="mt-3 flex gap-0.5 rounded-full overflow-hidden" style={{ height: 8 }}>
        {dayTotals.map((val, i) => (
          <div
            key={i}
            style={{
              flex: val || 0.5,
              background: val > 0 ? "var(--primary)" : "var(--surface-container-lowest)",
              opacity: val > 0 ? 0.3 + (val / Math.max(...dayTotals)) * 0.7 : 0.15,
            }}
            title={`${WEEKDAY_SHORT[i]}: ${val} rundor`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1 px-0.5">
        {WEEKDAY_SHORT.map((d, i) => (
          <span
            key={d}
            style={{
              fontFamily: FONT,
              fontSize: 9,
              color: dayTotals[i] === Math.max(...dayTotals) ? "var(--primary)" : "var(--muted-foreground)",
              fontWeight: dayTotals[i] === Math.max(...dayTotals) ? "var(--font-weight-bold)" : "var(--font-weight-normal)",
            }}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Insight Section Wrapper ──
export function InsightsSection({
  sessions,
}: {
  sessions: GameSession[];
  players: string[];
  stats: PlayerStatsMinimal[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 md:mt-10 rounded-lg border border-border overflow-hidden"
      style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 md:px-4 py-3 border-b border-border">
        <CalendarDays className="w-3.5 h-3.5 text-primary" />
        <span
          style={{
            fontFamily: FONT,
            fontSize: "var(--text-label)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--foreground)",
          }}
        >
          Speltider
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <WeekdayHeatmap sessions={sessions} />
      </div>
    </motion.div>
  );
}