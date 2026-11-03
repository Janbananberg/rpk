/**
 * Shared betting data store — types, cosmetics catalog, and helpers.
 * Actual persistence is handled by api.tsx (Supabase) with localStorage fallback.
 */

export interface EquippedCosmetics {
  avatar: string | null;
  title: string | null;
  badge: string | null;
  nameColor: string | null;
}

export interface BettorProfile {
  name: string;
  balance: number;
  totalWon: number;
  totalLost: number;
  totalBets: number;
  purchasedCosmetics: string[];
  equippedCosmetics: EquippedCosmetics;
  registeredAt: number;
}

export function createDefaultProfile(name: string, balance: number): BettorProfile {
  return {
    name,
    balance,
    totalWon: 0,
    totalLost: 0,
    totalBets: 0,
    purchasedCosmetics: [],
    equippedCosmetics: {
      avatar: null,
      title: null,
      badge: null,
      nameColor: null,
    },
    registeredAt: Date.now(),
  };
}

/* ── Match Odds type (shared between organizer + bettors) ──────────── */

export interface MatchOdds {
  matchId: string;
  label: string;
  player1: string;
  player2: string;
  odds1: number;
  odds2: number;
  winner: string | null;
}

/* ── Tournament Winner Odds (bet on who wins the whole tournament) ── */

export interface PlayerOdds {
  name: string;
  odds: number;
}

export interface TournamentWinnerOdds {
  players: PlayerOdds[];
  champion: string | null;
}

/* ── Cosmetics Catalog ─────────────────────────────────────────────── */

export type CosmeticCategory = "avatar" | "title" | "badge" | "bundle";

