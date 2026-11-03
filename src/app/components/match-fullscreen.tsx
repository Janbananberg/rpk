import { useEffect, useCallback, useRef, useState } from "react";
import { Minus, Plus, X, RotateCcw, Trophy, ChevronDown, Undo2, Monitor, LayoutGrid, TrendingUp } from "lucide-react";
import { MatchData, recalcMatch } from "./match-card";
import { CoinFlip } from "./coin-flip";
import { FlipScoreboard } from "./flip-scoreboard";
import { motion, AnimatePresence } from "motion/react";
import karmaImage from "../../assets/karma.png";
import { computePotDistribution } from "../lib/elo";

type ScoreStyle = "modern" | "classic";

// ── Karma voice using Web Speech API ──
function speakKarma() {
  try {
    if (!("speechSynthesis" in window)) return;
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Karma karma, din lilla smuts");
    utterance.lang = "sv-SE";
    utterance.rate = 0.85;
    utterance.pitch = 0.9;
    utterance.volume = 1;
    // Try to pick a Swedish voice if available
    const voices = window.speechSynthesis.getVoices();
    const svVoice = voices.find((v) => v.lang.startsWith("sv"));
    if (svVoice) utterance.voice = svVoice;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Silently fail — speech is a nice-to-have
  }
}

export interface EloMatchInfo {
  p1Elo: number;
  p2Elo: number;
  participantCount: number;
}

interface MatchFullscreenProps {
  match: MatchData;
  onUpdate: (match: MatchData) => void;
  onClose: () => void;
  disabled?: boolean;
  p1Placeholder: string;
  p2Placeholder: string;
  eloInfo?: EloMatchInfo;
}

