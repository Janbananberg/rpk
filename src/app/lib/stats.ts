import type { GameSession, HistoricalStats, PlayerCards, TournamentHistoryEntry } from "../components/api";
import { ELO_START, weightedDelta } from "./elo";
import type { EloEntry } from "./elo";
import { matchPlayerName, stripEmoji } from "./players";

export type SortTab = "vinster" | "bwp" | "finalprocent" | "vf" | "graf" | "finaler" | "kort" | "elo";

export interface PlayerStats {
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

export function computeStats(sessions: GameSession[], players: string[], historicalStats: HistoricalStats = {}, playerCards: PlayerCards = {}, tournamentHistory: TournamentHistoryEntry[] = []): PlayerStats[] {
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

export function sortStats(stats: PlayerStats[], tab: SortTab, sortDir: "asc" | "desc" = "desc", eloRatings?: Record<string, EloEntry>, monthlyEloDelta?: Record<string, number>, monthlyRoundsPlayed?: Record<string, number>): PlayerStats[] {
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
