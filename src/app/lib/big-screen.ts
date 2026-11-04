import type { GameSession } from "../components/api";
import { ELO_START, applyEloDecay, computeElo, computeLastPlayed, replayElo } from "./elo";
import { generateFunFacts } from "./insights";
import { computePlayerPercentile, getCSGORank } from "./rank";
import type { CSGORank } from "./rank";
import { computeStats, sortStats } from "./stats";

// Read-only view model for the office TV (/storbild). Uses the same Elo, stats and fun-fact
// functions as the highscore page so the numbers on the TV match the app.

export interface BigScreenLeader {
  name: string;
  elo: number;
  /** Elo change this month, null when the month has no sessions. */
  monthDelta: number | null;
  wins: number;
  gamesPlayed: number;
  rank: CSGORank;
}

export interface BigScreenRound {
  winner: string;
  loser: string;
  winnerDelta: number;
  loserDelta: number;
  /** Rating gap the winner overcame (positive = underdog won). */
  eloGap: number;
}

export interface BigScreenUpset {
  winner: string;
  loser: string;
  eloGap: number;
  date: number;
}

export interface BigScreenStreak {
  name: string;
  streak: number;
}

export interface BigScreenData {
  month: string;
  /** True when the leaderboard is based on this month's sessions, false when it falls back to all-time Elo. */
  leaderboardIsMonthly: boolean;
  leaderboard: BigScreenLeader[];
  latestSession: { date: number; playerCount: number; rounds: BigScreenRound[] } | null;
  biggestUpset: BigScreenUpset | null;
  hotStreaks: BigScreenStreak[];
  coldStreaks: BigScreenStreak[];
  funFacts: string[];
  monthTotals: { rounds: number; sessions: number; players: number };
}

function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function computeBigScreenData(
  sessionsByMonth: Record<string, GameSession[]>,
  players: string[],
  eloResetTimestamp: number | null,
  month: string,
  leaderboardSize = 8,
): BigScreenData {
  const allSessions = Object.values(sessionsByMonth).flat();
  const monthSessions = sessionsByMonth[month] ?? [];

  // Elo exactly as the highscore page computes it: all sessions, then inactivity decay.
  const lastPlayed = computeLastPlayed(allSessions);
  const eloRatings = applyEloDecay(computeElo(allSessions, players, eloResetTimestamp), lastPlayed, eloResetTimestamp);
  const allElos = Object.values(eloRatings).map((e) => e.elo);
  const rankOf = (name: string) => getCSGORank(computePlayerPercentile(eloRatings[name]?.elo ?? ELO_START, allElos));

  // Monthly Elo delta and rounds, same definition as the page's month view.
  const [y, m] = month.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1).getTime();
  const monthEnd = new Date(y, m, 1).getTime();
  const before = allSessions.filter((s) => s.date < monthStart);
  const during = allSessions.filter((s) => s.date >= monthStart && s.date < monthEnd);
  let monthlyDelta: Record<string, number> | undefined;
  let monthlyRounds: Record<string, number> | undefined;
  if (during.length > 0) {
    const eloBefore = computeElo(before, players, eloResetTimestamp);
    const eloAfter = computeElo([...before, ...during], players, eloResetTimestamp);
    monthlyDelta = {};
    for (const name of new Set([...Object.keys(eloBefore), ...Object.keys(eloAfter)])) {
      monthlyDelta[name] = (eloAfter[name]?.elo ?? ELO_START) - (eloBefore[name]?.elo ?? ELO_START);
    }
    monthlyRounds = {};
    for (const session of during) {
      const participants = new Set(session.players);
      for (const round of session.rounds) {
        for (const f of round.finalists) participants.add(f);
        if (round.winner) participants.add(round.winner);
      }
      for (const p of participants) monthlyRounds[p] = (monthlyRounds[p] ?? 0) + session.rounds.length;
    }
  }

  const monthStats = computeStats(monthSessions, players);
  const leaderboardIsMonthly = monthlyDelta !== undefined;
  const leaderboard = (leaderboardIsMonthly
    ? sortStats(monthStats, "elo", "desc", eloRatings, monthlyDelta, monthlyRounds).filter((s) => s.gamesPlayed > 0)
    : sortStats(computeStats(allSessions, players), "elo", "desc", eloRatings).filter((s) => (eloRatings[s.name]?.matches ?? 0) > 0)
  )
    .slice(0, leaderboardSize)
    .map((s) => ({
      name: s.name,
      elo: eloRatings[s.name]?.elo ?? ELO_START,
      monthDelta: monthlyDelta ? monthlyDelta[s.name] ?? 0 : null,
      wins: s.wins,
      gamesPlayed: s.gamesPlayed,
      rank: rankOf(s.name),
    }));

  // Latest session and this month's biggest upset, read off a single Elo replay.
  const latest = allSessions.reduce<GameSession | null>((acc, s) => (!acc || s.date > acc.date ? s : acc), null);
  const latestRounds: BigScreenRound[] = [];
  let biggestUpset: BigScreenUpset | null = null;
  replayElo(allSessions, { eloResetTimestamp, allPlayers: players }, (step) => {
    const eloGap = step.rLoser - step.rWinner;
    if (latest && step.session.id === latest.id) {
      latestRounds.push({ winner: step.winner, loser: step.loser, winnerDelta: step.winnerDelta, loserDelta: step.loserDelta, eloGap });
    }
    if (monthKey(step.session.date) === month && eloGap > 0 && (!biggestUpset || eloGap > biggestUpset.eloGap)) {
      biggestUpset = { winner: step.winner, loser: step.loser, eloGap, date: step.session.date };
    }
  });

  // Streaks run across month boundaries, so they are read from all sessions.
  const allStats = computeStats(allSessions, players);
  const hotStreaks = allStats
    .filter((s) => s.currentStreak >= 2)
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .slice(0, 4)
    .map((s) => ({ name: s.name, streak: s.currentStreak }));
  const coldStreaks = allStats
    .filter((s) => s.coldStreak >= 2)
    .sort((a, b) => b.coldStreak - a.coldStreak)
    .slice(0, 4)
    .map((s) => ({ name: s.name, streak: s.coldStreak }));

  const prevKey = previousMonth(month);
  const prevSessions = sessionsByMonth[prevKey] ?? [];
  const prevMonthStats = prevSessions.length > 0 ? computeStats(prevSessions, players) : undefined;

  const monthPlayers = new Set<string>();
  for (const s of monthSessions) for (const p of s.players) monthPlayers.add(p);

  return {
    month,
    leaderboardIsMonthly,
    leaderboard,
    latestSession: latest ? { date: latest.date, playerCount: latest.players.length, rounds: latestRounds } : null,
    biggestUpset,
    hotStreaks,
    coldStreaks,
    funFacts: generateFunFacts(monthStats, monthSessions, prevMonthStats),
    monthTotals: {
      rounds: monthSessions.reduce((acc, s) => acc + s.rounds.length, 0),
      sessions: monthSessions.length,
      players: monthPlayers.size,
    },
  };
}