export function MatchFullscreen({
  match,
  onUpdate,
  onClose,
  disabled = false,
  p1Placeholder,
  p2Placeholder,
  eloInfo,
}: MatchFullscreenProps) {
  const historyRef = useRef<MatchData[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [server, setServer] = useState<string | null>(null);
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [scoreStyle, setScoreStyle] = useState<ScoreStyle>("modern");
  const [showKarma, setShowKarma] = useState(false);
  const karmaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preload speech synthesis voices (they load async in some browsers)
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener?.("voiceschanged", () => {
        window.speechSynthesis.getVoices();
      });
    }
  }, []);

  // Show coin flip prompt on first open when match is fresh (no scores)
  const matchIsFresh = match.player1.sets.every((s) => s === 0) &&
    match.player2.sets.every((s) => s === 0) && !match.winner;

  const pushHistory = useCallback((state: MatchData) => {
    historyRef.current = [...historyRef.current, JSON.parse(JSON.stringify(state))];
    setCanUndo(true);
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setCanUndo(historyRef.current.length > 0);
    onUpdate(prev);
  }, [onUpdate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, undo]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const updateSetScore = useCallback(
    (player: "player1" | "player2", setIndex: number, delta: number) => {
      if (disabled || match.winner) return;
      pushHistory(match);
      const newSets = [...match[player].sets];
      newSets[setIndex] = Math.max(0, Math.min(99, (newSets[setIndex] || 0) + delta));
      const updated = recalcMatch(
        { ...match, [player]: { ...match[player], sets: newSets } },
        p1Placeholder, p2Placeholder
      );
      onUpdate(updated);
    },
    [match, disabled, onUpdate, p1Placeholder, p2Placeholder, pushHistory]
  );

  const resetMatch = () => {
    pushHistory(match);
    onUpdate({
      ...match,
      player1: { ...match.player1, sets: new Array(match.bestOf).fill(0), matchWins: 0, yellowCards: 0 },
      player2: { ...match.player2, sets: new Array(match.bestOf).fill(0), matchWins: 0, yellowCards: 0 },
      winner: null,
    });
  };

  const activeSet = (() => {
    for (let i = 0; i < match.bestOf; i++) {
      const s1 = match.player1.sets[i] || 0;
      const s2 = match.player2.sets[i] || 0;
      if (!((s1 >= 11 && s1 - s2 >= 2) || (s2 >= 11 && s2 - s1 >= 2))) return i;
    }
    return match.bestOf - 1;
  })();

  const p1Name = match.player1.name || p1Placeholder;
  const p2Name = match.player2.name || p2Placeholder;
  const p1Won = match.winner === p1Name;
  const p2Won = match.winner === p2Name;
  const matchDone = !!match.winner;

  // ── Serve tracking ──
  // Determine who is currently serving based on first server, set index, and point totals
  const currentServer: "player1" | "player2" | null = (() => {
    if (!server) return null;

    const firstKey: "player1" | "player2" = server === p1Name ? "player1" : "player2";
    const otherKey: "player1" | "player2" = firstKey === "player1" ? "player2" : "player1";

    // Starting server alternates each set
    const setStartKey = activeSet % 2 === 0 ? firstKey : otherKey;
    const setOtherKey = setStartKey === "player1" ? "player2" : "player1";

    const s1 = match.player1.sets[activeSet] || 0;
    const s2 = match.player2.sets[activeSet] || 0;
    const total = s1 + s2;

    // Deuce: both ≥ 10 → 1 serve each
    if (s1 >= 10 && s2 >= 10) {
      const deucePoints = total - 20;
      return deucePoints % 2 === 0 ? setStartKey : setOtherKey;
    }

    // Normal: 2 serves each
    const block = Math.floor(total / 2) % 2;
    return block === 0 ? setStartKey : setOtherKey;
  })();

  const p1Serves = currentServer === "player1" && !matchDone;
  const p2Serves = currentServer === "player2" && !matchDone;

  // Allow setting server by tapping name when no server chosen
  const handleNameClick = (name: string) => {
    if (!server && matchIsFresh) {
      setServer(name);
    }
  };

  // ── Yellow card ──
  const toggleYellowCard = useCallback(
    (player: "player1" | "player2", delta: number) => {
      pushHistory(match);
      const current = match[player].yellowCards || 0;
      const next = Math.max(0, Math.min(99, current + delta));
      onUpdate({
        ...match,
        [player]: { ...match[player], yellowCards: next },
      });
      // Trigger karma animation when adding a card
      if (delta > 0) {
        if (karmaTimeoutRef.current) clearTimeout(karmaTimeoutRef.current);
        setShowKarma(true);
        karmaTimeoutRef.current = setTimeout(() => setShowKarma(false), 2400);
        // Speak karma
        speakKarma();
      }
    },
    [match, onUpdate, pushHistory]
  );

  // Cleanup karma timeout
  useEffect(() => {
    return () => {
      if (karmaTimeoutRef.current) clearTimeout(karmaTimeoutRef.current);
    };
  }, []);

  // Show coin flip overlay
  if (showCoinFlip) {
    return (
      <CoinFlip
        player1={p1Name}
        player2={p2Name}
        onResult={(s) => { setServer(s); setShowCoinFlip(false); }}
        onSkip={() => setShowCoinFlip(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onClose}
            className="p-2 -ml-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-container-high transition-all duration-200 cursor-pointer"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
          <span
            className="text-muted-foreground"
            style={{ fontSize: "var(--text-label)" }}
          >
            {match.label}
          </span>
          <span
            className="text-muted-foreground/60"
            style={{ fontSize: "var(--text-sm)" }}
          >
            Bo{match.bestOf}
          </span>
          {server && !matchDone && (match.player1.sets[activeSet] || 0) >= 10 && (match.player2.sets[activeSet] || 0) >= 10 && (
            <span
              className="text-warning"
              style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" }}
            >
              · Deuce · 1 serv var
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {matchIsFresh && !server && (
            <button
              onClick={() => setShowCoinFlip(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] text-muted-foreground hover:text-foreground hover:bg-surface-container-high transition-all duration-200 cursor-pointer"
              style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
            >
              🪙 Singla slant
            </button>
          )}
          {/* Style toggle */}
          <div className="flex items-center p-0.5 rounded-[var(--radius-button)] bg-surface-container">
            <button
              onClick={() => setScoreStyle("modern")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-button)] transition-all duration-200 cursor-pointer ${
                scoreStyle === "modern"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" }}
              title="Modern"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setScoreStyle("classic")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-button)] transition-all duration-200 cursor-pointer ${
                scoreStyle === "classic"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" }}
              title="Klassisk"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
          {canUndo && (
            <button
              onClick={undo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] text-muted-foreground hover:text-foreground hover:bg-surface-container-high transition-all duration-200 cursor-pointer"
              style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
              title="Ångra (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Ångra
            </button>
          )}
          {matchDone && (
            <button
              onClick={resetMatch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] text-muted-foreground hover:text-destructive transition-all duration-200 cursor-pointer"
              style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Återställ
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-container-high transition-all duration-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col justify-center items-center overflow-hidden px-2 sm:px-4">
        {/* Winner banner + Elo changes */}
        {matchDone && (
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-primary" />
              <span
                className="text-primary"
                style={{ fontSize: "var(--text-h4)", fontWeight: "var(--font-weight-semibold)" }}
              >
                {match.winner} vinner!
              </span>
            </div>
            {eloInfo && (() => {
              const winnerIsP1 = match.winner === p1Name;
              const rWinner = winnerIsP1 ? eloInfo.p1Elo : eloInfo.p2Elo;
              const rLoser = winnerIsP1 ? eloInfo.p2Elo : eloInfo.p1Elo;
              const loserName = winnerIsP1 ? p2Name : p1Name;
              const { winnerDelta, loserDelta, pot, isUpset, upsetBonus } = computePotDistribution(rWinner, rLoser, eloInfo.participantCount);
              const nonFinalistDelta = -3;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="flex flex-col items-center gap-2 px-5 py-3 rounded-[var(--radius-card)] border border-border/40"
                  style={{ background: "var(--surface-container-high)", fontFamily: "'Titillium Web', sans-serif" }}
                >
                  <div className="flex items-center gap-1.5" style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                    <span>Elo-pott:</span>
                    <span style={{ fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>{pot}</span>
                    <span>({eloInfo.participantCount} × 3)</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Winner Elo */}
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-success" />
                      <span className="truncate max-w-[20vw]" style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                        {match.winner}
                      </span>
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-bold)", color: "var(--success)" }}>
                        +{winnerDelta}
                      </span>
                      {isUpset && (
                        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-bold)", color: "var(--warning)" }}>
                          ⚡+{upsetBonus}
                        </span>
                      )}
                    </div>
                    <div className="w-px h-4" style={{ background: "var(--border)" }} />
                    {/* Loser Elo */}
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-success" />
                      <span className="truncate max-w-[20vw]" style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                        {loserName}
                      </span>
                      <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-bold)", color: "var(--success)" }}>
                        +{loserDelta}
                      </span>
                    </div>
                  </div>
                  {isUpset && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-button)]" style={{ background: "color-mix(in srgb, var(--warning) 10%, transparent)" }}>
                      <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-bold)", color: "var(--warning)" }}>
                        ⚡ Upset-bonus: +{upsetBonus} Elo till {match.winner}!
                      </span>
                    </div>
                  )}
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                    Övriga deltagare: <span style={{ fontWeight: "var(--font-weight-bold)", color: "var(--destructive)" }}>{nonFinalistDelta}</span>
                  </div>
                </motion.div>
              );
            })()}
          </div>
        )}

        {scoreStyle === "classic" ? (
          /* ── Classic flip scoreboard ── */
          <FlipScoreboard
            p1Name={p1Name}
            p2Name={p2Name}
            p1Score={match.player1.sets[activeSet] || 0}
            p2Score={match.player2.sets[activeSet] || 0}
            p1MatchWins={match.player1.matchWins}
            p2MatchWins={match.player2.matchWins}
            p1Won={p1Won}
            p2Won={p2Won}
            matchDone={matchDone}
            activeSet={activeSet}
            p1Serves={p1Serves}
            p2Serves={p2Serves}
            p1YellowCards={match.player1.yellowCards || 0}
            p2YellowCards={match.player2.yellowCards || 0}
            showServePrompt={!server && matchIsFresh && !matchDone}
            onNameClick={handleNameClick}
          />
        ) : (
          /* ── Modern scoreboard ── */
          <div className="w-full max-w-6xl grid grid-cols-[1fr_auto_1fr] items-center">
            {/* ── Player 1 ── */}
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              {/* Serve indicator ABOVE name */}
              <div className="h-8 flex items-center">
                {p1Serves && (
                  <div className="flex items-center gap-2 px-3.5 py-1 rounded-[var(--radius-button)] bg-primary/15 border border-primary/20">
                    <span style={{ fontSize: "14px" }}>🏓</span>
                    <span
                      className="text-primary"
                      style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.05em", textTransform: "uppercase" }}
                    >
                      Servar
                    </span>
                  </div>
                )}
                {!server && matchIsFresh && !matchDone && (
                  <button
                    onClick={() => handleNameClick(p1Name)}
                    className="text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-200 cursor-pointer"
                    style={{ fontSize: "var(--text-sm)" }}
                  >
                    Tryck för serv
                  </button>
                )}
              </div>

              {/* Name + yellow card */}
              <div className="flex items-center gap-2 justify-center">
                <span
                  className={`truncate max-w-[35vw] text-center transition-colors duration-300 ${
                    p1Won ? "text-primary" : p2Won ? "text-muted-foreground/40" : "text-foreground"
                  } ${!server && matchIsFresh ? "cursor-pointer hover:text-primary/80" : ""}`}
                  style={{
                    fontSize: "clamp(16px, 3vw, var(--text-h3))",
                    fontWeight: "var(--font-weight-bold)",
                  }}
                  onClick={() => handleNameClick(p1Name)}
                >
                  {p1Name}
                </span>
                {(match.player1.yellowCards || 0) > 0 && (
                  <div
                    className="relative flex items-center justify-center shrink-0 rounded-[2px]"
                    style={{
                      width: "20px",
                      height: "28px",
                      background: "var(--warning)",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: match.player1.yellowCards >= 10 ? "10px" : "var(--text-sm)",
                        fontWeight: "var(--font-weight-bold)",
                        color: "var(--warning-foreground)",
                        lineHeight: 1,
                      }}
                    >
                      {match.player1.yellowCards}
                    </span>
                  </div>
                )}
              </div>

              {/* Big score */}
              <span
                className={`tabular-nums transition-colors duration-300 ${p1Won ? "text-primary" : p2Won ? "text-muted-foreground/30" : "text-foreground"}`}
                style={{
                  fontSize: "clamp(100px, 22vw, 220px)",
                  fontWeight: "var(--font-weight-bold)",
                  lineHeight: 0.85,
                  letterSpacing: "-0.03em",
                }}
              >
                {match.player1.sets[activeSet] || 0}
              </span>
            </div>

            {/* ── Center column: set score ── */}
            <div className="flex flex-col items-center gap-1 px-3 sm:px-10">
              <span
                className="text-muted-foreground/70"
                style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.2em", textTransform: "uppercase" }}
              >
                SETS
              </span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`tabular-nums ${p1Won ? "text-primary" : "text-foreground"}`}
                  style={{ fontSize: "clamp(28px, 5vw, 40px)", fontWeight: "var(--font-weight-bold)" }}
                >
                  {match.player1.matchWins}
                </span>
                <span
                  className="text-muted-foreground/40"
                  style={{ fontSize: "clamp(22px, 4vw, 32px)" }}
                >
                  :
                </span>
                <span
                  className={`tabular-nums ${p2Won ? "text-primary" : "text-foreground"}`}
                  style={{ fontSize: "clamp(28px, 5vw, 40px)", fontWeight: "var(--font-weight-bold)" }}
                >
                  {match.player2.matchWins}
                </span>
              </div>
              {!matchDone && (
                <div className="mt-1 px-3 py-0.5 rounded-[var(--radius-button)] bg-primary/12">
                  <span
                    className="text-primary"
                    style={{ fontSize: "13px", fontWeight: "var(--font-weight-semibold)" }}
                  >
                    Set {activeSet + 1}
                  </span>
                </div>
              )}
            </div>

            {/* ── Player 2 ── */}
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              {/* Serve indicator ABOVE name */}
              <div className="h-8 flex items-center">
                {p2Serves && (
                  <div className="flex items-center gap-2 px-3.5 py-1 rounded-[var(--radius-button)] bg-primary/15 border border-primary/20">
                    <span style={{ fontSize: "14px" }}>🏓</span>
                    <span
                      className="text-primary"
                      style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.05em", textTransform: "uppercase" }}
                    >
                      Servar
                    </span>
                  </div>
                )}
                {!server && matchIsFresh && !matchDone && (
                  <button
                    onClick={() => handleNameClick(p2Name)}
                    className="text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-200 cursor-pointer"
                    style={{ fontSize: "var(--text-sm)" }}
                  >
                    Tryck för serv
                  </button>
                )}
              </div>

              {/* Name + yellow card */}
              <div className="flex items-center gap-2 justify-center">
                <span
                  className={`truncate max-w-[35vw] text-center transition-colors duration-300 ${
                    p2Won ? "text-primary" : p1Won ? "text-muted-foreground/40" : "text-foreground"
                  } ${!server && matchIsFresh ? "cursor-pointer hover:text-primary/80" : ""}`}
                  style={{
                    fontSize: "clamp(16px, 3vw, var(--text-h3))",
                    fontWeight: "var(--font-weight-bold)",
                  }}
                  onClick={() => handleNameClick(p2Name)}
                >
                  {p2Name}
                </span>
                {(match.player2.yellowCards || 0) > 0 && (
                  <div
                    className="relative flex items-center justify-center shrink-0 rounded-[2px]"
                    style={{
                      width: "20px",
                      height: "28px",
                      background: "var(--warning)",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: match.player2.yellowCards >= 10 ? "10px" : "var(--text-sm)",
                        fontWeight: "var(--font-weight-bold)",
                        color: "var(--warning-foreground)",
                        lineHeight: 1,
                      }}
                    >
                      {match.player2.yellowCards}
                    </span>
                  </div>
                )}
              </div>

              {/* Big score */}
              <span
                className={`tabular-nums transition-colors duration-300 ${p2Won ? "text-primary" : p1Won ? "text-muted-foreground/30" : "text-foreground"}`}
                style={{
                  fontSize: "clamp(100px, 22vw, 220px)",
                  fontWeight: "var(--font-weight-bold)",
                  lineHeight: 0.85,
                  letterSpacing: "-0.03em",
                }}
              >
                {match.player2.sets[activeSet] || 0}
              </span>
            </div>
          </div>
        )}

        {/* ── Set timeline ── */}
        <div className={`mt-6 sm:mt-8 w-full ${scoreStyle === "classic" ? "max-w-5xl" : "max-w-3xl"}`}>
          <div className="flex items-center justify-center gap-2.5 sm:gap-4">
            {Array.from({ length: match.bestOf }).map((_, i) => {
              const s1 = match.player1.sets[i] || 0;
              const s2 = match.player2.sets[i] || 0;
              const won1 = s1 >= 11 && s1 - s2 >= 2;
              const won2 = s2 >= 11 && s2 - s1 >= 2;
              const isActive = i === activeSet && !matchDone;
              const isPlayed = won1 || won2;
              const isFuture = !isActive && !isPlayed;

              return (
                <div
                  key={i}
                  className={`flex flex-col items-center gap-0.5 px-3 sm:px-4 py-2 rounded-[var(--radius-card)] transition-all duration-300 ${
                    isActive
                      ? "bg-primary/8 ring-1 ring-primary/20"
                      : isPlayed
                      ? "bg-surface-container/60"
                      : ""
                  } ${isFuture ? "opacity-30" : ""}`}
                >
                  <span
                    className="text-muted-foreground/70"
                    style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.15em", textTransform: "uppercase" }}
                  >
                    Set {i + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={won1 ? "text-primary" : "text-foreground/80"}
                      style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)", minWidth: "1.5ch", textAlign: "center" }}
                    >
                      {s1}
                    </span>
                    <span
                      className="text-muted-foreground/30"
                      style={{ fontSize: "var(--text-sm)" }}
                    >
                      –
                    </span>
                    <span
                      className={won2 ? "text-primary" : "text-foreground/80"}
                      style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)", minWidth: "1.5ch", textAlign: "center" }}
                    >
                      {s2}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Elo preview (during match) ── */}
      {!matchDone && eloInfo && (() => {
        const pot = eloInfo.participantCount * 3;
        const p1WinResult = computePotDistribution(eloInfo.p1Elo, eloInfo.p2Elo, eloInfo.participantCount);
        const p2WinResult = computePotDistribution(eloInfo.p2Elo, eloInfo.p1Elo, eloInfo.participantCount);
        const eloDiff = Math.abs(eloInfo.p1Elo - eloInfo.p2Elo);
        const isUpset = p1WinResult.isUpset || p2WinResult.isUpset;
        const underdogName = eloInfo.p1Elo < eloInfo.p2Elo ? p1Name : p2Name;
        const upsetBonus = Math.max(p1WinResult.upsetBonus, p2WinResult.upsetBonus);
        return (
          <div
            className="shrink-0 flex flex-col items-center border-t border-border/20"
            style={{ fontFamily: "'Titillium Web', sans-serif", background: "var(--surface-container)" }}
          >
            <div className="flex items-center justify-center gap-2 sm:gap-4 px-3 py-1.5 w-full">
              <div className="flex items-center gap-1.5">
                <span className="truncate max-w-[18vw] sm:max-w-[22vw]" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)" }}>
                  {p1Name}
                </span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--success)", fontWeight: "var(--font-weight-bold)" }}>
                  V+{p1WinResult.winnerDelta}
                </span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>/</span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--success)", fontWeight: "var(--font-weight-bold)" }}>
                  F+{p2WinResult.loserDelta}
                </span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-button)] border border-border/30" style={{ background: "var(--surface-container-high)" }}>
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Pott</span>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>{pot}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="truncate max-w-[18vw] sm:max-w-[22vw]" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)" }}>
                  {p2Name}
                </span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--success)", fontWeight: "var(--font-weight-bold)" }}>
                  V+{p2WinResult.winnerDelta}
                </span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>/</span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--success)", fontWeight: "var(--font-weight-bold)" }}>
                  F+{p1WinResult.loserDelta}
                </span>
              </div>
            </div>
            {isUpset && (
              <div
                className="flex items-center justify-center gap-1.5 px-3 pb-1.5 w-full"
              >
                <span style={{ fontSize: "12px", lineHeight: 1 }}>⚡</span>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-bold)", color: "var(--warning)" }}>
                  Upset-alert!
                </span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                  Gap {Math.round(eloDiff)} · Underdog: <span style={{ fontWeight: "var(--font-weight-bold)", color: "var(--warning)" }}>{underdogName}</span> · <span style={{ fontWeight: "var(--font-weight-bold)", color: "var(--warning)" }}>+{upsetBonus} Elo bonus</span>
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Bottom fixed +/- buttons ── */}
      {!matchDone && (
        <div className="shrink-0 px-4 sm:px-6 pb-6 pt-3">
          <div className="w-full max-w-6xl mx-auto grid grid-cols-[1fr_auto_1fr] items-center">
            {/* Player 1 buttons */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => updateSetScore("player1", activeSet, -1)}
                  disabled={disabled}
                  className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full bg-surface-container-high/80 border border-border/30 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 disabled:opacity-15 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed active:scale-95"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => updateSetScore("player1", activeSet, 1)}
                  disabled={disabled}
                  className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full bg-primary/12 border border-primary/20 text-primary hover:bg-primary/20 disabled:opacity-15 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {/* Yellow card button */}
              <div className="flex items-center gap-1.5">
                {(match.player1.yellowCards || 0) > 0 && (
                  <button
                    onClick={() => toggleYellowCard("player1", -1)}
                    className="w-6 h-6 flex items-center justify-center rounded-full border transition-all duration-200 cursor-pointer active:scale-90"
                    style={{ borderColor: "var(--warning)", color: "var(--warning)" }}
                    title="Ta bort gult kort"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => toggleYellowCard("player1", 1)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-button)] transition-all duration-200 cursor-pointer active:scale-95 ${
                    (match.player1.yellowCards || 0) > 0
                      ? "border-2"
                      : "bg-surface-container/60 hover:bg-surface-container-high border border-border/30"
                  }`}
                  style={{
                    borderColor: (match.player1.yellowCards || 0) > 0 ? "var(--warning)" : undefined,
                    background: (match.player1.yellowCards || 0) > 0 ? "color-mix(in srgb, var(--warning) 15%, transparent)" : undefined,
                  }}
                  title="Gult kort (+1)"
                >
                  <div
                    className="relative flex items-center justify-center w-3.5 h-5 rounded-[1px]"
                    style={{ background: "var(--warning)" }}
                  >
                    {(match.player1.yellowCards || 0) > 0 && (
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: "var(--font-weight-bold)",
                          color: "var(--warning-foreground)",
                          lineHeight: 1,
                        }}
                      >
                        {match.player1.yellowCards}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: (match.player1.yellowCards || 0) > 0 ? "var(--warning)" : "var(--muted-foreground)",
                    }}
                  >
                    {(match.player1.yellowCards || 0) > 0 ? "Gult kort" : "Gult kort"}
                  </span>
                </button>
              </div>
            </div>

            {/* Center spacer */}
            <div className="px-3 sm:px-10" />

            {/* Player 2 buttons */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => updateSetScore("player2", activeSet, -1)}
                  disabled={disabled}
                  className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full bg-surface-container-high/80 border border-border/30 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 disabled:opacity-15 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed active:scale-95"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => updateSetScore("player2", activeSet, 1)}
                  disabled={disabled}
                  className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full bg-primary/12 border border-primary/20 text-primary hover:bg-primary/20 disabled:opacity-15 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {/* Yellow card button */}
              <div className="flex items-center gap-1.5">
                {(match.player2.yellowCards || 0) > 0 && (
                  <button
                    onClick={() => toggleYellowCard("player2", -1)}
                    className="w-6 h-6 flex items-center justify-center rounded-full border transition-all duration-200 cursor-pointer active:scale-90"
                    style={{ borderColor: "var(--warning)", color: "var(--warning)" }}
                    title="Ta bort gult kort"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => toggleYellowCard("player2", 1)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-button)] transition-all duration-200 cursor-pointer active:scale-95 ${
                    (match.player2.yellowCards || 0) > 0
                      ? "border-2"
                      : "bg-surface-container/60 hover:bg-surface-container-high border border-border/30"
                  }`}
                  style={{
                    borderColor: (match.player2.yellowCards || 0) > 0 ? "var(--warning)" : undefined,
                    background: (match.player2.yellowCards || 0) > 0 ? "color-mix(in srgb, var(--warning) 15%, transparent)" : undefined,
                  }}
                  title="Gult kort (+1)"
                >
                  <div
                    className="relative flex items-center justify-center w-3.5 h-5 rounded-[1px]"
                    style={{ background: "var(--warning)" }}
                  >
                    {(match.player2.yellowCards || 0) > 0 && (
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: "var(--font-weight-bold)",
                          color: "var(--warning-foreground)",
                          lineHeight: 1,
                        }}
                      >
                        {match.player2.yellowCards}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: (match.player2.yellowCards || 0) > 0 ? "var(--warning)" : "var(--muted-foreground)",
                    }}
                  >
                    {(match.player2.yellowCards || 0) > 0 ? "Gult kort" : "Gult kort"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Karma karma overlay ── */}
      <AnimatePresence>
        {showKarma && (
          <motion.div
            key="karma-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[150] flex flex-col items-center justify-center pointer-events-none"
            style={{ background: "rgba(0,0,0,0.65)" }}
          >
            {/* Image */}
            <motion.img
              src={karmaImage}
              alt="Karma karma"
              className="w-48 h-48 sm:w-64 sm:h-64 rounded-full object-cover border-4"
              style={{
                borderColor: "var(--warning)",
                boxShadow: "0 0 60px rgba(255,200,0,0.4), 0 0 120px rgba(255,200,0,0.15)",
              }}
              initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.6, opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 12, stiffness: 200, duration: 0.5 }}
            />
            {/* Text */}
            <motion.span
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.15, type: "spring", damping: 14, stiffness: 180 }}
              style={{
                fontSize: "clamp(32px, 8vw, 56px)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--warning)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                textShadow: "0 2px 20px rgba(255,200,0,0.5), 0 0 60px rgba(255,200,0,0.25)",
                marginTop: "24px",
              }}
            >
              karma karma
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}