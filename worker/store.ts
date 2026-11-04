/**
 * Key-value storage on top of D1. The app saves whole documents (the player list, a month of
 * sessions …) rather than rows, so one table of JSON values is all it needs. Keys keep the
 * names the old Supabase KV store used, so its data can be imported as is.
 *
 * Every write also bumps `rpk:version` in the same batch. Clients poll that number and only
 * fetch the data again when it has moved.
 */

export const VERSION_KEY = "rpk:version";

let schemaReady: Promise<unknown> | null = null;

function ensureSchema(db: D1Database): Promise<unknown> {
  schemaReady ??= db
    .prepare("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    .run()
    .catch((e) => {
      schemaReady = null;
      throw e;
    });
  return schemaReady;
}

export async function get<T>(db: D1Database, key: string): Promise<T | null> {
  await ensureSchema(db);
  const row = await db.prepare("SELECT value FROM kv WHERE key = ?1").bind(key).first<{ value: string }>();
  return row ? (JSON.parse(row.value) as T) : null;
}

/** All values whose key starts with `prefix`, keyed by the full key. */
export async function getByPrefix<T>(db: D1Database, prefix: string): Promise<Record<string, T>> {
  await ensureSchema(db);
  const { results } = await db
    .prepare("SELECT key, value FROM kv WHERE substr(key, 1, length(?1)) = ?1")
    .bind(prefix)
    .all<{ key: string; value: string }>();
  return Object.fromEntries(results.map((r) => [r.key, JSON.parse(r.value) as T]));
}

/** Writes and deletes (`value: null`) in one batch, together with the version bump. */
export async function write(db: D1Database, changes: { key: string; value: unknown }[]): Promise<void> {
  await ensureSchema(db);
  const statements = changes.map(({ key, value }) =>
    value === null || value === undefined
      ? db.prepare("DELETE FROM kv WHERE key = ?1").bind(key)
      : db
          .prepare("INSERT INTO kv (key, value) VALUES (?1, ?2) ON CONFLICT (key) DO UPDATE SET value = excluded.value")
          .bind(key, JSON.stringify(value)),
  );
  statements.push(
    db
      .prepare("INSERT INTO kv (key, value) VALUES (?1, '1') ON CONFLICT (key) DO UPDATE SET value = CAST(value AS INTEGER) + 1")
      .bind(VERSION_KEY),
  );
  await db.batch(statements);
}

export function set(db: D1Database, key: string, value: unknown): Promise<void> {
  return write(db, [{ key, value }]);
}
