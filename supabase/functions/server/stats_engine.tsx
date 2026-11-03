// ══════════════════════════════════════════════════════════════════════════
//  Stats computation engine — server-side mirror of frontend logic
//  Used by the public /api/stats endpoint
// ══════════════════════════════════════════════════════════════════════════

interface GameRound {
  finalists: [string, string];
  winner: string;
  players?: string[];
}

export interface GameSession {
  id: string;
  date: number;
  players: string[];
  rounds: GameRound[];
}

interface HistoricalPlayerStats {
  wins: number;
  finals: number;
  gamesPlayed: number;
  h2h?: Record<string, { wins: number; losses: number }>;
}

export type HistoricalStats = Record<string, HistoricalPlayerStats>;
export type PlayerCards = Record<string, { yellow: number; red: number }>;

export interface TournamentHistoryEntry {
  id: string;
  champion: string;
  [key: string]: unknown;
}

// ── Helpers ──

function stripEmoji(name: string | null | undefined): string {
  if (!name) return "";
  return name.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f\u{1f3fb}-\u{1f3ff}]+\s*/gu, "").trim();
}

function matchPlayerName(tournamentName: string, highscoreName: string): boolean {
  const tn = tournamentName.toLowerCase().trim();
  const hn = stripEmoji(highscoreName).toLowerCase().trim();
  if (tn === hn) return true;
  if (hn.startsWith(tn) || tn.startsWith(hn)) return true;
  const normalize = (s: string) => s.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
  const ntn = normalize(tn);
  const nhn = normalize(hn);
  if (ntn === nhn) return true;
  if (ntn.length > 4 && nhn.length > 4 && Math.abs(ntn.length - nhn.length) <= 1) {
    let diffs = 0;
    const shorter = ntn.length <= nhn.length ? ntn : nhn;
    const longer = ntn.length <= nhn.length ? nhn : ntn;
    let j = 0;
    for (let i = 0; i < longer.length && j < shorter.length; i++) {
      if (longer[i] !== shorter[j]) {
        diffs++;
        if (longer.length > shorter.length) continue;
      }
      j++;
    }
    diffs += shorter.length - j;
    if (diffs <= 1) return true;
  }
  return false;
}

// ── Elo system ──

const ELO_START = 1000;
const ELO_ANTE = 3;
const ELO_ALPHA = 0.35;
const ELO_UPSET_BONUS = 10;
const ELO_UPSET_THRESHOLD = 100;

interface EloEntry {
  name: string;
  elo: number;
  peakElo: number;
  matches: number;
  delta: number;
}

function computeElo(sessions: GameSession[], allPlayers?: string[], eloResetTimestamp?: number | null): Record<string, EloEntry> {
  const ratings: Record<string, { elo: number; peak: number; matches: number; delta: number }> = {};
  const ensure = (name: string) => {
    if (!ratings[name]) ratings[name] = { elo: ELO_START, peak: ELO_START, matches: 0, delta: 0 };
  };
  if (allPlayers) for (const p of allPlayers) ensure(p);

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
      for (const player of roundPlayers) {
        ensure(player);
        ratings[player].delta = -ELO_ANTE;
        ratings[player].matches++;
      }
      const rWinner = ratings[winner].elo;
      const rLoser = ratings[loser].elo;
      const pot = N * ELO_ANTE;
      const eWinner = 1 / (1 + Math.pow(10, (rLoser - rWinner) / 400));
      let winnerShare = pot * (0.5 + ELO_ALPHA * (1 - eWinner));
      let loserShare = pot - winnerShare;
      const minShare = ELO_ANTE + 1;
      if (loserShare < minShare) { loserShare = minShare; winnerShare = pot - loserShare; }
      const eloDiff = rLoser - rWinner;
      const isUpset = eloDiff >= ELO_UPSET_THRESHOLD;
      const upsetBonus = isUpset ? Math.floor(eloDiff / ELO_UPSET_THRESHOLD) * ELO_UPSET_BONUS : 0;
      const winnerDelta = Math.round(winnerShare - ELO_ANTE) + upsetBonus;
      const loserDelta = Math.round(loserShare - ELO_ANTE);

      for (const player of roundPlayers) {
        if (player !== winner && player !== loser) ratings[player].elo -= ELO_ANTE;
      }
      ratings[winner].elo += winnerDelta;
      ratings[winner].delta = winnerDelta;
      ratings[loser].elo += loserDelta;
      ratings[loser].delta = loserDelta;
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

// ── Player insights (weekday, time, crowd) ──

const WEEKDAY_NAMES_SV = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];

