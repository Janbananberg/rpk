import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Trophy,
  Plus,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowLeft,
  Check,
  Trash2,
  X,
  Flame,
  Swords,
  Zap,
  Crown,
  Star,
  Sparkles,
  BarChart3,
  Expand,
  Pencil,
  CalendarDays,
  ArrowUpDown,
  UserMinus,
  Activity,
  Sun,
  Coffee,
  Archive,
  Grid3X3 as Grid3X3Icon,
  TrendingUp,
  TrendingDown,
  Info,
  Shield,
  Target,
  Award,
  Share2,
  Download,
  Lock,
  Eye,
  EyeOff,
  Snowflake,
  Undo2,
  Code2,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { AchievementDisplay } from "./achievement-display";
import { useNavigationGuard } from "./navigation-guard";
import { ConfirmDialog } from "./confirm-dialog";
import type { GameSession, GameRound, HistoricalStats, PlayerCards } from "./api";
import {
  fetchHighscorePlayers,
  saveHighscorePlayers,
  fetchHighscoreSessions,
  saveHighscoreSessions,
  fetchArchivedSeasons,
  saveArchivedSeasons,
  fetchHistoricalStats,
  saveHistoricalStats,
  fetchMonthlySessions,
  saveMonthlySessions,
  deleteMonthlySession,
  fetchMonthList,
  saveMonthList,
  discoverMonths,
  fetchPlayerCards,
  savePlayerCards,
  fetchSeedStatus,
  markSeeded,
  removePlayerFromServer,
  fetchTournamentHistory,
  fetchPlayerAchievements,
  savePlayerAchievements,
  fetchEloResetTimestamp,
  resetEloRatings,
} from "./api";
import type { TournamentHistoryEntry, SavedPlayerAchievements, SavedAchievement } from "./api";
import { API_BASE } from "./api";
import { H2HMatrix, WeekdayHeatmap } from "./highscore-insights";

const FONT = "'Titillium Web', sans-serif";

/** Strip leading emoji(s) from a player name to get the plain text part */
function stripEmoji(name: string | null | undefined): string {
  if (!name) return "";
  return name.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f\u{1f3fb}-\u{1f3ff}]+\s*/gu, "").trim();
}

// The historical baseline data originates from March 2026
const HISTORICAL_DATA_MONTH = "2026-03";

// ── Archived monthly stats (aggregate data for months without session-level tracking) ──
// These months only have summary stats — no individual game sessions.
const ARCHIVED_MONTH_STATS: Record<string, HistoricalStats> = {
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
const ARCHIVED_STAT_MONTHS = Object.keys(ARCHIVED_MONTH_STATS);

const PLAYER_EMOJIS = [
  "🏓", "🔥", "🧀", "⚡", "🎯", "💀", "🐐", "🦊",
  "🧊", "🌪️", "🎪", "🍕", "🦈", "🐍", "🎸", "🚀",
  "👑", "🎰", "🐸", "🍻", "💎", "🦁", "🐉", "🌶️",
  "🤖", "🧨", "🎩", "🦅", "🐝", "🏴‍☠️", "⭐", "🍀",
];

type SortTab = "vinster" | "bwp" | "finalprocent" | "vf" | "graf" | "finaler" | "kort" | "elo";

/** Get current month as "YYYY-MM" */
function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Format "YYYY-MM" to a human-readable Swedish label, e.g. "Mars 2026" */
function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  const months = [
    "Januari", "Februari", "Mars", "April", "Maj", "Juni",
    "Juli", "Augusti", "September", "Oktober", "November", "December",
  ];
  return `${months[parseInt(m, 10) - 1]} ${year}`;
}

/** Short month label, e.g. "Mar 26" */
function formatMonthShort(month: string): string {
  const [year, m] = month.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} ${year.slice(2)}`;
}

type MonthView = string | "total"; // "YYYY-MM" or "total"

interface PlayerStats {
  name: string;
  wins: number;
  finals: number;
  gamesPlayed: number;
  bwp: number;
  finalPct: number;
  vfPct: number;
  currentStreak: number;
  bestStreak: number;
  coldStreak: number;
  worstColdStreak: number;
  recentForm: ("W" | "L" | "F")[];
  allFinalResults: ("W" | "F")[];
  nemesis: string | null;
  prey: string | null;
  h2h: Record<string, { wins: number; losses: number }>;
  yellowCards: number;
  redCards: number;
  tournamentWins: number;
  tournamentEntries: TournamentHistoryEntry[];
}

/** Match a tournament player name to a highscore player name (fuzzy) */
function matchPlayerName(tournamentName: string, highscoreName: string): boolean {
  const tn = tournamentName.toLowerCase().trim();
  const hn = stripEmoji(highscoreName).toLowerCase().trim();
  if (tn === hn) return true;
  if (hn.startsWith(tn) || tn.startsWith(hn)) return true;
  // Handle minor spelling differences (e.g. "Herstö" vs "Hertsö")
  const normalize = (s: string) => s.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
  const ntn = normalize(tn);
  const nhn = normalize(hn);
  if (ntn === nhn) return true;
  // Levenshtein-like: allow 1-char difference for names > 4 chars
  if (ntn.length > 4 && nhn.length > 4 && Math.abs(ntn.length - nhn.length) <= 1) {
    let diffs = 0;
    const shorter = ntn.length <= nhn.length ? ntn : nhn;
    const longer = ntn.length <= nhn.length ? nhn : ntn;
    let j = 0;
    for (let i = 0; i < longer.length && j < shorter.length; i++) {
      if (longer[i] !== shorter[j]) {
        diffs++;
        if (longer.length > shorter.length) continue; // skip char in longer
      }
      j++;
    }
    diffs += shorter.length - j;
    if (diffs <= 1) return true;
  }
  return false;
}

function computeStats(sessions: GameSession[], players: string[], historicalStats: HistoricalStats = {}, playerCards: PlayerCards = {}, tournamentHistory: TournamentHistoryEntry[] = []): PlayerStats[] {
  const statsMap: Record<
    string,
    {
      wins: number;
      finals: number;
      gamesPlayed: number;
      results: { date: number; result: "W" | "L" | "F" }[];
      h2h: Record<string, { wins: number; losses: number }>;
    }
  > = {};

  for (const p of players) {
    statsMap[p] = { wins: 0, finals: 0, gamesPlayed: 0, results: [], h2h: {} };
  }

  // Sort sessions chronologically for streak calculation
  const sortedSessions = [...sessions].sort((a, b) => a.date - b.date);

  for (const session of sortedSessions) {
    // Build the full participant set: session.players PLUS anyone who
    // appears as a finalist or winner (guards against data inconsistency
    // where a player was in rounds but missing from session.players)
    const participantSet = new Set(session.players);
    for (const round of session.rounds) {
      for (const f of round.finalists) participantSet.add(f);
      if (round.winner) participantSet.add(round.winner);
    }
    const allParticipants = Array.from(participantSet);

    for (const round of session.rounds) {
      // Use per-round players if available, otherwise fall back to all session participants
      const roundParticipants = round.players ?? allParticipants;
      for (const p of roundParticipants) {
        if (!statsMap[p])
          statsMap[p] = { wins: 0, finals: 0, gamesPlayed: 0, results: [], h2h: {} };
        statsMap[p].gamesPlayed++;

        const isFinalist = round.finalists.includes(p);
        const isWinner = round.winner === p;

        if (isFinalist) statsMap[p].finals++;
        if (isWinner) statsMap[p].wins++;

        // Track result for form
        if (isWinner) {
          statsMap[p].results.push({ date: session.date, result: "W" });
        } else if (isFinalist) {
          statsMap[p].results.push({ date: session.date, result: "F" });
        } else {
          statsMap[p].results.push({ date: session.date, result: "L" });
        }

        // Track head-to-head for finalists
        if (isFinalist) {
          const opponent = round.finalists.find((f) => f !== p);
          if (opponent) {
            if (!statsMap[p].h2h[opponent]) statsMap[p].h2h[opponent] = { wins: 0, losses: 0 };
            if (isWinner) {
              statsMap[p].h2h[opponent].wins++;
            } else {
              statsMap[p].h2h[opponent].losses++;
            }
          }
        }
      }
    }
  }

  // Merge emoji-variant stats into canonical entries.
  // E.g. if sessions have "🎩 TESTKINGEN" but canonical list has "TESTKINGEN",
  // merge the emoji variant's stats into the canonical entry.
  const playerSet = new Set(players);
  const strippedToCanonical: Record<string, string> = {};
  for (const cp of players) {
    strippedToCanonical[stripEmoji(cp).trim()] = cp;
  }
  for (const [name, s] of Object.entries(statsMap)) {
    if (s.gamesPlayed > 0 && !playerSet.has(name)) {
      const stripped = stripEmoji(name).trim();
      const canonical = strippedToCanonical[stripped];
      if (canonical && canonical !== name) {
        // Merge into canonical entry
        console.log(`[Highscore] Merging stats for "${name}" into canonical "${canonical}"`);
        const target = statsMap[canonical];
        target.wins += s.wins;
        target.finals += s.finals;
        target.gamesPlayed += s.gamesPlayed;
        target.results.push(...s.results);
        // Sort results by date after merge so streaks compute correctly
        target.results.sort((a, b) => a.date - b.date);
        // Merge h2h
        for (const [opp, record] of Object.entries(s.h2h)) {
          if (!target.h2h[opp]) target.h2h[opp] = { wins: 0, losses: 0 };
          target.h2h[opp].wins += record.wins;
          target.h2h[opp].losses += record.losses;
        }
        // Zero out the variant so it doesn't appear separately
        s.gamesPlayed = 0;
        s.wins = 0;
        s.finals = 0;
      } else if (!canonical) {
        // No canonical match found – promote this session-only player to canonical
        console.log(`[Highscore] Promoting session-only player "${name}" to canonical (${s.gamesPlayed} games)`);
        playerSet.add(name);
        strippedToCanonical[stripped] = name;
      }
    }
  }

  // Include canonical players and any session-only players that couldn't be merged
  const allRelevant = new Set([...players, ...Object.keys(statsMap).filter((n) => statsMap[n].gamesPlayed > 0)]);
  return Object.entries(statsMap).filter(([name]) => allRelevant.has(name)).map(([name, s]) => {
    // Calculate current streak (consecutive wins from latest)
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    const finalResults = s.results.filter((r) => r.result === "W" || r.result === "F");
    for (let i = finalResults.length - 1; i >= 0; i--) {
      if (finalResults[i].result === "W") {
        if (i === finalResults.length - 1 || currentStreak > 0) currentStreak++;
      } else {
        break;
      }
    }
    // Calculate best streak
    for (const r of finalResults) {
      if (r.result === "W") {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Calculate cold streak (consecutive losses from latest)
    let coldStreak = 0;
    for (let i = finalResults.length - 1; i >= 0; i--) {
      if (finalResults[i].result === "F") {
        if (i === finalResults.length - 1 || coldStreak > 0) coldStreak++;
      } else {
        break;
      }
    }
    // Calculate worst cold streak
    let worstColdStreak = 0;
    let tempCold = 0;
    for (const r of finalResults) {
      if (r.result === "F") {
        tempCold++;
        worstColdStreak = Math.max(worstColdStreak, tempCold);
      } else {
        tempCold = 0;
      }
    }

    // Recent form: last 5 final appearances (W or F only — excludes rounds where player didn't reach the final)
    const recentForm = s.results
      .filter((r) => r.result === "W" || r.result === "F")
      .slice(-5)
      .map((r) => r.result);

    // All final results (unlimited) for achievements like Ice Age
    const allFinalResults = s.results
      .filter((r) => r.result === "W" || r.result === "F")
      .map((r) => r.result as "W" | "F");

    // Nemesis: opponent they lose to most in finals
    let nemesis: string | null = null;
    let nemesisLosses = 0;
    let prey: string | null = null;
    let preyWins = 0;
    for (const [opp, record] of Object.entries(s.h2h)) {
      if (record.losses > nemesisLosses) {
        nemesisLosses = record.losses;
        nemesis = opp;
      }
      if (record.wins > preyWins) {
        preyWins = record.wins;
        prey = opp;
      }
    }

    // Merge historical baseline stats (imported data from before session tracking)
    const hist = historicalStats[name] || { wins: 0, finals: 0, gamesPlayed: 0 };
    const totalWins = s.wins + hist.wins;
    const totalFinals = s.finals + hist.finals;
    const totalGP = s.gamesPlayed + hist.gamesPlayed;

    // Merge historical h2h data with session h2h
    const mergedH2H = { ...s.h2h };
    if (hist.h2h) {
      for (const [opp, record] of Object.entries(hist.h2h)) {
        if (!mergedH2H[opp]) mergedH2H[opp] = { wins: 0, losses: 0 };
        mergedH2H[opp].wins += record.wins;
        mergedH2H[opp].losses += record.losses;
      }
    }

    // Re-derive nemesis/prey including historical h2h when available
    let finalNemesis = nemesis;
    let finalNemesisLosses = nemesisLosses;
    let finalPrey = prey;
    let finalPreyWins = preyWins;
    if (hist.h2h) {
      for (const [opp, record] of Object.entries(mergedH2H)) {
        if (record.losses > finalNemesisLosses) {
          finalNemesisLosses = record.losses;
          finalNemesis = opp;
        }
        if (record.wins > finalPreyWins) {
          finalPreyWins = record.wins;
          finalPrey = opp;
        }
      }
    }

    return {
      name,
      wins: totalWins,
      finals: totalFinals,
      gamesPlayed: totalGP,
      bwp: totalGP > 0 ? (totalWins / totalGP) * 100 : 0,
      finalPct: totalGP > 0 ? (totalFinals / totalGP) * 100 : 0,
      vfPct: totalFinals > 0 ? (totalWins / totalFinals) * 100 : 0,
      currentStreak,    // only from new sessions
      bestStreak,       // only from new sessions
      coldStreak,       // only from new sessions
      worstColdStreak,  // only from new sessions
      recentForm,       // only from new sessions
      allFinalResults,  // all final results for achievements
      nemesis: finalNemesis,
      prey: finalPrey,
      h2h: mergedH2H,
      yellowCards: playerCards[name]?.yellow || 0,
      redCards: playerCards[name]?.red || 0,
      tournamentWins: tournamentHistory.filter((t) => matchPlayerName(t.champion, name)).length,
      tournamentEntries: tournamentHistory.filter((t) => matchPlayerName(t.champion, name)),
    };
  });
}

// ── Elo Rating System — "Elo-potten" ──
// Each player antes 3 Elo into a shared pot (N × 3).
// The two finalists split the pot — winner takes a bigger share, loser a smaller one.
// The split is determined by the Elo difference (expected score) between the finalists.
// Non-finalists lose their ante. The system is zero-sum.
// α = 0.35 controls how much the split favors the winner vs loser.
// Floor: each finalist always receives at least ante + 1 (guaranteed net +1).
const ELO_START = 1000;
const ELO_ANTE = 3;
const ELO_ALPHA = 0.35;
const ELO_UPSET_BONUS = 10;
const ELO_UPSET_THRESHOLD = 100;
const SEED_MIN_ROUNDS = 30;

/** Compute weighted delta: delta / sqrt(rounds) — rewards efficiency over volume */
export function weightedDelta(delta: number, rounds: number): number {
  if (rounds <= 0) return 0;
  return delta / Math.sqrt(rounds);
}

/** Compute pot distribution for a single round */
export function computePotDistribution(rWinner: number, rLoser: number, participantCount: number): { winnerDelta: number; loserDelta: number; pot: number; winnerShare: number; loserShare: number; eWinner: number; isUpset: boolean; upsetBonus: number } {
  const pot = participantCount * ELO_ANTE;
  const eWinner = 1 / (1 + Math.pow(10, (rLoser - rWinner) / 400));
  let winnerShare = pot * (0.5 + ELO_ALPHA * (1 - eWinner));
  let loserShare = pot - winnerShare;
  // Floor: finalist always gets at least ante + 1 (net +1)
  const minShare = ELO_ANTE + 1;
  if (loserShare < minShare) {
    loserShare = minShare;
    winnerShare = pot - loserShare;
  }
  // Upset bonus: +10 Elo per 100 Elo difference for the underdog winning
  const eloDiff = rLoser - rWinner; // positive means winner had lower Elo (underdog)
  const isUpset = eloDiff >= ELO_UPSET_THRESHOLD;
  const upsetBonus = isUpset ? Math.floor(eloDiff / ELO_UPSET_THRESHOLD) * ELO_UPSET_BONUS : 0;
  return {
    winnerDelta: Math.round(winnerShare - ELO_ANTE) + upsetBonus,
    loserDelta: Math.round(loserShare - ELO_ANTE),
    pot,
    winnerShare: Math.round(winnerShare),
    loserShare: Math.round(loserShare),
    eWinner,
    isUpset,
    upsetBonus,
  };
}

interface EloEntry {
  name: string;
  elo: number;
  peakElo: number;
  matches: number; // number of rounds participated in
  delta: number; // change from last round
}

const ELO_DECAY_PER_DAY = 15;
const ELO_DECAY_MIN = 700;
const INACTIVE_THRESHOLD_MS = 4 * 7 * 24 * 60 * 60 * 1000; // 4 weeks
// Fallback "registered since" date for decay — players who never played
// get decay calculated from this date instead of being exempt.
const ELO_DECAY_BASELINE_DATE = new Date("2026-02-01T00:00:00Z").getTime();

function computeLastPlayed(sessions: GameSession[]): Record<string, number> {
  const lp: Record<string, number> = {};
  for (const session of sessions) {
    for (const player of session.players) {
      lp[player] = Math.max(lp[player] ?? 0, session.date);
    }
    for (const round of session.rounds) {
      for (const f of round.finalists) {
        lp[f] = Math.max(lp[f] ?? 0, session.date);
      }
    }
  }
  return lp;
}

function applyEloDecay(ratings: Record<string, EloEntry>, lastPlayed: Record<string, number>, eloResetTimestamp?: number | null): Record<string, EloEntry> {
  const now = Date.now();
  const result: Record<string, EloEntry> = {};
  for (const [name, entry] of Object.entries(ratings)) {
    let lp = lastPlayed[name];
    if (!lp) {
      // Player never played — use the baseline date (Feb 1, 2026) for decay.
      // Their Elo is 1000 from start, but decay should still apply.
      lp = ELO_DECAY_BASELINE_DATE;
    }
    // If there's an Elo reset and the player last played before it,
    // use the reset timestamp as effective "last active" date so decay
    // starts from the reset rather than their ancient last match.
    if (eloResetTimestamp && lp < eloResetTimestamp) {
      lp = eloResetTimestamp;
    }
    if ((now - lp) <= INACTIVE_THRESHOLD_MS) {
      result[name] = entry;
      continue;
    }
    const daysInactive = Math.floor((now - lp - INACTIVE_THRESHOLD_MS) / (24 * 60 * 60 * 1000));
    const decay = daysInactive * ELO_DECAY_PER_DAY;
    const decayedElo = Math.max(ELO_DECAY_MIN, entry.elo - decay);
    result[name] = { ...entry, elo: decayedElo };
  }
  return result;
}

function computeElo(sessions: GameSession[], allPlayers?: string[], eloResetTimestamp?: number | null): Record<string, EloEntry> {
  const ratings: Record<string, { elo: number; peak: number; matches: number; delta: number }> = {};

  const ensure = (name: string) => {
    if (!ratings[name]) ratings[name] = { elo: ELO_START, peak: ELO_START, matches: 0, delta: 0 };
  };

  if (allPlayers) {
    for (const player of allPlayers) ensure(player);
  }

  const sorted = [...sessions].sort((a, b) => a.date - b.date);

  for (const session of sorted) {
    if (eloResetTimestamp && session.date < eloResetTimestamp) continue;

    for (const player of session.players) ensure(player);

    for (const round of session.rounds) {
      if (round.finalists.length !== 2 || !round.winner) continue;

      // Use per-round players if available, otherwise fall back to session players
      const roundPlayers = round.players ?? session.players;
      const N = roundPlayers.length;

      const [p1, p2] = round.finalists;
      const winner = round.winner;
      const loser = winner === p1 ? p2 : p1;

      // 1. All participants in this round pay ante
      for (const player of roundPlayers) {
        ensure(player);
        ratings[player].delta = -ELO_ANTE;
        ratings[player].matches++;
      }

      // 2. Compute pot distribution between finalists (use pre-ante ratings)
      const rWinner = ratings[winner].elo;
      const rLoser = ratings[loser].elo;
      const { winnerDelta, loserDelta } = computePotDistribution(rWinner, rLoser, N);

      // 3. Apply: non-finalists lose ante, finalists get pot share
      for (const player of roundPlayers) {
        if (player !== winner && player !== loser) {
          ratings[player].elo -= ELO_ANTE;
        }
      }
      ratings[winner].elo += winnerDelta;
      ratings[winner].delta = winnerDelta;

      ratings[loser].elo += loserDelta;
      ratings[loser].delta = loserDelta;

      // Update peaks
      for (const player of roundPlayers) {
        ratings[player].peak = Math.max(ratings[player].peak, ratings[player].elo);
      }
    }
  }

  const result: Record<string, EloEntry> = {};
  for (const [name, r] of Object.entries(ratings)) {
    result[name] = { name, elo: r.elo, peakElo: r.peak, matches: r.matches, delta: r.delta };
  }
  return result;
}

// ── Elo History (sparkline data) ──
function computeEloHistory(sessions: GameSession[], allPlayers?: string[], eloResetTimestamp?: number | null): Record<string, number[]> {
  const ratings: Record<string, number> = {};
  const history: Record<string, number[]> = {};
  const ensure = (name: string) => {
    if (ratings[name] === undefined) { ratings[name] = ELO_START; history[name] = [ELO_START]; }
  };
  if (allPlayers) {
    for (const player of allPlayers) ensure(player);
  }
  const sorted = [...sessions].sort((a, b) => a.date - b.date);
  for (const session of sorted) {
    if (eloResetTimestamp && session.date < eloResetTimestamp) continue;

    for (const player of session.players) ensure(player);

    for (const round of session.rounds) {
      if (round.finalists.length !== 2 || !round.winner) continue;
      const roundPlayers = round.players ?? session.players;
      const N = roundPlayers.length;
      const [p1, p2] = round.finalists;
      const winner = round.winner;
      const loser = winner === p1 ? p2 : p1;

      // Compute pot distribution (use pre-ante ratings)
      const rWinner = ratings[winner];
      const rLoser = ratings[loser];
      const { winnerDelta, loserDelta } = computePotDistribution(rWinner, rLoser, N);

      // Apply: non-finalists lose ante, finalists get pot share
      for (const player of roundPlayers) {
        ensure(player);
        if (player !== winner && player !== loser) {
          ratings[player] -= ELO_ANTE;
        }
      }
      ratings[winner] += winnerDelta;
      ratings[loser] += loserDelta;

      // Record history point for all participants in this round
      for (const player of roundPlayers) {
        history[player].push(ratings[player]);
      }
    }
  }
  return history;
}

// ── Revenge Meter ──
interface RevengeTarget {
  opponent: string;
  lastLossDate: number;
  lossStreak: number; // consecutive losses at the end
  totalLosses: number;
  totalWins: number;
}

function computeRevengeData(playerName: string, sessions: GameSession[]): RevengeTarget[] {
  // Build chronological list of results vs each opponent
  const sorted = [...sessions].sort((a, b) => a.date - b.date);
  const matchups: Record<string, { date: number; won: boolean }[]> = {};

  for (const session of sorted) {
    for (const round of session.rounds) {
      if (round.finalists.length !== 2 || !round.winner) continue;
      if (!round.finalists.includes(playerName)) continue;
      const opponent = round.finalists.find((f) => f !== playerName)!;
      if (!matchups[opponent]) matchups[opponent] = [];
      matchups[opponent].push({ date: session.date, won: round.winner === playerName });
    }
  }

  const targets: RevengeTarget[] = [];
  for (const [opp, results] of Object.entries(matchups)) {
    if (results.length === 0) continue;
    const last = results[results.length - 1];
    if (last.won) continue; // already avenged
    // Count consecutive losses at the end
    let streak = 0;
    for (let i = results.length - 1; i >= 0; i--) {
      if (!results[i].won) streak++;
      else break;
    }
    const totalWins = results.filter((r) => r.won).length;
    const totalLosses = results.filter((r) => !r.won).length;
    targets.push({ opponent: opp, lastLossDate: last.date, lossStreak: streak, totalLosses, totalWins });
  }
  // Sort by loss streak descending (biggest grudge first), then by recency
  targets.sort((a, b) => b.lossStreak - a.lossStreak || b.lastLossDate - a.lastLossDate);
  return targets;
}

// ── Season Summary ──
interface SeasonSummary {
  month: string;
  monthLabel: string;
  totalGames: number;
  totalFinals: number;
  totalSessions: number;
  mvp: { name: string; wins: number; bwp: number } | null;
  mostImproved: { name: string; eloDelta: number } | null;
  biggestUpset: { winner: string; loser: string; eloDiff: number; date: number } | null;
  superlatives: { name: string; title: string; emoji: string; detail: string }[];
  longestWinStreak: { name: string; streak: number } | null;
  rivalry: { player1: string; player2: string; meetings: number; record: string } | null;
  biggestDrop: { name: string; eloDelta: number } | null;
  busiestDay: { day: string; count: number } | null;
  avgFinalsPerSession: number;
}

function computeSeasonSummary(
  month: string,
  sessions: GameSession[],
  allSessionsBeforeMonth: GameSession[],
  players: string[],
  eloResetTimestamp?: number | null,
): SeasonSummary | null {
  if (sessions.length === 0) return null;

  const monthNames = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];
  const [yr, mo] = month.split("-");
  const monthLabel = `${monthNames[parseInt(mo, 10) - 1]} ${yr}`;

  // Basic counts
  let totalFinals = 0;
  let totalGames = 0;
  for (const s of sessions) { totalGames += s.players.length; totalFinals += s.rounds.length; }

  // Per-player stats for this month
  const pStats: Record<string, { wins: number; losses: number; finals: number; gamesPlayed: number }> = {};
  const ensure = (n: string) => { if (!pStats[n]) pStats[n] = { wins: 0, losses: 0, finals: 0, gamesPlayed: 0 }; };
  for (const s of sessions) {
    // Count gamesPlayed per round (respecting per-round player lists)
    const countedInSession = new Set<string>();
    for (const r of s.rounds) {
      const rp = r.players ?? s.players;
      for (const p of rp) { ensure(p); if (!countedInSession.has(p)) { pStats[p].gamesPlayed++; countedInSession.add(p); } }
    }
    // Fallback: if no rounds, count session players
    if (s.rounds.length === 0) { for (const p of s.players) { ensure(p); pStats[p].gamesPlayed++; } }
    for (const r of s.rounds) {
      if (r.finalists.length !== 2 || !r.winner) continue;
      for (const f of r.finalists) { ensure(f); pStats[f].finals++; }
      ensure(r.winner); pStats[r.winner].wins++;
      const loser = r.finalists.find((f) => f !== r.winner)!;
      ensure(loser); pStats[loser].losses++;
    }
  }

  // MVP: most wins (tie-break: best win%)
  let mvp: SeasonSummary["mvp"] = null;
  for (const [name, ps] of Object.entries(pStats)) {
    const bwp = ps.finals > 0 ? (ps.wins / ps.finals) * 100 : 0;
    if (!mvp || ps.wins > mvp.wins || (ps.wins === mvp.wins && bwp > mvp.bwp)) {
      mvp = { name, wins: ps.wins, bwp };
    }
  }

  // Most improved by Elo
  const eloBefore = computeElo(allSessionsBeforeMonth, undefined, eloResetTimestamp);
  const eloAfter = computeElo([...allSessionsBeforeMonth, ...sessions], undefined, eloResetTimestamp);
  let mostImproved: SeasonSummary["mostImproved"] = null;
  for (const name of Object.keys(pStats)) {
    if (pStats[name].finals < 2) continue; // need some activity
    const before = eloBefore[name]?.elo ?? 1000;
    const after = eloAfter[name]?.elo ?? 1000;
    const delta = after - before;
    if (!mostImproved || delta > mostImproved.eloDelta) {
      mostImproved = { name, eloDelta: delta };
    }
  }

  // Biggest upset: lowest-Elo player beating highest-Elo in a final
  let biggestUpset: SeasonSummary["biggestUpset"] = null;
  // Build running Elo as we go through the month
  const runningElo = computeElo(allSessionsBeforeMonth, undefined, eloResetTimestamp);
  const sortedSessions = [...sessions].sort((a, b) => a.date - b.date);
  for (const session of sortedSessions) {
    for (const round of session.rounds) {
      if (round.finalists.length !== 2 || !round.winner) continue;
      const [p1, p2] = round.finalists;
      const elo1 = runningElo[p1]?.elo ?? 1000;
      const elo2 = runningElo[p2]?.elo ?? 1000;
      const loser = round.finalists.find((f) => f !== round.winner)!;
      const winnerElo = round.winner === p1 ? elo1 : elo2;
      const loserElo = round.winner === p1 ? elo2 : elo1;
      const diff = loserElo - winnerElo; // positive = underdog won
      if (diff > 0 && (!biggestUpset || diff > biggestUpset.eloDiff)) {
        biggestUpset = { winner: round.winner, loser, eloDiff: diff, date: session.date };
      }
      // Update running Elo using pot system
      if (!runningElo[p1]) runningElo[p1] = { name: p1, elo: 1000, peakElo: 1000, matches: 0, delta: 0 };
      if (!runningElo[p2]) runningElo[p2] = { name: p2, elo: 1000, peakElo: 1000, matches: 0, delta: 0 };
      const N = session.players.length;
      const rW = runningElo[round.winner === p1 ? p1 : p2].elo;
      const rL = runningElo[round.winner === p1 ? p2 : p1].elo;
      const potResult = computePotDistribution(rW, rL, N);
      // Non-finalists lose ante (not tracked here), finalists get pot share
      runningElo[round.winner === p1 ? p1 : p2].elo += potResult.winnerDelta;
      runningElo[round.winner === p1 ? p2 : p1].elo += potResult.loserDelta;
    }
  }

  // Fun superlatives for each active player
  const superlativePool: { test: (n: string) => boolean; title: string; emoji: string; detail: (n: string) => string }[] = [
    { test: (n) => (pStats[n]?.finals ?? 0) > 0 && pStats[n].wins === 0, title: "Finalturisten", emoji: "🎫", detail: (n) => `${pStats[n].finals} finaler, 0 vinster` },
    { test: (n) => pStats[n]?.gamesPlayed >= 8 && pStats[n].finals === 0, title: "Soffvärmare", emoji: "🛋️", detail: (n) => `${pStats[n].gamesPlayed} rundor utan en enda final` },
    { test: (n) => { const ps = pStats[n]; return ps && ps.finals >= 3 && ps.wins / ps.finals >= 0.7; }, title: "Finalkrossaren", emoji: "💪", detail: (n) => `${(pStats[n].wins / pStats[n].finals * 100).toFixed(0)}% finalvinst` },
    { test: (n) => pStats[n]?.gamesPlayed >= 10, title: "Järnmannen", emoji: "🏋️", detail: (n) => `${pStats[n].gamesPlayed} spelade rundor` },
    { test: (n) => { const ps = pStats[n]; return ps && ps.gamesPlayed >= 3 && ps.gamesPlayed <= 5 && ps.wins > 0; }, title: "Effektiva", emoji: "⚡", detail: (n) => `${pStats[n].wins} vinst(er) på bara ${pStats[n].gamesPlayed} rundor` },
    { test: (n) => pStats[n]?.losses >= 4, title: "Silverkungen", emoji: "🥈", detail: (n) => `${pStats[n].losses} finalförluster` },
    { test: (n) => pStats[n]?.wins >= 2 && pStats[n].losses <= 1, title: "Iskall", emoji: "🧊", detail: (n) => `${pStats[n].wins}V–${pStats[n].losses}F i finaler` },
  ];

  const superlatives: SeasonSummary["superlatives"] = [];
  const assigned = new Set<string>();
  for (const s of superlativePool) {
    for (const name of Object.keys(pStats)) {
      if (assigned.has(name)) continue;
      if (pStats[name].gamesPlayed < 2) continue;
      if (s.test(name)) {
        superlatives.push({ name, title: s.title, emoji: s.emoji, detail: s.detail(name) });
        assigned.add(name);
      }
    }
  }
  // Give remaining players a generic superlative
  for (const name of Object.keys(pStats)) {
    if (assigned.has(name) || pStats[name].gamesPlayed < 2) continue;
    superlatives.push({ name, title: "Duktig deltagare", emoji: "👏", detail: `${pStats[name].gamesPlayed} rundor, ${pStats[name].wins} vinst(er)` });
    assigned.add(name);
  }

  // ── Longest win streak ──
  let longestWinStreak: SeasonSummary["longestWinStreak"] = null;
  const streaks: Record<string, number> = {};
  const bestStreaks: Record<string, number> = {};
  for (const s of sortedSessions) {
    for (const r of s.rounds) {
      if (!r.winner || r.finalists.length !== 2) continue;
      const loser = r.finalists.find(f => f !== r.winner)!;
      streaks[r.winner] = (streaks[r.winner] || 0) + 1;
      streaks[loser] = 0;
      if (!bestStreaks[r.winner] || streaks[r.winner] > bestStreaks[r.winner]) bestStreaks[r.winner] = streaks[r.winner];
    }
  }
  for (const [name, streak] of Object.entries(bestStreaks)) {
    if (streak >= 2 && (!longestWinStreak || streak > longestWinStreak.streak)) {
      longestWinStreak = { name, streak };
    }
  }

  // ── Rivalry (most frequent matchup) ──
  let rivalry: SeasonSummary["rivalry"] = null;
  const matchups: Record<string, { wins: Record<string, number>; total: number }> = {};
  for (const s of sessions) {
    for (const r of s.rounds) {
      if (r.finalists.length !== 2 || !r.winner) continue;
      const key = [...r.finalists].sort().join(" vs ");
      if (!matchups[key]) matchups[key] = { wins: {}, total: 0 };
      matchups[key].total++;
      matchups[key].wins[r.winner] = (matchups[key].wins[r.winner] || 0) + 1;
    }
  }
  let maxMeetings = 0;
  for (const [key, m] of Object.entries(matchups)) {
    if (m.total > maxMeetings && m.total >= 2) {
      maxMeetings = m.total;
      const [p1, p2] = key.split(" vs ");
      const w1 = m.wins[p1] || 0;
      const w2 = m.wins[p2] || 0;
      rivalry = { player1: p1, player2: p2, meetings: m.total, record: `${w1}–${w2}` };
    }
  }

  // ── Biggest Elo drop ──
  let biggestDrop: SeasonSummary["biggestDrop"] = null;
  for (const name of Object.keys(pStats)) {
    if (pStats[name].finals < 2) continue;
    const before = eloBefore[name]?.elo ?? 1000;
    const after = eloAfter[name]?.elo ?? 1000;
    const delta = after - before;
    if (delta < 0 && (!biggestDrop || delta < biggestDrop.eloDelta)) {
      biggestDrop = { name, eloDelta: delta };
    }
  }

  // ── Busiest day ──
  let busiestDay: SeasonSummary["busiestDay"] = null;
  const dayCounts: Record<string, number> = {};
  const dayNames = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
  for (const s of sessions) {
    const d = new Date(s.date);
    const dayName = dayNames[d.getDay()];
    dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
  }
  for (const [day, count] of Object.entries(dayCounts)) {
    if (!busiestDay || count > busiestDay.count) busiestDay = { day, count };
  }

  const avgFinalsPerSession = sessions.length > 0 ? Math.round((totalFinals / sessions.length) * 10) / 10 : 0;

  return { month, monthLabel, totalGames, totalFinals, totalSessions: sessions.length, mvp, mostImproved, biggestUpset, superlatives, longestWinStreak, rivalry, biggestDrop, busiestDay, avgFinalsPerSession };
}

// ── Elo Sparkline Component ──
// Uses distinct visual patterns beyond color for accessibility:
//   Uptrend: solid line + upward triangle end marker (▲)
//   Downtrend: dashed line + downward triangle end marker (▼)
//   Neutral: dotted line + circle end marker (●)
function EloSparkline({
  data, width = 48, height = 18, strokeWidth = 1.5, interactive = false, responsive = false,
}: {
  data: number[]; width?: number; height?: number; strokeWidth?: number; interactive?: boolean; responsive?: boolean;
}) {
  const gradId = useRef(`spark-${Math.random().toString(36).slice(2, 8)}`).current;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!data || data.length < 2) return null;

  const points = data.slice(-20);
  const mn = Math.min(...points), mx = Math.max(...points), rng = mx - mn || 1;
  const pad = interactive ? 4 : 2;
  const topPad = interactive ? 16 : pad;
  const svgH = interactive ? height + 14 : height;
  const cW = width - pad * 2, cH = height - pad - topPad;
  const pts = points.map((v, i) => ({
    x: pad + (i / (points.length - 1)) * cW,
    y: topPad + cH - ((v - mn) / rng) * cH,
    val: v,
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const trend = points[points.length - 1] - points[0];
  const color = trend > 0 ? "var(--success)" : trend < 0 ? "var(--destructive)" : "var(--muted-foreground)";
  // Stroke dash pattern: solid for up, dashed for down, dotted for neutral
  const strokeDash = trend > 0 ? "none" : trend < 0 ? `${strokeWidth * 3} ${strokeWidth * 2}` : `${strokeWidth} ${strokeWidth * 2}`;
  const fillD = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${svgH - pad} L${pts[0].x.toFixed(1)},${svgH - pad} Z`;
  const endPt = pts[pts.length - 1];
  const markerSize = interactive ? 3.5 : 2.2;

  const handleMouseMove = interactive ? (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    let closest = 0, closestDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const dist = Math.abs(pts[i].x - mouseX);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    }
    setHoverIdx(closest);
  } : undefined;

  const hp = hoverIdx !== null ? pts[hoverIdx] : null;
  const hoverDelta = hoverIdx !== null && hoverIdx > 0 ? points[hoverIdx] - points[hoverIdx - 1] : null;

  // End marker shape based on trend direction
  const renderEndMarker = (cx: number, cy: number, s: number) => {
    if (trend > 0) {
      return <polygon points={`${cx},${cy - s} ${cx + s},${cy + s * 0.7} ${cx - s},${cy + s * 0.7}`} fill={color} />;
    } else if (trend < 0) {
      return <polygon points={`${cx},${cy + s} ${cx + s},${cy - s * 0.7} ${cx - s},${cy - s * 0.7}`} fill={color} />;
    } else {
      return <circle cx={cx} cy={cy} r={s * 0.7} fill={color} />;
    }
  };

  return (
    <svg
      ref={svgRef}
      width={responsive ? undefined : width}
      height={responsive ? undefined : svgH}
      viewBox={`0 0 ${width} ${svgH}`}
      className="shrink-0"
      style={responsive ? { width: "100%", height: svgH } : undefined}
      preserveAspectRatio={responsive ? "xMidYMid meet" : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={interactive ? () => setHoverIdx(null) : undefined}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={strokeDash}
      />
      {/* Data point ticks along the curve (interactive mode) */}
      {interactive && pts.map((p, i) => {
        if (i === 0 || i === pts.length - 1) return null;
        const localTrend = points[i] - points[i - 1];
        return (
          <circle
            key={`tick-${i}`}
            cx={p.x}
            cy={p.y}
            r={1.2}
            fill={localTrend > 0 ? "var(--success)" : localTrend < 0 ? "var(--destructive)" : "var(--muted-foreground)"}
            opacity={0.6}
          />
        );
      })}
      {/* End marker: ▲ up / ▼ down / ● neutral */}
      {renderEndMarker(endPt.x, endPt.y, markerSize)}
      {interactive && hp && (
        <>
          <line x1={hp.x} y1={topPad} x2={hp.x} y2={svgH - pad} stroke={color} strokeWidth={0.7} strokeDasharray="3 2" opacity={0.5} />
          <circle cx={hp.x} cy={hp.y} r={3.5} fill={color} />
          <circle cx={hp.x} cy={hp.y} r={2} fill="var(--surface-container-lowest)" />
          {(() => {
            const label = `${hp.val}${hoverDelta !== null && hoverDelta !== 0 ? ` (${hoverDelta > 0 ? "+" : ""}${hoverDelta})` : ""}`;
            const textX = Math.max(pad + 14, Math.min(hp.x, width - pad - 14));
            return (
              <text x={textX} y={topPad - 4} textAnchor="middle" fill={color}
                style={{ fontSize: 10, fontFamily: "'Titillium Web', sans-serif", fontWeight: 600 }}
              >{label}</text>
            );
          })()}
        </>
      )}
      {interactive && pts.map((p, i) => {
        const halfGap = cW / (pts.length - 1) / 2;
        return <rect key={i} x={p.x - halfGap} y={0} width={halfGap * 2} height={svgH} fill="transparent" />;
      })}
    </svg>
  );
}

