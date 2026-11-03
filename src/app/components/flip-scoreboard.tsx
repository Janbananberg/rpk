import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

/**
 * A single flip digit card — classic split-flap mechanical scoreboard style.
 * Flips DOWN when value increases, flips UP (reverse) when value decreases.
 */
function FlipDigit({ value, size = "lg" }: { value: number; size?: "lg" | "sm" }) {
  const [current, setCurrent] = useState(value);
  const [previous, setPrevious] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("down");
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setCurrent(value);
      setPrevious(value);
      return;
    }
    if (value !== current) {
      setPrevious(current);
      setDirection(value > current ? "down" : "up");
      setFlipping(true);
      const timer = setTimeout(() => {
        setCurrent(value);
        setFlipping(false);
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [value, current]);

  const isLarge = size === "lg";
  const cardW = isLarge ? "clamp(80px, 22vw, 160px)" : "clamp(28px, 6vw, 44px)";
  const cardH = isLarge ? "clamp(110px, 30vw, 210px)" : "clamp(36px, 8vw, 56px)";
  const fontSize = isLarge ? "clamp(90px, 26vw, 185px)" : "clamp(24px, 5vw, 38px)";
  const halfH = `calc(${cardH} / 2)`;
  const borderR = "var(--radius-card)";

  const digitStr = (n: number) => String(n);

  if (direction === "up") {
    // ── REVERSE flip: bottom flap lifts up to reveal previous (lower) value ──
    return (
      <div
        className="relative"
        style={{ width: cardW, height: cardH, perspective: "500px" }}
      >
        {/* Static top half — shows NEW (lower) value */}
        <div
          className="absolute top-0 left-0 right-0 overflow-hidden"
          style={{
            height: halfH,
            background: "var(--surface-container-high)",
            borderRadius: `${borderR} ${borderR} 0 0`,
          }}
        >
          <div
            className="absolute left-0 right-0 flex items-center justify-center text-foreground"
            style={{ height: cardH, top: 0, fontSize, fontWeight: 700, lineHeight: 1, fontFamily: "'Titillium Web', sans-serif" }}
          >
            {digitStr(current)}
          </div>
        </div>

        {/* Static bottom half — shows NEW (lower) value */}
        <div
          className="absolute bottom-0 left-0 right-0 overflow-hidden"
          style={{
            height: halfH,
            background: "var(--surface-container)",
            borderTop: "1px solid var(--border)",
            borderRadius: `0 0 ${borderR} ${borderR}`,
          }}
        >
          <div
            className="absolute left-0 right-0 flex items-center justify-center text-foreground"
            style={{ height: cardH, bottom: 0, fontSize, fontWeight: 700, lineHeight: 1, fontFamily: "'Titillium Web', sans-serif" }}
          >
            {digitStr(current)}
          </div>
        </div>

        {/* Animated flap — bottom half flips UP */}
        <AnimatePresence>
          {flipping && (
            <motion.div
              key={`bottom-up-${previous}-${Date.now()}`}
              className="absolute bottom-0 left-0 right-0 overflow-hidden"
              style={{
                height: halfH,
                background: "var(--surface-container)",
                borderTop: "1px solid var(--border)",
                borderRadius: `0 0 ${borderR} ${borderR}`,
                transformOrigin: "top center",
                zIndex: 3,
                backfaceVisibility: "hidden",
              }}
              initial={{ rotateX: 0 }}
              animate={{ rotateX: 90 }}
              transition={{ duration: 0.28, ease: [0.4, 0.0, 0.2, 1] }}
            >
              <div
                className="absolute left-0 right-0 flex items-center justify-center text-foreground"
                style={{ height: cardH, bottom: 0, fontSize, fontWeight: 700, lineHeight: 1 }}
              >
                {digitStr(previous)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated flap — top half drops down from behind */}
        <AnimatePresence>
          {flipping && (
            <motion.div
              key={`top-down-${value}-${Date.now()}`}
              className="absolute top-0 left-0 right-0 overflow-hidden"
              style={{
                height: halfH,
                background: "var(--surface-container-high)",
                borderRadius: `${borderR} ${borderR} 0 0`,
                transformOrigin: "bottom center",
                zIndex: 2,
              }}
              initial={{ rotateX: -90 }}
              animate={{ rotateX: 0 }}
              transition={{ duration: 0.28, delay: 0.18, ease: [0.0, 0.0, 0.2, 1] }}
            >
              <div
                className="absolute left-0 right-0 flex items-center justify-center text-foreground"
                style={{ height: cardH, top: 0, fontSize, fontWeight: 700, lineHeight: 1 }}
              >
                {digitStr(value)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center divider */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: `calc(${halfH} - 0.5px)`, height: "1px", background: "var(--background)", zIndex: 10, opacity: 0.8 }}
        />
        <div
          className="absolute left-1 right-1 pointer-events-none"
          style={{ top: halfH, height: "4px", background: "linear-gradient(to bottom, rgba(0,0,0,0.12), transparent)", zIndex: 4 }}
        />
      </div>
    );
  }

  // ── FORWARD flip (default): top flap falls down ──
  return (
    <div
      className="relative"
      style={{ width: cardW, height: cardH, perspective: "500px" }}
    >
      {/* Static bottom half — shows NEW value */}
      <div
        className="absolute bottom-0 left-0 right-0 overflow-hidden"
        style={{
          height: halfH,
          background: "var(--surface-container)",
          borderTop: "1px solid var(--border)",
          borderRadius: `0 0 ${borderR} ${borderR}`,
        }}
      >
        <div
          className="absolute left-0 right-0 flex items-center justify-center text-foreground"
          style={{ height: cardH, bottom: 0, fontSize, fontWeight: 700, lineHeight: 1 }}
        >
          {digitStr(current)}
        </div>
      </div>

      {/* Static top half — shows NEW value */}
      <div
        className="absolute top-0 left-0 right-0 overflow-hidden"
        style={{
          height: halfH,
          background: "var(--surface-container-high)",
          borderRadius: `${borderR} ${borderR} 0 0`,
        }}
      >
        <div
          className="absolute left-0 right-0 flex items-center justify-center text-foreground"
          style={{ height: cardH, top: 0, fontSize, fontWeight: 700, lineHeight: 1 }}
        >
          {digitStr(current)}
        </div>
      </div>

      {/* Animated flap — top half flips down */}
      <AnimatePresence>
        {flipping && (
          <motion.div
            key={`top-flap-${previous}-${Date.now()}`}
            className="absolute top-0 left-0 right-0 overflow-hidden"
            style={{
              height: halfH,
              background: "var(--surface-container-high)",
              borderRadius: `${borderR} ${borderR} 0 0`,
              transformOrigin: "bottom center",
              zIndex: 3,
              backfaceVisibility: "hidden",
            }}
            initial={{ rotateX: 0 }}
            animate={{ rotateX: -90 }}
            transition={{ duration: 0.28, ease: [0.4, 0.0, 0.2, 1] }}
          >
            <div
              className="absolute left-0 right-0 flex items-center justify-center text-foreground"
              style={{ height: cardH, top: 0, fontSize, fontWeight: 700, lineHeight: 1 }}
            >
              {digitStr(previous)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated flap — bottom half flips up from behind */}
      <AnimatePresence>
        {flipping && (
          <motion.div
            key={`bottom-flap-${value}-${Date.now()}`}
            className="absolute bottom-0 left-0 right-0 overflow-hidden"
            style={{
              height: halfH,
              background: "var(--surface-container)",
              borderTop: "1px solid var(--border)",
              borderRadius: `0 0 ${borderR} ${borderR}`,
              transformOrigin: "top center",
              zIndex: 2,
            }}
            initial={{ rotateX: 90 }}
            animate={{ rotateX: 0 }}
            transition={{ duration: 0.28, delay: 0.18, ease: [0.0, 0.0, 0.2, 1] }}
          >
            <div
              className="absolute left-0 right-0 flex items-center justify-center text-foreground"
              style={{ height: cardH, bottom: 0, fontSize, fontWeight: 700, lineHeight: 1 }}
            >
              {digitStr(value)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center divider */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{ top: `calc(${halfH} - 0.5px)`, height: "1px", background: "var(--background)", zIndex: 10, opacity: 0.8 }}
      />
      <div
        className="absolute left-1 right-1 pointer-events-none"
        style={{ top: halfH, height: "4px", background: "linear-gradient(to bottom, rgba(0,0,0,0.12), transparent)", zIndex: 4 }}
      />
    </div>
  );
}

/**
 * Two-digit flip display: splits a score (0-99) into tens and ones.
 */
function FlipNumber({ value, size = "lg" }: { value: number; size?: "lg" | "sm" }) {
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  const gap = size === "lg" ? "8px" : "3px";

  return (
    <div className="flex" style={{ gap }}>
      {(tens > 0 || value >= 10) && <FlipDigit value={tens} size={size} />}
      <FlipDigit value={ones} size={size} />
    </div>
  );
}

/* ── Public component ─────────────────────────────────────────────── */

interface FlipScoreboardProps {
  p1Name: string;
  p2Name: string;
  p1Score: number;
  p2Score: number;
  p1MatchWins: number;
  p2MatchWins: number;
  p1Won: boolean;
  p2Won: boolean;
  matchDone: boolean;
  activeSet: number;
  p1Serves: boolean;
  p2Serves: boolean;
  p1YellowCards?: number;
  p2YellowCards?: number;
  showServePrompt: boolean;
  onNameClick: (name: string) => void;
}

export function FlipScoreboard({
  p1Name,
  p2Name,
  p1Score,
  p2Score,
  p1MatchWins,
  p2MatchWins,
  p1Won,
  p2Won,
  matchDone,
  activeSet,
  p1Serves,
  p2Serves,
  p1YellowCards = 0,
  p2YellowCards = 0,
  showServePrompt,
  onNameClick,
}: FlipScoreboardProps) {
  return (
    <div className="w-full max-w-5xl flex flex-col items-center gap-4 sm:gap-6">
      {/* ── Scoreboard housing ── */}
      <div
        className="w-full rounded-[var(--radius-card)] border border-border/50 overflow-hidden"
        style={{
          background: "var(--surface-container-lowest)",
          boxShadow: "var(--elevation-sm), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        {/* Top bar — set indicator */}
        <div
          className="flex items-center justify-center gap-4 py-2.5 border-b border-border/30"
          style={{ background: "var(--surface-container)" }}
        >
          {!matchDone && (
            <span
              className="text-primary"
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-weight-semibold)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Set {activeSet + 1}
            </span>
          )}
          <div className="flex items-center gap-2">
            <span
              className={p1Won ? "text-primary" : "text-foreground/80"}
              style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)" }}
            >
              {p1MatchWins}
            </span>
            <span
              className="text-muted-foreground/40"
              style={{ fontSize: "var(--text-label)" }}
            >
              –
            </span>
            <span
              className={p2Won ? "text-primary" : "text-foreground/80"}
              style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)" }}
            >
              {p2MatchWins}
            </span>
          </div>
        </div>

        {/* ── Main flip area — expanded ── */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6 sm:px-12 py-8 sm:py-14">
          {/* Player 1 side */}
          <div className="flex flex-col items-center gap-4">
            {/* Serve badge */}
            <div className="h-7 flex items-center">
              {p1Serves && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-button)] bg-primary/15 border border-primary/20">
                  <span style={{ fontSize: "13px" }}>🏓</span>
                  <span
                    className="text-primary"
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: "var(--font-weight-semibold)",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    Servar
                  </span>
                </div>
              )}
              {showServePrompt && (
                <button
                  onClick={() => onNameClick(p1Name)}
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-200 cursor-pointer"
                  style={{ fontSize: "var(--text-sm)" }}
                >
                  Tryck för serv
                </button>
              )}
            </div>

            {/* Name + yellow card */}
            <div className="flex items-center gap-2 justify-center">
              <span
                className={`truncate max-w-[34vw] text-center transition-colors duration-300 ${
                  p1Won ? "text-primary" : p2Won ? "text-muted-foreground/40" : "text-foreground"
                } ${showServePrompt ? "cursor-pointer hover:text-primary/80" : ""}`}
                style={{
                  fontSize: "clamp(16px, 3vw, var(--text-h4))",
                  fontWeight: p1Won ? "var(--font-weight-bold)" : "var(--font-weight-semibold)",
                }}
                onClick={() => onNameClick(p1Name)}
              >
                {p1Name}
              </span>
              {p1YellowCards > 0 && (
                <div
                  className="relative flex items-center justify-center shrink-0 rounded-[2px]"
                  style={{
                    width: "16px",
                    height: "22px",
                    background: "var(--warning)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                >
                  <span
                    style={{
                      fontSize: p1YellowCards >= 10 ? "8px" : "10px",
                      fontWeight: "var(--font-weight-bold)",
                      color: "var(--warning-foreground)",
                      lineHeight: 1,
                    }}
                  >
                    {p1YellowCards}
                  </span>
                </div>
              )}
            </div>

            {/* Flip digits */}
            <FlipNumber value={p1Score} />
          </div>

          {/* Center divider */}
          <div className="flex flex-col items-center gap-2 px-4 sm:px-8">
            <div
              className="w-px bg-border/30"
              style={{ height: "clamp(110px, 30vw, 210px)" }}
            />
          </div>

          {/* Player 2 side */}
          <div className="flex flex-col items-center gap-4">
            {/* Serve badge */}
            <div className="h-7 flex items-center">
              {p2Serves && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-button)] bg-primary/15 border border-primary/20">
                  <span style={{ fontSize: "13px" }}>🏓</span>
                  <span
                    className="text-primary"
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: "var(--font-weight-semibold)",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    Servar
                  </span>
                </div>
              )}
              {showServePrompt && (
                <button
                  onClick={() => onNameClick(p2Name)}
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-200 cursor-pointer"
                  style={{ fontSize: "var(--text-sm)" }}
                >
                  Tryck för serv
                </button>
              )}
            </div>

            {/* Name + yellow card */}
            <div className="flex items-center gap-2 justify-center">
              <span
                className={`truncate max-w-[34vw] text-center transition-colors duration-300 ${
                  p2Won ? "text-primary" : p1Won ? "text-muted-foreground/40" : "text-foreground"
                } ${showServePrompt ? "cursor-pointer hover:text-primary/80" : ""}`}
                style={{
                  fontSize: "clamp(16px, 3vw, var(--text-h4))",
                  fontWeight: p2Won ? "var(--font-weight-bold)" : "var(--font-weight-semibold)",
                }}
                onClick={() => onNameClick(p2Name)}
              >
                {p2Name}
              </span>
              {p2YellowCards > 0 && (
                <div
                  className="relative flex items-center justify-center shrink-0 rounded-[2px]"
                  style={{
                    width: "16px",
                    height: "22px",
                    background: "var(--warning)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                >
                  <span
                    style={{
                      fontSize: p2YellowCards >= 10 ? "8px" : "10px",
                      fontWeight: "var(--font-weight-bold)",
                      color: "var(--warning-foreground)",
                      lineHeight: 1,
                    }}
                  >
                    {p2YellowCards}
                  </span>
                </div>
              )}
            </div>

            {/* Flip digits */}
            <FlipNumber value={p2Score} />
          </div>
        </div>
      </div>
    </div>
  );
}