function toLuleaDate(ts: number): Date {
  const d = new Date(ts);
  // Convert to Europe/Stockholm (Luleå) timezone
  const str = d.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" });
  return new Date(str);
}

interface PlayerInsights {
  bestWeekday: { day: string; winRate: number } | null;
  worstWeekday: { day: string; winRate: number } | null;
  beforeLunch: { wins: number; finals: number; games: number; winRate: number };
  afterLunch: { wins: number; finals: number; games: number; winRate: number };
  timePreference: "morning" | "afternoon" | "none";
  peakHourLabel: string | null;
  sessionCount: number;
  crowdPreference: "extrovert" | "introvert" | "none";
  largeCrowd: { wins: number; games: number; winRate: number };
  smallCrowd: { wins: number; games: number; winRate: number };
  medianPlayerCount: number;
}

function computePlayerInsights(playerName: string, sessions: GameSession[]): PlayerInsights {
  const wd = Array.from({ length: 7 }, (_, i) => ({ day: WEEKDAY_NAMES_SV[i], wins: 0, finals: 0, games: 0, winRate: 0 }));
  const beforeLunch = { wins: 0, finals: 0, games: 0, winRate: 0 };
  const afterLunch = { wins: 0, finals: 0, games: 0, winRate: 0 };
  const hourBuckets: Record<string, number> = {};
  let sessionCount = 0;

  const strippedTarget = stripEmoji(playerName).trim();
  const nameMatches = (n: string | null | undefined) => !!n && (n === playerName || stripEmoji(n).trim() === strippedTarget);

  for (const session of sessions) {
    const inPlayers = session.players.some(nameMatches);
    const inRounds = session.rounds.some((r) => r.finalists.some(nameMatches) || nameMatches(r.winner) || (r.players && r.players.some(nameMatches)));
    if (!inPlayers && !inRounds) continue;
    sessionCount++;
    const lDate = toLuleaDate(session.date);
    const dayIdx = lDate.getDay();
    const hour = lDate.getHours();
    const isBeforeLunch = hour < 12;
    const bucketStart = Math.floor(hour / 2) * 2;
    const bucketLabel = `${String(bucketStart).padStart(2, "0")}:00–${String(bucketStart + 2).padStart(2, "0")}:00`;
    hourBuckets[bucketLabel] = (hourBuckets[bucketLabel] || 0) + 1;

    for (const round of session.rounds) {
      const isFinalist = round.finalists.some(nameMatches);
      const isWinner = nameMatches(round.winner);
      if (!isFinalist && !isWinner) continue;
      wd[dayIdx].games++;
      if (isFinalist) wd[dayIdx].finals++;
      if (isWinner) wd[dayIdx].wins++;
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

  for (const d of wd) d.winRate = d.games > 0 ? (d.wins / d.games) * 100 : 0;
  beforeLunch.winRate = beforeLunch.games > 0 ? (beforeLunch.wins / beforeLunch.games) * 100 : 0;
  afterLunch.winRate = afterLunch.games > 0 ? (afterLunch.wins / afterLunch.games) * 100 : 0;

  const qualifiedDays = wd.filter((d) => d.games >= 2);
  const bestWeekday = qualifiedDays.length > 0
    ? (() => { const b = [...qualifiedDays].sort((a, b) => b.winRate - a.winRate)[0]; return { day: b.day, winRate: b.winRate }; })()
    : null;
  const worstWeekday = qualifiedDays.length > 1
    ? (() => { const w = [...qualifiedDays].sort((a, b) => a.winRate - b.winRate)[0]; return { day: w.day, winRate: w.winRate }; })()
    : null;

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

  const peakHourLabel = Object.keys(hourBuckets).length > 0
    ? Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0][0]
    : null;

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
    if (diff > 5 && largeCrowd.winRate >= 5) crowdPreference = "extrovert";
    else if (diff < -5 && smallCrowd.winRate >= 5) crowdPreference = "introvert";
  } else if (largeCrowd.games >= 2 && largeCrowd.winRate >= 5) {
    crowdPreference = "extrovert";
  } else if (smallCrowd.games >= 2 && smallCrowd.winRate >= 5) {
    crowdPreference = "introvert";
  }

  return { bestWeekday, worstWeekday, beforeLunch, afterLunch, timePreference, peakHourLabel, sessionCount, crowdPreference, largeCrowd, smallCrowd, medianPlayerCount: CROWD_THRESHOLD };
}

