import { useState, useCallback } from "react";
import { usePolling } from "../hooks/use-polling";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield, Lock, Eye, EyeOff, Users, Ticket, TrendingUp, Trophy,
  Trash2, RotateCcw, AlertTriangle, Check, Play, Pause, Database, Settings, ChevronDown, ChevronUp, Clock, LogOut,
  Swords, CheckCircle2, Loader2, Zap, Lightbulb,
} from "lucide-react";
import type { BettorProfile, TournamentWinnerOdds } from "./betting-store";
import type { PlacedBet, TournamentState, TournamentHistoryEntry, ActiveTournament } from "./api";
import {
  adminLogin,
  adminLogout,
  adminChangePassword,
  adminDeleteBettor,
  adminResetAll,
  adminFetchAllBets,
  adminDeleteTournamentHistoryEntry,
  adminClearTournamentHistory,
  adminDeleteActiveTournament,
  fetchAllBettors,
  fetchTournamentWinnerOdds,
  publishTournamentWinnerOdds,
  fetchTournamentState,
  saveTournamentState,
  fetchTournamentHistory,
  fetchActiveTournament,
  getAdminToken,
  fetchHighscorePlayers,
  fetchSuggestions,
  adminDeleteSuggestion,
  adminUpdateSuggestionStatus,
  resetEloRatings,
  fetchEloResetTimestamp,
} from "./api";
import type { Suggestion } from "./api";

const FONT = "'Titillium Web', sans-serif";

type AdminTab = "overview" | "tournaments" | "bettors" | "odds" | "history" | "suggestions" | "settings";

