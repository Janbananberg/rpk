import { useMemo } from "react";

const FLAKE_COUNT = 40;

/** Gentle snowfall over the page. Purely decorative: no pointer events, hidden from screen readers. */
export function Snowfall() {
  const flakes = useMemo(
    () =>
      Array.from({ length: FLAKE_COUNT }, (_, i) => {
        // Deterministic spread so flakes don't jump on re-render
        const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
        const size = 2 + r(1) * 4;
        return {
          left: `${r(2) * 100}%`,
          size,
          opacity: 0.35 + r(3) * 0.5,
          duration: 9 + r(4) * 12,
          delay: -r(5) * 20,
          drift: `${(r(6) - 0.5) * 80}px`,
        };
      }),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {flakes.map((f, i) => (
        <span
          key={i}
          className="snowflake"
          style={{
            left: f.left,
            width: f.size,
            height: f.size,
            opacity: f.opacity,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            ["--drift" as string]: f.drift,
          }}
        />
      ))}
    </div>
  );
}
