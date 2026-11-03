import type { GameRound, GameSession } from "../components/api";

// ── Elo Rating System — "Elo-potten" ──
// Each player antes 3 Elo into a shared pot (N × 3).
// The two finalists split the pot — winner takes a bigger share, loser a smaller one.
// The split is determined by the Elo difference (expected score) between the finalists.
// Non-finalists lose their ante. The system is zero-sum.
// α = 0.35 controls how much the split favors the winner vs loser.
// Floor: each finalist always receives at least ante + 1 (guaranteed net +1).
export const ELO_START = 1000;
export const ELO_ANTE = 3;
export const ELO_ALPHA = 0.35;
export const ELO_UPSET_BONUS = 10;
export const ELO_UPSET_THRESHOLD = 100;
export const SEED_MIN_ROUNDS = 30;

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

export interface EloEntry {
  name: string;
  elo: number;
  peakElo: number;
  matches: number; // number of rounds participated in
  delta: number; // change from last round
}

export const ELO_DECAY_PER_DAY = 15;
export const ELO_DECAY_MIN = 700;
export const INACTIVE_THRESHOLD_MS = 4 * 7 * 24 * 60 * 60 * 1000; // 4 weeks
// Fallback "registered since" date for decay — players who never played
// get decay calculated from this date instead of being exempt.
export const ELO_DECAY_BASELINE_DATE = new Date("2026-02-01T00:00:00Z").getTime();

