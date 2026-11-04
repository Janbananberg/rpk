/**
 * The public statistics API (GET /api/stats). Built on the same functions as the highscore
 * page, so the numbers here are the ones the app shows — Elo with inactivity decay included.
 */
import type { GameSession, HistoricalStats, PlayerCards, TournamentHistoryEntry } from "../src/app/components/api";
import { applyEloDecay, computeElo, computeLastPlayed, ELO_START } from "../src/app/lib/elo";
import { computePlayerInsights } from "../src/app/lib/insights";
import { stripEmoji } from "../src/app/lib/players";
import { computeStats } from "../src/app/lib/stats";

export interface StatsInput {
  players: string[];
  sessionsByMonth: Record<string, GameSession[]>;
  historicalStats: HistoricalStats;
  playerCards: PlayerCards;
  tournamentHistory: TournamentHistoryEntry[];
  eloResetTimestamp: number | null;
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

/** Stats for one month ("YYYY-MM") or for all time ("total"). Elo always counts every session. */
export function computePublicStats(month: string, input: StatsInput) {
  const allSessions = Object.values(input.sessionsByMonth).flat();
  const sessions = month === "total" ? allSessions : (input.sessionsByMonth[month] ?? []);

  const elo = applyEloDecay(
    computeElo(allSessions, input.players, input.eloResetTimestamp),
    computeLastPlayed(allSessions),
    input.eloResetTimestamp,
  );

  return computeStats(sessions, input.players, input.historicalStats, input.playerCards, input.tournamentHistory)
    .filter((s) => s.gamesPlayed > 0)
    .map((s) => {
      const entry = elo[s.name] ?? { elo: ELO_START, peakElo: ELO_START, delta: 0 };
      return {
        name: stripEmoji(s.name),
        elo: entry.elo,
        peakElo: entry.peakElo,
        eloDelta: entry.delta,
        wins: s.wins,
        finals: s.finals,
        gamesPlayed: s.gamesPlayed,
        winPct: pct(s.wins, s.gamesPlayed),
        finalPct: pct(s.finals, s.gamesPlayed),
        finalWinPct: pct(s.wins, s.finals),
        currentStreak: s.currentStreak,
        bestStreak: s.bestStreak,
        coldStreak: s.coldStreak,
        worstColdStreak: s.worstColdStreak,
        recentForm: s.recentForm,
        nemesis: s.nemesis ? stripEmoji(s.nemesis) : null,
        prey: s.prey ? stripEmoji(s.prey) : null,
        h2h: Object.fromEntries(Object.entries(s.h2h).map(([opponent, record]) => [stripEmoji(opponent), record])),
        yellowCards: s.yellowCards,
        redCards: s.redCards,
        tournamentWins: s.tournamentWins,
        insights: computePlayerInsights(stripEmoji(s.name), sessions),
      };
    })
    .sort((a, b) => b.elo - a.elo);
}
