import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import {
  Users,
  Trophy,
  Plus,
  Minus,
  RotateCcw,
  Play,
  ChevronRight,
  Crown,
  Swords,
  Check,
  Shuffle,
  X,
} from "lucide-react";

const FONT = "'Titillium Web', sans-serif";

/* ── Types ── */
type AmericanoMatch = {
  team1: [string, string];
  team2: [string, string];
  score1: number;
  score2: number;
  completed: boolean;
};

type AmericanoRound = {
  matches: AmericanoMatch[];
  sitOut?: string; // player sitting out if odd number
};

type TournamentState = "setup" | "playing" | "finished";

type PointsPerRound = 16 | 21 | 24 | 32;

/* ── Helpers ── */

/** Generate all unique pairings from players */
/** Simpler round generation for americano — ensures all play */
function generateSimpleRounds(players: string[]): AmericanoRound[] {
  const n = players.length;
  const rounds: AmericanoRound[] = [];
  const numRounds = Math.max(n - 1, 4);

  for (let r = 0; r < numRounds; r++) {
    // Shuffle for this round
    const shuffled = [...players];
    // Deterministic shuffle based on round
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = ((r * 7 + i * 13) % (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const matches: AmericanoMatch[] = [];
    let sitOut: string | undefined;

    // Group into teams of 2
    const available = [...shuffled];
    if (available.length % 4 !== 0) {
      // If can't make even teams of 4, someone sits out
      if (available.length % 2 !== 0) {
        sitOut = available.pop();
      }
    }

    // Create 2v2 matches
    while (available.length >= 4) {
      const team1: [string, string] = [available.shift()!, available.shift()!];
      const team2: [string, string] = [available.shift()!, available.shift()!];
      matches.push({ team1, team2, score1: 0, score2: 0, completed: false });
    }

    // If 2 players left, they play 1v1 (represented as team with placeholder)
    if (available.length === 2) {
      matches.push({
        team1: [available[0], available[0]],
        team2: [available[1], available[1]],
        score1: 0,
        score2: 0,
        completed: false,
      });
    }

    if (matches.length > 0) {
      rounds.push({ matches, sitOut });
    }
  }

  return rounds;
}

/** Calculate standings from all rounds */
function calculateStandings(
  rounds: AmericanoRound[],
  players: string[]
): { name: string; points: number; played: number; wins: number; diff: number }[] {
  const stats: Record<string, { points: number; played: number; wins: number; against: number }> = {};
  players.forEach((p) => (stats[p] = { points: 0, played: 0, wins: 0, against: 0 }));

  rounds.forEach((round) => {
    round.matches.forEach((m) => {
      if (!m.completed) return;
      const isDouble = m.team1[0] !== m.team1[1];

      if (isDouble) {
        // 2v2
        m.team1.forEach((p) => {
          if (stats[p]) {
            stats[p].points += m.score1;
            stats[p].against += m.score2;
            stats[p].played++;
            if (m.score1 > m.score2) stats[p].wins++;
          }
        });
        m.team2.forEach((p) => {
          if (stats[p]) {
            stats[p].points += m.score2;
            stats[p].against += m.score1;
            stats[p].played++;
            if (m.score2 > m.score1) stats[p].wins++;
          }
        });
      } else {
        // 1v1
        const p1 = m.team1[0];
        const p2 = m.team2[0];
        if (stats[p1]) {
          stats[p1].points += m.score1;
          stats[p1].against += m.score2;
          stats[p1].played++;
          if (m.score1 > m.score2) stats[p1].wins++;
        }
        if (stats[p2]) {
          stats[p2].points += m.score2;
          stats[p2].against += m.score1;
          stats[p2].played++;
          if (m.score2 > m.score1) stats[p2].wins++;
        }
      }
    });
  });

  return players
    .map((name) => ({
      name,
      points: stats[name]?.points || 0,
      played: stats[name]?.played || 0,
      wins: stats[name]?.wins || 0,
      diff: (stats[name]?.points || 0) - (stats[name]?.against || 0),
    }))
    .sort((a, b) => b.points - a.points || b.diff - a.diff || b.wins - a.wins);
}

/* ── Component ── */
export function AmericanoTournament() {
  const [state, setState] = useState<TournamentState>("setup");
  const [playerNames, setPlayerNames] = useState<string[]>([""]);
  const [rounds, setRounds] = useState<AmericanoRound[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [pointsPerMatch, setPointsPerMatch] = useState<PointsPerRound>(21);

  const validPlayers = useMemo(
    () => playerNames.filter((n) => n.trim().length > 0).map((n) => n.trim()),
    [playerNames]
  );

  const standings = useMemo(
    () => calculateStandings(rounds, validPlayers),
    [rounds, validPlayers]
  );

  const currentRoundData = rounds[currentRound];
  const allCurrentCompleted = currentRoundData?.matches.every((m) => m.completed) ?? false;
  const allRoundsCompleted = rounds.length > 0 && rounds.every((r) => r.matches.every((m) => m.completed));

  const startTournament = useCallback(() => {
    if (validPlayers.length < 4) return;
    const generated = generateSimpleRounds(validPlayers);
    setRounds(generated);
    setCurrentRound(0);
    setState("playing");
  }, [validPlayers]);

  const updateScore = useCallback(
    (matchIdx: number, team: 1 | 2, delta: number) => {
      setRounds((prev) => {
        const next = prev.map((r, ri) => {
          if (ri !== currentRound) return r;
          return {
            ...r,
            matches: r.matches.map((m, mi) => {
              if (mi !== matchIdx) return m;
              if (m.completed) return m;
              const key = team === 1 ? "score1" : "score2";
              const newScore = Math.max(0, m[key] + delta);
              return { ...m, [key]: newScore };
            }),
          };
        });
        return next;
      });
    },
    [currentRound]
  );

  const completeMatch = useCallback(
    (matchIdx: number) => {
      setRounds((prev) =>
        prev.map((r, ri) => {
          if (ri !== currentRound) return r;
          return {
            ...r,
            matches: r.matches.map((m, mi) =>
              mi === matchIdx ? { ...m, completed: true } : m
            ),
          };
        })
      );
    },
    [currentRound]
  );

  const resetTournament = useCallback(() => {
    setState("setup");
    setRounds([]);
    setCurrentRound(0);
  }, []);

  /* ── Setup ── */
  if (state === "setup") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--warning) 15%, transparent)" }}
          >
            <Shuffle className="w-5 h-5" style={{ color: "var(--warning)" }} />
          </div>
          <div className="flex flex-col">
            <span
              style={{
                fontFamily: FONT,
                fontSize: "var(--text-lg)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--foreground)",
              }}
            >
              Americano
            </span>
            <span
              className="text-muted-foreground"
              style={{ fontFamily: FONT, fontSize: "var(--text-sm)" }}
            >
              Alla spelar med alla — poäng avgör
            </span>
          </div>
        </div>

        {/* Points per match selector */}
        <div
          className="rounded-[var(--radius-card)] border border-border/40 p-4"
          style={{ background: "var(--surface-container)" }}
        >
          <span
            className="text-muted-foreground block mb-3"
            style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
          >
            Poäng per match
          </span>
          <div className="flex gap-2">
            {([16, 21, 24, 32] as PointsPerRound[]).map((pts) => (
              <button
                key={pts}
                onClick={() => setPointsPerMatch(pts)}
                className={`flex-1 py-2 rounded-[var(--radius-button)] border transition-all cursor-pointer ${
                  pointsPerMatch === pts
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/40 text-muted-foreground hover:text-foreground hover:border-border/60"
                }`}
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-label)",
                  fontWeight: "var(--font-weight-semibold)",
                }}
              >
                {pts}
              </button>
            ))}
          </div>
        </div>

        {/* Player inputs */}
        <div
          className="rounded-[var(--radius-card)] border border-border/40 p-4 flex flex-col gap-2"
          style={{ background: "var(--surface-container)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-muted-foreground"
              style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
            >
              Spelare (minst 4)
            </span>
            <span
              className="text-muted-foreground"
              style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}
            >
              {validPlayers.length} spelare
            </span>
          </div>

          {playerNames.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-muted-foreground"
                style={{
                  background: "var(--surface-container-high)",
                  fontFamily: FONT,
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--font-weight-bold)",
                }}
              >
                {i + 1}
              </div>
              <input
                value={name}
                onChange={(e) => {
                  const next = [...playerNames];
                  next[i] = e.target.value;
                  setPlayerNames(next);
                }}
                placeholder={`Spelare ${i + 1}`}
                className="flex-1 px-3 py-2 rounded-[var(--radius-button)] border border-border/40 bg-surface-container-low text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors"
                style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
              />
              {playerNames.length > 1 && (
                <button
                  onClick={() => setPlayerNames((prev) => prev.filter((_, j) => j !== i))}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={() => setPlayerNames((prev) => [...prev, ""])}
            className="flex items-center justify-center gap-2 py-2 rounded-[var(--radius-button)] border border-dashed border-border/40 text-muted-foreground hover:text-foreground hover:border-border/60 transition-colors cursor-pointer mt-1"
            style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
          >
            <Plus className="w-4 h-4" />
            Lägg till spelare
          </button>
        </div>

        {/* Start button */}
        <button
          onClick={startTournament}
          disabled={validPlayers.length < 4}
          className="w-full py-3 rounded-[var(--radius-card)] border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            fontFamily: FONT,
            fontSize: "var(--text-base)",
            fontWeight: "var(--font-weight-bold)",
            color: validPlayers.length >= 4 ? "var(--primary)" : "var(--muted-foreground)",
            background: validPlayers.length >= 4 ? "color-mix(in srgb, var(--primary) 10%, var(--surface-container))" : "var(--surface-container)",
            borderColor: validPlayers.length >= 4 ? "color-mix(in srgb, var(--primary) 30%, var(--border))" : "var(--border)",
          }}
        >
          <Play className="w-4 h-4 inline mr-2" />
          Starta Americano
        </button>
      </motion.div>
    );
  }

  /* ── Finished ── */
  if (state === "finished" || allRoundsCompleted) {
    const winner = standings[0];
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        {/* Champion card */}
        <div
          className="rounded-[var(--radius-card)] border p-6 text-center relative overflow-hidden"
          style={{
            background: "var(--surface-container)",
            borderColor: "color-mix(in srgb, var(--primary) 40%, var(--border))",
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: "linear-gradient(90deg, transparent, var(--primary), transparent)" }}
          />
          <Crown className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--warning)" }} />
          <div
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-h3)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--primary)",
            }}
          >
            {winner?.name}
          </div>
          <div
            className="text-muted-foreground mt-1"
            style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
          >
            {winner?.points} poäng · {winner?.wins} vinster · Diff: {winner?.diff > 0 ? "+" : ""}{winner?.diff}
          </div>
        </div>

        {/* Final standings */}
        <StandingsTable standings={standings} highlightTop={3} />

        <button
          onClick={resetTournament}
          className="w-full py-3 rounded-[var(--radius-card)] border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/60 transition-colors cursor-pointer"
          style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
        >
          <RotateCcw className="w-4 h-4 inline mr-2" />
          Ny turnering
        </button>
      </motion.div>
    );
  }

  /* ── Playing ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      {/* Round navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-primary" />
          <span
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-base)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--foreground)",
            }}
          >
            Runda {currentRound + 1} / {rounds.length}
          </span>
        </div>
        <button
          onClick={resetTournament}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          style={{ fontFamily: FONT, fontSize: "var(--text-sm)" }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Avbryt
        </button>
      </div>

      {/* Round progress dots */}
      <div className="flex gap-1.5">
        {rounds.map((r, i) => {
          const done = r.matches.every((m) => m.completed);
          const active = i === currentRound;
          return (
            <button
              key={i}
              onClick={() => setCurrentRound(i)}
              className="flex-1 h-2 rounded-full transition-all cursor-pointer"
              style={{
                background: done
                  ? "var(--primary)"
                  : active
                  ? "color-mix(in srgb, var(--primary) 40%, var(--surface-container-high))"
                  : "var(--surface-container-high)",
              }}
            />
          );
        })}
      </div>

      {/* Matches for current round */}
      {currentRoundData && (
        <div className="flex flex-col gap-3">
          {currentRoundData.sitOut && (
            <div
              className="rounded-[var(--radius-button)] px-3 py-2 flex items-center gap-2 text-muted-foreground"
              style={{ background: "var(--surface-container)", fontFamily: FONT, fontSize: "var(--text-sm)" }}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{currentRoundData.sitOut} vilar denna runda</span>
            </div>
          )}

          {currentRoundData.matches.map((match, mi) => (
            <MatchCard
              key={mi}
              match={match}
              maxPoints={pointsPerMatch}
              onScore={(team, delta) => updateScore(mi, team, delta)}
              onComplete={() => completeMatch(mi)}
            />
          ))}
        </div>
      )}

      {/* Next round / Finish button */}
      {allCurrentCompleted && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {currentRound < rounds.length - 1 ? (
            <button
              onClick={() => setCurrentRound((p) => p + 1)}
              className="w-full py-3 rounded-[var(--radius-card)] border transition-all cursor-pointer"
              style={{
                fontFamily: FONT,
                fontSize: "var(--text-label)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--primary)",
                background: "color-mix(in srgb, var(--primary) 8%, var(--surface-container))",
                borderColor: "color-mix(in srgb, var(--primary) 30%, var(--border))",
              }}
            >
              Nästa runda
              <ChevronRight className="w-4 h-4 inline ml-1" />
            </button>
          ) : (
            <button
              onClick={() => setState("finished")}
              className="w-full py-3 rounded-[var(--radius-card)] border transition-all cursor-pointer"
              style={{
                fontFamily: FONT,
                fontSize: "var(--text-label)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--success)",
                background: "color-mix(in srgb, var(--success) 8%, var(--surface-container))",
                borderColor: "color-mix(in srgb, var(--success) 30%, var(--border))",
              }}
            >
              <Trophy className="w-4 h-4 inline mr-2" />
              Avsluta turnering
            </button>
          )}
        </motion.div>
      )}

      {/* Live standings */}
      <div className="mt-2">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-muted-foreground" />
          <span
            className="text-muted-foreground"
            style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
          >
            Ställning
          </span>
        </div>
        <StandingsTable standings={standings} highlightTop={0} />
      </div>
    </motion.div>
  );
}

