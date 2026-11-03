/**
 * Tournament Enhancements
 * Features: Confetti, Progress Bar, Upset Alert, Tale of Tape,
 * MVP Calculation, Elo Probability, Golden Set, Player Avatars
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Swords, Award, Flame, Crown, Target, ChevronDown } from "lucide-react";
import type { MatchData } from "./match-card";
import type { GameSession } from "./api";

const FONT = "'Titillium Web', sans-serif";

// ════════════════════════════════════════════════════════════════
//  1. CONFETTI — Canvas-based gold particle celebration
// ════════════════════════════════════════════════════════════════

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  opacity: number;
  shape: "rect" | "circle" | "star";
}

export function ChampionConfetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      particlesRef.current = [];
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Spawn particles
    const colors = [
      "#FFD700", "#FFA500", "#FF8C00", "#FFBF00",
      "#F0E68C", "#DAA520", "#B8860B", "#FFE4B5",
      "var(--primary, #7C9BFF)", "#FFFFFF",
    ];

    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = computedStyle.getPropertyValue("--primary").trim() || "#7C9BFF";
    colors[8] = primaryColor;

    for (let i = 0; i < 200; i++) {
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: -Math.random() * canvas.height * 0.5 - 20,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 8 + 3,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
        shape: (["rect", "circle", "star"] as const)[Math.floor(Math.random() * 3)],
      });
    }

    let startTime = Date.now();
    const duration = 5000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particlesRef.current = [];
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const fadeOut = elapsed > duration * 0.7 ? 1 - (elapsed - duration * 0.7) / (duration * 0.3) : 1;

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.vx *= 0.999;
        p.rotation += p.rotationSpeed;
        p.opacity = fadeOut;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Star
          ctx.beginPath();
          for (let j = 0; j < 5; j++) {
            const angle = (j * Math.PI * 2) / 5 - Math.PI / 2;
            const r = j % 2 === 0 ? p.size / 2 : p.size / 4;
            ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[60]"
      style={{ mixBlendMode: "screen" }}
    />
  );
}

// ════════════════════════════════════════════════════════════════
//  4. TOURNAMENT PROGRESS BAR
// ════════════════════════════════════════════════════════════════

export function TournamentProgressBar({
  qf1, qf2, qf3, qf4, semi1, semi2, final_,
}: {
  qf1: MatchData; qf2: MatchData; qf3: MatchData; qf4: MatchData;
  semi1: MatchData; semi2: MatchData; final_: MatchData;
}) {
  const matches = [qf1, qf2, qf3, qf4, semi1, semi2, final_];
  const completed = matches.filter(m => m.winner).length;
  const total = 7;
  const pct = (completed / total) * 100;
  const labels = ["KF1", "KF2", "KF3", "KF4", "SF1", "SF2", "F"];

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="flex items-center justify-between px-1">
        <span
          className="text-muted-foreground"
          style={{ fontFamily: FONT, fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          Framsteg
        </span>
        <span
          className="text-muted-foreground tabular-nums"
          style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}
        >
          {completed}/{total}
        </span>
      </div>
      <div className="relative w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-container-high)" }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: completed === total ? "var(--success)" : "var(--primary)" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between px-0.5">
        {labels.map((l, i) => (
          <div key={l} className="flex flex-col items-center gap-0.5">
            <div
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                matches[i].winner ? "bg-primary scale-100" : "bg-border/40 scale-75"
              }`}
            />
            <span
              className={`transition-colors duration-300 ${matches[i].winner ? "text-primary" : "text-muted-foreground/40"}`}
              style={{ fontFamily: FONT, fontSize: "9px", fontWeight: "var(--font-weight-bold)" }}
            >
              {l}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  3. PLAYER AVATAR — Colored initials circle
// ════════════════════════════════════════════════════════════════

const AVATAR_COLORS = [
  "#4A90D9", "#E06C75", "#98C379", "#E5C07B",
  "#C678DD", "#56B6C2", "#D19A66", "#61AFEF",
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function PlayerAvatar({ name, size = 24 }: { name: string; size?: number }) {
  const color = AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
  const initials = name.trim().split(/\s+/).map(w => w[0]?.toUpperCase()).join("").slice(0, 2) || "?";

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: `${color}22`,
        border: `1.5px solid ${color}55`,
      }}
    >
      <span
        style={{
          fontFamily: FONT,
          fontSize: size * 0.42,
          fontWeight: "var(--font-weight-bold)",
          color,
          lineHeight: 1,
        }}
      >
        {initials}
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  10. GOLDEN SET DETECTION
// ════════════════════════════════════════════════════════════════

/** A set is "golden" if the winner won 11-0, 11-1, or 11-2 */
export function isGoldenSet(s1: number, s2: number): boolean {
  const won1 = s1 >= 11 && s1 - s2 >= 2;
  const won2 = s2 >= 11 && s2 - s1 >= 2;
  if (won1) return s2 <= 2;
  if (won2) return s1 <= 2;
  return false;
}

