import { motion } from "motion/react";
import {
  Clock, Check, X, Trophy, TrendingUp, TrendingDown, Ticket, CalendarDays,
} from "lucide-react";
import type { PlacedBet } from "./api";

const FONT = "'Titillium Web', sans-serif";

interface BetHistoryProps {
  bets: PlacedBet[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export function BetHistory({ bets }: BetHistoryProps) {
  const resolved = bets
    .filter((b) => b.resolved)
    .sort((a, b) => (b.resolvedAt || b.placedAt) - (a.resolvedAt || a.placedAt));

  const pending = bets
    .filter((b) => !b.resolved)
    .sort((a, b) => b.placedAt - a.placedAt);

  const totalWon = resolved.filter((b) => b.won).reduce((s, b) => s + Math.round(b.amount * b.odds), 0);
  const totalLost = resolved.filter((b) => !b.won).reduce((s, b) => s + b.amount, 0);
  const winRate = resolved.length > 0
    ? Math.round((resolved.filter((b) => b.won).length / resolved.length) * 100)
    : 0;

  if (bets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Clock className="w-10 h-10 text-muted-foreground/30" />
        <div>
          <p
            className="text-foreground"
            style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}
          >
            Ingen historik \u00e4n
          </p>
          <p className="text-muted-foreground mt-1" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
            Dina avslutade bets visas h\u00e4r
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Clock className="w-4.5 h-4.5 text-primary" />
        <span
          className="text-foreground"
          style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}
        >
          Historik
        </span>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-2">
        <StatMini label="Totalt" value={String(bets.length)} color="text-foreground" />
        <StatMini label="Vinst%" value={`${winRate}%`} color="text-primary" />
        <StatMini label="Vunnet" value={`+${totalWon}`} color="text-[var(--success)]" />
        <StatMini label="F\u00f6rlorat" value={`-${totalLost}`} color="text-destructive" />
      </div>

      {/* Pending bets */}
      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <span
            className="text-muted-foreground flex items-center gap-1.5"
            style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Aktiva bets ({pending.length})
          </span>
          {pending.map((bet, idx) => (
            <BetRow key={bet.id} bet={bet} idx={idx} />
          ))}
        </div>
      )}

      {/* Resolved bets */}
      {resolved.length > 0 && (
        <div className="flex flex-col gap-2">
          <span
            className="text-muted-foreground"
            style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
          >
            Avslutade bets ({resolved.length})
          </span>
          {resolved.map((bet, idx) => (
            <BetRow key={bet.id} bet={bet} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

function BetRow({ bet, idx }: { bet: PlacedBet; idx: number }) {
  const isWon = bet.resolved && bet.won;
  const isLost = bet.resolved && !bet.won;
  const isPending = !bet.resolved;
  const payout = Math.round(bet.amount * bet.odds);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-[var(--radius-card)] border transition-all ${
        isWon
          ? "border-[var(--success)]/20 bg-[var(--success)]/[0.04]"
          : isLost
          ? "border-destructive/15 bg-destructive/[0.03]"
          : "border-border/30 bg-surface-container-low/50"
      }`}
    >
      {/* Status icon */}
      <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        isWon
          ? "bg-[var(--success)]/15"
          : isLost
          ? "bg-destructive/15"
          : "bg-primary/10"
      }`}>
        {isWon && <Check className="w-3.5 h-3.5 text-[var(--success)]" />}
        {isLost && <X className="w-3.5 h-3.5 text-destructive" />}
        {isPending && <Clock className="w-3.5 h-3.5 text-primary" />}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-foreground truncate"
            style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}
          >
            {bet.player}
          </span>
          <span
            className="text-muted-foreground/50 shrink-0"
            style={{ fontFamily: FONT, fontSize: "11px" }}
          >
            {bet.matchLabel || bet.matchId}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-muted-foreground" style={{ fontFamily: FONT, fontSize: "12px" }}>
            <Ticket className="w-3 h-3" />
            {bet.amount} insats
          </span>
          <span className="text-muted-foreground/40" style={{ fontFamily: FONT, fontSize: "12px" }}>
            \u00d7{bet.odds.toFixed(2)}
          </span>
          {bet.placedAt && (
            <span className="flex items-center gap-1 text-muted-foreground/40" style={{ fontFamily: FONT, fontSize: "11px" }}>
              <CalendarDays className="w-2.5 h-2.5" />
              {formatDate(bet.placedAt)} {formatTime(bet.placedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Result */}
      <div className="flex flex-col items-end shrink-0">
        {isWon && (
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-[var(--success)]" />
            <span
              className="text-[var(--success)] tabular-nums"
              style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }}
            >
              +{payout}
            </span>
          </div>
        )}
        {isLost && (
          <div className="flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-destructive" />
            <span
              className="text-destructive tabular-nums"
              style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }}
            >
              -{bet.amount}
            </span>
          </div>
        )}
        {isPending && (
          <span
            className="text-primary tabular-nums"
            style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }}
          >
            m\u00f6jlig +{payout}
          </span>
        )}
        {bet.resolvedAt && (
          <span className="text-muted-foreground/40 mt-0.5" style={{ fontFamily: FONT, fontSize: "10px" }}>
            {formatTime(bet.resolvedAt)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function StatMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-[var(--radius-card)] border border-border/30 px-2 py-2.5 text-center"
      style={{ background: "var(--surface-container-low)" }}
    >
      <p className={`tabular-nums ${color}`} style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }}>
        {value}
      </p>
      <p className="text-muted-foreground/70" style={{ fontFamily: FONT, fontSize: "10px" }}>
        {label}
      </p>
    </div>
  );
}