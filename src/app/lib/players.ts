/** Strip leading emoji(s) from a player name to get the plain text part */
export function stripEmoji(name: string | null | undefined): string {
  if (!name) return "";
  return name.replace(/^(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}|\u200d|\ufe0f|[\u{1f3fb}-\u{1f3ff}])+\s*/gu, "").trim();
}

export const PLAYER_EMOJIS = [
  "🏓", "🔥", "🧀", "⚡", "🎯", "💀", "🐐", "🦊",
  "🧊", "🌪️", "🎪", "🍕", "🦈", "🐍", "🎸", "🚀",
  "👑", "🎰", "🐸", "🍻", "💎", "🦁", "🐉", "🌶️",
  "🤖", "🧨", "🎩", "🦅", "🐝", "🏴‍☠️", "⭐", "🍀",
];

/** Match a tournament player name to a highscore player name (fuzzy) */
export function matchPlayerName(tournamentName: string, highscoreName: string): boolean {
  const tn = tournamentName.toLowerCase().trim();
  const hn = stripEmoji(highscoreName).toLowerCase().trim();
  if (tn === hn) return true;
  if (hn.startsWith(tn) || tn.startsWith(hn)) return true;
  // Handle minor spelling differences (e.g. "Herstö" vs "Hertsö")
  const normalize = (s: string) => s.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
  const ntn = normalize(tn);
  const nhn = normalize(hn);
  if (ntn === nhn) return true;
  // Levenshtein-like: allow 1-char difference for names > 4 chars
  if (ntn.length > 4 && nhn.length > 4 && Math.abs(ntn.length - nhn.length) <= 1) {
    let diffs = 0;
    const shorter = ntn.length <= nhn.length ? ntn : nhn;
    const longer = ntn.length <= nhn.length ? nhn : ntn;
    let j = 0;
    for (let i = 0; i < longer.length && j < shorter.length; i++) {
      if (longer[i] !== shorter[j]) {
        diffs++;
        if (longer.length > shorter.length) continue; // skip char in longer
      }
      j++;
    }
    diffs += shorter.length - j;
    if (diffs <= 1) return true;
  }
  return false;
}