// ════════════════════════════════════════════════════════════════
//  13. ELO-BASED WIN PROBABILITY
// ════════════════════════════════════════════════════════════════

const ELO_START = 1000;
const ELO_ANTE = 3;
const ELO_ALPHA = 0.35;
const ELO_UPSET_BONUS = 10;
const ELO_UPSET_THRESHOLD = 100;

export interface EloRating {
  name: string;
  elo: number;
  matches: number;
}

/** Compute pot distribution for a single round (mirrored from highscore-page) */
function computePotDist(rWinner: number, rLoser: number, N: number): { winnerDelta: number; loserDelta: number } {
  const pot = N * ELO_ANTE;
  const eWinner = 1 / (1 + Math.pow(10, (rLoser - rWinner) / 400));
  let winnerShare = pot * (0.5 + ELO_ALPHA * (1 - eWinner));
  let loserShare = pot - winnerShare;
  const minShare = ELO_ANTE + 1;
  if (loserShare < minShare) {
    loserShare = minShare;
    winnerShare = pot - loserShare;
  }
  // Upset bonus: +10 Elo per 100 Elo difference for the underdog winning
  const eloDiff = rLoser - rWinner; // positive means winner had lower Elo (underdog)
  const isUpset = eloDiff >= ELO_UPSET_THRESHOLD;
  const upsetBonus = isUpset ? Math.floor(eloDiff / ELO_UPSET_THRESHOLD) * ELO_UPSET_BONUS : 0;
  return {
    winnerDelta: Math.round(winnerShare - ELO_ANTE) + upsetBonus,
    loserDelta: Math.round(loserShare - ELO_ANTE),
  };
}

export function computeEloRatings(sessions: GameSession[], eloResetTimestamp?: number | null): Record<string, EloRating> {
  const ratings: Record<string, { elo: number; matches: number }> = {};

  const ensure = (name: string) => {
    if (!ratings[name]) ratings[name] = { elo: ELO_START, matches: 0 };
  };

  const sorted = [...sessions].sort((a, b) => a.date - b.date);

  for (const session of sorted) {
    if (eloResetTimestamp && session.date < eloResetTimestamp) continue;

    for (const player of session.players) ensure(player);

    for (const round of session.rounds) {
      if (round.finalists.length !== 2 || !round.winner) continue;
      const roundPlayers = round.players ?? session.players;
      const N = roundPlayers.length;
      const [p1, p2] = round.finalists;
      const winner = round.winner;
      const loser = winner === p1 ? p2 : p1;

      // Ensure all round participants exist BEFORE accessing ratings
      for (const player of roundPlayers) ensure(player);
      ensure(winner);
      ensure(loser);

      // Compute pot distribution (use pre-ante ratings)
      const rWinner = ratings[winner].elo;
      const rLoser = ratings[loser].elo;
      const { winnerDelta, loserDelta } = computePotDist(rWinner, rLoser, N);

      // Apply: non-finalists lose ante, finalists get pot share
      for (const player of roundPlayers) {
        ensure(player);
        if (player !== winner && player !== loser) {
          ratings[player].elo -= ELO_ANTE;
        }
        ratings[player].matches++;
      }
      ratings[winner].elo += winnerDelta;
      ratings[loser].elo += loserDelta;
    }
  }

  const result: Record<string, EloRating> = {};
  for (const [name, r] of Object.entries(ratings)) {
    result[name] = { name, elo: r.elo, matches: r.matches };
  }
  return result;
}

