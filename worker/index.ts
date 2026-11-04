/**
 * RPK backend: a Cloudflare Worker in front of D1. Only /api/* reaches this code
 * (`run_worker_first` in wrangler.jsonc); everything else is the built app in dist/.
 *
 * Shared team data (players, sessions, the bracket) is writable without logging in, as it was
 * on the old server. Only the admin endpoints check X-Admin-Token.
 */
import { Hono } from "hono";
import type { Context, Next } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { ActiveTournament, GameSession, HistoricalStats, PlayerCards, SavedPlayerAchievements, TournamentHistoryEntry } from "../src/app/components/api";
import { computePublicStats } from "./stats";
import { get, getByPrefix, set, VERSION_KEY, write } from "./store";

interface Env {
  DB: D1Database;
  /** Secret set in the Cloudflare dashboard. Until it is, the old password still works. */
  ADMIN_PASSWORD?: string;
}

type AppContext = Context<{ Bindings: Env }>;

const DEFAULT_ADMIN_PASSWORD = "plingplong";
const MAX_TOURNAMENT_HISTORY = 50;
const MAX_THEME_LENGTH = 40;
const MONTH_RE = /^\d{4}-\d{2}$/;
const MONTH_SESSIONS_PREFIX = "rpk:highscore-sessions-";
const monthKey = (month: string) => `${MONTH_SESSIONS_PREFIX}${month}`;

/** Achievements that depend on Elo. An Elo reset takes them away, so they can be won again. */
const ELO_ACHIEVEMENT_IDS = ["underdog", "peak_performance", "free_fall", "goat", "untouchable", "transcendent", "rock_bottom"];

const app = new Hono<{ Bindings: Env }>().basePath("/api");

// D1 stores a value of at most 2 MB.
app.use("*", bodyLimit({ maxSize: 1_900_000, onError: (c) => c.json({ error: "Payload too large" }, 413) }));

