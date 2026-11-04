/* Shared types + logic — used by both the mini card and the fullscreen view */

import { PlayerAvatar, WinProbBadge } from "./tournament-enhancements";
import { isGoldenSet } from "../lib/golden-set";

export interface PlayerScore {
  name: string;
  sets: number[];
  matchWins: number;
  yellowCards: number;
}

export interface MatchData {
  id: string;
  label: string;
  player1: PlayerScore;
  player2: PlayerScore;
  bestOf: number;
  winner: string | null;
}

export function createMatch(id: string, label: string, bestOf: number): MatchData {
  return {
    id,
    label,
    player1: { name: "", sets: new Array(bestOf).fill(0), matchWins: 0, yellowCards: 0 },
    player2: { name: "", sets: new Array(bestOf).fill(0), matchWins: 0, yellowCards: 0 },
    bestOf,
    winner: null,
  };
}

/** Recalculate wins + winner after a score change */
export function recalcMatch(
  match: MatchData,
  p1Placeholder: string,
  p2Placeholder: string
): MatchData {
  let p1Wins = 0;
  let p2Wins = 0;
  const setsToWin = Math.ceil(match.bestOf / 2);

  for (let i = 0; i < match.bestOf; i++) {
    const s1 = match.player1.sets[i] || 0;
    const s2 = match.player2.sets[i] || 0;
    if (s1 >= 11 && s1 - s2 >= 2) p1Wins++;
    else if (s2 >= 11 && s2 - s1 >= 2) p2Wins++;
  }

  match.player1.matchWins = p1Wins;
  match.player2.matchWins = p2Wins;

  if (p1Wins >= setsToWin) {
    match.winner = match.player1.name || p1Placeholder;
  } else if (p2Wins >= setsToWin) {
    match.winner = match.player2.name || p2Placeholder;
  } else {
    match.winner = null;
  }

  return match;
}

/* ── Compact bracket card (minimalist, 2026-trend) ────────────────── */

interface MiniMatchCardProps {
  match: MatchData;
  p1Placeholder: string;
  p2Placeholder: string;
  disabled?: boolean;
  isFinal?: boolean;
  onClick?: () => void;
  p1WinProb?: number;
  p2WinProb?: number;
  p1Elo?: number;
  p2Elo?: number;
}

export function MiniMatchCard({
  match,
  p1Placeholder,
  p2Placeholder,
  disabled = false,
  isFinal = false,
  onClick,
  p1WinProb,
  p2WinProb,
  p1Elo,
  p2Elo,
}: MiniMatchCardProps) {
  const p1Name = match.player1.name || p1Placeholder;
  const p2Name = match.player2.name || p2Placeholder;

  const p1IsWinner = match.winner === p1Name;
  const p2IsWinner = match.winner === p2Name;

  // Check if any set has been played
  const hasScores = match.player1.sets.some((s, i) => s > 0 || (match.player2.sets[i] || 0) > 0);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group w-full text-left rounded-[var(--radius-card)] border transition-all duration-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden ${
        isFinal
          ? match.winner
            ? "bg-primary/[0.06] border-primary/20"
            : "bg-surface-container-low/80 border-border/40 hover:border-primary/30"
          : match.winner
          ? "bg-surface-container/70 border-primary/15"
          : "bg-surface-container-low/60 border-border/30 hover:border-border/60 hover:bg-surface-container-low"
      }`}
    >
      {/* Player rows */}
      <PlayerRow
        name={p1Name}
        hasCustomName={!!match.player1.name}
        setWins={match.player1.matchWins}
        yellowCards={match.player1.yellowCards}
        isWinner={p1IsWinner}
        isLoser={p2IsWinner}
        winProb={p1WinProb}
        showAvatar={!!match.player1.name}
        elo={p1Elo}
      />
      <div className="h-px bg-border/30 mx-3" />
      <PlayerRow
        name={p2Name}
        hasCustomName={!!match.player2.name}
        setWins={match.player2.matchWins}
        yellowCards={match.player2.yellowCards}
        isWinner={p2IsWinner}
        isLoser={p1IsWinner}
        winProb={p2WinProb}
        showAvatar={!!match.player2.name}
        elo={p2Elo}
      />
      {/* Set scores preview (feature 5) */}
      {hasScores && (
        <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 border-t border-border/20">
          {Array.from({ length: match.bestOf }).map((_, i) => {
            const s1 = match.player1.sets[i] || 0;
            const s2 = match.player2.sets[i] || 0;
            const played = (s1 >= 11 && s1 - s2 >= 2) || (s2 >= 11 && s2 - s1 >= 2);
            const golden = isGoldenSet(s1, s2);
            if (s1 === 0 && s2 === 0) return null;
            const won1 = s1 >= 11 && s1 - s2 >= 2;
            const won2 = s2 >= 11 && s2 - s1 >= 2;
            return (
              <div
                key={i}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded ${golden ? "ring-1 ring-warning/40" : ""}`}
                style={{ background: played ? "var(--surface-container-high)" : "transparent" }}
                title={golden ? "Gyllene set!" : undefined}
              >
                <span
                  className={`tabular-nums ${won1 ? "text-primary" : "text-muted-foreground/60"}`}
                  style={{ fontSize: "10px", fontWeight: won1 ? "var(--font-weight-bold)" : "var(--font-weight-normal)" }}
                >
                  {s1}
                </span>
                <span className="text-muted-foreground/60" style={{ fontSize: "9px" }}>–</span>
                <span
                  className={`tabular-nums ${won2 ? "text-primary" : "text-muted-foreground/60"}`}
                  style={{ fontSize: "10px", fontWeight: won2 ? "var(--font-weight-bold)" : "var(--font-weight-normal)" }}
                >
                  {s2}
                </span>
                {golden && <span style={{ fontSize: "8px" }}>⭐</span>}
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