export function eloWinProbability(elo1: number, elo2: number): number {
  return 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
}

/** Head-to-head record between two players */
export interface H2HRecord {
  wins1: number;
  wins2: number;
  total: number;
}

export function computeH2H(sessions: GameSession[], p1: string, p2: string): H2HRecord {
  let wins1 = 0, wins2 = 0;
  for (const session of sessions) {
    for (const round of session.rounds) {
      if (round.finalists.length !== 2 || !round.winner) continue;
      const has1 = round.finalists.includes(p1);
      const has2 = round.finalists.includes(p2);
      if (has1 && has2) {
        if (round.winner === p1) wins1++;
        else if (round.winner === p2) wins2++;
      }
    }
  }
  return { wins1, wins2, total: wins1 + wins2 };
}

/** Compute H2H for all player pairs */
export function computeAllH2H(sessions: GameSession[], players: string[]): Record<string, H2HRecord> {
  const map: Record<string, H2HRecord> = {};
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const key = `${players[i]}:${players[j]}`;
      map[key] = computeH2H(sessions, players[i], players[j]);
    }
  }
  return map;
}

export function getH2H(map: Record<string, H2HRecord>, p1: string, p2: string): H2HRecord {
  const key1 = `${p1}:${p2}`;
  if (map[key1]) return map[key1];
  const key2 = `${p2}:${p1}`;
  if (map[key2]) return { wins1: map[key2].wins2, wins2: map[key2].wins1, total: map[key2].total };
  return { wins1: 0, wins2: 0, total: 0 };
}

// ════════════════════════════════════════════════════════════════
//  6. TALE OF THE TAPE — Pre-match comparison overlay
// ════════════════════════════════════════════════════════════════

interface TaleOfTapeProps {
  p1: string;
  p2: string;
  elo: Record<string, EloRating>;
  h2h: H2HRecord;
  matchLabel: string;
  onContinue: () => void;
}

