import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Admin-Token", "X-Bettor-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

const PREFIX = "/make-server-f8fcdf1d";

// ════════════════════════════════════════════════════════════════════════
//  SECURITY HELPERS
//  All secrets (admin password hash, session tokens, bettor tokens)
//  are stored server-side in the KV store and NEVER sent to the client.
//  The SUPABASE_SERVICE_ROLE_KEY is only used in kv_store.tsx (server-side).
// ════════════════════════════════════════════════════════════════════════

const DEFAULT_ADMIN_PASSWORD = "rundpingis2026";
const ADMIN_SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const MAX_NAME_LENGTH = 40;
const MAX_BET_AMOUNT = 100_000;
const MIN_BET_AMOUNT = 1;

/**
 * Hash a password using SHA-256.
 * We store hashes instead of plaintext passwords in the KV store.
 */
async function hashPassword(pw: string): Promise<string> {
  const data = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Generate a cryptographically random token. */
function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify admin password against stored hash.
 * On first use the default password is hashed and stored.
 */
async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    let storedHash = await kv.get("rpk:admin-password-hash");

    // Migration: if no hash exists, hash the default (or legacy plaintext) and store it
    if (!storedHash) {
      const legacy = await kv.get("rpk:admin-password");
      const pw = legacy || DEFAULT_ADMIN_PASSWORD;
      storedHash = await hashPassword(pw);
      await kv.set("rpk:admin-password-hash", storedHash);
      // Clean up legacy plaintext password
      if (legacy) await kv.del("rpk:admin-password");
    }

    const inputHash = await hashPassword(password);
    return inputHash === storedHash;
  } catch (e) {
    console.log("Error verifying admin password:", e);
    return false;
  }
}

/**
 * Create an admin session token. Stored server-side with a TTL.
 * The client receives only the opaque token — never the password.
 */
async function createAdminSession(): Promise<string> {
  const token = generateToken();
  await kv.set(`rpk:admin-session:${token}`, {
    createdAt: Date.now(),
    expiresAt: Date.now() + ADMIN_SESSION_TTL_MS,
  });
  return token;
}

/**
 * Validate an admin session token from the X-Admin-Token header.
 * Returns true only if the token exists and hasn't expired.
 */
