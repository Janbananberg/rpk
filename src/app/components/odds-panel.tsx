import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import { TrendingUp, QrCode, X, Copy, Check, Ticket, Trophy, Users } from "lucide-react";
import { MatchData } from "./match-card";
import type { TournamentWinnerOdds, PlayerOdds } from "./betting-store";
import { publishTournamentWinnerOdds, fetchTournamentWinnerOdds } from "./api";

const FONT = "'Titillium Web', sans-serif";

interface OddsPanelProps {
  semi1: MatchData;
  semi2: MatchData;
  final_: MatchData;
}

export function OddsPanel({ semi1, semi2, final_ }: OddsPanelProps) {
  const [open, setOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playerOdds, setPlayerOdds] = useState<Record<string, number>>({});
  const [publishError, setPublishError] = useState(false);

  // Gather all player names from the bracket
  const allPlayers = [
    semi1.player1.name,
    semi1.player2.name,
    semi2.player1.name,
    semi2.player2.name,
  ].filter(Boolean);

  const champion = final_.winner || null;

  // Load saved odds from Supabase on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await fetchTournamentWinnerOdds();
        if (saved?.players) {
          const oddsMap: Record<string, number> = {};
          saved.players.forEach(p => { oddsMap[p.name] = p.odds; });
          setPlayerOdds(oddsMap);
        }
      } catch {
        // Fallback: default all to 4.0
      }
    })();
  }, []);

  // Publish whenever odds or match data change
  const publishOdds = useCallback(() => {
    if (allPlayers.length === 0) return;

    const players: PlayerOdds[] = allPlayers.map(name => ({
      name,
      odds: playerOdds[name] ?? 4.0,
    }));

    const odds: TournamentWinnerOdds = {
      players,
      champion,
    };

    publishTournamentWinnerOdds(odds).catch(() => setPublishError(true));
  }, [allPlayers.join(","), champion, playerOdds]);

  useEffect(() => {
    publishOdds();
  }, [publishOdds]);

  const updatePlayerOdds = (name: string, value: number) => {
    setPlayerOdds(prev => ({ ...prev, [name]: Math.max(1.01, value) }));
  };

  const bettingUrl = `${window.location.origin}/bet`;

  const copyUrl = () => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = bettingUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(true)}
        className="group flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-button)] border border-border/40 hover:border-primary/40 text-muted-foreground hover:text-primary transition-all duration-300 cursor-pointer"
        style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
      >
        <TrendingUp className="w-3.5 h-3.5 transition-transform duration-500 group-hover:scale-110" />
        Odds & Betting
      </button>

      {/* Panel overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md rounded-[var(--radius-card)] border border-border overflow-hidden max-h-[85vh] overflow-y-auto"
              style={{ background: "var(--surface-container)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-4.5 h-4.5 text-primary" />
                  <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">
                    Turneringsvinnare – Odds
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Description — SECURITY: Publishing odds requires admin session */}
              <div className="px-5 pt-4 pb-2">
                <p className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
                  Ställ in odds för varje spelare att vinna hela turneringen. Bettarna satsar på vem som tar hem pokalen.
                </p>
                {publishError && (
                  <p className="text-destructive mt-2" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
                    Odds-publicering kräver admin-inloggning. Logga in via Admin-fliken först.
                  </p>
                )}
              </div>

              {/* Player odds */}
              <div className="flex flex-col gap-3 p-5">
                {allPlayers.length > 0 ? (
                  allPlayers.map(name => {
                    const isChampion = champion === name;
                    const isEliminated = champion && !isChampion;
                    const oddsVal = playerOdds[name] ?? 4.0;

                    return (
                      <div
                        key={name}
                        className={`rounded-[var(--radius-card)] border overflow-hidden transition-all ${
                          isChampion ? "border-primary/30" : "border-border/40"
                        } ${isEliminated ? "opacity-50" : ""}`}
                        style={{ background: "var(--surface-container-low)" }}
                      >
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${isChampion ? "bg-primary/15" : ""}`}
                              style={{ background: isChampion ? undefined : "var(--surface-container-highest)" }}
                            >
                              {isChampion ? (
                                <Trophy className="w-4 h-4 text-primary" />
                              ) : (
                                <span style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }} className="text-foreground">
                                  {name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span
                              className={isChampion ? "text-primary" : "text-foreground"}
                              style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: isChampion ? 700 : "var(--font-weight-normal)" }}
                            >
                              {name}
                            </span>
                          </div>
                          <input
                            type="number"
                            step="0.1"
                            min="1.01"
                            max="99"
                            value={oddsVal}
                            onChange={(e) => updatePlayerOdds(name, parseFloat(e.target.value) || 1.01)}
                            disabled={!!champion}
                            className="w-20 text-center px-2 py-1.5 rounded-[var(--radius-card)] border border-border/50 bg-surface-container text-foreground outline-none focus:border-primary transition-colors tabular-nums disabled:opacity-40"
                            style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: 700 }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                    <Users className="w-8 h-8 opacity-30" />
                    <span style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
                      Starta turneringen för att sätta odds
                    </span>
                  </div>
                )}

                {/* Quick-set buttons */}
                {allPlayers.length > 0 && !champion && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-border/30">
                    <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "12px", fontWeight: "var(--font-weight-semibold)" }}>
                      Snabbinställningar
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Alla lika (4.00)", fn: () => { const m: Record<string,number> = {}; allPlayers.forEach(n => m[n] = 4.0); setPlayerOdds(m); }},
                        { label: "Favorit + underdog", fn: () => { const m: Record<string,number> = {}; allPlayers.forEach((n,i) => m[n] = i === 0 ? 2.5 : i === allPlayers.length - 1 ? 8.0 : 4.0); setPlayerOdds(m); }},
                        { label: "Jämna par (3.00)", fn: () => { const m: Record<string,number> = {}; allPlayers.forEach(n => m[n] = 3.0); setPlayerOdds(m); }},
                      ].map(({ label, fn }) => (
                        <button
                          key={label}
                          onClick={fn}
                          className="px-3 py-2 rounded-[var(--radius-card)] border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer"
                          style={{ fontFamily: FONT, fontSize: "12px", fontWeight: "var(--font-weight-semibold)" }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* QR Section */}
              <div className="px-5 pb-5 flex flex-col gap-3">
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-[var(--radius-button)] bg-primary text-primary-foreground hover:opacity-90 transition-all cursor-pointer"
                  style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}
                >
                  <QrCode className="w-4.5 h-4.5" />
                  {showQR ? "Dölj QR-kod" : "Visa QR-kod för bettare"}
                </button>

                <AnimatePresence>
                  {showQR && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col items-center gap-4 pt-2 pb-3">
                        <div className="p-4 rounded-[var(--radius-card)] bg-white">
                          <QRCodeSVG
                            value={bettingUrl}
                            size={200}
                            bgColor="#ffffff"
                            fgColor="#000000"
                            level="M"
                          />
                        </div>
                        <p className="text-muted-foreground text-center" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
                          Skanna med mobilen för att betta på turneringsvinnaren
                        </p>
                        <button
                          onClick={copyUrl}
                          className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)] border border-border/50 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                          style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? "Kopierad!" : "Kopiera länk"}
                        </button>
                        <div className="flex items-center gap-2 text-muted-foreground/60">
                          <Ticket className="w-3 h-3" />
                          <span style={{ fontFamily: FONT, fontSize: "11px" }}>
                            Varje bettare får {1000} karma
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}