app.onError((e, c) => {
  console.log(`${c.req.method} ${c.req.path} failed:`, e);
  return c.json({ error: "Serverfel" }, 500);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

// ── Admin ──────────────────────────────────────────────────────────────────

// The token is a hash of the password, so there is no session to store, and changing the
// secret logs everyone out.
async function tokenFor(password: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`rpk-admin:${password}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const adminToken = (env: Env) => tokenFor(env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD);

async function requireAdmin(c: AppContext, next: Next) {
  const token = c.req.header("X-Admin-Token") ?? "";
  if (!constantTimeEqual(token, await adminToken(c.env))) return c.json({ error: "Unauthorized" }, 401);
  await next();
}

app.post("/admin/login", async (c) => {
  const { password } = await c.req.json<{ password?: unknown }>().catch(() => ({ password: undefined }));
  const expected = await adminToken(c.env);
  if (typeof password !== "string" || !constantTimeEqual(await tokenFor(password), expected)) {
    return c.json({ ok: false, error: "Felaktigt lösenord" }, 401);
  }
  return c.json({ ok: true, token: expected });
});

app.post("/admin/delete-tournament-history-entry", requireAdmin, async (c) => {
  const { entryId } = await c.req.json<{ entryId?: string }>();
  if (!entryId) return c.json({ error: "entryId required" }, 400);
  const history = (await get<TournamentHistoryEntry[]>(c.env.DB, "rpk:tournament-history")) ?? [];
  await set(c.env.DB, "rpk:tournament-history", history.filter((e) => e.id !== entryId));
  return c.json({ ok: true });
});

app.post("/admin/clear-tournament-history", requireAdmin, async (c) => {
  await set(c.env.DB, "rpk:tournament-history", []);
  return c.json({ ok: true });
});

app.post("/admin/delete-active-tournament", requireAdmin, async (c) => {
  await set(c.env.DB, "rpk:active-tournament", null);
  return c.json({ ok: true });
});

// Only sessions after the timestamp count towards Elo.
app.post("/admin/elo-reset", requireAdmin, async (c) => {
  const resetTimestamp = Date.now();
  const saved = (await get<SavedPlayerAchievements>(c.env.DB, "rpk:player-achievements")) ?? {};
  const cleaned = Object.fromEntries(
    Object.entries(saved).map(([player, list]) => [player, list.filter((a) => !ELO_ACHIEVEMENT_IDS.includes(a.achievementId))]),
  );
  await write(c.env.DB, [
    { key: "rpk:elo-reset-timestamp", value: resetTimestamp },
    { key: "rpk:player-achievements", value: cleaned },
  ]);
  return c.json({ ok: true, resetTimestamp });
});

// ── Version (cheap polling) ────────────────────────────────────────────────

app.get("/version", async (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({ version: (await get<number>(c.env.DB, VERSION_KEY)) ?? 0 });
});

// ── Settings ───────────────────────────────────────────────────────────────

app.get("/settings/theme", async (c) => c.json({ theme: await get<string>(c.env.DB, "rpk:settings-theme") }));

app.post("/settings/theme", requireAdmin, async (c) => {
  const { theme } = await c.req.json<{ theme?: unknown }>();
  if (typeof theme !== "string" || !theme || theme.length > MAX_THEME_LENGTH) return c.json({ error: "theme required" }, 400);
  await set(c.env.DB, "rpk:settings-theme", theme);
  return c.json({ ok: true });
});

// ── Tournaments ────────────────────────────────────────────────────────────

app.get("/tournament-history", async (c) => c.json({ history: (await get(c.env.DB, "rpk:tournament-history")) ?? [] }));

// Public: whoever ran the tournament saves it when the final is decided.
app.post("/tournament-history", async (c) => {
  const { entry } = await c.req.json<{ entry?: TournamentHistoryEntry }>();
  if (!entry?.id || !entry.champion || !entry.players?.length) {
    return c.json({ error: "Valid entry with id, champion and players required" }, 400);
  }
  const history = (await get<TournamentHistoryEntry[]>(c.env.DB, "rpk:tournament-history")) ?? [];
  if (history.some((e) => e.id === entry.id)) return c.json({ ok: true, duplicate: true });
  await set(c.env.DB, "rpk:tournament-history", [entry, ...history].slice(0, MAX_TOURNAMENT_HISTORY));
  return c.json({ ok: true });
});

app.get("/active-tournament", async (c) => c.json({ tournament: (await get(c.env.DB, "rpk:active-tournament")) ?? null }));

app.post("/active-tournament", async (c) => {
  const { tournament } = await c.req.json<{ tournament?: ActiveTournament }>();
  if (!tournament) return c.json({ error: "Tournament data required" }, 400);
  await set(c.env.DB, "rpk:active-tournament", tournament);
  return c.json({ ok: true });
});

// Public: the "Ny turnering" button.
app.delete("/active-tournament", async (c) => {
  await set(c.env.DB, "rpk:active-tournament", null);
  return c.json({ ok: true });
});

app.get("/elo-reset-timestamp", async (c) => c.json({ resetTimestamp: (await get<number>(c.env.DB, "rpk:elo-reset-timestamp")) ?? null }));

// ── Highscore: whole documents ─────────────────────────────────────────────

// Each is read and replaced as a whole: GET returns { [field]: value }, POST takes the same shape.
const DOCUMENTS: { path: string; key: string; field: string; empty: unknown }[] = [
  { path: "players", key: "rpk:highscore-players", field: "players", empty: [] },
  { path: "sessions", key: "rpk:highscore-sessions", field: "sessions", empty: [] },
  { path: "seasons", key: "rpk:highscore-archived-seasons", field: "seasons", empty: [] },
  { path: "historical-stats", key: "rpk:highscore-historical-stats", field: "stats", empty: {} },
  { path: "player-cards", key: "rpk:player-cards", field: "cards", empty: {} },
  { path: "player-achievements", key: "rpk:player-achievements", field: "achievements", empty: {} },
  { path: "month-list", key: "rpk:highscore-month-list", field: "months", empty: [] },
];

for (const doc of DOCUMENTS) {
  app.get(`/highscore/${doc.path}`, async (c) => c.json({ [doc.field]: (await get(c.env.DB, doc.key)) ?? doc.empty }));
  app.post(`/highscore/${doc.path}`, async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const value = body[doc.field];
    if (value === undefined || value === null || typeof value !== "object") return c.json({ error: `${doc.field} required` }, 400);
    await set(c.env.DB, doc.key, value);
    return c.json({ ok: true });
  });
}

app.post("/highscore/delete-session", async (c) => {
  const { sessionId } = await c.req.json<{ sessionId?: string }>();
  if (!sessionId) return c.json({ error: "sessionId required" }, 400);
  const sessions = (await get<GameSession[]>(c.env.DB, "rpk:highscore-sessions")) ?? [];
  await set(c.env.DB, "rpk:highscore-sessions", sessions.filter((s) => s.id !== sessionId));
  return c.json({ ok: true });
});

// ── Highscore: monthly sessions ────────────────────────────────────────────

app.get("/highscore/monthly-sessions/:month", async (c) => {
  const month = c.req.param("month");
  if (!MONTH_RE.test(month)) return c.json({ error: "Invalid month format, use YYYY-MM" }, 400);
  return c.json({ sessions: (await get(c.env.DB, monthKey(month))) ?? [] });
});

app.post("/highscore/monthly-sessions/:month", async (c) => {
  const month = c.req.param("month");
  if (!MONTH_RE.test(month)) return c.json({ error: "Invalid month format, use YYYY-MM" }, 400);
  const { sessions } = await c.req.json<{ sessions?: GameSession[] }>();
  if (!Array.isArray(sessions)) return c.json({ error: "sessions required" }, 400);
  await set(c.env.DB, monthKey(month), sessions);
  return c.json({ ok: true });
});

app.post("/highscore/delete-monthly-session", async (c) => {
  const { sessionId, month } = await c.req.json<{ sessionId?: string; month?: string }>();
  if (!sessionId || !month || !MONTH_RE.test(month)) return c.json({ error: "sessionId and month required" }, 400);
  const sessions = (await get<GameSession[]>(c.env.DB, monthKey(month))) ?? [];
  await set(c.env.DB, monthKey(month), sessions.filter((s) => s.id !== sessionId));
  return c.json({ ok: true });
});

// Recovery: the months that actually hold sessions, in case the month list was lost.
app.get("/highscore/discover-months", async (c) => {
  const stored = await getByPrefix<GameSession[]>(c.env.DB, MONTH_SESSIONS_PREFIX);
  const months = Object.entries(stored)
    .filter(([, sessions]) => Array.isArray(sessions) && sessions.length > 0)
    .map(([key]) => key.slice(MONTH_SESSIONS_PREFIX.length))
    .filter((month) => MONTH_RE.test(month))
    .sort();
  return c.json({ months });
});

// Set once the starting roster has been written, so no other browser seeds it again.
app.get("/highscore/seed-status", async (c) => c.json({ seeded: !!(await get(c.env.DB, "rpk:highscore-seeded")) }));

app.post("/highscore/seed-status", async (c) => {
  await set(c.env.DB, "rpk:highscore-seeded", { seeded: true, at: Date.now() });
  return c.json({ ok: true });
});

// Removes a player everywhere in one batch: the roster, stats, cards, achievements and sessions.
app.post("/highscore/remove-player", async (c) => {
  const { name } = await c.req.json<{ name?: string }>();
  if (!name) return c.json({ error: "Player name required" }, 400);
  const db = c.env.DB;

  // Every stored month, not just the month list, so a player can't linger in a month the list lost.
  const [players, historicalStats, cards, achievements, monthSessions] = await Promise.all([
    get<string[]>(db, "rpk:highscore-players"),
    get<HistoricalStats>(db, "rpk:highscore-historical-stats"),
    get<PlayerCards>(db, "rpk:player-cards"),
    get<SavedPlayerAchievements>(db, "rpk:player-achievements"),
    getByPrefix<GameSession[]>(db, MONTH_SESSIONS_PREFIX),
  ]);
  const updatedPlayers = (players ?? []).filter((p) => p !== name);
  const { [name]: _stats, ...updatedStats } = historicalStats ?? {};
  const { [name]: _cards, ...updatedCards } = cards ?? {};
  const { [name]: _achievements, ...updatedAchievements } = achievements ?? {};

  const changes: { key: string; value: unknown }[] = [
    { key: "rpk:highscore-players", value: updatedPlayers },
    { key: "rpk:highscore-historical-stats", value: updatedStats },
    { key: "rpk:player-cards", value: updatedCards },
    { key: "rpk:player-achievements", value: updatedAchievements },
  ];

  for (const [key, sessions] of Object.entries(monthSessions)) {
    let changed = false;
    const cleaned = sessions.map((session) => {
      const rounds = session.rounds.map((round) => {
        const finalists = round.finalists.filter((f) => f !== name);
        const winner = round.winner === name ? null : round.winner;
        if (finalists.length !== round.finalists.length || winner !== round.winner) changed = true;
        return { ...round, finalists, winner };
      });
      const sessionPlayers = session.players.filter((p) => p !== name);
      if (sessionPlayers.length !== session.players.length) changed = true;
      return { ...session, players: sessionPlayers, rounds };
    });
    if (changed) changes.push({ key, value: cleaned });
  }

  await write(db, changes);
  return c.json({ ok: true, players: updatedPlayers, historicalStats: updatedStats, cards: updatedCards });
});

// ── Public statistics API ──────────────────────────────────────────────────

app.get("/stats", async (c) => {
  c.header("Access-Control-Allow-Origin", "*");
  const month = c.req.query("month") || "total";
  if (month !== "total" && !MONTH_RE.test(month)) {
    return c.json({ error: "Ogiltigt månadsformat. Använd YYYY-MM eller 'total'." }, 400);
  }
  const db = c.env.DB;
  const [players, historicalStats, playerCards, tournamentHistory, eloResetTimestamp, legacySessions, stored] = await Promise.all([
    get<string[]>(db, "rpk:highscore-players"),
    get<HistoricalStats>(db, "rpk:highscore-historical-stats"),
    get<PlayerCards>(db, "rpk:player-cards"),
    get<TournamentHistoryEntry[]>(db, "rpk:tournament-history"),
    get<number>(db, "rpk:elo-reset-timestamp"),
    get<GameSession[]>(db, "rpk:highscore-sessions"),
    getByPrefix<GameSession[]>(db, MONTH_SESSIONS_PREFIX),
  ]);
  const sessionsByMonth = Object.fromEntries(
    Object.entries(stored).map(([key, sessions]) => [key.slice(MONTH_SESSIONS_PREFIX.length), sessions]),
  );
  const stats = computePublicStats(month, {
    players: players ?? [],
    sessionsByMonth,
    legacySessions: legacySessions ?? [],
    historicalStats: historicalStats ?? {},
    playerCards: playerCards ?? {},
    tournamentHistory: tournamentHistory ?? [],
    eloResetTimestamp: eloResetTimestamp ?? null,
  });
  return c.json({ month, playerCount: stats.length, availableMonths: Object.keys(sessionsByMonth).sort(), players: stats });
});

export default app;
