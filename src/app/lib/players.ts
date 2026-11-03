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
  // Allow one typo for names > 4 chars: a changed, added, removed or swapped letter
  if (ntn.length > 4 && nhn.length > 4 && Math.abs(ntn.length - nhn.length) <= 1) {
    if (editDistance(ntn, nhn) <= 1) return true;
  }
  return false;
}

/** Optimal string alignment distance: Levenshtein where swapping two adjacent letters counts as one edit */
function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}
