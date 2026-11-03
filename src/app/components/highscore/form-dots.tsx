// ── Form dots component ──
// Uses distinct shapes per result type for accessibility (not just color):
//   W = upward triangle (▲), L = downward triangle (▼), F = diamond (◆), empty = ring (○)
export function FormDots({ form }: { form: ("W" | "L" | "F")[] }) {
  const maxDots = 5;
  const dots: ("W" | "L" | "F" | "empty")[] = [
    ...Array(Math.max(0, maxDots - form.length)).fill("empty" as const),
    ...form,
  ];
  const size = 10;
  return (
    <div className="flex gap-1 items-center">
      {dots.map((r, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 10 10"
          className="shrink-0"
          role="img"
          aria-label={r === "W" ? "Vinst" : r === "F" ? "Förlust i final" : r === "L" ? "Förlorade" : "Ej spelad"}
        >
          <title>{r === "W" ? "Vinst" : r === "F" ? "Förlust i final" : r === "L" ? "Förlorade" : "Ej spelad"}</title>
          {r === "W" && (
            <polygon points="5,1 9.5,9 0.5,9" fill="var(--success)" />
          )}
          {r === "L" && (
            <polygon points="5,9 9.5,1 0.5,1" fill="var(--destructive)" />
          )}
          {r === "F" && (
            <polygon points="5,0.5 9.5,5 5,9.5 0.5,5" fill="var(--destructive)" opacity={0.75} />
          )}
          {r === "empty" && (
            <circle cx="5" cy="5" r="3.5" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.2" opacity={0.4} />
          )}
        </svg>
      ))}
    </div>
  );
}
