import type { GameSession } from "../components/api";

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

export function computeElo(sessions: GameSession[], allPlayers?: string[], eloResetTimestamp?: number | null): Record<string, EloEntry> {
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
export function computeEloHistory(sessions: GameSession[], allPlayers?: string[], eloResetTimestamp?: number | null): Record<string, number[]> {
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

/**
 * Compute net Elo exchanged between each pair of players across all finals.
 * Returns a nested map: h2hElo[playerA][playerB] = net Elo that playerA gained from matches vs playerB.
 * This replays the full Elo simulation so deltas reflect the actual ratings at the time of each match.
 */
export function computeH2HElo(sessions: GameSession[], eloResetTimestamp?: number | null): Record<string, Record<string, number>> {
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