// ── Achievement System ──
type AchievementRarity = "common" | "uncommon" | "rare" | "legendary" | "mythic";

interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  rarity: AchievementRarity;
  unlockedAt?: number; // timestamp when first unlocked (permanent)
  isNew?: boolean; // true if just unlocked this session
}

const ACHIEVEMENT_RARITY_COLORS: Record<AchievementRarity, { color: string; bg: string }> = {
  common: { color: "var(--muted-foreground)", bg: "color-mix(in srgb, var(--muted-foreground) 12%, transparent)" },
  uncommon: { color: "var(--success)", bg: "color-mix(in srgb, var(--success) 12%, transparent)" },
  rare: { color: "var(--primary)", bg: "color-mix(in srgb, var(--primary) 12%, transparent)" },
  legendary: { color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 12%, transparent)" },
  mythic: { color: "var(--error)", bg: "linear-gradient(135deg, color-mix(in srgb, var(--warning) 15%, transparent), color-mix(in srgb, var(--error) 15%, transparent))" },
};

const ACHIEVEMENT_RARITY_LABELS: Record<AchievementRarity, string> = {
  common: "Vanlig",
  uncommon: "Ovanlig",
  rare: "Sällsynt",
  legendary: "Legendarisk",
  mythic: "Mytisk",
};

interface AchievementCheck {
  achievement: Achievement;
  check: (p: PlayerStats, ctx: AchievementContext) => boolean;
}

interface AchievementContext {
  sessions: GameSession[];
  eloEntry: EloEntry | null;
  eloRatings: Record<string, EloEntry>;
  allStats: PlayerStats[];
}

/** Count how many sessions a player participated in */
function countPlayerSessions(playerName: string, sessions: GameSession[]): number {
  const stripped = stripEmoji(playerName).toLowerCase().trim();
  return sessions.filter((s) =>
    s.players.some((p) => stripEmoji(p).toLowerCase().trim() === stripped) ||
    s.rounds.some((r) => r.finalists.some((f) => stripEmoji(f).toLowerCase().trim() === stripped))
  ).length;
}

/** Get sessions a specific player participated in */
function getPlayerSessions(playerName: string, sessions: GameSession[]): GameSession[] {
  const stripped = stripEmoji(playerName).toLowerCase().trim();
  return sessions.filter((s) =>
    s.players.some((p) => stripEmoji(p).toLowerCase().trim() === stripped) ||
    s.rounds.some((r) => r.finalists.some((f) => stripEmoji(f).toLowerCase().trim() === stripped))
  );
}

/** Count finals won by a player in sessions matching a filter */
function countWinsInFilteredSessions(playerName: string, sessions: GameSession[], filter: (s: GameSession) => boolean): number {
  const stripped = stripEmoji(playerName).toLowerCase().trim();
  let wins = 0;
  for (const session of sessions.filter(filter)) {
    for (const round of session.rounds) {
      if (stripEmoji(round.winner).toLowerCase().trim() === stripped) wins++;
    }
  }
  return wins;
}