export function computeLastPlayed(sessions: GameSession[]): Record<string, number> {
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

export function applyEloDecay(ratings: Record<string, EloEntry>, lastPlayed: Record<string, number>, eloResetTimestamp?: number | null): Record<string, EloEntry> {
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

/** One played round, as seen by `replayElo` after the round's Elo changes have been applied. */
export interface EloRoundStep {
  session: GameSession;
  round: GameRound;
  /** Everyone who paid the ante this round. */
  roundPlayers: string[];
  winner: string;
  loser: string;
  /** Finalists' ratings before the round. */
  rWinner: number;
  rLoser: number;
  winnerDelta: number;
  loserDelta: number;
  /** Elo change for any participant this round. */
  deltaFor: (player: string) => number;
  /** Ratings after the round. Shared and mutated by the replay — copy before keeping. */
  ratings: Readonly<Record<string, number>>;
}

export interface ReplayOptions {
  /** Elo reset point. Sessions before it are skipped unless `keepHistoryBeforeReset` is set. */
  eloResetTimestamp?: number | null;
  /** Replay sessions before the reset too, and put everyone back to the start rating at the reset. */
  keepHistoryBeforeReset?: boolean;
  /** Players who start at the start rating even without having played. */
  allPlayers?: string[];
}

/**
 * Replays the Elo pot system over all sessions in date order. Every Elo computation in the app
 * goes through here, so the rules live in one place. Return `true` from `onRound` to stop early.
 */
export function replayElo(
  sessions: GameSession[],
  options: ReplayOptions = {},
  onRound?: (step: EloRoundStep) => boolean | void,
): Record<string, number> {
  const { eloResetTimestamp, keepHistoryBeforeReset = false, allPlayers } = options;
  const ratings: Record<string, number> = {};
  const ensure = (name: string) => {
    if (ratings[name] === undefined) ratings[name] = ELO_START;
  };
  if (allPlayers) for (const player of allPlayers) ensure(player);

  const sorted = [...sessions].sort((a, b) => a.date - b.date);
  let resetApplied = !eloResetTimestamp;

  for (const session of sorted) {
    if (!resetApplied && session.date >= eloResetTimestamp!) {
      for (const name of Object.keys(ratings)) ratings[name] = ELO_START;
      resetApplied = true;
    }
    if (!resetApplied && !keepHistoryBeforeReset) continue;

    for (const player of session.players) ensure(player);

    for (const round of session.rounds) {
      if (round.finalists.length !== 2 || !round.winner) continue;
      const roundPlayers = round.players ?? session.players;
      const [p1, p2] = round.finalists;
      const winner = round.winner;
      const loser = winner === p1 ? p2 : p1;

      // Finalists may be missing from the player lists in older data — they still need a rating.
      for (const player of roundPlayers) ensure(player);
      ensure(winner);
      ensure(loser);

      const rWinner = ratings[winner];
      const rLoser = ratings[loser];
      const { winnerDelta, loserDelta } = computePotDistribution(rWinner, rLoser, roundPlayers.length);

      for (const player of roundPlayers) {
        if (player !== winner && player !== loser) ratings[player] -= ELO_ANTE;
      }
      ratings[winner] += winnerDelta;
      ratings[loser] += loserDelta;

      if (onRound) {
        const deltaFor = (player: string) =>
          player === winner ? winnerDelta : player === loser ? loserDelta : roundPlayers.includes(player) ? -ELO_ANTE : 0;
        const stop = onRound({ session, round, roundPlayers, winner, loser, rWinner, rLoser, winnerDelta, loserDelta, deltaFor, ratings });
        if (stop === true) return ratings;
      }
    }
  }
  return ratings;
}

/** Participants of a round, including finalists missing from the round's player list. */
function roundParticipants(step: EloRoundStep): string[] {
  const list = [...step.roundPlayers];
  if (!list.includes(step.winner)) list.push(step.winner);
  if (!list.includes(step.loser)) list.push(step.loser);
  return list;
}

export function computeElo(sessions: GameSession[], allPlayers?: string[], eloResetTimestamp?: number | null): Record<string, EloEntry> {
  const extra: Record<string, { peak: number; matches: number; delta: number }> = {};
  const get = (name: string) => (extra[name] ??= { peak: ELO_START, matches: 0, delta: 0 });

  const ratings = replayElo(sessions, { eloResetTimestamp, allPlayers }, (step) => {
    for (const player of step.roundPlayers) get(player).matches++;
    for (const player of roundParticipants(step)) {
      const e = get(player);
      e.delta = step.deltaFor(player);
      e.peak = Math.max(e.peak, step.ratings[player]);
    }
  });

  const result: Record<string, EloEntry> = {};
  for (const [name, elo] of Object.entries(ratings)) {
    const e = get(name);
    result[name] = { name, elo, peakElo: e.peak, matches: e.matches, delta: e.delta };
  }
  return result;
}

// ── Elo History (sparkline data) ──
export function computeEloHistory(sessions: GameSession[], allPlayers?: string[], eloResetTimestamp?: number | null): Record<string, number[]> {
  const history: Record<string, number[]> = {};
  const ratings = replayElo(sessions, { eloResetTimestamp, allPlayers }, (step) => {
    for (const player of roundParticipants(step)) {
      (history[player] ??= [ELO_START]).push(step.ratings[player]);
    }
  });
  for (const name of Object.keys(ratings)) history[name] ??= [ELO_START];
  return history;
}

/** Net Elo each player has won or lost against each opponent in finals */
export function computeH2HElo(sessions: GameSession[], eloResetTimestamp?: number | null): Record<string, Record<string, number>> {
  const netElo: Record<string, Record<string, number>> = {};
  const ratings = replayElo(sessions, { eloResetTimestamp }, ({ winner, loser, winnerDelta, loserDelta }) => {
    const w = (netElo[winner] ??= {});
    const l = (netElo[loser] ??= {});
    w[loser] = (w[loser] ?? 0) + winnerDelta;
    l[winner] = (l[winner] ?? 0) + loserDelta;
  });
  for (const name of Object.keys(ratings)) netElo[name] ??= {};
  return netElo;
}

// ── Tournament Elo (no decay, no peak) and head-to-head records ──
// Used by the tournament bracket for win probabilities and Tale of the Tape.
// Shares constants and pot distribution with computeElo above.

export interface EloRating {
  name: string;
  elo: number;
  matches: number;
}

export function computeEloRatings(sessions: GameSession[], eloResetTimestamp?: number | null): Record<string, EloRating> {
  const matches: Record<string, number> = {};
  const ratings = replayElo(sessions, { eloResetTimestamp }, ({ roundPlayers }) => {
    for (const player of roundPlayers) matches[player] = (matches[player] ?? 0) + 1;
  });
  const result: Record<string, EloRating> = {};
  for (const [name, elo] of Object.entries(ratings)) {
    result[name] = { name, elo, matches: matches[name] ?? 0 };
  }
  return result;
}

export function eloWinProbability(elo1: number, elo2: number): number {
  return 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
}

/** Head-to-head record between two players */
export interface H2HRecord {
  wins1: number;
  wins2: number;
  total: number;
}

export function computeH2H(sessions: GameSession[], p1: string, p2: string): H2HRecord {
  let wins1 = 0, wins2 = 0;
  for (const session of sessions) {
    for (const round of session.rounds) {
      if (round.finalists.length !== 2 || !round.winner) continue;
      const has1 = round.finalists.includes(p1);
      const has2 = round.finalists.includes(p2);
      if (has1 && has2) {
        if (round.winner === p1) wins1++;
        else if (round.winner === p2) wins2++;
      }
    }
  }
  return { wins1, wins2, total: wins1 + wins2 };
}

/** Compute H2H for all player pairs */
export function computeAllH2H(sessions: GameSession[], players: string[]): Record<string, H2HRecord> {
  const map: Record<string, H2HRecord> = {};
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const key = `${players[i]}:${players[j]}`;
      map[key] = computeH2H(sessions, players[i], players[j]);
    }
  }
  return map;
}

export function getH2H(map: Record<string, H2HRecord>, p1: string, p2: string): H2HRecord {
  const key1 = `${p1}:${p2}`;
  if (map[key1]) return map[key1];
  const key2 = `${p2}:${p1}`;
  if (map[key2]) return { wins1: map[key2].wins2, wins2: map[key2].wins1, total: map[key2].total };
  return { wins1: 0, wins2: 0, total: 0 };
}
