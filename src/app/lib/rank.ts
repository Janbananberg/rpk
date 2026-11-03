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

// 7 tiers — ping pong themed ranks from Ball Boy/Girl to Match‑Point Monarch
// Colors sourced from LKAB design palette
export const CSGO_RANKS: { threshold: number; rank: CSGORank }[] = [
  { threshold: 98,  rank: { name: "Match\u2011Point Monarch", shortName: "MPM", tier: 7, color: "#FF5261", bgColor: "color-mix(in srgb, #FF5261 15%, transparent)" } },
  { threshold: 90,  rank: { name: "Smash Captain",            shortName: "SC",  tier: 6, color: "#F4BF0A", bgColor: "color-mix(in srgb, #F4BF0A 15%, transparent)" } },
  { threshold: 78,  rank: { name: "Net Ninja",                shortName: "NN",  tier: 5, color: "#00C474", bgColor: "color-mix(in srgb, #00C474 15%, transparent)" } },
  { threshold: 58,  rank: { name: "Spin Doctor",              shortName: "SD",  tier: 4, color: "#007DBF", bgColor: "color-mix(in srgb, #007DBF 15%, transparent)" } },
  { threshold: 35,  rank: { name: "Rally Rookie",             shortName: "RR",  tier: 3, color: "#54B2FA", bgColor: "color-mix(in srgb, #54B2FA 15%, transparent)" } },
  { threshold: 15,  rank: { name: "Warm\u2011Up Warrior",     shortName: "WW",  tier: 2, color: "#8EAFCE", bgColor: "color-mix(in srgb, #8EAFCE 15%, transparent)" } },
  { threshold: 0,   rank: { name: "Ball Boy/Girl",            shortName: "BB",  tier: 1, color: "#919284", bgColor: "color-mix(in srgb, #919284 15%, transparent)" } },
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
