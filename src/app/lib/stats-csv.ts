import type { GameSession } from "../components/api";
import { ELO_START } from "./elo";
import type { EloEntry } from "./elo";
import { computePlayerInsights } from "./insights";
import { stripEmoji } from "./players";
import type { PlayerStats } from "./stats";

/** Build the semicolon-separated stats export, prefixed with a UTF-8 BOM */
export function buildStatsCsv(sortedStats: PlayerStats[], eloRatings: Record<string, EloEntry>, activeSessions: GameSession[]): string {
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
  return "\uFEFF" + [headers.join(";"), ...rows].join("\n");
}