/** Get unique calendar months (YYYY-MM) a player has played in */
function getUniqueMonths(playerName: string, sessions: GameSession[]): Set<string> {
  const months = new Set<string>();
  for (const s of getPlayerSessions(playerName, sessions)) {
    const d = new Date(s.date);
    months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

/** Get ISO week string from a date */
function getISOWeek(d: Date): string {
  const tmp = new Date(d.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${tmp.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Check if player has sessions in N consecutive weeks */
function hasConsecutiveWeeks(playerName: string, sessions: GameSession[], count: number): boolean {
  const weeks = new Set<string>();
  for (const s of getPlayerSessions(playerName, sessions)) {
    weeks.add(getISOWeek(new Date(s.date)));
  }
  const sorted = Array.from(weeks).sort();
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const [y1, w1] = sorted[i - 1].split("-W").map(Number);
    const [y2, w2] = sorted[i].split("-W").map(Number);
    const isNext = (y1 === y2 && w2 === w1 + 1) || (y2 === y1 + 1 && w1 >= 52 && w2 === 1);
    if (isNext) { streak++; if (streak >= count) return true; } else { streak = 1; }
  }
  return false;
}

/** Check if a player ever won a final while their Elo was below a threshold (replays Elo history) */
function hasWonFinalBelowElo(playerName: string, sessions: GameSession[], threshold: number): boolean {
  const stripped = stripEmoji(playerName).toLowerCase().trim();
  const ratings: Record<string, number> = {};
  const ensure = (name: string) => { if (!(name in ratings)) ratings[name] = ELO_START; };
  const sorted = [...sessions].sort((a, b) => a.date - b.date);

  for (const session of sorted) {
    for (const player of session.players) ensure(player);
    for (const round of session.rounds) {
      if (round.finalists.length !== 2 || !round.winner) continue;
      const roundPlayers = round.players ?? session.players;
      const N = roundPlayers.length;
      const [p1, p2] = round.finalists;
      const winner = round.winner;
      const loser = winner === p1 ? p2 : p1;

      ensure(winner);
      ensure(loser);

      // Check BEFORE applying deltas: did our player win while below threshold?
      const winnerStripped = stripEmoji(winner).toLowerCase().trim();
      if (winnerStripped === stripped && ratings[winner] < threshold) return true;

      // Apply Elo changes (mirrors computeElo)
      for (const player of roundPlayers) {
        ensure(player);
        if (player !== winner && player !== loser) {
          ratings[player] -= ELO_ANTE;
        }
      }
      const { winnerDelta, loserDelta } = computePotDistribution(ratings[winner], ratings[loser], N);
      ratings[winner] += winnerDelta;
      ratings[loser] += loserDelta;
    }
  }
  return false;
}

/** Count unique weekdays a player has played on */
function countUniqueWeekdays(playerName: string, sessions: GameSession[]): number {
  const days = new Set<number>();
  for (const s of getPlayerSessions(playerName, sessions)) {
    days.add(new Date(s.date).getDay());
  }
  return days.size;
}

/** Check if player was eliminated (participated but never reached a final) in N consecutive sessions */
function hasConsecutiveFirstRoundExits(playerName: string, sessions: GameSession[], threshold: number): boolean {
  const stripped = stripEmoji(playerName).toLowerCase().trim();
  const sorted = [...sessions].sort((a, b) => a.date - b.date);
  let streak = 0;
  for (const s of sorted) {
    const participated = s.players.some((p) => stripEmoji(p).toLowerCase().trim() === stripped) ||
      s.rounds.some((r) => (r.players ?? s.players).some((p) => stripEmoji(p).toLowerCase().trim() === stripped));
    if (!participated) continue;
    const reachedFinal = s.rounds.some((r) => r.finalists.some((f) => stripEmoji(f).toLowerCase().trim() === stripped));
    if (!reachedFinal) { streak++; if (streak >= threshold) return true; } else { streak = 0; }
  }
  return false;
}

/** Compute per-month Elo deltas for a player by walking through all sessions */
function computePerMonthEloDeltas(playerName: string, sessions: GameSession[]): Record<string, number> {
  const stripped = stripEmoji(playerName).toLowerCase().trim();
  const ratings: Record<string, number> = {};
  const ensure = (name: string) => { if (ratings[name] === undefined) ratings[name] = ELO_START; };
  const sorted = [...sessions].sort((a, b) => a.date - b.date);
  const monthDeltas: Record<string, number> = {};
  for (const session of sorted) {
    const month = `${new Date(session.date).getFullYear()}-${String(new Date(session.date).getMonth() + 1).padStart(2, "0")}`;
    for (const player of session.players) ensure(player);
    for (const round of session.rounds) {
      if (round.finalists.length !== 2 || !round.winner) continue;
      const roundPlayers = round.players ?? session.players;
      const N = roundPlayers.length;
      const [p1, p2] = round.finalists;
      const winner = round.winner;
      const loser = winner === p1 ? p2 : p1;
      for (const player of roundPlayers) ensure(player);
      const beforeRatings: Record<string, number> = {};
      for (const player of roundPlayers) beforeRatings[player] = ratings[player];
      const { winnerDelta, loserDelta } = computePotDistribution(ratings[winner], ratings[loser], N);
      for (const player of roundPlayers) {
        if (player !== winner && player !== loser) ratings[player] -= ELO_ANTE;
      }
      ratings[winner] += winnerDelta;
      ratings[loser] += loserDelta;
      for (const player of roundPlayers) {
        if (stripEmoji(player).toLowerCase().trim() === stripped) {
          monthDeltas[month] = (monthDeltas[month] ?? 0) + (ratings[player] - beforeRatings[player]);
        }
      }
    }
  }
  return monthDeltas;
}

/** Check if a player lost a final to someone with 100+ lower Elo */
function hasLostToMuchLowerElo(playerName: string, sessions: GameSession[], eloGap: number): boolean {
  const stripped = stripEmoji(playerName).toLowerCase().trim();
  const ratings: Record<string, number> = {};
  const ensure = (name: string) => { if (ratings[name] === undefined) ratings[name] = ELO_START; };
  const sorted = [...sessions].sort((a, b) => a.date - b.date);
  for (const session of sorted) {
    for (const player of session.players) ensure(player);
    for (const round of session.rounds) {
      if (round.finalists.length !== 2 || !round.winner) continue;
      const roundPlayers = round.players ?? session.players;
      const N = roundPlayers.length;
      const [p1, p2] = round.finalists;
      const winner = round.winner;
      const loser = winner === p1 ? p2 : p1;
      for (const player of roundPlayers) ensure(player);
      if (stripEmoji(loser).toLowerCase().trim() === stripped) {
        if (ratings[loser] - ratings[winner] >= eloGap) return true;
      }
      const { winnerDelta, loserDelta } = computePotDistribution(ratings[winner], ratings[loser], N);
      for (const player of roundPlayers) {
        if (player !== winner && player !== loser) ratings[player] -= ELO_ANTE;
      }
      ratings[winner] += winnerDelta;
      ratings[loser] += loserDelta;
    }
  }
  return false;
}

/** Check if a player lost to the same opponent N times in a row in finals */
function hasGroundhogDay(playerName: string, sessions: GameSession[], threshold: number): boolean {
  const stripped = stripEmoji(playerName).toLowerCase().trim();
  const sorted = [...sessions].sort((a, b) => a.date - b.date);
  let lastOpponent = "";
  let streak = 0;
  for (const session of sorted) {
    for (const round of session.rounds) {
      if (round.finalists.length !== 2 || !round.winner) continue;
      const [p1, p2] = round.finalists;
      const winner = round.winner;
      const loser = winner === p1 ? p2 : p1;
      if (stripEmoji(loser).toLowerCase().trim() === stripped) {
        const opp = stripEmoji(winner).toLowerCase().trim();
        if (opp === lastOpponent) { streak++; } else { lastOpponent = opp; streak = 1; }
        if (streak >= threshold) return true;
      } else if (round.finalists.some((f) => stripEmoji(f).toLowerCase().trim() === stripped)) {
        lastOpponent = "";
        streak = 0;
      }
    }
  }
  return false;
}

/** Check if a player lost 3+ finals on the same day (session) */
function hasSmaltisen(playerName: string, sessions: GameSession[], threshold: number): boolean {
  const stripped = stripEmoji(playerName).toLowerCase().trim();
  for (const session of sessions) {
    let losses = 0;
    for (const round of session.rounds) {
      if (round.finalists.length !== 2 || !round.winner) continue;
      const [p1, p2] = round.finalists;
      const winner = round.winner;
      const loser = winner === p1 ? p2 : p1;
      if (stripEmoji(loser).toLowerCase().trim() === stripped) losses++;
    }
    if (losses >= threshold) return true;
  }
  return false;
}

const ALL_ACHIEVEMENTS: AchievementCheck[] = [
  // ── COMMON (15) ──
  { achievement: { id: "first_blood", name: "First Blood", description: "Vinn din första final", emoji: "🏓", rarity: "common" }, check: (p) => p.wins >= 1 },
  { achievement: { id: "debut", name: "Debut", description: "Spela din allra första runda", emoji: "🎬", rarity: "common" }, check: (p) => p.gamesPlayed >= 1 },
  { achievement: { id: "finalist", name: "Finalist", description: "Nå 10 finaler", emoji: "🎪", rarity: "common" }, check: (p) => p.finals >= 10 },
  { achievement: { id: "grinder", name: "Grinder", description: "Spela 50+ rundor", emoji: "⚙️", rarity: "common" }, check: (p) => p.gamesPlayed >= 50 },
  { achievement: { id: "silver_lining", name: "Silver Lining", description: "Förlora 5 finaler — nästan!", emoji: "🥈", rarity: "common" }, check: (p) => {
    const finalLosses = p.finals - p.wins;
    return finalLosses >= 5;
  }},
  { achievement: { id: "regular", name: "Reguljär", description: "Spela 25+ rundor", emoji: "📋", rarity: "common" }, check: (p) => p.gamesPlayed >= 25 },
  { achievement: { id: "first_rival", name: "Första Rivalen", description: "Möt samma motståndare i 3+ finaler", emoji: "🤝", rarity: "common" }, check: (p) => Object.values(p.h2h).some((r) => r.wins + r.losses >= 3) },
  { achievement: { id: "rubber_duck", name: "Rubber Duck", description: "Förlora 3 finaler i rad", emoji: "🦆", rarity: "common" }, check: (p) => {
    const finalResults = p.recentForm;
    let streak = 0;
    for (const r of finalResults) { if (r === "F") { streak++; if (streak >= 3) return true; } else if (r === "W") { streak = 0; } }
    return false;
  }},

  { achievement: { id: "punching_bag", name: "Slagpåse", description: "Förlora 10+ finaler totalt", emoji: "🥊", rarity: "common" }, check: (p) => (p.finals - p.wins) >= 10 },
  { achievement: { id: "cold_start", name: "Kall Start", description: "Förlora dina 3 första finaler", emoji: "🧊", rarity: "common" }, check: (p) => {
    if (p.finals < 3) return false;
    const form = p.recentForm.slice().reverse();
    const first3 = form.filter((r: string) => r === "W" || r === "F").slice(0, 3);
    return first3.length === 3 && first3.every((r: string) => r === "F");
  }},

  // ── UNCOMMON ──
  { achievement: { id: "hat_trick", name: "Hat Trick", description: "Vinn 3+ finaler i en omgång", emoji: "🎩", rarity: "uncommon" }, check: (p, ctx) => {
    for (const session of ctx.sessions) { let wins = 0; for (const round of session.rounds) { if (round.winner === p.name) wins++; } if (wins >= 3) return true; } return false;
  }},
  { achievement: { id: "on_fire", name: "On Fire", description: "Uppnå en 5+ vinststreak", emoji: "🔥", rarity: "uncommon" }, check: (p) => p.bestStreak >= 5 },
  { achievement: { id: "centurion", name: "Centurion", description: "Spela 100+ rundor", emoji: "💯", rarity: "uncommon" }, check: (p) => p.gamesPlayed >= 100 },
  { achievement: { id: "social_butterfly", name: "Social Butterfly", description: "Möt 8+ olika motståndare i finaler", emoji: "🦋", rarity: "uncommon" }, check: (p) => Object.keys(p.h2h).length >= 8 },
  { achievement: { id: "underdog", name: "Underdog", description: "Vinn en final mot någon med 50+ mer Elo", emoji: "🐺", rarity: "uncommon" }, check: (p, ctx) => {
    if (!ctx.eloEntry) return false;
    for (const [opp, record] of Object.entries(p.h2h)) {
      if (record.wins > 0 && ctx.eloRatings[opp] && ctx.eloRatings[opp].elo - ctx.eloEntry.elo >= 50) return true;
    }
    return false;
  }},
  { achievement: { id: "clean_sweep", name: "Clean Sweep", description: "Vinn alla finaler i en omgång (min 2)", emoji: "🧹", rarity: "uncommon" }, check: (p, ctx) => {
    for (const session of ctx.sessions) {
      let wins = 0, losses = 0;
      for (const round of session.rounds) {
        if (round.finalists.includes(p.name)) { if (round.winner === p.name) wins++; else losses++; }
      }
      if (wins >= 2 && losses === 0) return true;
    }
    return false;
  }},
  { achievement: { id: "glass_cannon", name: "Glass Cannon", description: "Ha 40%+ BWP men under 10 vinster", emoji: "💎", rarity: "uncommon" }, check: (p) => p.bwp >= 40 && p.wins < 10 && p.gamesPlayed >= 5 },
  { achievement: { id: "bounce_back", name: "Bounce Back", description: "Vinn en final direkt efter att ha förlorat en", emoji: "🔄", rarity: "uncommon" }, check: (p) => {
    const form = p.recentForm;
    for (let i = 1; i < form.length; i++) { if (form[i] === "W" && form[i - 1] === "F") return true; }
    return false;
  }},
  { achievement: { id: "sisyphus", name: "Sisyfos", description: "20+ finaler men under 30% vinst", emoji: "🪨", rarity: "uncommon" }, check: (p) => p.finals >= 20 && p.vfPct < 30 },
  { achievement: { id: "choker", name: "Choker", description: "Förlora 3+ finaler i en omgång", emoji: "😰", rarity: "uncommon" }, check: (p, ctx) => {
    for (const session of ctx.sessions) { let losses = 0; for (const round of session.rounds) { if (round.finalists.includes(p.name) && round.winner !== p.name) losses++; } if (losses >= 3) return true; } return false;
  }},

  // ── RARE ──
  { achievement: { id: "sniper", name: "Sniper", description: "70%+ finalvinst (min 10 finaler)", emoji: "🎯", rarity: "rare" }, check: (p) => p.finals >= 10 && p.vfPct >= 70 },
  { achievement: { id: "the_wall", name: "The Wall", description: "Nå 50+ finaler", emoji: "🧱", rarity: "rare" }, check: (p) => p.finals >= 50 },
  { achievement: { id: "peak_performance", name: "Peak Performance", description: "Nå 1150+ i Elo", emoji: "🏔️", rarity: "rare" }, check: (_p, ctx) => (ctx.eloEntry?.peakElo ?? 0) >= 1150 },
  { achievement: { id: "dominator", name: "Dominator", description: "Positiv H2H mot 5+ motståndare", emoji: "👊", rarity: "rare" }, check: (p) => Object.values(p.h2h).filter((r) => r.wins > r.losses).length >= 5 },
  { achievement: { id: "champion", name: "Mästare", description: "Vinn en turnering", emoji: "🏆", rarity: "rare" }, check: (p) => p.tournamentWins >= 1 },
  { achievement: { id: "iron_man", name: "Iron Man", description: "Spela 200+ rundor totalt", emoji: "🦾", rarity: "rare" }, check: (p) => p.gamesPlayed >= 200 },
  { achievement: { id: "giant_slayer", name: "Giant Slayer", description: "Besegra den #1-rankade spelaren i en final", emoji: "⚔️", rarity: "rare" }, check: (p, ctx) => {
    if (!ctx.eloRatings || Object.keys(ctx.eloRatings).length === 0) return false;
    const topPlayer = Object.values(ctx.eloRatings).filter((e) => e.matches > 0).sort((a, b) => b.elo - a.elo)[0];
    if (!topPlayer || topPlayer.name === p.name) return false;
    return (p.h2h[topPlayer.name]?.wins ?? 0) > 0;
  }},
  { achievement: { id: "perfectionist", name: "Perfektionist", description: "80%+ finalvinst (min 15 finaler)", emoji: "✨", rarity: "rare" }, check: (p) => p.finals >= 15 && p.vfPct >= 80 },
  { achievement: { id: "nemesis_slayer", name: "Nemesis Slayer", description: "Besegra din nemesis 3+ gånger", emoji: "🗡️", rarity: "rare" }, check: (p) => {
    if (!p.nemesis) return false;
    return (p.h2h[p.nemesis]?.wins ?? 0) >= 3;
  }},
  { achievement: { id: "marathon", name: "Maratonlansen", description: "Spela 300+ rundor totalt", emoji: "🏃", rarity: "rare" }, check: (p) => p.gamesPlayed >= 300 },
  { achievement: { id: "free_fall", name: "Fritt Fall", description: "Tappa 100+ Elo från din peak", emoji: "📉", rarity: "rare" }, check: (_p, ctx) => {
    if (!ctx.eloEntry) return false;
    return (ctx.eloEntry.peakElo - ctx.eloEntry.elo) >= 100;
  }},
  { achievement: { id: "eternal_second", name: "Evig Tvåa", description: "Förlora 30+ finaler totalt", emoji: "🥈", rarity: "rare" }, check: (p) => (p.finals - p.wins) >= 30 },

  // ── LEGENDARY ──
  { achievement: { id: "goat", name: "G.O.A.T.", description: "Ha högst Elo av alla", emoji: "🐐", rarity: "legendary" }, check: (_p, ctx) => {
    if (!ctx.eloEntry || ctx.eloEntry.matches === 0) return false;
    return Object.values(ctx.eloRatings).filter((e) => e.matches > 0).every((e) => ctx.eloEntry!.elo >= e.elo);
  }},
  { achievement: { id: "dynasty", name: "Dynasti", description: "Vinn 3+ turneringar", emoji: "👑", rarity: "legendary" }, check: (p) => p.tournamentWins >= 3 },
  { achievement: { id: "inferno", name: "Inferno", description: "Uppnå en 10+ vinststreak", emoji: "🌋", rarity: "legendary" }, check: (p) => p.bestStreak >= 10 },
  { achievement: { id: "legend", name: "Legenden", description: "100+ vinster totalt", emoji: "⭐", rarity: "legendary" }, check: (p) => p.wins >= 100 },
  { achievement: { id: "untouchable", name: "Untouchable", description: "Nå 1200+ peak Elo", emoji: "🛡️", rarity: "legendary" }, check: (_p, ctx) => (ctx.eloEntry?.peakElo ?? 0) >= 1200 },
  { achievement: { id: "final_boss", name: "Final Boss", description: "Vinn 5+ turneringar", emoji: "🐉", rarity: "legendary" }, check: (p) => p.tournamentWins >= 5 },
  { achievement: { id: "the_machine", name: "The Machine", description: "Spela 500+ rundor totalt", emoji: "🤖", rarity: "legendary" }, check: (p) => p.gamesPlayed >= 500 },
  { achievement: { id: "transcendent", name: "Transcendent", description: "50+ vinster och 1100+ Elo", emoji: "🌌", rarity: "legendary" }, check: (p, ctx) => p.wins >= 50 && (ctx.eloEntry?.elo ?? 0) >= 1100 },
  { achievement: { id: "the_cursed_one", name: "The Cursed One", description: "Förlora 50+ finaler totalt", emoji: "💀", rarity: "legendary" }, check: (p) => (p.finals - p.wins) >= 50 },
  { achievement: { id: "rock_bottom", name: "Rock Bottom", description: "Sjunk under 900 Elo", emoji: "🕳️", rarity: "legendary" }, check: (_p, ctx) => (ctx.eloEntry?.elo ?? 1000) < 900 },

  // ── NEW COMMON (5) ──
  { achievement: { id: "yellow_debut", name: "Gult Kort", description: "Få ditt första gula kort", emoji: "🟨", rarity: "common" }, check: (p) => p.yellowCards >= 1 },
  { achievement: { id: "tournament_debut", name: "Turneringsdebut", description: "Delta i din första turnering", emoji: "🎟️", rarity: "common" }, check: (p) => p.tournamentEntries.length >= 1 },
  { achievement: { id: "session_regular", name: "Stämpelklockan", description: "Spela i 5+ omgångar", emoji: "⏰", rarity: "common" }, check: (p, ctx) => countPlayerSessions(p.name, ctx.sessions) >= 5 },
  { achievement: { id: "rivalry_brewing", name: "Brygga Rivalitet", description: "Möt samma motståndare i 5+ finaler", emoji: "☕", rarity: "common" }, check: (p) => Object.values(p.h2h).some((r) => r.wins + r.losses >= 5) },
  { achievement: { id: "first_prey", name: "Favoritbyte", description: "Ha en prey (motståndare du dominerar)", emoji: "🎣", rarity: "common" }, check: (p) => p.prey !== null },

  // ── TIME-BASED COMMON ──
  { achievement: { id: "morning_bird", name: "Morgonpigg", description: "Spela en omgång som startar före kl 09:00", emoji: "🌅", rarity: "common" }, check: (p, ctx) => {
    return getPlayerSessions(p.name, ctx.sessions).some((s) => new Date(s.date).getHours() < 9);
  }},
  { achievement: { id: "overtime", name: "Övertidsarbete", description: "Spela en omgång som startar efter kl 16:00", emoji: "🦉", rarity: "common" }, check: (p, ctx) => {
    return getPlayerSessions(p.name, ctx.sessions).some((s) => new Date(s.date).getHours() >= 16);
  }},
  { achievement: { id: "friday_fighter", name: "Fredagskämpen", description: "Spela i 5+ fredagsomgångar", emoji: "🍻", rarity: "common" }, check: (p, ctx) => {
    return getPlayerSessions(p.name, ctx.sessions).filter((s) => new Date(s.date).getDay() === 5).length >= 5;
  }},

  // ── NEW UNCOMMON (5) ──
  { achievement: { id: "karma_collector", name: "Karmapolisen", description: "Samla 3+ gula kort totalt", emoji: "👮", rarity: "uncommon" }, check: (p) => p.yellowCards >= 3 },
  { achievement: { id: "hot_form", name: "Formtopp", description: "Ha 4 vinster i rad i senaste formen", emoji: "📈", rarity: "uncommon" }, check: (p) => {
    let streak = 0;
    for (const r of p.recentForm) { if (r === "W") { streak++; if (streak >= 4) return true; } else if (r === "F") { streak = 0; } }
    return false;
  }},
  { achievement: { id: "deep_freeze", name: "Djupfryst", description: "Uppnå en 5+ förluststreak i finaler", emoji: "🥶", rarity: "uncommon" }, check: (p) => p.worstColdStreak >= 5 },
  { achievement: { id: "all_you_can_eat", name: "Allätaren", description: "Möt 12+ olika motståndare i finaler", emoji: "🍽️", rarity: "uncommon" }, check: (p) => Object.keys(p.h2h).length >= 12 },
  { achievement: { id: "session_warrior", name: "Omgångskrigare", description: "Spela i 10+ omgångar", emoji: "��️", rarity: "uncommon" }, check: (p, ctx) => countPlayerSessions(p.name, ctx.sessions) >= 10 },

  // ── TIME-BASED UNCOMMON ──
  { achievement: { id: "weekday_routine", name: "Veckorutinen", description: "Spela omgångar på 4+ olika veckodagar", emoji: "📅", rarity: "uncommon" }, check: (p, ctx) => countUniqueWeekdays(p.name, ctx.sessions) >= 4 },
  { achievement: { id: "after_work", name: "After Work", description: "Vinn en final i en omgång mellan kl 16–19", emoji: "🍸", rarity: "uncommon" }, check: (p, ctx) => {
    return countWinsInFilteredSessions(p.name, ctx.sessions, (s) => { const h = new Date(s.date).getHours(); return h >= 16 && h < 19; }) > 0;
  }},
  { achievement: { id: "back_again", name: "Tillbaka Igen", description: "Spela omgångar 3 veckor i rad", emoji: "🔁", rarity: "uncommon" }, check: (p, ctx) => hasConsecutiveWeeks(p.name, ctx.sessions, 3) },
  { achievement: { id: "twin_souls", name: "Tvillingsjälar", description: "Möt samma motståndare i 10+ finaler", emoji: "👯", rarity: "uncommon" }, check: (p) => Object.values(p.h2h).some((r) => r.wins + r.losses >= 10) },
  { achievement: { id: "comeback_kid", name: "Comeback Kid", description: "Vinn en final med under 950 Elo", emoji: "🦸", rarity: "uncommon" }, check: (p, ctx) => {
    return hasWonFinalBelowElo(p.name, ctx.sessions, 950);
  }},

  // ── NEW RARE (5) ──
  { achievement: { id: "red_card", name: "Rött Kort", description: "Få ett rött kort", emoji: "🟥", rarity: "rare" }, check: (p) => p.redCards >= 1 },
  { achievement: { id: "session_king", name: "Omgångskungen", description: "Vinn 4+ finaler i en omgång", emoji: "👑", rarity: "rare" }, check: (p, ctx) => {
    for (const session of ctx.sessions) { let wins = 0; for (const round of session.rounds) { if (round.winner === p.name) wins++; } if (wins >= 4) return true; } return false;
  }},
  { achievement: { id: "absolute_unit", name: "Absolute Unit", description: "Positiv H2H mot 8+ motståndare", emoji: "🦏", rarity: "rare" }, check: (p) => Object.values(p.h2h).filter((r) => r.wins > r.losses).length >= 8 },
  { achievement: { id: "faithful_servant", name: "Trogen Tjänare", description: "Spela i 20+ omgångar totalt", emoji: "🫡", rarity: "rare" }, check: (p, ctx) => countPlayerSessions(p.name, ctx.sessions) >= 20 },
  { achievement: { id: "elo_rollercoaster", name: "Berg-och-dalbanan", description: "Tappa 150+ Elo från din peak", emoji: "🎢", rarity: "rare" }, check: (_p, ctx) => {
    if (!ctx.eloEntry) return false;
    return (ctx.eloEntry.peakElo - ctx.eloEntry.elo) >= 150;
  }},

  // ── TIME-BASED RARE ──
  { achievement: { id: "ironman_week", name: "Ironman-veckan", description: "Spela omgångar 3+ dagar inom samma kalendervecka", emoji: "💪", rarity: "rare" }, check: (p, ctx) => {
    const weekDays: Record<string, Set<number>> = {};
    for (const s of getPlayerSessions(p.name, ctx.sessions)) {
      const d = new Date(s.date);
      const week = getISOWeek(d);
      if (!weekDays[week]) weekDays[week] = new Set();
      weekDays[week].add(d.getDay());
    }
    return Object.values(weekDays).some((days) => days.size >= 3);
  }},
  { achievement: { id: "seasons", name: "Årstiderna", description: "Spela i minst 6 olika kalendermånader", emoji: "🍂", rarity: "rare" }, check: (p, ctx) => getUniqueMonths(p.name, ctx.sessions).size >= 6 },
  { achievement: { id: "even_steven", name: "Oavgjort", description: "Ha exakt 50% vinst i H2H mot en motståndare (min 6 möten)", emoji: "⚖️", rarity: "rare" }, check: (p) => {
    return Object.values(p.h2h).some((r) => r.wins + r.losses >= 6 && r.wins === r.losses);
  }},

  // ── NEW LEGENDARY (5) ──
  { achievement: { id: "grand_slam", name: "Grand Slam", description: "Vinn alla finaler i en omgång med 4+ finaler", emoji: "🎾", rarity: "legendary" }, check: (p, ctx) => {
    for (const session of ctx.sessions) {
      let wins = 0, losses = 0;
      for (const round of session.rounds) {
        if (round.finalists.includes(p.name)) { if (round.winner === p.name) wins++; else losses++; }
      }
      if (wins >= 4 && losses === 0) return true;
    }
    return false;
  }},
  { achievement: { id: "karma_king", name: "Karma King", description: "Samla 10+ gula kort totalt", emoji: "😇", rarity: "legendary" }, check: (p) => p.yellowCards >= 10 },
  { achievement: { id: "total_domination", name: "Total Dominans", description: "Positiv H2H mot alla motståndare (min 5 st)", emoji: "🏛️", rarity: "legendary" }, check: (p) => {
    const entries = Object.values(p.h2h);
    return entries.length >= 5 && entries.every((r) => r.wins > r.losses);
  }},
  { achievement: { id: "eternal_flame", name: "Eternal Flame", description: "Uppnå en 15+ vinststreak", emoji: "🕯️", rarity: "legendary" }, check: (p) => p.bestStreak >= 15 },
  { achievement: { id: "the_veteran", name: "The Veteran", description: "Spela i 50+ omgångar totalt", emoji: "🎖️", rarity: "legendary" }, check: (p, ctx) => countPlayerSessions(p.name, ctx.sessions) >= 50 },

  // ── TIME-BASED LEGENDARY ──
  { achievement: { id: "club_365", name: "365-klubben", description: "Spela omgångar under 12 olika kalendermånader", emoji: "📆", rarity: "legendary" }, check: (p, ctx) => getUniqueMonths(p.name, ctx.sessions).size >= 12 },
  { achievement: { id: "friday_dancer", name: "Fredagsdansen", description: "Vinn 10+ finaler på fredagar", emoji: "🪩", rarity: "legendary" }, check: (p, ctx) => {
    return countWinsInFilteredSessions(p.name, ctx.sessions, (s) => new Date(s.date).getDay() === 5) >= 10;
  }},
  { achievement: { id: "ice_age", name: "Ice Age", description: "Förlora 20+ finaler i rad", emoji: "🧊", rarity: "legendary" }, check: (p) => {
    let streak = 0;
    for (const r of p.allFinalResults) { if (r === "F") { streak++; if (streak >= 20) return true; } else { streak = 0; } }
    return false;
  }},

  // ── "DÅLIGA" ACHIEVEMENTS ──
  // Rare
  { achievement: { id: "swing_door", name: "Svängdörren", description: "Åk ut i första rundan 10 omgångar i rad utan att nå en final", emoji: "🚪", rarity: "rare" }, check: (p, ctx) => hasConsecutiveFirstRoundExits(p.name, ctx.sessions, 10) },
  { achievement: { id: "monthly_freefall", name: "Fritt Fall", description: "Tappa 50+ Elo under en enskild kalendermånad", emoji: "📉", rarity: "rare" }, check: (p, ctx) => {
    const deltas = computePerMonthEloDeltas(p.name, ctx.sessions);
    return Object.values(deltas).some((d) => d <= -50);
  }},
  { achievement: { id: "the_clown", name: "Klovnen", description: "Förlora en final mot någon med 100+ lägre Elo", emoji: "🤡", rarity: "rare" }, check: (p, ctx) => hasLostToMuchLowerElo(p.name, ctx.sessions, 100) },
  { achievement: { id: "yellow_magnet", name: "Gula Magneten", description: "Samla 5+ gula kort totalt", emoji: "🧲", rarity: "rare" }, check: (p) => p.yellowCards >= 5 },
  { achievement: { id: "groundhog_day", name: "Groundhog Day", description: "Förlora mot samma person 5 gånger i rad i finaler", emoji: "🔄", rarity: "rare" }, check: (p, ctx) => hasGroundhogDay(p.name, ctx.sessions, 5) },
  { achievement: { id: "smaltisen", name: "Smältisen", description: "Förlora 3+ finaler under samma omgång", emoji: "🫠", rarity: "rare" }, check: (p, ctx) => hasSmaltisen(p.name, ctx.sessions, 3) },

  // Legendary
  { achievement: { id: "duck_king", name: "Ankkungen", description: "Ha lägst Elo av alla spelare med 50+ rundor", emoji: "🦆", rarity: "legendary" }, check: (_p, ctx) => {
    if (!ctx.eloEntry || ctx.eloEntry.matches < 50) return false;
    const qualified = Object.values(ctx.eloRatings).filter((e) => e.matches >= 50);
    if (qualified.length < 3) return false;
    return qualified.every((e) => ctx.eloEntry!.elo <= e.elo);
  }},
  { achievement: { id: "dark_side", name: "Mörka Sidan", description: "Negativ Elo-delta 3 kalendermånader i rad", emoji: "🌑", rarity: "legendary" }, check: (p, ctx) => {
    const deltas = computePerMonthEloDeltas(p.name, ctx.sessions);
    const months = Object.keys(deltas).sort();
    let streak = 0;
    for (const m of months) {
      if (deltas[m] < 0) { streak++; if (streak >= 3) return true; } else { streak = 0; }
    }
    return false;
  }},
  { achievement: { id: "nemesis_fodder", name: "Nemesis-fodret", description: "Förlora 15+ gånger mot en enskild motståndare i finaler", emoji: "🎯", rarity: "legendary" }, check: (p) => {
    return Object.values(p.h2h).some((r) => r.losses >= 15);
  }},
  { achievement: { id: "the_snail", name: "Snigeln", description: "Spela 50+ rundor med under 20% vinstprocent", emoji: "🐌", rarity: "legendary" }, check: (p) => p.gamesPlayed >= 50 && p.bwp < 20 },
];

// The mythic "Completionist" achievement — unlocked when ALL other achievements are earned
const MYTHIC_COMPLETIONIST: AchievementCheck = {
  achievement: { id: "completionist", name: "Completionist", description: "Lås upp alla andra achievements", emoji: "🌠", rarity: "mythic" },
  check: () => false, // handled specially in computePlayerAchievements
};

function computePlayerAchievements(
  player: PlayerStats,
  sessions: GameSession[],
  eloRatings: Record<string, EloEntry>,
  allStats: PlayerStats[],
  savedAchievements: SavedPlayerAchievements = {},
): Achievement[] {
  const ctx: AchievementContext = { sessions, eloEntry: eloRatings[player.name] || null, eloRatings, allStats };
  const saved = savedAchievements[player.name] || [];
  const savedMap = new Map<string, SavedAchievement>(saved.map((s) => [s.achievementId, s]));

  // Live-computed achievements (currently qualifying)
  const liveIds = new Set(
    ALL_ACHIEVEMENTS.filter((a) => a.check(player, ctx)).map((a) => a.achievement.id)
  );

  // Merge: saved (permanent) + live (current). Saved wins even if live check now fails.
  const result: Achievement[] = [];
  const seenIds = new Set<string>();

  for (const ac of ALL_ACHIEVEMENTS) {
    const id = ac.achievement.id;
    const isSaved = savedMap.has(id);
    const isLive = liveIds.has(id);
    if (isSaved || isLive) {
      seenIds.add(id);
      result.push({
        ...ac.achievement,
        unlockedAt: savedMap.get(id)?.unlockedAt ?? Date.now(),
        isNew: isLive && !isSaved, // newly earned this cycle
      });
    }
  }

  // ── Mythic completionist check: has all non-mythic achievements been unlocked? ──
  const allNonMythicIds = ALL_ACHIEVEMENTS.map((a) => a.achievement.id);
  const unlockedIds = new Set(result.map((a) => a.id));
  const hasAllOthers = allNonMythicIds.every((id) => unlockedIds.has(id));
  const mythicId = MYTHIC_COMPLETIONIST.achievement.id;
  const mythicSaved = savedMap.has(mythicId);
  if (hasAllOthers || mythicSaved) {
    result.push({
      ...MYTHIC_COMPLETIONIST.achievement,
      unlockedAt: savedMap.get(mythicId)?.unlockedAt ?? Date.now(),
      isNew: hasAllOthers && !mythicSaved,
    });
  }

  return result;
}

/**
 * Sync achievements: compute for all players, merge with saved, persist any new ones.
 * Returns the updated saved achievements map (to be stored in state).
 */
function syncAchievements(
  stats: PlayerStats[],
  sessions: GameSession[],
  eloRatings: Record<string, EloEntry>,
  savedAchievements: SavedPlayerAchievements,
): { updated: SavedPlayerAchievements; hasNew: boolean } {
  const updated = { ...savedAchievements };
  let hasNew = false;

  for (const player of stats) {
    if (player.gamesPlayed === 0) continue;
    const ctx: AchievementContext = {
      sessions,
      eloEntry: eloRatings[player.name] || null,
      eloRatings,
      allStats: stats,
    };
    const existing = updated[player.name] || [];
    const existingIds = new Set(existing.map((e) => e.achievementId));
    const newEntries: SavedAchievement[] = [];

    for (const ac of ALL_ACHIEVEMENTS) {
      if (!existingIds.has(ac.achievement.id) && ac.check(player, ctx)) {
        newEntries.push({ achievementId: ac.achievement.id, unlockedAt: Date.now() });
        hasNew = true;
      }
    }

    if (newEntries.length > 0) {
      updated[player.name] = [...existing, ...newEntries];
    }

    // Check mythic completionist: has all non-mythic achievements
    const allIds = updated[player.name] || [];
    const allSavedIds = new Set(allIds.map((e) => e.achievementId));
    const allNonMythicIds = ALL_ACHIEVEMENTS.map((a) => a.achievement.id);
    const hasAll = allNonMythicIds.every((id) => allSavedIds.has(id));
    if (hasAll && !allSavedIds.has(MYTHIC_COMPLETIONIST.achievement.id)) {
      updated[player.name] = [...(updated[player.name] || []), { achievementId: MYTHIC_COMPLETIONIST.achievement.id, unlockedAt: Date.now() }];
      hasNew = true;
    }
  }

  return { updated, hasNew };
}

// ── LKAB Gruvrank System ──
// Maps percentile (0-100, where 100 = best) to LKAB mining depth ranks
// 7 tiers from Gråberg (surface waste) to Kärnan (earth's core)
interface CSGORank {
  name: string;
  shortName: string;
  tier: number;
  color: string;
  bgColor: string;
}

// 7 tiers — ping pong themed ranks from Ball Boy/Girl to Match‑Point Monarch
// Colors sourced from LKAB design palette
const CSGO_RANKS: { threshold: number; rank: CSGORank }[] = [
  { threshold: 98,  rank: { name: "Match\u2011Point Monarch", shortName: "MPM", tier: 7, color: "#FF5261", bgColor: "color-mix(in srgb, #FF5261 15%, transparent)" } },
  { threshold: 90,  rank: { name: "Smash Captain",            shortName: "SC",  tier: 6, color: "#F4BF0A", bgColor: "color-mix(in srgb, #F4BF0A 15%, transparent)" } },
  { threshold: 78,  rank: { name: "Net Ninja",                shortName: "NN",  tier: 5, color: "#00C474", bgColor: "color-mix(in srgb, #00C474 15%, transparent)" } },
  { threshold: 58,  rank: { name: "Spin Doctor",              shortName: "SD",  tier: 4, color: "#007DBF", bgColor: "color-mix(in srgb, #007DBF 15%, transparent)" } },
  { threshold: 35,  rank: { name: "Rally Rookie",             shortName: "RR",  tier: 3, color: "#54B2FA", bgColor: "color-mix(in srgb, #54B2FA 15%, transparent)" } },
  { threshold: 15,  rank: { name: "Warm\u2011Up Warrior",     shortName: "WW",  tier: 2, color: "#8EAFCE", bgColor: "color-mix(in srgb, #8EAFCE 15%, transparent)" } },
  { threshold: 0,   rank: { name: "Ball Boy/Girl",            shortName: "BB",  tier: 1, color: "#919284", bgColor: "color-mix(in srgb, #919284 15%, transparent)" } },
];

function getCSGORank(percentile: number): CSGORank {
  for (const { threshold, rank } of CSGO_RANKS) {
    if (percentile >= threshold) return rank;
  }
  return CSGO_RANKS[CSGO_RANKS.length - 1].rank;
}

function computePlayerPercentile(playerElo: number, allElos: number[]): number {
  if (allElos.length <= 1) return 50;
  const sorted = [...allElos].sort((a, b) => a - b);
  const rank = sorted.filter((e) => e < playerElo).length;
  return (rank / (sorted.length - 1)) * 100;
}

/**
 * Compute net Elo exchanged between each pair of players across all finals.
 * Returns a nested map: h2hElo[playerA][playerB] = net Elo that playerA gained from matches vs playerB.
 * This replays the full Elo simulation so deltas reflect the actual ratings at the time of each match.
 */
function computeH2HElo(sessions: GameSession[], eloResetTimestamp?: number | null): Record<string, Record<string, number>> {
  const ratings: Record<string, number> = {};
  const netElo: Record<string, Record<string, number>> = {};

  const ensure = (name: string) => {
    if (ratings[name] === undefined) ratings[name] = ELO_START;
    if (!netElo[name]) netElo[name] = {};
  };

  const sorted = [...sessions].sort((a, b) => a.date - b.date);

  for (const session of sorted) {
    if (eloResetTimestamp && session.date < eloResetTimestamp) continue;

    for (const player of session.players) ensure(player);

    for (const round of session.rounds) {
      if (round.finalists.length !== 2 || !round.winner) continue;

      const roundPlayers = round.players ?? session.players;
      const N = roundPlayers.length;

      const [p1, p2] = round.finalists;
      const winner = round.winner;
      const loser = winner === p1 ? p2 : p1;

      // Compute pot distribution (use pre-ante ratings)
      const rWinner = ratings[winner];
      const rLoser = ratings[loser];
      const { winnerDelta, loserDelta } = computePotDistribution(rWinner, rLoser, N);

      // Apply: non-finalists lose ante, finalists get pot share
      for (const player of roundPlayers) {
        ensure(player);
        if (player !== winner && player !== loser) {
          ratings[player] -= ELO_ANTE;
        }
      }
      ratings[winner] += winnerDelta;
      ratings[loser] += loserDelta;

      if (!netElo[winner][loser]) netElo[winner][loser] = 0;
      if (!netElo[loser][winner]) netElo[loser][winner] = 0;
      netElo[winner][loser] += winnerDelta;
      netElo[loser][winner] += loserDelta;
    }
  }

  return netElo;
}

function sortStats(stats: PlayerStats[], tab: SortTab, sortDir: "asc" | "desc" = "desc", eloRatings?: Record<string, EloEntry>, monthlyEloDelta?: Record<string, number>, monthlyRoundsPlayed?: Record<string, number>): PlayerStats[] {
  const sorted = [...stats];
  const dir = sortDir === "desc" ? 1 : -1;
  switch (tab) {
    case "vinster":
      return sorted.sort((a, b) => dir * (b.wins - a.wins) || b.bwp - a.bwp);
    case "finaler":
      return sorted.sort((a, b) => dir * (b.finals - a.finals) || b.wins - a.wins);
    case "bwp":
      return sorted.sort((a, b) => dir * (b.bwp - a.bwp) || b.wins - a.wins);
    case "finalprocent":
      return sorted.sort((a, b) => dir * (b.finalPct - a.finalPct) || b.finals - a.finals);
    case "vf":
      return sorted.sort((a, b) => dir * (b.vfPct - a.vfPct) || b.wins - a.wins);
    case "kort":
      return sorted.sort((a, b) => dir * ((b.yellowCards + b.redCards) - (a.yellowCards + a.redCards)) || b.wins - a.wins);
    case "elo":
      if (monthlyEloDelta) {
        return sorted.sort((a, b) => {
          const deltaA = monthlyEloDelta[a.name] ?? 0;
          const deltaB = monthlyEloDelta[b.name] ?? 0;
          const roundsA = monthlyRoundsPlayed?.[a.name] ?? 1;
          const roundsB = monthlyRoundsPlayed?.[b.name] ?? 1;
          const wA = weightedDelta(deltaA, roundsA);
          const wB = weightedDelta(deltaB, roundsB);
          return dir * (wB - wA) || dir * (deltaB - deltaA) || b.wins - a.wins;
        });
      }
      return sorted.sort((a, b) => {
        const eloA = eloRatings?.[a.name]?.elo ?? ELO_START;
        const eloB = eloRatings?.[b.name]?.elo ?? ELO_START;
        return dir * (eloB - eloA) || b.wins - a.wins;
      });
    default:
      return sorted.sort((a, b) => dir * (b.wins - a.wins));
  }
}

function getRankIcon(rank: number) {
  if (rank === 1) return <span style={{ fontSize: "var(--text-lg)" }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize: "var(--text-lg)" }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: "var(--text-lg)" }}>🥉</span>;
  return (
    <span
      className="text-muted-foreground"
      style={{ fontSize: "var(--text-label)" }}
    >
      {rank}
    </span>
  );
}

function formatSessionDate(ts: number): string {
  const d = new Date(ts);
  return (
    d.toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }) +
    ", " +
    d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })
  );
}

function formatRelativeDate(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Just nu";
  if (minutes < 60) return `${minutes} min sedan`;
  if (hours < 24) return `${hours}h sedan`;
  if (days < 7) return `${days}d sedan`;
  return new Date(ts).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

// ── Form dots component ──
// Uses distinct shapes per result type for accessibility (not just color):
//   W = upward triangle (▲), L = downward triangle (▼), F = diamond (◆), empty = ring (○)
function FormDots({ form }: { form: ("W" | "L" | "F")[] }) {
  const maxDots = 5;
  const dots: ("W" | "L" | "F" | "empty")[] = [
    ...Array(Math.max(0, maxDots - form.length)).fill("empty" as const),
    ...form,
  ];
  const size = 10;
  return (
    <div className="flex gap-1 items-center">
      {dots.map((r, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 10 10"
          className="shrink-0"
          role="img"
          aria-label={r === "W" ? "Vinst" : r === "F" ? "Förlust i final" : r === "L" ? "Förlorade" : "Ej spelad"}
        >
          <title>{r === "W" ? "Vinst" : r === "F" ? "Förlust i final" : r === "L" ? "Förlorade" : "Ej spelad"}</title>
          {r === "W" && (
            <polygon points="5,1 9.5,9 0.5,9" fill="var(--success)" />
          )}
          {r === "L" && (
            <polygon points="5,9 9.5,1 0.5,1" fill="var(--destructive)" />
          )}
          {r === "F" && (
            <polygon points="5,0.5 9.5,5 5,9.5 0.5,5" fill="var(--destructive)" opacity={0.75} />
          )}
          {r === "empty" && (
            <circle cx="5" cy="5" r="3.5" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.2" opacity={0.4} />
          )}
        </svg>
      ))}
    </div>
  );
}

// ── Stat card ──
function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border p-3 md:p-4 flex flex-col gap-0.5 md:gap-1"
      style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)" }}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span style={{ fontSize: "var(--text-label)", fontFamily: FONT }}>{label}</span>
      </div>
      <span
        className="truncate"
        style={{
          fontSize: "var(--text-h4)",
          fontWeight: "var(--font-weight-semibold)",
          color: color || "var(--foreground)",
          fontFamily: FONT,
        }}
      >
        {value}
      </span>
      {sub && (
        <span
          className="text-muted-foreground"
          style={{ fontSize: "var(--text-sm)" }}
        >
          {sub}
        </span>
      )}
    </motion.div>
  );
}

// ── Fun Facts Generator ──
function generateFunFacts(
  stats: PlayerStats[],
  sessions: GameSession[],
  prevMonthStats?: PlayerStats[],
): string[] {
  const facts: string[] = [];
  if (stats.length === 0 || sessions.length === 0) return facts;

  // Most active player
  const mostActive = [...stats].sort((a, b) => b.gamesPlayed - a.gamesPlayed)[0];
  if (mostActive && mostActive.gamesPlayed > 0) {
    facts.push(`${mostActive.name} har spelat flest rundor (${mostActive.gamesPlayed} st)`);
  }

  // Best win rate with minimum games
  const qualified = stats.filter((s) => s.gamesPlayed >= 3);
  if (qualified.length > 0) {
    const bestRate = [...qualified].sort((a, b) => b.bwp - a.bwp)[0];
    facts.push(`${bestRate.name} har bäst Vinst%: ${bestRate.bwp.toFixed(1)}%`);
  }

  // Best current streak
  const bestStreaker = [...stats].sort((a, b) => b.currentStreak - a.currentStreak)[0];
  if (bestStreaker && bestStreaker.currentStreak >= 2) {
    facts.push(`${bestStreaker.name} är on fire med ${bestStreaker.currentStreak} raka vinster! 🔥`);
  }

  // Worst current cold streak
  const coldestPlayer = [...stats].sort((a, b) => b.coldStreak - a.coldStreak)[0];
  if (coldestPlayer && coldestPlayer.coldStreak >= 2) {
    facts.push(`${coldestPlayer.name} har förlorat ${coldestPlayer.coldStreak} finaler i rad 🥶`);
  }

  // Most finals without a win
  const unlucky = stats.filter((s) => s.finals > 0 && s.wins === 0);
  if (unlucky.length > 0) {
    const mostUnlucky = [...unlucky].sort((a, b) => b.finals - a.finals)[0];
    facts.push(`${mostUnlucky.name} har nått ${mostUnlucky.finals} finaler utan att vinna — tuff!`);
  }

  // Best V/F (clutch player)
  const clutch = stats.filter((s) => s.finals >= 3);
  if (clutch.length > 0) {
    const bestClutch = [...clutch].sort((a, b) => b.vfPct - a.vfPct)[0];
    if (bestClutch.vfPct >= 60) {
      facts.push(`${bestClutch.name} vinner ${bestClutch.vfPct.toFixed(1)}% av sina finaler — clutch!`);
    }
  }

  // Biggest rivalry
  let biggestRivalry = { p1: "", p2: "", total: 0 };
  for (const s of stats) {
    for (const [opp, record] of Object.entries(s.h2h)) {
      const total = record.wins + record.losses;
      if (total > biggestRivalry.total) {
        biggestRivalry = { p1: s.name, p2: opp, total };
      }
    }
  }
  if (biggestRivalry.total >= 3) {
    const p1Stats = stats.find((s) => s.name === biggestRivalry.p1);
    const h2hRecord = p1Stats?.h2h[biggestRivalry.p2];
    if (h2hRecord) {
      facts.push(
        `Största rivaliteten: ${biggestRivalry.p1} vs ${biggestRivalry.p2} (${h2hRecord.wins}-${h2hRecord.losses})`
      );
    }
  }

  // Total rounds played
  const totalRounds = sessions.reduce((acc, s) => acc + s.rounds.length, 0);
  if (totalRounds > 0) {
    facts.push(`Totalt ${totalRounds} rundor spelade över ${sessions.length} omgångar`);
  }

  // ── #4 Populäraste speldagen ──
  const dayNames = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  let totalDayRounds = 0;
  for (const session of sessions) {
    const day = new Date(session.date).getDay();
    dayCounts[day] += session.rounds.length;
    totalDayRounds += session.rounds.length;
  }
  if (totalDayRounds > 0) {
    const peakDay = dayCounts.indexOf(Math.max(...dayCounts));
    const pct = ((dayCounts[peakDay] / totalDayRounds) * 100).toFixed(0);
    facts.push(`Det spelas mest på ${dayNames[peakDay]}ar — ${pct}% av alla rundor 📅`);
  }

  // ── #5 Dominans-index ──
  const dominators = stats
    .filter((s) => Object.keys(s.h2h).length >= 2)
    .map((s) => {
      const positiveH2H = Object.values(s.h2h).filter((r) => r.wins > r.losses).length;
      const totalOpponents = Object.keys(s.h2h).length;
      return { name: s.name, positiveH2H, totalOpponents };
    })
    .filter((d) => d.positiveH2H >= 2)
    .sort((a, b) => b.positiveH2H - a.positiveH2H);
  if (dominators.length > 0) {
    const top = dominators[0];
    facts.push(`${top.name} dominerar ${top.positiveH2H} av ${top.totalOpponents} motståndare i H2H 💪`);
  }

  // ── #6 Mest förbättrad (jämför med förra månadens Vinst%) ──
  if (prevMonthStats && prevMonthStats.length > 0) {
    let bestImprovement = 0;
    let improvedPlayer = "";
    for (const curr of stats) {
      if (curr.gamesPlayed < 3) continue;
      const prev = prevMonthStats.find(
        (p) => p.name === curr.name || stripEmoji(p.name) === stripEmoji(curr.name)
      );
      if (prev && prev.gamesPlayed >= 3) {
        const improvement = curr.bwp - prev.bwp;
        if (improvement > bestImprovement) {
          bestImprovement = improvement;
          improvedPlayer = curr.name;
        }
      }
    }
    if (bestImprovement > 1 && improvedPlayer) {
      facts.push(`${improvedPlayer} har förbättrats mest: +${bestImprovement.toFixed(1)} procentenheter Vinst% 📈`);
    }
  }

  // ── #8 Cold streak ──
  const coldPlayers = stats
    .filter((s) => s.recentForm.length >= 3)
    .map((s) => {
      let coldStreak = 0;
      for (let i = s.recentForm.length - 1; i >= 0; i--) {
        if (s.recentForm[i] !== "W") coldStreak++;
        else break;
      }
      return { name: s.name, coldStreak };
    })
    .filter((c) => c.coldStreak >= 3)
    .sort((a, b) => b.coldStreak - a.coldStreak);
  if (coldPlayers.length > 0) {
    const coldest = coldPlayers[0];
    facts.push(`${coldest.name} har inte vunnit på ${coldest.coldStreak} raka finaler — cold streak! 🥶`);
  }

  // ── #9 Nemesis-paret (mest ojämn H2H) ──
  let worstNemesis = { victim: "", bully: "", wins: 0, losses: 0, ratio: 0 };
  for (const s of stats) {
    for (const [opp, record] of Object.entries(s.h2h)) {
      const total = record.wins + record.losses;
      if (total >= 3 && record.losses > 0) {
        const ratio = record.losses / total;
        if (ratio > worstNemesis.ratio) {
          worstNemesis = { victim: s.name, bully: opp, wins: record.wins, losses: record.losses, ratio };
        }
      }
    }
  }
  if (worstNemesis.ratio >= 0.7 && (worstNemesis.wins + worstNemesis.losses) >= 3) {
    facts.push(
      `${worstNemesis.victim} har förlorat mot ${worstNemesis.bully} i ${worstNemesis.losses} av ${worstNemesis.wins + worstNemesis.losses} möten — ren nemesis! 😈`
    );
  }

  return facts.slice(0, 8);
}

