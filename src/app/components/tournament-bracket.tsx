import { AnimatePresence, motion } from "motion/react";
import { useState, useEffect, useRef, useMemo } from "react";
import { MiniMatchCard, MatchData, createMatch } from "./match-card";
import { MatchFullscreen } from "./match-fullscreen";
import type { EloMatchInfo } from "./match-fullscreen";
import { PlayerSetup } from "./player-setup";
import { Trophy, Lock, RotateCcw, AlertTriangle, Save, Check } from "lucide-react";
import { saveTournamentHistoryEntry, saveActiveTournament, deleteActiveTournament, fetchActiveTournament, fetchTournamentHistory } from "./api";
import type { ActiveTournament, ActiveTournamentMatch, TournamentHistoryEntry } from "./api";
import { fetchHighscorePlayers, fetchMonthlySessions, fetchMonthList, fetchHighscoreSessions, fetchEloResetTimestamp, fetchHistoricalStats } from "./api";
import type { GameSession, HistoricalStats } from "./api";
import {
  ChampionConfetti,
  TournamentProgressBar,
  AnimatedConnectorDot,
  computeMVP,
  MVPBadge,
  TaleOfTape,
  UpsetAlert,
} from "./tournament-enhancements";
import { computeAllH2H, computeEloRatings, getH2H } from "../lib/elo";
import type { EloRating, H2HRecord } from "../lib/elo";

type MatchKey = "qf1" | "qf2" | "qf3" | "qf4" | "semi1" | "semi2" | "final";

type OpenMatch = {
  key: MatchKey;
  p1: string;
  p2: string;
} | null;

type PlayerNames = [string, string, string, string, string, string, string, string];

type BestOfConfig = { quarter: number; semi: number; final: number };

function createMatchWithPlayers(
  id: string,
  label: string,
  bestOf: number,
  p1Name: string,
  p2Name: string
): MatchData {
  const m = createMatch(id, label, bestOf);
  m.player1.name = p1Name;
  m.player2.name = p2Name;
  return m;
}

