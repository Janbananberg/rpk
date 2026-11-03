import type { HistoricalStats } from "../components/api";

// The historical baseline data originates from March 2026
export const HISTORICAL_DATA_MONTH = "2026-03";

// ── Archived monthly stats (aggregate data for months without session-level tracking) ──
// These months only have summary stats — no individual game sessions.
export const ARCHIVED_MONTH_STATS: Record<string, HistoricalStats> = {
  "2026-01": {
    "Eetu": { wins: 66, finals: 87, gamesPlayed: 163 },
    "Hertsö-Waddlner 💅": { wins: 40, finals: 61, gamesPlayed: 117 },
    "Hertsö-Waddlner 🫒": { wins: 40, finals: 61, gamesPlayed: 117 },
    "Mr Nyberg 🚬": { wins: 30, finals: 61, gamesPlayed: 150 },
    "Kesokungen 🏠": { wins: 21, finals: 31, gamesPlayed: 57 },
    "Robert": { wins: 18, finals: 42, gamesPlayed: 149 },
    "Lodnert": { wins: 12, finals: 23, gamesPlayed: 75 },
    "Tarzan Ibrahimović": { wins: 10, finals: 11, gamesPlayed: 23 },
    "Alexjander 🐣 (retired)": { wins: 6, finals: 33, gamesPlayed: 158 },
    "dr drä och mr hyde - Provocateur👹": { wins: 4, finals: 18, gamesPlayed: 98 },
    "dr drä, Provocateur👹": { wins: 4, finals: 18, gamesPlayed: 98 },
    "🧨dirty dirty Linus": { wins: 4, finals: 7, gamesPlayed: 38 },
    "Björn": { wins: 3, finals: 23, gamesPlayed: 112 },
    "Jonken": { wins: 2, finals: 20, gamesPlayed: 180 },
    "Jonte": { wins: 2, finals: 12, gamesPlayed: 64 },
    "OK Renen": { wins: 1, finals: 10, gamesPlayed: 27 },
    "Daniel K": { wins: 1, finals: 2, gamesPlayed: 11 },
    "Andreas S": { wins: 1, finals: 1, gamesPlayed: 21 },
    "Jerker": { wins: 1, finals: 1, gamesPlayed: 7 },
    "Patrik": { wins: 0, finals: 1, gamesPlayed: 21 },
    "Mattias": { wins: 0, finals: 0, gamesPlayed: 0 },
    "Jawe": { wins: 0, finals: 0, gamesPlayed: 0 },
    "Johan E": { wins: 0, finals: 0, gamesPlayed: 0 },
    "JonteOH": { wins: 0, finals: 0, gamesPlayed: 0 },
    "Susanne": { wins: 0, finals: 0, gamesPlayed: 0 },
  },
  "2026-02": {
    "Hertsö-Waddlner 💅": { wins: 48, finals: 59, gamesPlayed: 99 },
    "Hertsö-Waddlner 🫒": { wins: 48, finals: 59, gamesPlayed: 99 },
    "Eetu": { wins: 24, finals: 35, gamesPlayed: 56 },
    "Mr Nyberg 🚬": { wins: 13, finals: 43, gamesPlayed: 72 },
    "Robert": { wins: 10, finals: 12, gamesPlayed: 35 },
    "Alexjander 🐣 (retired)": { wins: 9, finals: 26, gamesPlayed: 64 },
    "Lodnert": { wins: 4, finals: 6, gamesPlayed: 24 },
    "Jonte": { wins: 4, finals: 20, gamesPlayed: 53 },
    "Jonken": { wins: 3, finals: 9, gamesPlayed: 78 },
    "Björn": { wins: 1, finals: 8, gamesPlayed: 33 },
    "dr drä och mr hyde - Provocateur👹": { wins: 1, finals: 10, gamesPlayed: 87 },
    "dr drä, Provocateur👹": { wins: 1, finals: 10, gamesPlayed: 87 },
    "OK Renen": { wins: 0, finals: 3, gamesPlayed: 9 },
    "🧨dirty dirty Linus": { wins: 0, finals: 3, gamesPlayed: 19 },
    "Daniel K": { wins: 0, finals: 0, gamesPlayed: 0 },
    "Andreas S": { wins: 0, finals: 0, gamesPlayed: 0 },
    "Patrik": { wins: 0, finals: 0, gamesPlayed: 0 },
    "Mattias": { wins: 0, finals: 0, gamesPlayed: 0 },
    "Jawe": { wins: 0, finals: 0, gamesPlayed: 0 },
    "Johan E": { wins: 0, finals: 0, gamesPlayed: 0 },
    "Jerker": { wins: 0, finals: 0, gamesPlayed: 0 },
    "Kesokungen 🏠": { wins: 0, finals: 0, gamesPlayed: 0 },
    "JonteOH": { wins: 0, finals: 0, gamesPlayed: 0 },
    "Tarzan Ibrahimović": { wins: 0, finals: 0, gamesPlayed: 0 },
    "Susanne": { wins: 0, finals: 0, gamesPlayed: 0 },
  },
};

// All months that have archived stats (no session-level data, only aggregates)
export const ARCHIVED_STAT_MONTHS = Object.keys(ARCHIVED_MONTH_STATS);