// ── Luleå timezone helper (Europe/Stockholm) ──
const LULEA_TZ = "Europe/Stockholm";
function toLuleaDate(ts: number): Date {
  // Create a Date in Luleå timezone by parsing the locale string
  const str = new Date(ts).toLocaleString("sv-SE", { timeZone: LULEA_TZ });
  return new Date(str);
}

const WEEKDAY_NAMES_SV = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
const WEEKDAY_SHORT_SV = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];

interface PlayerInsights {
  /** Per-weekday stats: wins, finals, games, winRate */
  weekdays: { day: string; dayShort: string; dayIndex: number; wins: number; finals: number; games: number; winRate: number }[];
  /** Best weekday (highest win rate, min 2 games) */
  bestWeekday: { day: string; winRate: number } | null;
  /** Worst weekday (lowest win rate, min 2 games) */
  worstWeekday: { day: string; winRate: number } | null;
  /** Before lunch (< 12:00) stats */
  beforeLunch: { wins: number; finals: number; games: number; winRate: number };
  /** After lunch (>= 12:00) stats */
  afterLunch: { wins: number; finals: number; games: number; winRate: number };
  /** Time-of-day preference label */
  timePreference: "morning" | "afternoon" | "none";
  /** Most active hour bracket */
  peakHourLabel: string | null;
  /** Total sessions participated in */
  sessionCount: number;
  /** eXtrovert/Introvert — does the player perform better with more or fewer participants? */
  crowdPreference: "extrovert" | "introvert" | "none";
  /** Win rate in sessions with many players (above median) */
  largeCrowd: { wins: number; games: number; winRate: number };
  /** Win rate in sessions with few players (at or below median) */
  smallCrowd: { wins: number; games: number; winRate: number };
  /** Median player count across sessions */
  medianPlayerCount: number;
}

function computePlayerInsights(playerName: string, sessions: GameSession[]): PlayerInsights {
  // Per-weekday: [sun..sat]
  const wd = Array.from({ length: 7 }, (_, i) => ({ day: WEEKDAY_NAMES_SV[i], dayShort: WEEKDAY_SHORT_SV[i], dayIndex: i, wins: 0, finals: 0, games: 0, winRate: 0 }));
  const beforeLunch = { wins: 0, finals: 0, games: 0, winRate: 0 };
  const afterLunch = { wins: 0, finals: 0, games: 0, winRate: 0 };
  const hourBuckets: Record<string, number> = {};
  let sessionCount = 0;

  // Helper: match player by exact name OR stripped-emoji equivalence
  const strippedTarget = stripEmoji(playerName).trim();
  const nameMatches = (n: string | null | undefined) => !!n && (n === playerName || stripEmoji(n).trim() === strippedTarget);

  for (const session of sessions) {
    // Check both session.players AND round finalists/winners (data consistency guard)
    const inPlayers = session.players.some(nameMatches);
    const inRounds = session.rounds.some((r) => r.finalists.some(nameMatches) || nameMatches(r.winner) || (r.players && r.players.some(nameMatches)));
    if (!inPlayers && !inRounds) continue;
    sessionCount++;
    const lDate = toLuleaDate(session.date);
    const dayIdx = lDate.getDay(); // 0=sun
    const hour = lDate.getHours();
    const isBeforeLunch = hour < 12;

    // Track peak hours in 2-hour buckets
    const bucketStart = Math.floor(hour / 2) * 2;
    const bucketLabel = `${String(bucketStart).padStart(2, "0")}:00–${String(bucketStart + 2).padStart(2, "0")}:00`;
    hourBuckets[bucketLabel] = (hourBuckets[bucketLabel] || 0) + 1;

    for (const round of session.rounds) {
      const isFinalist = round.finalists.some(nameMatches);
      const isWinner = nameMatches(round.winner);
      // Only count rounds the player actually participated in (finalist or winner)
      if (!isFinalist && !isWinner) continue;

      // Weekday stats
      wd[dayIdx].games++;
      if (isFinalist) wd[dayIdx].finals++;
      if (isWinner) wd[dayIdx].wins++;

      // Time-of-day stats
      if (isBeforeLunch) {
        beforeLunch.games++;
        if (isFinalist) beforeLunch.finals++;
        if (isWinner) beforeLunch.wins++;
      } else {
        afterLunch.games++;
        if (isFinalist) afterLunch.finals++;
        if (isWinner) afterLunch.wins++;
      }
    }
  }

  // Compute win rates
  for (const d of wd) {
    d.winRate = d.games > 0 ? (d.wins / d.games) * 100 : 0;
  }
  beforeLunch.winRate = beforeLunch.games > 0 ? (beforeLunch.wins / beforeLunch.games) * 100 : 0;
  afterLunch.winRate = afterLunch.games > 0 ? (afterLunch.wins / afterLunch.games) * 100 : 0;

  // Best/worst weekday (min 2 games)
  const qualifiedDays = wd.filter((d) => d.games >= 2);
  const bestWeekday = qualifiedDays.length > 0
    ? (() => { const b = [...qualifiedDays].sort((a, b) => b.winRate - a.winRate)[0]; return { day: b.day, winRate: b.winRate }; })()
    : null;
  const worstWeekday = qualifiedDays.length > 1
    ? (() => { const w = [...qualifiedDays].sort((a, b) => a.winRate - b.winRate)[0]; return { day: w.day, winRate: w.winRate }; })()
    : null;

  // Time preference
  let timePreference: "morning" | "afternoon" | "none" = "none";
  if (beforeLunch.games >= 2 && afterLunch.games >= 2) {
    const diff = beforeLunch.winRate - afterLunch.winRate;
    if (diff > 5 && beforeLunch.winRate >= 5) timePreference = "morning";
    else if (diff < -5 && afterLunch.winRate >= 5) timePreference = "afternoon";
  } else if (beforeLunch.games >= 2 && beforeLunch.winRate >= 5) {
    timePreference = "morning";
  } else if (afterLunch.games >= 2 && afterLunch.winRate >= 5) {
    timePreference = "afternoon";
  }

  // Peak hour
  const peakHourLabel = Object.keys(hourBuckets).length > 0
    ? Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  // eXtrovert / Introvert — win rate by session size (threshold: 6 players)
  const CROWD_THRESHOLD = 6;
  const largeCrowd = { wins: 0, games: 0, winRate: 0 };
  const smallCrowd = { wins: 0, games: 0, winRate: 0 };
  for (const session of sessions) {
    const inP = session.players.some(nameMatches);
    const inR = session.rounds.some((r) => r.finalists.some(nameMatches) || nameMatches(r.winner) || (r.players && r.players.some(nameMatches)));
    if (!inP && !inR) continue;
    const bucket = session.players.length >= CROWD_THRESHOLD ? largeCrowd : smallCrowd;
    for (const round of session.rounds) {
      const isFin = round.finalists.some(nameMatches);
      if (isFin || nameMatches(round.winner)) bucket.games++;
      if (nameMatches(round.winner)) bucket.wins++;
    }
  }
  largeCrowd.winRate = largeCrowd.games > 0 ? (largeCrowd.wins / largeCrowd.games) * 100 : 0;
  smallCrowd.winRate = smallCrowd.games > 0 ? (smallCrowd.wins / smallCrowd.games) * 100 : 0;
  let crowdPreference: "extrovert" | "introvert" | "none" = "none";
  if (largeCrowd.games >= 2 && smallCrowd.games >= 2) {
    const diff = largeCrowd.winRate - smallCrowd.winRate;
    // Require the "better" bucket to actually have a meaningful win rate (≥5%)
    if (diff > 5 && largeCrowd.winRate >= 5) crowdPreference = "extrovert";
    else if (diff < -5 && smallCrowd.winRate >= 5) crowdPreference = "introvert";
  } else if (largeCrowd.games >= 2 && largeCrowd.winRate >= 5) {
    crowdPreference = "extrovert";
  } else if (smallCrowd.games >= 2 && smallCrowd.winRate >= 5) {
    crowdPreference = "introvert";
  }
  const medianPlayerCount = CROWD_THRESHOLD;

  return { weekdays: wd, bestWeekday, worstWeekday, beforeLunch, afterLunch, timePreference, peakHourLabel, sessionCount, crowdPreference, largeCrowd, smallCrowd, medianPlayerCount };
}

// ── H2H Insights: weekday & time-of-day breakdown for a specific matchup ──
interface H2HInsight {
  weekdays: { day: string; dayShort: string; dayIndex: number; p1Wins: number; p2Wins: number; total: number }[];
  beforeLunch: { p1Wins: number; p2Wins: number; total: number };
  afterLunch: { p1Wins: number; p2Wins: number; total: number };
  p1BestContext: string | null;
  p2BestContext: string | null;
  totalMeetings: number;
}

function computeH2HInsights(p1Name: string, p2Name: string, sessions: GameSession[]): H2HInsight {
  const wd = Array.from({ length: 7 }, (_, i) => ({
    day: WEEKDAY_NAMES_SV[i], dayShort: WEEKDAY_SHORT_SV[i], dayIndex: i,
    p1Wins: 0, p2Wins: 0, total: 0,
  }));
  const beforeLunch = { p1Wins: 0, p2Wins: 0, total: 0 };
  const afterLunch = { p1Wins: 0, p2Wins: 0, total: 0 };
  let totalMeetings = 0;
  const contextWins: Record<string, { p1: number; p2: number; label: string }> = {};

  // Emoji-aware name matchers
  const s1 = stripEmoji(p1Name).trim();
  const s2 = stripEmoji(p2Name).trim();
  const m1 = (n: string | null | undefined) => !!n && (n === p1Name || stripEmoji(n).trim() === s1);
  const m2 = (n: string | null | undefined) => !!n && (n === p2Name || stripEmoji(n).trim() === s2);

  for (const session of sessions) {
    const lDate = toLuleaDate(session.date);
    const dayIdx = lDate.getDay();
    const hour = lDate.getHours();
    const isBeforeLunch = hour < 12;
    const timeLabel = isBeforeLunch ? "fm" : "em";

    for (const round of session.rounds) {
      const bothFinalists = round.finalists.some(m1) && round.finalists.some(m2);
      if (!bothFinalists) continue;
      totalMeetings++;
      const p1Won = m1(round.winner);

      wd[dayIdx].total++;
      if (p1Won) wd[dayIdx].p1Wins++; else wd[dayIdx].p2Wins++;

      if (isBeforeLunch) {
        beforeLunch.total++;
        if (p1Won) beforeLunch.p1Wins++; else beforeLunch.p2Wins++;
      } else {
        afterLunch.total++;
        if (p1Won) afterLunch.p1Wins++; else afterLunch.p2Wins++;
      }

      const ctxKey = `${dayIdx}-${timeLabel}`;
      if (!contextWins[ctxKey]) {
        contextWins[ctxKey] = { p1: 0, p2: 0, label: `${WEEKDAY_NAMES_SV[dayIdx].toLowerCase()}ar ${timeLabel}` };
      }
      if (p1Won) contextWins[ctxKey].p1++; else contextWins[ctxKey].p2++;
    }
  }

  let p1BestContext: string | null = null;
  let p1BestRate = 0;
  let p2BestContext: string | null = null;
  let p2BestRate = 0;
  for (const ctx of Object.values(contextWins)) {
    const total = ctx.p1 + ctx.p2;
    if (total < 2) continue;
    const p1Rate = ctx.p1 / total;
    if (p1Rate > p1BestRate) { p1BestRate = p1Rate; p1BestContext = ctx.label; }
    const p2Rate = ctx.p2 / total;
    if (p2Rate > p2BestRate) { p2BestRate = p2Rate; p2BestContext = ctx.label; }
  }

  return { weekdays: wd, beforeLunch, afterLunch, p1BestContext, p2BestContext, totalMeetings };
}

// ── Registration flow steps ──
type RegStep = "select-players" | "select-finalists" | "select-winner";

// ── Player Select Step Component ──
function PlayerSelectStep({
  allKnownPlayers,
  selectedPlayers,
  setSelectedPlayers,
  togglePlayer,
  proceedToFinalists,
  allSelected,
  lastPlayers,
  statsMap,
  eloRatings,
  eloHistory,
}: {
  allKnownPlayers: string[];
  selectedPlayers: string[];
  setSelectedPlayers: React.Dispatch<React.SetStateAction<string[]>>;
  togglePlayer: (name: string) => void;
  proceedToFinalists: () => void;
  allSelected: boolean;
  lastPlayers: string[];
  statsMap: Record<string, PlayerStats | undefined>;
  eloRatings: Record<string, { elo: number; delta: number }>;
  eloHistory: Record<string, number[]>;
}) {
  const [playerSearch, setPlayerSearch] = useState("");
  const filtered = playerSearch.trim()
    ? allKnownPlayers.filter((n) => n.toLowerCase().includes(playerSearch.trim().toLowerCase()))
    : allKnownPlayers;

  return (
    <div>
      <h3
        className="text-foreground mb-1"
        style={{
          fontFamily: FONT,
          fontSize: "var(--text-h4)",
          fontWeight: "var(--font-weight-semibold)",
        }}
      >
        Vilka spelar?
      </h3>
      <p
        className="text-muted-foreground mb-4"
        style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
      >
        Välj alla spelare som deltar
      </p>

      {/* Quick actions row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => {
            if (allSelected) {
              setSelectedPlayers([]);
            } else {
              setSelectedPlayers([...allKnownPlayers]);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border hover:border-border-strong transition-all cursor-pointer"
          style={{
            background: "var(--surface-container)",
            borderRadius: "var(--radius-full, 9999px)",
            fontFamily: FONT,
            fontSize: "var(--text-sm)",
            color: "var(--foreground)",
          }}
        >
          {allSelected ? (
            <><X className="w-3.5 h-3.5 text-muted-foreground" /> Avmarkera alla</>
          ) : (
            <><Check className="w-3.5 h-3.5 text-muted-foreground" /> Välj alla</>
          )}
        </button>
        {lastPlayers.length >= 2 && (
          <button
            onClick={() => {
              const valid = lastPlayers.filter((p) => allKnownPlayers.includes(p));
              if (valid.length >= 2) setSelectedPlayers(valid);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border hover:border-border-strong transition-all cursor-pointer"
            style={{
              background: "var(--surface-container)",
              borderRadius: "var(--radius-full, 9999px)",
              fontFamily: FONT,
              fontSize: "var(--text-sm)",
              color: "var(--foreground)",
            }}
          >
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            Senaste ({lastPlayers.length})
          </button>
        )}
      </div>

      {/* Search filter (show if many players) */}
      {allKnownPlayers.length > 6 && (
        <div className="relative mb-3">
          <input
            type="text"
            value={playerSearch}
            onChange={(e) => setPlayerSearch(e.target.value)}
            placeholder="Sök spelare…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-sm)",
              background: "var(--surface-container-low, var(--surface-container))",
              borderRadius: "var(--radius-card)",
            }}
          />
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          {playerSearch && (
            <button
              onClick={() => setPlayerSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted/30 cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      {/* Player grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map((name) => {
          const selected = selectedPlayers.includes(name);
          const ps = statsMap[name];
          const elo = eloRatings[name]?.elo;
          const eloHist = eloHistory[name];
          return (
            <motion.button
              key={name}
              whileTap={{ scale: 0.97 }}
              onClick={() => togglePlayer(name)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-border-strong"
              }`}
              style={{
                background: selected ? undefined : "var(--surface-container)",
                borderRadius: "var(--radius-card)",
              }}
            >
              {/* Checkbox */}
              <div
                className={`w-5 h-5 rounded flex items-center justify-center border transition-all shrink-0 ${
                  selected ? "bg-primary border-primary" : "border-border-strong"
                }`}
                style={{ borderRadius: "var(--radius-badge, 4px)" }}
              >
                {selected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
              </div>

              {/* Name + stats */}
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span
                  className="text-foreground truncate w-full text-left"
                  style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-medium, 500)" }}
                >
                  {name}
                </span>
                {ps && ps.gamesPlayed > 0 ? (
                  <span
                    className="text-muted-foreground flex items-center gap-1.5 mt-0.5"
                    style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}
                  >
                    <Trophy className="w-3 h-3 shrink-0" />
                    {ps.wins}V
                    <span className="opacity-50">&middot;</span>
                    {ps.gamesPlayed}S
                    <span className="opacity-50">&middot;</span>
                    {elo ?? 1000}
                  </span>
                ) : (
                  <span
                    className="text-muted-foreground flex items-center gap-1.5 mt-0.5"
                    style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}
                  >
                    Elo {elo ?? 1000}
                  </span>
                )}
              </div>

              {/* Mini sparkline + form */}
              <div className="flex items-center gap-2 shrink-0">
                {ps && ps.recentForm.length > 0 && (
                  <FormDots form={ps.recentForm} />
                )}
                {eloHist && eloHist.length >= 2 && (
                  <EloSparkline data={eloHist} width={36} height={14} strokeWidth={1} />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* No results */}
      {filtered.length === 0 && playerSearch.trim() && (
        <p
          className="text-center text-muted-foreground py-6"
          style={{ fontFamily: FONT, fontSize: "var(--text-sm)" }}
        >
          Ingen spelare matchar &ldquo;{playerSearch}&rdquo;
        </p>
      )}

      {/* Continue button */}
      <div className="mt-6">
        <button
          onClick={proceedToFinalists}
          disabled={selectedPlayers.length < 5}
          className="w-full py-3 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            fontFamily: FONT,
            fontSize: "var(--text-label)",
            fontWeight: "var(--font-weight-semibold)",
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            borderRadius: "var(--radius-card)",
          }}
        >
          Fortsätt ({selectedPlayers.length} valda, minst 5)
        </button>
      </div>
    </div>
  );
}