/* ── Match Card ── */
function MatchCard({
  match,
  onScore,
  onComplete,
}: {
  match: AmericanoMatch;
  maxPoints: number;
  onScore: (team: 1 | 2, delta: number) => void;
  onComplete: () => void;
}) {
  const isDouble = match.team1[0] !== match.team1[1];
  const team1Label = isDouble ? match.team1.join(" & ") : match.team1[0];
  const team2Label = isDouble ? match.team2.join(" & ") : match.team2[0];
  const canComplete = !match.completed && (match.score1 > 0 || match.score2 > 0) && match.score1 !== match.score2;

  return (
    <div
      className="rounded-[var(--radius-card)] border p-4 transition-colors"
      style={{
        background: match.completed
          ? "color-mix(in srgb, var(--success) 3%, var(--surface-container))"
          : "var(--surface-container)",
        borderColor: match.completed
          ? "color-mix(in srgb, var(--success) 25%, var(--border))"
          : "var(--border)",
        opacity: match.completed ? 0.75 : 1,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Team 1 */}
        <div className="flex-1 flex flex-col items-end gap-1 min-w-0">
          <span
            className="truncate w-full text-right"
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-label)",
              fontWeight: "var(--font-weight-semibold)",
              color: match.completed && match.score1 > match.score2 ? "var(--success)" : "var(--foreground)",
            }}
          >
            {team1Label}
          </span>
          {!match.completed && (
            <div className="flex items-center gap-1">
              <ScoreButton onClick={() => onScore(1, -1)} icon={<Minus className="w-3 h-3" />} />
              <ScoreButton onClick={() => onScore(1, 1)} icon={<Plus className="w-3 h-3" />} accent />
            </div>
          )}
        </div>

        {/* Score */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="w-8 text-center tabular-nums"
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-h4)",
              fontWeight: "var(--font-weight-bold)",
              color: match.completed && match.score1 > match.score2 ? "var(--success)" : "var(--foreground)",
            }}
          >
            {match.score1}
          </span>
          <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-sm)" }}>
            –
          </span>
          <span
            className="w-8 text-center tabular-nums"
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-h4)",
              fontWeight: "var(--font-weight-bold)",
              color: match.completed && match.score2 > match.score1 ? "var(--success)" : "var(--foreground)",
            }}
          >
            {match.score2}
          </span>
        </div>

        {/* Team 2 */}
        <div className="flex-1 flex flex-col items-start gap-1 min-w-0">
          <span
            className="truncate w-full"
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-label)",
              fontWeight: "var(--font-weight-semibold)",
              color: match.completed && match.score2 > match.score1 ? "var(--success)" : "var(--foreground)",
            }}
          >
            {team2Label}
          </span>
          {!match.completed && (
            <div className="flex items-center gap-1">
              <ScoreButton onClick={() => onScore(2, -1)} icon={<Minus className="w-3 h-3" />} />
              <ScoreButton onClick={() => onScore(2, 1)} icon={<Plus className="w-3 h-3" />} accent />
            </div>
          )}
        </div>
      </div>

      {/* Complete button */}
      {canComplete && (
        <button
          onClick={onComplete}
          className="w-full mt-3 py-2 rounded-[var(--radius-button)] border transition-all cursor-pointer"
          style={{
            fontFamily: FONT,
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--success)",
            background: "color-mix(in srgb, var(--success) 8%, transparent)",
            borderColor: "color-mix(in srgb, var(--success) 25%, var(--border))",
          }}
        >
          <Check className="w-3.5 h-3.5 inline mr-1.5" />
          Klar
        </button>
      )}

      {match.completed && (
        <div className="flex items-center justify-center gap-1.5 mt-2 text-muted-foreground" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
          <Check className="w-3 h-3" style={{ color: "var(--success)" }} />
          Slutförd
        </div>
      )}
    </div>
  );
}

