// ── LKAB Gruvrank System ──
// Maps percentile (0-100, where 100 = best) to LKAB mining depth ranks
// 7 tiers from Gråberg (surface waste) to Kärnan (earth's core)
export interface CSGORank {
  name: string;
  shortName: string;
  tier: number;
  color: string;
  bgColor: string;
}

// 7 tiers — each one a step deeper into the mine: waste rock at the surface, the open pit,
// the drift, the drill face, the main haulage level, the ore body and finally the core.
// Colors sourced from LKAB design palette
export const CSGO_RANKS: { threshold: number; rank: CSGORank }[] = [
  { threshold: 98,  rank: { name: "Kärnan",      shortName: "KÄ", tier: 7, color: "#FF5261", bgColor: "color-mix(in srgb, #FF5261 15%, transparent)" } },
  { threshold: 90,  rank: { name: "Malmkroppen", shortName: "MK", tier: 6, color: "#F4BF0A", bgColor: "color-mix(in srgb, #F4BF0A 15%, transparent)" } },
  { threshold: 78,  rank: { name: "Huvudnivån",  shortName: "HN", tier: 5, color: "#00C474", bgColor: "color-mix(in srgb, #00C474 15%, transparent)" } },
  { threshold: 58,  rank: { name: "Borrfronten", shortName: "BF", tier: 4, color: "#007DBF", bgColor: "color-mix(in srgb, #007DBF 15%, transparent)" } },
  { threshold: 35,  rank: { name: "Orten",       shortName: "OR", tier: 3, color: "#54B2FA", bgColor: "color-mix(in srgb, #54B2FA 15%, transparent)" } },
  { threshold: 15,  rank: { name: "Dagbrottet",  shortName: "DB", tier: 2, color: "#8EAFCE", bgColor: "color-mix(in srgb, #8EAFCE 15%, transparent)" } },
  { threshold: 0,   rank: { name: "Gråberg",     shortName: "GB", tier: 1, color: "#919284", bgColor: "color-mix(in srgb, #919284 15%, transparent)" } },
];

export function getCSGORank(percentile: number): CSGORank {
  for (const { threshold, rank } of CSGO_RANKS) {
    if (percentile >= threshold) return rank;
  }
  return CSGO_RANKS[CSGO_RANKS.length - 1].rank;
}

export function computePlayerPercentile(playerElo: number, allElos: number[]): number {
  if (allElos.length <= 1) return 50;
  const sorted = [...allElos].sort((a, b) => a - b);
  const rank = sorted.filter((e) => e < playerElo).length;
  return (rank / (sorted.length - 1)) * 100;
}
