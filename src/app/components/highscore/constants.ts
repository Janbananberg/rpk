/** A round needs at least this many players (mirrors the check in proceedToFinalists). */
export const MIN_PLAYERS_FOR_ROUND = 5;

/** Players who haven't played for this many weeks are listed as inactive in the ranking. */
export const INACTIVE_WEEKS = 4;

// ── Registration flow steps ──
export type RegStep = "select-players" | "select-finalists" | "select-winner";
