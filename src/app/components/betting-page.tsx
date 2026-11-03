import {
  type PlacedBet,
  fetchTournamentWinnerOdds,
  fetchBettorProfile,
  saveBettorProfile,
  fetchBets,
  placeBet as placeBetApi,
  registerBettor,
  loginBettor,
  getBettorToken,
} from "./api";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Ticket, TrendingUp, Trophy, Check, X, Coffee, ShoppingBag, Clock } from "lucide-react";
import { Leaderboard } from "./leaderboard";
import { CosmeticsShop } from "./cosmetics-shop";
import { BetHistory } from "./bet-history";
import {
  type BettorProfile,
  type TournamentWinnerOdds,
  createDefaultProfile,
} from "./betting-store";

const FONT = "'Titillium Web', sans-serif";
const STARTING_BALANCE = 1000;
const LS_NAME_KEY = "rpk-bettor-name";

type Tab = "bets" | "leaderboard" | "shop" | "history";

function loadName(): string {
  try { return localStorage.getItem(LS_NAME_KEY) || ""; } catch { return ""; }
}
function saveName(n: string) { localStorage.setItem(LS_NAME_KEY, n); }

export function BettingPage() {
  const [name, setName] = useState(loadName);
  const [nameConfirmed, setNameConfirmed] = useState(() => !!loadName() && !!getBettorToken());
  const [profile, setProfile] = useState<BettorProfile | null>(null);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [tournamentOdds, setTournamentOdds] = useState<TournamentWinnerOdds | null>(null);
  const [betAmounts, setBetAmounts] = useState<Record<string, number>>({});
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("bets");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load profile and bets on login
  useEffect(() => {
    if (!nameConfirmed || !name) return;
    setLoading(true);
    (async () => {
      try {
        const p = await fetchBettorProfile(name);
        if (p) setProfile(p);
        const b = await fetchBets(name);
        setBets(b);
      } catch (e) {
        console.log("Error loading profile/bets:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [nameConfirmed, name]);

  const balance = profile?.balance ?? STARTING_BALANCE;

  // Poll for tournament winner odds + refresh profile/bets for server-side changes
  useEffect(() => {
    if (!nameConfirmed) return;
    const load = async () => {
      const odds = await fetchTournamentWinnerOdds();
      if (odds) setTournamentOdds(odds);
      // Refresh profile for server-side balance changes (e.g. bet resolution)
      if (name) {
        const p = await fetchBettorProfile(name);
        if (p) setProfile(p);
        const b = await fetchBets(name);
        if (b) setBets(b);
      }
    };
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [nameConfirmed, name]);

  /**
   * Place a bet — calls the server-side validated endpoint.
   * SECURITY: The server checks balance, deducts server-side,
   * and creates the bet. No client-side balance manipulation.
   */
  const handlePlaceBet = useCallback(async (playerName: string) => {
    if (!profile) return;
    const amtKey = playerName;
    const amount = betAmounts[amtKey] || 0;
    if (amount <= 0 || amount > balance) return;

    const result = await placeBetApi(name, playerName, amount);
    if (result.ok && result.bet) {
      setBets((prev) => [...prev, result.bet!]);
      setBetAmounts((prev) => ({ ...prev, [amtKey]: 0 }));
      // Update balance from server response
      if (typeof result.balance === "number") {
        setProfile((p) => p ? { ...p, balance: result.balance!, totalBets: p.totalBets + 1 } : p);
      }
      setShowSuccess(result.bet.id);
      setTimeout(() => setShowSuccess(null), 1500);
    } else {
      console.log("Bet placement failed:", result.error);
      setAuthError(result.error || "Kunde inte placera bet");
      setTimeout(() => setAuthError(null), 3000);
    }
  }, [bets, balance, betAmounts, profile, name]);

  /**
   * Confirm name — register or login the bettor.
   * SECURITY: Registration creates a secret bettor token server-side.
   * Login re-issues the token. The token is stored in localStorage.
   */
  const confirmName = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setAuthError(null);

    // Try to register first
    const defaultProfile = createDefaultProfile(trimmed, STARTING_BALANCE);
    const regResult = await registerBettor(trimmed, defaultProfile);

    if (regResult.ok) {
      setNameConfirmed(true);
      saveName(trimmed);
      setProfile(defaultProfile);
      setLoading(false);
      return;
    }

    // If already registered (409), try login
    if (regResult.error?.includes("redan registrerat") || regResult.error?.includes("login")) {
      const loginResult = await loginBettor(trimmed);
      if (loginResult.ok && loginResult.profile) {
        setNameConfirmed(true);
        saveName(trimmed);
        setProfile(loginResult.profile);
        setLoading(false);
        return;
      }
      setAuthError(loginResult.error || "Kunde inte logga in");
    } else {
      setAuthError(regResult.error || "Registrering misslyckades");
    }
    setLoading(false);
  };

  const handleProfileUpdate = (updated: BettorProfile) => {
    setProfile(updated);
    saveBettorProfile(updated);
  };

  const pendingBets = bets.filter((b) => !b.resolved);
  const resolvedBets = bets.filter((b) => b.resolved);
  const totalWon = resolvedBets.filter((b) => b.won).reduce((s, b) => s + Math.round(b.amount * b.odds), 0);
  const totalLost = resolvedBets.filter((b) => !b.won).reduce((s, b) => s + b.amount, 0);

  const players = tournamentOdds?.players || [];
  const champion = tournamentOdds?.champion || null;

  if (!nameConfirmed) {
    return (
      <div className="bg-background text-foreground flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm flex flex-col items-center gap-6"
        >
          <div className="flex items-center gap-3">
            <Coffee className="w-8 h-8 text-primary" />
            <span style={{ fontFamily: FONT, fontSize: "var(--text-h3)", fontWeight: 700 }} className="text-foreground">
              Karmabetting
            </span>
          </div>
          <p className="text-muted-foreground text-center" style={{ fontFamily: FONT, fontSize: "var(--text-base)" }}>
            Betta på vem som vinner turneringen!
          </p>
          <div className="w-full flex flex-col gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setAuthError(null); }}
              onKeyDown={(e) => e.key === "Enter" && confirmName()}
              placeholder="Ditt namn..."
              className="w-full px-4 py-3 rounded-[var(--radius-card)] border border-border bg-surface-container-low text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary transition-colors"
              style={{ fontFamily: FONT, fontSize: "var(--text-base)" }}
              autoFocus
            />
            {authError && (
              <p className="text-destructive text-center" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
                {authError}
              </p>
            )}
            <button
              onClick={confirmName}
              disabled={!name.trim() || loading}
              className="w-full py-3 rounded-[var(--radius-button)] bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}
            >
              {loading ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : null}
              Starta betting
            </button>
          </div>
          <p className="text-muted-foreground/60" style={{ fontFamily: FONT, fontSize: "12px" }}>
            Du får {STARTING_BALANCE} karma att spela med
          </p>
        </motion.div>
      </div>
    );
  }

  const TAB_CONFIG: { key: Tab; label: string; icon: typeof Ticket }[] = [
    { key: "bets", label: "Betta", icon: Ticket },
    { key: "leaderboard", label: "Topp", icon: Trophy },
    { key: "shop", label: "Butik", icon: ShoppingBag },
    { key: "history", label: "Historik", icon: Clock },
  ];

  return (
    <div className="bg-background text-foreground">
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b border-border"
        style={{ background: "var(--surface-container)" }}
      >
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-12">
          <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">
            Karmabetting
          </span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)]" style={{ background: "var(--surface-container-highest)" }}>
            <Ticket className="w-3.5 h-3.5 text-primary" />
            <span style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }} className="text-primary tabular-nums">
              {balance}
            </span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-lg mx-auto flex px-2 gap-0">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1 py-3 border-b-2 transition-all duration-200 cursor-pointer ${
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: activeTab === key ? "var(--font-weight-semibold)" : "var(--font-weight-normal)" }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {key === "history" && resolvedBets.length > 0 && (
                <span
                  className="ml-0.5 px-1.5 py-0.5 rounded-full bg-surface-container-highest text-muted-foreground tabular-nums"
                  style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700 }}
                >
                  {resolvedBets.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-6 pb-24">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {/* Error toast */}
        {authError && (
          <div className="px-4 py-3 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/10 text-destructive text-center" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
            {authError}
          </div>
        )}

        {/* ── Bets tab ── */}
        {!loading && activeTab === "bets" && (
          <motion.div
            key="bets"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6"
          >
            {/* Welcome */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--surface-container-highest)" }}>
                {profile?.equippedCosmetics.avatar ? (
                  <span style={{ fontSize: "20px" }}>{profile.equippedCosmetics.avatar}</span>
                ) : (
                  <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: 700 }} className="text-primary">
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">
                    Hej {name}!
                  </p>
                  {profile?.equippedCosmetics.title && (
                    <span className="text-muted-foreground/70" style={{ fontFamily: FONT, fontSize: "11px" }}>
                      – {profile.equippedCosmetics.title}
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: FONT, fontSize: "12px" }} className="text-muted-foreground">
                  {balance} karma kvar
                </p>
              </div>
            </div>

            {/* Live sync badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] self-start border border-[var(--success)]/20" style={{ background: "var(--surface-container-low)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
              <span className="text-[var(--success)]" style={{ fontFamily: FONT, fontSize: "11px", fontWeight: "var(--font-weight-semibold)" }}>
                Live-synk aktiv
              </span>
            </div>

            {players.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <TrendingUp className="w-10 h-10 text-muted-foreground/40" />
                <div>
                  <p style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">
                    Inga odds tillgängliga än
                  </p>
                  <p style={{ fontFamily: FONT, fontSize: "var(--text-label)" }} className="text-muted-foreground mt-1">
                    Vänta på att turneringsvärden publicerar odds
                  </p>
                </div>
              </div>
            )}

            {/* Tournament Winner Betting Card */}
            {players.length > 0 && (
              <div
                className="rounded-[var(--radius-card)] border border-border overflow-hidden"
                style={{ background: "var(--surface-container-low)" }}
              >
                {/* Card header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }} className="text-primary">
                      Vem vinner turneringen?
                    </span>
                  </div>
                  {champion && (
                    <span className="flex items-center gap-1 text-primary" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>
                      <Trophy className="w-3 h-3" /> Avgjord
                    </span>
                  )}
                </div>

                {/* Player rows */}
                {players.map((p, idx) => {
                  const amtKey = p.name;
                  const amt = betAmounts[amtKey] || 0;
                  const isChampion = champion === p.name;
                  const isEliminated = champion && !isChampion;
                  const playerBets = bets.filter(b => b.player === p.name);
                  const activeBets = playerBets.filter(b => !b.resolved);
                  const resolvedPlayerBets = playerBets.filter(b => b.resolved);

                  return (
                    <div
                      key={p.name}
                      className={`px-4 py-4 ${idx < players.length - 1 ? "border-b border-border/30" : ""} ${isChampion ? "bg-primary/[0.06]" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isChampion && <Trophy className="w-4 h-4 text-primary" />}
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-foreground shrink-0 ${isChampion ? "bg-primary/15" : ""}`}
                            style={{ background: isChampion ? undefined : "var(--surface-container-highest)" }}
                          >
                            <span style={{ fontFamily: FONT, fontSize: "12px", fontWeight: 700 }} className={isChampion ? "text-primary" : "text-foreground"}>
                              {p.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span
                            className={isChampion ? "text-primary" : isEliminated ? "text-muted-foreground/50" : "text-foreground"}
                            style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: isChampion ? 700 : "var(--font-weight-normal)" }}
                          >
                            {p.name}
                          </span>
                        </div>
                        <div
                          className="px-2.5 py-1 rounded-[var(--radius-button)]"
                          style={{ background: "var(--surface-container-highest)" }}
                        >
                          <span className="text-foreground tabular-nums" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }}>
                            {p.odds.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Bet input - only show if tournament not decided yet */}
                      {!champion && p.name && (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex-1 relative">
                            <input
                              type="number"
                              min={0}
                              max={balance}
                              value={amt || ""}
                              onChange={(e) => setBetAmounts((prev) => ({ ...prev, [amtKey]: Math.max(0, parseInt(e.target.value) || 0) }))}
                              placeholder="Insats..."
                              className="w-full pl-3 pr-8 py-2 rounded-[var(--radius-card)] border border-border/50 bg-surface-container text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary transition-colors tabular-nums"
                              style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
                            />
                            <Ticket className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                          </div>
                          {[50, 100, 250].map((q) => (
                            <button
                              key={q}
                              onClick={() => setBetAmounts((prev) => ({ ...prev, [amtKey]: Math.min(q, balance) }))}
                              className="px-2 py-2 rounded-[var(--radius-card)] text-muted-foreground hover:text-foreground border border-border/30 hover:border-border transition-all cursor-pointer"
                              style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700 }}
                            >
                              {q}
                            </button>
                          ))}
                          <button
                            onClick={() => handlePlaceBet(p.name)}
                            disabled={amt <= 0 || amt > balance}
                            className="px-4 py-2 rounded-[var(--radius-button)] bg-primary text-primary-foreground disabled:opacity-25 hover:opacity-90 transition-all cursor-pointer disabled:cursor-not-allowed relative overflow-hidden"
                            style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
                          >
                            Betta
                          </button>
                        </div>
                      )}

                      {/* Active bet indicator */}
                      {activeBets.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          <span style={{ fontFamily: FONT, fontSize: "12px" }} className="text-primary">
                            Aktivt bet: {activeBets.reduce((s, b) => s + b.amount, 0)} karma
                          </span>
                        </div>
                      )}

                      {/* Resolved bets */}
                      {resolvedPlayerBets.map((b) => (
                        <div key={b.id} className="mt-2 flex items-center gap-2">
                          {b.won ? (
                            <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-destructive" />
                          )}
                          <span
                            style={{ fontFamily: FONT, fontSize: "12px" }}
                            className={b.won ? "text-[var(--success)]" : "text-destructive"}
                          >
                            {b.won
                              ? `Vann ${Math.round(b.amount * b.odds)} karma!`
                              : `Förlorade ${b.amount} karma`}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {bets.length > 0 && (
              <div className="flex flex-col gap-3">
                <span style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }} className="text-muted-foreground">
                  Dina bets
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label="Aktiva" value={String(pendingBets.length)} color="text-foreground" />
                  <StatCard label="Vunnet" value={`+${totalWon}`} color="text-[var(--success)]" />
                  <StatCard label="Förlorat" value={`-${totalLost}`} color="text-destructive" />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {!loading && activeTab === "leaderboard" && (
          <motion.div key="leaderboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Leaderboard currentName={name} />
          </motion.div>
        )}

        {!loading && activeTab === "shop" && profile && (
          <motion.div key="shop" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <CosmeticsShop profile={profile} onProfileUpdate={handleProfileUpdate} />
          </motion.div>
        )}

        {!loading && activeTab === "history" && (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <BetHistory bets={bets} />
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-[var(--radius-button)] bg-primary text-primary-foreground shadow-lg flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>
              Bet placerat!
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border/50 px-3 py-3 text-center" style={{ background: "var(--surface-container-low)" }}>
      <p className={`tabular-nums ${color}`} style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: 700 }}>
        {value}
      </p>
      <p className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "11px" }}>
        {label}
      </p>
    </div>
  );
}