// ── Main: compute full stats for all players ──

export interface PlayerStatsResult {
  name: string;
  elo: number;
  peakElo: number;
  eloDelta: number;
  wins: number;
  finals: number;
  gamesPlayed: number;
  winPct: number;
  finalPct: number;
  finalWinPct: number;
  currentStreak: number;
  bestStreak: number;
  coldStreak: number;
  worstColdStreak: number;
  recentForm: string[];
  nemesis: string | null;
  prey: string | null;
  h2h: Record<string, { wins: number; losses: number }>;
  yellowCards: number;
  redCards: number;
  tournamentWins: number;
  insights: PlayerInsights;
}

export function computeAllStats(
  sessions: GameSession[],
  allSessions: GameSession[],
  players: string[],
  historicalStats: HistoricalStats,
  playerCards: PlayerCards,
  tournamentHistory: TournamentHistoryEntry[],
  eloResetTimestamp: number | null,
): PlayerStatsResult[] {
  // Elo from ALL sessions
  const eloRatings = computeElo(allSessions, players, eloResetTimestamp);

  // Stats from filtered sessions
  const statsMap: Record<string, {
    wins: number; finals: number; gamesPlayed: number;
    results: { date: number; result: "W" | "L" | "F" }[];
    h2h: Record<string, { wins: number; losses: number }>;
  }> = {};

  for (const p of players) statsMap[p] = { wins: 0, finals: 0, gamesPlayed: 0, results: [], h2h: {} };

  const sortedSessions = [...sessions].sort((a, b) => a.date - b.date);
  for (const session of sortedSessions) {
    const participantSet = new Set(session.players);
    for (const round of session.rounds) {
      for (const f of round.finalists) participantSet.add(f);
      if (round.winner) participantSet.add(round.winner);
    }
    const allParticipants = Array.from(participantSet);

    for (const round of session.rounds) {
      const roundParticipants = round.players ?? allParticipants;
      for (const p of roundParticipants) {
        if (!statsMap[p]) statsMap[p] = { wins: 0, finals: 0, gamesPlayed: 0, results: [], h2h: {} };
        statsMap[p].gamesPlayed++;
        const isFinalist = round.finalists.includes(p);
        const isWinner = round.winner === p;
        if (isFinalist) statsMap[p].finals++;
        if (isWinner) statsMap[p].wins++;
        if (isWinner) statsMap[p].results.push({ date: session.date, result: "W" });
        else if (isFinalist) statsMap[p].results.push({ date: session.date, result: "F" });
        else statsMap[p].results.push({ date: session.date, result: "L" });

        if (isFinalist) {
          const opponent = round.finalists.find((f) => f !== p);
          if (opponent) {
            if (!statsMap[p].h2h[opponent]) statsMap[p].h2h[opponent] = { wins: 0, losses: 0 };
            if (isWinner) statsMap[p].h2h[opponent].wins++;
            else statsMap[p].h2h[opponent].losses++;
          }
        }
      }
    }
  }

  // Merge emoji variants
  const playerSet = new Set(players);
  const strippedToCanonical: Record<string, string> = {};
  for (const cp of players) strippedToCanonical[stripEmoji(cp).trim()] = cp;
  for (const [name, s] of Object.entries(statsMap)) {
    if (s.gamesPlayed > 0 && !playerSet.has(name)) {
      const stripped = stripEmoji(name).trim();
      const canonical = strippedToCanonical[stripped];
      if (canonical && canonical !== name) {
        const target = statsMap[canonical];
        target.wins += s.wins;
        target.finals += s.finals;
        target.gamesPlayed += s.gamesPlayed;
        target.results.push(...s.results);
        target.results.sort((a, b) => a.date - b.date);
        for (const [opp, record] of Object.entries(s.h2h)) {
          if (!target.h2h[opp]) target.h2h[opp] = { wins: 0, losses: 0 };
          target.h2h[opp].wins += record.wins;
          target.h2h[opp].losses += record.losses;
        }
        s.gamesPlayed = 0; s.wins = 0; s.finals = 0;
      } else if (!canonical) {
        playerSet.add(name);
        strippedToCanonical[stripped] = name;
      }
    }
  }

  const allRelevant = new Set([...players, ...Object.keys(statsMap).filter((n) => statsMap[n].gamesPlayed > 0)]);

  return Object.entries(statsMap).filter(([name]) => allRelevant.has(name)).map(([name, s]) => {
    // Streaks
    let currentStreak = 0, bestStreak = 0, tempStreak = 0;
    const finalResults = s.results.filter((r) => r.result === "W" || r.result === "F");
    for (let i = finalResults.length - 1; i >= 0; i--) {
      if (finalResults[i].result === "W") { if (i === finalResults.length - 1 || currentStreak > 0) currentStreak++; }
      else break;
    }
    for (const r of finalResults) {
      if (r.result === "W") { tempStreak++; bestStreak = Math.max(bestStreak, tempStreak); }
      else tempStreak = 0;
    }
    let coldStreak = 0;
    for (let i = finalResults.length - 1; i >= 0; i--) {
      if (finalResults[i].result === "F") { if (i === finalResults.length - 1 || coldStreak > 0) coldStreak++; }
      else break;
    }
    let worstColdStreak = 0, tempCold = 0;
    for (const r of finalResults) {
      if (r.result === "F") { tempCold++; worstColdStreak = Math.max(worstColdStreak, tempCold); }
      else tempCold = 0;
    }
    const recentForm = s.results.filter((r) => r.result === "W" || r.result === "F").slice(-5).map((r) => r.result);

    // Nemesis / prey
    const hist = historicalStats[name] || { wins: 0, finals: 0, gamesPlayed: 0 };
    const mergedH2H = { ...s.h2h };
    if (hist.h2h) {
      for (const [opp, record] of Object.entries(hist.h2h)) {
        if (!mergedH2H[opp]) mergedH2H[opp] = { wins: 0, losses: 0 };
        mergedH2H[opp].wins += record.wins;
        mergedH2H[opp].losses += record.losses;
      }
    }
    let nemesis: string | null = null, nemesisLosses = 0;
    let prey: string | null = null, preyWins = 0;
    for (const [opp, record] of Object.entries(mergedH2H)) {
      if (record.losses > nemesisLosses) { nemesisLosses = record.losses; nemesis = opp; }
      if (record.wins > preyWins) { preyWins = record.wins; prey = opp; }
    }

    const totalWins = s.wins + hist.wins;
    const totalFinals = s.finals + hist.finals;
    const totalGP = s.gamesPlayed + hist.gamesPlayed;

    const eloEntry = eloRatings[name] || { elo: ELO_START, peakElo: ELO_START, delta: 0 };
    const insights = computePlayerInsights(stripEmoji(name), sessions);

    return {
      name: stripEmoji(name),
      elo: eloEntry.elo,
      peakElo: eloEntry.peakElo,
      eloDelta: eloEntry.delta,
      wins: totalWins,
      finals: totalFinals,
      gamesPlayed: totalGP,
      winPct: totalGP > 0 ? Math.round((totalWins / totalGP) * 1000) / 10 : 0,
      finalPct: totalGP > 0 ? Math.round((totalFinals / totalGP) * 1000) / 10 : 0,
      finalWinPct: totalFinals > 0 ? Math.round((totalWins / totalFinals) * 1000) / 10 : 0,
      currentStreak,
      bestStreak,
      coldStreak,
      worstColdStreak,
      recentForm,
      nemesis: nemesis ? stripEmoji(nemesis) : null,
      prey: prey ? stripEmoji(prey) : null,
      h2h: Object.fromEntries(
        Object.entries(mergedH2H)
          .filter(([, r]) => r.wins + r.losses > 0)
          .map(([opp, r]) => [stripEmoji(opp), r])
      ),
      yellowCards: playerCards[name]?.yellow || 0,
      redCards: playerCards[name]?.red || 0,
      tournamentWins: tournamentHistory.filter((t) => matchPlayerName(t.champion, name)).length,
      insights,
    };
  }).filter((p) => p.gamesPlayed > 0).sort((a, b) => b.elo - a.elo);
}
