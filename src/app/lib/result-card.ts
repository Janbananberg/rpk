import type { GameSession } from "../components/api";
import { replayElo } from "./elo";

// Data for the shareable result card shown after a session is saved. Elo changes come from the
// same replay as everything else, so the card shows exactly what the session did to the ratings.

export interface ResultCardRound {
  winner: string;
  finalist: string;
  winnerDelta: number;
  finalistDelta: number;
}

export interface ResultCardPlayer {
  name: string;
  delta: number;
  elo: number;
  wins: number;
}

export interface ResultCardData {
  date: number;
  playerCount: number;
  rounds: ResultCardRound[];
  /** Most round wins in the session; ties go to the larger Elo gain. */
  winner: ResultCardPlayer | null;
  /** Who the winner beat in the last final they won. */
  finalist: ResultCardPlayer | null;
  /** Every participant, biggest Elo gain first. */
  players: ResultCardPlayer[];
}

export function buildResultCardData(
  session: GameSession,
  sessionsBefore: GameSession[],
  allPlayers: string[],
  eloResetTimestamp: number | null,
): ResultCardData {
  const rounds: ResultCardRound[] = [];
  const delta: Record<string, number> = {};
  const wins: Record<string, number> = {};
  const others = sessionsBefore.filter((s) => s.id !== session.id);

  const ratings = replayElo([...others, session], { eloResetTimestamp, allPlayers }, (step) => {
    if (step.session.id !== session.id) return;
    rounds.push({ winner: step.winner, finalist: step.loser, winnerDelta: step.winnerDelta, finalistDelta: step.loserDelta });
    const participants = new Set([...step.roundPlayers, step.winner, step.loser]);
    for (const p of participants) delta[p] = (delta[p] ?? 0) + step.deltaFor(p);
    wins[step.winner] = (wins[step.winner] ?? 0) + 1;
  });

  const names = new Set([...session.players, ...Object.keys(delta)]);
  const players = Array.from(names)
    .map((name) => ({ name, delta: delta[name] ?? 0, elo: ratings[name], wins: wins[name] ?? 0 }))
    .filter((p) => p.elo !== undefined)
    .sort((a, b) => b.delta - a.delta || a.name.localeCompare(b.name, "sv"));

  const top = [...players].sort((a, b) => b.wins - a.wins || b.delta - a.delta)[0];
  const winner = top && top.wins > 0 ? top : null;
  const lastWon = winner ? [...rounds].reverse().find((r) => r.winner === winner.name) : undefined;

  return {
    date: session.date,
    playerCount: names.size,
    rounds,
    winner,
    finalist: players.find((p) => p.name === lastWon?.finalist) ?? null,
    players,
  };
}