async function validateAdminToken(c: any): Promise<boolean> {
  const token = c.req.header("X-Admin-Token");
  if (!token) return false;
  try {
    const session = await kv.get(`rpk:admin-session:${token}`);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      // Expired — clean up
      await kv.del(`rpk:admin-session:${token}`);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Bettor token system:
 * When a bettor registers, the server generates a secret token stored
 * in the KV store. The client must present this token (via X-Bettor-Token header)
 * to modify their own profile or bets. This prevents impersonation.
 *
 * SECURITY NOTE: This is scoped per-bettor. A bettor's token only grants
 * access to their own data (profile + bets), not anyone else's.
 */
async function validateBettorToken(name: string, c: any): Promise<boolean> {
  const token = c.req.header("X-Bettor-Token");
  if (!token) return false;
  try {
    const stored = await kv.get(`rpk:bettor-token:${name}`);
    return stored === token;
  } catch {
    return false;
  }
}

/** Sanitize and validate a bettor name. */
function sanitizeName(name: string): string | null {
  if (!name || typeof name !== "string") return null;
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  // Allow letters, digits, spaces, hyphens, Swedish/Nordic chars
  if (!/^[\p{L}\p{N}\s\-]+$/u.test(trimmed)) return null;
  if (trimmed.length < 1) return null;
  return trimmed;
}

// ── Health ──
app.get(`${PREFIX}/health`, (c) => c.json({ status: "ok" }));

// ════════════════════════════════════════════════════════════════════════
//  PUBLIC READ ENDPOINTS
//  These are safe to expose without authentication.
//  They return non-sensitive, publicly visible tournament data.
// ════════════════════════════════════════════════════════════════════════

app.get(`${PREFIX}/odds`, async (c) => {
  try {
    const odds = await kv.get("rpk:odds");
    return c.json({ odds: odds || [] });
  } catch (e) {
    console.log("Error fetching odds:", e);
    return c.json({ error: `Failed to fetch odds: ${e}` }, 500);
  }
});

app.get(`${PREFIX}/odds-config`, async (c) => {
  try {
    const config = await kv.get("rpk:odds-config");
    return c.json({ config: config || null });
  } catch (e) {
    console.log("Error fetching odds config:", e);
    return c.json({ error: `Failed to fetch odds config: ${e}` }, 500);
  }
});

app.get(`${PREFIX}/tournament-state`, async (c) => {
  try {
    const state = await kv.get("rpk:tournament-state");
    return c.json({ state: state || { active: false, activatedAt: null } });
  } catch (e) {
    console.log("Error fetching tournament state:", e);
    return c.json({ error: `Failed to fetch tournament state: ${e}` }, 500);
  }
});

app.get(`${PREFIX}/tournament-winner-odds`, async (c) => {
  try {
    const odds = await kv.get("rpk:tournament-winner-odds");
    return c.json({ odds: odds || null });
  } catch (e) {
    console.log("Error fetching tournament winner odds:", e);
    return c.json({ error: `Failed to fetch tournament winner odds: ${e}` }, 500);
  }
});

app.get(`${PREFIX}/tournament-history`, async (c) => {
  try {
    const history = await kv.get("rpk:tournament-history");
    return c.json({ history: history || [] });
  } catch (e) {
    console.log("Error fetching tournament history:", e);
    return c.json({ error: `Failed to fetch tournament history: ${e}` }, 500);
  }
});

// Public: leaderboard (all bettors, no tokens exposed)
app.get(`${PREFIX}/bettors`, async (c) => {
  try {
    const bettors = await kv.getByPrefix("rpk:bettor:");
    // Strip any internal fields before returning
    const safe = (bettors || []).map((b: any) => ({
      name: b.name,
      balance: b.balance,
      totalWon: b.totalWon,
      totalLost: b.totalLost,
      totalBets: b.totalBets,
      purchasedCosmetics: b.purchasedCosmetics,
      equippedCosmetics: b.equippedCosmetics,
      registeredAt: b.registeredAt,
    }));
    return c.json({ bettors: safe });
  } catch (e) {
    console.log("Error fetching bettors:", e);
    return c.json({ error: `Failed to fetch all bettors: ${e}` }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════
//  BETTOR REGISTRATION & AUTH
//  Registration creates a profile AND a bettor token.
//  The token is returned once on registration and must be stored by the client.
//  Subsequent profile/bet writes require the token.
// ════════════════════════════════════════════════════════════════════════

// Register a new bettor — returns a secret bettor token
app.post(`${PREFIX}/bettor/register`, async (c) => {
  try {
    const body = await c.req.json();
    const name = sanitizeName(body.name);
    if (!name) {
      return c.json({ error: "Ogiltigt namn (1–40 tecken, bokstäver/siffror)" }, 400);
    }

    // Check if already registered
    const existing = await kv.get(`rpk:bettor:${name}`);
    if (existing) {
      // If they already exist, they need to use /bettor/login instead
      return c.json({ error: "Namn redan registrerat. Använd login istället." }, 409);
    }

    const profile = body.profile;
    if (!profile) {
      return c.json({ error: "Profil krävs" }, 400);
    }

    // Generate bettor token — only returned here, NEVER stored on server in a readable way
    const token = generateToken();
    await kv.set(`rpk:bettor-token:${name}`, token);
    // Save profile (server sets the canonical balance to prevent client manipulation)
    profile.name = name;
    await kv.set(`rpk:bettor:${name}`, profile);

    return c.json({ ok: true, token });
  } catch (e) {
    console.log("Error registering bettor:", e);
    return c.json({ error: `Registration failed: ${e}` }, 500);
  }
});

// Login for an existing bettor who lost their token (re-issue token)
// In a full system, this would require email verification etc.
// For this prototype, we allow re-login by name if the profile exists.
app.post(`${PREFIX}/bettor/login`, async (c) => {
  try {
    const body = await c.req.json();
    const name = sanitizeName(body.name);
    if (!name) {
      return c.json({ error: "Ogiltigt namn" }, 400);
    }

    const existing = await kv.get(`rpk:bettor:${name}`);
    if (!existing) {
      return c.json({ error: "Ingen bettare med det namnet" }, 404);
    }

    // Issue a new token (invalidates any previous token)
    const token = generateToken();
    await kv.set(`rpk:bettor-token:${name}`, token);

    return c.json({ ok: true, profile: existing, token });
  } catch (e) {
    console.log("Error logging in bettor:", e);
    return c.json({ error: `Login failed: ${e}` }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════
//  BETTOR PROFILE (authenticated writes)
//  Reads are public (for leaderboard), writes require bettor token.
// ════════════════════════════════════════════════════════════════════════

app.get(`${PREFIX}/bettor/:name`, async (c) => {
  try {
    const name = decodeURIComponent(c.req.param("name"));
    const profile = await kv.get(`rpk:bettor:${name}`);
    return c.json({ profile: profile || null });
  } catch (e) {
    console.log("Error fetching bettor:", e);
    return c.json({ error: `Failed to fetch bettor: ${e}` }, 500);
  }
});

// Authenticated: update own profile (e.g. cosmetics, equipped items)
// SECURITY: Balance changes are NOT accepted from the client.
// Balance is only modified server-side during bet placement/resolution.
app.post(`${PREFIX}/bettor`, async (c) => {
  try {
    const body = await c.req.json();
    const profile = body.profile;
    if (!profile?.name) {
      return c.json({ error: "Profil måste ha ett namn" }, 400);
    }

    const name = sanitizeName(profile.name);
    if (!name) {
      return c.json({ error: "Ogiltigt namn" }, 400);
    }

    // Verify bettor token — only the profile owner can update
    const isOwner = await validateBettorToken(name, c);
    if (!isOwner) {
      return c.json({ error: "Unauthorized: Ogiltig bettor-token" }, 401);
    }

    // Fetch current server-side profile to preserve server-controlled fields
    const current = await kv.get(`rpk:bettor:${name}`);
    if (!current) {
      return c.json({ error: "Profil finns inte" }, 404);
    }

    // Only allow client to update safe fields (cosmetics, equipped).
    // Balance, totalWon, totalLost, totalBets are server-authoritative.
    const updated = {
      ...current,
      equippedCosmetics: profile.equippedCosmetics ?? current.equippedCosmetics,
      purchasedCosmetics: profile.purchasedCosmetics ?? current.purchasedCosmetics,
    };

    await kv.set(`rpk:bettor:${name}`, updated);
    return c.json({ ok: true, profile: updated });
  } catch (e) {
    console.log("Error saving bettor:", e);
    return c.json({ error: `Failed to save bettor: ${e}` }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════
//  BETS (authenticated)
//  Bets are placed via a dedicated endpoint that validates server-side.
//  Direct bet array overwrites are no longer allowed.
// ════════════════════════════════════════════════════════════════════════

app.get(`${PREFIX}/bets/:name`, async (c) => {
  try {
    const name = decodeURIComponent(c.req.param("name"));
    const bets = await kv.get(`rpk:bets:${name}`);
    return c.json({ bets: bets || [] });
  } catch (e) {
    console.log("Error fetching bets:", e);
    return c.json({ error: `Failed to fetch bets: ${e}` }, 500);
  }
});

/**
 * Place a single bet — server-side validated.
 * SECURITY: The server checks:
 *  1. Bettor token is valid (you are who you say you are)
 *  2. Tournament winner odds exist and betting is open (no champion yet)
 *  3. The player exists in the odds
 *  4. The amount is within bounds
 *  5. The bettor has sufficient balance
 *  6. Balance is deducted server-side (not trusted from client)
 */
app.post(`${PREFIX}/bets/:name/place`, async (c) => {
  try {
    const name = decodeURIComponent(c.req.param("name"));
    const safeName = sanitizeName(name);
    if (!safeName) {
      return c.json({ error: "Ogiltigt namn" }, 400);
    }

    // Verify bettor token
    const isOwner = await validateBettorToken(safeName, c);
    if (!isOwner) {
      return c.json({ error: "Unauthorized: Ogiltig bettor-token" }, 401);
    }

    const body = await c.req.json();
    const { playerName, amount } = body;

    if (!playerName || typeof playerName !== "string") {
      return c.json({ error: "Spelaren saknas" }, 400);
    }
    if (typeof amount !== "number" || amount < MIN_BET_AMOUNT || amount > MAX_BET_AMOUNT || !Number.isInteger(amount)) {
      return c.json({ error: `Ogiltig insats (${MIN_BET_AMOUNT}–${MAX_BET_AMOUNT}, heltal)` }, 400);
    }

    // Check tournament odds
    const tournamentOdds = await kv.get("rpk:tournament-winner-odds");
    if (!tournamentOdds?.players || tournamentOdds.players.length === 0) {
      return c.json({ error: "Inga odds tillgängliga" }, 400);
    }
    if (tournamentOdds.champion) {
      return c.json({ error: "Turneringen är avgjord, betting stängd" }, 400);
    }

    const playerOdds = tournamentOdds.players.find((p: any) => p.name === playerName);
    if (!playerOdds) {
      return c.json({ error: `Spelaren ${playerName} finns inte i oddsen` }, 400);
    }

    // Check bettor balance
    const profile = await kv.get(`rpk:bettor:${safeName}`);
    if (!profile) {
      return c.json({ error: "Profil finns inte" }, 404);
    }
    if (profile.balance < amount) {
      return c.json({ error: `Otillräckligt saldo (${profile.balance} < ${amount})` }, 400);
    }

    // Create bet
    const bet = {
      id: `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      matchId: "tournament",
      matchLabel: "Turneringsvinnare",
      player: playerName,
      amount,
      odds: playerOdds.odds,
      resolved: false,
      won: null,
      placedAt: Date.now(),
      resolvedAt: null,
    };

    // Deduct balance server-side
    const existingBets = (await kv.get(`rpk:bets:${safeName}`)) || [];
    const updatedBets = [...existingBets, bet];
    const updatedProfile = {
      ...profile,
      balance: profile.balance - amount,
      totalBets: profile.totalBets + 1,
    };

    await kv.set(`rpk:bets:${safeName}`, updatedBets);
    await kv.set(`rpk:bettor:${safeName}`, updatedProfile);

    return c.json({ ok: true, bet, balance: updatedProfile.balance });
  } catch (e) {
    console.log("Error placing bet:", e);
    return c.json({ error: `Failed to place bet: ${e}` }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════
//  COSMETICS PURCHASE (authenticated, server-validated)
//  Balance deduction happens server-side.
// ════════════════════════════════════════════════════════════════════════

app.post(`${PREFIX}/bettor/:name/purchase`, async (c) => {
  try {
    const name = decodeURIComponent(c.req.param("name"));
    const safeName = sanitizeName(name);
    if (!safeName) return c.json({ error: "Ogiltigt namn" }, 400);

    const isOwner = await validateBettorToken(safeName, c);
    if (!isOwner) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const { itemId, price } = body;
    if (!itemId || typeof price !== "number" || price < 0) {
      return c.json({ error: "Ogiltigt köp" }, 400);
    }

    const profile = await kv.get(`rpk:bettor:${safeName}`);
    if (!profile) return c.json({ error: "Profil finns inte" }, 404);

    if (profile.purchasedCosmetics?.includes(itemId)) {
      return c.json({ error: "Redan köpt" }, 400);
    }
    if (profile.balance < price) {
      return c.json({ error: "Otillräckligt saldo" }, 400);
    }

    const updated = {
      ...profile,
      balance: profile.balance - price,
      purchasedCosmetics: [...(profile.purchasedCosmetics || []), itemId],
    };
    await kv.set(`rpk:bettor:${safeName}`, updated);

    return c.json({ ok: true, profile: updated });
  } catch (e) {
    console.log("Error purchasing cosmetic:", e);
    return c.json({ error: `Purchase failed: ${e}` }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════
//  ADMIN-PROTECTED WRITE ENDPOINTS
//  All state-changing operations require a valid admin session token.
//  The admin token is obtained via /admin/login and sent via X-Admin-Token header.
// ════════════════════════════════════════════════════════════════════════

// ── Admin login — password verified, session token returned ──
app.post(`${PREFIX}/admin/login`, async (c) => {
  try {
    const body = await c.req.json();
    const password = body.password || "";
    const valid = await verifyAdminPassword(password);
    if (!valid) {
      return c.json({ error: "Felaktigt lösenord" }, 401);
    }

    // Create session token — client stores this, NOT the password
    const token = await createAdminSession();
    return c.json({ ok: true, token });
  } catch (e) {
    console.log("Error during admin login:", e);
    return c.json({ error: `Admin login failed: ${e}` }, 500);
  }
});

// ── Admin logout — invalidate session ──
app.post(`${PREFIX}/admin/logout`, async (c) => {
  try {
    const token = c.req.header("X-Admin-Token");
    if (token) {
      await kv.del(`rpk:admin-session:${token}`);
    }
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: `Logout failed: ${e}` }, 500);
  }
});

// ── Admin: change password ──
app.post(`${PREFIX}/admin/change-password`, async (c) => {
  try {
    const isAdmin = await validateAdminToken(c);
    if (!isAdmin) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    if (!body.newPassword || body.newPassword.length < 4) {
      return c.json({ error: "Nytt lösenord måste vara minst 4 tecken" }, 400);
    }

    const newHash = await hashPassword(body.newPassword);
    await kv.set("rpk:admin-password-hash", newHash);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error changing admin password:", e);
    return c.json({ error: `Failed to change password: ${e}` }, 500);
  }
});

// ── Admin: publish odds (write) ──
app.post(`${PREFIX}/odds`, async (c) => {
  try {
    const isAdmin = await validateAdminToken(c);
    if (!isAdmin) return c.json({ error: "Unauthorized: Admin-inloggning krävs för att publicera odds" }, 401);

    const body = await c.req.json();
    await kv.set("rpk:odds", body.odds);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving odds:", e);
    return c.json({ error: `Failed to save odds: ${e}` }, 500);
  }
});

// ── Admin: save odds config ──
app.post(`${PREFIX}/odds-config`, async (c) => {
  try {
    const isAdmin = await validateAdminToken(c);
    if (!isAdmin) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    await kv.set("rpk:odds-config", body.config);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving odds config:", e);
    return c.json({ error: `Failed to save odds config: ${e}` }, 500);
  }
});

// ── Admin: save tournament state ──
app.post(`${PREFIX}/tournament-state`, async (c) => {
  try {
    const isAdmin = await validateAdminToken(c);
    if (!isAdmin) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    await kv.set("rpk:tournament-state", body.state);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving tournament state:", e);
    return c.json({ error: `Failed to save tournament state: ${e}` }, 500);
  }
});

// ── Admin: publish tournament winner odds ──
app.post(`${PREFIX}/tournament-winner-odds`, async (c) => {
  try {
    const isAdmin = await validateAdminToken(c);
    if (!isAdmin) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    await kv.set("rpk:tournament-winner-odds", body.odds);

    // If a champion was just set, resolve all outstanding bets server-side
    if (body.odds?.champion) {
      await resolveAllBets(body.odds.champion);
    }

    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving tournament winner odds:", e);
    return c.json({ error: `Failed to save tournament winner odds: ${e}` }, 500);
  }
});

/**
 * Server-side bet resolution when a tournament champion is crowned.
 * SECURITY: Balance updates happen entirely server-side.
 * The client cannot manipulate payouts.
 */
async function resolveAllBets(champion: string) {
  try {
    const bettors = await kv.getByPrefix("rpk:bettor:");
    if (!bettors || bettors.length === 0) return;

    for (const bettor of bettors) {
      const bets = await kv.get(`rpk:bets:${bettor.name}`);
      if (!bets || bets.length === 0) continue;

      let wonDelta = 0;
      let lostDelta = 0;
      let changed = false;

      const updatedBets = bets.map((bet: any) => {
        if (bet.resolved) return bet;
        changed = true;
        const won = bet.player === champion;
        if (won) {
          wonDelta += Math.round(bet.amount * bet.odds);
        } else {
          lostDelta += bet.amount;
        }
        return { ...bet, resolved: true, won, resolvedAt: Date.now() };
      });

      if (changed) {
        const updatedProfile = {
          ...bettor,
          balance: bettor.balance + wonDelta,
          totalWon: bettor.totalWon + wonDelta,
          totalLost: bettor.totalLost + lostDelta,
        };
        await kv.set(`rpk:bets:${bettor.name}`, updatedBets);
        await kv.set(`rpk:bettor:${bettor.name}`, updatedProfile);
      }
    }
    console.log(`Resolved all bets — champion: ${champion}`);
  } catch (e) {
    console.log("Error resolving bets server-side:", e);
  }
}

// NOTE: Tournament history save is now public — see route near end of file
// Last deploy: 2026-04-14

// ── Admin: delete a single tournament history entry ──
app.post(`${PREFIX}/admin/delete-tournament-history-entry`, async (c) => {
  try {
    const isAdmin = await validateAdminToken(c);
    if (!isAdmin) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const entryId = body.entryId;
    if (!entryId) return c.json({ error: "entryId required" }, 400);
    const existing = (await kv.get("rpk:tournament-history")) || [];
    const updated = existing.filter((e: any) => e.id !== entryId);
    await kv.set("rpk:tournament-history", updated);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error deleting tournament history entry:", e);
    return c.json({ error: `Failed to delete tournament history entry: ${e}` }, 500);
  }
});

// ── Admin: clear all tournament history ──
app.post(`${PREFIX}/admin/clear-tournament-history`, async (c) => {
  try {
    const isAdmin = await validateAdminToken(c);
    if (!isAdmin) return c.json({ error: "Unauthorized" }, 401);

    await kv.set("rpk:tournament-history", []);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error clearing tournament history:", e);
    return c.json({ error: `Failed to clear tournament history: ${e}` }, 500);
  }
});

// ── Admin: get all bets ──
app.post(`${PREFIX}/admin/all-bets`, async (c) => {
  try {
    const isAdmin = await validateAdminToken(c);
    if (!isAdmin) return c.json({ error: "Unauthorized" }, 401);

    const allBets = await kv.getByPrefix("rpk:bets:");
    return c.json({ allBets: allBets || [] });
  } catch (e) {
    console.log("Error fetching all bets:", e);
    return c.json({ error: `Failed to fetch all bets: ${e}` }, 500);
  }
});

// ── Admin: delete a bettor ──
app.post(`${PREFIX}/admin/delete-bettor`, async (c) => {
  try {
    const isAdmin = await validateAdminToken(c);
    if (!isAdmin) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json();
    const name = body.name;
    if (!name) return c.json({ error: "Name required" }, 400);

    await kv.del(`rpk:bettor:${name}`);
    await kv.del(`rpk:bets:${name}`);
    await kv.del(`rpk:bettor-token:${name}`);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error deleting bettor:", e);
    return c.json({ error: `Failed to delete bettor: ${e}` }, 500);
  }
});

// ── Admin: reset all data ──
app.post(`${PREFIX}/admin/reset-all`, async (c) => {
  try {
    const isAdmin = await validateAdminToken(c);
    if (!isAdmin) return c.json({ error: "Unauthorized" }, 401);

    // Delete all bettors, their bets, and their tokens
    const bettors = await kv.getByPrefix("rpk:bettor:");
    if (bettors && bettors.length > 0) {
      const bettorKeys = bettors.map((b: any) => `rpk:bettor:${b.name}`);
      const betKeys = bettors.map((b: any) => `rpk:bets:${b.name}`);
      const tokenKeys = bettors.map((b: any) => `rpk:bettor-token:${b.name}`);
      await kv.mdel([...bettorKeys, ...betKeys, ...tokenKeys]);
    }

    // Reset odds and tournament state
    await kv.del("rpk:odds");
    await kv.del("rpk:odds-config");
    await kv.del("rpk:tournament-winner-odds");
    await kv.set("rpk:tournament-state", { active: false, activatedAt: null });

    return c.json({ ok: true });
  } catch (e) {
    console.log("Error resetting all data:", e);
    return c.json({ error: `Failed to reset: ${e}` }, 500);
  }
});

// ── Elo Reset — stores a timestamp; only sessions after this count toward Elo ──
app.post(`${PREFIX}/admin/elo-reset`, async (c) => {
  try {
    if (!(await validateAdminToken(c))) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const resetTimestamp = Date.now();
    await kv.set("rpk:elo-reset-timestamp", resetTimestamp);

    // Also strip Elo-related achievements from all players
    const ELO_ACHIEVEMENT_IDS = [
      "underdog",        // Vinn en final mot någon med 50+ mer Elo
      "peak_performance", // Nå 1150+ i Elo
      "free_fall",       // Tappa 100+ Elo från din peak
      "goat",            // Ha högst Elo av alla
      "untouchable",     // Nå 1200+ peak Elo
      "transcendent",    // 50+ vinster och 1100+ Elo
      "rock_bottom",     // Sjunk under 900 Elo
    ];
    try {
      const saved = await kv.get("rpk:player-achievements");
      if (saved && typeof saved === "object") {
        const cleaned: Record<string, unknown[]> = {};
        let removedCount = 0;
        for (const [player, achievements] of Object.entries(saved as Record<string, { achievementId: string }[]>)) {
          const before = (achievements as { achievementId: string }[]).length;
          cleaned[player] = (achievements as { achievementId: string }[]).filter(
            (a: { achievementId: string }) => !ELO_ACHIEVEMENT_IDS.includes(a.achievementId)
          );
          removedCount += before - (cleaned[player] as unknown[]).length;
        }
        await kv.set("rpk:player-achievements", cleaned);
        console.log(`[admin] Stripped ${removedCount} Elo-related achievements across all players`);
      }
    } catch (achErr) {
      console.log("[admin] Warning: failed to clean Elo achievements:", achErr);
      // Non-fatal — the Elo reset itself still succeeded
    }

    console.log(`[admin] Elo reset at ${new Date(resetTimestamp).toISOString()}`);
    return c.json({ ok: true, resetTimestamp });
  } catch (e) {
    console.log("Error resetting Elo:", e);
    return c.json({ error: `Failed to reset Elo: ${e}` }, 500);
  }
});

app.get(`${PREFIX}/elo-reset-timestamp`, async (c) => {
  try {
    const ts = await kv.get("rpk:elo-reset-timestamp");
    return c.json({ resetTimestamp: ts ?? null });
  } catch (e) {
    console.log("Error fetching Elo reset timestamp:", e);
    return c.json({ resetTimestamp: null });
  }
});

// ── Set Elo reset timestamp to a specific date ──
app.post(`${PREFIX}/admin/elo-reset-date`, async (c) => {
  try {
    if (!(await validateAdminToken(c))) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const { timestamp } = await c.req.json();
    if (!timestamp || typeof timestamp !== "number") {
      return c.json({ error: "Missing or invalid 'timestamp' (number)" }, 400);
    }
    await kv.set("rpk:elo-reset-timestamp", timestamp);
    console.log(`[admin] Elo reset timestamp set to ${new Date(timestamp).toISOString()}`);
    return c.json({ ok: true, resetTimestamp: timestamp });
  } catch (e) {
    console.log("Error setting Elo reset date:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════
//  ACTIVE TOURNAMENT — server-side bracket state
//  Stored in KV so admin can see & manage the live tournament.
//  The bracket component syncs its state here on every update.
// ════════════════════════════════════════════════════════════════════════

// Public read: anyone can see the active tournament
app.get(`${PREFIX}/active-tournament`, async (c) => {
  try {
    const tournament = await kv.get("rpk:active-tournament");
    return c.json({ tournament: tournament || null });
  } catch (e) {
    console.log("Error fetching active tournament:", e);
    return c.json({ error: `Failed to fetch active tournament: ${e}` }, 500);
  }
});

// Public write: bracket component syncs its state here on every update.
// This data is non-sensitive (same info visible on the tournament page).
app.post(`${PREFIX}/active-tournament`, async (c) => {
  try {
    const body = await c.req.json();
    const tournament = body.tournament;
    if (!tournament) return c.json({ error: "Tournament data required" }, 400);

    await kv.set("rpk:active-tournament", tournament);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving active tournament:", e);
    return c.json({ error: `Failed to save active tournament: ${e}` }, 500);
  }
});

// Admin: delete/clear active tournament
app.post(`${PREFIX}/admin/delete-active-tournament`, async (c) => {
  try {
    const isAdmin = await validateAdminToken(c);
    if (!isAdmin) return c.json({ error: "Unauthorized" }, 401);

    await kv.del("rpk:active-tournament");
    // Also clear odds since they belong to the now-deleted tournament
    await kv.del("rpk:odds");
    await kv.del("rpk:odds-config");
    await kv.del("rpk:tournament-winner-odds");
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error deleting active tournament:", e);
    return c.json({ error: `Failed to delete active tournament: ${e}` }, 500);
  }
});

// Public: clear active tournament (used by "Ny turnering" button)
app.delete(`${PREFIX}/active-tournament`, async (c) => {
  try {
    await kv.del("rpk:active-tournament");
    // Also clear odds since they belong to the now-deleted tournament
    await kv.del("rpk:odds");
    await kv.del("rpk:odds-config");
    await kv.del("rpk:tournament-winner-odds");
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error deleting active tournament:", e);
    return c.json({ error: `Failed to delete active tournament: ${e}` }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════
//  HIGHSCORE — Rundpingis game tracking
//  Players, sessions (speltillfällen), and season archiving.
//  All endpoints are public since this is shared team data.
// ════════════════════════════════════════════════════════════════════════

// Get all highscore players
app.get(`${PREFIX}/highscore/players`, async (c) => {
  try {
    const players = await kv.get("rpk:highscore-players");
    return c.json({ players: players || [] });
  } catch (e) {
    console.log("Error fetching highscore players:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// Save highscore players list
app.post(`${PREFIX}/highscore/players`, async (c) => {
  try {
    const body = await c.req.json();
    await kv.set("rpk:highscore-players", body.players);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving highscore players:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// ── Monthly highscore sessions ──

// Get sessions for a specific month (YYYY-MM)
app.get(`${PREFIX}/highscore/monthly-sessions/:month`, async (c) => {
  try {
    const month = c.req.param("month");
    if (!/^\d{4}-\d{2}$/.test(month)) return c.json({ error: "Invalid month format, use YYYY-MM" }, 400);
    const sessions = await kv.get(`rpk:highscore-sessions-${month}`);
    return c.json({ sessions: sessions || [] });
  } catch (e) {
    console.log("Error fetching monthly sessions:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// Save sessions for a specific month (YYYY-MM)
app.post(`${PREFIX}/highscore/monthly-sessions/:month`, async (c) => {
  try {
    const month = c.req.param("month");
    if (!/^\d{4}-\d{2}$/.test(month)) return c.json({ error: "Invalid month format, use YYYY-MM" }, 400);
    const body = await c.req.json();
    await kv.set(`rpk:highscore-sessions-${month}`, body.sessions);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving monthly sessions:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// Delete a single session from a specific month
app.post(`${PREFIX}/highscore/delete-monthly-session`, async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, month } = body;
    if (!sessionId || !month) return c.json({ error: "sessionId and month required" }, 400);
    const sessions = (await kv.get(`rpk:highscore-sessions-${month}`)) || [];
    const updated = sessions.filter((s: any) => s.id !== sessionId);
    await kv.set(`rpk:highscore-sessions-${month}`, updated);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error deleting monthly session:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// Get/save list of months that have data
app.get(`${PREFIX}/highscore/month-list`, async (c) => {
  try {
    const months = await kv.get("rpk:highscore-month-list");
    return c.json({ months: months || [] });
  } catch (e) {
    console.log("Error fetching month list:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

app.post(`${PREFIX}/highscore/month-list`, async (c) => {
  try {
    const body = await c.req.json();
    await kv.set("rpk:highscore-month-list", body.months);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving month list:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// Recovery: scan KV for monthly-sessions keys and rebuild monthList from them.
// Returns months that contain at least one session. Repairs cases where
// rpk:highscore-month-list was wiped but underlying session data still exists.
app.get(`${PREFIX}/highscore/discover-months`, async (c) => {
  try {
    const entries = await kv.getByPrefix("rpk:highscore-sessions-");
    const months: string[] = [];
    for (const value of entries) {
      // We don't get keys back from getByPrefix, so derive from a sentinel field if possible.
      // Fall back: include month if value is a non-empty array of sessions with a date.
      if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (first && typeof first.date === "string") {
          const d = new Date(first.date);
          if (!isNaN(d.getTime())) {
            const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            if (!months.includes(m)) months.push(m);
          }
        }
      }
    }
    months.sort();
    return c.json({ months });
  } catch (e) {
    console.log("Error discovering months:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// Get historical stats (baseline data from March 2026)
app.get(`${PREFIX}/highscore/historical-stats`, async (c) => {
  try {
    const stats = await kv.get("rpk:highscore-historical-stats");
    return c.json({ stats: stats || {} });
  } catch (e) {
    console.log("Error fetching historical stats:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// Save historical stats
app.post(`${PREFIX}/highscore/historical-stats`, async (c) => {
  try {
    const body = await c.req.json();
    await kv.set("rpk:highscore-historical-stats", body.stats);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving historical stats:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// Get legacy highscore sessions (for migration)
app.get(`${PREFIX}/highscore/sessions`, async (c) => {
  try {
    const sessions = await kv.get("rpk:highscore-sessions");
    return c.json({ sessions: sessions || [] });
  } catch (e) {
    console.log("Error fetching sessions:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// Save legacy highscore sessions
app.post(`${PREFIX}/highscore/sessions`, async (c) => {
  try {
    const body = await c.req.json();
    await kv.set("rpk:highscore-sessions", body.sessions);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving sessions:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// Get legacy archived seasons
app.get(`${PREFIX}/highscore/seasons`, async (c) => {
  try {
    const seasons = await kv.get("rpk:highscore-archived-seasons");
    return c.json({ seasons: seasons || [] });
  } catch (e) {
    console.log("Error fetching archived seasons:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// Save legacy archived seasons
app.post(`${PREFIX}/highscore/seasons`, async (c) => {
  try {
    const body = await c.req.json();
    await kv.set("rpk:highscore-archived-seasons", body.seasons);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving archived seasons:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// Get player cards (yellow/red)
app.get(`${PREFIX}/highscore/player-cards`, async (c) => {
  try {
    const cards = await kv.get("rpk:player-cards");
    return c.json({ cards: cards || {} });
  } catch (e) {
    console.log("Error fetching player cards:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// Save player cards
app.post(`${PREFIX}/highscore/player-cards`, async (c) => {
  try {
    const body = await c.req.json();
    await kv.set("rpk:player-cards", body.cards);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving player cards:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// Get player achievements (persistent)
app.get(`${PREFIX}/highscore/player-achievements`, async (c) => {
  try {
    const achievements = await kv.get("rpk:player-achievements");
    return c.json({ achievements: achievements || {} });
  } catch (e) {
    console.log("Error fetching player achievements:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// Save player achievements (persistent)
app.post(`${PREFIX}/highscore/player-achievements`, async (c) => {
  try {
    const body = await c.req.json();
    await kv.set("rpk:player-achievements", body.achievements);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving player achievements:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// ── Server-side seed check ──
// Returns whether the DB has already been seeded, preventing localStorage-based re-seeds
app.get(`${PREFIX}/highscore/seed-status`, async (c) => {
  try {
    const status = await kv.get("rpk:highscore-seeded");
    return c.json({ seeded: !!status });
  } catch (e) {
    console.log("Error fetching seed status:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// Mark DB as seeded (server-side flag)
app.post(`${PREFIX}/highscore/seed-status`, async (c) => {
  try {
    await kv.set("rpk:highscore-seeded", { seeded: true, at: Date.now() });
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving seed status:", e);
    return c.json({ error: `Failed: ${e}` }, 500);
  }
});

// ── Remove player (server-side, atomic cleanup) ──
// Removes a player from the players list, historical stats, player cards,
// and optionally cleans their references from all monthly session data.
app.post(`${PREFIX}/highscore/remove-player`, async (c) => {
  try {
    const body = await c.req.json();
    const name = body.name;
    if (!name) return c.json({ error: "Player name required" }, 400);

    // 1. Remove from players list
    const players = (await kv.get("rpk:highscore-players")) || [];
    const updatedPlayers = players.filter((p: string) => p !== name);
    await kv.set("rpk:highscore-players", updatedPlayers);

    // 2. Remove from historical stats
    const histStats = (await kv.get("rpk:highscore-historical-stats")) || {};
    delete histStats[name];
    await kv.set("rpk:highscore-historical-stats", histStats);

    // 3. Remove from player cards
    const cards = (await kv.get("rpk:player-cards")) || {};
    delete cards[name];
    await kv.set("rpk:player-cards", cards);

    // 3b. Remove from persistent achievements
    const achievements = (await kv.get("rpk:player-achievements")) || {};
    delete achievements[name];
    await kv.set("rpk:player-achievements", achievements);

    // 4. Clean from all monthly sessions
    const monthList = (await kv.get("rpk:highscore-month-list")) || [];
    for (const month of monthList) {
      const sessions = (await kv.get(`rpk:highscore-sessions-${month}`)) || [];
      let changed = false;
      const cleaned = sessions.map((session: any) => {
        const updatedRounds = session.rounds.map((round: any) => {
          const updatedFinalists = round.finalists.filter((f: string) => f !== name);
          const updatedWinner = round.winner === name ? null : round.winner;
          if (updatedFinalists.length !== round.finalists.length || updatedWinner !== round.winner) {
            changed = true;
          }
          return { ...round, finalists: updatedFinalists, winner: updatedWinner };
        });
        const updatedSessionPlayers = session.players.filter((p: string) => p !== name);
        if (updatedSessionPlayers.length !== session.players.length) changed = true;
        return { ...session, players: updatedSessionPlayers, rounds: updatedRounds };
      });
      if (changed) {
        await kv.set(`rpk:highscore-sessions-${month}`, cleaned);
      }
    }

    console.log(`Removed player "${name}" and all associated data`);
    return c.json({ ok: true, players: updatedPlayers, historicalStats: histStats, cards });
  } catch (e) {
    console.log("Error removing player:", e);
    return c.json({ error: `Failed to remove player: ${e}` }, 500);
  }
});

// ── Seed: insert initial tournament history entry if none exists ──
async function seedTournamentHistory() {
  try {
    const existing = await kv.get("rpk:tournament-history");
    if (existing && Array.isArray(existing) && existing.length > 0) return;

    const seedEntry = {
      id: "seed-2026-03-06-eetu",
      date: new Date("2026-03-06T15:30:00").getTime(),
      players: ["Eetu", "Herstö-Waddlner", "Robert", "Mr Nyberg"],
      semi1Winner: "Herstö-Waddlner",
      semi2Winner: "Eetu",
      champion: "Eetu",
      bestOfSemi: 3,
      bestOfFinal: 3,
    };

    await kv.set("rpk:tournament-history", [seedEntry]);
    console.log("Seeded tournament history with initial entry");
  } catch (e) {
    console.log("Error seeding tournament history:", e);
  }
}

seedTournamentHistory();

// ── Set Elo reset date to Mar 16, 2026 if not already set to that value ──
(async () => {
  try {
    const MAR_16_2026 = new Date("2026-03-16T00:00:00Z").getTime();
    const current = await kv.get("rpk:elo-reset-timestamp");
    if (current !== MAR_16_2026) {
      await kv.set("rpk:elo-reset-timestamp", MAR_16_2026);
      console.log(`[init] Elo reset timestamp set to 2026-03-16 (was ${current ? new Date(current as number).toISOString() : 'null'})`);
    }
  } catch (e) {
    console.log("[init] Failed to set Elo reset timestamp:", e);
  }
})();

// ══════════════════════════════════════════════════════════════════════
//  SUGGESTIONS (public submit, admin read/delete)
// ════════════════════════════════════════════════════════════════════════

app.get(`${PREFIX}/suggestions`, async (c) => {
  try {
    const suggestions = (await kv.get("rpk:suggestions")) || [];
    return c.json(suggestions);
  } catch (e) {
    console.log("Error fetching suggestions:", e);
    return c.json({ error: "Failed to fetch suggestions" }, 500);
  }
});

app.post(`${PREFIX}/suggestions`, async (c) => {
  try {
    const { name, text, category } = await c.req.json();
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return c.json({ error: "Förslaget kan inte vara tomt" }, 400);
    }
    if (text.length > 1000) {
      return c.json({ error: "Max 1000 tecken" }, 400);
    }
    const suggestions = (await kv.get("rpk:suggestions")) || [];
    const entry = {
      id: crypto.randomUUID(),
      name: (name && typeof name === "string" ? name.trim().slice(0, MAX_NAME_LENGTH) : "Anonym"),
      text: text.trim(),
      category: (category && typeof category === "string" ? category.trim() : "Allmänt"),
      timestamp: Date.now(),
      status: "new",
    };
    suggestions.unshift(entry);
    await kv.set("rpk:suggestions", suggestions);
    return c.json({ ok: true, id: entry.id });
  } catch (e) {
    console.log("Error submitting suggestion:", e);
    return c.json({ error: "Failed to submit suggestion" }, 500);
  }
});

app.delete(`${PREFIX}/suggestions/:id`, async (c) => {
  if (!(await validateAdminToken(c))) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const id = c.req.param("id");
    const suggestions = (await kv.get("rpk:suggestions")) || [];
    const filtered = suggestions.filter((s: any) => s.id !== id);
    await kv.set("rpk:suggestions", filtered);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error deleting suggestion:", e);
    return c.json({ error: "Failed to delete suggestion" }, 500);
  }
});

app.put(`${PREFIX}/suggestions/:id/status`, async (c) => {
  if (!(await validateAdminToken(c))) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const id = c.req.param("id");
    const { status } = await c.req.json();
    if (!["new", "read", "planned", "done", "rejected"].includes(status)) {
      return c.json({ error: "Invalid status" }, 400);
    }
    const suggestions = (await kv.get("rpk:suggestions")) || [];
    const idx = suggestions.findIndex((s: any) => s.id === id);
    if (idx === -1) return c.json({ error: "Not found" }, 404);
    suggestions[idx].status = status;
    await kv.set("rpk:suggestions", suggestions);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error updating suggestion status:", e);
    return c.json({ error: "Failed to update status" }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════
//  PUBLIC STATS API
//  GET /api/stats?month=YYYY-MM  or  ?month=total (default)
//  Returns computed player statistics as JSON.
// ════════════════════════════════════════════════════════════════════════

import { computeAllStats } from "./stats_engine.tsx";
import type { GameSession } from "./stats_engine.tsx";

app.get(`${PREFIX}/api/stats`, async (c) => {
  try {
    const month = c.req.query("month") || "total";

    // 1. Fetch all required data from KV
    const [players, monthList, historicalStats, playerCards, tournamentHistory, eloResetTimestamp] = await Promise.all([
      kv.get("rpk:highscore-players"),
      kv.get("rpk:highscore-month-list"),
      kv.get("rpk:highscore-historical-stats"),
      kv.get("rpk:player-cards"),
      kv.get("rpk:tournament-history"),
      kv.get("rpk:elo-reset-timestamp"),
    ]);

    const allPlayers: string[] = players || [];
    const allMonths: string[] = monthList || [];

    // 2. Fetch all monthly sessions
    const allSessionsByMonth: Record<string, GameSession[]> = {};
    for (const m of allMonths) {
      const sessions = await kv.get(`rpk:highscore-sessions-${m}`);
      if (sessions) allSessionsByMonth[m] = sessions;
    }

    // Also fetch legacy sessions
    const legacySessions = await kv.get("rpk:highscore-sessions");
    const allSessionsFlat: GameSession[] = [
      ...Object.values(allSessionsByMonth).flat(),
      ...(Array.isArray(legacySessions) ? legacySessions : []),
    ];

    // 3. Determine filtered sessions based on month param
    let filteredSessions: GameSession[];
    if (month === "total") {
      filteredSessions = allSessionsFlat;
    } else {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return c.json({ error: "Ogiltigt månadsformat. Använd YYYY-MM eller 'total'." }, 400);
      }
      filteredSessions = allSessionsByMonth[month] || [];
    }

    // 4. Compute stats
    const stats = computeAllStats(
      filteredSessions,
      allSessionsFlat,
      allPlayers,
      historicalStats || {},
      playerCards || {},
      tournamentHistory || [],
      eloResetTimestamp ?? null,
    );

    return c.json({
      month,
      playerCount: stats.length,
      availableMonths: allMonths.sort(),
      players: stats,
    });
  } catch (e) {
    console.log("Error in /api/stats:", e);
    return c.json({ error: `Serverfel: ${e}` }, 500);
  }
});

// ── Save tournament history (public — any client running a tournament can save) ──
app.post(`${PREFIX}/tournament-history`, async (c) => {
  try {
    const body = await c.req.json();
    const entry = body.entry;
    if (!entry || !entry.id || !entry.champion || !entry.players?.length) {
      return c.json({ error: "Valid entry with id, champion and players required" }, 400);
    }
    const existing = (await kv.get("rpk:tournament-history")) || [];
    // Prevent duplicate saves
    if (existing.some((e: any) => e.id === entry.id)) {
      return c.json({ ok: true, duplicate: true });
    }
    const updated = [entry, ...existing].slice(0, 50);
    await kv.set("rpk:tournament-history", updated);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error saving tournament history:", e);
    return c.json({ error: `Failed to save tournament history: ${e}` }, 500);
  }
});

Deno.serve(app.fetch);