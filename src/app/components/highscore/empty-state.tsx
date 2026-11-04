import { motion } from "motion/react";
import { UserPlus, Users } from "lucide-react";
import { MIN_PLAYERS_FOR_ROUND } from "./constants";

interface HighscoreEmptyStateProps {
  onAddPlayer: () => void;
}

/** Shown instead of the hero cards and the table while no players exist. */
export function HighscoreEmptyState({ onAddPlayer }: HighscoreEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border flex flex-col items-center text-center gap-3 px-6 py-10 md:py-14 mb-8 md:mb-12"
      style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)" }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: "color-mix(in srgb, var(--primary) 14%, transparent)" }}
      >
        <Users className="w-7 h-7" style={{ color: "var(--primary)" }} />
      </div>
      <h2
        className="text-foreground"
        style={{ fontSize: "var(--text-h4)", fontWeight: "var(--font-weight-semibold)" }}
      >
        Inga spelare än
      </h2>
      <p className="text-muted-foreground max-w-sm" style={{ fontSize: "var(--text-base)", lineHeight: 1.5 }}>
        Lägg till alla som brukar spela. När ni är minst {MIN_PLAYERS_FOR_ROUND} kan ni registrera
        den första omgången, och då fylls rankningen på här.
      </p>
      <button
        onClick={onAddPlayer}
        className="mt-2 flex items-center gap-2 px-5 h-11 rounded-lg transition-all cursor-pointer hover:opacity-90 active:scale-95"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
          fontSize: "var(--text-label)",
          fontWeight: "var(--font-weight-semibold)",
          borderRadius: "var(--radius-button)",
        }}
      >
        <UserPlus className="w-4 h-4" />
        Lägg till spelare
      </button>
    </motion.div>
  );
}