export function HighscorePage() {
  const [players, setPlayers] = useState<string[]>([]);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [sortTab, setSortTab] = useState<SortTab>("elo");
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Monthly system
  const [currentMonth] = useState<string>(getCurrentMonth());
  const [selectedMonth, setSelectedMonth] = useState<MonthView>(getCurrentMonth());
  const [monthList, setMonthList] = useState<string[]>([]);
  const [allMonthlySessions, setAllMonthlySessions] = useState<Record<string, GameSession[]>>({});
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [devSectionOpen, setDevSectionOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePlayer1, setComparePlayer1] = useState<string | null>(null);
  const [comparePlayer2, setComparePlayer2] = useState<string | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiCopied, setApiCopied] = useState<string | null>(null);
  const [apiPreview, setApiPreview] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Registration flow
  const [registering, setRegistering] = useState(false);
  const [regStep, setRegStep] = useState<RegStep>("select-players");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [currentRounds, setCurrentRounds] = useState<GameRound[]>([]);
  const [hasUndone, setHasUndone] = useState(false);
  const [selectedFinalists, setSelectedFinalists] = useState<string[]>([]);
  const [pendingWinner, setPendingWinner] = useState<string | null>(null);
  const [rosterOpen, setRosterOpen] = useState(false);

  // Add player dialog
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🏓");
  const [showEmojiGrid, setShowEmojiGrid] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");

  // Loading
  const [loading, setLoading] = useState(true);
  const seedCheckedRef = useRef(false);
  const [historicalStats, setHistoricalStats] = useState<HistoricalStats>({});
  const [playerCards, setPlayerCards] = useState<PlayerCards>({});
  const [tournamentHistory, setTournamentHistory] = useState<TournamentHistoryEntry[]>([]);
  const [savedAchievements, setSavedAchievements] = useState<SavedPlayerAchievements>({});
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showGraphView, setShowGraphView] = useState(false);
  const [showRankingInfoModal, setShowRankingInfoModal] = useState(false);

  const [factIndex, setFactIndex] = useState(0);
  const [confirmRemovePlayer, setConfirmRemovePlayer] = useState<string | null>(null);
  const [showLockedAchievements, setShowLockedAchievements] = useState(false);

  // Rename player
  const [renamingPlayer, setRenamingPlayer] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Elo reset timestamp (sessions before this are ignored for Elo)
  const [eloResetTimestamp, setEloResetTimestamp] = useState<number | null>(null);

  // Navigation guard — block when a round is in progress
  const { registerGuard } = useNavigationGuard();
  const roundInProgressRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    roundInProgressRef.current = registering && currentRounds.length > 0;
  }, [registering, currentRounds]);

  useEffect(() => {
    return registerGuard(() => roundInProgressRef.current);
  }, [registerGuard]);

  // Delete session confirmation
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  // Close month picker on click outside
  useEffect(() => {
    if (!monthPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setMonthPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [monthPickerOpen]);

  // Mobile detection for responsive chart sizing
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Lock background scroll when player modal is open
  useEffect(() => {
    const mainEl = document.getElementById("main-scroll-area");
    if (selectedPlayer) {
      if (mainEl) mainEl.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      if (mainEl) mainEl.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      if (mainEl) mainEl.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [selectedPlayer]);

  const loadData = useCallback(async () => {
    const thisMonth = getCurrentMonth();
    let [p, h, ml, pc, th, sa, eloResetTs] = await Promise.all([
      fetchHighscorePlayers(),
      fetchHistoricalStats(),
      fetchMonthList(),
      fetchPlayerCards(),
      fetchTournamentHistory(),
      fetchPlayerAchievements(),
      fetchEloResetTimestamp(),
    ]);
    setPlayers(p);
    setHistoricalStats(h);
    setTournamentHistory(th);
    setPlayerCards(pc);
    setSavedAchievements(sa);
    setEloResetTimestamp(eloResetTs);

    // One-time seed: clear fake sessions/archived seasons & import real historical data.
    // IMPORTANT: Only check seed status on initial load (not on subsequent polls)
    // to prevent a transient network error from triggering a re-seed that would
    // overwrite any players added after the initial seed.
    if (!seedCheckedRef.current) {
      seedCheckedRef.current = true;
    const alreadySeeded = await fetchSeedStatus();
    if (!alreadySeeded) {
      console.log("[Highscore] Seeding real data and clearing fake sessions");
      const realPlayers = [
        "Hertsö-Waddlner 💅", "Eetu", "Mr Nyberg 🚬", "Tarzan Ibrahimović",
        "Robert", "Alexjander 🐣 (retired)", "dr drä och mr hyde - Provocateur👹",
        "Lodnert", "Jawe", "🧨dirty dirty Linus", "Jonken", "OK Renen",
        "Daniel K", "Björn", "Andreas S", "Jonte", "Patrik", "Mattias",
        "Johan E", "Jerker", "Kesokungen 🏠", "JonteOH", "Susanne",
        "TESTKINGEN", "KINGTESTEN",
      ];
      const realStats: HistoricalStats = {
        "Hertsö-Waddlner 💅": { wins: 29, finals: 44, gamesPlayed: 67 },
        "Eetu": { wins: 20, finals: 25, gamesPlayed: 55 },
        "Mr Nyberg 🚬": { wins: 14, finals: 40, gamesPlayed: 81 },
        "Tarzan Ibrahimović": { wins: 7, finals: 11, gamesPlayed: 21 },
        "Robert": { wins: 3, finals: 13, gamesPlayed: 45 },
        "Alexjander 🐣 (retired)": { wins: 3, finals: 10, gamesPlayed: 49 },
        "dr drä och mr hyde - Provocateur👹": { wins: 2, finals: 6, gamesPlayed: 63 },
        "Lodnert": { wins: 1, finals: 2, gamesPlayed: 7 },
        "Jawe": { wins: 1, finals: 3, gamesPlayed: 20 },
        "🧨dirty dirty Linus": { wins: 1, finals: 1, gamesPlayed: 20 },
        "Jonken": { wins: 0, finals: 4, gamesPlayed: 73 },
        "OK Renen": { wins: 0, finals: 0, gamesPlayed: 0 },
        "Daniel K": { wins: 0, finals: 0, gamesPlayed: 0 },
        "Björn": { wins: 0, finals: 0, gamesPlayed: 0 },
        "Andreas S": { wins: 0, finals: 0, gamesPlayed: 0 },
        "Jonte": { wins: 0, finals: 2, gamesPlayed: 11 },
        "Patrik": { wins: 0, finals: 0, gamesPlayed: 0 },
        "Mattias": { wins: 0, finals: 0, gamesPlayed: 0 },
        "Johan E": { wins: 0, finals: 0, gamesPlayed: 0 },
        "Jerker": { wins: 0, finals: 0, gamesPlayed: 0 },
        "Kesokungen 🏠": { wins: 0, finals: 0, gamesPlayed: 0 },
        "JonteOH": { wins: 0, finals: 1, gamesPlayed: 20 },
        "Susanne": { wins: 0, finals: 0, gamesPlayed: 0 },
        "TESTKINGEN": { wins: 0, finals: 0, gamesPlayed: 0 },
        "KINGTESTEN": { wins: 0, finals: 0, gamesPlayed: 0 },
      };
      // NOTE: We intentionally do NOT clear monthList or monthly sessions here.
      // If a re-seed ever fires (e.g. after a backend reset clears the seed
      // flag), wiping monthList would orphan all historical months. The seed
      // is meant to set baseline players/stats only, not destroy real history.
      await Promise.all([
        saveHighscoreSessions([]),
        saveArchivedSeasons([]),
        saveHighscorePlayers(realPlayers),
        saveHistoricalStats(realStats),
      ]);
      setPlayers(realPlayers);
      setHistoricalStats(realStats);
      // Preserve any existing month/session state — do NOT reset to empty.
      await markSeeded(); // Server-side flag — prevents re-seed from other browsers
      setLoading(false);
      return;
    }
    } // end seedCheckedRef guard

    // One-time migration: reconcile emoji-prefixed player names in session data
    // with the canonical player list. E.g. session has "🎩 TESTKINGEN" but
    // canonical list has "TESTKINGEN" (seed overwrote the emoji variant).
    const EMOJI_RECONCILE_KEY = "rpk-emoji-reconcile-v2";
    if (!localStorage.getItem(EMOJI_RECONCILE_KEY)) {
      // Collect ALL unique player names from session data
      const sessionPlayerNames = new Set<string>();
      const allMonthsForReconcile = ml.length > 0 ? ml : [thisMonth];
      const reconcileSessions = await Promise.all(
        allMonthsForReconcile.map((m) => fetchMonthlySessions(m))
      );
      for (const monthSess of reconcileSessions) {
        for (const session of monthSess) {
          for (const sp of session.players) sessionPlayerNames.add(sp);
          for (const round of session.rounds) {
            for (const f of round.finalists) sessionPlayerNames.add(f);
            if (round.winner) sessionPlayerNames.add(round.winner);
          }
        }
      }

      // Build a map: stripped name → emoji-prefixed name from sessions
      const strippedToSessionName: Record<string, string> = {};
      for (const sn of sessionPlayerNames) {
        const stripped = stripEmoji(sn).trim();
        // Only record if session name differs from stripped (i.e. has emoji prefix)
        if (sn !== stripped) {
          strippedToSessionName[stripped] = sn;
        }
      }

      // Find canonical players whose stripped name matches a session emoji name
      let needsUpdate = false;
      const updatedPlayers = p.map((canonical) => {
        const emojiVersion = strippedToSessionName[canonical];
        if (emojiVersion && !p.includes(emojiVersion)) {
          console.log(`[Highscore] Reconciling player name: "${canonical}" → "${emojiVersion}" (matches session data)`);
          needsUpdate = true;
          return emojiVersion;
        }
        return canonical;
      });

      if (needsUpdate) {
        // Also transfer historical stats to the new key
        const updatedStats = { ...h };
        for (const [stripped, emojiName] of Object.entries(strippedToSessionName)) {
          if (updatedStats[stripped] && !updatedStats[emojiName]) {
            updatedStats[emojiName] = updatedStats[stripped];
            delete updatedStats[stripped];
            console.log(`[Highscore] Transferred historical stats: "${stripped}" → "${emojiName}"`);
          }
        }
        const sortedPlayers = updatedPlayers.sort((a, b) => a.localeCompare(b, "sv"));
        await Promise.all([
          saveHighscorePlayers(sortedPlayers),
          saveHistoricalStats(updatedStats),
        ]);
        setPlayers(sortedPlayers);
        setHistoricalStats(updatedStats);
        p = sortedPlayers;
        h = updatedStats;
      }

      localStorage.setItem(EMOJI_RECONCILE_KEY, "done");
    }

    // Migration: move legacy flat sessions to monthly keys (one-time)
    const MIGRATION_KEY = "rpk-monthly-migration-v1";
    const alreadyMigrated = localStorage.getItem(MIGRATION_KEY);
    if (!alreadyMigrated) {
      const legacySessions = await fetchHighscoreSessions();
      if (legacySessions.length > 0) {
        console.log("[Highscore] Migrating legacy sessions to monthly keys");
        // Group sessions by month
        const grouped: Record<string, GameSession[]> = {};
        for (const s of legacySessions) {
          const d = new Date(s.date);
          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (!grouped[m]) grouped[m] = [];
          grouped[m].push(s);
        }
        const migratedMonths = Object.keys(grouped).sort();
        await Promise.all([
          ...migratedMonths.map((m) => saveMonthlySessions(m, grouped[m])),
          saveMonthList(migratedMonths),
          saveHighscoreSessions([]), // clear legacy
        ]);
      }
      localStorage.setItem(MIGRATION_KEY, "done");
    }

    // Fetch updated month list
    let months = alreadyMigrated ? ml : await fetchMonthList();
    // Recovery: always merge in any months discovered from underlying session
    // data on the server, in case monthList is stale (e.g. wiped by a prior
    // re-seed but the session keys still exist).
    const discovered = await discoverMonths();
    console.log(
      `[Highscore] discoverMonths() found ${discovered.length} months on server:`,
      discovered,
      `| current monthList from server:`,
      months,
    );
    let recovered = false;
    for (const dm of discovered) {
      if (!months.includes(dm)) {
        months.push(dm);
        recovered = true;
      }
    }
    if (recovered) {
      console.log("[Highscore] Recovered months from session data:", discovered);
    }
    // Ensure current month + archived stat months are all in the list
    let updatedMonths = [...months];
    let monthListChanged = recovered;
    if (!updatedMonths.includes(thisMonth)) { updatedMonths.push(thisMonth); monthListChanged = true; }
    for (const am of ARCHIVED_STAT_MONTHS) {
      if (!updatedMonths.includes(am)) { updatedMonths.push(am); monthListChanged = true; }
    }
    // Ensure the historical baseline month (March 2026) is also included
    if (!updatedMonths.includes(HISTORICAL_DATA_MONTH)) { updatedMonths.push(HISTORICAL_DATA_MONTH); monthListChanged = true; }
    if (monthListChanged) {
      await saveMonthList(updatedMonths);
    }
    setMonthList(updatedMonths.sort());

    // Fetch sessions for all known months
    const allMonthsSorted = updatedMonths.sort();
    const monthSessions = await Promise.all(
      allMonthsSorted.map((m) => fetchMonthlySessions(m))
    );
    const sessionMap: Record<string, GameSession[]> = {};
    let sessionDataRepaired = false;
    allMonthsSorted.forEach((m, i) => {
      // Repair data: ensure session.players includes all finalists/winners
      sessionMap[m] = monthSessions[i].map((session) => {
        const playerSet = new Set(session.players);
        for (const round of session.rounds) {
          for (const f of round.finalists) playerSet.add(f);
          if (round.winner) playerSet.add(round.winner);
        }
        if (playerSet.size !== session.players.length) {
          console.log(`[Highscore] Repaired session ${session.id}: added missing players from rounds`, Array.from(playerSet).filter((pp) => !session.players.includes(pp)));
          sessionDataRepaired = true;
          return { ...session, players: Array.from(playerSet) };
        }
        return session;
      });
    });
    // Persist repaired sessions
    if (sessionDataRepaired) {
      console.log("[Highscore] Saving repaired session data");
      await Promise.all(
        allMonthsSorted.map((m) => saveMonthlySessions(m, sessionMap[m]))
      );
    }
    setAllMonthlySessions(sessionMap);

    // Set current view sessions
    setSessions(sessionMap[thisMonth] || []);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Determine which sessions to show based on selected month view
  const activeSessions = useMemo(() => {
    if (selectedMonth === "total") {
      // All sessions from all months
      return Object.values(allMonthlySessions).flat();
    }
    return allMonthlySessions[selectedMonth] || [];
  }, [selectedMonth, allMonthlySessions]);

  const activePlayers = players;

  // Historical stats apply to "total" view and the month the data originates from (March 2026).
  // Archived month stats apply when viewing a specific archived month (e.g. Feb 2026).
  // For "total", we aggregate ALL archived months + the KV baseline (March 2026).
  const activeHistorical: HistoricalStats = useMemo(() => {
    if (selectedMonth === "total") {
      // Merge all archived month data + KV baseline into one cumulative object
      const merged: HistoricalStats = {};
      const mergeInto = (name: string, data: { wins: number; finals: number; gamesPlayed: number; h2h?: Record<string, { wins: number; losses: number }> }) => {
        if (!merged[name]) {
          merged[name] = { wins: 0, finals: 0, gamesPlayed: 0 };
        }
        merged[name].wins += data.wins;
        merged[name].finals += data.finals;
        merged[name].gamesPlayed += data.gamesPlayed;
        if (data.h2h) {
          if (!merged[name].h2h) merged[name].h2h = {};
          for (const [opp, record] of Object.entries(data.h2h)) {
            if (!merged[name].h2h![opp]) merged[name].h2h![opp] = { wins: 0, losses: 0 };
            merged[name].h2h![opp].wins += record.wins;
            merged[name].h2h![opp].losses += record.losses;
          }
        }
      };
      // First, add all archived months
      for (const monthKey of ARCHIVED_STAT_MONTHS) {
        const monthData = ARCHIVED_MONTH_STATS[monthKey];
        for (const [name, data] of Object.entries(monthData)) {
          mergeInto(name, data);
        }
      }
      // Then add the KV baseline (March 2026 data)
      for (const [name, data] of Object.entries(historicalStats)) {
        mergeInto(name, data);
      }
      return merged;
    }
    if (selectedMonth === HISTORICAL_DATA_MONTH) {
      return historicalStats;
    }
    if (ARCHIVED_MONTH_STATS[selectedMonth]) {
      return ARCHIVED_MONTH_STATS[selectedMonth];
    }
    return {};
  }, [selectedMonth, historicalStats]);

  const isViewingCurrentMonth = selectedMonth === currentMonth;
  const isArchivedStatMonth = typeof selectedMonth === "string" && !!ARCHIVED_MONTH_STATS[selectedMonth];

  const stats = useMemo(
    () => computeStats(activeSessions, activePlayers, activeHistorical, playerCards, tournamentHistory),
    [activeSessions, activePlayers, activeHistorical, playerCards, tournamentHistory]
  );

  // Elo is always computed from ALL sessions (not filtered by month) to give a global rating
  const allSessions = useMemo(() => Object.values(allMonthlySessions).flat(), [allMonthlySessions]);
  const lastPlayedMap = useMemo(() => computeLastPlayed(allSessions), [allSessions]);
  const eloRatings = useMemo(() => {
    const raw = computeElo(allSessions, players, eloResetTimestamp);
    return applyEloDecay(raw, lastPlayedMap, eloResetTimestamp);
  }, [allSessions, players, eloResetTimestamp, lastPlayedMap]);
  const h2hElo = useMemo(() => computeH2HElo(allSessions, eloResetTimestamp), [allSessions, eloResetTimestamp]);
  const eloHistory = useMemo(() => computeEloHistory(allSessions, players, eloResetTimestamp), [allSessions, players, eloResetTimestamp]);

  // Preliminary Elo: includes unsaved rounds from the current session so that
  // finalist Elo previews are accurate within an ongoing session.
  const preliminaryEloRatings = useMemo(() => {
    if (currentRounds.length === 0) return eloRatings;
    const tempSession: GameSession = {
      id: "pending",
      date: Date.now(),
      players: selectedPlayers,
      rounds: currentRounds,
    };
    const raw = computeElo([...allSessions, tempSession], players, eloResetTimestamp);
    // Players in the current session are active right now, so no decay for them
    const updatedLastPlayed = { ...lastPlayedMap };
    for (const p of selectedPlayers) updatedLastPlayed[p] = Date.now();
    return applyEloDecay(raw, updatedLastPlayed, eloResetTimestamp);
  }, [currentRounds, selectedPlayers, allSessions, players, eloRatings, eloResetTimestamp, lastPlayedMap]);

  // Monthly Elo delta + rounds played: for month views, compute Elo at month start vs Elo at month end
  const monthlyData: { delta: Record<string, number>; rounds: Record<string, number> } | undefined = useMemo(() => {
    if (selectedMonth === "total") return undefined;
    const monthStr = selectedMonth as string;
    const [y, m] = monthStr.split("-").map(Number);
    const monthStart = new Date(y, m - 1, 1).getTime();
    const monthEnd = new Date(y, m, 1).getTime();

    const sessionsBeforeMonth = allSessions.filter(s => s.date < monthStart);
    const sessionsDuringMonth = allSessions.filter(s => s.date >= monthStart && s.date < monthEnd);
    if (sessionsDuringMonth.length === 0) return undefined;

    const eloBefore = computeElo(sessionsBeforeMonth, players, eloResetTimestamp);
    const eloAfter = computeElo([...sessionsBeforeMonth, ...sessionsDuringMonth], players, eloResetTimestamp);

    const delta: Record<string, number> = {};
    const allNames = new Set([...Object.keys(eloBefore), ...Object.keys(eloAfter)]);
    for (const name of allNames) {
      const before = eloBefore[name]?.elo ?? ELO_START;
      const after = eloAfter[name]?.elo ?? ELO_START;
      delta[name] = after - before;
    }

    // Count rounds played per player this month
    const rounds: Record<string, number> = {};
    for (const session of sessionsDuringMonth) {
      const participantSet = new Set<string>();
      for (const p of session.players || []) participantSet.add(p);
      for (const round of session.rounds) {
        for (const f of round.finalists) participantSet.add(f);
        if (round.winner) participantSet.add(round.winner);
      }
      const participants = Array.from(participantSet);
      for (const _round of session.rounds) {
        for (const p of participants) {
          rounds[p] = (rounds[p] || 0) + 1;
        }
      }
    }

    return { delta, rounds };
  }, [selectedMonth, allSessions, players, eloResetTimestamp]);

  const monthlyEloDelta = monthlyData?.delta;
  const monthlyRoundsPlayed = monthlyData?.rounds;

  const isMonthView = selectedMonth !== "total";

  const sortedStats = useMemo(() => sortStats(stats, sortTab, sortDir, eloRatings, monthlyEloDelta, monthlyRoundsPlayed), [stats, sortTab, sortDir, eloRatings, monthlyEloDelta, monthlyRoundsPlayed]);

  function exportStatsCsv() {
    const headers = [
      "Namn", "Elo", "Vinster", "Finaler", "Spelat", "Vinst%", "Final%", "Finalvinst%",
      "Bästa streak", "Kall streak", "Gula kort", "Röda kort", "Turneringsvinster",
      "Nemesis", "Prey",
      "Bästa dag", "Bästa dag vinst%", "Sämsta dag", "Sämsta dag vinst%",
      "Tidspreferens", "Peak-timme",
      "Före lunch spel", "Före lunch vinst%", "Efter lunch spel", "Efter lunch vinst%",
      "Folkpreferens", "Median gruppstorlek",
      "Stor grupp vinst%", "Liten grupp vinst%",
      "Omgångar", "H2H (motståndare:V-F)"
    ];
    const rows = sortedStats.map((s) => {
      const elo = eloRatings[s.name]?.elo ?? ELO_START;
      const insights = computePlayerInsights(stripEmoji(s.name), activeSessions);
      const h2hEntries = Object.entries(s.h2h)
        .filter(([, r]) => r.wins + r.losses > 0)
        .sort((a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))
        .map(([opp, r]) => `${stripEmoji(opp)}:${r.wins}-${r.losses}`)
        .join(" | ");
      return [
        stripEmoji(s.name),
        elo,
        s.wins,
        s.finals,
        s.gamesPlayed,
        s.bwp.toFixed(1),
        s.finalPct.toFixed(1),
        s.vfPct.toFixed(1),
        s.bestStreak,
        s.worstColdStreak,
        s.yellowCards,
        s.redCards,
        s.tournamentWins,
        s.nemesis ? stripEmoji(s.nemesis) : "",
        s.prey ? stripEmoji(s.prey) : "",
        insights.bestWeekday?.day ?? "",
        insights.bestWeekday ? insights.bestWeekday.winRate.toFixed(1) : "",
        insights.worstWeekday?.day ?? "",
        insights.worstWeekday ? insights.worstWeekday.winRate.toFixed(1) : "",
        insights.timePreference === "morning" ? "Förmiddag" : insights.timePreference === "afternoon" ? "Eftermiddag" : "Ingen",
        insights.peakHourLabel ?? "",
        insights.beforeLunch.games,
        insights.beforeLunch.winRate.toFixed(1),
        insights.afterLunch.games,
        insights.afterLunch.winRate.toFixed(1),
        insights.crowdPreference === "extrovert" ? "Stor grupp" : insights.crowdPreference === "introvert" ? "Liten grupp" : "Ingen",
        insights.medianPlayerCount,
        insights.largeCrowd.winRate.toFixed(1),
        insights.smallCrowd.winRate.toFixed(1),
        insights.sessionCount,
        h2hEntries,
      ].join(";");
    });
    const csv = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const label = selectedMonth === "total" ? "Total" : selectedMonth;
    a.download = `rundpingis-statistik-${label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Achievement sync: persist newly earned achievements ──
  const achievementSyncRef = useRef(false);
  const savedAchievementsRef = useRef(savedAchievements);
  savedAchievementsRef.current = savedAchievements;
  useEffect(() => {
    if (stats.length === 0 || Object.keys(eloRatings).length === 0) return;
    if (achievementSyncRef.current) return;
    const { updated, hasNew } = syncAchievements(stats, allSessions, eloRatings, savedAchievementsRef.current);
    if (hasNew) {
      setSavedAchievements(updated);
      achievementSyncRef.current = true;
      savePlayerAchievements(updated).finally(() => {
        setTimeout(() => { achievementSyncRef.current = false; }, 10000);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, eloRatings, allSessions]);

  // Achievement ownership counts: how many players have each achievement
  const achievementOwnerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ac of [...ALL_ACHIEVEMENTS, MYTHIC_COMPLETIONIST]) {
      counts[ac.achievement.id] = 0;
    }
    const activePlayers = stats.filter((p) => p.gamesPlayed > 0);
    for (const player of activePlayers) {
      const unlocked = computePlayerAchievements(player, allSessions, eloRatings, stats, savedAchievements);
      for (const a of unlocked) {
        counts[a.id] = (counts[a.id] || 0) + 1;
      }
    }
    return counts;
  }, [stats, allSessions, eloRatings, savedAchievements]);

  // Session attendance: how many sessions each player attended
  const sessionAttendance = useMemo(() => {
    const totalSessions = allSessions.length;
    const attendance: Record<string, { attended: number; total: number; rate: number }> = {};
    for (const player of players) {
      const stripped = stripEmoji(player);
      const attended = allSessions.filter((s) => {
        if (s.players.includes(player)) return true;
        return s.players.some((p) => stripEmoji(p) === stripped);
      }).length;
      attendance[player] = {
        attended,
        total: totalSessions,
        rate: totalSessions > 0 ? (attended / totalSessions) * 100 : 0,
      };
    }
    return attendance;
  }, [allSessions, players]);

  // Revenge data for selected player
  const revengeData = useMemo(() => {
    if (!selectedPlayer) return [];
    return computeRevengeData(selectedPlayer.name, allSessions);
  }, [selectedPlayer, allSessions]);

  // Season summary for the selected month (only for non-"total" views)
  const seasonSummary = useMemo(() => {
    if (typeof selectedMonth !== "string" || selectedMonth === "total") return null;
    const monthSessions = allMonthlySessions[selectedMonth] || [];
    if (monthSessions.length === 0) return null;
    // Gather all sessions from months before this one
    const sortedMonths = Object.keys(allMonthlySessions).sort();
    const beforeSessions: GameSession[] = [];
    for (const m of sortedMonths) {
      if (m >= selectedMonth) break;
      beforeSessions.push(...allMonthlySessions[m]);
    }
    return computeSeasonSummary(selectedMonth, monthSessions, beforeSessions, players, eloResetTimestamp);
  }, [selectedMonth, allMonthlySessions, players, eloResetTimestamp]);
  const [showSeasonSummary, setShowSeasonSummary] = useState(false);

  const recentSessions = useMemo(() => {
    return [...activeSessions].sort((a, b) => b.date - a.date);
  }, [activeSessions]);

  const visibleSessions = showAllSessions ? recentSessions : recentSessions.slice(0, 5);

  const hasSessions = activeSessions.length > 0;

  // Always show all columns regardless of whether data exists
  const hasFormData = true;
  const hasStreakData = true;

  // Compute previous month stats for "most improved" fun fact
  const prevMonthStats = useMemo(() => {
    if (typeof selectedMonth !== "string" || selectedMonth === "total") return undefined;
    const [y, m] = selectedMonth.split("-").map(Number);
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const prevKey = `${prevY}-${String(prevM).padStart(2, "0")}`;
    const prevSessions = allMonthlySessions[prevKey] || [];
    const prevHistorical = ARCHIVED_MONTH_STATS[prevKey] || (prevKey === HISTORICAL_DATA_MONTH ? historicalStats : {});
    if (prevSessions.length === 0 && Object.keys(prevHistorical).length === 0) return undefined;
    return computeStats(prevSessions, activePlayers, prevHistorical, playerCards, tournamentHistory);
  }, [selectedMonth, allMonthlySessions, activePlayers, historicalStats, playerCards, tournamentHistory]);

  const funFacts = useMemo(() => generateFunFacts(stats, activeSessions, prevMonthStats), [stats, activeSessions, prevMonthStats]);

  // Auto-cycle fun facts
  useEffect(() => {
    if (funFacts.length <= 1) return;
    const timer = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % funFacts.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [funFacts.length]);

  // Hero stats
  const topPlayer = useMemo(
    () => [...stats].sort((a, b) => b.wins - a.wins)[0],
    [stats]
  );
  const hotPlayer = useMemo(
    () => [...stats].sort((a, b) => b.currentStreak - a.currentStreak)[0],
    [stats]
  );
  const coldPlayer = useMemo(
    () => [...stats].sort((a, b) => b.coldStreak - a.coldStreak)[0],
    [stats]
  );

  // Player insights (weekday/time analysis)
  const playerInsights = useMemo(() => {
    if (!selectedPlayer) return null;
    return computePlayerInsights(selectedPlayer.name, activeSessions);
  }, [selectedPlayer, activeSessions]);

  // Previous month stats for the selected player (for delta display in player card)
  const prevPlayerStats = useMemo(() => {
    if (!selectedPlayer || !prevMonthStats) return null;
    return prevMonthStats.find(
      (p) => p.name === selectedPlayer.name || stripEmoji(p.name) === stripEmoji(selectedPlayer.name)
    ) || null;
  }, [selectedPlayer, prevMonthStats]);

  // ── Add player ──
  async function handleAddPlayer() {
    const name = newPlayerName.trim();
    if (!name) return;
    setDuplicateError("");

    // Check for duplicate by comparing the plain-text part of existing names
    const nameLower = name.toLowerCase();
    const existingMatch = players.find(
      (p) => stripEmoji(p).toLowerCase() === nameLower || p.toLowerCase() === nameLower
    );
    if (existingMatch) {
      setDuplicateError(`"${existingMatch}" finns redan i listan.`);
      return;
    }

    const fullName = `${selectedEmoji} ${name}`;
    const updated = [...players, fullName].sort((a, b) => a.localeCompare(b, "sv"));
    setPlayers(updated);
    setNewPlayerName("");
    setDuplicateError("");
    setSelectedEmoji(PLAYER_EMOJIS[Math.floor(Math.random() * PLAYER_EMOJIS.length)]);
    setShowAddPlayer(false);
    setShowEmojiGrid(false);
    await saveHighscorePlayers(updated);
  }

  // ── Registration flow ──
  function startRegistration() {
    setRegistering(true);
    setRegStep("select-players");
    setSelectedPlayers([]);
    setCurrentRounds([]);
    setSelectedFinalists([]);
  }

  function togglePlayer(name: string) {
    setSelectedPlayers((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  }

  function proceedToFinalists() {
    if (selectedPlayers.length < 5) return;
    setRegStep("select-finalists");
    setSelectedFinalists([]);
  }

  function toggleFinalist(name: string) {
    setSelectedFinalists((prev) => {
      if (prev.includes(name)) return prev.filter((p) => p !== name);
      if (prev.length >= 2) return prev;
      return [...prev, name];
    });
  }

  function proceedToWinner() {
    if (selectedFinalists.length !== 2) return;
    setPendingWinner(null);
    setRegStep("select-winner");
  }

  function selectWinner(name: string) {
    const round: GameRound = {
      finalists: selectedFinalists as [string, string],
      winner: name,
      players: [...selectedPlayers],
    };
    setCurrentRounds((prev) => [...prev, round]);
    setHasUndone(false);
    setSelectedFinalists([]);
    setRegStep("select-finalists");
  }

  function undoLastRound() {
    if (currentRounds.length === 0 || hasUndone) return;
    setCurrentRounds((prev) => prev.slice(0, -1));
    setHasUndone(true);
  }

  // Auto-advance to winner step when 2 finalists selected
  useEffect(() => {
    if (regStep === "select-finalists" && selectedFinalists.length === 2) {
      proceedToWinner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regStep, selectedFinalists.length]);

  function removePlayerFromRoster(name: string) {
    setSelectedPlayers((prev) => prev.filter((p) => p !== name));
    setSelectedFinalists((prev) => prev.filter((f) => f !== name));
  }

  function addPlayerToRoster(name: string) {
    setSelectedPlayers((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }

  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);

  async function saveSession() {
    if (currentRounds.length === 0 || saving) return;
    setSaving(true);
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Include all players who appeared in any round (even if removed from roster)
    const roundPlayers = new Set<string>();
    currentRounds.forEach((r) => {
      r.finalists.forEach((f) => roundPlayers.add(f));
    });
    const allSessionPlayers = Array.from(new Set([...selectedPlayers, ...roundPlayers]));
    const session: GameSession = {
      id: sessionId,
      date: Date.now(),
      players: allSessionPlayers,
      rounds: currentRounds,
    };
    const month = currentMonth;
    const currentSessions = allMonthlySessions[month] || [];
    const updated = [session, ...currentSessions];
    setAllMonthlySessions((prev) => ({ ...prev, [month]: updated }));
    setSessions(updated);

    // Ensure month is in the list
    if (!monthList.includes(month)) {
      const newMonths = [...monthList, month].sort();
      setMonthList(newMonths);
      await saveMonthList(newMonths);
    }
    await saveMonthlySessions(month, updated);

    setRegistering(false);
    setRegStep("select-players");
    setSelectedPlayers([]);
    setCurrentRounds([]);
    setSaving(false);
  }

  // ── Delete session ──
  function confirmDeleteSession(sessionId: string) {
    setDeleteSessionId(sessionId);
  }

  async function handleDeleteSession(sessionId: string) {
    // Find which month this session belongs to
    let targetMonth = selectedMonth === "total" ? null : selectedMonth;
    if (!targetMonth) {
      // In total view, find the month by looking through all months
      for (const [m, ss] of Object.entries(allMonthlySessions)) {
        if (ss.some((s) => s.id === sessionId)) {
          targetMonth = m;
          break;
        }
      }
    }
    if (!targetMonth) return;

    const monthSessions = allMonthlySessions[targetMonth] || [];
    const updated = monthSessions.filter((s) => s.id !== sessionId);
    setAllMonthlySessions((prev) => ({ ...prev, [targetMonth!]: updated }));
    await deleteMonthlySession(sessionId, targetMonth);


  }

  // ── Rename player ──
  async function handleRenamePlayer(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName || players.includes(trimmed)) return;

    // Update players list
    const updatedPlayers = players.map((p) => (p === oldName ? trimmed : p));
    setPlayers(updatedPlayers);

    // Update all monthly sessions — player lists, finalists, winners
    const updatedAllMonthly = { ...allMonthlySessions };
    for (const month of Object.keys(updatedAllMonthly)) {
      updatedAllMonthly[month] = updatedAllMonthly[month].map((session) => ({
        ...session,
        players: session.players.map((p) => (p === oldName ? trimmed : p)),
        rounds: session.rounds.map((r) => ({
          ...r,
          finalists: r.finalists.map((f) => (f === oldName ? trimmed : f)) as [string, string],
          winner: r.winner === oldName ? trimmed : r.winner,
          players: r.players?.map((p) => (p === oldName ? trimmed : p)),
        })),
      }));
    }
    setAllMonthlySessions(updatedAllMonthly);

    // Update historical stats
    if (historicalStats[oldName]) {
      const updatedHistorical = { ...historicalStats };
      updatedHistorical[trimmed] = updatedHistorical[oldName];
      delete updatedHistorical[oldName];
      setHistoricalStats(updatedHistorical);
      await saveHistoricalStats(updatedHistorical);
    }

    // Update selected player reference
    if (selectedPlayer?.name === oldName) {
      setSelectedPlayer({ ...selectedPlayer, name: trimmed });
    }

    setRenamingPlayer(false);



    // Save all monthly sessions with renamed player
    await Promise.all([
      saveHighscorePlayers(updatedPlayers),
      ...Object.entries(updatedAllMonthly).map(([m, s]) => saveMonthlySessions(m, s)),
    ]);
  }

  // ── Remove player ──
  // Uses the server-side atomic endpoint that removes the player from:
  // 1. Players list  2. Historical stats  3. Player cards  4. All monthly session data
  async function handleRemovePlayer(name: string) {
    // Optimistic UI update
    setPlayers((prev) => prev.filter((p) => p !== name));
    setSelectedPlayer(null);
    setConfirmRemovePlayer(null);

    const result = await removePlayerFromServer(name);
    if (result.ok) {
      // Apply server-confirmed state
      if (result.players) setPlayers(result.players);
      if (result.historicalStats) setHistoricalStats(result.historicalStats);
      if (result.cards) setPlayerCards(result.cards as PlayerCards);

      // Reload sessions to reflect cleaned data
      await loadData();
    } else {
      // Rollback: reload everything from server
      console.log(`[Highscore] Failed to remove player "${name}", reloading data`);
      await loadData();
    }
  }

  // ── Give card ──
  async function handleGiveCard(name: string, type: "yellow" | "red") {
    const updatedCards = { ...playerCards };
    if (!updatedCards[name]) updatedCards[name] = { yellow: 0, red: 0 };
    updatedCards[name][type]++;
    setPlayerCards(updatedCards);

    // Update selected player reference so modal refreshes
    if (selectedPlayer?.name === name) {
      setSelectedPlayer({
        ...selectedPlayer,
        yellowCards: updatedCards[name].yellow,
        redCards: updatedCards[name].red,
      });
    }

    await savePlayerCards(updatedCards);
  }

  // ── Remove card ──
  async function handleRemoveCard(name: string, type: "yellow" | "red") {
    const updatedCards = { ...playerCards };
    if (!updatedCards[name]) return;
    updatedCards[name][type] = Math.max(0, updatedCards[name][type] - 1);
    setPlayerCards(updatedCards);

    if (selectedPlayer?.name === name) {
      setSelectedPlayer({
        ...selectedPlayer,
        yellowCards: updatedCards[name].yellow,
        redCards: updatedCards[name].red,
      });
    }

    await savePlayerCards(updatedCards);
  }

  // ── Compare players ──
  const compareStats = useMemo(() => {
    if (!comparePlayer1 || !comparePlayer2) return null;
    const p1 = stats.find((s) => s.name === comparePlayer1);
    const p2 = stats.find((s) => s.name === comparePlayer2);
    if (!p1 || !p2) return null;
    const h2h = p1.h2h[comparePlayer2] || { wins: 0, losses: 0 };
    return { p1, p2, h2h };
  }, [comparePlayer1, comparePlayer2, stats]);

  // H2H weekday/time insights for the compared pair
  const h2hInsights = useMemo(() => {
    if (!comparePlayer1 || !comparePlayer2) return null;
    return computeH2HInsights(comparePlayer1, comparePlayer2, activeSessions);
  }, [comparePlayer1, comparePlayer2, activeSessions]);

  // Always show all columns regardless of whether data exists
  const hasCards = true;
  const hasTrophies = true;


  // All known players: sorted by most games played (descending), then alphabetically as tiebreaker.
  // We intentionally do NOT merge in session-derived stats names here, so that removed players stay removed.
  const allKnownPlayers = useMemo(() => {
    const gamesMap: Record<string, number> = {};
    stats.forEach((s) => { gamesMap[s.name] = s.gamesPlayed; });
    return [...players].sort((a, b) => {
      const diff = (gamesMap[b] ?? 0) - (gamesMap[a] ?? 0);
      return diff !== 0 ? diff : a.localeCompare(b, "sv");
    });
  }, [players, stats]);

  // ── Rendering ──

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
          />
          <span
            className="text-muted-foreground"
            style={{ fontSize: "var(--text-base)" }}
          >
            Laddar...
          </span>
        </motion.div>
      </div>
    );
  }

  // ── Registration flow ──
  if (registering) {
    return (
      <div className="max-w-2xl mx-auto px-3 py-4 md:px-4 md:py-6">
        {/* Save session confirm dialog */}
        <ConfirmDialog
          open={confirmSave}
          title="Spara speltillfälle?"
          message={`Vill du spara detta speltillfälle med ${currentRounds.length} ${currentRounds.length === 1 ? "runda" : "rundor"}? Statistik och Elo-ratings uppdateras.`}
          confirmLabel="Spara"
          cancelLabel="Avbryt"
          variant="warning"
          onConfirm={() => {
            setConfirmSave(false);
            saveSession();
          }}
          onCancel={() => setConfirmSave(false)}
        />
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => {
                if (regStep === "select-finalists" && currentRounds.length === 0) {
                  setRegStep("select-players");
                } else if (regStep === "select-winner") {
                  setRegStep("select-finalists");
                } else {
                  setRegistering(false);
                }
              }}
              className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-foreground cursor-pointer"
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span
              className="text-foreground"
              style={{
                fontSize: "var(--text-base)",
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              Registrera speltillfälle
            </span>
            {/* Step indicator */}
            <div className="ml-auto flex items-center gap-1.5">
              {["select-players", "select-finalists", "select-winner"].map((step, i, arr) => (
                <div
                  key={step}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: regStep === step ? 24 : 8,
                    background:
                      regStep === step
                        ? "var(--primary)"
                        : i <= arr.indexOf(regStep)
                        ? "var(--primary)"
                        : "var(--border)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Live round counter */}
          {currentRounds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4 rounded-lg border border-primary/20 p-3"
              style={{ background: "color-mix(in srgb, var(--primary) 10%, var(--surface-container))", borderRadius: "var(--radius-card)" }}
            >
              <div
                className="flex items-center justify-between"
              >
                <span
                  style={{
                    fontSize: "var(--text-label)",
                    color: "var(--primary)",
                    fontWeight: "var(--font-weight-semibold)",
                    fontFamily: FONT,
                  }}
                >
                  {currentRounds.length} {currentRounds.length === 1 ? "runda" : "rundor"} registrerade
                </span>
                <motion.button
                  whileTap={hasUndone ? undefined : { scale: 0.9 }}
                  onClick={undoLastRound}
                  disabled={hasUndone}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: hasUndone ? "var(--muted-foreground)" : "var(--warning, #f59e0b)",
                    borderColor: hasUndone ? "var(--border)" : "color-mix(in srgb, var(--warning, #f59e0b) 30%, transparent)",
                    background: hasUndone ? "transparent" : "color-mix(in srgb, var(--warning, #f59e0b) 8%, transparent)",
                    borderRadius: "var(--radius-button)",
                    opacity: hasUndone ? 0.5 : 1,
                    cursor: hasUndone ? "not-allowed" : "pointer",
                  }}
                  title={hasUndone ? "Redan ångrad" : "Ångra senaste finalen"}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Ångra senaste finalen
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 1: Select players */}
          {regStep === "select-players" && (() => {
            const lastSession = activeSessions[0];
            const lastPlayers = lastSession?.players ?? [];
            const allSelected = allKnownPlayers.length > 0 && allKnownPlayers.every((p) => selectedPlayers.includes(p));
            const statsMap: Record<string, PlayerStats | undefined> = {};
            stats.forEach((s) => { statsMap[s.name] = s; });
            return (
              <PlayerSelectStep
                allKnownPlayers={allKnownPlayers}
                selectedPlayers={selectedPlayers}
                setSelectedPlayers={setSelectedPlayers}
                togglePlayer={togglePlayer}
                proceedToFinalists={proceedToFinalists}
                allSelected={allSelected}
                lastPlayers={lastPlayers}
                statsMap={statsMap}
                eloRatings={preliminaryEloRatings}
                eloHistory={eloHistory}
              />
            );
          })()}

          {/* Step 2: Select finalists */}
          {regStep === "select-finalists" && (
            <div>
              <h3
                className="text-foreground mb-1 text-center"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-h4)",
                  fontWeight: "var(--font-weight-semibold)",
                }}
              >
                Välj två finalister
              </h3>
              <p
                className="text-muted-foreground text-center mb-6"
                style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
              >
                Runda {currentRounds.length + 1}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {selectedPlayers.map((name) => {
                  const isFinalist = selectedFinalists.includes(name);
                  const roundsWon = currentRounds.filter((r) => r.winner === name).length;
                  const roundsFinal = currentRounds.filter((r) =>
                    r.finalists.includes(name)
                  ).length;
                  const roundsPlayed = currentRounds.filter((r) =>
                    (r.players ?? selectedPlayers).includes(name)
                  ).length;
                  const isNew = currentRounds.length > 0 && roundsPlayed === 0;
                  return (
                    <motion.button
                      key={name}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleFinalist(name)}
                      className={`flex flex-col items-center gap-1 px-4 py-4 rounded-lg border transition-all cursor-pointer ${
                        isFinalist
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-border-strong"
                      }`}
                      style={{
                        background: isFinalist ? undefined : "var(--surface-container)",
                        borderRadius: "var(--radius-card)",
                      }}
                    >
                      <span
                        className="text-foreground"
                        style={{ fontFamily: FONT, fontSize: "var(--text-base)" }}
                      >
                        {name}
                      </span>
                      {currentRounds.length > 0 ? (
                        <span
                          className="flex items-center gap-2 text-muted-foreground"
                          style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}
                        >
                          <span className="flex items-center gap-0.5">
                            <Users className="w-3 h-3" />
                            {roundsPlayed}/{currentRounds.length}
                          </span>
                          {roundsFinal > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Swords className="w-3 h-3" />
                              {roundsFinal}F
                            </span>
                          )}
                          {roundsWon > 0 && (
                            <span className="flex items-center gap-0.5 text-success">
                              <Trophy className="w-3 h-3" />
                              {roundsWon}W
                            </span>
                          )}
                          {isNew && (
                            <span
                              className="px-1.5 py-0.5 rounded"
                              style={{
                                fontSize: "var(--text-xs)",
                                background: "color-mix(in srgb, var(--primary) 15%, transparent)",
                                color: "var(--primary)",
                                borderRadius: "var(--radius-badge, 4px)",
                                fontWeight: "var(--font-weight-semibold)",
                              }}
                            >
                              Ny
                            </span>
                          )}
                        </span>
                      ) : (
                        <span
                          className="text-muted-foreground flex items-center gap-1"
                          style={{ fontSize: "var(--text-sm)" }}
                        >
                          <Trophy className="w-3 h-3" />
                          Redo
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Action buttons — above roster management */}
              <div className="mt-5 flex flex-col gap-3">
                {currentRounds.length > 0 && (
                  <button
                    onClick={() => setConfirmSave(true)}
                    disabled={saving}
                    className="w-full py-3.5 rounded-lg border border-success/30 transition-all cursor-pointer hover:bg-success/10 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    style={{
                      fontFamily: FONT,
                      fontSize: "var(--text-base)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--success)",
                      background: "var(--surface-container)",
                      borderRadius: "var(--radius-card)",
                    }}
                  >
                    <Check className="w-4 h-4 inline mr-2" />
                    {saving ? "Sparar..." : `Spara (${currentRounds.length} rundor)`}
                  </button>
                )}
              </div>

              {/* Roster management panel */}
              {(() => {
                const availableToAdd = players.filter((p) => !selectedPlayers.includes(p));
                const removedPlayers = Array.from(
                  new Set(
                    currentRounds.flatMap((r) => r.finalists).filter((f) => !selectedPlayers.includes(f))
                  )
                );
                return (
                  <div className="mt-5">
                    <button
                      onClick={() => setRosterOpen((o) => !o)}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg border transition-all cursor-pointer active:scale-[0.98]"
                      style={{
                        background: rosterOpen ? "var(--surface-container-high)" : "var(--surface-container)",
                        borderColor: rosterOpen ? "var(--border-strong, var(--border))" : "var(--border)",
                        borderRadius: "var(--radius-card)",
                        fontFamily: FONT,
                        fontSize: "var(--text-base)",
                      }}
                    >
                      <span className="flex items-center gap-2.5 text-foreground">
                        <Users className="w-5 h-5 text-muted-foreground" />
                        <span style={{ fontWeight: "var(--font-weight-semibold)" }}>
                          Hantera spelare
                        </span>
                        <span
                          className="text-muted-foreground"
                          style={{ fontSize: "var(--text-label)" }}
                        >
                          ({selectedPlayers.length})
                        </span>
                        {removedPlayers.length > 0 && (
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{
                              background: "color-mix(in srgb, var(--warning, #f59e0b) 15%, transparent)",
                              color: "var(--warning, #f59e0b)",
                              fontFamily: FONT,
                              fontSize: "var(--text-xs)",
                              fontWeight: "var(--font-weight-semibold)",
                            }}
                          >
                            {removedPlayers.length} borttagna
                          </span>
                        )}
                      </span>
                      <motion.div
                        animate={{ rotate: rosterOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {rosterOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="mt-2 rounded-lg border border-border overflow-hidden"
                            style={{
                              background: "var(--surface-container-low, var(--surface-container))",
                              borderRadius: "var(--radius-card)",
                            }}
                          >
                            {/* Active players list */}
                            <div className="px-4 pt-3 pb-1">
                              <p
                                className="text-muted-foreground"
                                style={{
                                  fontFamily: FONT,
                                  fontSize: "var(--text-xs)",
                                  fontWeight: "var(--font-weight-semibold)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                Aktiva spelare
                              </p>
                            </div>
                            <div>
                              {selectedPlayers.map((name) => {
                                const rp = currentRounds.filter((r) => (r.players ?? selectedPlayers).includes(name)).length;
                                return (
                                  <div
                                    key={name}
                                    className="flex items-center justify-between px-4 py-3 border-t border-border/50 transition-colors"
                                    style={{ minHeight: 52 }}
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <span
                                        className="text-foreground truncate"
                                        style={{
                                          fontFamily: FONT,
                                          fontSize: "var(--text-base)",
                                          fontWeight: "var(--font-weight-normal)",
                                        }}
                                      >
                                        {name}
                                      </span>
                                      {currentRounds.length > 0 && (
                                        <span
                                          className="text-muted-foreground shrink-0"
                                          style={{
                                            fontFamily: FONT,
                                            fontSize: "var(--text-xs)",
                                          }}
                                        >
                                          {rp}/{currentRounds.length} rundor
                                        </span>
                                      )}
                                    </div>
                                    {selectedPlayers.length > 5 && (
                                      <button
                                        onClick={() => removePlayerFromRoster(name)}
                                        className="shrink-0 flex items-center justify-center w-10 h-10 -mr-1 rounded-lg transition-colors cursor-pointer active:scale-95"
                                        style={{
                                          background: "transparent",
                                          borderRadius: "var(--radius-card)",
                                        }}
                                        title={`Ta bort ${name}`}
                                      >
                                        <X className="w-5 h-5 text-muted-foreground hover:text-destructive transition-colors" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Removed players */}
                            {removedPlayers.length > 0 && (
                              <>
                                <div className="px-4 pt-4 pb-1">
                                  <p
                                    className="text-muted-foreground"
                                    style={{
                                      fontFamily: FONT,
                                      fontSize: "var(--text-xs)",
                                      fontWeight: "var(--font-weight-semibold)",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                    }}
                                  >
                                    Borttagna (statistik sparas)
                                  </p>
                                </div>
                                <div>
                                  {removedPlayers.map((name) => (
                                    <div
                                      key={name}
                                      className="flex items-center justify-between px-4 py-3 border-t transition-colors"
                                      style={{
                                        minHeight: 52,
                                        borderColor: "color-mix(in srgb, var(--warning, #f59e0b) 20%, var(--border))",
                                        background: "color-mix(in srgb, var(--warning, #f59e0b) 4%, transparent)",
                                      }}
                                    >
                                      <span
                                        className="text-muted-foreground line-through"
                                        style={{
                                          fontFamily: FONT,
                                          fontSize: "var(--text-base)",
                                        }}
                                      >
                                        {name}
                                      </span>
                                      <button
                                        onClick={() => addPlayerToRoster(name)}
                                        className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-lg border transition-all cursor-pointer active:scale-95"
                                        style={{
                                          fontFamily: FONT,
                                          fontSize: "var(--text-label)",
                                          fontWeight: "var(--font-weight-semibold)",
                                          color: "var(--primary)",
                                          borderColor: "color-mix(in srgb, var(--primary) 30%, var(--border))",
                                          background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                                          borderRadius: "var(--radius-card)",
                                        }}
                                        title={`Lägg till ${name} igen`}
                                      >
                                        <Plus className="w-4 h-4" />
                                        <span className="hidden sm:inline">Lägg till</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}

                            {/* Add from player list */}
                            {availableToAdd.length > 0 && (
                              <>
                                <div className="px-4 pt-4 pb-1">
                                  <p
                                    className="text-muted-foreground"
                                    style={{
                                      fontFamily: FONT,
                                      fontSize: "var(--text-xs)",
                                      fontWeight: "var(--font-weight-semibold)",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                    }}
                                  >
                                    Lägg till spelare
                                  </p>
                                </div>
                                <div>
                                  {availableToAdd.map((name) => (
                                    <button
                                      key={name}
                                      onClick={() => addPlayerToRoster(name)}
                                      className="w-full flex items-center gap-3 px-4 py-3 border-t border-border/50 transition-all cursor-pointer active:scale-[0.98]"
                                      style={{
                                        minHeight: 52,
                                        background: "transparent",
                                      }}
                                    >
                                      <div
                                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                                        style={{
                                          background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                                          borderRadius: "var(--radius-full, 9999px)",
                                        }}
                                      >
                                        <Plus className="w-4 h-4 text-primary" />
                                      </div>
                                      <span
                                        className="text-foreground"
                                        style={{
                                          fontFamily: FONT,
                                          fontSize: "var(--text-base)",
                                        }}
                                      >
                                        {name}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}

              {/* buttons moved above roster panel */}
            </div>
          )}

          {/* Step 3: Select winner */}
          {regStep === "select-winner" && (
            <div>
              <h3
                className="text-foreground mb-2 text-center"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-h4)",
                  fontWeight: "var(--font-weight-semibold)",
                }}
              >
                Vem vann?
              </h3>
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
                  {selectedFinalists[0]}
                </span>
                <span className="text-muted-foreground" style={{ fontSize: "var(--text-label)" }}>vs</span>
                <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
                  {selectedFinalists[1]}
                </span>
              </div>

              {/* Elo preview — what's at stake */}
              {(() => {
                const p1 = selectedFinalists[0];
                const p2 = selectedFinalists[1];
                const p1Elo = preliminaryEloRatings[p1]?.elo ?? 1000;
                const p2Elo = preliminaryEloRatings[p2]?.elo ?? 1000;
                const N = selectedPlayers.length || 2;
                const p1Wins = computePotDistribution(p1Elo, p2Elo, N);
                const p2Wins = computePotDistribution(p2Elo, p1Elo, N);
                const pot = N * ELO_ANTE;
                const eloDiff = Math.abs(p1Elo - p2Elo);
                const underdog = p1Elo < p2Elo ? p1 : p2;
                const favorite = p1Elo < p2Elo ? p2 : p1;
                const underdogWinDelta = p1Elo < p2Elo ? p1Wins.winnerDelta : p2Wins.winnerDelta;
                const favoriteWinDelta = p1Elo < p2Elo ? p2Wins.winnerDelta : p1Wins.winnerDelta;
                const isUpsetScenario = eloDiff >= ELO_UPSET_THRESHOLD;
                return (
                  <div
                    className="mb-5 px-3 py-2.5 rounded-lg border border-border/30"
                    style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)", fontFamily: FONT }}
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
                        Elo-insats
                      </span>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--foreground)", fontWeight: "var(--font-weight-bold)" }}>
                        Pott {pot}
                      </span>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                        ({N} × {ELO_ANTE})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg" style={{ background: "var(--surface-container-high)", borderRadius: "var(--radius-button)" }}>
                        <span className="truncate max-w-full" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)" }}>
                          {p1} ({Math.round(p1Elo)})
                        </span>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontWeight: "var(--font-weight-bold)" }}>
                            Vinst +{p1Wins.winnerDelta}
                          </span>
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>|</span>
                          <span style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontWeight: "var(--font-weight-bold)" }}>
                            Förl +{p2Wins.loserDelta}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg" style={{ background: "var(--surface-container-high)", borderRadius: "var(--radius-button)" }}>
                        <span className="truncate max-w-full" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)" }}>
                          {p2} ({Math.round(p2Elo)})
                        </span>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontWeight: "var(--font-weight-bold)" }}>
                            Vinst +{p2Wins.winnerDelta}
                          </span>
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>|</span>
                          <span style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontWeight: "var(--font-weight-bold)" }}>
                            Förl +{p1Wins.loserDelta}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1.5 text-center">
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                        Övriga: <span style={{ color: "var(--destructive)", fontWeight: "var(--font-weight-bold)" }}>-{ELO_ANTE}</span>
                      </span>
                    </div>

                    {/* Upset indicator */}
                    {isUpsetScenario && (
                      <div
                        className="mt-2.5 flex items-center gap-2 px-3 py-2 rounded-lg border"
                        style={{
                          background: "color-mix(in srgb, var(--warning) 8%, var(--surface-container-high))",
                          borderColor: "color-mix(in srgb, var(--warning) 25%, transparent)",
                          borderRadius: "var(--radius-button)",
                        }}
                      >
                        <span style={{ fontSize: "16px", lineHeight: 1 }}>⚡</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-bold)", color: "var(--warning)" }}>
                              Upset-alert!
                            </span>
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                              Elo-gap: <span style={{ fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>{Math.round(eloDiff)}</span>
                            </span>
                          </div>
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                            Underdog <span style={{ fontWeight: "var(--font-weight-bold)", color: "var(--warning)" }}>{underdog}</span> vinner{" "}
                            <span style={{ fontWeight: "var(--font-weight-bold)", color: "var(--success)" }}>+{underdogWinDelta}</span>
                            {" "}vs favorit{" "}
                            <span style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>{favorite}</span>
                            {" "}<span style={{ fontWeight: "var(--font-weight-bold)", color: "var(--success)" }}>+{favoriteWinDelta}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                {selectedFinalists.map((name) => {
                  const isSelected = pendingWinner === name;
                  return (
                    <motion.button
                      key={name}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { selectWinner(name); setPendingWinner(null); }}
                      className="relative flex flex-col items-center gap-2 px-6 py-6 rounded-lg border transition-all cursor-pointer"
                      style={{
                        background: isSelected ? "color-mix(in srgb, var(--primary) 12%, var(--surface-container))" : "var(--surface-container)",
                        borderColor: isSelected ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)",
                        borderRadius: "var(--radius-card)",
                        boxShadow: isSelected ? "0 0 16px color-mix(in srgb, var(--primary) 20%, transparent)" : "none",
                      }}
                    >
                      {isSelected && (
                        <motion.div
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "var(--primary)" }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          <Check className="w-3.5 h-3.5" style={{ color: "var(--primary-foreground)" }} />
                        </motion.div>
                      )}
                      <Trophy className={`w-6 h-6 transition-colors ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span
                        className={isSelected ? "text-primary" : "text-foreground"}
                        style={{
                          fontFamily: FONT,
                          fontSize: "var(--text-base)",
                          fontWeight: "var(--font-weight-semibold)",
                        }}
                      >
                        {name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setSelectedFinalists([]);
                  setPendingWinner(null);
                  setRegStep("select-finalists");
                }}
                className="w-full mt-4 py-3 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all cursor-pointer"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-label)",
                  borderRadius: "var(--radius-card)",
                }}
              >
                <ArrowLeft className="w-4 h-4 inline mr-2" />
                Ändra finalister
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ── Main highscore view ──

  // Helper: toggle sort on a column header click
  function handleHeaderSort(key: SortTab) {
    if (sortTab === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortTab(key);
      setSortDir("desc");
    }
  }

  // Sort indicator arrow
  function SortArrow({ column }: { column: SortTab }) {
    if (sortTab !== column) return null;
    return (
      <span style={{ fontSize: "var(--text-xs)", marginLeft: 2 }}>
        {sortDir === "desc" ? "▼" : "▲"}
      </span>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 py-4 pb-8 md:px-4 md:py-6">
      {/* Delete session confirm dialog */}
      <ConfirmDialog
        open={deleteSessionId !== null}
        title="Ta bort speltillfälle?"
        message="Är du säker på att du vill ta bort detta speltillfälle? All statistik från rundorna i detta tillfälle kommer att försvinna permanent."
        confirmLabel="Ta bort"
        cancelLabel="Avbryt"
        variant="destructive"
        onConfirm={() => {
          if (deleteSessionId) {
            handleDeleteSession(deleteSessionId);
          }
          setDeleteSessionId(null);
        }}
        onCancel={() => setDeleteSessionId(null)}
      />

      {/* ── Month Picker ── */}
      {monthList.length > 0 && (() => {
        const pastMonths = [...monthList].filter(m => m !== currentMonth).sort().reverse();
        const isViewingPast = typeof selectedMonth === "string" && selectedMonth !== "total" && selectedMonth !== currentMonth;
        return (
          <div className="flex items-center gap-2 mb-6 md:mb-8">
            <style>{`
              @keyframes pulse-live {
                0%, 100% { opacity: 1; box-shadow: 0 0 4px var(--success); }
                50% { opacity: 0.5; box-shadow: 0 0 8px var(--success); }
              }
            `}</style>
            {/* Segmented control */}
            <div
              className="flex items-center rounded-xl border"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface-container-low)",
                backdropFilter: "blur(12px)",
                padding: 4,
                gap: 3,
                boxShadow: "var(--elevation-sm)",
              }}
            >
              {/* Current month */}
              <button
                onClick={() => { setSelectedMonth(currentMonth); setMonthPickerOpen(false); }}
                className="cursor-pointer transition-all"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-label)",
                  fontWeight: "var(--font-weight-semibold)",
                  padding: "7px 14px",
                  color: selectedMonth === currentMonth ? "var(--on-primary-container)" : "var(--muted-foreground)",
                  background: selectedMonth === currentMonth ? "var(--primary-container)" : "transparent",
                  border: "none",
                  borderRadius: "9px",
                  boxShadow: selectedMonth === currentMonth ? "var(--elevation-sm)" : "none",
                }}
              >
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {formatMonthShort(currentMonth)}
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--success)",
                      display: "inline-block",
                      animation: "pulse-live 2s ease-in-out infinite",
                    }}
                  />
                </span>
              </button>

              {/* Totalt */}
              <button
                onClick={() => { setSelectedMonth("total"); setMonthPickerOpen(false); }}
                className="cursor-pointer transition-all"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-label)",
                  fontWeight: "var(--font-weight-semibold)",
                  padding: "7px 14px",
                  color: selectedMonth === "total" ? "var(--on-primary-container)" : "var(--muted-foreground)",
                  background: selectedMonth === "total" ? "var(--primary-container)" : "transparent",
                  border: "none",
                  borderRadius: "9px",
                  boxShadow: selectedMonth === "total" ? "var(--elevation-sm)" : "none",
                }}
              >
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Totalt
                </span>
              </button>

              {/* Historik dropdown trigger */}
              {pastMonths.length > 0 && (
                <div className="relative" ref={monthPickerRef}>
                  <button
                    onClick={() => setMonthPickerOpen(!monthPickerOpen)}
                    className="cursor-pointer transition-all"
                    style={{
                      fontFamily: FONT,
                      fontSize: "var(--text-label)",
                      fontWeight: "var(--font-weight-semibold)",
                      padding: "7px 14px",
                      color: isViewingPast ? "var(--on-primary-container)" : "var(--muted-foreground)",
                      background: isViewingPast ? "var(--primary-container)" : "transparent",
                      border: "none",
                      borderRadius: "9px",
                      boxShadow: isViewingPast ? "var(--elevation-sm)" : "none",
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      <Archive className="w-3.5 h-3.5" />
                      {isViewingPast ? formatMonthShort(selectedMonth) : "Historik"}
                      <ChevronDown
                        className="w-3 h-3 transition-transform"
                        style={{ transform: monthPickerOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                      />
                    </span>
                  </button>

                  {/* Dropdown menu */}
                  <AnimatePresence>
                    {monthPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-1.5 z-50 rounded-xl border"
                        style={{
                          background: "var(--surface-container-high)",
                          borderColor: "var(--border)",
                          backdropFilter: "blur(16px)",
                          minWidth: 200,
                          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          className="py-1.5 px-1.5"
                          style={{ display: "flex", flexDirection: "column", gap: 2 }}
                        >
                          {pastMonths.map((month) => {
                            const isActive = selectedMonth === month;
                            return (
                              <button
                                key={month}
                                onClick={() => { setSelectedMonth(month); setMonthPickerOpen(false); }}
                                className="w-full text-left cursor-pointer transition-colors"
                                style={{
                                  fontFamily: FONT,
                                  fontSize: "var(--text-label)",
                                  fontWeight: isActive ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                                  padding: "9px 12px",
                                  color: isActive ? "var(--on-primary-container)" : "var(--foreground)",
                                  background: isActive ? "var(--primary-container)" : "transparent",
                                  border: "none",
                                  borderRadius: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--surface-container)"; }}
                                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                              >
                                <CalendarDays className="w-3.5 h-3.5 shrink-0" style={{ opacity: 0.5 }} />
                                <span className="flex-1">{formatMonthLabel(month)}</span>
                                {isActive && (
                                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--primary)" }} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Hero Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 mb-8 md:mb-12">
        {/* Ledare */}
        <StatCard
          icon={<Crown className="w-4 h-4" />}
          label="Ledare"
          value={
            topPlayer && topPlayer.wins > 0
              ? topPlayer.name.split(" ").slice(0, 2).join(" ")
              : "—"
          }
          sub={
            topPlayer && topPlayer.wins > 0
              ? `${topPlayer.wins} vinster · Vinst% ${topPlayer.bwp.toFixed(1)}%`
              : "Inga vinster registrerade ännu"
          }
          color="var(--primary)"
        />

        {/* Streaks – On Fire & Cold Streak combined */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border p-3 md:p-4 flex flex-col gap-2 md:gap-3"
          style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)" }}
        >
          {/* On Fire */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
              style={{ background: "color-mix(in srgb, var(--warning) 15%, transparent)" }}
            >
              <Flame className="w-4 h-4" style={{ color: "var(--warning)" }} />
            </div>
            <div className="flex flex-col min-w-0">
              <span
                className="truncate"
                style={{
                  fontSize: "var(--text-base)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: hasStreakData && hotPlayer && hotPlayer.currentStreak >= 2 ? "var(--warning)" : "var(--muted-foreground)",
                  fontFamily: FONT,
                }}
              >
                {hasStreakData && hotPlayer && hotPlayer.currentStreak >= 2
                  ? hotPlayer.name.split(" ").slice(0, 2).join(" ")
                  : "—"}
              </span>
              <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                {hasStreakData && hotPlayer && hotPlayer.currentStreak >= 2
                  ? `${hotPlayer.currentStreak} raka vinster 🔥`
                  : "Ingen aktiv hot streak"}
              </span>
            </div>
          </div>
          {/* Divider */}
          <div className="h-px w-full" style={{ background: "var(--border)", opacity: 0.5 }} />
          {/* Cold Streak */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
              style={{ background: "color-mix(in srgb, var(--info) 15%, transparent)" }}
            >
              <Snowflake className="w-4 h-4" style={{ color: "var(--info)" }} />
            </div>
            <div className="flex flex-col min-w-0">
              <span
                className="truncate"
                style={{
                  fontSize: "var(--text-base)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: hasStreakData && coldPlayer && coldPlayer.coldStreak >= 2 ? "var(--info)" : "var(--muted-foreground)",
                  fontFamily: FONT,
                }}
              >
                {hasStreakData && coldPlayer && coldPlayer.coldStreak >= 2
                  ? coldPlayer.name.split(" ").slice(0, 2).join(" ")
                  : "—"}
              </span>
              <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                {hasStreakData && coldPlayer && coldPlayer.coldStreak >= 2
                  ? `${coldPlayer.coldStreak} raka förluster 🥶`
                  : "Ingen aktiv cold streak"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Visste du att... */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border p-4 flex flex-col overflow-hidden relative"
          style={{
            background: "var(--surface-container)",
            borderRadius: "var(--radius-card)",
            borderColor: funFacts.length > 0 ? "color-mix(in srgb, var(--primary) 30%, var(--border))" : undefined,
          }}
        >
          {/* Subtle top accent line */}
          {funFacts.length > 0 && (
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background: "linear-gradient(90deg, transparent 0%, var(--primary) 50%, transparent 100%)",
                opacity: 0.5,
              }}
            />
          )}

          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="w-4 h-4" style={{ color: "var(--primary)" }} />
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  fontFamily: FONT,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase" as const,
                  color: "var(--muted-foreground)",
                }}
              >
                Visste du att...
              </span>
            </div>
            {funFacts.length > 1 && (
              <span
                className="text-muted-foreground tabular-nums select-none"
                style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}
              >
                {(factIndex % funFacts.length) + 1}/{funFacts.length}
              </span>
            )}
          </div>

          {/* Fact content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={funFacts.length > 0 ? factIndex : "empty"}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="min-h-[2.5rem] flex items-center flex-1"
            >
              <span
                className="text-foreground leading-snug"
                style={{
                  fontSize: "var(--text-label)",
                  fontWeight: "var(--font-weight-semibold)",
                  fontFamily: FONT,
                }}
              >
                {funFacts.length > 0
                  ? funFacts[factIndex % funFacts.length]
                  : "Spela matcher för att låsa upp fakta!"}
              </span>
            </motion.div>
          </AnimatePresence>

          {/* Dot indicators + auto-rotate progress */}
          {funFacts.length > 1 && (
            <div className="flex items-center gap-1.5 mt-2">
              {funFacts.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setFactIndex(i)}
                  className="transition-all duration-300 cursor-pointer relative"
                  style={{
                    width: i === factIndex % funFacts.length ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    background:
                      i === factIndex % funFacts.length
                        ? "var(--primary)"
                        : "var(--border)",
                    opacity: i === factIndex % funFacts.length ? 1 : 0.6,
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Title Row ── */}
      <div className="flex flex-col gap-3 mb-5 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h2
            className="text-foreground"
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-h3)",
              fontWeight: "var(--font-weight-semibold)",
            }}
          >
            💀 Rankning
            {selectedMonth !== currentMonth && (
              <span
                className="text-muted-foreground ml-2"
                style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-normal)" }}
              >
                {selectedMonth === "total" ? "— Totalt" : `— ${formatMonthLabel(selectedMonth)}`}
              </span>
            )}
          </h2>
          <button
            onClick={() => setShowRankingInfoModal(true)}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all cursor-pointer"
            title="Hur fungerar rankingen?"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Deep Dive toggle */}
          <button
            onClick={() => setShowGraphView(!showGraphView)}
            className={`flex items-center gap-1.5 px-3 py-2 md:py-1.5 rounded-lg border transition-all cursor-pointer ${
              showGraphView
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border-strong"
            }`}
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-label)",
              fontWeight: showGraphView ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <BarChart3 className="w-4 h-4 md:w-3.5 md:h-3.5" />
            Deep Dive
          </button>

          {/* Compare button — available when there are sessions or historical h2h data */}
          {(hasSessions || stats.some(s => Object.keys(s.h2h).length > 0)) && (
            <button
              onClick={() => {
                setCompareMode(!compareMode);
                setComparePlayer1(null);
                setComparePlayer2(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 md:py-1.5 rounded-lg border transition-all cursor-pointer ${
                compareMode ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
              style={{
                fontFamily: FONT,
                fontSize: "var(--text-label)",
                borderRadius: "var(--radius-card)",
              }}
            >
              <Swords className="w-4 h-4 md:w-3.5 md:h-3.5" />
              H2H
            </button>
          )}

          {/* Ny omgång — only when viewing current month (desktop only in title row) */}
          {isViewingCurrentMonth && (
            <button
              onClick={startRegistration}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              style={{
                fontFamily: FONT,
                fontSize: "var(--text-label)",
                fontWeight: "var(--font-weight-semibold)",
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                borderRadius: "var(--radius-card)",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Ny omgång
            </button>
          )}
        </div>
      </div>

      {/* ── Compare Mode ── */}
      <AnimatePresence>
        {compareMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div
              className="rounded-lg border border-primary/20 overflow-hidden"
              style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)" }}
            >
              {/* Header */}
              <div
                className="px-4 py-3 flex items-center gap-2 border-b border-border"
                style={{ background: "var(--surface-container-high)" }}
              >
                <Swords className="w-4 h-4 text-primary" />
                <span
                  className="text-foreground"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-base)",
                    fontWeight: "var(--font-weight-semibold)",
                  }}
                >
                  Head-to-Head
                </span>
              </div>

              <div className="p-4">
                {/* Player selectors */}
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center mb-4">
                  <div className="relative">
                    <select
                      value={comparePlayer1 || ""}
                      onChange={(e) => setComparePlayer1(e.target.value || null)}
                      className="px-3 py-2.5 rounded-lg border border-border text-foreground w-full truncate appearance-none"
                      style={{
                        fontFamily: FONT,
                        fontSize: "var(--text-label)",
                        background: "var(--input-background)",
                        borderRadius: "var(--radius-card)",
                        paddingRight: comparePlayer1 ? "2.25rem" : "0.75rem",
                      }}
                    >
                      <option value="">Spelare 1</option>
                      {activePlayers.filter((p) => p !== comparePlayer2).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    {comparePlayer1 && (
                      <button
                        type="button"
                        onClick={() => setComparePlayer1(null)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-container-highest)"; e.currentTarget.style.color = "var(--foreground)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                        aria-label="Rensa spelare 1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--surface-container-highest)" }}
                  >
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontWeight: "var(--font-weight-semibold)" }}>VS</span>
                  </div>
                  <div className="relative">
                    <select
                      value={comparePlayer2 || ""}
                      onChange={(e) => setComparePlayer2(e.target.value || null)}
                      className="px-3 py-2.5 rounded-lg border border-border text-foreground w-full truncate appearance-none"
                      style={{
                        fontFamily: FONT,
                        fontSize: "var(--text-label)",
                        background: "var(--input-background)",
                        borderRadius: "var(--radius-card)",
                        paddingRight: comparePlayer2 ? "2.25rem" : "0.75rem",
                      }}
                    >
                      <option value="">Spelare 2</option>
                      {activePlayers.filter((p) => p !== comparePlayer1).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    {comparePlayer2 && (
                      <button
                        type="button"
                        onClick={() => setComparePlayer2(null)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-container-highest)"; e.currentTarget.style.color = "var(--foreground)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                        aria-label="Rensa spelare 2"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {compareStats && (() => {
                  const { p1, p2, h2h } = compareStats;
                  const totalMeetings = h2h.wins + h2h.losses;
                  const h2hPct1 = totalMeetings > 0 ? (h2h.wins / totalMeetings) * 100 : 50;

                  const h2hPct2 = totalMeetings > 0 ? (h2h.losses / totalMeetings) * 100 : 50;

                  // Compute ranks for both players
                  const allElosH2H = Object.values(eloRatings).map((e) => e.elo);
                  const p1Elo = eloRatings[p1.name];
                  const p2Elo = eloRatings[p2.name];
                  const p1Percentile = p1Elo ? computePlayerPercentile(p1Elo.elo, allElosH2H) : null;
                  const p2Percentile = p2Elo ? computePlayerPercentile(p2Elo.elo, allElosH2H) : null;
                  const p1Rank = p1Percentile !== null ? getCSGORank(p1Percentile) : null;
                  const p2Rank = p2Percentile !== null ? getCSGORank(p2Percentile) : null;

                  return (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-3">

                      {/* ── Player Cards with Rank ── */}
                      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
                        {/* Player 1 Card */}
                        <div
                          className="rounded-lg p-3 border flex flex-col items-center text-center gap-1.5"
                          style={{
                            background: p1Rank ? `linear-gradient(180deg, ${p1Rank.bgColor} 0%, var(--surface-container-lowest) 100%)` : "var(--surface-container-lowest)",
                            borderColor: p1Rank ? `color-mix(in srgb, ${p1Rank.color} 30%, var(--border))` : "var(--border)",
                            borderRadius: "var(--radius-card)",
                          }}
                        >
                          {p1Rank && (
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center mb-0.5"
                              style={{
                                background: `color-mix(in srgb, ${p1Rank.color} 25%, transparent)`,
                                border: `1.5px solid color-mix(in srgb, ${p1Rank.color} 40%, transparent)`,
                                borderRadius: "var(--radius-card)",
                              }}
                            >
                              <span style={{ fontFamily: FONT, fontSize: p1Rank.shortName.length > 3 ? "var(--text-xs)" : "var(--text-sm)", fontWeight: "var(--font-weight-bold)", color: p1Rank.color, lineHeight: 1 }}>
                                {p1Rank.shortName}
                              </span>
                            </div>
                          )}
                          <span className="truncate w-full" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)", lineHeight: 1.2 }}>
                            {stripEmoji(p1.name).split(" ")[0]}
                          </span>
                          {p1Rank && (
                            <span className="truncate w-full" style={{ fontFamily: FONT, fontSize: 10, color: p1Rank.color, fontWeight: "var(--font-weight-semibold)", lineHeight: 1 }}>
                              {p1Rank.name}
                            </span>
                          )}
                          {p1Elo && (
                            <span style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1 }}>
                              {p1Elo.elo} Elo
                            </span>
                          )}
                        </div>

                        {/* VS divider */}
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center"
                            style={{ background: "var(--surface-container-highest)", border: "1px solid var(--border)" }}
                          >
                            <Swords className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                          </div>
                          {totalMeetings > 0 && (
                            <span style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                              {totalMeetings}x
                            </span>
                          )}
                        </div>

                        {/* Player 2 Card */}
                        <div
                          className="rounded-lg p-3 border flex flex-col items-center text-center gap-1.5"
                          style={{
                            background: p2Rank ? `linear-gradient(180deg, ${p2Rank.bgColor} 0%, var(--surface-container-lowest) 100%)` : "var(--surface-container-lowest)",
                            borderColor: p2Rank ? `color-mix(in srgb, ${p2Rank.color} 30%, var(--border))` : "var(--border)",
                            borderRadius: "var(--radius-card)",
                          }}
                        >
                          {p2Rank && (
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center mb-0.5"
                              style={{
                                background: `color-mix(in srgb, ${p2Rank.color} 25%, transparent)`,
                                border: `1.5px solid color-mix(in srgb, ${p2Rank.color} 40%, transparent)`,
                                borderRadius: "var(--radius-card)",
                              }}
                            >
                              <span style={{ fontFamily: FONT, fontSize: p2Rank.shortName.length > 3 ? "var(--text-xs)" : "var(--text-sm)", fontWeight: "var(--font-weight-bold)", color: p2Rank.color, lineHeight: 1 }}>
                                {p2Rank.shortName}
                              </span>
                            </div>
                          )}
                          <span className="truncate w-full" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)", lineHeight: 1.2 }}>
                            {stripEmoji(p2.name).split(" ")[0]}
                          </span>
                          {p2Rank && (
                            <span className="truncate w-full" style={{ fontFamily: FONT, fontSize: 10, color: p2Rank.color, fontWeight: "var(--font-weight-semibold)", lineHeight: 1 }}>
                              {p2Rank.name}
                            </span>
                          )}
                          {p2Elo && (
                            <span style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1 }}>
                              {p2Elo.elo} Elo
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ── Stat Comparison Bars ── */}
                      {(() => {
                        const comparisons = [
                          { label: "Vinst%", v1: p1.bwp, v2: p2.bwp, fmt: (v: number) => `${v.toFixed(1)}%`, higherBetter: true },
                          { label: "Final%", v1: p1.finalPct, v2: p2.finalPct, fmt: (v: number) => `${v.toFixed(1)}%`, higherBetter: true },
                          { label: "Vinster", v1: p1.wins, v2: p2.wins, fmt: (v: number) => `${v}`, higherBetter: true },
                          { label: "Finaler", v1: p1.finals, v2: p2.finals, fmt: (v: number) => `${v}`, higherBetter: true },
                          { label: "Spelade", v1: p1.gamesPlayed, v2: p2.gamesPlayed, fmt: (v: number) => `${v}`, higherBetter: true },
                          { label: "Streak", v1: p1.bestStreak, v2: p2.bestStreak, fmt: (v: number) => `${v}`, higherBetter: true },
                        ];
                        return (
                          null
                        );
                      })()}

                      {/* H2H Finals record — big visual */}
                      <div
                        className="rounded-lg p-4 border"
                        style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, var(--surface-container-lowest)) 0%, color-mix(in srgb, var(--warning) 6%, var(--surface-container-lowest)) 100%)", borderColor: "var(--border)", borderRadius: "var(--radius-card)" }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span style={{ fontFamily: FONT, fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                            Finalmöten
                          </span>
                          <span
                            style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}
                          >
                            {totalMeetings} matcher
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            style={{ fontFamily: FONT, fontSize: "var(--text-h3)", fontWeight: "var(--font-weight-bold)", color: "var(--primary)", minWidth: 32, textAlign: "center" }}
                          >
                            {h2h.wins}
                          </span>
                          <div className="flex-1 h-4 rounded-full overflow-hidden flex" style={{ background: "var(--muted)" }}>
                            {totalMeetings > 0 ? (
                              <>
                                <motion.div
                                  className="h-full"
                                  initial={{ width: "50%" }}
                                  animate={{ width: `${h2hPct1}%` }}
                                  transition={{ duration: 0.6, ease: "easeOut" }}
                                  style={{
                                    background: "var(--primary)",
                                    borderRadius: h2h.losses === 0 ? "9999px" : "9999px 0 0 9999px",
                                  }}
                                />
                                <motion.div
                                  className="h-full"
                                  initial={{ width: "50%" }}
                                  animate={{ width: `${100 - h2hPct1}%` }}
                                  transition={{ duration: 0.6, ease: "easeOut" }}
                                  style={{
                                    background: "var(--warning)",
                                    borderRadius: h2h.wins === 0 ? "9999px" : "0 9999px 9999px 0",
                                  }}
                                />
                              </>
                            ) : (
                              <div className="h-full w-full" style={{ background: "var(--muted)" }} />
                            )}
                          </div>
                          <span
                            style={{ fontFamily: FONT, fontSize: "var(--text-h3)", fontWeight: "var(--font-weight-bold)", color: "var(--warning)", minWidth: 32, textAlign: "center" }}
                          >
                            {h2h.losses}
                          </span>
                        </div>
                        {totalMeetings === 0 && (
                          <div className="text-center" style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", fontFamily: FONT }}>
                            Ingen finalmöte ännu
                          </div>
                        )}
                        {totalMeetings > 0 && (
                          <div className="flex items-center justify-between mt-1">
                            <span
                              style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--primary)" }}
                            >
                              {h2hPct1.toFixed(0)}%
                            </span>
                            <span
                              style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--warning)" }}
                            >
                              {h2hPct2.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* ── H2H Elo Exchange ── */}
                      {totalMeetings > 0 && comparePlayer1 && comparePlayer2 && (() => {
                        const p1EloNet = h2hElo[comparePlayer1]?.[comparePlayer2] || 0;
                        const p2EloNet = h2hElo[comparePlayer2]?.[comparePlayer1] || 0;
                        if (p1EloNet === 0 && p2EloNet === 0) return null;
                        return (
                          <div
                            className="rounded-lg p-4 border"
                            style={{ background: "var(--surface-container-lowest)", borderColor: "var(--border)", borderRadius: "var(--radius-card)" }}
                          >
                            <div className="flex items-center gap-1.5 mb-3">
                              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                              <span style={{ fontFamily: FONT, fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                                Elo-utbyte
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-center">
                                <span className="block truncate" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--muted-foreground)", marginBottom: 4 }}>
                                  {stripEmoji(comparePlayer1).split(" ")[0]}
                                </span>
                                <span
                                  style={{
                                    fontFamily: FONT,
                                    fontSize: "var(--text-h3)",
                                    fontWeight: "var(--font-weight-bold)",
                                    color: p1EloNet > 0 ? "var(--success)" : p1EloNet < 0 ? "var(--destructive)" : "var(--muted-foreground)",
                                  }}
                                >
                                  {p1EloNet > 0 ? "+" : ""}{p1EloNet}
                                </span>
                              </div>
                              <div className="text-center">
                                <span className="block truncate" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--muted-foreground)", marginBottom: 4 }}>
                                  {stripEmoji(comparePlayer2).split(" ")[0]}
                                </span>
                                <span
                                  style={{
                                    fontFamily: FONT,
                                    fontSize: "var(--text-h3)",
                                    fontWeight: "var(--font-weight-bold)",
                                    color: p2EloNet > 0 ? "var(--success)" : p2EloNet < 0 ? "var(--destructive)" : "var(--muted-foreground)",
                                  }}
                                >
                                  {p2EloNet > 0 ? "+" : ""}{p2EloNet}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 text-center">
                              <span style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                                Netto Elo vunnet/förlorat mot varandra
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ── H2H Weekday & Time Insights ── */}
                      {h2hInsights && h2hInsights.totalMeetings > 0 && (
                        <div className="space-y-3">
                          <span
                            className="text-muted-foreground block"
                            style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT }}
                          >
                            När möts de?
                          </span>

                          {/* Before/After lunch H2H */}
                          {(h2hInsights.beforeLunch.total > 0 || h2hInsights.afterLunch.total > 0) && (
                            <div
                              className="p-3 rounded-lg border border-border"
                              style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                            >
                              <div className="flex items-center gap-1.5 mb-2">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT }}>
                                  Tid på dagen
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {/* Before lunch */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="flex items-center gap-1" style={{ fontSize: "var(--text-sm)", color: "var(--warning)", fontFamily: FONT }}>
                                      <Coffee className="w-3 h-3" /> Fm
                                    </span>
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: FONT }}>
                                      {h2hInsights.beforeLunch.total} möten
                                    </span>
                                  </div>
                                  {h2hInsights.beforeLunch.total > 0 ? (
                                    <>
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="flex-1 h-2 rounded-full overflow-hidden flex" style={{ background: "var(--muted)" }}>
                                          <div
                                            className="h-full"
                                            style={{
                                              width: `${(h2hInsights.beforeLunch.p1Wins / h2hInsights.beforeLunch.total) * 100}%`,
                                              background: "var(--primary)",
                                              borderRadius: h2hInsights.beforeLunch.p2Wins === 0 ? "9999px" : "9999px 0 0 9999px",
                                            }}
                                          />
                                          <div
                                            className="h-full"
                                            style={{
                                              width: `${(h2hInsights.beforeLunch.p2Wins / h2hInsights.beforeLunch.total) * 100}%`,
                                              background: "var(--warning)",
                                              borderRadius: h2hInsights.beforeLunch.p1Wins === 0 ? "9999px" : "0 9999px 9999px 0",
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--primary)", fontFamily: FONT }}>
                                          {h2hInsights.beforeLunch.p1Wins}
                                        </span>
                                        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--warning)", fontFamily: FONT }}>
                                          {h2hInsights.beforeLunch.p2Wins}
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>Inga möten</span>
                                  )}
                                </div>
                                {/* After lunch */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="flex items-center gap-1" style={{ fontSize: "var(--text-sm)", color: "var(--info)", fontFamily: FONT }}>
                                      <Sun className="w-3 h-3" /> Em
                                    </span>
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: FONT }}>
                                      {h2hInsights.afterLunch.total} möten
                                    </span>
                                  </div>
                                  {h2hInsights.afterLunch.total > 0 ? (
                                    <>
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="flex-1 h-2 rounded-full overflow-hidden flex" style={{ background: "var(--muted)" }}>
                                          <div
                                            className="h-full"
                                            style={{
                                              width: `${(h2hInsights.afterLunch.p1Wins / h2hInsights.afterLunch.total) * 100}%`,
                                              background: "var(--primary)",
                                              borderRadius: h2hInsights.afterLunch.p2Wins === 0 ? "9999px" : "9999px 0 0 9999px",
                                            }}
                                          />
                                          <div
                                            className="h-full"
                                            style={{
                                              width: `${(h2hInsights.afterLunch.p2Wins / h2hInsights.afterLunch.total) * 100}%`,
                                              background: "var(--warning)",
                                              borderRadius: h2hInsights.afterLunch.p1Wins === 0 ? "9999px" : "0 9999px 9999px 0",
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--primary)", fontFamily: FONT }}>
                                          {h2hInsights.afterLunch.p1Wins}
                                        </span>
                                        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--warning)", fontFamily: FONT }}>
                                          {h2hInsights.afterLunch.p2Wins}
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>Inga möten</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Weekday H2H breakdown */}
                          {h2hInsights.weekdays.some((d) => d.total > 0) && (
                            <div
                              className="p-3 rounded-lg border border-border"
                              style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                            >
                              <div className="flex items-center gap-1.5 mb-3">
                                <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT }}>
                                  Veckodag
                                </span>
                              </div>
                              {/* Stacked bars per weekday */}
                              <div className="flex items-end gap-1.5" style={{ height: 56 }}>
                                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                                  const d = h2hInsights.weekdays[dayIdx];
                                  const maxTotal = Math.max(...h2hInsights.weekdays.map((w) => w.total), 1);
                                  const barH = d.total > 0 ? Math.max(10, (d.total / maxTotal) * 48) : 4;
                                  const p1Pct = d.total > 0 ? (d.p1Wins / d.total) * 100 : 0;
                                  return (
                                    <div
                                      key={d.dayIndex}
                                      className="flex-1"
                                      title={d.total > 0 ? `${d.day}: ${d.p1Wins}-${d.p2Wins}` : `${d.day}: Inga möten`}
                                    >
                                      {d.total > 0 ? (
                                        <div
                                          className="w-full rounded-sm overflow-hidden flex flex-col"
                                          style={{ height: barH, borderRadius: "var(--radius-sm)" }}
                                        >
                                          <div style={{ height: `${p1Pct}%`, background: "var(--primary)", minHeight: d.p1Wins > 0 ? 2 : 0 }} />
                                          <div style={{ height: `${100 - p1Pct}%`, background: "var(--warning)", minHeight: d.p2Wins > 0 ? 2 : 0 }} />
                                        </div>
                                      ) : (
                                        <div
                                          className="w-full rounded-sm"
                                          style={{ height: barH, background: "var(--border)", opacity: 0.3, borderRadius: "var(--radius-sm)" }}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Score labels */}
                              <div className="flex gap-1.5 mt-1.5">
                                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                                  const d = h2hInsights.weekdays[dayIdx];
                                  return (
                                    <div key={`h2h-score-${d.dayIndex}`} className="flex-1 text-center" style={{ minHeight: 12 }}>
                                      {d.total > 0 && (
                                        <span style={{ fontSize: "var(--text-xs)", fontFamily: FONT, fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                                          {d.p1Wins}-{d.p2Wins}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Day labels */}
                              <div className="flex gap-1.5 mt-0.5">
                                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                                  const d = h2hInsights.weekdays[dayIdx];
                                  return (
                                    <div key={`h2h-lbl-${d.dayIndex}`} className="flex-1 text-center">
                                      <span style={{ fontSize: "var(--text-xs)", fontFamily: FONT, color: d.total > 0 ? "var(--foreground)" : "var(--muted-foreground)", lineHeight: 1 }}>
                                        {d.dayShort}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Legend */}
                              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--primary)" }} />
                                  <span className="text-muted-foreground truncate" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                                    {stripEmoji(p1.name).split(" ")[0]}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--warning)" }} />
                                  <span className="text-muted-foreground truncate" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                                    {stripEmoji(p2.name).split(" ")[0]}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Best context callouts */}
                          {(h2hInsights.p1BestContext || h2hInsights.p2BestContext) && (
                            <div className="space-y-1.5">
                              {h2hInsights.p1BestContext && (
                                <div
                                  className="flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm"
                                  style={{
                                    background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                                    borderColor: "var(--border)",
                                    borderRadius: "var(--radius-card)",
                                    boxShadow: "var(--elevation-sm)",
                                  }}
                                >
                                  <div
                                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                                    style={{ background: "var(--muted)" }}
                                  >
                                    <span style={{ fontSize: "var(--text-sm)", lineHeight: 1 }}>💡</span>
                                  </div>
                                  <span style={{ fontSize: "var(--text-label)", lineHeight: 1.6, fontFamily: FONT, color: "var(--foreground)" }}>
                                    <strong style={{ color: "var(--primary)", fontWeight: "var(--font-weight-bold)" }}>{stripEmoji(p1.name).split(" ")[0]}</strong>
                                    {" "}presterar bäst mot{" "}
                                    <span style={{ color: "var(--muted-foreground)" }}>{stripEmoji(p2.name).split(" ")[0]}</span>
                                    {" "}på{" "}
                                    <strong style={{ color: "var(--foreground)", fontWeight: "var(--font-weight-bold)" }}>{h2hInsights.p1BestContext}</strong>
                                  </span>
                                </div>
                              )}
                              {h2hInsights.p2BestContext && h2hInsights.p2BestContext !== h2hInsights.p1BestContext && (
                                <div
                                  className="flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm"
                                  style={{
                                    background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                                    borderColor: "var(--border)",
                                    borderRadius: "var(--radius-card)",
                                    boxShadow: "var(--elevation-sm)",
                                  }}
                                >
                                  <div
                                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                                    style={{ background: "var(--muted)" }}
                                  >
                                    <span style={{ fontSize: "var(--text-sm)", lineHeight: 1 }}>💡</span>
                                  </div>
                                  <span style={{ fontSize: "var(--text-label)", lineHeight: 1.6, fontFamily: FONT, color: "var(--foreground)" }}>
                                    <strong style={{ color: "var(--warning)", fontWeight: "var(--font-weight-bold)" }}>{stripEmoji(p2.name).split(" ")[0]}</strong>
                                    {" "}presterar bäst mot{" "}
                                    <span style={{ color: "var(--muted-foreground)" }}>{stripEmoji(p1.name).split(" ")[0]}</span>
                                    {" "}på{" "}
                                    <strong style={{ color: "var(--foreground)", fontWeight: "var(--font-weight-bold)" }}>{h2hInsights.p2BestContext}</strong>
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                    </motion.div>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col">

      {/* ── Season Summary Card ── */}
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
                fontFamily: FONT,
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
                      👑 {seasonSummary.mvp.name.split(" ")[0]}
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
                <span style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
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
                        <div style={{ fontFamily: FONT, fontSize: "var(--text-h3)", fontWeight: "var(--font-weight-bold)", color: "var(--primary)", lineHeight: 1.1 }}>
                          {seasonSummary.totalSessions}
                        </div>
                        <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Omgångar
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: FONT, fontSize: "var(--text-h3)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)", lineHeight: 1.1 }}>
                          {seasonSummary.totalGames}
                        </div>
                        <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
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
                          <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            MVP
                          </div>
                          <div className="truncate" style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", color: "var(--primary)" }}>
                            {seasonSummary.mvp.name}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>
                            {seasonSummary.mvp.wins}
                          </div>
                          <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>vinster</div>
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
                          <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Mest förbättrad
                          </div>
                          <div className="truncate" style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", color: "var(--success)" }}>
                            {seasonSummary.mostImproved.name}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div style={{
                            fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)",
                            color: seasonSummary.mostImproved.eloDelta > 0 ? "var(--success)" : "var(--destructive)",
                          }}>
                            {seasonSummary.mostImproved.eloDelta > 0 ? "+" : ""}{seasonSummary.mostImproved.eloDelta}
                          </div>
                          <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>Elo</div>
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
                          <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Störst skräll
                          </div>
                          <div className="truncate" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)", color: "var(--warning)" }}>
                            {seasonSummary.biggestUpset.winner}{" "}
                            <span className="text-muted-foreground" style={{ fontWeight: "var(--font-weight-normal)", fontSize: "var(--text-xs)" }}>slog</span>{" "}
                            {seasonSummary.biggestUpset.loser}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)", color: "var(--warning)" }}>
                            {seasonSummary.biggestUpset.eloDiff}
                          </div>
                          <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>Elo-diff</div>
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
                          <span style={{ fontSize: "var(--text-base)" }}>🔥</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Längsta vinstraden
                          </div>
                          <div className="truncate" style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                            {seasonSummary.longestWinStreak.name}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)", color: "var(--primary)" }}>
                            {seasonSummary.longestWinStreak.streak}
                          </div>
                          <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>i rad</div>
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
                          <span style={{ fontSize: "var(--text-base)" }}>⚔️</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Rivalitet
                          </div>
                          <div className="truncate" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                            {seasonSummary.rivalry.player1}{" "}
                            <span className="text-muted-foreground" style={{ fontWeight: "var(--font-weight-normal)", fontSize: "var(--text-xs)" }}>vs</span>{" "}
                            {seasonSummary.rivalry.player2}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>
                            {seasonSummary.rivalry.record}
                          </div>
                          <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>{seasonSummary.rivalry.meetings} möten</div>
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
                          <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Störst Elo-tapp
                          </div>
                          <div className="truncate" style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", color: "var(--destructive)" }}>
                            {seasonSummary.biggestDrop.name}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)", color: "var(--destructive)" }}>
                            {seasonSummary.biggestDrop.eloDelta}
                          </div>
                          <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>Elo</div>
                        </div>
                      </div>
                    )}

                    {/* Extra stats row */}
                    <div className="grid grid-cols-2 gap-2">
                      {seasonSummary.busiestDay && (
                        <div className="p-3 rounded-lg" style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-sm)" }}>
                          <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Populäraste dagen
                          </div>
                          <div style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                            {seasonSummary.busiestDay.day}
                          </div>
                          <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>
                            {seasonSummary.busiestDay.count} omgångar
                          </div>
                        </div>
                      )}
                      <div className="p-3 rounded-lg" style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-sm)" }}>
                        <div className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Snitt finaler/session
                        </div>
                        <div style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                          {seasonSummary.avgFinalsPerSession}
                        </div>
                      </div>
                    </div>

                    {/* Superlatives */}
                    {seasonSummary.superlatives.length > 0 && (
                      <div>
                        <span
                          className="text-muted-foreground mb-2 block"
                          style={{ fontFamily: FONT, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}
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
                                  style={{ fontFamily: FONT, fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}
                                >
                                  {s.name}
                                </span>
                              </div>
                              <div
                                className="text-muted-foreground mt-0.5"
                                style={{ fontFamily: FONT, fontSize: 10, lineHeight: 1.3 }}
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
                      <span style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontStyle: "italic" }}>
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

      {/* ── Table (always visible, below deep dive when active) ── */}
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

      {/* ── Action row: Add player + Export CSV + API ── */}
      {sortedStats.length > 0 && (
        <div className="flex items-center justify-between mt-3 mb-4" style={{ order: 3 }}>
          <div>
            {isViewingCurrentMonth && (
              <button
                onClick={() => setShowAddPlayer(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-border-strong transition-all cursor-pointer"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--font-weight-semibold)" as any,
                  borderRadius: "var(--radius-button)",
                }}
              >
                <Users className="w-4 h-4" />
                Lägg till spelare
              </button>
            )}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setShowApiModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border transition-all cursor-pointer hover:opacity-80"
              style={{
                fontFamily: FONT,
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-semibold)" as any,
                color: "var(--foreground)",
                background: "var(--surface-container-high)",
                borderRadius: "var(--radius-button)",
              }}
            >
              <Code2 className="w-4 h-4" />
              API
            </button>
            <button
              onClick={exportStatsCsv}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border transition-all cursor-pointer hover:opacity-80"
              style={{
                fontFamily: FONT,
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-semibold)" as any,
                color: "var(--foreground)",
                background: "var(--surface-container-high)",
                borderRadius: "var(--radius-button)",
              }}
            >
              <Download className="w-4 h-4" />
              Exportera CSV{selectedMonth === "total" ? " (Total)" : ` (${selectedMonth})`}
            </button>
          </div>
        </div>
      )}

      {/* ── API Info Modal ── */}
      <AnimatePresence>
        {showApiModal && (() => {
          const baseUrl = `${API_BASE}/api/stats`;
          const exampleTotal = `${baseUrl}?month=total`;
          const exampleMonth = `${baseUrl}?month=2026-03`;
          // Browser test uses fetch with auth header + blob URL (apikey query param not supported by Edge Functions)
          const curlExample = `curl "${exampleTotal}"`;
          const fetchExample = `const res = await fetch("${baseUrl}?month=2026-03");
const data = await res.json();
console.log(data.players);`;
          const copyToClipboard = (text: string, label: string) => {
            navigator.clipboard.writeText(text);
            setApiCopied(label);
            setTimeout(() => setApiCopied(null), 2000);
          };
          const codeBlockStyle: React.CSSProperties = {
            fontFamily: "'Courier New', monospace",
            fontSize: "var(--text-xs)",
            background: "var(--surface-container-lowest)",
            color: "var(--primary)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 14px",
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            border: "1px solid var(--outline-variant)",
            position: "relative" as const,
          };
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
              onClick={() => setShowApiModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border"
                style={{
                  fontFamily: FONT,
                  background: "var(--surface-container)",
                  borderRadius: "var(--radius-xl)",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: "var(--primary)", color: "var(--on-primary)" }}>
                      <Code2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 style={{ fontFamily: FONT, fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-bold)" as any, color: "var(--foreground)" }}>
                        Stats API
                      </h2>
                      <p style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--on-surface-variant)" }}>
                        Rundpingisklubben — öppet JSON-API
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowApiModal(false)} className="p-2 rounded-lg hover:opacity-80 transition-opacity cursor-pointer" style={{ color: "var(--on-surface-variant)" }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Endpoint */}
                  <div>
                    <h3 style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as any, color: "var(--foreground)", marginBottom: 6 }}>
                      Endpoint
                    </h3>
                    <div style={codeBlockStyle}>
                      <span style={{ color: "var(--tertiary)" }}>GET</span>{" "}
                      <span style={{ color: "var(--primary)" }}>{baseUrl}</span>
                      <button
                        onClick={() => copyToClipboard(baseUrl, "url")}
                        className="absolute top-2 right-2 p-1.5 rounded-md hover:opacity-80 transition-opacity cursor-pointer"
                        style={{ background: "var(--surface-container-high)", color: apiCopied === "url" ? "var(--primary)" : "var(--on-surface-variant)" }}
                      >
                        {apiCopied === "url" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Query params */}
                  <div>
                    <h3 style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as any, color: "var(--foreground)", marginBottom: 6 }}>
                      Query-parametrar
                    </h3>
                    <div className="rounded-lg overflow-hidden border border-border" style={{ borderRadius: "var(--radius-sm)" }}>
                      <table className="w-full" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                        <thead>
                          <tr style={{ background: "var(--surface-container-high)" }}>
                            <th className="text-left px-3 py-2" style={{ color: "var(--on-surface-variant)", fontWeight: "var(--font-weight-semibold)" as any }}>Parameter</th>
                            <th className="text-left px-3 py-2" style={{ color: "var(--on-surface-variant)", fontWeight: "var(--font-weight-semibold)" as any }}>Typ</th>
                            <th className="text-left px-3 py-2" style={{ color: "var(--on-surface-variant)", fontWeight: "var(--font-weight-semibold)" as any }}>Beskrivning</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderTop: "1px solid var(--outline-variant)" }}>
                            <td className="px-3 py-2" style={{ color: "var(--primary)", fontFamily: "'Courier New', monospace" }}>month</td>
                            <td className="px-3 py-2" style={{ color: "var(--on-surface-variant)" }}>string</td>
                            <td className="px-3 py-2" style={{ color: "var(--foreground)" }}>
                              <code style={{ fontFamily: "'Courier New', monospace", background: "var(--surface-container-lowest)", padding: "1px 5px", borderRadius: 4 }}>YYYY-MM</code> eller{" "}
                              <code style={{ fontFamily: "'Courier New', monospace", background: "var(--surface-container-lowest)", padding: "1px 5px", borderRadius: 4 }}>total</code>{" "}
                              <span style={{ color: "var(--on-surface-variant)" }}>(default)</span>
                            </td>
                          </tr>

                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* cURL example */}
                  <div>
                    <h3 style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as any, color: "var(--foreground)", marginBottom: 6 }}>
                      cURL-exempel
                    </h3>
                    <div style={codeBlockStyle}>
                      {curlExample}
                      <button
                        onClick={() => copyToClipboard(curlExample, "curl")}
                        className="absolute top-2 right-2 p-1.5 rounded-md hover:opacity-80 transition-opacity cursor-pointer"
                        style={{ background: "var(--surface-container-high)", color: apiCopied === "curl" ? "var(--primary)" : "var(--on-surface-variant)" }}
                      >
                        {apiCopied === "curl" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* JS/fetch example */}
                  <div>
                    <h3 style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as any, color: "var(--foreground)", marginBottom: 6 }}>
                      JavaScript / fetch
                    </h3>
                    <div style={codeBlockStyle}>
                      {fetchExample}
                      <button
                        onClick={() => copyToClipboard(fetchExample, "fetch")}
                        className="absolute top-2 right-2 p-1.5 rounded-md hover:opacity-80 transition-opacity cursor-pointer"
                        style={{ background: "var(--surface-container-high)", color: apiCopied === "fetch" ? "var(--primary)" : "var(--on-surface-variant)" }}
                      >
                        {apiCopied === "fetch" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Response fields */}
                  <div>
                    <h3 style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as any, color: "var(--foreground)", marginBottom: 6 }}>
                      Svarsformat
                    </h3>
                    <div className="rounded-lg overflow-hidden border border-border" style={{ borderRadius: "var(--radius-sm)" }}>
                      <table className="w-full" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                        <thead>
                          <tr style={{ background: "var(--surface-container-high)" }}>
                            <th className="text-left px-3 py-2" style={{ color: "var(--on-surface-variant)", fontWeight: "var(--font-weight-semibold)" as any }}>Fält</th>
                            <th className="text-left px-3 py-2" style={{ color: "var(--on-surface-variant)", fontWeight: "var(--font-weight-semibold)" as any }}>Beskrivning</th>
                          </tr>
                        </thead>
                        <tbody style={{ color: "var(--foreground)" }}>
                          {[
                            ["month", "Vald månad eller \"total\""],
                            ["playerCount", "Antal spelare med data"],
                            ["availableMonths", "Lista av YYYY-MM med data"],
                            ["players[].name", "Spelarens namn"],
                            ["players[].elo / peakElo", "Aktuell & peak Elo-rating"],
                            ["players[].wins / finals / gamesPlayed", "Grundläggande statistik"],
                            ["players[].winPct / finalPct / finalWinPct", "Vinstprocent"],
                            ["players[].currentStreak / bestStreak", "Vinst-streaks"],
                            ["players[].nemesis / prey", "Svåraste motståndare / favoritbyte"],
                            ["players[].h2h", "Head-to-head per motståndare"],
                            ["players[].yellowCards / redCards", "Kort"],
                            ["players[].tournamentWins", "Antal turneringsvinster"],
                            ["players[].insights", "Veckodag, tid, gruppstorleks-analys"],
                          ].map(([field, desc]) => (
                            <tr key={field} style={{ borderTop: "1px solid var(--outline-variant)" }}>
                              <td className="px-3 py-1.5" style={{ fontFamily: "'Courier New', monospace", color: "var(--primary)", fontSize: "var(--text-xs)" }}>{field}</td>
                              <td className="px-3 py-1.5" style={{ fontSize: "var(--text-xs)" }}>{desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Try it */}
                  <div className="pt-2">
                    <button
                      onClick={async () => {
                        setApiLoading(true);
                        setApiPreview(null);
                        try {
                          const res = await fetch(exampleTotal);
                          const json = await res.json();
                          setApiPreview(JSON.stringify(json, null, 2));
                        } catch (err) {
                          setApiPreview(`Fel: ${err}`);
                        } finally {
                          setApiLoading(false);
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:opacity-90 cursor-pointer"
                      style={{
                        fontFamily: FONT,
                        fontSize: "var(--text-sm)",
                        fontWeight: "var(--font-weight-semibold)" as any,
                        background: "var(--primary)",
                        color: "var(--primary-foreground)",
                        borderRadius: "var(--radius-button)",
                      }}
                    >
                      {apiLoading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      {apiLoading ? "Hämtar..." : apiPreview ? "Hämta igen" : "Testa API:et"}
                    </button>
                    {apiPreview && (
                      <div className="mt-3 relative">
                        <div className="flex items-center justify-between mb-1.5">
                          <span style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--on-surface-variant)", fontWeight: "var(--font-weight-semibold)" as any }}>Svar (JSON)</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(apiPreview); setApiCopied("response"); setTimeout(() => setApiCopied(null), 2000); }}
                            className="p-1.5 rounded-md hover:opacity-80 transition-opacity cursor-pointer"
                            style={{ background: "var(--surface-container-high)", color: apiCopied === "response" ? "var(--primary)" : "var(--on-surface-variant)" }}
                          >
                            {apiCopied === "response" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <pre style={{
                          ...codeBlockStyle,
                          maxHeight: 300,
                          overflowY: "auto",
                          fontSize: "11px",
                          margin: 0,
                        }}>{apiPreview}</pre>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Ranking Info Modal ── */}
      <AnimatePresence>
        {showRankingInfoModal && (
          <motion.div
            key="ranking-info-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowRankingInfoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-xl border border-border overflow-hidden"
              style={{ background: "var(--popover)", color: "var(--popover-foreground)", fontFamily: "'Titillium Web', sans-serif", boxShadow: "var(--elevation-sm)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h3 style={{ fontSize: "var(--text-h4)", fontWeight: "var(--font-weight-semibold)", fontFamily: "'Titillium Web', sans-serif", margin: 0 }}>
                  Månadsranking
                </h3>
                <button onClick={() => setShowRankingInfoModal(false)} className="p-2 rounded-lg hover:opacity-80 transition-opacity cursor-pointer text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 overflow-y-auto" style={{ maxHeight: "70vh" }}>
                {/* Formula section */}
                <div className="mb-5">
                  <h4 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-semibold)", fontFamily: "'Titillium Web', sans-serif", margin: "0 0 8px 0" }}>
                    Viktat Elo-delta (Eff. Δ)
                  </h4>
                  <p style={{ fontSize: "var(--text-base)", fontFamily: "'Titillium Web', sans-serif", margin: "0 0 12px 0" }} className="text-muted-foreground">
                    Rankingen baseras på effektivitet, inte bara volym. Formeln är:
                  </p>
                  <div className="rounded-lg border border-border p-4 mb-4" style={{ background: "var(--surface-container-high)", fontFamily: "'Titillium Web', sans-serif" }}>
                    <p style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-bold)", textAlign: "center", margin: 0 }} className="text-primary">
                      Eff. Δ = Elo Δ / √rundor
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <span style={{ fontSize: "var(--text-lg)" }}>📊</span>
                      <p style={{ fontSize: "var(--text-sm)", fontFamily: "'Titillium Web', sans-serif", margin: 0 }} className="text-muted-foreground">
                        <strong className="text-foreground">Elo Δ</strong> = netto Elo-förändring under månaden
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span style={{ fontSize: "var(--text-lg)" }}>📐</span>
                      <p style={{ fontSize: "var(--text-sm)", fontFamily: "'Titillium Web', sans-serif", margin: 0 }} className="text-muted-foreground">
                        <strong className="text-foreground">√rundor</strong> = kvadratroten av antal spelade rundor, normaliserar för volym
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span style={{ fontSize: "var(--text-lg)" }}>🎯</span>
                      <p style={{ fontSize: "var(--text-sm)", fontFamily: "'Titillium Web', sans-serif", margin: 0 }} className="text-muted-foreground">
                        <strong className="text-foreground">Minst 30 rundor</strong> under månaden krävs för att kvalificera som seedad
                      </p>
                    </div>
                  </div>
                </div>

                {/* Example section */}
                <div>
                  <h4 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-semibold)", fontFamily: "'Titillium Web', sans-serif", margin: "0 0 12px 0" }}>
                    Exempel
                  </h4>
                  <div className="flex flex-col gap-2 mb-3">
                    {[
                      { rank: "#1", name: "Lisa", delta: "Δ+45", rounds: "32r", eff: "8.0" },
                      { rank: "#2", name: "Erik", delta: "Δ+55", rounds: "60r", eff: "7.1" },
                      { rank: "#3", name: "Kalle", delta: "Δ+42", rounds: "50r", eff: "5.9" },
                    ].map((row) => (
                      <div
                        key={row.rank}
                        className="flex items-center gap-3 rounded-lg border border-border px-4 py-2.5"
                        style={{ background: row.rank === "#1" ? "var(--primary-container)" : "var(--surface-container)", fontFamily: "'Titillium Web', sans-serif" }}
                      >
                        <span style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-bold)", minWidth: "28px" }} className={row.rank === "#1" ? "text-primary" : "text-muted-foreground"}>
                          {row.rank}
                        </span>
                        <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", flex: 1 }} className="text-foreground">
                          {row.name}
                        </span>
                        <span style={{ fontSize: "var(--text-sm)" }} className="text-success">{row.delta}</span>
                        <span style={{ fontSize: "var(--text-sm)" }} className="text-muted-foreground">{row.rounds}</span>
                        <span style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-bold)" }} className="text-primary">{row.eff}</span>
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: "var(--text-sm)", fontFamily: "'Titillium Web', sans-serif", margin: "0 0 8px 0" }} className="text-muted-foreground">
                    Lisa rankas <strong className="text-foreground">#1</strong> — högst Eff. Δ trots lägre rått delta
                  </p>
                  <p style={{ fontSize: "var(--text-sm)", fontFamily: "'Titillium Web', sans-serif", margin: 0 }} className="text-muted-foreground">
                    Volym ger fortfarande fördel, men avtagande: 4× fler rundor kräver bara 2× högre delta för samma ranking.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Deep Dive view (shown above table) ── */}
      <AnimatePresence>
      {showGraphView && (
        <motion.div
          initial={{ opacity: 0, height: 0, scale: 0.98 }}
          animate={{ opacity: 1, height: "auto", scale: 1 }}
          exit={{ opacity: 0, height: 0, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="rounded-lg border border-border overflow-hidden"
          style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)", order: 1, marginBottom: 24 }}
        >
          <div className="flex items-center gap-3 px-3 md:px-4 py-3 border-b border-border" style={{ background: "var(--surface-container-high)" }}>
            <Activity className="w-4 h-4 text-primary" />
            <span style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", letterSpacing: "0.02em" }}>
              Deep Dive
            </span>
          </div>

          <div className="p-2 md:p-4">
            {/* ── Scatter chart: Finalvinst% vs Elo ── */}
            {(() => {
              const scatterData = sortedStats
                .filter((s) => s.gamesPlayed > 0)
                .map((s) => ({ ...s, elo: eloRatings[s.name]?.elo ?? ELO_START }));
              const eloValues = scatterData.map((d) => d.elo);
              const minElo = eloValues.length > 0 ? Math.floor((Math.min(...eloValues) - 30) / 50) * 50 : 900;
              const maxElo = eloValues.length > 0 ? Math.ceil((Math.max(...eloValues) + 30) / 50) * 50 : 1100;
              return (
            <ResponsiveContainer width="100%" height={isMobile ? 300 : 420}>
                <ScatterChart margin={isMobile ? { top: 15, right: 10, bottom: 35, left: 10 } : { top: 20, right: 30, bottom: 40, left: 30 }}>
                  <CartesianGrid key="scatter-grid" strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis
                    key="scatter-x"
                    type="number"
                    dataKey="vfPct"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    stroke="var(--muted-foreground)"
                    tick={{ fontSize: 11, fontFamily: "'Titillium Web', sans-serif" }}
                    tickLine={{ stroke: "var(--border)" }}
                  >
                    <Label
                      value="Finalvinst% — Vinstfrekvens i finaler (%)"
                      position="bottom"
                      offset={20}
                      style={{ fontSize: 12, fill: "var(--muted-foreground)", fontFamily: "'Titillium Web', sans-serif" }}
                    />
                  </XAxis>
                  <YAxis
                    key="scatter-y"
                    type="number"
                    dataKey="elo"
                    domain={[minElo, maxElo]}
                    stroke="var(--muted-foreground)"
                    tick={{ fontSize: 11, fontFamily: "'Titillium Web', sans-serif" }}
                    tickLine={{ stroke: "var(--border)" }}
                  >
                    <Label
                      value="Elo Rating"
                      angle={-90}
                      position="left"
                      offset={10}
                      style={{ fontSize: 12, fill: "var(--muted-foreground)", fontFamily: "'Titillium Web', sans-serif" }}
                    />
                  </YAxis>
                  <ReferenceLine key="ref-x" x={50} stroke="var(--border-strong)" strokeDasharray="5 5" strokeWidth={1} />
                  <ReferenceLine key="ref-y" y={ELO_START} stroke="var(--border-strong)" strokeDasharray="5 5" strokeWidth={1} label={{ value: "Start", position: "right", fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "'Titillium Web', sans-serif" }} />
                  <Tooltip
                    key="scatter-tooltip"
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as PlayerStats & { elo: number };
                      const eloEntry = eloRatings[d.name];
                      return (
                        <div
                          className="px-4 py-3 rounded-lg border border-border shadow-lg"
                          style={{
                            background: "var(--popover)",
                            borderRadius: "var(--radius-card)",
                            backdropFilter: "blur(12px)",
                          }}
                        >
                          <div
                            className="text-foreground mb-2"
                            style={{ fontFamily: FONT, fontWeight: "var(--font-weight-semibold)", fontSize: "var(--text-base)" }}
                          >
                            {d.name}
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between gap-6" style={{ fontSize: "var(--text-sm)" }}>
                              <span className="text-muted-foreground">Elo</span>
                              <span className="text-primary" style={{ fontWeight: "var(--font-weight-semibold)" }}>
                                {d.elo}
                                {eloEntry && eloEntry.delta !== 0 && (
                                  <span style={{ color: eloEntry.delta > 0 ? "var(--success)" : "var(--destructive)", fontSize: "var(--text-xs)", marginLeft: 4 }}>
                                    {eloEntry.delta > 0 ? "+" : ""}{eloEntry.delta}
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between gap-6" style={{ fontSize: "var(--text-sm)" }}>
                              <span className="text-muted-foreground">Finalvinst%</span>
                              <span className="text-foreground" style={{ fontWeight: "var(--font-weight-semibold)" }}>{d.vfPct.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between gap-6" style={{ fontSize: "var(--text-sm)" }}>
                              <span className="text-muted-foreground">Vinst%</span>
                              <span className="text-foreground" style={{ fontWeight: "var(--font-weight-semibold)" }}>{d.bwp.toFixed(1)}%</span>
                            </div>
                            <div className="pt-1 border-t border-border mt-1 flex justify-between gap-6" style={{ fontSize: "var(--text-sm)" }}>
                              <span className="text-muted-foreground">Statistik</span>
                              <span className="text-foreground">{d.wins}V / {d.finals}F / {d.gamesPlayed}S</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    key="scatter-data"
                    data={scatterData}
                    fill="var(--primary)"
                    shape={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (cx == null || cy == null) return null;
                      const r = Math.max(5, Math.min(14, 4 + Math.sqrt(payload.gamesPlayed) * 1.2));
                      const eloNorm = Math.min(Math.max((payload.elo - 900) / 300, 0), 1);
                      return (
                        <g>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={r + 2}
                            fill="var(--primary)"
                            opacity={0.15}
                          />
                          <circle
                            cx={cx}
                            cy={cy}
                            r={r}
                            fill="var(--primary)"
                            opacity={0.35 + eloNorm * 0.55}
                            stroke="var(--primary)"
                            strokeWidth={1.5}
                            strokeOpacity={0.6}
                          />
                          <text
                            x={cx}
                            y={cy - r - 5}
                            textAnchor="middle"
                            fill="var(--foreground)"
                            style={{ fontSize: 10, fontWeight: payload.elo > ELO_START ? 600 : 400, fontFamily: "'Titillium Web', sans-serif" }}
                          >
                            {stripEmoji(payload.name).split(" ")[0]}
                          </text>
                        </g>
                      );
                    }}
                  />
                  {/* Quadrant labels */}
                  <text key="q-hype" x="18%" y="10%" textAnchor="middle" fill="var(--warning)" opacity={0.18} style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "'Titillium Web', sans-serif" }}>
                    HÖG ELO
                  </text>
                  <text key="q-elite" x="78%" y="10%" textAnchor="middle" fill="var(--success)" opacity={0.18} style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "'Titillium Web', sans-serif" }}>
                    ELITE
                  </text>
                  <text key="q-weak" x="18%" y="92%" textAnchor="middle" fill="var(--muted-foreground)" opacity={0.18} style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "'Titillium Web', sans-serif" }}>
                    SVAG
                  </text>
                  <text key="q-clutch" x="78%" y="92%" textAnchor="middle" fill="var(--info)" opacity={0.18} style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "'Titillium Web', sans-serif" }}>
                    CLUTCH
                  </text>
                </ScatterChart>
              </ResponsiveContainer>
              );
            })()}

          </div>

          {/* ── H2H Matrix ── */}
          <div
            className="border-t border-border p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Grid3X3Icon className="w-4 h-4 text-primary" />
              <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                H2H-matris
              </span>
            </div>
            <H2HMatrix stats={stats} />
          </div>

          {/* ── Speltider Heatmap ── */}
          {activeSessions.length > 0 && (
            <div
              className="border-t border-border p-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                  Speltider
                </span>
              </div>
              <WeekdayHeatmap sessions={activeSessions} />
            </div>
          )}

          {/* ── Elo Rating Table ── */}
          {Object.keys(eloRatings).length > 0 && (
            <div className="border-t border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                  Elo Rating
                </span>
              </div>

              {/* Elo table */}
              <div className="overflow-x-auto -mx-2">
                <table className="w-full" style={{ fontFamily: FONT }}>
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-2 py-2" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)", letterSpacing: "0.05em", textTransform: "uppercase" }}>#</th>
                      <th className="text-left px-2 py-2" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Spelare</th>
                      <th className="text-right px-2 py-2" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Elo</th>
                      <th className="text-right px-2 py-2" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Peak</th>
                      <th className="text-right px-2 py-2" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)", letterSpacing: "0.05em", textTransform: "uppercase", cursor: "help" }}>Δ senaste</th>
                      <th className="text-right px-2 py-2" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Rundor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(eloRatings)
                      .sort((a, b) => b.elo - a.elo || a.name.localeCompare(b.name, "sv"))
                      .map((entry, idx) => (
                        <tr key={entry.name} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-2 py-2" style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                            {idx < 3 ? getRankIcon(idx + 1) : <span>{idx + 1}</span>}
                          </td>
                          <td className="px-2 py-2" style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                            {entry.name}
                          </td>
                          <td className="text-right px-2 py-2" style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-bold)", color: "var(--primary)" }}>
                            {entry.elo}
                          </td>
                          <td className="text-right px-2 py-2" style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                            {entry.peakElo}
                          </td>
                          <td className="text-right px-2 py-2" title="Elo-förändring från senaste runda" style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: entry.delta > 0 ? "var(--success)" : entry.delta < 0 ? "var(--destructive)" : "var(--muted-foreground)", cursor: "help" }}>
                            {entry.delta > 0 ? "+" : ""}{entry.delta}
                          </td>
                          <td className="text-right px-2 py-2" style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                            {entry.matches}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Model explanation */}
              <div
                className="mt-4 p-3 rounded-lg border border-border/60"
                style={{ background: "var(--surface-container-high)", borderRadius: "var(--radius-card)" }}
              >
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                      Hur Elo-potten fungerar
                    </span>
                    <div className="mt-1 space-y-1" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                      <p>Alla spelare startar på <strong style={{ color: "var(--foreground)" }}>1000 Elo</strong>. Varje runda satsar alla deltagare <strong style={{ color: "var(--foreground)" }}>{ELO_ANTE} Elo</strong> i en gemensam pott.</p>
                      <p>
                        <strong style={{ color: "var(--foreground)" }}>Pott = N × {ELO_ANTE}</strong> &nbsp;→&nbsp;
                        Finalisterna delar potten baserat på Elo-skillnad (α={ELO_ALPHA}).
                      </p>
                      <p>
                        Icke-finalist: <strong style={{ color: "var(--destructive)" }}>−{ELO_ANTE}</strong> &nbsp;·&nbsp;
                        Finalist (förlust): <strong style={{ color: "var(--success)" }}>+1 till +{Math.round(8 * ELO_ANTE * 0.5 - ELO_ANTE)}</strong> &nbsp;·&nbsp;
                        Finalist (vinst): <strong style={{ color: "var(--success)" }}>+{Math.round(8 * ELO_ANTE * 0.5 - ELO_ANTE)} till +{Math.round(8 * ELO_ANTE * (0.5 + ELO_ALPHA) - ELO_ANTE)}</strong>
                      </p>
                      <p>
                        <strong style={{ color: "var(--warning)" }}>⚡ Upset-bonus:</strong> Om underdogen (lägre Elo) vinner finalen och Elo-gapet är ≥{" "}
                        <strong style={{ color: "var(--foreground)" }}>{ELO_UPSET_THRESHOLD}</strong> poäng, får vinnaren en extra bonus på{" "}
                        <strong style={{ color: "var(--success)" }}>+{ELO_UPSET_BONUS} Elo</strong> utöver sin pottandel.
                        {" "}Denna bonus ligger <em>utanför</em> nollsumman och belönar upsets.
                      </p>
                      <p>I övrigt är systemet <strong style={{ color: "var(--foreground)" }}>nollsumma</strong> — ingen Elo skapas eller förstörs från potten.</p>
                      <p>Peak-värdet visar spelarens högsta uppnådda Elo.</p>
                      <p style={{ fontStyle: "italic", color: "var(--muted-foreground)" }}>Obs: Elo beräknas från all sessionsdata (från mars 2026). Arkiverade månader utan runddata ingår ej.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>
      </div>{/* end flex col wrapper */}

      {/* ── Player Profile Modal ── */}
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
                                const d = monthlyEloDelta[selectedPlayer.name] ?? 0;
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
                        const barPct = Math.min(100, (rv.lossStreak / Math.max(rv.totalLosses + rv.totalWins, 1)) * 100);
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

      {/* Add player trigger moved to action row above */}

      {/* ── Add player modal ── */}
      <AnimatePresence>
        {showAddPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddPlayer(false);
                setNewPlayerName("");
                setShowEmojiGrid(false);
                setDuplicateError("");
              }
            }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />

            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative w-full md:max-w-md rounded-t-2xl md:rounded-2xl border border-border p-5 md:p-6"
              style={{
                background: "var(--surface-container)",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.3), 0 0 0 1px var(--border)",
              }}
            >
              {/* Drag handle (mobile) */}
              <div className="md:hidden flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span
                    className="text-foreground"
                    style={{
                      fontFamily: FONT,
                      fontSize: "var(--text-base)",
                      fontWeight: "var(--font-weight-semibold)",
                    }}
                  >
                    Lägg till spelare
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowAddPlayer(false);
                    setNewPlayerName("");
                    setShowEmojiGrid(false);
                    setDuplicateError("");
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors cursor-pointer"
                  style={{ borderRadius: "var(--radius-card)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Emoji + name input */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiGrid(!showEmojiGrid)}
                    className="w-12 h-12 rounded-lg border border-border hover:border-border-strong flex items-center justify-center transition-all cursor-pointer"
                    style={{
                      background: "var(--surface-container-high)",
                      fontSize: "var(--text-h4)",
                      borderRadius: "var(--radius-card)",
                    }}
                  >
                    {selectedEmoji}
                  </button>
                  {showEmojiGrid && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowEmojiGrid(false)} />
                      <div
                        className="absolute left-0 bottom-full mb-2 p-3 rounded-lg border border-border shadow-lg z-50 grid grid-cols-8 gap-1.5"
                        style={{
                          background: "var(--popover)",
                          maxWidth: 280,
                          borderRadius: "var(--radius-card)",
                        }}
                      >
                        {PLAYER_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              setSelectedEmoji(emoji);
                              setShowEmojiGrid(false);
                            }}
                            className={`w-8 h-8 flex items-center justify-center rounded hover:bg-muted/40 transition-colors cursor-pointer ${
                              selectedEmoji === emoji ? "bg-primary/20 ring-1 ring-primary" : ""
                            }`}
                            style={{ fontSize: "var(--text-lg)" }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => { setNewPlayerName(e.target.value); setDuplicateError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                  placeholder="Spelarnamn..."
                  autoFocus
                  className="flex-1 px-4 py-3 rounded-lg border bg-input-background text-foreground placeholder:text-muted-foreground"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-base)",
                    borderRadius: "var(--radius-card)",
                    borderColor: duplicateError ? "var(--destructive)" : "var(--border)",
                    outline: "none",
                  }}
                />
              </div>

              {/* Error */}
              {duplicateError && (
                <div
                  className="mb-4 px-3 py-2 rounded-lg flex items-center gap-2"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-label)",
                    borderRadius: "var(--radius-card)",
                    background: "color-mix(in srgb, var(--destructive) 12%, transparent)",
                    color: "var(--destructive)",
                  }}
                >
                  <X className="w-3.5 h-3.5 shrink-0" />
                  {duplicateError}
                </div>
              )}

              {/* Preview */}
              {newPlayerName.trim() && !duplicateError && (
                <div
                  className="mb-4 px-3 py-2 rounded-lg bg-muted/20 text-muted-foreground"
                  style={{ fontFamily: FONT, fontSize: "var(--text-label)", borderRadius: "var(--radius-card)" }}
                >
                  Visas som:{" "}
                  <span
                    className="text-foreground"
                    style={{ fontWeight: "var(--font-weight-semibold)" }}
                  >
                    {selectedEmoji} {newPlayerName.trim()}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleAddPlayer}
                  disabled={!newPlayerName.trim()}
                  className="flex-1 py-3 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-label)",
                    fontWeight: "var(--font-weight-semibold)",
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                    borderRadius: "var(--radius-card)",
                  }}
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Lägg till
                </button>
                <button
                  onClick={() => {
                    setShowAddPlayer(false);
                    setNewPlayerName("");
                    setShowEmojiGrid(false);
                    setDuplicateError("");
                  }}
                  className="px-5 py-3 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-label)",
                    borderRadius: "var(--radius-card)",
                  }}
                >
                  Avbryt
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* ── Archived month info banner ── */}
      {isArchivedStatMonth && (
        <div
          className="mt-4 md:mt-6 flex items-start gap-3 px-4 py-3 rounded-lg border border-border"
          style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)" }}
        >
          <Archive className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <span className="text-foreground block" style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" }}>
              Arkiverad statistik
            </span>
            <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>
              Den här månaden har sammanställd statistik — inga detaljerade speltillfällen.
            </span>
          </div>
        </div>
      )}

      {/* ── Recent Sessions — only shown when there are sessions ── */}
      {hasSessions && (<div
        className="mt-8 md:mt-10 rounded-lg border border-border overflow-hidden"
        style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-center justify-between px-3 md:px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span
              className="text-foreground"
              style={{
                fontFamily: FONT,
                fontSize: "var(--text-base)",
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              {selectedMonth === "total"
                ? "Alla speltillfällen"
                : selectedMonth === currentMonth
                ? "Speltillfällen denna månad"
                : `Speltillfällen ${formatMonthLabel(selectedMonth)}`}
            </span>
          </div>
        </div>

        {visibleSessions.length === 0 ? (
          <div
            className="px-4 py-6 text-center text-muted-foreground"
            style={{ fontFamily: FONT, fontSize: "var(--text-base)" }}
          >
            Inga speltillfällen registrerade
          </div>
        ) : (
          <>
            {visibleSessions.map((session) => {
              const isExpanded = expandedSession === session.id;
              return (
                <div key={session.id} className="border-b border-border last:border-b-0">
                  <div
                    className="px-3 md:px-4 py-3 hover:bg-muted/10 active:bg-muted/20 transition-colors cursor-pointer group"
                    onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-foreground"
                            style={{
                              fontFamily: FONT,
                              fontSize: "var(--text-base)",
                              fontWeight: "var(--font-weight-semibold)",
                            }}
                          >
                            {formatRelativeDate(session.date)}
                          </span>
                          <span
                            className="text-muted-foreground"
                            style={{ fontSize: "var(--text-sm)" }}
                          >
                            {session.rounds.length}R · {session.players.length}P{(() => {
                              const hasRosterChanges = session.rounds.some((r) => r.players && r.players.length !== session.players.length);
                              return hasRosterChanges ? " ±" : "";
                            })()}
                          </span>
                        </div>
                        {/* Winner badges for session */}
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {(() => {
                            const winners = session.rounds.map((r) => r.winner);
                            const counts: Record<string, number> = {};
                            for (const w of winners) counts[w] = (counts[w] || 0) + 1;
                            return Object.entries(counts)
                              .sort(([, a], [, b]) => b - a)
                              .slice(0, 3)
                              .map(([name, count]) => (
                                <span
                                  key={name}
                                  className="px-1.5 py-0.5 rounded-full"
                                  style={{
                                    fontSize: "var(--text-xs)",
                                    background: "var(--primary)",
                                    color: "var(--primary-foreground)",
                                    opacity: 0.8,
                                  }}
                                >
                                  {name.split(" ")[0]} ×{count}
                                </span>
                              ));
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeleteSession(session.id);
                          }}
                          className="md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded hover:bg-destructive/20 text-destructive transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded session details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="px-3 md:px-4 pb-3 space-y-1.5"
                          style={{ borderTop: "1px solid var(--border)" }}
                        >
                          <div className="pt-3">
                            <span
                              className="text-muted-foreground"
                              style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                            >
                              {formatSessionDate(session.date)}
                            </span>
                          </div>
                          {session.rounds.map((round, ri) => (
                            <div
                              key={ri}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg"
                              style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                            >
                              <span
                                className="text-muted-foreground w-8 flex flex-col items-center"
                                style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}
                              >
                                <span>R{ri + 1}</span>
                                {round.players && round.players.length !== session.players.length && (
                                  <span style={{ fontSize: "var(--text-xs)", opacity: 0.6 }}>
                                    {round.players.length}P
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-2 flex-1">
                                {round.finalists.map((f) => (
                                  <span
                                    key={f}
                                    className={f === round.winner ? "text-success" : "text-muted-foreground"}
                                    style={{
                                      fontFamily: FONT,
                                      fontSize: "var(--text-label)",
                                      fontWeight:
                                        f === round.winner
                                          ? "var(--font-weight-semibold)"
                                          : "var(--font-weight-normal)",
                                    }}
                                  >
                                    {f === round.winner && "🏆 "}
                                    {f}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                          {/* Session players — participation breakdown */}
                          <div className="pt-2">
                            <span
                              className="text-muted-foreground block mb-1.5"
                              style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT }}
                            >
                              Spelardeltagande
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {(() => {
                                const totalRounds = session.rounds.length;
                                const participation: Record<string, number> = {};
                                for (const p of session.players) participation[p] = 0;
                                session.rounds.forEach((round) => {
                                  const roundPlayers = round.players ?? session.players;
                                  roundPlayers.forEach((p) => {
                                    participation[p] = (participation[p] ?? 0) + 1;
                                  });
                                });
                                return Object.entries(participation)
                                  .sort(([, a], [, b]) => b - a)
                                  .map(([name, count]) => {
                                    const allRounds = count === totalRounds;
                                    return (
                                      <span
                                        key={name}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full border"
                                        style={{
                                          fontFamily: FONT,
                                          fontSize: "var(--text-xs)",
                                          borderColor: allRounds ? "color-mix(in srgb, var(--primary) 30%, var(--border))" : "var(--border)",
                                          background: allRounds ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "var(--surface-container)",
                                          color: allRounds ? "var(--primary)" : "var(--muted-foreground)",
                                          borderRadius: "var(--radius-full, 9999px)",
                                        }}
                                      >
                                        {name}
                                        <span
                                          style={{
                                            fontWeight: "var(--font-weight-semibold)",
                                            opacity: allRounds ? 1 : 0.7,
                                          }}
                                        >
                                          {count}/{totalRounds}
                                        </span>
                                      </span>
                                    );
                                  });
                              })()}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            {recentSessions.length > 5 && (
              <button
                onClick={() => setShowAllSessions(!showAllSessions)}
                className="w-full px-4 py-3 text-center text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
              >
                {showAllSessions ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Visa färre
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Visa alla ({recentSessions.length})
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>)}
      {/* ── Mobile FAB: Ny omgång ── */}
      {isViewingCurrentMonth && (
        <button
          onClick={startRegistration}
          className="md:hidden fixed right-4 bottom-20 z-40 flex items-center gap-2 px-5 h-14 rounded-full transition-all cursor-pointer active:scale-95"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)",
            fontFamily: FONT,
            fontSize: "var(--text-label)",
            fontWeight: "var(--font-weight-semibold)",
          }}
        >
          <Plus className="w-5 h-5" />
          Ny omgång
        </button>
      )}

    </div>
  );
}
