/**
 * Changes to shared data that the server applies to what it has stored, not to what a client
 * last saw. A client that sent a whole month back could only send its own copy, and a phone
 * that hadn't fetched the latest rounds then wrote them away.
 */
import type { GameSession } from "../src/app/components/api";
import { stripEmoji } from "../src/app/lib/players";

export function isGameSession(value: unknown): value is GameSession {
  const s = value as GameSession;
  return (
    typeof s === "object" &&
    s !== null &&
    typeof s.id === "string" &&
    s.id.length > 0 &&
    typeof s.date === "number" &&
    Array.isArray(s.players) &&
    Array.isArray(s.rounds)
  );
}

/** Newest first, like the app shows them. Saving the same session twice keeps one. */
export function addSession(sessions: GameSession[], session: GameSession): GameSession[] {
  if (sessions.some((s) => s.id === session.id)) return sessions;
  return [session, ...sessions];
}

/**
 * A whole month sent by a client, laid over the stored one: sessions it sends replace their
 * stored copy, and stored sessions it doesn't know about stay. Deleting goes through
 * delete-monthly-session, so leaving a session out never removes it.
 */
export function mergeSessions(stored: GameSession[], incoming: GameSession[]): GameSession[] {
  const incomingIds = new Set(incoming.map((s) => s.id));
  return [...incoming, ...stored.filter((s) => !incomingIds.has(s.id))].sort((a, b) => b.date - a.date);
}

export function renameInSessions(sessions: GameSession[], oldName: string, newName: string): GameSession[] {
  const swap = (p: string) => (p === oldName ? newName : p);
  return sessions.map((session) => ({
    ...session,
    players: session.players.map(swap),
    rounds: session.rounds.map((r) => ({
      ...r,
      finalists: r.finalists.map(swap) as [string, string],
      winner: swap(r.winner),
      ...(r.players ? { players: r.players.map(swap) } : {}),
    })),
  }));
}

export function renameKey<T>(record: Record<string, T>, oldName: string, newName: string): Record<string, T> {
  if (!(oldName in record)) return record;
  const { [oldName]: value, ...rest } = record;
  return { ...rest, [newName]: value };
}

/** The same name with or without its emoji counts as taken. */
export function findSamePlayer(players: string[], name: string): string | undefined {
  const lower = stripEmoji(name).toLowerCase();
  return players.find((p) => stripEmoji(p).toLowerCase() === lower);
}

export const sortPlayers = (players: string[]) => [...players].sort((a, b) => a.localeCompare(b, "sv"));
