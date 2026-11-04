import type { CSSProperties, ReactNode } from "react";
import type { CSGORank } from "../../lib/rank";

// One SVG badge per Gruvrank tier. Every tier has its own mining motif, drawn in the tier
// color from rank.ts; the badge face mixes that color with the theme surface so it follows
// the active theme. Higher tiers get extra ornaments (inner frame, top gem, glow).

const HEX = "M24 2.5 L43 13.25 V34.75 L24 45.5 L5 34.75 V13.25 Z";
const HEX_INNER = "M24 7 L39 15.5 V32.5 L24 41 L9 32.5 V15.5 Z";

interface MotifColors {
  /** Tier color, used for lines and solid parts. */
  c: string;
  /** Tier color softened against the surface, used for filled bodies. */
  soft: string;
  /** Theme surface, used for cut-outs. */
  surface: string;
}

const line = (c: string, width: number, extra: CSSProperties = {}): CSSProperties => ({
  fill: "none",
  stroke: c,
  strokeWidth: width,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...extra,
});

const MOTIFS: Record<number, (m: MotifColors) => ReactNode> = {
  // 1 · Gråberg — a lump of waste rock
  1: ({ c, soft }) => (
    <>
      <path d="M11 31 L15 21 L23 16 L32 19 L37 28 L32 35 L17 36 Z" style={{ fill: soft, stroke: c, strokeWidth: 1.8, strokeLinejoin: "round" }} />
      <path d="M15 21 L22 26 L32 19 M22 26 L24 36 M22 26 L37 28" style={line(c, 1.2, { opacity: 0.75 })} />
    </>
  ),
  // 2 · Dagbrottet — the stepped open pit, with ore at the bottom
  2: ({ c, soft }) => (
    <>
      <path d="M8 16 H40 V20 H36 V25 H32 V30 H28 V35 H20 V30 H16 V25 H12 V20 H8 Z" style={{ fill: soft, stroke: c, strokeWidth: 1.6, strokeLinejoin: "round" }} />
      <circle cx="24" cy="32" r="2" style={{ fill: c }} />
    </>
  ),
  // 3 · Orten — a timbered drift with rails running into the dark
  3: ({ c, surface }) => (
    <>
      <path d="M13 37 V24 A11 11 0 0 1 35 24 V37 Z" style={{ fill: `color-mix(in srgb, ${c} 22%, ${surface})` }} />
      <path d="M13 37 V24 A11 11 0 0 1 35 24 V37" style={line(c, 2.4)} />
      <path d="M19 37 L22.5 27 M29 37 L25.5 27" style={line(c, 1.4)} />
      <path d="M18.5 34 H29.5 M20.5 30.5 H27.5" style={line(c, 1, { opacity: 0.7 })} />
    </>
  ),
  // 4 · Borrfronten — a rock drill bit biting into the face
  4: ({ c, soft }) => (
    <>
      <rect x="21" y="7" width="6" height="7" rx="1" style={{ fill: c }} />
      <path d="M19 14 H29 V25 L24 39 L19 25 Z" style={{ fill: soft, stroke: c, strokeWidth: 1.6, strokeLinejoin: "round" }} />
      <path d="M19 18.5 L29 16 M19 23.5 L29 21 M20.5 28.5 L27.5 26" style={line(c, 1.5)} />
      <path d="M18 40 L15.5 42 M30 40 L32.5 42 M24 41.5 V43" style={line(c, 1.3)} />
    </>
  ),
  // 5 · Huvudnivån — the miner's helmet and its lamp
  5: ({ c, soft, surface }) => (
    <>
      <path d="M24 17 V12.5 M18 18.5 L15.5 15.5 M30 18.5 L32.5 15.5" style={line(c, 1.6)} />
      <path d="M11 32 A13 12 0 0 1 37 32 Z" style={{ fill: soft, stroke: c, strokeWidth: 1.6, strokeLinejoin: "round" }} />
      <rect x="8" y="31" width="32" height="4" rx="2" style={{ fill: c }} />
      <circle cx="24" cy="25" r="4.4" style={{ fill: surface, stroke: c, strokeWidth: 2 }} />
      <circle cx="24" cy="25" r="2" style={{ fill: c }} />
    </>
  ),
  // 6 · Malmkroppen — a magnetite crystal from the ore body
  6: ({ c }) => (
    <>
      <path d="M24 9 L12 24 L21 27 Z" style={{ fill: c, opacity: 0.95 }} />
      <path d="M24 9 L21 27 L36 24 Z" style={{ fill: c, opacity: 0.6 }} />
      <path d="M24 39 L12 24 L21 27 Z" style={{ fill: c, opacity: 0.45 }} />
      <path d="M24 39 L21 27 L36 24 Z" style={{ fill: c, opacity: 0.28 }} />
      <path d="M24 9 L36 24 L24 39 L12 24 Z M12 24 L21 27 L36 24 M24 9 L21 27 L24 39" style={line(c, 1.4)} />
      <path d="M35 10 l1.2 2.8 2.8 1.2 -2.8 1.2 -1.2 2.8 -1.2 -2.8 -2.8 -1.2 2.8 -1.2 Z" style={{ fill: c }} />
    </>
  ),
  // 7 · Kärnan — the glowing core
  7: ({ c, soft }) => (
    <>
      <path
        d="M24 6.5 V9.5 M24 38.5 V41.5 M6.5 24 H9.5 M38.5 24 H41.5 M11.6 11.6 L13.8 13.8 M34.2 34.2 L36.4 36.4 M11.6 36.4 L13.8 34.2 M34.2 13.8 L36.4 11.6"
        style={line(c, 1.6)}
      />
      <circle cx="24" cy="24" r="12" style={{ fill: soft, stroke: c, strokeWidth: 1.4 }} />
      <circle cx="24" cy="24" r="8" style={{ fill: c, opacity: 0.55 }} />
      <circle cx="24" cy="24" r="4.5" style={{ fill: c }} />
    </>
  ),
};

