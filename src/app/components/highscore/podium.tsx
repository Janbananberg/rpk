import { motion } from "motion/react";
import { Crown } from "lucide-react";
import type { PlayerStats } from "../../lib/stats";
import { ELO_START, weightedDelta } from "../../lib/elo";
import type { EloEntry } from "../../lib/elo";
import { AnimatedNumber } from "./animated-number";

interface PodiumProps {
  /** The view's top three, in placing order (1, 2, 3). Nothing is shown with fewer than three. */
  top: PlayerStats[];
  eloRatings: Record<string, EloEntry>;
  isMonthView: boolean;
  monthlyEloDelta: Record<string, number> | undefined;
  monthlyRoundsPlayed: Record<string, number> | undefined;
  onSelect: (player: PlayerStats) => void;
  animateChanges?: boolean;
}

// Medal colours are mixed from theme tokens so every theme restyles them.
const PLACES = [
  { place: 1, label: "Guld", color: "var(--warning)", pedestal: 84 },
  { place: 2, label: "Silver", color: "var(--muted-foreground)", pedestal: 60 },
  { place: 3, label: "Brons", color: "color-mix(in srgb, var(--warning) 55%, var(--destructive))", pedestal: 44 },
] as const;

// Screen order is 2-1-3 so the winner stands in the middle.
const SCREEN_ORDER = [1, 0, 2];

const EMOJI_RE = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|️‍\p{Extended_Pictographic})*/u;

/** Splits "🏓 Anna" or "Mr Nyberg 🚬" into the player's emoji and the plain name. */
function splitName(name: string): { emoji: string | null; plain: string } {
  const match = name.match(EMOJI_RE);
  if (!match) return { emoji: null, plain: name.trim() };
  const plain = name.replace(match[0], "").replace(/️/g, "").replace(/\s+/g, " ").trim();
  return { emoji: match[0], plain: plain || name.trim() };
}

export function Podium({ top, eloRatings, isMonthView, monthlyEloDelta, monthlyRoundsPlayed, onSelect, animateChanges = false }: PodiumProps) {
  if (top.length < 3) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-3 items-end gap-2 md:gap-4 mb-5 md:mb-6 px-1 md:px-8"
      style={{ order: 2 }}
      aria-label="Topp tre"
    >
      {SCREEN_ORDER.map((idx) => {
        const slot = PLACES[idx];
        const player = top[idx];
        const { emoji, plain } = splitName(player.name);
        const elo = eloRatings[player.name]?.elo ?? ELO_START;
        let monthDelta: number | null = null;
        if (isMonthView && monthlyEloDelta) {
          const rounds = monthlyRoundsPlayed?.[player.name] ?? 0;
          if (rounds > 0) monthDelta = weightedDelta(monthlyEloDelta[player.name] ?? 0, rounds);
        }
        const isFirst = slot.place === 1;
        return (
          <div key={slot.place} className="flex flex-col items-stretch min-w-0">
            <motion.button
              type="button"
              layoutId={`podium-${player.name}`}
              transition={{ layout: { duration: 0.6, ease: "easeInOut" } }}
              onClick={() => onSelect(player)}
              className="flex flex-col items-center gap-1 px-1 pb-2 cursor-pointer min-w-0 rounded-lg hover:bg-muted/20 transition-colors"
              style={{ borderRadius: "var(--radius-card)" }}
              title={`${slot.label}: ${player.name}`}
            >
              {isFirst && <Crown className="w-5 h-5" style={{ color: slot.color }} aria-hidden />}
              <span
                className="flex items-center justify-center rounded-full shrink-0"
                style={{
                  width: isFirst ? 56 : 46,
                  height: isFirst ? 56 : 46,
                  fontSize: isFirst ? 28 : 22,
                  lineHeight: 1,
                  background: `color-mix(in srgb, ${slot.color} 16%, var(--surface-container))`,
                  border: `2px solid color-mix(in srgb, ${slot.color} 60%, transparent)`,
                  color: "var(--foreground)",
                  fontWeight: "var(--font-weight-semibold)",
                }}
                aria-hidden
              >
                {emoji ?? plain.charAt(0).toUpperCase()}
              </span>
              <span
                className="truncate max-w-full text-foreground"
                style={{ fontSize: isFirst ? "var(--text-base)" : "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" }}
              >
                {plain}
              </span>
              <span className="flex items-baseline gap-1 tabular-nums">
                <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>
                  <AnimatedNumber value={elo} animateChanges={animateChanges} />
                </span>
                <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>Elo</span>
              </span>
              {monthDelta !== null && (
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: monthDelta > 0 ? "var(--success)" : monthDelta < 0 ? "var(--destructive)" : "var(--muted-foreground)",
                  }}
                  title="Viktat Elo-delta denna månad"
                >
                  <AnimatedNumber value={monthDelta} decimals={1} signed animateChanges={animateChanges} /> Δ
                </span>
              )}
            </motion.button>
            {/* Pedestal */}
            <div
              className="flex items-start justify-center pt-1.5 rounded-t-lg"
              style={{
                height: slot.pedestal,
                background: `linear-gradient(180deg, color-mix(in srgb, ${slot.color} 28%, var(--surface-container-high)) 0%, var(--surface-container) 100%)`,
                borderTop: `3px solid ${slot.color}`,
                borderRadius: "var(--radius-card) var(--radius-card) 0 0",
              }}
            >
              <span style={{ fontSize: "var(--text-h4)", fontWeight: "var(--font-weight-bold)", color: slot.color, lineHeight: 1 }}>
                {slot.place}
              </span>
              <span className="sr-only">{slot.label}</span>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
