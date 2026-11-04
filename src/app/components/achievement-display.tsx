import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Eye, EyeOff, Users } from "lucide-react";

const FONT = "'Titillium Web', sans-serif";

type AchievementRarity = "common" | "uncommon" | "rare" | "legendary" | "mythic";

interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  rarity: AchievementRarity;
  unlockedAt?: number;
  isNew?: boolean;
}

interface AchievementCheck {
  achievement: Achievement;
}

const ACHIEVEMENT_RARITY_COLORS: Record<AchievementRarity, { color: string; bg: string }> = {
  common: { color: "var(--muted-foreground)", bg: "color-mix(in srgb, var(--muted-foreground) 12%, transparent)" },
  uncommon: { color: "var(--success)", bg: "color-mix(in srgb, var(--success) 12%, transparent)" },
  rare: { color: "var(--primary)", bg: "color-mix(in srgb, var(--primary) 12%, transparent)" },
  legendary: { color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 12%, transparent)" },
  mythic: { color: "var(--error)", bg: "linear-gradient(135deg, color-mix(in srgb, var(--warning) 15%, transparent), color-mix(in srgb, var(--error) 15%, transparent))" },
};

const ACHIEVEMENT_RARITY_LABELS: Record<AchievementRarity, string> = {
  common: "Vanlig",
  uncommon: "Ovanlig",
  rare: "Sällsynt",
  legendary: "Legendarisk",
  mythic: "Mytisk",
};

interface AchievementDisplayProps {
  unlocked: Achievement[];
  allAchievements: AchievementCheck[];
  achievementOwnerCounts: Record<string, number>;
  showLocked: boolean;
  onToggleLocked: () => void;
}