interface GruvrankBadgeProps {
  rank: CSGORank;
  /** Rendered width and height in px. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function GruvrankBadge({ rank, size = 36, className, style }: GruvrankBadgeProps) {
  const c = rank.color;
  const surface = "var(--surface-container-lowest)";
  const colors: MotifColors = { c, surface, soft: `color-mix(in srgb, ${c} 45%, ${surface})` };
  const motif = MOTIFS[rank.tier] ?? MOTIFS[1];
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      role="img"
      aria-label={`Gruvrank: ${rank.name}`}
      className={className}
      style={{
        flexShrink: 0,
        overflow: "visible",
        filter: rank.tier >= 7 ? `drop-shadow(0 0 ${Math.max(2, size / 10)}px color-mix(in srgb, ${c} 60%, transparent))` : undefined,
        ...style,
      }}
    >
      <title>{rank.name}</title>
      <path d={HEX} style={{ fill: `color-mix(in srgb, ${c} 14%, ${surface})`, stroke: c, strokeWidth: 2.4, strokeLinejoin: "round" }} />
      {rank.tier >= 3 && <path d={HEX_INNER} style={line(c, 0.8, { opacity: 0.35 })} />}
      {motif(colors)}
      {rank.tier >= 5 && <circle cx="24" cy="2.5" r="2.4" style={{ fill: c, stroke: surface, strokeWidth: 1 }} />}
      {rank.tier >= 6 && (
        <>
          <circle cx="5" cy="34.75" r="1.8" style={{ fill: c, stroke: surface, strokeWidth: 0.8 }} />
          <circle cx="43" cy="34.75" r="1.8" style={{ fill: c, stroke: surface, strokeWidth: 0.8 }} />
        </>
      )}
    </svg>
  );
}