export function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(() => !!getAdminToken());
  const [authError, setAuthError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // Data
  const [bettors, setBettors] = useState<BettorProfile[]>([]);
  const [tournamentOdds, setTournamentOdds] = useState<TournamentWinnerOdds | null>(null);
  const [playerOddsEdit, setPlayerOddsEdit] = useState<Record<string, number>>({});
  const [allBets, setAllBets] = useState<PlacedBet[][]>([]);
  const [tournamentState, setTournamentState] = useState<TournamentState>({ active: false, activatedAt: null });
  const [tournamentHistory, setTournamentHistory] = useState<TournamentHistoryEntry[]>([]);
  const [activeTournament, setActiveTournament] = useState<ActiveTournament | null>(null);

  const [, setHighscorePlayers] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // UI
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteHistory, setConfirmDeleteHistory] = useState<string | null>(null);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmDeleteTournament, setConfirmDeleteTournament] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [changePw, setChangePw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [expandedBettor, setExpandedBettor] = useState<string | null>(null);
  const [confirmEloReset, setConfirmEloReset] = useState(false);
  const [eloResetTs, setEloResetTs] = useState<number | null>(null);
  const [eloResetting, setEloResetting] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleLogin = async () => {
    setLoading(true);
    setAuthError("");
    const result = await adminLogin(password);
    if (result.ok) {
      setAuthenticated(true);
      setPassword("");
    } else {
      setAuthError(result.error || "Felaktigt lösenord");
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await adminLogout();
    setAuthenticated(false);
    setPassword("");
  };

  const loadData = useCallback(async () => {
    if (!authenticated) return;
    const [b, tOdds, ab, ts, th, at, hp, sug, eloTs] = await Promise.all([
      fetchAllBettors(),
      fetchTournamentWinnerOdds(),
      adminFetchAllBets(),
      fetchTournamentState(),
      fetchTournamentHistory(),
      fetchActiveTournament(),
      fetchHighscorePlayers(),
      fetchSuggestions(),
      fetchEloResetTimestamp(),
    ]);
    setBettors(b);
    if (tOdds) {
      setTournamentOdds(tOdds);
      const oddsMap: Record<string, number> = {};
      tOdds.players.forEach(p => { oddsMap[p.name] = p.odds; });
      setPlayerOddsEdit(prev => Object.keys(prev).length === 0 ? oddsMap : prev);
    }
    setAllBets(ab);
    setTournamentState(ts);
    setTournamentHistory(th);
    setActiveTournament(at);
    setHighscorePlayers(hp);
    setSuggestions(sug);
    setEloResetTs(eloTs);
  }, [authenticated]);

  usePolling(loadData, { enabled: authenticated });

  const handleDeleteBettor = async (name: string) => {
    const ok = await adminDeleteBettor(name);
    if (ok) { showToast(`${name} raderad`); setConfirmDelete(null); loadData(); }
  };

  const handleResetAll = async () => {
    const ok = await adminResetAll();
    if (ok) { showToast("All data nollställd"); setConfirmReset(false); setPlayerOddsEdit({}); loadData(); }
  };

  const handleToggleTournament = async () => {
    const newState: TournamentState = {
      active: !tournamentState.active,
      activatedAt: !tournamentState.active ? Date.now() : tournamentState.activatedAt,
    };
    await saveTournamentState(newState);
    setTournamentState(newState);
    showToast(newState.active ? "Turnering aktiverad!" : "Turnering pausad");
  };

  const handleSaveOdds = async () => {
    if (!tournamentOdds) return;
    const updated: TournamentWinnerOdds = {
      players: tournamentOdds.players.map(p => ({
        name: p.name,
        odds: playerOddsEdit[p.name] ?? p.odds,
      })),
      champion: tournamentOdds.champion,
    };
    await publishTournamentWinnerOdds(updated);
    setTournamentOdds(updated);
    showToast("Odds sparade & publicerade");
  };

  const handleChangePw = async () => {
    if (!newPw || newPw.length < 4) return;
    const result = await adminChangePassword(newPw);
    if (result.ok) { setNewPw(""); setChangePw(false); showToast("Lösenord ändrat"); }
  };

  const handleDeleteActiveTournament = async () => {
    const ok = await adminDeleteActiveTournament();
    if (ok) { showToast("Aktiv turnering raderad"); setConfirmDeleteTournament(false); setActiveTournament(null); loadData(); }
  };

  // Stats
  const totalBalance = bettors.reduce((s, b) => s + b.balance, 0);
  const totalBetsCount = allBets.flat().length;
  const flatBets = allBets.flat();
  const resolvedBets = flatBets.filter(b => b.resolved);
  const pendingBets = flatBets.filter(b => !b.resolved);
  const players = tournamentOdds?.players || [];
  const champion = tournamentOdds?.champion || null;

  // Login screen
  if (!authenticated) {
    return (
      <div className="bg-background text-foreground flex items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <span style={{ fontFamily: FONT, fontSize: "var(--text-h3)", fontWeight: 700 }} className="text-foreground">Admin</span>
          </div>
          <p className="text-muted-foreground text-center" style={{ fontFamily: FONT, fontSize: "var(--text-base)" }}>
            Ange lösenord för att komma åt adminpanelen
          </p>
          <div className="w-full flex flex-col gap-3">
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Lösenord..."
                className="w-full px-4 py-3 pr-12 rounded-[var(--radius-card)] border border-border bg-surface-container-low text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary transition-colors"
                style={{ fontFamily: FONT, fontSize: "var(--text-base)" }}
                autoFocus
                autoComplete="current-password"
              />
              <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                {showPw ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
            {authError && <p className="text-destructive text-center" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>{authError}</p>}
            <button
              onClick={handleLogin}
              disabled={!password || loading}
              className="w-full py-3 rounded-[var(--radius-button)] bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}
            >
              {loading ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Lock className="w-4 h-4" />}
              Logga in
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const TAB_CONFIG: { key: AdminTab; label: string; icon: typeof Database }[] = [
    { key: "overview", label: "Översikt", icon: Database },
    { key: "tournaments", label: "Turneringar", icon: Swords },
    { key: "bettors", label: "Bettare", icon: Users },
    { key: "odds", label: "Odds", icon: TrendingUp },
    { key: "history", label: "Historik", icon: Clock },
    { key: "suggestions", label: "Förslag", icon: Lightbulb },
    { key: "settings", label: "Inst.", icon: Settings },
  ];

  return (
    <div className="bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border" style={{ background: "var(--surface-container)" }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">Adminpanel</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleTournament}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] border transition-all cursor-pointer ${
                tournamentState.active
                  ? "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
              style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
            >
              {tournamentState.active ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {tournamentState.active ? "Aktiv" : "Pausad"}
            </button>
            <button onClick={handleLogout} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Logga ut">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto flex px-1 overflow-x-auto">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1 py-3 border-b-2 transition-all duration-200 cursor-pointer whitespace-nowrap min-w-0 px-1 ${
                activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: activeTab === key ? "var(--font-weight-semibold)" : "var(--font-weight-normal)" }}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6 pb-24">
        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox icon={Users} label="Bettare" value={String(bettors.length)} />
              <StatBox icon={Ticket} label="Totala bets" value={String(totalBetsCount)} />
              <StatBox icon={Trophy} label="Avslutade" value={String(resolvedBets.length)} />
              <StatBox icon={TrendingUp} label="Aktiva" value={String(pendingBets.length)} />
            </div>

            {/* Active tournament quick card */}
            {activeTournament && (
              <button
                onClick={() => setActiveTab("tournaments")}
                className="rounded-[var(--radius-card)] border border-primary/20 p-4 flex items-center gap-4 text-left hover:border-primary/40 transition-all cursor-pointer"
                style={{ background: "var(--surface-container-low)" }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 shrink-0">
                  <Swords className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">
                    Aktiv turnering
                  </p>
                  <p style={{ fontFamily: FONT, fontSize: "12px" }} className="text-muted-foreground truncate">
                    {activeTournament.players.join(" · ")}
                  </p>
                </div>
                <div className={`px-2.5 py-1 rounded-[var(--radius-button)] text-xs font-semibold ${
                  activeTournament.status === "completed"
                    ? "bg-[var(--success)]/10 text-[var(--success)]"
                    : "bg-primary/10 text-primary"
                }`} style={{ fontFamily: FONT }}>
                  {activeTournament.status === "completed" ? "Klar" : "Pågår"}
                </div>
              </button>
            )}

            <div className={`rounded-[var(--radius-card)] border p-5 flex items-center justify-between ${tournamentState.active ? "border-[var(--success)]/20" : "border-border/50"}`} style={{ background: "var(--surface-container-low)" }}>
              <div>
                <p style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">Turneringsstatus</p>
                <p style={{ fontFamily: FONT, fontSize: "var(--text-label)" }} className="text-muted-foreground">
                  {tournamentState.active
                    ? `Aktiv sedan ${tournamentState.activatedAt ? new Date(tournamentState.activatedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }) : "–"}`
                    : "Turneringen är pausad"
                  }
                </p>
              </div>
              <button
                onClick={handleToggleTournament}
                className={`px-5 py-2.5 rounded-[var(--radius-button)] transition-all cursor-pointer ${
                  tournamentState.active ? "bg-destructive/15 text-destructive hover:bg-destructive/25" : "bg-[var(--success)] text-[var(--success-foreground)] hover:opacity-90"
                }`}
                style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
              >
                {tournamentState.active ? "Pausa" : "Aktivera"}
              </button>
            </div>

            {/* Tournament winner odds summary */}
            <div className="rounded-[var(--radius-card)] border border-border/50 overflow-hidden" style={{ background: "var(--surface-container-low)" }}>
              <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">Turneringsvinnare – Odds</span>
              </div>
              {players.length > 0 ? players.map(p => (
                <div key={p.name} className={`px-4 py-3 border-b border-border/20 last:border-0 flex items-center justify-between ${champion === p.name ? "bg-primary/[0.06]" : ""}`}>
                  <div className="flex items-center gap-2">
                    {champion === p.name && <Trophy className="w-3.5 h-3.5 text-primary" />}
                    <span className={champion === p.name ? "text-primary" : champion ? "text-muted-foreground/50" : "text-foreground"} style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: champion === p.name ? 700 : "var(--font-weight-normal)" }}>{p.name}</span>
                  </div>
                  <span className="text-foreground tabular-nums" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }}>{p.odds.toFixed(2)}</span>
                </div>
              )) : (
                <p className="px-4 py-6 text-center text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>Inga odds publicerade — starta turneringen först</p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Tournaments ── */}
        {activeTab === "tournaments" && (
          <motion.div key="tournaments" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-primary" />
                <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">
                  Aktiv turnering
                </span>
              </div>
              {activeTournament && (
                <button
                  onClick={() => setConfirmDeleteTournament(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] text-destructive border border-destructive/20 hover:bg-destructive/10 transition-all cursor-pointer"
                  style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
                >
                  <Trash2 className="w-3 h-3" />
                  Radera
                </button>
              )}
            </div>

            {!activeTournament ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-surface-container-high">
                  <Swords className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <div>
                  <p style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">
                    Ingen aktiv turnering
                  </p>
                  <p className="text-muted-foreground mt-1 max-w-xs mx-auto" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
                    Starta en ny turnering via Turnerings-fliken. Bracketets status synkas hit automatiskt.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Tournament header card */}
                <div className="rounded-[var(--radius-card)] border border-border/50 overflow-hidden" style={{ background: "var(--surface-container-low)" }}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        activeTournament.champion ? "bg-[var(--success)]/10" : "bg-primary/10"
                      }`}>
                        {activeTournament.champion
                          ? <Trophy className="w-5 h-5 text-[var(--success)]" />
                          : <Swords className="w-5 h-5 text-primary" />
                        }
                      </div>
                      <div>
                        <p style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">
                          {activeTournament.champion ? `Mästare: ${activeTournament.champion}` : "Turnering pågår"}
                        </p>
                        <p style={{ fontFamily: FONT, fontSize: "12px" }} className="text-muted-foreground">
                          Bo{activeTournament.bestOfConfig.quarter || 3}/{activeTournament.bestOfConfig.semi}/{activeTournament.bestOfConfig.final} · Startad {new Date(activeTournament.createdAt).toLocaleString("sv-SE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-[var(--radius-button)] flex items-center gap-1.5 ${
                      activeTournament.status === "completed"
                        ? "bg-[var(--success)]/10 text-[var(--success)]"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {activeTournament.status === "completed"
                        ? <CheckCircle2 className="w-3.5 h-3.5" />
                        : <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      }
                      <span style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>
                        {activeTournament.status === "completed" ? "Avslutad" : "Pågår"}
                      </span>
                    </div>
                  </div>

                  {/* Players row */}
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                    {activeTournament.players.map(name => {
                      const isChampion = activeTournament.champion === name;
                      const isEliminated = activeTournament.champion && !isChampion;
                      return (
                        <span
                          key={name}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-button)] border ${
                            isChampion
                              ? "border-[var(--success)]/30 bg-[var(--success)]/[0.06] text-[var(--success)]"
                              : isEliminated
                              ? "border-border/20 text-muted-foreground/40"
                              : "border-border/30 text-foreground"
                          }`}
                          style={{ fontFamily: FONT, fontSize: "12px", fontWeight: isChampion ? 700 : "var(--font-weight-normal)" }}
                        >
                          {isChampion && <Trophy className="w-3 h-3" />}
                          {name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Match cards */}
                <div className="flex flex-col gap-3">
                  {activeTournament.qf1 && <MatchStatusCard label="Kvartsfinal 1" tag="QF1" match={activeTournament.qf1} />}
                  {activeTournament.qf2 && <MatchStatusCard label="Kvartsfinal 2" tag="QF2" match={activeTournament.qf2} />}
                  {activeTournament.qf3 && <MatchStatusCard label="Kvartsfinal 3" tag="QF3" match={activeTournament.qf3} />}
                  {activeTournament.qf4 && <MatchStatusCard label="Kvartsfinal 4" tag="QF4" match={activeTournament.qf4} />}
                  <MatchStatusCard label="Semifinal 1" tag="SF1" match={activeTournament.semi1} />
                  <MatchStatusCard label="Semifinal 2" tag="SF2" match={activeTournament.semi2} />
                  <MatchStatusCard label="Final" tag="F" match={activeTournament.final} isFinal />
                </div>

                {/* Live update indicator */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] self-start border border-[var(--success)]/20" style={{ background: "var(--surface-container-low)" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                  <span className="text-[var(--success)]" style={{ fontFamily: FONT, fontSize: "11px", fontWeight: "var(--font-weight-semibold)" }}>
                    Auto-uppdatering var 5:e sekund
                  </span>
                </div>
              </div>
            )}

            {/* Tournament history quick glance */}
            {tournamentHistory.length > 0 && (
              <div className="flex flex-col gap-3 pt-4 border-t border-border/30">
                <div className="flex items-center justify-between">
                  <span style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }} className="text-muted-foreground">
                    Senaste turneringar
                  </span>
                  <button
                    onClick={() => setActiveTab("history")}
                    className="text-primary hover:underline cursor-pointer"
                    style={{ fontFamily: FONT, fontSize: "12px" }}
                  >
                    Visa alla →
                  </button>
                </div>
                {tournamentHistory.slice(0, 3).map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-card)] border border-border/30" style={{ background: "var(--surface-container)" }}>
                    <Trophy className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-primary truncate block" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>{entry.champion}</span>
                      <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "11px" }}>
                        {new Date(entry.date).toLocaleDateString("sv-SE", { month: "short", day: "numeric" })} · {entry.players.length} spelare
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Bettors ── */}
        {activeTab === "bettors" && (
          <motion.div key="bettors" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">{bettors.length} registrerade bettare</span>
              <span className="text-muted-foreground tabular-nums" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>Totalt saldo: {totalBalance}</span>
            </div>
            {bettors.sort((a, b) => b.balance - a.balance).map((bettor, idx) => {
              const isExpanded = expandedBettor === bettor.name;
              return (
                <div key={bettor.name} className="rounded-[var(--radius-card)] border border-border/50 overflow-hidden" style={{ background: "var(--surface-container-low)" }}>
                  <button onClick={() => setExpandedBettor(isExpanded ? null : bettor.name)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-high/30 transition-colors cursor-pointer">
                    <span className="text-muted-foreground tabular-nums w-6 text-center" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }}>{idx + 1}</span>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container-high shrink-0">
                      {bettor.equippedCosmetics?.avatar ? <span style={{ fontSize: "16px" }}>{bettor.equippedCosmetics.avatar}</span> : <span className="text-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }}>{bettor.name.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground truncate block" style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}>{bettor.name}</span>
                      {bettor.equippedCosmetics?.title && <span className="text-muted-foreground/60" style={{ fontFamily: FONT, fontSize: "11px" }}>{bettor.equippedCosmetics.title}</span>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-foreground tabular-nums" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }}>{bettor.balance}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-border/30 flex flex-col gap-3">
                      <div className="grid grid-cols-4 gap-2">
                        <MiniStat label="Saldo" value={String(bettor.balance)} />
                        <MiniStat label="Vunnet" value={`+${bettor.totalWon}`} />
                        <MiniStat label="Förlorat" value={`-${bettor.totalLost}`} />
                        <MiniStat label="Bets" value={String(bettor.totalBets)} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "11px" }}>Cosmetics: {bettor.purchasedCosmetics?.length || 0} köpta</span>
                        <span className="text-muted-foreground/40" style={{ fontFamily: FONT, fontSize: "11px" }}>Reg: {new Date(bettor.registeredAt).toLocaleDateString("sv-SE")}</span>
                      </div>
                      <button onClick={() => setConfirmDelete(bettor.name)} className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] text-destructive border border-destructive/20 hover:bg-destructive/10 transition-all cursor-pointer" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
                        <Trash2 className="w-3 h-3" /> Radera bettare
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {/* ── Odds management ── */}
        {activeTab === "odds" && (
          <motion.div key="odds" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">Turneringsvinnare – Odds</span>
              </div>
              <button onClick={handleSaveOdds} disabled={players.length === 0} className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-button)] bg-primary text-primary-foreground hover:opacity-90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>
                <Check className="w-3.5 h-3.5" /> Spara & publicera
              </button>
            </div>
            <p className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>Ställ in odds för varje spelare att vinna hela turneringen.</p>
            {players.length > 0 ? (
              <div className="flex flex-col gap-3">
                {players.map(p => {
                  const isChampion = champion === p.name;
                  const isEliminated = champion && !isChampion;
                  const oddsVal = playerOddsEdit[p.name] ?? p.odds;
                  return (
                    <div key={p.name} className={`rounded-[var(--radius-card)] border overflow-hidden transition-all ${isChampion ? "border-primary/30" : "border-border/40"} ${isEliminated ? "opacity-50" : ""}`} style={{ background: "var(--surface-container-low)" }}>
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isChampion ? "bg-primary/15" : ""}`} style={{ background: isChampion ? undefined : "var(--surface-container-highest)" }}>
                            {isChampion ? <Trophy className="w-4 h-4 text-primary" /> : <span style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: 700 }} className="text-foreground">{p.name.charAt(0).toUpperCase()}</span>}
                          </div>
                          <span className={isChampion ? "text-primary" : "text-foreground"} style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: isChampion ? 700 : "var(--font-weight-normal)" }}>{p.name}</span>
                        </div>
                        <input type="number" step="0.1" min="1.01" max="99" value={oddsVal} onChange={(e) => setPlayerOddsEdit(prev => ({ ...prev, [p.name]: Math.max(1.01, parseFloat(e.target.value) || 1.01) }))} disabled={!!champion} className="w-20 text-center px-2 py-1.5 rounded-[var(--radius-card)] border border-border/50 bg-surface-container text-foreground outline-none focus:border-primary transition-colors tabular-nums disabled:opacity-40" style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: 700 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Users className="w-8 h-8 opacity-30" />
                <span style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>Starta turneringen i bracket-vyn för att sätta odds</span>
              </div>
            )}
            {players.length > 0 && !champion && (
              <div className="flex flex-col gap-2 pt-2 border-t border-border/30">
                <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>Snabbinställningar</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Alla lika (4.00)", fn: () => { const m: Record<string,number> = {}; players.forEach(p => m[p.name] = 4.0); setPlayerOddsEdit(m); }},
                    { label: "Favorit + underdog", fn: () => { const m: Record<string,number> = {}; players.forEach((p,i) => m[p.name] = i === 0 ? 2.5 : i === players.length - 1 ? 8.0 : 4.0); setPlayerOddsEdit(m); }},
                    { label: "Jämna par (3.00)", fn: () => { const m: Record<string,number> = {}; players.forEach(p => m[p.name] = 3.0); setPlayerOddsEdit(m); }},
                    { label: "Höga odds (6.00)", fn: () => { const m: Record<string,number> = {}; players.forEach(p => m[p.name] = 6.0); setPlayerOddsEdit(m); }},
                  ].map(({ label, fn }) => (
                    <button key={label} onClick={fn} className="px-3 py-2 rounded-[var(--radius-card)] border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer" style={{ fontFamily: FONT, fontSize: "12px", fontWeight: "var(--font-weight-semibold)" }}>{label}</button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── History ── */}
        {activeTab === "history" && (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">Turneringshistorik</span>
              {tournamentHistory.length > 0 && (
                <button onClick={() => setConfirmClearHistory(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-button)] bg-destructive text-destructive-foreground hover:opacity-90 transition-all cursor-pointer" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>
                  <Trash2 className="w-3.5 h-3.5" /> Rensa alla
                </button>
              )}
            </div>
            {tournamentHistory.length > 0 ? (
              <div className="flex flex-col gap-3">
                {tournamentHistory.map(entry => {
                  const date = new Date(entry.date);
                  const dateStr = date.toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" });
                  const timeStr = date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={entry.id} className="rounded-[var(--radius-card)] border border-border/40 p-4 transition-colors" style={{ background: "var(--surface-container)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary/10"><Trophy className="w-5 h-5 text-primary" /></div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-primary truncate" style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}>{entry.champion}</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "12px" }}>{dateStr} {timeStr}</span>
                              <span className="text-muted-foreground/40">|</span>
                              <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "12px" }}>Bo{entry.bestOfQuarter || 3}/{entry.bestOfSemi}/{entry.bestOfFinal}</span>
                              <span className="text-muted-foreground/40">|</span>
                              <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "12px" }}>{entry.players.join(", ")}</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => setConfirmDeleteHistory(entry.id)} className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      {(entry.qf1Winner || entry.qf2Winner || entry.qf3Winner || entry.qf4Winner) && (
                        <div className="mt-2 flex gap-2 pl-[52px] flex-wrap">
                          {["qf1Winner", "qf2Winner", "qf3Winner", "qf4Winner"].map((k, i) => {
                            const w = (entry as any)[k];
                            return w ? (
                              <div key={k} className="flex flex-col gap-0.5">
                                <span className="text-muted-foreground/40 uppercase" style={{ fontFamily: FONT, fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em" }}>QF{i + 1}</span>
                                <span className="text-muted-foreground truncate" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>{w}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                      <div className="mt-2 flex gap-3 pl-[52px]">
                        <div className="flex-1 flex flex-col gap-0.5"><span className="text-muted-foreground/60 uppercase" style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}>SF1</span><span className="text-foreground truncate" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>{entry.semi1Winner}</span></div>
                        <div className="flex-1 flex flex-col gap-0.5"><span className="text-muted-foreground/60 uppercase" style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}>SF2</span><span className="text-foreground truncate" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>{entry.semi2Winner}</span></div>
                        <div className="flex-1 flex flex-col gap-0.5"><span className="text-primary/60 uppercase" style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em" }}>Final</span><span className="text-primary truncate" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>{entry.champion}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Trophy className="w-8 h-8 opacity-30" />
                <span style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>Inga avslutade turneringar</span>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Suggestions ── */}
        {activeTab === "suggestions" && (
          <motion.div key="suggestions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">
                  Inskickade förslag ({suggestions.length})
                </span>
              </div>
            </div>

            {suggestions.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-border/50 p-8 text-center" style={{ background: "var(--surface-container-low)" }}>
                <p className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-base)" }}>Inga förslag inskickade ännu</p>
              </div>
            ) : (
              <div className="rounded-[var(--radius-card)] border border-border/50 overflow-hidden" style={{ background: "var(--surface-container-low)" }}>
                {/* Table header */}
                <div
                  className="hidden md:grid px-4 py-3 border-b border-border items-center"
                  style={{
                    gridTemplateColumns: "1fr 120px 120px 100px 80px 40px",
                    columnGap: 8,
                    background: "var(--surface-container-high)",
                  }}
                >
                  {["Förslag", "Från", "Kategori", "Datum", "Status", ""].map((h) => (
                    <span
                      key={h}
                      className="text-muted-foreground"
                      style={{
                        fontFamily: FONT,
                        fontSize: "var(--text-xs)",
                        fontWeight: "var(--font-weight-semibold)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase" as const,
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {/* Rows */}
                {suggestions.map((s) => (
                  <div key={s.id}>
                    {/* Desktop row */}
                    <div
                      className="hidden md:grid px-4 py-3 border-b border-border last:border-b-0 items-center hover:bg-muted/20 transition-colors"
                      style={{ gridTemplateColumns: "1fr 120px 120px 100px 80px 40px", columnGap: 8 }}
                    >
                      <p
                        className="text-foreground truncate"
                        title={s.text}
                        style={{ fontFamily: FONT, fontSize: "var(--text-label)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      >
                        {s.text}
                      </p>
                      <span className="text-muted-foreground truncate" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>{s.name}</span>
                      <span
                        className="px-2 py-0.5 rounded-[var(--radius-button)] text-center truncate"
                        style={{ fontFamily: FONT, fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", background: "var(--muted)", color: "var(--muted-foreground)" }}
                      >
                        {s.category}
                      </span>
                      <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>
                        {new Date(s.timestamp).toLocaleDateString("sv-SE")}
                      </span>
                      <select
                        value={s.status}
                        onChange={async (e) => {
                          const ok = await adminUpdateSuggestionStatus(s.id, e.target.value);
                          if (ok) loadData();
                        }}
                        className="px-1 py-0.5 rounded-[var(--radius-card)] border border-border bg-surface-container text-foreground cursor-pointer outline-none"
                        style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}
                      >
                        <option value="new">Ny</option>
                        <option value="read">Läst</option>
                        <option value="planned">Planerad</option>
                        <option value="done">Klar</option>
                        <option value="rejected">Avvisad</option>
                      </select>
                      <button
                        onClick={async () => {
                          const ok = await adminDeleteSuggestion(s.id);
                          if (ok) { showToast("Förslag raderat"); loadData(); }
                        }}
                        className="text-destructive hover:opacity-70 transition-opacity cursor-pointer"
                        title="Radera"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Mobile card */}
                    <div className="md:hidden px-4 py-3 border-b border-border last:border-b-0 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>{s.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-[var(--radius-button)]" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", background: "var(--muted)", color: "var(--muted-foreground)" }}>{s.category}</span>
                          <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>{new Date(s.timestamp).toLocaleDateString("sv-SE")}</span>
                        </div>
                      </div>
                      <p className="text-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-base)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{s.text}</p>
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={s.status}
                          onChange={async (e) => {
                            const ok = await adminUpdateSuggestionStatus(s.id, e.target.value);
                            if (ok) loadData();
                          }}
                          className="px-2 py-1 rounded-[var(--radius-card)] border border-border bg-surface-container text-foreground cursor-pointer outline-none"
                          style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}
                        >
                          <option value="new">Ny</option>
                          <option value="read">Läst</option>
                          <option value="planned">Planerad</option>
                          <option value="done">Klar</option>
                          <option value="rejected">Avvisad</option>
                        </select>
                        <button
                          onClick={async () => {
                            const ok = await adminDeleteSuggestion(s.id);
                            if (ok) { showToast("Förslag raderat"); loadData(); }
                          }}
                          className="text-destructive hover:opacity-70 transition-opacity cursor-pointer flex items-center gap-1"
                          style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Radera
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Settings ── */}
        {activeTab === "settings" && (
          <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
            <div className="rounded-[var(--radius-card)] border border-border/50 p-5 flex flex-col gap-4" style={{ background: "var(--surface-container-low)" }}>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">Byt lösenord</span>
              </div>
              {changePw ? (
                <div className="flex flex-col gap-3">
                  <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Nytt lösenord (minst 4 tecken)..." className="w-full px-4 py-2.5 rounded-[var(--radius-card)] border border-border bg-surface-container text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary transition-colors" style={{ fontFamily: FONT, fontSize: "var(--text-base)" }} autoComplete="new-password" />
                  <div className="flex gap-2">
                    <button onClick={() => { setChangePw(false); setNewPw(""); }} className="px-4 py-2 rounded-[var(--radius-button)] border border-border/50 text-foreground hover:bg-surface-container-high transition-all cursor-pointer" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>Avbryt</button>
                    <button onClick={handleChangePw} disabled={newPw.length < 4} className="px-4 py-2 rounded-[var(--radius-button)] bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-all cursor-pointer disabled:cursor-not-allowed" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>Spara</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setChangePw(true)} className="self-start px-4 py-2 rounded-[var(--radius-button)] border border-border/50 text-foreground hover:border-primary/40 transition-all cursor-pointer" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>Byt lösenord</button>
              )}
            </div>
            {/* Elo Reset */}
            <div className="rounded-[var(--radius-card)] border border-border/50 p-5 flex flex-col gap-4" style={{ background: "var(--surface-container-low)" }}>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-primary" />
                <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">Återställ Elo</span>
              </div>
              <p className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-label)", lineHeight: 1.5 }}>
                Återställer alla spelares Elo-rating till 1000 och tar bort alla Elo-relaterade achievements (Underdog, Peak Performance, Free Fall, G.O.A.T., Untouchable, Transcendent, Rock Bottom). Historisk data raderas inte — bara Elo-beräkningen börjar om från noll.
              </p>
              {eloResetTs && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-button)] border border-border/30" style={{ background: "var(--surface-container)" }}>
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>
                    Senaste reset: {new Date(eloResetTs).toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              <button
                onClick={() => setConfirmEloReset(true)}
                disabled={eloResetting}
                className="self-start flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-button)] border border-primary/40 text-primary hover:bg-primary/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
              >
                {eloResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                {eloResetting ? "Återställer..." : "Återställ Elo nu"}
              </button>
            </div>

            <div className="rounded-[var(--radius-card)] border border-destructive/30 p-5 flex flex-col gap-4" style={{ background: "var(--surface-container-low)" }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-destructive">Farozon</span>
              </div>
              <p className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>Nollställ all bettingdata — raderar alla bettare, bets, odds och turneringsstatus. Kan inte ångras.</p>
              <button onClick={() => setConfirmReset(true)} className="self-start flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-button)] bg-destructive text-destructive-foreground hover:opacity-90 transition-all cursor-pointer" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>
                <RotateCcw className="w-3.5 h-3.5" /> Nollställ allt
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Dialogs */}
      <AnimatePresence>
        {confirmDelete && <ConfirmDialog title={`Radera ${confirmDelete}?`} description="Bettarens profil och alla deras bets raderas permanent." onConfirm={() => handleDeleteBettor(confirmDelete)} onCancel={() => setConfirmDelete(null)} destructive />}
      </AnimatePresence>
      <AnimatePresence>
        {confirmReset && <ConfirmDialog title="Nollställ all data?" description="ALL bettingdata raderas permanent: bettare, bets, odds och turneringsstatus." onConfirm={handleResetAll} onCancel={() => setConfirmReset(false)} destructive />}
      </AnimatePresence>
      <AnimatePresence>
        {confirmDeleteHistory && (
          <ConfirmDialog title="Radera turneringspost?" description="Denna turneringspost raderas permanent." onConfirm={async () => {
            const ok = await adminDeleteTournamentHistoryEntry(confirmDeleteHistory);
            if (ok) { showToast("Turneringspost raderad"); setConfirmDeleteHistory(null); loadData(); }
          }} onCancel={() => setConfirmDeleteHistory(null)} destructive />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {confirmClearHistory && (
          <ConfirmDialog title="Rensa all historik?" description="ALL turneringshistorik raderas permanent." onConfirm={async () => {
            const ok = await adminClearTournamentHistory();
            if (ok) { showToast("Historik rensad"); setConfirmClearHistory(false); loadData(); }
          }} onCancel={() => setConfirmClearHistory(false)} destructive />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {confirmEloReset && (
          <ConfirmDialog
            title="Återställ alla Elo-ratings?"
            description="Alla spelares Elo sätts till 1000 och Elo-relaterade achievements (7 st) tas bort. Framtida rundor beräknas med Elo-potten från den nya startpunkten. Historisk data finns kvar men påverkar inte Elo."
            onConfirm={async () => {
              setEloResetting(true);
              setConfirmEloReset(false);
              const ok = await resetEloRatings();
              if (ok) {
                showToast("Elo och Elo-achievements återställda");
                loadData();
              } else {
                showToast("Kunde inte återställa Elo");
              }
              setEloResetting(false);
            }}
            onCancel={() => setConfirmEloReset(false)}
            destructive
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {confirmDeleteTournament && (
          <ConfirmDialog title="Radera aktiv turnering?" description="Den aktiva turneringens data raderas från servern. Bracket-vyn på turneringssidan påverkas inte direkt." onConfirm={handleDeleteActiveTournament} onCancel={() => setConfirmDeleteTournament(false)} destructive />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-[var(--radius-button)] bg-primary text-primary-foreground shadow-lg flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function StatBox({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border/50 px-4 py-4 flex flex-col gap-1" style={{ background: "var(--surface-container-low)" }}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        <span style={{ fontSize: "var(--text-sm)" }}>{label}</span>
      </div>
      <span className="text-foreground tabular-nums" style={{ fontSize: "var(--text-h4)", fontWeight: "var(--font-weight-bold)" }}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-foreground tabular-nums" style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-bold)" }}>{value}</p>
      <p className="text-muted-foreground/60" style={{ fontSize: "var(--text-xs)" }}>{label}</p>
    </div>
  );
}

interface MatchStatusProps {
  label: string;
  tag: string;
  match: { player1: string; player2: string; scores1: number[]; scores2: number[]; wins1: number; wins2: number; winner: string | null };
  isFinal?: boolean;
}

function MatchStatusCard({ label, match, isFinal }: MatchStatusProps) {
  const F = "'Titillium Web', sans-serif";
  const isDone = !!match.winner;
  const isWaiting = !match.player1 || !match.player2;
  const totalSets = match.scores1.length;
  const playedSets = match.scores1.filter((_, i) => match.scores1[i] > 0 || match.scores2[i] > 0).length;

  return (
    <div
      className={`rounded-[var(--radius-card)] border overflow-hidden transition-all ${
        isDone
          ? isFinal ? "border-[var(--success)]/30" : "border-primary/20"
          : isWaiting ? "border-border/20 opacity-60" : "border-border/40"
      }`}
      style={{ background: "var(--surface-container)" }}
    >
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-border/20">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            isDone ? isFinal ? "bg-[var(--success)]/15" : "bg-primary/15" : "bg-surface-container-highest"
          }`}>
            {isDone ? (
              isFinal ? <Trophy className="w-3 h-3 text-[var(--success)]" /> : <CheckCircle2 className="w-3 h-3 text-primary" />
            ) : isWaiting ? (
              <Pause className="w-3 h-3 text-muted-foreground/40" />
            ) : (
              <Zap className="w-3 h-3 text-primary" />
            )}
          </div>
          <span style={{ fontFamily: F, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isWaiting && !isDone && (
            <span className="text-primary" style={{ fontFamily: F, fontSize: "11px", fontWeight: "var(--font-weight-semibold)" }}>
              Set {playedSets}/{totalSets}
            </span>
          )}
          {isDone && (
            <span className={isFinal ? "text-[var(--success)]" : "text-primary"} style={{ fontFamily: F, fontSize: "11px", fontWeight: "var(--font-weight-semibold)" }}>
              Klar
            </span>
          )}
          {isWaiting && (
            <span className="text-muted-foreground/40" style={{ fontFamily: F, fontSize: "11px" }}>Väntar</span>
          )}
        </div>
      </div>

      {/* Players */}
      <div className="px-4 py-2">
        <PlayerRow name={match.player1} wins={match.wins1} isWinner={match.winner === match.player1} scores={match.scores1} opponentScores={match.scores2} placeholder="TBD" />
        <div className="h-px bg-border/20 my-1" />
        <PlayerRow name={match.player2} wins={match.wins2} isWinner={match.winner === match.player2} scores={match.scores2} opponentScores={match.scores1} placeholder="TBD" />
      </div>
    </div>
  );
}

function PlayerRow({ name, wins, isWinner, scores, opponentScores, placeholder }: {
  name: string; wins: number; isWinner: boolean; scores: number[]; opponentScores: number[]; placeholder: string;
}) {
  const F = "'Titillium Web', sans-serif";
  const displayName = name || placeholder;

  return (
    <div className={`flex items-center gap-2 py-1.5 ${isWinner ? "" : name && !isWinner && scores.some((_, i) => scores[i] > 0 || opponentScores[i] > 0) ? "opacity-60" : ""}`}>
      {isWinner && <Trophy className="w-3 h-3 text-primary shrink-0" />}
      {!isWinner && <div className="w-3 shrink-0" />}
      <span
        className={`flex-1 truncate ${!name ? "text-muted-foreground/30 italic" : isWinner ? "text-primary" : "text-foreground"}`}
        style={{ fontFamily: F, fontSize: "var(--text-label)", fontWeight: isWinner ? 700 : "var(--font-weight-normal)" }}
      >
        {displayName}
      </span>
      <span className="text-foreground tabular-nums" style={{ fontFamily: F, fontSize: "var(--text-label)", fontWeight: 700 }}>
        {wins}
      </span>
      <div className="flex gap-1">
        {scores.map((s, i) => {
          const played = s > 0 || opponentScores[i] > 0;
          const won = s > opponentScores[i];
          return (
            <span
              key={i}
              className={`w-5 h-5 rounded flex items-center justify-center tabular-nums ${
                !played ? "text-muted-foreground/20" : won ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
              style={{ fontFamily: F, fontSize: "11px", fontWeight: played ? 700 : "var(--font-weight-normal)" }}
            >
              {played ? s : "–"}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ConfirmDialog({ title, description, onConfirm, onCancel, destructive }: {
  title: string; description: string; onConfirm: () => void; onCancel: () => void; destructive?: boolean;
}) {
  const F = "'Titillium Web', sans-serif";
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="relative w-full max-w-sm rounded-[var(--radius-card)] border border-border overflow-hidden p-6 flex flex-col gap-4" style={{ background: "var(--surface-container)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-5 h-5 ${destructive ? "text-destructive" : "text-primary"}`} />
          <span style={{ fontFamily: F, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }} className="text-foreground">{title}</span>
        </div>
        <p className="text-muted-foreground" style={{ fontFamily: F, fontSize: "var(--text-label)" }}>{description}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-[var(--radius-button)] border border-border/50 text-foreground hover:bg-surface-container-high transition-all cursor-pointer" style={{ fontFamily: F, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>Avbryt</button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-[var(--radius-button)] hover:opacity-90 transition-all cursor-pointer ${destructive ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`} style={{ fontFamily: F, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>Bekräfta</button>
        </div>
      </motion.div>
    </motion.div>
  );
}