export function AchievementDisplay({
  unlocked,
  allAchievements,
  achievementOwnerCounts,
  showLocked,
  onToggleLocked,
}: AchievementDisplayProps) {
  const lockedAchievements = allAchievements.filter(
    (a) => !unlocked.find((u) => u.id === a.achievement.id)
  );
  const total = allAchievements.length;
  if (total === 0) return null;

  const formatUnlockDate = (ts?: number) => {
    if (!ts) return "";
    const d = new Date(ts);
    return `${d.getDate()} ${["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"][d.getMonth()]} ${d.getFullYear()}`;
  };

  const rarityOrder: AchievementRarity[] = ["mythic", "legendary", "rare", "uncommon", "common"];
  const unlockedByRarity = rarityOrder
    .map((r) => ({ rarity: r, items: unlocked.filter((a) => a.rarity === r) }))
    .filter((g) => g.items.length > 0);
  const lockedByRarity = rarityOrder
    .map((r) => ({ rarity: r, items: lockedAchievements.filter((a) => a.achievement.rarity === r) }))
    .filter((g) => g.items.length > 0);
  const pct = Math.round((unlocked.length / total) * 100);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="text-muted-foreground"
            style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT }}
          >
            Achievements
          </span>
          <span
            className="px-1.5 py-0.5 rounded-full"
            style={{
              fontFamily: FONT,
              fontSize: 10,
              fontWeight: "var(--font-weight-bold)",
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              lineHeight: 1.2,
            }}
          >
            {unlocked.length}/{total}
          </span>
        </div>
        {lockedAchievements.length > 0 && (
          <button
            onClick={onToggleLocked}
            className="flex items-center gap-1 px-2 py-1 rounded-full border border-border cursor-pointer transition-all"
            style={{
              background: showLocked ? "var(--surface-container-high)" : "transparent",
              fontFamily: FONT,
              fontSize: "var(--text-xs)",
              color: "var(--muted-foreground)",
              borderRadius: "var(--radius)",
            }}
          >
            {showLocked ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showLocked ? "Dölj låsta" : "Visa låsta"}
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: pct >= 75 ? "var(--warning)" : pct >= 50 ? "var(--success)" : "var(--primary)",
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span style={{ fontFamily: FONT, fontSize: 10, color: "var(--muted-foreground)" }}>
            {pct}% upplåst
          </span>
          {unlocked.length > 0 && (
            <span style={{ fontFamily: FONT, fontSize: 10, color: "var(--muted-foreground)" }}>
              {lockedAchievements.length} kvar
            </span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {unlocked.length === 0 && (
        <div className="flex flex-col items-center justify-center py-4 text-center" style={{ opacity: 0.6 }}>
          <Lock className="w-7 h-7 text-muted-foreground" style={{ marginBottom: 6 }} aria-hidden />
          <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-sm)" }}>
            Inga achievements upplåsta ännu
          </span>
          <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", marginTop: 2 }}>
            Spela fler matcher för att låsa upp!
          </span>
        </div>
      )}

      {/* Unlocked grouped by rarity */}
      {unlockedByRarity.map((group) => (
        <div key={group.rarity} className="mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: ACHIEVEMENT_RARITY_COLORS[group.rarity].color }}
            />
            <span
              style={{
                fontFamily: FONT,
                fontSize: 9,
                fontWeight: "var(--font-weight-semibold)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: ACHIEVEMENT_RARITY_COLORS[group.rarity].color,
              }}
            >
              {ACHIEVEMENT_RARITY_LABELS[group.rarity]}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((a) => {
              const rc = ACHIEVEMENT_RARITY_COLORS[a.rarity];
              return (
                <div
                  key={a.id}
                  className="relative flex items-center gap-1.5 px-2.5 py-1.5 border"
                  style={{
                    background: rc.bg,
                    borderColor: a.isNew ? rc.color : `color-mix(in srgb, ${rc.color} 30%, transparent)`,
                    borderRadius: "var(--radius-card)",
                    boxShadow: a.isNew ? `0 0 10px ${rc.color}40` : undefined,
                  }}
                  title={`${a.description}\n${achievementOwnerCounts[a.id] || 0} spelare har denna${a.unlockedAt ? `\nUpplåst: ${formatUnlockDate(a.unlockedAt)}` : ""}`}
                >
                  {a.isNew && (
                    <span
                      className="absolute -top-1.5 -right-1.5 px-1 py-0.5 rounded-full"
                      style={{
                        background: rc.color,
                        color: "var(--background)",
                        fontFamily: FONT,
                        fontSize: 7,
                        fontWeight: "var(--font-weight-bold)",
                        lineHeight: 1,
                        letterSpacing: "0.04em",
                      }}
                    >
                      NY!
                    </span>
                  )}
                  <span style={{ fontSize: "var(--text-sm)", lineHeight: 1 }}>{a.emoji}</span>
                  <div className="flex flex-col">
                    <span
                      style={{
                        fontFamily: FONT,
                        fontSize: "var(--text-xs)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: rc.color,
                        lineHeight: 1.2,
                      }}
                    >
                      {a.name}
                    </span>
                    <span
                      style={{
                        fontFamily: FONT,
                        fontSize: 9,
                        color: `color-mix(in srgb, ${rc.color} 60%, transparent)`,
                        lineHeight: 1.2,
                      }}
                    >
                      {a.description}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: FONT,
                      fontSize: 8,
                      fontWeight: "var(--font-weight-semibold)",
                      color: `color-mix(in srgb, ${rc.color} 45%, transparent)`,
                      lineHeight: 1,
                      marginLeft: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Users className="w-2.5 h-2.5" style={{ opacity: 0.7 }} />
                    {achievementOwnerCounts[a.id] || 0}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Locked achievements - expandable */}
      <AnimatePresence>
        {showLocked && lockedByRarity.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 mb-2">
                <Lock className="w-3 h-3 text-muted-foreground" />
                <span
                  className="text-muted-foreground"
                  style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT }}
                >
                  Låsta ({lockedAchievements.length})
                </span>
              </div>
              {lockedByRarity.map((group) => (
                <div key={group.rarity} className="mb-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: ACHIEVEMENT_RARITY_COLORS[group.rarity].color, opacity: 0.5 }}
                    />
                    <span
                      style={{
                        fontFamily: FONT,
                        fontSize: 9,
                        fontWeight: "var(--font-weight-semibold)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: ACHIEVEMENT_RARITY_COLORS[group.rarity].color,
                        opacity: 0.5,
                      }}
                    >
                      {ACHIEVEMENT_RARITY_LABELS[group.rarity]}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {group.items.map((ac) => {
                      const a = ac.achievement;
                      const rc = ACHIEVEMENT_RARITY_COLORS[a.rarity];
                      return (
                        <div
                          key={a.id}
                          className="flex items-center gap-2 px-2.5 py-2 border border-border"
                          style={{
                            background: "var(--surface-container)",
                            borderRadius: "var(--radius-card)",
                            opacity: 0.55,
                          }}
                        >
                          <span style={{ fontSize: "var(--text-base)", lineHeight: 1, filter: "grayscale(0.8)" }}>
                            {a.emoji}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                style={{
                                  fontFamily: FONT,
                                  fontSize: "var(--text-xs)",
                                  fontWeight: "var(--font-weight-semibold)",
                                  color: "var(--foreground)",
                                  lineHeight: 1.2,
                                }}
                              >
                                {a.name}
                              </span>
                              <span
                                className="px-1 py-0.5 rounded-full"
                                style={{
                                  fontFamily: FONT,
                                  fontSize: 8,
                                  fontWeight: "var(--font-weight-semibold)",
                                  background: `color-mix(in srgb, ${rc.color} 15%, transparent)`,
                                  color: rc.color,
                                  lineHeight: 1,
                                }}
                              >
                                {ACHIEVEMENT_RARITY_LABELS[a.rarity]}
                              </span>
                            </div>
                            <span
                              style={{
                                fontFamily: FONT,
                                fontSize: 10,
                                color: "var(--muted-foreground)",
                                lineHeight: 1.3,
                              }}
                            >
                              {a.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Lock className="w-3 h-3" style={{ color: "var(--muted-foreground)", opacity: 0.5 }} />
                            <span
                              style={{
                                fontFamily: FONT,
                                fontSize: 8,
                                color: "var(--muted-foreground)",
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Users className="w-2.5 h-2.5" style={{ opacity: 0.5 }} />
                              {achievementOwnerCounts[a.id] || 0}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
