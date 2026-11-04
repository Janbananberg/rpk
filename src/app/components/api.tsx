/**
 * API client for the betting and tournament system.
 *
 * Backend URL is read from VITE_API_URL (see .env.example). No backend is
 * configured yet, so requests fail until one is provided.
 *
 * - Admin login is checked in the browser (config.ts); admin actions send X-Admin-Token.
 * - Bettor writes send a per-user token (X-Bettor-Token), kept in localStorage.
 */
import { ADMIN_PASSWORD } from "../config";
import type { BettorProfile } from "./betting-store";
import type { MatchOdds } from "./betting-store";
import type { TournamentWinnerOdds } from "./betting-store";

export const API_BASE: string = import.meta.env.VITE_API_URL ?? "";
const BASE = API_BASE;

// ════════════════════════════════════════════════════════════════════════
//  TOKEN MANAGEMENT
//  Admin token: stored in sessionStorage (cleared on tab close).
//  Bettor token: stored in localStorage (persists across sessions).
//  Neither contains secrets like passwords or service role keys.
// ════════════════════════════════════════════════════════════════════════

const ADMIN_TOKEN_KEY = "rpk-admin-token";
const BETTOR_TOKEN_KEY = "rpk-bettor-token";

export function getAdminToken(): string | null {
  try { return sessionStorage.getItem(ADMIN_TOKEN_KEY); } catch { return null; }
}

export function setAdminToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    else sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {}
}

export function getBettorToken(): string | null {
  try { return localStorage.getItem(BETTOR_TOKEN_KEY); } catch { return null; }
}

export function setBettorToken(token: string | null) {
  try {
    if (token) localStorage.setItem(BETTOR_TOKEN_KEY, token);
    else localStorage.removeItem(BETTOR_TOKEN_KEY);
  } catch {}
}

// ════════════════════════════════════════════════════════════════════════
//  HEADER BUILDERS
//  Admin/bettor tokens are sent via custom headers, never in the request body.
// ════════════════════════════════════════════════════════════════════════

/** Base headers. */
const baseHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
});

/** Headers for admin-authenticated requests. */
const adminHeaders = (): Record<string, string> => {
  const h = baseHeaders();
  const token = getAdminToken();
  if (token) h["X-Admin-Token"] = token;
  return h;
};

/** Headers for bettor-authenticated requests. */
const bettorHeaders = (): Record<string, string> => {
  const h = baseHeaders();
  const token = getBettorToken();
  if (token) h["X-Bettor-Token"] = token;
  return h;
};

// ════════════════════════════════════════════════════════════════════════
//  PUBLIC READ ENDPOINTS (no authentication required)
//  These return non-sensitive, publicly visible tournament data.
// ════════════════════════════════════════════════════════════════════════