export function TaleOfTape({ p1, p2, elo, h2h, matchLabel, onContinue }: TaleOfTapeProps) {
  const e1 = elo[p1]?.elo ?? ELO_START;
  const e2 = elo[p2]?.elo ?? ELO_START;
  const prob1 = eloWinProbability(e1, e2);
  const prob2 = 1 - prob1;

  const stats = [
    { label: "Elo Rating", v1: e1.toString(), v2: e2.toString(), better: e1 > e2 ? 1 : e2 > e1 ? 2 : 0 },
    { label: "H2H Vinster", v1: h2h.wins1.toString(), v2: h2h.wins2.toString(), better: h2h.wins1 > h2h.wins2 ? 1 : h2h.wins2 > h2h.wins1 ? 2 : 0 },
    { label: "Elo-matcher", v1: (elo[p1]?.matches ?? 0).toString(), v2: (elo[p2]?.matches ?? 0).toString(), better: 0 },
    { label: "Vinstchans", v1: `${Math.round(prob1 * 100)}%`, v2: `${Math.round(prob2 * 100)}%`, better: prob1 > prob2 ? 1 : prob2 > prob1 ? 2 : 0 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[10%] w-[40%] h-[40%] bg-primary/[0.04] blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] bg-primary/[0.03] blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative w-full max-w-md px-6 flex flex-col items-center gap-6"
      >
        {/* Title */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: "var(--surface-container-high)" }}>
            <Swords className="w-3.5 h-3.5 text-primary" />
            <span
              className="text-muted-foreground"
              style={{ fontFamily: FONT, fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.15em", textTransform: "uppercase" }}
            >
              {matchLabel}
            </span>
          </div>
        </div>

        {/* Player names */}
        <div className="w-full flex items-center justify-between">
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-2 flex-1"
          >
            <PlayerAvatar name={p1} size={48} />
            <span
              className="text-foreground text-center"
              style={{ fontFamily: FONT, fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-bold)" }}
            >
              {p1}
            </span>
          </motion.div>

          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.35, type: "spring", damping: 12 }}
            className="px-4"
          >
            <span
              className="text-muted-foreground/40"
              style={{ fontFamily: FONT, fontSize: "var(--text-h3)", fontWeight: "var(--font-weight-bold)" }}
            >
              VS
            </span>
          </motion.div>

          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-2 flex-1"
          >
            <PlayerAvatar name={p2} size={48} />
            <span
              className="text-foreground text-center"
              style={{ fontFamily: FONT, fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-bold)" }}
            >
              {p2}
            </span>
          </motion.div>
        </div>

        {/* Probability bar */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="w-full"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-primary tabular-nums" style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-bold)" }}>
              {Math.round(prob1 * 100)}%
            </span>
            <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Vinstchans (Elo)
            </span>
            <span className="text-primary tabular-nums" style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-bold)" }}>
              {Math.round(prob2 * 100)}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden flex" style={{ background: "var(--surface-container-high)" }}>
            <div className="h-full rounded-l-full transition-all duration-700" style={{ width: `${prob1 * 100}%`, background: "var(--primary)", opacity: 0.8 }} />
            <div className="h-full rounded-r-full transition-all duration-700" style={{ width: `${prob2 * 100}%`, background: "var(--secondary)", opacity: 0.5 }} />
          </div>
        </motion.div>

        {/* Stats comparison */}
        <div className="w-full flex flex-col gap-2">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="flex items-center justify-between px-4 py-2.5 rounded-[var(--radius-card)] border border-border/30"
              style={{ background: "var(--surface-container)" }}
            >
              <span
                className={`tabular-nums ${stat.better === 1 ? "text-primary" : "text-foreground"}`}
                style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: stat.better === 1 ? "var(--font-weight-bold)" : "var(--font-weight-normal)" }}
              >
                {stat.v1}
              </span>
              <span
                className="text-muted-foreground"
                style={{ fontFamily: FONT, fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.05em" }}
              >
                {stat.label}
              </span>
              <span
                className={`tabular-nums ${stat.better === 2 ? "text-primary" : "text-foreground"}`}
                style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: stat.better === 2 ? "var(--font-weight-bold)" : "var(--font-weight-normal)" }}
              >
                {stat.v2}
              </span>
            </motion.div>
          ))}
        </div>

        {/* H2H flavor text */}
        {h2h.total > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-center"
          >
            <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
              {h2h.total === 1
                ? `De har mötts 1 gång i finalen tidigare.`
                : `De har mötts ${h2h.total} gånger i finalen.`}
            </span>
          </motion.div>
        )}

        {/* Continue button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          onClick={onContinue}
          className="w-full py-3.5 rounded-[var(--radius-button)] bg-primary text-primary-foreground hover:opacity-90 transition-all cursor-pointer"
          style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}
        >
          Starta match
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════
//  7. UPSET ALERT — Banner when lower-seeded player wins
// ════════════════════════════════════════════════════════════════

export function UpsetAlert({
  winner,
  loser,
  matchLabel,
  onDismiss,
}: {
  winner: string;
  loser: string;
  matchLabel: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ y: -80, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -80, opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", damping: 15, stiffness: 200 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] px-6 py-3 rounded-[var(--radius-card)] border border-warning/40 flex items-center gap-3"
      style={{
        background: "color-mix(in srgb, var(--surface-container) 85%, var(--warning) 15%)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 20px color-mix(in srgb, var(--warning) 20%, transparent)",
      }}
      onClick={onDismiss}
    >
      <Flame className="w-5 h-5 text-warning shrink-0" />
      <div className="flex flex-col">
        <span
          className="text-warning"
          style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-bold)", letterSpacing: "0.15em", textTransform: "uppercase" }}
        >
          Skräll!
        </span>
        <span className="text-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-sm)" }}>
          {winner} slår ut {loser} i {matchLabel}
        </span>
      </div>
      <Zap className="w-4 h-4 text-warning shrink-0" />
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════
//  8. MVP CALCULATION
// ════════════════════════════════════════════════════════════════

export interface MVPData {
  name: string;
  score: number;
  setWins: number;
  pointDiff: number;
  matchesWon: number;
}

export function computeMVP(
  matches: { match: MatchData; label: string }[],
): MVPData | null {
  const stats: Record<string, { setWins: number; pointDiff: number; matchesWon: number }> = {};

  const ensure = (name: string) => {
    if (!stats[name]) stats[name] = { setWins: 0, pointDiff: 0, matchesWon: 0 };
  };

  for (const { match } of matches) {
    const p1 = match.player1.name;
    const p2 = match.player2.name;
    if (!p1 || !p2) continue;
    ensure(p1);
    ensure(p2);

    stats[p1].setWins += match.player1.matchWins;
    stats[p2].setWins += match.player2.matchWins;

    let pd1 = 0, pd2 = 0;
    for (let i = 0; i < match.bestOf; i++) {
      const s1 = match.player1.sets[i] || 0;
      const s2 = match.player2.sets[i] || 0;
      pd1 += s1 - s2;
      pd2 += s2 - s1;
    }
    stats[p1].pointDiff += pd1;
    stats[p2].pointDiff += pd2;

    if (match.winner === p1) stats[p1].matchesWon++;
    if (match.winner === p2) stats[p2].matchesWon++;
  }

  const candidates = Object.entries(stats).map(([name, s]) => ({
    name,
    setWins: s.setWins,
    pointDiff: s.pointDiff,
    matchesWon: s.matchesWon,
    // Score: matches won * 30 + set wins * 10 + point diff
    score: s.matchesWon * 30 + s.setWins * 10 + s.pointDiff,
  }));

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

// ════════════════════════════════════════════════════════════════
//  8b. MVP DISPLAY COMPONENT
// ════════════════════════════════════════════════════════════════

export function MVPBadge({ mvp, champion }: { mvp: MVPData; champion: string }) {
  const isMvpChampion = mvp.name === champion;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5 }}
      className="flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-card)] border border-primary/20"
      style={{ background: "var(--surface-container)" }}
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/15">
        <Award className="w-4 h-4 text-primary" />
      </div>
      <div className="flex flex-col">
        <span
          className="text-muted-foreground"
          style={{ fontFamily: FONT, fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          Turneringens MVP
        </span>
        <div className="flex items-center gap-2">
          <span
            className="text-primary"
            style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)" }}
          >
            {mvp.name}
          </span>
          {isMvpChampion && (
            <Crown className="w-3.5 h-3.5 text-warning" />
          )}
        </div>
      </div>
      <div className="ml-auto flex flex-col items-end">
        <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>
          {mvp.matchesWon}V · {mvp.setWins}S · {mvp.pointDiff > 0 ? "+" : ""}{mvp.pointDiff}p
        </span>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════
//  13b. WIN PROBABILITY BADGE (shown on bracket nodes)
// ════════════════════════════════════════════════════════════════

export function WinProbBadge({ prob, side }: { prob: number; side: "left" | "right" }) {
  const pct = Math.round(prob * 100);
  if (pct === 50) return null; // Don't show for perfectly even

  const isFavorite = pct > 50;
  return (
    <span
      className={`tabular-nums ${isFavorite ? "text-primary/70" : "text-muted-foreground/50"}`}
      style={{ fontFamily: FONT, fontSize: "10px", fontWeight: "var(--font-weight-semibold)" }}
    >
      {pct}%
    </span>
  );
}

// ════════════════════════════════════════════════════════════════
//  2. ANIMATED BRACKET CONNECTORS
// ════════════════════════════════════════════════════════════════

export function AnimatedConnectorDot({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <style>{`
      @keyframes flowDot {
        0% { transform: translateY(100%); opacity: 0; }
        20% { opacity: 1; }
        80% { opacity: 1; }
        100% { transform: translateY(-100%); opacity: 0; }
      }
      .flow-dot {
        position: absolute;
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: var(--primary);
        opacity: 0.6;
        animation: flowDot 2.5s ease-in-out infinite;
      }
      .flow-dot:nth-child(2) { animation-delay: 0.8s; }
      .flow-dot:nth-child(3) { animation-delay: 1.6s; }
      @keyframes flowDotH {
        0% { transform: translateX(-100%); opacity: 0; }
        20% { opacity: 1; }
        80% { opacity: 1; }
        100% { transform: translateX(100%); opacity: 0; }
      }
      .flow-dot-h {
        position: absolute;
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: var(--primary);
        opacity: 0.6;
        animation: flowDotH 2s ease-in-out infinite;
      }
      .flow-dot-h:nth-child(2) { animation-delay: 0.7s; }
      .flow-dot-h:nth-child(3) { animation-delay: 1.4s; }
    `}</style>
  );
}

// ════════════════════════════════════════════════════════════════
//  14. ROAD TO THE FINAL — Expandable history entry
// ════════════════════════════════════════════════════════════════

export function RoadToFinal({ entry }: {
  entry: {
    champion: string;
    players: string[];
    qf1Winner?: string; qf2Winner?: string; qf3Winner?: string; qf4Winner?: string;
    semi1Winner: string; semi2Winner: string;
  };
}) {
  const [expanded, setExpanded] = useState(false);
  const champion = entry.champion;

  // Reconstruct champion's path
  const path: { round: string; opponent: string; result: string }[] = [];

  // Find which QF the champion played
  const players = entry.players || [];
  // Standard seeding: QF1=1v8, QF2=4v5, QF3=2v7, QF4=3v6
  const qfMatchups = [
    { key: "qf1", p1: 0, p2: 7, winner: entry.qf1Winner },
    { key: "qf2", p1: 3, p2: 4, winner: entry.qf2Winner },
    { key: "qf3", p1: 1, p2: 6, winner: entry.qf3Winner },
    { key: "qf4", p1: 2, p2: 5, winner: entry.qf4Winner },
  ];

  let champQf: typeof qfMatchups[0] | null = null;
  for (const qf of qfMatchups) {
    if (qf.winner === champion) {
      const opp = players[qf.p1] === champion ? players[qf.p2] : players[qf.p1];
      if (opp) path.push({ round: "Kvartsfinal", opponent: opp, result: "Vinst" });
      champQf = qf;
      break;
    }
  }

  // Semi
  const inSf1 = entry.semi1Winner === champion;
  const inSf2 = entry.semi2Winner === champion;
  if (inSf1) {
    // SF1 = QF1w vs QF2w
    const opp = entry.qf1Winner === champion ? entry.qf2Winner : entry.qf1Winner;
    if (opp) path.push({ round: "Semifinal", opponent: opp, result: "Vinst" });
  } else if (inSf2) {
    const opp = entry.qf3Winner === champion ? entry.qf4Winner : entry.qf3Winner;
    if (opp) path.push({ round: "Semifinal", opponent: opp, result: "Vinst" });
  }

  // Final
  const finalOpp = inSf1 ? entry.semi2Winner : entry.semi1Winner;
  if (finalOpp) path.push({ round: "Final", opponent: finalOpp, result: "Vinst" });

  if (path.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <Target className="w-3 h-3" />
        <span style={{ fontFamily: FONT, fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" }}>
          Vägen till finalen
        </span>
        <ChevronDown
          className="w-3 h-3 transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1.5 mt-2 pl-1">
              {path.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-4">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        step.round === "Final" ? "bg-primary" : "bg-muted-foreground/40"
                      }`}
                    />
                  </div>
                  <span
                    className="text-muted-foreground/60"
                    style={{ fontFamily: FONT, fontSize: "10px", fontWeight: "var(--font-weight-bold)", letterSpacing: "0.1em", textTransform: "uppercase", minWidth: 72 }}
                  >
                    {step.round}
                  </span>
                  <span
                    className="text-foreground"
                    style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}
                  >
                    vs {step.opponent}
                  </span>
                  <span
                    className="text-success"
                    style={{ fontFamily: FONT, fontSize: "10px", fontWeight: "var(--font-weight-bold)" }}
                  >
                    ✓
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}