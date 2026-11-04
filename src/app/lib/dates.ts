/** Get current month as "YYYY-MM" */
export function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Format "YYYY-MM" to a human-readable Swedish label, e.g. "Mars 2026" */
export function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  const months = [
    "Januari", "Februari", "Mars", "April", "Maj", "Juni",
    "Juli", "Augusti", "September", "Oktober", "November", "December",
  ];
  return `${months[parseInt(m, 10) - 1]} ${year}`;
}

/** Short month label with the full year, e.g. "Mar 2026" (a two-digit year reads like a date) */
export function formatMonthShort(month: string): string {
  const [year, m] = month.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} ${year}`;
}

export type MonthView = string | "total"; // "YYYY-MM" or "total"

export function formatSessionDate(ts: number): string {
  const d = new Date(ts);
  return (
    d.toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }) +
    ", " +
    d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })
  );
}

export function formatRelativeDate(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Just nu";
  if (minutes < 60) return `${minutes} min sedan`;
  if (hours < 24) return `${hours}h sedan`;
  if (days < 7) return `${days}d sedan`;
  return new Date(ts).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

// ── Luleå timezone helper (Europe/Stockholm) ──
export const LULEA_TZ = "Europe/Stockholm";
export function toLuleaDate(ts: number): Date {
  // Create a Date in Luleå timezone by parsing the locale string
  const str = new Date(ts).toLocaleString("sv-SE", { timeZone: LULEA_TZ });
  return new Date(str);
}

export const WEEKDAY_NAMES_SV = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
export const WEEKDAY_SHORT_SV = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];
