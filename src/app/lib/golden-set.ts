/** A set is "golden" if the winner won 11-0, 11-1, or 11-2 */
export function isGoldenSet(s1: number, s2: number): boolean {
  const won1 = s1 >= 11 && s1 - s2 >= 2;
  const won2 = s2 >= 11 && s2 - s1 >= 2;
  if (won1) return s2 <= 2;
  if (won2) return s1 <= 2;
  return false;
}