export async function fetchOdds(): Promise<MatchOdds[]> {
  try {
    const res = await fetch(`${BASE}/odds`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.odds || [];
  } catch (e) {
    console.log("API fetchOdds error:", e);
    return [];
  }
}

export async function fetchOddsConfig(): Promise<Record<string, { odds1: number; odds2: number }> | null> {
  try {
    const res = await fetch(`${BASE}/odds-config`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.config || null;
  } catch (e) {
    console.log("API fetchOddsConfig error:", e);
    return null;
  }
}

export async function fetchTournamentWinnerOdds(): Promise<TournamentWinnerOdds | null> {
  try {
    const res = await fetch(`${BASE}/tournament-winner-odds`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.odds || null;
  } catch (e) {
    console.log("API fetchTournamentWinnerOdds error:", e);
    return null;
  }
}

export async function fetchTournamentHistory(): Promise<TournamentHistoryEntry[]> {
  try {
    const res = await fetch(`${BASE}/tournament-history`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.history || [];
  } catch (e) {
    console.log("API fetchTournamentHistory error:", e);
    return [];
  }
}

export async function fetchAllBettors(): Promise<BettorProfile[]> {
  try {
    const res = await fetch(`${BASE}/bettors`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.bettors || [];
  } catch (e) {
    console.log("API fetchAllBettors error:", e);
    return [];
  }
}

export async function fetchBettorProfile(name: string): Promise<BettorProfile | null> {
  try {
    const res = await fetch(`${BASE}/bettor/${encodeURIComponent(name)}`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.profile || null;
  } catch (e) {
    console.log("API fetchBettorProfile error:", e);
    return null;
  }
}

export async function fetchBets(name: string): Promise<PlacedBet[]> {
  try {
    const res = await fetch(`${BASE}/bets/${encodeURIComponent(name)}`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.bets || [];
  } catch (e) {
    console.log("API fetchBets error:", e);
    return [];
  }
}

export interface TournamentState {
  active: boolean;
  activatedAt: number | null;
}

export async function fetchTournamentState(): Promise<TournamentState> {
  try {
    const res = await fetch(`${BASE}/tournament-state`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.state || { active: false, activatedAt: null };
  } catch (e) {
    console.log("API fetchTournamentState error:", e);
    return { active: false, activatedAt: null };
  }
}

// ════════════════════════════════════════════════════════════════════════
//  BETTOR AUTHENTICATION
//  Registration/login endpoints return a bettor token.
//  The token is stored in localStorage and used for authenticated writes.
// ════════════════════════════════════════════════════════════════════════

export async function registerBettor(name: string, profile: BettorProfile): Promise<{ ok: boolean; token?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE}/bettor/register`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ name, profile }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    if (data.token) setBettorToken(data.token);
    return { ok: true, token: data.token };
  } catch (e) {
    console.log("API registerBettor error:", e);
    return { ok: false, error: String(e) };
  }
}

export async function loginBettor(name: string): Promise<{ ok: boolean; profile?: BettorProfile; token?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE}/bettor/login`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    if (data.token) setBettorToken(data.token);
    return { ok: true, profile: data.profile, token: data.token };
  } catch (e) {
    console.log("API loginBettor error:", e);
    return { ok: false, error: String(e) };
  }
}

// ════════════════════════════════════════════════════════════════════════
//  BETTOR AUTHENTICATED WRITES
//  These require the X-Bettor-Token header.
//  Balance changes are done server-side; the client cannot set its own balance.
// ════════════════════════════════════════════════════════════════════════

/**
 * Update own profile (cosmetics only).
 * SECURITY: The server ignores balance/totalWon/totalLost from the client.
 */
export async function saveBettorProfile(profile: BettorProfile): Promise<BettorProfile | null> {
  try {
    const res = await fetch(`${BASE}/bettor`, {
      method: "POST",
      headers: bettorHeaders(),
      body: JSON.stringify({ profile }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.log("API saveBettorProfile error:", err);
      return null;
    }
    const data = await res.json();
    return data.profile || null;
  } catch (e) {
    console.log("API saveBettorProfile network error:", e);
    return null;
  }
}

/**
 * Place a bet — server validates balance, odds, and deducts server-side.
 * Returns the created bet and updated balance.
 */
export async function placeBet(name: string, playerName: string, amount: number): Promise<{ ok: boolean; bet?: PlacedBet; balance?: number; error?: string }> {
  try {
    const res = await fetch(`${BASE}/bets/${encodeURIComponent(name)}/place`, {
      method: "POST",
      headers: bettorHeaders(),
      body: JSON.stringify({ playerName, amount }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    return { ok: true, bet: data.bet, balance: data.balance };
  } catch (e) {
    console.log("API placeBet error:", e);
    return { ok: false, error: String(e) };
  }
}

/**
 * Purchase a cosmetic item — server validates balance and deducts server-side.
 */
export async function purchaseCosmetic(name: string, itemId: string, price: number): Promise<{ ok: boolean; profile?: BettorProfile; error?: string }> {
  try {
    const res = await fetch(`${BASE}/bettor/${encodeURIComponent(name)}/purchase`, {
      method: "POST",
      headers: bettorHeaders(),
      body: JSON.stringify({ itemId, price }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    return { ok: true, profile: data.profile };
  } catch (e) {
    console.log("API purchaseCosmetic error:", e);
    return { ok: false, error: String(e) };
  }
}

// ════════════════════════════════════════════════════════════════════════
//  ADMIN AUTHENTICATION
//  The password is checked in the browser (see config.ts) — it only keeps
//  casual visitors out of the admin view. The session marker is kept in
//  sessionStorage and sent as X-Admin-Token on admin writes.
// ════════════════════════════════════════════════════════════════════════

const LOCAL_ADMIN_TOKEN = "local-admin";

export async function adminLogin(password: string): Promise<{ ok: boolean; error?: string }> {
  if (password !== ADMIN_PASSWORD) return { ok: false, error: "Felaktigt lösenord" };
  setAdminToken(LOCAL_ADMIN_TOKEN);
  return { ok: true };
}

export async function adminLogout(): Promise<void> {
  setAdminToken(null);
}

// ════════════════════════════════════════════════════════════════════════
//  SITE SETTINGS
// ════════════════════════════════════════════════════════════════════════

export async function fetchSiteTheme(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/settings/theme`, { headers: baseHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.theme === "string" ? data.theme : null;
  } catch (e) {
    console.log("API fetchSiteTheme error:", e);
    return null;
  }
}

export async function saveSiteTheme(theme: string): Promise<void> {
  try {
    await fetch(`${BASE}/settings/theme`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ theme }),
    });
  } catch (e) {
    console.log("API saveSiteTheme error:", e);
  }
}

// ════════════════════════════════════════════════════════════════════════
//  ADMIN-AUTHENTICATED WRITES
//  All these use the admin session token via X-Admin-Token header.
//  No passwords are sent in request bodies.
// ════════════════════════════════════════════════════════════════════════

export async function publishOdds(odds: MatchOdds[]): Promise<void> {
  try {
    const res = await fetch(`${BASE}/odds`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ odds }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.log("API publishOdds error:", err);
    }
  } catch (e) {
    console.log("API publishOdds network error:", e);
  }
}

export async function saveOddsConfig(config: Record<string, { odds1: number; odds2: number }>): Promise<void> {
  try {
    await fetch(`${BASE}/odds-config`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ config }),
    });
  } catch (e) {
    console.log("API saveOddsConfig network error:", e);
  }
}

export async function publishTournamentWinnerOdds(odds: TournamentWinnerOdds): Promise<void> {
  try {
    const res = await fetch(`${BASE}/tournament-winner-odds`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ odds }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.log("API publishTournamentWinnerOdds error:", err);
    }
  } catch (e) {
    console.log("API publishTournamentWinnerOdds network error:", e);
  }
}

export async function saveTournamentState(state: TournamentState): Promise<void> {
  try {
    await fetch(`${BASE}/tournament-state`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ state }),
    });
  } catch (e) {
    console.log("API saveTournamentState network error:", e);
  }
}

export async function saveTournamentHistoryEntry(entry: TournamentHistoryEntry): Promise<void> {
  try {
    const res = await fetch(`${BASE}/tournament-history`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ entry }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.log("API saveTournamentHistoryEntry error:", err);
    }
  } catch (e) {
    console.log("API saveTournamentHistoryEntry network error:", e);
  }
}

export async function adminFetchAllBets(): Promise<PlacedBet[][]> {
  try {
    const res = await fetch(`${BASE}/admin/all-bets`, {
      method: "POST",
      headers: adminHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.allBets || [];
  } catch (e) {
    console.log("API adminFetchAllBets error:", e);
    return [];
  }
}

export async function adminDeleteBettor(name: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/admin/delete-bettor`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ name }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function adminResetAll(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/admin/reset-all`, {
      method: "POST",
      headers: adminHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function adminDeleteTournamentHistoryEntry(entryId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/admin/delete-tournament-history-entry`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ entryId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function adminClearTournamentHistory(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/admin/clear-tournament-history`, {
      method: "POST",
      headers: adminHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function adminDeleteActiveTournament(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/admin/delete-active-tournament`, {
      method: "POST",
      headers: adminHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Public: clear the active tournament (used by "Ny turnering" button) */
export async function deleteActiveTournament(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/active-tournament`, {
      method: "DELETE",
      headers: baseHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════════
//  TYPES (shared with components)
// ════════════════════════════════════════════════════════════════════════

export interface PlacedBet {
  id: string;
  matchId: string;
  matchLabel: string;
  player: string;
  amount: number;
  odds: number;
  resolved: boolean;
  won: boolean | null;
  placedAt: number;
  resolvedAt: number | null;
}

export interface TournamentHistoryMatchDetail {
  player1: string;
  player2: string;
  scores1: number[];
  scores2: number[];
  wins1: number;
  wins2: number;
  winner: string | null;
}

export interface TournamentHistoryEntry {
  id: string;
  date: number;
  players: string[];
  qf1Winner?: string;
  qf2Winner?: string;
  qf3Winner?: string;
  qf4Winner?: string;
  semi1Winner: string;
  semi2Winner: string;
  champion: string;
  bestOfQuarter?: number;
  bestOfSemi: number;
  bestOfFinal: number;
  // Full match details (optional for backwards compat with old entries)
  matches?: {
    qf1?: TournamentHistoryMatchDetail;
    qf2?: TournamentHistoryMatchDetail;
    qf3?: TournamentHistoryMatchDetail;
    qf4?: TournamentHistoryMatchDetail;
    semi1?: TournamentHistoryMatchDetail;
    semi2?: TournamentHistoryMatchDetail;
    final?: TournamentHistoryMatchDetail;
  };
}

// ════════════════════════════════════════════════════════════════════════
//  ACTIVE TOURNAMENT — server-synced bracket state
//  The bracket component syncs its state here on every update.
//  Admin can view the live tournament from the admin panel.
// ════════════════════════════════════════════════════════════════════════

export interface ActiveTournamentMatch {
  player1: string;
  player2: string;
  scores1: number[];
  scores2: number[];
  wins1: number;
  wins2: number;
  winner: string | null;
}

export interface ActiveTournament {
  id: string;
  createdAt: number;
  updatedAt: number;
  players: string[];
  bestOfConfig: { quarter: number; semi: number; final: number };
  qf1: ActiveTournamentMatch;
  qf2: ActiveTournamentMatch;
  qf3: ActiveTournamentMatch;
  qf4: ActiveTournamentMatch;
  semi1: ActiveTournamentMatch;
  semi2: ActiveTournamentMatch;
  final: ActiveTournamentMatch;
  champion: string | null;
  status: "active" | "completed";
}

export async function fetchActiveTournament(): Promise<ActiveTournament | null> {
  try {
    const res = await fetch(`${BASE}/active-tournament`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.tournament || null;
  } catch (e) {
    console.log("API fetchActiveTournament error:", e);
    return null;
  }
}

export async function saveActiveTournament(tournament: ActiveTournament): Promise<void> {
  try {
    await fetch(`${BASE}/active-tournament`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ tournament }),
    });
  } catch (e) {
    console.log("API saveActiveTournament network error:", e);
  }
}

// ════════════════════════════════════════════════════════════════════════
//  HIGHSCORE — Rundpingis game tracking
// ════════════════════════════════════════════════════════════════════════

export interface GameRound {
  finalists: [string, string];
  winner: string;
  players?: string[]; // players active in this specific round (for mid-session roster changes)
}

export interface GameSession {
  id: string;
  date: number;
  players: string[];
  rounds: GameRound[];
}

export interface ArchivedSeason {
  id: string;
  name: string;
  archivedAt: number;
  sessions: GameSession[];
  players: string[];
}

export async function fetchHighscorePlayers(): Promise<string[]> {
  try {
    const res = await fetch(`${BASE}/highscore/players`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.players || [];
  } catch (e) {
    console.log("API fetchHighscorePlayers error:", e);
    return [];
  }
}

export async function saveHighscorePlayers(players: string[]): Promise<void> {
  try {
    await fetch(`${BASE}/highscore/players`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ players }),
    });
  } catch (e) {
    console.log("API saveHighscorePlayers error:", e);
  }
}

export async function fetchHighscoreSessions(): Promise<GameSession[]> {
  try {
    const res = await fetch(`${BASE}/highscore/sessions`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.sessions || [];
  } catch (e) {
    console.log("API fetchHighscoreSessions error:", e);
    return [];
  }
}

export async function saveHighscoreSessions(sessions: GameSession[]): Promise<void> {
  try {
    await fetch(`${BASE}/highscore/sessions`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ sessions }),
    });
  } catch (e) {
    console.log("API saveHighscoreSessions error:", e);
  }
}

export async function fetchArchivedSeasons(): Promise<ArchivedSeason[]> {
  try {
    const res = await fetch(`${BASE}/highscore/seasons`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.seasons || [];
  } catch (e) {
    console.log("API fetchArchivedSeasons error:", e);
    return [];
  }
}

export async function saveArchivedSeasons(seasons: ArchivedSeason[]): Promise<void> {
  try {
    await fetch(`${BASE}/highscore/seasons`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ seasons }),
    });
  } catch (e) {
    console.log("API saveArchivedSeasons error:", e);
  }
}

export async function deleteHighscoreSession(sessionId: string): Promise<void> {
  try {
    await fetch(`${BASE}/highscore/delete-session`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ sessionId }),
    });
  } catch (e) {
    console.log("API deleteHighscoreSession error:", e);
  }
}

// ── Historical baseline stats (imported data before session tracking) ──
export interface HistoricalPlayerStats {
  wins: number;
  finals: number;
  gamesPlayed: number;
  h2h?: Record<string, { wins: number; losses: number }>;
}

export type HistoricalStats = Record<string, HistoricalPlayerStats>;

export async function fetchHistoricalStats(): Promise<HistoricalStats> {
  try {
    const res = await fetch(`${BASE}/highscore/historical-stats`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.stats || {};
  } catch (e) {
    console.log("API fetchHistoricalStats error:", e);
    return {};
  }
}

export async function saveHistoricalStats(stats: HistoricalStats): Promise<void> {
  try {
    await fetch(`${BASE}/highscore/historical-stats`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ stats }),
    });
  } catch (e) {
    console.log("API saveHistoricalStats error:", e);
  }
}

// ── Monthly sessions (per calendar month) ──

export async function fetchMonthlySessions(month: string): Promise<GameSession[]> {
  try {
    const res = await fetch(`${BASE}/highscore/monthly-sessions/${month}`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.sessions || [];
  } catch (e) {
    console.log("API fetchMonthlySessions error:", e);
    return [];
  }
}

export async function saveMonthlySessions(month: string, sessions: GameSession[]): Promise<void> {
  try {
    await fetch(`${BASE}/highscore/monthly-sessions/${month}`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ sessions }),
    });
  } catch (e) {
    console.log("API saveMonthlySessions error:", e);
  }
}

export async function deleteMonthlySession(sessionId: string, month: string): Promise<void> {
  try {
    await fetch(`${BASE}/highscore/delete-monthly-session`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ sessionId, month }),
    });
  } catch (e) {
    console.log("API deleteMonthlySession error:", e);
  }
}

export async function fetchMonthList(): Promise<string[]> {
  try {
    const res = await fetch(`${BASE}/highscore/month-list`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.months || [];
  } catch (e) {
    console.log("API fetchMonthList error:", e);
    return [];
  }
}

export async function discoverMonths(): Promise<string[]> {
  try {
    const res = await fetch(`${BASE}/highscore/discover-months`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.months || [];
  } catch (e) {
    console.log("API discoverMonths error:", e);
    return [];
  }
}

export async function saveMonthList(months: string[]): Promise<void> {
  try {
    await fetch(`${BASE}/highscore/month-list`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ months }),
    });
  } catch (e) {
    console.log("API saveMonthList error:", e);
  }
}

// ── Player cards (yellow/red) ──

export type PlayerCards = Record<string, { yellow: number; red: number }>;

export async function fetchPlayerCards(): Promise<PlayerCards> {
  try {
    const res = await fetch(`${BASE}/highscore/player-cards`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.cards || {};
  } catch (e) {
    console.log("API fetchPlayerCards error:", e);
    return {};
  }
}

export async function savePlayerCards(cards: PlayerCards): Promise<void> {
  try {
    await fetch(`${BASE}/highscore/player-cards`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ cards }),
    });
  } catch (e) {
    console.log("API savePlayerCards error:", e);
  }
}

// ── Persistent achievements ──

export interface SavedAchievement {
  achievementId: string;
  unlockedAt: number;
}

export type SavedPlayerAchievements = Record<string, SavedAchievement[]>;

export async function fetchPlayerAchievements(): Promise<SavedPlayerAchievements> {
  try {
    const res = await fetch(`${BASE}/highscore/player-achievements`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.achievements || {};
  } catch (e) {
    console.log("API fetchPlayerAchievements error:", e);
    return {};
  }
}

export async function savePlayerAchievements(achievements: SavedPlayerAchievements): Promise<void> {
  try {
    await fetch(`${BASE}/highscore/player-achievements`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ achievements }),
    });
  } catch (e) {
    console.log("API savePlayerAchievements error:", e);
  }
}

// ── Server-side seed check ──

export async function fetchSeedStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/highscore/seed-status`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return !!data.seeded;
  } catch (e) {
    console.log("API fetchSeedStatus error:", e);
    // IMPORTANT: return true on error so we never accidentally re-seed
    // and overwrite players that were added after the initial seed.
    return true;
  }
}

export async function markSeeded(): Promise<void> {
  try {
    await fetch(`${BASE}/highscore/seed-status`, {
      method: "POST",
      headers: baseHeaders(),
    });
  } catch (e) {
    console.log("API markSeeded error:", e);
  }
}

// ── Remove player (server-side atomic cleanup) ──

export async function removePlayerFromServer(name: string): Promise<{
  ok: boolean;
  players?: string[];
  historicalStats?: HistoricalStats;
  cards?: PlayerCards;
}> {
  try {
    const res = await fetch(`${BASE}/highscore/remove-player`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.log("API removePlayerFromServer error:", err);
      return { ok: false };
    }
    return await res.json();
  } catch (e) {
    console.log("API removePlayerFromServer error:", e);
    return { ok: false };
  }
}

// ── Elo Reset ──

export async function fetchEloResetTimestamp(): Promise<number | null> {
  try {
    const res = await fetch(`${BASE}/elo-reset-timestamp`, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.resetTimestamp ?? null;
  } catch (e) {
    console.log("API fetchEloResetTimestamp error:", e);
    return null;
  }
}

export async function resetEloRatings(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/admin/elo-reset`, {
      method: "POST",
      headers: adminHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      console.log("API resetEloRatings error:", err);
      return false;
    }
    return true;
  } catch (e) {
    console.log("API resetEloRatings error:", e);
    return false;
  }
}
