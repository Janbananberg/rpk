import { Crown, Flame, Snowflake, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { PlayerStats } from "../../lib/stats";
import { StatCard } from "./stat-card";
import { FONT } from "./constants";

interface HeroStatsProps {
  topPlayer: PlayerStats;
  hasStreakData: boolean;
  hotPlayer: PlayerStats;
  coldPlayer: PlayerStats;
  funFacts: string[];
  factIndex: number;
  setFactIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function HeroStats({
  topPlayer,
  hasStreakData,
  hotPlayer,
  coldPlayer,
  funFacts,
  factIndex,
  setFactIndex,
}: HeroStatsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 mb-8 md:mb-12">
        {/* Ledare */}
        <StatCard
          icon={<Crown className="w-4 h-4" />}
          label="Ledare"
          value={
            topPlayer && topPlayer.wins > 0
              ? topPlayer.name.split(" ").slice(0, 2).join(" ")
              : "—"
          }
          sub={
            topPlayer && topPlayer.wins > 0
              ? `${topPlayer.wins} vinster · Vinst% ${topPlayer.bwp.toFixed(1)}%`
              : "Inga vinster registrerade ännu"
          }
          color="var(--primary)"
        />

        {/* Win and loss streaks combined */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border p-3 md:p-4 flex flex-col gap-2 md:gap-3"
          style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)" }}
        >
          {/* Win streak */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
              style={{ background: "color-mix(in srgb, var(--warning) 15%, transparent)" }}
            >
              <Flame className="w-4 h-4" style={{ color: "var(--warning)" }} />
            </div>
            <div className="flex flex-col min-w-0">
              <span
                className="truncate"
                style={{
                  fontSize: "var(--text-base)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: hasStreakData && hotPlayer && hotPlayer.currentStreak >= 2 ? "var(--warning)" : "var(--muted-foreground)",
                  fontFamily: FONT,
                }}
              >
                {hasStreakData && hotPlayer && hotPlayer.currentStreak >= 2
                  ? hotPlayer.name.split(" ").slice(0, 2).join(" ")
                  : "—"}
              </span>
              <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                {hasStreakData && hotPlayer && hotPlayer.currentStreak >= 2
                  ? `${hotPlayer.currentStreak} raka vinster`
                  : "Ingen aktiv vinstsvit"}
              </span>
            </div>
          </div>
          {/* Divider */}
          <div className="h-px w-full" style={{ background: "var(--border)", opacity: 0.5 }} />
          {/* Loss streak */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
              style={{ background: "color-mix(in srgb, var(--info) 15%, transparent)" }}
            >
              <Snowflake className="w-4 h-4" style={{ color: "var(--info)" }} />
            </div>
            <div className="flex flex-col min-w-0">
              <span
                className="truncate"
                style={{
                  fontSize: "var(--text-base)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: hasStreakData && coldPlayer && coldPlayer.coldStreak >= 2 ? "var(--info)" : "var(--muted-foreground)",
                  fontFamily: FONT,
                }}
              >
                {hasStreakData && coldPlayer && coldPlayer.coldStreak >= 2
                  ? coldPlayer.name.split(" ").slice(0, 2).join(" ")
                  : "—"}
              </span>
              <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                {hasStreakData && coldPlayer && coldPlayer.coldStreak >= 2
                  ? `${coldPlayer.coldStreak} raka förluster`
                  : "Ingen aktiv förlustsvit"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Visste du att... */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border p-4 flex flex-col overflow-hidden relative"
          style={{
            background: "var(--surface-container)",
            borderRadius: "var(--radius-card)",
            borderColor: funFacts.length > 0 ? "color-mix(in srgb, var(--primary) 30%, var(--border))" : undefined,
          }}
        >
          {/* Subtle top accent line */}
          {funFacts.length > 0 && (
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background: "linear-gradient(90deg, transparent 0%, var(--primary) 50%, transparent 100%)",
                opacity: 0.5,
              }}
            />
          )}

          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="w-4 h-4" style={{ color: "var(--primary)" }} />
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  fontFamily: FONT,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase" as const,
                  color: "var(--muted-foreground)",
                }}
              >
                Visste du att...
              </span>
            </div>
            {funFacts.length > 1 && (
              <span
                className="text-muted-foreground tabular-nums select-none"
                style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}
              >
                {(factIndex % funFacts.length) + 1}/{funFacts.length}
              </span>
            )}
          </div>

          {/* Fact content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={funFacts.length > 0 ? factIndex : "empty"}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="min-h-[2.5rem] flex items-center flex-1"
            >
              <span
                className="text-foreground leading-snug"
                style={{
                  fontSize: "var(--text-label)",
                  fontWeight: "var(--font-weight-semibold)",
                  fontFamily: FONT,
                }}
              >
                {funFacts.length > 0
                  ? funFacts[factIndex % funFacts.length]
                  : "Spela matcher för att låsa upp fakta!"}
              </span>
            </motion.div>
          </AnimatePresence>

          {/* Dot indicators + auto-rotate progress */}
          {funFacts.length > 1 && (
            <div className="flex items-center gap-1.5 mt-2">
              {funFacts.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setFactIndex(i)}
                  className="transition-all duration-300 cursor-pointer relative"
                  style={{
                    width: i === factIndex % funFacts.length ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    background:
                      i === factIndex % funFacts.length
                        ? "var(--primary)"
                        : "var(--border)",
                    opacity: i === factIndex % funFacts.length ? 1 : 0.6,
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