export function TournamentBracket({ onTournamentSaved }: { onTournamentSaved?: () => void }) {
  const [playerNames, setPlayerNames] = useState<PlayerNames | null>(null);
  const [bestOfConfig, setBestOfConfig] = useState<BestOfConfig>({ quarter: 3, semi: 3, final: 3 });

  const [qf1, setQf1] = useState<MatchData>(createMatch("qf1", "Kvartsfinal 1", 3));
  const [qf2, setQf2] = useState<MatchData>(createMatch("qf2", "Kvartsfinal 2", 3));
  const [qf3, setQf3] = useState<MatchData>(createMatch("qf3", "Kvartsfinal 3", 3));
  const [qf4, setQf4] = useState<MatchData>(createMatch("qf4", "Kvartsfinal 4", 3));
  const [semi1, setSemi1] = useState<MatchData>(createMatch("semi1", "Semifinal 1", 3));
  const [semi2, setSemi2] = useState<MatchData>(createMatch("semi2", "Semifinal 2", 3));
  const [final_, setFinal] = useState<MatchData>(createMatch("final", "Final", 3));

  const [openMatch, setOpenMatch] = useState<OpenMatch>(null);
  const [loading, setLoading] = useState(true);
  const [availablePlayers, setAvailablePlayers] = useState<string[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [top8Bwp, setTop8Bwp] = useState<{ name: string; eloDelta: number; gamesPlayed: number }[]>([]);
  const [loadingBwp, setLoadingBwp] = useState(true);
  const [bwpMonth, setBwpMonth] = useState<string>("");
  const [bwpDebugInfo, setBwpDebugInfo] = useState<{ sessionCount: number; playerCount: number }>({ sessionCount: 0, playerCount: 0 });
  const [selectedBwpMonth, setSelectedBwpMonth] = useState<string>(""); // "" = current month
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [serverMonthList, setServerMonthList] = useState<string[]>([]);
  const savedRef = useRef(false);
  const [isSaved, setIsSaved] = useState(false);
  const tournamentIdRef = useRef<string>("");
  const restoredRef = useRef(false);

  // ── Enhancement state (must be before early returns) ──
  const [allSessions, setAllSessions] = useState<GameSession[]>([]);
  const [eloRatings, setEloRatings] = useState<Record<string, EloRating>>({});
  const [eloResetTimestamp, setEloResetTimestamp] = useState<number | null>(null);
  const [historicalStats, setHistoricalStats] = useState<HistoricalStats>({});
  const [h2hMap, setH2hMap] = useState<Record<string, H2HRecord>>({});
  const [showTaleOfTape, setShowTaleOfTape] = useState<OpenMatch>(null);
  const [upsetAlert, setUpsetAlert] = useState<{ winner: string; loser: string; matchLabel: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savingTournament, setSavingTournament] = useState(false);
  const prevWinnersRef = useRef<Record<string, string | null>>({});

  // Fetch all sessions for Elo/H2H computation
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [monthList, eloResetTs, histStats] = await Promise.all([
          fetchMonthList(),
          fetchEloResetTimestamp(),
          fetchHistoricalStats(),
        ]);
        const allSess: GameSession[] = [];
        for (const month of monthList) {
          const sessions = await fetchMonthlySessions(month);
          allSess.push(...sessions);
        }
        // Also fetch legacy sessions
        const legacySessions = await fetchHighscoreSessions();
        allSess.push(...legacySessions);
        // Deduplicate by id
        const seen = new Set<string>();
        const deduped = allSess.filter(s => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        if (!cancelled) {
          setAllSessions(deduped);
          setEloRatings(computeEloRatings(deduped, eloResetTs));
          setEloResetTimestamp(eloResetTs);
          setHistoricalStats(histStats);
          setServerMonthList(monthList);
        }
      } catch (e) {
        console.log("Failed to fetch sessions for Elo:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Compute H2H when we have sessions + player names
  useEffect(() => {
    if (!playerNames || allSessions.length === 0) return;
    setH2hMap(computeAllH2H(allSessions, [...playerNames]));
  }, [allSessions, playerNames]);

  // Detect upsets when match winners change
  useEffect(() => {
    if (!playerNames) return;
    const seedMap: Record<string, number> = {};
    playerNames.forEach((name, i) => { seedMap[name] = i + 1; });

    const matches: { key: MatchKey; match: MatchData }[] = [
      { key: "qf1", match: qf1 }, { key: "qf2", match: qf2 },
      { key: "qf3", match: qf3 }, { key: "qf4", match: qf4 },
      { key: "semi1", match: semi1 }, { key: "semi2", match: semi2 },
      { key: "final", match: final_ },
    ];

    for (const { key, match } of matches) {
      const prev = prevWinnersRef.current[key];
      if (!prev && match.winner) {
        // New winner detected — check if upset (Elo diff >= 100)
        const loser = match.winner === match.player1.name ? match.player2.name : match.player1.name;
        const winnerElo = eloRatings[match.winner]?.elo ?? 1000;
        const loserElo = eloRatings[loser]?.elo ?? 1000;
        const eloDiff = loserElo - winnerElo; // positive = winner was underdog
        if (eloDiff >= 100 && loser) {
          setUpsetAlert({ winner: match.winner, loser, matchLabel: match.label });
        }
      }
    }

    const current: Record<string, string | null> = {};
    for (const { key, match } of matches) current[key] = match.winner;
    prevWinnersRef.current = current;
  }, [qf1.winner, qf2.winner, qf3.winner, qf4.winner, semi1.winner, semi2.winner, final_.winner, playerNames, eloRatings]);

  // Compute MVP from tournament matches
  const mvpData = useMemo(() => {
    if (!final_.winner) return null;
    return computeMVP([
      { match: qf1, label: "QF1" }, { match: qf2, label: "QF2" },
      { match: qf3, label: "QF3" }, { match: qf4, label: "QF4" },
      { match: semi1, label: "SF1" }, { match: semi2, label: "SF2" },
      { match: final_, label: "Final" },
    ]);
  }, [qf1, qf2, qf3, qf4, semi1, semi2, final_]);

  // Helper: get win probability for a match
  // Helper: open match with Tale of Tape check
  const openMatchWithTape = (key: MatchKey, p1: string, p2: string) => {
    const match = key === "qf1" ? qf1 : key === "qf2" ? qf2 : key === "qf3" ? qf3 : key === "qf4" ? qf4 : key === "semi1" ? semi1 : key === "semi2" ? semi2 : final_;
    const isFresh = match.player1.sets.every(s => s === 0) && match.player2.sets.every(s => s === 0) && !match.winner;
    const hasElo = !!(eloRatings[p1] && eloRatings[p2]);
    if (isFresh && hasElo && p1 && p2) {
      setShowTaleOfTape({ key, p1, p2 });
    } else {
      setOpenMatch({ key, p1, p2 });
    }
  };

  // Helper: restore MatchData from ActiveTournamentMatch
  function restoreMatch(id: string, label: string, bestOf: number, sync: ActiveTournamentMatch | undefined): MatchData {
    if (!sync || !sync.player1) return createMatch(id, label, bestOf);
    return {
      id,
      label,
      bestOf,
      player1: { name: sync.player1, sets: [...sync.scores1], matchWins: sync.wins1, yellowCards: 0 },
      player2: { name: sync.player2, sets: [...sync.scores2], matchWins: sync.wins2, yellowCards: 0 },
      winner: sync.winner,
    };
  }

  // On mount: check for active tournament on server
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const active = await fetchActiveTournament();
        if (cancelled) return;
        if (active && (active.status === "active" || active.status === "completed")) {
          restoredRef.current = true;
          tournamentIdRef.current = active.id;
          const names: PlayerNames = [
            active.players[0] || "",
            active.players[1] || "",
            active.players[2] || "",
            active.players[3] || "",
            active.players[4] || "",
            active.players[5] || "",
            active.players[6] || "",
            active.players[7] || "",
          ];
          setPlayerNames(names);
          // Backwards compat: old tournaments may not have quarter
          const boConfig: BestOfConfig = {
            quarter: active.bestOfConfig.quarter || 3,
            semi: active.bestOfConfig.semi,
            final: active.bestOfConfig.final,
          };
          setBestOfConfig(boConfig);
          setQf1(restoreMatch("qf1", "Kvartsfinal 1", boConfig.quarter, active.qf1));
          setQf2(restoreMatch("qf2", "Kvartsfinal 2", boConfig.quarter, active.qf2));
          setQf3(restoreMatch("qf3", "Kvartsfinal 3", boConfig.quarter, active.qf3));
          setQf4(restoreMatch("qf4", "Kvartsfinal 4", boConfig.quarter, active.qf4));
          setSemi1(restoreMatch("semi1", "Semifinal 1", boConfig.semi, active.semi1));
          setSemi2(restoreMatch("semi2", "Semifinal 2", boConfig.semi, active.semi2));
          setFinal(restoreMatch("final", "Final", boConfig.final, active.final));
          if (active.champion) {
            // Check if this tournament was already saved to history
            try {
              const history = await fetchTournamentHistory();
              const alreadySaved = history.some((h: TournamentHistoryEntry) =>
                h.champion === active.champion &&
                h.players?.length === active.players?.length &&
                h.players?.every((p: string, i: number) => p === active.players[i]) &&
                Math.abs((h.date || 0) - (active.createdAt || 0)) < 24 * 60 * 60 * 1000
              );
              savedRef.current = alreadySaved;
              setIsSaved(alreadySaved);
            } catch {
              savedRef.current = false;
              setIsSaved(false);
            }
          }
        }
      } catch (e) {
        console.log("Failed to load active tournament:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch available players
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPlayers(true);
      try {
        const players = await fetchHighscorePlayers();
        if (!cancelled) setAvailablePlayers(players);
      } catch (e) {
        console.log("Failed to load highscore players for tournament setup:", e);
      } finally {
        if (!cancelled) setLoadingPlayers(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Compute top 8 by Elo delta for the current month (requires allSessions + eloRatings)
  useEffect(() => {
    if (allSessions.length === 0 || Object.keys(eloRatings).length === 0) return;
    setLoadingBwp(true);
    try {
      const now = new Date();
      const targetMonth = selectedBwpMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // Compute all available months from sessions + server month list
      const monthSet = new Set<string>();
      for (const s of allSessions) {
        const d = new Date(s.date);
        monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
      // Also include months from the server's month list (may have months without session data)
      for (const m of serverMonthList) {
        monthSet.add(m);
      }
      // Exclude current month from the dropdown (it's the default)
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      monthSet.delete(currentMonthStr);
      const sortedMonths = Array.from(monthSet).sort().reverse();
      setAvailableMonths(sortedMonths);

      const [year, month] = targetMonth.split("-").map(Number);
      const monthStart = new Date(year, month - 1, 1).getTime();
      const monthEnd = new Date(year, month, 1).getTime();

      // Sessions before this month → Elo at month start
      const sessionsBeforeMonth = allSessions.filter(s => s.date < monthStart);
      const eloAtMonthStart = computeEloRatings(sessionsBeforeMonth, eloResetTimestamp);

      // For current month, use live eloRatings; for historical, compute Elo at month end
      const isCurrentMonth = !selectedBwpMonth || selectedBwpMonth === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const eloAtMonthEnd = isCurrentMonth ? eloRatings : computeEloRatings(allSessions.filter(s => s.date < monthEnd), eloResetTimestamp);

      // Sessions during this month → count rounds per player
      const sessionsThisMonth = allSessions.filter(s => s.date >= monthStart && s.date < monthEnd);

      // Count rounds played per player this month
      const monthlyRounds: Record<string, number> = {};
      for (const session of sessionsThisMonth) {
        const participantSet = new Set<string>();
        for (const p of session.players || []) participantSet.add(p);
        for (const round of session.rounds) {
          for (const f of round.finalists) participantSet.add(f);
          if (round.winner) participantSet.add(round.winner);
          if (round.players) for (const p of round.players) participantSet.add(p);
        }
        const participants = Array.from(participantSet);
        for (const round of session.rounds) {
          const roundParticipants = round.players ?? participants;
          for (const p of roundParticipants) {
            monthlyRounds[p] = (monthlyRounds[p] || 0) + 1;
          }
        }
      }

      // Compute total rounds per player across ALL sessions (matches highscore-page gamesPlayed)
      const totalRounds: Record<string, number> = {};
      for (const session of allSessions) {
        if (eloResetTimestamp && session.date < eloResetTimestamp) continue;
        const participantSet = new Set<string>();
        for (const p of session.players || []) participantSet.add(p);
        for (const round of session.rounds) {
          for (const f of round.finalists) participantSet.add(f);
          if (round.winner) participantSet.add(round.winner);
          if (round.players) for (const p of round.players) participantSet.add(p);
        }
        const participants = Array.from(participantSet);
        for (const round of session.rounds) {
          const roundParticipants = round.players ?? participants;
          for (const p of roundParticipants) {
            totalRounds[p] = (totalRounds[p] || 0) + 1;
          }
        }
      }

      // Merge historical stats into totalRounds (historical data is from HISTORICAL_DATA_MONTH = "2026-03")
      // The highscore page adds historicalStats.gamesPlayed to the player's gamesPlayed,
      // so we must do the same to match the ≥30 total rounds filter.
      const HISTORICAL_DATA_MONTH = "2026-03";
      for (const [name, hist] of Object.entries(historicalStats)) {
        if (hist.gamesPlayed > 0) {
          totalRounds[name] = (totalRounds[name] || 0) + hist.gamesPlayed;
        }
      }

      // Also ensure players from historicalStats appear in monthlyRounds if they have
      // session data for this month (they might only be in round.players which we now track),
      // AND add historical gamesPlayed to monthlyRounds when viewing the historical month
      if (targetMonth === HISTORICAL_DATA_MONTH) {
        for (const [name, hist] of Object.entries(historicalStats)) {
          if (hist.gamesPlayed > 0) {
            monthlyRounds[name] = (monthlyRounds[name] || 0) + hist.gamesPlayed;
          }
        }
      }

      // Build candidate list from BOTH monthlyRounds AND players who have Elo delta
      // (some players may only exist in historicalStats for the historical month)
      const candidateNames = new Set(Object.keys(monthlyRounds));
      // Also include players from eloAtMonthEnd who have different Elo from month start
      for (const name of Object.keys(eloAtMonthEnd)) {
        const endElo = eloAtMonthEnd[name]?.elo ?? 1000;
        const startElo = eloAtMonthStart[name]?.elo ?? 1000;
        if (endElo !== startElo) candidateNames.add(name);
      }

      // Compute delta: Elo at month end - Elo at month start
      // Filter by total rounds >= 30 (matching spec: "≥30 rundor totalt, inte per månad")
      const ranked = Array.from(candidateNames)
        .map(name => {
          const endElo = eloAtMonthEnd[name]?.elo ?? 1000;
          const startElo = eloAtMonthStart[name]?.elo ?? 1000;
          return {
            name,
            eloDelta: endElo - startElo,
            gamesPlayed: monthlyRounds[name] || 0,
          };
        })
        .filter(p => (totalRounds[p.name] ?? 0) >= 30)
        .sort((a, b) => {
          // Weighted delta: delta / sqrt(rounds) — rewards efficiency over volume
          const wA = a.gamesPlayed > 0 ? a.eloDelta / Math.sqrt(a.gamesPlayed) : 0;
          const wB = b.gamesPlayed > 0 ? b.eloDelta / Math.sqrt(b.gamesPlayed) : 0;
          return wB - wA || b.eloDelta - a.eloDelta;
        });

      setBwpMonth(targetMonth);
      setTop8Bwp(ranked);
      setBwpDebugInfo({ sessionCount: sessionsThisMonth.length, playerCount: ranked.length });
    } catch (e) {
      console.log("Failed to compute monthly Elo delta:", e);
    } finally {
      setLoadingBwp(false);
    }
  }, [allSessions, eloRatings, eloResetTimestamp, selectedBwpMonth, serverMonthList, historicalStats]);

  // Helper: serialize MatchData → ActiveTournamentMatch
  function matchToSync(m: MatchData): ActiveTournamentMatch {
    return {
      player1: m.player1.name,
      player2: m.player2.name,
      scores1: [...m.player1.sets],
      scores2: [...m.player2.sets],
      wins1: m.player1.matchWins,
      wins2: m.player2.matchWins,
      winner: m.winner,
    };
  }

  // Sync bracket state to server whenever matches change
  useEffect(() => {
    if (!playerNames || !tournamentIdRef.current) return;
    const tournament: ActiveTournament = {
      id: tournamentIdRef.current,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      players: [...playerNames],
      bestOfConfig,
      qf1: matchToSync(qf1),
      qf2: matchToSync(qf2),
      qf3: matchToSync(qf3),
      qf4: matchToSync(qf4),
      semi1: matchToSync(semi1),
      semi2: matchToSync(semi2),
      final: matchToSync(final_),
      champion: final_.winner,
      status: final_.winner ? "completed" : "active",
    };
    saveActiveTournament(tournament);
  }, [qf1, qf2, qf3, qf4, semi1, semi2, final_, playerNames, bestOfConfig]);

  // Save to history — manual button handler (replaces auto-save)
  const handleSaveTournament = async () => {
    if (!final_.winner || !playerNames || savedRef.current) return;
    setSavingTournament(true);
    try {
      const tournamentId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const toDetail = (m: MatchData) => ({
        player1: m.player1.name,
        player2: m.player2.name,
        scores1: [...m.player1.sets],
        scores2: [...m.player2.sets],
        wins1: m.player1.matchWins,
        wins2: m.player2.matchWins,
        winner: m.winner,
      });
      await saveTournamentHistoryEntry({
        id: tournamentId,
        date: Date.now(),
        players: [...playerNames],
        qf1Winner: qf1.winner || "",
        qf2Winner: qf2.winner || "",
        qf3Winner: qf3.winner || "",
        qf4Winner: qf4.winner || "",
        semi1Winner: semi1.winner || "",
        semi2Winner: semi2.winner || "",
        champion: final_.winner,
        bestOfQuarter: bestOfConfig.quarter,
        bestOfSemi: bestOfConfig.semi,
        bestOfFinal: bestOfConfig.final,
        matches: {
          qf1: toDetail(qf1),
          qf2: toDetail(qf2),
          qf3: toDetail(qf3),
          qf4: toDetail(qf4),
          semi1: toDetail(semi1),
          semi2: toDetail(semi2),
          final: toDetail(final_),
        },
      });
      savedRef.current = true;
      setIsSaved(true);
      onTournamentSaved?.();
    } catch (e) {
      console.log("Failed to save tournament:", e);
    } finally {
      setSavingTournament(false);
    }
  };

  const handleStart = (names: PlayerNames, bestOfs: BestOfConfig) => {
    savedRef.current = false;
    setIsSaved(false);
    tournamentIdRef.current = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPlayerNames(names);
    setBestOfConfig(bestOfs);
    // QF matchups: 1v8, 4v5, 2v7, 3v6 (standard seeding)
    setQf1(createMatchWithPlayers("qf1", "Kvartsfinal 1", bestOfs.quarter, names[0], names[7]));
    setQf2(createMatchWithPlayers("qf2", "Kvartsfinal 2", bestOfs.quarter, names[3], names[4]));
    setQf3(createMatchWithPlayers("qf3", "Kvartsfinal 3", bestOfs.quarter, names[1], names[6]));
    setQf4(createMatchWithPlayers("qf4", "Kvartsfinal 4", bestOfs.quarter, names[2], names[5]));
    setSemi1(createMatch("semi1", "Semifinal 1", bestOfs.semi));
    setSemi2(createMatch("semi2", "Semifinal 2", bestOfs.semi));
    setFinal(createMatch("final", "Final", bestOfs.final));
  };

  // QF winners feed semis: QF1 winner vs QF2 winner = SF1, QF3 winner vs QF4 winner = SF2
  const handleQfUpdate = (key: "qf1" | "qf2" | "qf3" | "qf4", match: MatchData) => {
    const setters: Record<string, React.Dispatch<React.SetStateAction<MatchData>>> = { qf1: setQf1, qf2: setQf2, qf3: setQf3, qf4: setQf4 };
    setters[key](match);

    if (key === "qf1" || key === "qf2") {
      // SF1 = QF1 winner vs QF2 winner
      const otherQf = key === "qf1" ? qf2 : qf1;
      const qf1W = key === "qf1" ? match.winner : otherQf.winner;
      const qf2W = key === "qf2" ? match.winner : otherQf.winner;
      setSemi1((prev) => ({
        ...prev,
        player1: { ...prev.player1, name: qf1W || "" },
        player2: { ...prev.player2, name: qf2W || "" },
        winner: (!qf1W || !qf2W) ? null : prev.winner,
      }));
    } else {
      // SF2 = QF3 winner vs QF4 winner
      const otherQf = key === "qf3" ? qf4 : qf3;
      const qf3W = key === "qf3" ? match.winner : otherQf.winner;
      const qf4W = key === "qf4" ? match.winner : otherQf.winner;
      setSemi2((prev) => ({
        ...prev,
        player1: { ...prev.player1, name: qf3W || "" },
        player2: { ...prev.player2, name: qf4W || "" },
        winner: (!qf3W || !qf4W) ? null : prev.winner,
      }));
    }
  };

  const handleSemi1Update = (match: MatchData) => {
    setSemi1(match);
    if (match.winner) {
      setFinal((prev) => ({ ...prev, player1: { ...prev.player1, name: match.winner! } }));
    } else {
      setFinal((prev) => ({ ...prev, player1: { ...prev.player1, name: "" }, winner: null }));
    }
  };

  const handleSemi2Update = (match: MatchData) => {
    setSemi2(match);
    if (match.winner) {
      setFinal((prev) => ({ ...prev, player2: { ...prev.player2, name: match.winner! } }));
    } else {
      setFinal((prev) => ({ ...prev, player2: { ...prev.player2, name: "" }, winner: null }));
    }
  };

  const resetAll = () => {
    deleteActiveTournament();
    setPlayerNames(null);
    setShowResetConfirm(false);
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span
          className="text-muted-foreground"
          style={{ fontSize: "var(--text-label)" }}
        >
          Laddar turnering...
        </span>
      </div>
    );
  }

  // ── Setup screen ──
  if (!playerNames) {
    return (
      <PlayerSetup
        onStart={handleStart}
        availablePlayers={availablePlayers}
        loadingPlayers={loadingPlayers}
        top8Bwp={top8Bwp}
        loadingBwp={loadingBwp}
        bwpMonth={bwpMonth}
        bwpDebugInfo={bwpDebugInfo}
        availableMonths={availableMonths}
        selectedBwpMonth={selectedBwpMonth}
        setSelectedBwpMonth={setSelectedBwpMonth}
      />
    );
  }

  const champion = final_.winner;
  const semisUnlocked = qf1.winner && qf2.winner && qf3.winner && qf4.winner;
  const sf1Unlocked = !!(qf1.winner && qf2.winner);
  const sf2Unlocked = !!(qf3.winner && qf4.winner);
  const finalsUnlocked = !!(semi1.winner && semi2.winner);

  const getMatchData = (key: MatchKey): MatchData => {
    switch (key) {
      case "qf1": return qf1;
      case "qf2": return qf2;
      case "qf3": return qf3;
      case "qf4": return qf4;
      case "semi1": return semi1;
      case "semi2": return semi2;
      case "final": return final_;
    }
  };

  const getMatchUpdater = (key: MatchKey) => {
    switch (key) {
      case "qf1": return (m: MatchData) => handleQfUpdate("qf1", m);
      case "qf2": return (m: MatchData) => handleQfUpdate("qf2", m);
      case "qf3": return (m: MatchData) => handleQfUpdate("qf3", m);
      case "qf4": return (m: MatchData) => handleQfUpdate("qf4", m);
      case "semi1": return handleSemi1Update;
      case "semi2": return handleSemi2Update;
      case "final": return setFinal;
    }
  };

  const isMatchDisabled = (key: MatchKey): boolean => {
    switch (key) {
      case "qf1": case "qf2": case "qf3": case "qf4": return false;
      case "semi1": return !sf1Unlocked;
      case "semi2": return !sf2Unlocked;
      case "final": return !finalsUnlocked;
    }
  };

  const getFullscreenProps = () => {
    if (!openMatch) return null;
    const match = getMatchData(openMatch.key);
    const onUpdate = getMatchUpdater(openMatch.key);
    const disabled = isMatchDisabled(openMatch.key);
    // Build eloInfo for Elo display in final view
    let eloInfo: EloMatchInfo | undefined;
    if (playerNames) {
      const p1Elo = eloRatings[openMatch.p1]?.elo ?? 1000;
      const p2Elo = eloRatings[openMatch.p2]?.elo ?? 1000;
      eloInfo = { p1Elo, p2Elo, participantCount: playerNames.length };
    }
    return { match, onUpdate, p1: openMatch.p1, p2: openMatch.p2, disabled, eloInfo };
  };

  return (
    <>
      <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
        {/* ── Confetti (fixed position) ── */}
        <ChampionConfetti active={!!champion} />

        {/* ── Progress bar ── */}
        <TournamentProgressBar qf1={qf1} qf2={qf2} qf3={qf3} qf4={qf4} semi1={semi1} semi2={semi2} final_={final_} />

        {/* ── Animated connector styles ── */}
        <AnimatedConnectorDot active={!!(qf1.winner || qf2.winner || qf3.winner || qf4.winner)} />

        {/* ── Champion celebration ── */}
        {champion && (
          <div className="relative flex flex-col items-center gap-2 py-6 md:py-8">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent rounded-[var(--radius-card)]" />
            <Trophy className="relative w-7 h-7 text-primary mb-1" />
            <span
              className="relative text-muted-foreground"
              style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.25em", textTransform: "uppercase" }}
            >
              Mästare
            </span>
            <span
              className="relative text-primary"
              style={{ fontSize: "clamp(var(--text-h3), 8vw, var(--text-h1))", fontWeight: "var(--font-weight-bold)", fontFamily: "'Titillium Web', sans-serif" }}
            >
              {champion}
            </span>
            {/* MVP Badge */}
            {mvpData && <MVPBadge mvp={mvpData} champion={champion} />}
          </div>
        )}

        {/* ══════ DESKTOP BRACKET (md+) ══════ */}
        <div className="hidden md:flex items-center gap-0">
          {/* Left bracket: QF1+QF2 → SF1 */}
          <div className="flex items-center flex-1">
            {/* QF column left */}
            <div className="flex flex-col gap-6 flex-1">
              <BracketNode label="Kvartsfinal 1" tag="QF1" match={qf1}
                p1={playerNames[0]} p2={playerNames[7]}
                onClick={() => openMatchWithTape("qf1", playerNames[0], playerNames[7])}
                eloRatings={eloRatings}
              />
              <BracketNode label="Kvartsfinal 2" tag="QF2" match={qf2}
                p1={playerNames[3]} p2={playerNames[4]}
                onClick={() => openMatchWithTape("qf2", playerNames[3], playerNames[4])}
                eloRatings={eloRatings}
              />
            </div>
            {/* QF→SF connector */}
            <div className="flex flex-col items-center justify-center w-8 self-stretch">
              <div className={`relative flex-1 w-px transition-all duration-700 ${qf1.winner ? "bg-primary/30" : "bg-border/20"}`}>
                {qf1.winner && !sf1Unlocked && <><div className="flow-dot" /><div className="flow-dot" /><div className="flow-dot" /></>}
              </div>
              <div className={`w-2 h-2 rounded-full shrink-0 transition-all duration-500 ${sf1Unlocked ? "bg-primary/50" : "bg-border/30"}`} />
              <div className={`relative flex-1 w-px transition-all duration-700 ${qf2.winner ? "bg-primary/30" : "bg-border/20"}`}>
                {qf2.winner && !sf1Unlocked && <><div className="flow-dot" /><div className="flow-dot" /><div className="flow-dot" /></>}
              </div>
            </div>
            {/* SF1 */}
            <div className="flex flex-col items-center flex-1">
              <BracketNode label="Semifinal 1" tag="SF1" match={semi1}
                p1={qf1.winner || "Vinnare KF1"} p2={qf2.winner || "Vinnare KF2"}
                disabled={!sf1Unlocked}
                onClick={() => { if (sf1Unlocked) openMatchWithTape("semi1", qf1.winner || "", qf2.winner || ""); }}
                eloRatings={eloRatings}
              />
              {!sf1Unlocked && (
                <span className="text-muted-foreground/60 mt-1" style={{ fontSize: "var(--text-xs)" }}>
                  Väntar på kvartsfinaler
                </span>
              )}
            </div>
          </div>

          {/* SF→Final connector left */}
          <div className="flex items-center justify-center w-8 self-stretch">
            <div className={`relative w-full h-px transition-all duration-700 ${semi1.winner ? "bg-primary/30" : "bg-border/20"}`}>
              {semi1.winner && !finalsUnlocked && <><div className="flow-dot-h" /><div className="flow-dot-h" /><div className="flow-dot-h" /></>}
            </div>
          </div>

          {/* FINAL (center) */}
          <div className="flex flex-col items-center gap-3 px-2 shrink-0" style={{ minWidth: 180 }}>
            <div className="flex items-center gap-2.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                finalsUnlocked ? "bg-primary/15" : "bg-surface-container-high"
              }`}>
                {finalsUnlocked ? (
                  <Trophy className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Lock className="w-3 h-3 text-muted-foreground/50" />
                )}
              </div>
              <span
                className="text-foreground"
                style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.05em" }}
              >
                Final
              </span>
            </div>
            <MiniMatchCard
              match={final_}
              p1Placeholder="Vinnare SF1"
              p2Placeholder="Vinnare SF2"
              disabled={!finalsUnlocked}
              isFinal
              onClick={() => {
                if (finalsUnlocked) openMatchWithTape("final", semi1.winner || "", semi2.winner || "");
              }}
              p1Elo={eloRatings[semi1.winner || ""]?.elo}
              p2Elo={eloRatings[semi2.winner || ""]?.elo}
            />
            {!finalsUnlocked && (
              <span className="text-muted-foreground/60" style={{ fontSize: "var(--text-label)" }}>
                Väntar på semifinaler
              </span>
            )}
          </div>

          {/* SF→Final connector right */}
          <div className="flex items-center justify-center w-8 self-stretch">
            <div className={`relative w-full h-px transition-all duration-700 ${semi2.winner ? "bg-primary/30" : "bg-border/20"}`}>
              {semi2.winner && !finalsUnlocked && <><div className="flow-dot-h" /><div className="flow-dot-h" /><div className="flow-dot-h" /></>}
            </div>
          </div>

          {/* Right bracket: SF2 ← QF3+QF4 */}
          <div className="flex items-center flex-1">
            {/* SF2 */}
            <div className="flex flex-col items-center flex-1">
              <BracketNode label="Semifinal 2" tag="SF2" match={semi2}
                p1={qf3.winner || "Vinnare KF3"} p2={qf4.winner || "Vinnare KF4"}
                disabled={!sf2Unlocked}
                onClick={() => { if (sf2Unlocked) openMatchWithTape("semi2", qf3.winner || "", qf4.winner || ""); }}
                eloRatings={eloRatings}
              />
              {!sf2Unlocked && (
                <span className="text-muted-foreground/60 mt-1" style={{ fontSize: "var(--text-xs)" }}>
                  Väntar på kvartsfinaler
                </span>
              )}
            </div>
            {/* QF→SF connector */}
            <div className="flex flex-col items-center justify-center w-8 self-stretch">
              <div className={`relative flex-1 w-px transition-all duration-700 ${qf3.winner ? "bg-primary/30" : "bg-border/20"}`}>
                {qf3.winner && !sf2Unlocked && <><div className="flow-dot" /><div className="flow-dot" /><div className="flow-dot" /></>}
              </div>
              <div className={`w-2 h-2 rounded-full shrink-0 transition-all duration-500 ${sf2Unlocked ? "bg-primary/50" : "bg-border/30"}`} />
              <div className={`relative flex-1 w-px transition-all duration-700 ${qf4.winner ? "bg-primary/30" : "bg-border/20"}`}>
                {qf4.winner && !sf2Unlocked && <><div className="flow-dot" /><div className="flow-dot" /><div className="flow-dot" /></>}
              </div>
            </div>
            {/* QF column right */}
            <div className="flex flex-col gap-6 flex-1">
              <BracketNode label="Kvartsfinal 3" tag="QF3" match={qf3}
                p1={playerNames[1]} p2={playerNames[6]}
                onClick={() => openMatchWithTape("qf3", playerNames[1], playerNames[6])}
                eloRatings={eloRatings}
              />
              <BracketNode label="Kvartsfinal 4" tag="QF4" match={qf4}
                p1={playerNames[2]} p2={playerNames[5]}
                onClick={() => openMatchWithTape("qf4", playerNames[2], playerNames[5])}
                eloRatings={eloRatings}
              />
            </div>
          </div>
        </div>

        {/* ══════ MOBILE BRACKET ══════ */}
        <div className="flex md:hidden flex-col gap-3">
          {/* Quarterfinals */}
          <SectionLabel label="Kvartsfinaler" />
          <div className="grid grid-cols-2 gap-3">
            <BracketNode label="KF 1" tag="QF1" match={qf1}
              p1={playerNames[0]} p2={playerNames[7]}
              onClick={() => openMatchWithTape("qf1", playerNames[0], playerNames[7])}
              eloRatings={eloRatings}
            />
            <BracketNode label="KF 2" tag="QF2" match={qf2}
              p1={playerNames[3]} p2={playerNames[4]}
              onClick={() => openMatchWithTape("qf2", playerNames[3], playerNames[4])}
              eloRatings={eloRatings}
            />
            <BracketNode label="KF 3" tag="QF3" match={qf3}
              p1={playerNames[1]} p2={playerNames[6]}
              onClick={() => openMatchWithTape("qf3", playerNames[1], playerNames[6])}
              eloRatings={eloRatings}
            />
            <BracketNode label="KF 4" tag="QF4" match={qf4}
              p1={playerNames[2]} p2={playerNames[5]}
              onClick={() => openMatchWithTape("qf4", playerNames[2], playerNames[5])}
              eloRatings={eloRatings}
            />
          </div>

          {/* Mobile connector QF→SF */}
          <MobileConnector active={!!semisUnlocked} label="Semifinaler" />

          {/* Semis */}
          <div className="grid grid-cols-2 gap-3">
            <BracketNode label="Semifinal 1" tag="SF1" match={semi1}
              p1={qf1.winner || "Vinnare KF1"} p2={qf2.winner || "Vinnare KF2"}
              disabled={!sf1Unlocked}
              onClick={() => { if (sf1Unlocked) openMatchWithTape("semi1", qf1.winner || "", qf2.winner || ""); }}
              eloRatings={eloRatings}
            />
            <BracketNode label="Semifinal 2" tag="SF2" match={semi2}
              p1={qf3.winner || "Vinnare KF3"} p2={qf4.winner || "Vinnare KF4"}
              disabled={!sf2Unlocked}
              onClick={() => { if (sf2Unlocked) openMatchWithTape("semi2", qf3.winner || "", qf4.winner || ""); }}
              eloRatings={eloRatings}
            />
          </div>

          {/* Mobile connector SF→Final */}
          <MobileConnector active={!!finalsUnlocked} label="Final" />

          {/* Final */}
          <div className="flex flex-col items-center gap-3 px-6">
            <div className="w-full">
              <MiniMatchCard
                match={final_}
                p1Placeholder="Vinnare SF1"
                p2Placeholder="Vinnare SF2"
                disabled={!finalsUnlocked}
                isFinal
                onClick={() => {
                  if (finalsUnlocked) openMatchWithTape("final", semi1.winner || "", semi2.winner || "");
                }}
                p1Elo={eloRatings[semi1.winner || ""]?.elo}
                p2Elo={eloRatings[semi2.winner || ""]?.elo}
              />
            </div>
            {!finalsUnlocked && (
              <span className="text-muted-foreground/60" style={{ fontSize: "var(--text-label)" }}>
                Väntar på semifinaler
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => window.location.href = "/admin"}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-button)] border border-border/40 hover:border-primary/40 text-muted-foreground hover:text-primary transition-all duration-300 cursor-pointer"
            style={{ fontSize: "var(--text-label)" }}
          >
            <Lock className="w-3.5 h-3.5 transition-transform duration-500 group-hover:scale-110" />
            Admin
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-button)] text-muted-foreground hover:text-destructive transition-all duration-300 cursor-pointer"
            style={{ fontSize: "var(--text-label)" }}
          >
            <RotateCcw className="w-3.5 h-3.5 transition-transform duration-500 group-hover:-rotate-180" />
            Ny turnering
          </button>
          {champion && !isSaved && (
            <button
              onClick={handleSaveTournament}
              disabled={savingTournament}
              className={`group flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-button)] border transition-all duration-300 cursor-pointer ${
                savingTournament
                  ? "border-primary/40 text-primary opacity-70"
                  : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
              }`}
              style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
            >
              {savingTournament ? (
                <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 transition-transform duration-500 group-hover:scale-110" />
              )}
              {savingTournament ? "Sparar..." : "Spara turnering"}
            </button>
          )}
          {champion && isSaved && (
            <span
              className="flex items-center gap-2 px-5 py-2.5 text-primary/60"
              style={{ fontSize: "var(--text-label)" }}
            >
              <Check className="w-3.5 h-3.5" />
              Sparad
            </span>
          )}
        </div>
      </div>

      {/* Fullscreen overlay */}
      {openMatch && (() => {
        const props = getFullscreenProps();
        if (!props) return null;
        return (
          <MatchFullscreen
            match={props.match}
            onUpdate={props.onUpdate}
            onClose={() => setOpenMatch(null)}
            disabled={props.disabled}
            p1Placeholder={props.p1}
            p2Placeholder={props.p2}
            eloInfo={props.eloInfo}
          />
        );
      })()}

      {/* Tournament enhancements */}
      <AnimatePresence>
        {showTaleOfTape && (
          <TaleOfTape
            p1={showTaleOfTape.p1}
            p2={showTaleOfTape.p2}
            elo={eloRatings}
            h2h={getH2H(h2hMap, showTaleOfTape.p1, showTaleOfTape.p2)}
            matchLabel={getMatchData(showTaleOfTape.key).label}
            onContinue={() => {
              const tape = showTaleOfTape;
              setShowTaleOfTape(null);
              setOpenMatch(tape);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {upsetAlert && (
          <UpsetAlert
            winner={upsetAlert.winner}
            loser={upsetAlert.loser}
            matchLabel={upsetAlert.matchLabel}
            onDismiss={() => setUpsetAlert(null)}
          />
        )}
      </AnimatePresence>

      {/* Reset confirmation dialog */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowResetConfirm(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Dialog */}
            <motion.div
              className="relative w-full max-w-sm rounded-[var(--radius-card)] border border-border/40 overflow-hidden"
              style={{
                background: "var(--popover)",
                boxShadow: "var(--elevation-sm)",
              }}
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Top accent strip */}
              <div className="h-1 w-full bg-destructive/60" />

              <div className="flex flex-col gap-5 p-6">
                {/* Icon + Title */}
                <div className="flex items-start gap-4">
                  <div
                    className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "color-mix(in srgb, var(--destructive) 15%, transparent)" }}
                  >
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3
                      className="text-foreground"
                      style={{
                        fontFamily: "'Titillium Web', sans-serif",
                        fontSize: "var(--text-lg)",
                        fontWeight: "var(--font-weight-semibold)",
                      }}
                    >
                      Avsluta turnering?
                    </h3>
                    <p
                      className="text-muted-foreground"
                      style={{
                        fontFamily: "'Titillium Web', sans-serif",
                        fontSize: "var(--text-label)",
                        fontWeight: "var(--font-weight-normal)",
                        lineHeight: 1.5,
                      }}
                    >
                      All turneringsdata kommer att raderas permanent. Matcher, poäng och resultat kan inte återskapas.
                    </p>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-5 py-2.5 rounded-[var(--radius-button)] border border-border/40 text-foreground hover:bg-muted/40 transition-all duration-200 cursor-pointer"
                    style={{
                      fontFamily: "'Titillium Web', sans-serif",
                      fontSize: "var(--text-label)",
                      fontWeight: "var(--font-weight-semibold)",
                    }}
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={resetAll}
                    className="px-5 py-2.5 rounded-[var(--radius-button)] bg-destructive text-destructive-foreground hover:opacity-90 transition-all duration-200 cursor-pointer"
                    style={{
                      fontFamily: "'Titillium Web', sans-serif",
                      fontSize: "var(--text-label)",
                      fontWeight: "var(--font-weight-semibold)",
                    }}
                  >
                    Radera turnering
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function BracketNode({
  label,
  tag,
  match,
  p1,
  p2,
  onClick,
  disabled,
  eloRatings,
}: {
  label: string;
  tag: string;
  match: MatchData;
  p1: string;
  p2: string;
  onClick: () => void;
  disabled?: boolean;
  eloRatings?: Record<string, EloRating>;
}) {
  const isDone = !!match.winner;
  const p1Name = match.player1.name || p1;
  const p2Name = match.player2.name || p2;
  return (
    <div className={`flex flex-col gap-3 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-2.5 px-1">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
          isDone ? "bg-primary/15" : "bg-surface-container-high"
        }`}>
          <span
            className={`transition-colors duration-300 ${isDone ? "text-primary" : "text-muted-foreground"}`}
            style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-bold)" }}
          >
            {tag.replace("QF", "").replace("SF", "")}
          </span>
        </div>
        <span
          className="text-foreground"
          style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.05em" }}
        >
          {label}
        </span>
      </div>
      <MiniMatchCard
        match={match}
        p1Placeholder={p1}
        p2Placeholder={p2}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        p1Elo={eloRatings?.[p1Name]?.elo}
        p2Elo={eloRatings?.[p2Name]?.elo}
      />
    </div>
  );
}

function MobileConnector({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center justify-center py-2">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      <div className={`mx-4 flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-500 ${
        active ? "bg-primary/10" : "bg-surface-container-high/60"
      }`}>
        {active ? (
          <Trophy className="w-3 h-3 text-primary" />
        ) : (
          <Lock className="w-3 h-3 text-muted-foreground/60" />
        )}
        <span
          className={active ? "text-primary" : "text-muted-foreground/60"}
          style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          {label}
        </span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-px bg-border/30" />
      <span
        className="text-muted-foreground"
        style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.15em", textTransform: "uppercase" }}
      >
        {label}
      </span>
      <div className="flex-1 h-px bg-border/30" />
    </div>
  );
}