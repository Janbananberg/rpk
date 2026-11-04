import { useState, useCallback } from "react";
import { usePolling } from "../hooks/use-polling";
import { motion } from "motion/react";
import { Trophy, TrendingUp, TrendingDown, Crown, Medal, Award, Flame, Star, Zap, Heart, Shield, Gem, Target, Swords } from "lucide-react";
import type { BettorProfile } from "./betting-store";
import { fetchAllBettors } from "./api";

const FONT = "'Titillium Web', sans-serif";

/* ── Badge icon mapping ─────────────────────────────────────────────── */
const BADGE_ICONS: Record<string, typeof Crown> = {
  crown: Crown,
  medal: Medal,
  award: Award,
  flame: Flame,
  star: Star,
  trophy: Trophy,
  zap: Zap,
  heart: Heart,
  shield: Shield,
  gem: Gem,
  target: Target,
  swords: Swords,
};

export function Leaderboard({ currentName }: { currentName: string }) {
  const [bettors, setBettors] = useState<BettorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await fetchAllBettors();
    if (data.length > 0) setBettors(data);
    setLoading(false);
  }, []);
  usePolling(load);

  const sorted = [...bettors].sort((a, b) => b.balance - a.balance);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Trophy className="w-10 h-10 text-muted-foreground/30" />
        <div>
          <p
            className="text-foreground"
            style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}
          >
            Inga bettare registrerade
          </p>
          <p className="text-muted-foreground mt-1" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
            Dela QR-koden till dina v\u00e4nner!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Trophy className="w-4.5 h-4.5 text-primary" />
        <span
          className="text-foreground"
          style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}
        >
          Topplista
        </span>
        <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
          {sorted.length} bettare
        </span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
          <span className="text-[var(--success)]" style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700 }}>
            LIVE
          </span>
        </div>
      </div>

      {/* Podium — top 3 */}
      {sorted.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {[sorted[1], sorted[0], sorted[2]].map((bettor, podiumIdx) => {
            const rank = podiumIdx === 1 ? 1 : podiumIdx === 0 ? 2 : 3;
            const isMe = bettor.name === currentName;
            const heights = ["h-20", "h-28", "h-16"];
            const rankColors = [
              "text-muted-foreground",
              "text-primary",
              "text-muted-foreground/70",
            ];

            return (
              <motion.div
                key={bettor.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: podiumIdx * 0.1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="relative">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      rank === 1 ? "border-primary bg-primary/15" : "border-border/50 bg-surface-container-high"
                    } ${isMe ? "ring-2 ring-primary/30 ring-offset-2 ring-offset-background" : ""}`}
                  >
                    {bettor.equippedCosmetics?.avatar ? (
                      <span style={{ fontSize: "20px" }}>{bettor.equippedCosmetics.avatar}</span>
                    ) : (
                      <span
                        className={rank === 1 ? "text-primary" : "text-foreground"}
                        style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: 700 }}
                      >
                        {bettor.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {rank === 1 && (
                    <Crown className="absolute -top-2 -right-1 w-4 h-4 text-primary" />
                  )}
                </div>

                <div className="text-center min-w-0 w-full">
                  {bettor.equippedCosmetics?.title && (
                    <p className="text-primary/70 truncate" style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700 }}>
                      {bettor.equippedCosmetics.title}
                    </p>
                  )}
                  <p
                    className={`truncate ${isMe ? "text-primary" : "text-foreground"}`}
                    style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
                  >
                    {bettor.name}
                  </p>
                </div>

                <div className={`w-full ${heights[podiumIdx]} rounded-t-[var(--radius-card)] flex flex-col items-center justify-start pt-2 border border-b-0 border-border/30`}
                  style={{ background: rank === 1 ? "var(--surface-container-high)" : "var(--surface-container-low)" }}
                >
                  <span className={`${rankColors[podiumIdx]}`} style={{ fontFamily: FONT, fontSize: "var(--text-h4)", fontWeight: 700 }}>
                    {rank}
                  </span>
                  <span className="text-muted-foreground tabular-nums" style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700 }}>
                    {bettor.balance}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="flex flex-col gap-1">
        {sorted.map((bettor, idx) => {
          const rank = idx + 1;
          const isMe = bettor.name === currentName;
          const BadgeIcon = bettor.equippedCosmetics?.badge ? BADGE_ICONS[bettor.equippedCosmetics.badge] : null;

          return (
            <motion.div
              key={bettor.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-card)] border transition-all ${
                isMe
                  ? "border-primary/30 bg-primary/[0.06]"
                  : "border-transparent hover:bg-surface-container-low/50"
              }`}
            >
              <span
                className={`w-6 text-center tabular-nums ${rank <= 3 ? "text-primary" : "text-muted-foreground"}`}
                style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }}
              >
                {rank}
              </span>

              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  rank <= 3 ? "bg-primary/10" : "bg-surface-container-high"
                }`}
              >
                {bettor.equippedCosmetics?.avatar ? (
                  <span style={{ fontSize: "16px" }}>{bettor.equippedCosmetics.avatar}</span>
                ) : (
                  <span
                    className={rank <= 3 ? "text-primary" : "text-foreground"}
                    style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }}
                  >
                    {bettor.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`truncate ${isMe ? "text-primary" : "text-foreground"}`}
                    style={{
                      fontFamily: FONT,
                      fontSize: "var(--text-base)",
                      fontWeight: isMe ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                    }}
                  >
                    {bettor.name}
                  </span>
                  {BadgeIcon && <BadgeIcon className="w-3.5 h-3.5 text-primary shrink-0" />}
                  {isMe && (
                    <span
                      className="text-primary/60 shrink-0"
                      style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700 }}
                    >
                      DU
                    </span>
                  )}
                </div>
                {bettor.equippedCosmetics?.title && (
                  <p className="text-muted-foreground/70 truncate" style={{ fontFamily: FONT, fontSize: "11px" }}>
                    {bettor.equippedCosmetics.title}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {bettor.totalWon > 0 && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-[var(--success)]" />
                    <span className="text-[var(--success)] tabular-nums" style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700 }}>
                      +{bettor.totalWon}
                    </span>
                  </div>
                )}
                {bettor.totalLost > 0 && (
                  <div className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-destructive" />
                    <span className="text-destructive tabular-nums" style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700 }}>
                      -{bettor.totalLost}
                    </span>
                  </div>
                )}
                <span
                  className="text-foreground tabular-nums"
                  style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }}
                >
                  {bettor.balance}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
