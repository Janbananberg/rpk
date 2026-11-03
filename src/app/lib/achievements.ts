import type { GameSession, SavedAchievement, SavedPlayerAchievements } from "../components/api";
import { replayElo } from "./elo";
import { toLuleaDate } from "./dates";
import type { EloEntry } from "./elo";
import { stripEmoji } from "./players";
import type { PlayerStats } from "./stats";

// ── Achievement System ──
export type AchievementRarity = "common" | "uncommon" | "rare" | "legendary" | "mythic";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  rarity: AchievementRarity;
  unlockedAt?: number; // timestamp when first unlocked (permanent)
  isNew?: boolean; // true if just unlocked this session
}

export interface AchievementCheck {
  achievement: Achievement;
  check: (p: PlayerStats, ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  sessions: GameSession[];
  eloEntry: EloEntry | null;
  eloRatings: Record<string, EloEntry>;
  allStats: PlayerStats[];
  eloResetTimestamp?: number | null;
}

/** Count how many sessions a player participated in */
export function countPlayerSessions(playerName: string, sessions: GameSession[]): number {
  const stripped = stripEmoji(playerName).toLowerCase().trim();
  return sessions.filter((s) =>
    s.players.some((p) => stripEmoji(p).toLowerCase().trim() === stripped) ||
    s.rounds.some((r) => r.finalists.some((f) => stripEmoji(f).toLowerCase().trim() === stripped))
  ).length;
}

/** Get sessions a specific player participated in */
export function getPlayerSessions(playerName: string, sessions: GameSession[]): GameSession[] {
  const stripped = stripEmoji(playerName).toLowerCase().trim();
  return sessions.filter((s) =>
    s.players.some((p) => stripEmoji(p).toLowerCase().trim() === stripped) ||
    s.rounds.some((r) => r.finalists.some((f) => stripEmoji(f).toLowerCase().trim() === stripped))
  );
}

/** Count finals won by a player in sessions matching a filter */
export function countWinsInFilteredSessions(playerName: string, sessions: GameSession[], filter: (s: GameSession) => boolean): number {
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
export function getUniqueMonths(playerName: string, sessions: GameSession[]): Set<string> {
  const months = new Set<string>();
  for (const s of getPlayerSessions(playerName, sessions)) {
    const d = toLuleaDate(s.date);
    months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

/** Get ISO week string from a date */
export function getISOWeek(d: Date): string {
  const tmp = new Date(d.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${tmp.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Check if player has sessions in N consecutive weeks */
export function hasConsecutiveWeeks(playerName: string, sessions: GameSession[], count: number): boolean {
  const weeks = new Set<string>();
  for (const s of getPlayerSessions(playerName, sessions)) {
    weeks.add(getISOWeek(toLuleaDate(s.date)));
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
export function hasWonFinalBelowElo(playerName: string, sessions: GameSession[], threshold: number, eloResetTimestamp?: number | null): boolean {
  const stripped = stripEmoji(playerName).toLowerCase().trim();
  let found = false;
  replayElo(sessions, { eloResetTimestamp, keepHistoryBeforeReset: true }, ({ winner, rWinner }) => {
    found = stripEmoji(winner).toLowerCase().trim() === stripped && rWinner < threshold;
    return found;
  });
  return found;
}

/** Count unique weekdays a player has played on */
export function countUniqueWeekdays(playerName: string, sessions: GameSession[]): number {
  const days = new Set<number>();
  for (const s of getPlayerSessions(playerName, sessions)) {
    days.add(toLuleaDate(s.date).getDay());
  }
  return days.size;
}

/** Check if player was eliminated (participated but never reached a final) in N consecutive sessions */
export function hasConsecutiveFirstRoundExits(playerName: string, sessions: GameSession[], threshold: number): boolean {
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
export function computePerMonthEloDeltas(playerName: string, sessions: GameSession[], eloResetTimestamp?: number | null): Record<string, number> {
  const stripped = stripEmoji(playerName).toLowerCase().trim();
  const monthDeltas: Record<string, number> = {};
  replayElo(sessions, { eloResetTimestamp, keepHistoryBeforeReset: true }, (step) => {
    const d = toLuleaDate(step.session.date);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const participants = new Set([...step.roundPlayers, step.winner, step.loser]);
    for (const player of participants) {
      if (stripEmoji(player).toLowerCase().trim() === stripped) {
        monthDeltas[month] = (monthDeltas[month] ?? 0) + step.deltaFor(player);
      }
    }
  });
  return monthDeltas;
}

/** Check if a player lost a final to someone with 100+ lower Elo */
export function hasLostToMuchLowerElo(playerName: string, sessions: GameSession[], eloGap: number, eloResetTimestamp?: number | null): boolean {
  const stripped = stripEmoji(playerName).toLowerCase().trim();
  let found = false;
  replayElo(sessions, { eloResetTimestamp, keepHistoryBeforeReset: true }, ({ loser, rWinner, rLoser }) => {
    found = stripEmoji(loser).toLowerCase().trim() === stripped && rLoser - rWinner >= eloGap;
    return found;
  });
  return found;
}

/** Check if a player lost to the same opponent N times in a row in finals */
export function hasGroundhogDay(playerName: string, sessions: GameSession[], threshold: number): boolean {
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
export function hasSmaltisen(playerName: string, sessions: GameSession[], threshold: number): boolean {
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

export const ALL_ACHIEVEMENTS: AchievementCheck[] = [
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
    return getPlayerSessions(p.name, ctx.sessions).some((s) => toLuleaDate(s.date).getHours() < 9);
  }},
  { achievement: { id: "overtime", name: "Övertidsarbete", description: "Spela en omgång som startar efter kl 16:00", emoji: "🦉", rarity: "common" }, check: (p, ctx) => {
    return getPlayerSessions(p.name, ctx.sessions).some((s) => toLuleaDate(s.date).getHours() >= 16);
  }},
  { achievement: { id: "friday_fighter", name: "Fredagskämpen", description: "Spela i 5+ fredagsomgångar", emoji: "🍻", rarity: "common" }, check: (p, ctx) => {
    return getPlayerSessions(p.name, ctx.sessions).filter((s) => toLuleaDate(s.date).getDay() === 5).length >= 5;
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
    return countWinsInFilteredSessions(p.name, ctx.sessions, (s) => { const h = toLuleaDate(s.date).getHours(); return h >= 16 && h < 19; }) > 0;
  }},
  { achievement: { id: "back_again", name: "Tillbaka Igen", description: "Spela omgångar 3 veckor i rad", emoji: "🔁", rarity: "uncommon" }, check: (p, ctx) => hasConsecutiveWeeks(p.name, ctx.sessions, 3) },
  { achievement: { id: "twin_souls", name: "Tvillingsjälar", description: "Möt samma motståndare i 10+ finaler", emoji: "👯", rarity: "uncommon" }, check: (p) => Object.values(p.h2h).some((r) => r.wins + r.losses >= 10) },
  { achievement: { id: "comeback_kid", name: "Comeback Kid", description: "Vinn en final med under 950 Elo", emoji: "🦸", rarity: "uncommon" }, check: (p, ctx) => {
    return hasWonFinalBelowElo(p.name, ctx.sessions, 950, ctx.eloResetTimestamp);
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
      const d = toLuleaDate(s.date);
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
    return countWinsInFilteredSessions(p.name, ctx.sessions, (s) => toLuleaDate(s.date).getDay() === 5) >= 10;
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
    const deltas = computePerMonthEloDeltas(p.name, ctx.sessions, ctx.eloResetTimestamp);
    return Object.values(deltas).some((d) => d <= -50);
  }},
  { achievement: { id: "the_clown", name: "Klovnen", description: "Förlora en final mot någon med 100+ lägre Elo", emoji: "🤡", rarity: "rare" }, check: (p, ctx) => hasLostToMuchLowerElo(p.name, ctx.sessions, 100, ctx.eloResetTimestamp) },
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
    const deltas = computePerMonthEloDeltas(p.name, ctx.sessions, ctx.eloResetTimestamp);
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
export const MYTHIC_COMPLETIONIST: AchievementCheck = {
  achievement: { id: "completionist", name: "Completionist", description: "Lås upp alla andra achievements", emoji: "🌠", rarity: "mythic" },
  check: () => false, // handled specially in computePlayerAchievements
};

export function computePlayerAchievements(
  player: PlayerStats,
  sessions: GameSession[],
  eloRatings: Record<string, EloEntry>,
  allStats: PlayerStats[],
  savedAchievements: SavedPlayerAchievements = {},
  eloResetTimestamp?: number | null,
): Achievement[] {
  const ctx: AchievementContext = { sessions, eloEntry: eloRatings[player.name] || null, eloRatings, allStats, eloResetTimestamp };
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
export function syncAchievements(
  stats: PlayerStats[],
  sessions: GameSession[],
  eloRatings: Record<string, EloEntry>,
  savedAchievements: SavedPlayerAchievements,
  eloResetTimestamp?: number | null,
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
      eloResetTimestamp,
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