export interface CosmeticItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: CosmeticCategory;
  value: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const COSMETICS_CATALOG: CosmeticItem[] = [
  // ── Avatarer (emojis) ──
  // Common: 150–250, Rare: 400–600, Epic: 1200–2000, Legendary: 15000–25000
  { id: "avatar-pingis", name: "Pingisracket", description: "En klassisk racket", price: 150, category: "avatar", value: "\u{1F3D3}", rarity: "common" },
  { id: "avatar-fire", name: "Eldsj\u00e4l", description: "Du brinner f\u00f6r spelet", price: 200, category: "avatar", value: "\u{1F525}", rarity: "common" },
  { id: "avatar-rocket", name: "Raket", description: "Rakt upp\u00e5t!", price: 450, category: "avatar", value: "\u{1F680}", rarity: "rare" },
  { id: "avatar-crown", name: "Krona", description: "Kunglig status", price: 550, category: "avatar", value: "\u{1F451}", rarity: "rare" },
  { id: "avatar-diamond", name: "Diamant", description: "Skinande och ren", price: 1500, category: "avatar", value: "\u{1F48E}", rarity: "epic" },
  { id: "avatar-alien", name: "Utomjording", description: "Inte av denna v\u00e4rlden", price: 500, category: "avatar", value: "\u{1F47D}", rarity: "rare" },
  { id: "avatar-robot", name: "Robot", description: "Beep boop bet", price: 250, category: "avatar", value: "\u{1F916}", rarity: "common" },
  { id: "avatar-unicorn", name: "Enh\u00f6rning", description: "Magisk tur", price: 15000, category: "avatar", value: "\u{1F984}", rarity: "legendary" },
  { id: "avatar-clown", name: "Clown", description: "Skrattande hela v\u00e4gen", price: 175, category: "avatar", value: "\u{1F921}", rarity: "common" },
  { id: "avatar-skull", name: "D\u00f6dskalle", description: "Farlig bettare", price: 400, category: "avatar", value: "\u{1F480}", rarity: "rare" },
  { id: "avatar-dice", name: "T\u00e4rning", description: "Allt handlar om tur", price: 175, category: "avatar", value: "\u{1F3B2}", rarity: "common" },
  { id: "avatar-moneybag", name: "Pengas\u00e4ck", description: "Show me the karma", price: 600, category: "avatar", value: "\u{1F4B0}", rarity: "rare" },
  { id: "avatar-crystal", name: "Kristallkula", description: "Sp\u00e5r framtiden", price: 1200, category: "avatar", value: "\u{1F52E}", rarity: "epic" },
  { id: "avatar-dragon", name: "Drake", description: "Eldsprutande odds", price: 20000, category: "avatar", value: "\u{1F409}", rarity: "legendary" },
  { id: "avatar-ghost", name: "Sp\u00f6ke", description: "Osynlig men d\u00f6dlig", price: 225, category: "avatar", value: "\u{1F47B}", rarity: "common" },
  { id: "avatar-ninja", name: "Ninja", description: "Sl\u00e5r till n\u00e4r minst anar", price: 1800, category: "avatar", value: "\u{1F977}", rarity: "epic" },
  { id: "avatar-cat", name: "Katt", description: "Nio liv, nio bets", price: 200, category: "avatar", value: "\u{1F431}", rarity: "common" },
  { id: "avatar-whale", name: "Val", description: "Den st\u00f6rsta fisken", price: 2000, category: "avatar", value: "\u{1F40B}", rarity: "epic" },

  // ── Titlar ──
  // Common: 100–200, Rare: 500–750, Epic: 1500–2500, Legendary: 15000–25000
  { id: "title-noob", name: "Nyb\u00f6rjaren", description: "Alla b\u00f6rjar n\u00e5nstans", price: 100, category: "title", value: "Nyb\u00f6rjaren", rarity: "common" },
  { id: "title-fikamaster", name: "Fikam\u00e4staren", description: "Kung av fika", price: 500, category: "title", value: "Fikam\u00e4staren", rarity: "rare" },
  { id: "title-oddskung", name: "Oddskungen", description: "H\u00e4rskar \u00f6ver oddsen", price: 600, category: "title", value: "Oddskungen", rarity: "rare" },
  { id: "title-prophet", name: "Profeten", description: "Ser framtiden", price: 1500, category: "title", value: "Profeten", rarity: "epic" },
  { id: "title-whale", name: "Storspelaren", description: "Satsar stort, vinner stort", price: 2000, category: "title", value: "Storspelaren", rarity: "epic" },
  { id: "title-legend", name: "Legenden", description: "Od\u00f6dlig status", price: 18000, category: "title", value: "Legenden", rarity: "legendary" },
  { id: "title-degenerate", name: "Fikadegen", description: "All in, varje g\u00e5ng", price: 175, category: "title", value: "Fikadegen", rarity: "common" },
  { id: "title-hustler", name: "Hustlaren", description: "Jobbar i det tysta", price: 550, category: "title", value: "Hustlaren", rarity: "rare" },
  { id: "title-shark", name: "Korthajen", description: "Alltid ett \u00e4ss i rockn", price: 700, category: "title", value: "Korthajen", rarity: "rare" },
  { id: "title-oracle", name: "Oraklet", description: "Allvetande bettare", price: 1800, category: "title", value: "Oraklet", rarity: "epic" },
  { id: "title-paperhands", name: "Pappershand", description: "S\u00e4ljer aldrig i tid", price: 125, category: "title", value: "Pappershand", rarity: "common" },
  { id: "title-diamondhands", name: "Diamanthand", description: "H\u00e5ller tills slutet", price: 2500, category: "title", value: "Diamanthand", rarity: "epic" },
  { id: "title-luckycharm", name: "Lyckocharm", description: "Allt du r\u00f6r blir guld", price: 16000, category: "title", value: "Lyckocharm", rarity: "legendary" },
  { id: "title-underdog", name: "Underdogen", description: "Satsar alltid p\u00e5 den svagare", price: 200, category: "title", value: "Underdogen", rarity: "common" },
  { id: "title-veteran", name: "Veteranen", description: "Sett det mesta", price: 750, category: "title", value: "Veteranen", rarity: "rare" },
  { id: "title-goat", name: "G.O.A.T.", description: "Greatest Of All Time", price: 25000, category: "title", value: "G.O.A.T.", rarity: "legendary" },

  // ── Badges (ikoner bredvid namnet) ──
  // Common: 200–350, Rare: 600–900, Epic: 1500–2500, Legendary: 15000–25000
  { id: "badge-crown", name: "Kronbadge", description: "En krona vid ditt namn", price: 1500, category: "badge", value: "crown", rarity: "epic" },
  { id: "badge-medal", name: "Medaljbadge", description: "F\u00f6rtj\u00e4nad medalj", price: 600, category: "badge", value: "medal", rarity: "rare" },
  { id: "badge-award", name: "Prisbadge", description: "Pristagare", price: 700, category: "badge", value: "award", rarity: "rare" },
  { id: "badge-flame", name: "Eldbadge", description: "Du \u00e4r on fire", price: 1800, category: "badge", value: "flame", rarity: "epic" },
  { id: "badge-star", name: "Stj\u00e4rnbadge", description: "Stj\u00e4rnstatus", price: 2200, category: "badge", value: "star", rarity: "epic" },
  { id: "badge-trophy", name: "Pokalbadge", description: "Ultimat trof\u00e9", price: 18000, category: "badge", value: "trophy", rarity: "legendary" },
  { id: "badge-zap", name: "Blixbadge", description: "Snabb som blixten", price: 800, category: "badge", value: "zap", rarity: "rare" },
  { id: "badge-heart", name: "Hj\u00e4rtbadge", description: "Spelar med hj\u00e4rtat", price: 300, category: "badge", value: "heart", rarity: "common" },
  { id: "badge-shield", name: "Sk\u00f6ldbadge", description: "Of\u00f6rst\u00f6rbar", price: 2500, category: "badge", value: "shield", rarity: "epic" },
  { id: "badge-gem", name: "Juvelbadge", description: "Exklusiv \u00e4delsten", price: 22000, category: "badge", value: "gem", rarity: "legendary" },
  { id: "badge-target", name: "M\u00e5ltavla", description: "Tr\u00e4ffar alltid r\u00e4tt", price: 900, category: "badge", value: "target", rarity: "rare" },
  { id: "badge-swords", name: "Sv\u00e4rdbadge", description: "Stridsklar", price: 2000, category: "badge", value: "swords", rarity: "epic" },
];

export function getItemById(id: string): CosmeticItem | undefined {
  return COSMETICS_CATALOG.find((c) => c.id === id);
}