import type { GameSession } from "../components/api";
import { computeElo, replayElo } from "./elo";
import { stripEmoji } from "./players";
import type { PlayerStats } from "./stats";
import { toLuleaDate, WEEKDAY_NAMES_SV, WEEKDAY_SHORT_SV } from "./dates";

// ── Revenge Meter ──
export interface RevengeTarget {
  opponent: string;
  lastLossDate: number;
  lossStreak: number; // consecutive losses at the end
  totalLosses: number;
  totalWins: number;
}

export function computeRevengeData(playerName: string, sessions: GameSession[]): RevengeTarget[] {
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
export interface SeasonSummary {
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

export function computeSeasonSummary(
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
  // Replay Elo up to and through the month, so each final is judged on the ratings at the time.
  const monthSessions = new Set(sessions);
  const sortedSessions = [...sessions].sort((a, b) => a.date - b.date);
  replayElo([...allSessionsBeforeMonth, ...sessions], { eloResetTimestamp }, ({ session, winner, loser, rWinner, rLoser }) => {
    if (!monthSessions.has(session)) return;
    const diff = rLoser - rWinner; // positive = underdog won
    if (diff > 0 && (!biggestUpset || diff > biggestUpset.eloDiff)) {
      biggestUpset = { winner, loser, eloDiff: diff, date: session.date };
    }
  });

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
    const d = toLuleaDate(s.date);
    const dayName = dayNames[d.getDay()];
    dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
  }
  for (const [day, count] of Object.entries(dayCounts)) {
    if (!busiestDay || count > busiestDay.count) busiestDay = { day, count };
  }

  const avgFinalsPerSession = sessions.length > 0 ? Math.round((totalFinals / sessions.length) * 10) / 10 : 0;

  return { month, monthLabel, totalGames, totalFinals, totalSessions: sessions.length, mvp, mostImproved, biggestUpset, superlatives, longestWinStreak, rivalry, biggestDrop, busiestDay, avgFinalsPerSession };
}

// ── Fun Facts Generator ──
export function generateFunFacts(
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
    const day = toLuleaDate(session.date).getDay();
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

export interface PlayerInsights {
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

export function computePlayerInsights(playerName: string, sessions: GameSession[]): PlayerInsights {
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
export interface H2HInsight {
  weekdays: { day: string; dayShort: string; dayIndex: number; p1Wins: number; p2Wins: number; total: number }[];
  beforeLunch: { p1Wins: number; p2Wins: number; total: number };
  afterLunch: { p1Wins: number; p2Wins: number; total: number };
  p1BestContext: string | null;
  p2BestContext: string | null;
  totalMeetings: number;
}

export function computeH2HInsights(p1Name: string, p2Name: string, sessions: GameSession[]): H2HInsight {
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