function PlayerRow({
  name,
  hasCustomName,
  setWins,
  yellowCards,
  isWinner,
  isLoser,
  winProb,
  showAvatar = false,
  elo,
}: {
  name: string;
  hasCustomName: boolean;
  setWins: number;
  yellowCards: number;
  isWinner: boolean;
  isLoser: boolean;
  winProb?: number;
  showAvatar?: boolean;
  elo?: number;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 transition-colors duration-300`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Player avatar (feature 3) */}
        {showAvatar ? (
          <PlayerAvatar name={name} size={20} />
        ) : (
          /* Win indicator dot */
          <div className={`w-2 h-2 rounded-full shrink-0 transition-all duration-300 ${
            isWinner ? "bg-primary scale-100" : "bg-transparent scale-0"
          }`} />
        )}
        <span
          className={`truncate transition-colors duration-300 ${
            isWinner ? "text-primary" : isLoser ? "text-muted-foreground/60" : hasCustomName ? "text-foreground" : "text-muted-foreground"
          }`}
          style={{
            fontSize: "var(--text-base)",
            fontWeight: isWinner ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
          }}
        >
          {name}
        </span>
        {yellowCards > 0 && (
          <div
            className="relative flex items-center justify-center shrink-0 rounded-[1px]"
            style={{
              width: "14px",
              height: "18px",
              background: "var(--warning)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            }}
          >
            <span
              style={{
                fontSize: yellowCards >= 10 ? "7px" : "9px",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--warning-foreground)",
                lineHeight: 1,
              }}
            >
              {yellowCards}
            </span>
          </div>
        )}
        {/* Win probability badge (feature 13) */}
        {winProb !== undefined && !isWinner && !isLoser && (
          <WinProbBadge prob={winProb} side="left" />
        )}
        {/* Elo rating (feature 14) */}
        {elo !== undefined && (
          <span
            className="text-muted-foreground/50"
            style={{ fontSize: "10px", fontWeight: "var(--font-weight-normal)" }}
          >
            {elo}
          </span>
        )}
      </div>
      <span
        className={`tabular-nums ml-3 transition-colors duration-300 ${
          isWinner ? "text-primary" : isLoser ? "text-muted-foreground/60" : "text-muted-foreground"
        }`}
        style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)" }}
      >
        {setWins}
      </span>
    </div>
  );
}