/* ── Score Button ── */
function ScoreButton({ onClick, icon, accent }: { onClick: () => void; icon: React.ReactNode; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-7 h-7 flex items-center justify-center rounded-full border transition-all cursor-pointer active:scale-90"
      style={{
        background: accent ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
        borderColor: accent ? "color-mix(in srgb, var(--primary) 30%, var(--border))" : "var(--border)",
        color: accent ? "var(--primary)" : "var(--muted-foreground)",
      }}
    >
      {icon}
    </button>
  );
}

/* ── Standings Table ── */
function StandingsTable({
  standings,
  highlightTop,
}: {
  standings: { name: string; points: number; played: number; wins: number; diff: number }[];
  highlightTop: number;
}) {
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div
      className="rounded-[var(--radius-card)] border border-border/40 overflow-hidden"
      style={{ background: "var(--surface-container)" }}
    >
      {/* Header */}
      <div
        className="grid px-4 py-2 border-b border-border/30 text-muted-foreground"
        style={{
          gridTemplateColumns: "2rem 1fr 3.5rem 3rem 3.5rem",
          fontFamily: FONT,
          fontSize: "var(--text-xs)",
          fontWeight: "var(--font-weight-semibold)",
          letterSpacing: "0.05em",
          background: "var(--surface-container-high)",
        }}
      >
        <span>#</span>
        <span>Spelare</span>
        <span className="text-right">Poäng</span>
        <span className="text-right">V</span>
        <span className="text-right">Diff</span>
      </div>

      {standings.map((s, i) => (
        <div
          key={`${s.name}-${i}`}
          className="grid px-4 py-2.5 border-b border-border/20 last:border-b-0 items-center transition-colors"
          style={{
            gridTemplateColumns: "2rem 1fr 3.5rem 3rem 3.5rem",
            background: i < highlightTop ? `color-mix(in srgb, var(--primary) ${4 - i}%, transparent)` : undefined,
          }}
        >
          <span
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-label)",
              fontWeight: "var(--font-weight-bold)",
              color: i < 3 && highlightTop > 0 ? "var(--primary)" : "var(--muted-foreground)",
            }}
          >
            {i < 3 && highlightTop > 0 ? medals[i] : i + 1}
          </span>
          <span
            className="truncate"
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-label)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--foreground)",
            }}
          >
            {s.name}
          </span>
          <span
            className="text-right tabular-nums"
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-label)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--primary)",
            }}
          >
            {s.points}
          </span>
          <span
            className="text-right tabular-nums text-muted-foreground"
            style={{ fontFamily: FONT, fontSize: "var(--text-sm)" }}
          >
            {s.wins}
          </span>
          <span
            className="text-right tabular-nums"
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-sm)",
              color: s.diff > 0 ? "var(--success)" : s.diff < 0 ? "var(--destructive)" : "var(--muted-foreground)",
            }}
          >
            {s.diff > 0 ? "+" : ""}{s.diff}
          </span>
        </div>
      ))}
    </div>
  );
}