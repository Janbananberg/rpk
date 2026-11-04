export const FONT = "'Titillium Web', sans-serif";

/** A round needs at least this many players (mirrors the check in proceedToFinalists). */
export const MIN_PLAYERS_FOR_ROUND = 5;

// ── Registration flow steps ──
export type RegStep = "select-players" | "select-finalists" | "select-winner";
