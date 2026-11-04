import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePolling } from "../hooks/use-polling";
import {
  Plus,
  Archive,
  UserPlus,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useNavigationGuard } from "./navigation-guard";
import { ChampionConfetti } from "./tournament-enhancements";
import { ConfirmDialog } from "./confirm-dialog";
import type { GameSession, GameRound, HistoricalStats, PlayerCards } from "./api";
import {
  fetchHighscorePlayers,
  saveHighscorePlayers,
  fetchHighscoreSessions,
  saveHighscoreSessions,
  saveArchivedSeasons,
  fetchHistoricalStats,
  saveHistoricalStats,
  fetchMonthlySessions,
  saveMonthlySessions,
  deleteMonthlySession,
  fetchMonthList,
  saveMonthList,
  discoverMonths,
  fetchPlayerCards,
  savePlayerCards,
  fetchSeedStatus,
  markSeeded,
  removePlayerFromServer,
  fetchTournamentHistory,
  fetchPlayerAchievements,
  savePlayerAchievements,
  fetchEloResetTimestamp,
  API_BASE,
} from "./api";
import type { TournamentHistoryEntry, SavedPlayerAchievements } from "./api";
import { stripEmoji, PLAYER_EMOJIS } from "../lib/players";
import { HISTORICAL_DATA_MONTH, ARCHIVED_MONTH_STATS, ARCHIVED_STAT_MONTHS } from "../lib/archived-stats";
import { getCurrentMonth } from "../lib/dates";
import type { MonthView } from "../lib/dates";
import { computeStats, sortStats } from "../lib/stats";
import type { SortTab, PlayerStats } from "../lib/stats";
import { ELO_START, SEED_MIN_ROUNDS, computeLastPlayed, applyEloDecay, computeElo, computeEloHistory, computeH2HElo } from "../lib/elo";
import type { EloEntry } from "../lib/elo";
import { computeRevengeData, computeSeasonSummary, generateFunFacts, computePlayerInsights, computeH2HInsights } from "../lib/insights";
import { buildStatsCsv } from "../lib/stats-csv";
import { ALL_ACHIEVEMENTS, MYTHIC_COMPLETIONIST, computePlayerAchievements, syncAchievements } from "../lib/achievements";
import { FONT, MIN_PLAYERS_FOR_ROUND, INACTIVE_WEEKS } from "./highscore/constants";
import type { RegStep } from "./highscore/constants";
import { HighscoreEmptyState } from "./highscore/empty-state";
import { Podium } from "./highscore/podium";
import { RegistrationFlow } from "./highscore/registration-flow";
import { MonthPicker } from "./highscore/month-picker";
import { HeroStats } from "./highscore/hero-stats";
import { TitleRow } from "./highscore/title-row";
import { CompareView } from "./highscore/compare-view";
import { SeasonSummaryCard } from "./highscore/season-summary-card";
import { LeaderboardTable } from "./highscore/leaderboard-table";
import { ActionRow } from "./highscore/action-row";
import { ApiInfoModal } from "./highscore/api-info-modal";
import { RankingInfoModal } from "./highscore/ranking-info-modal";
import { DeepDiveView } from "./highscore/deep-dive-view";
import { PlayerProfileModal } from "./highscore/player-profile-modal";
import { AddPlayerModal } from "./highscore/add-player-modal";
import { RecentSessions } from "./highscore/recent-sessions";
import { ShareResultPrompt } from "./highscore/share-result";

interface SaveCelebration {
  phase: "before" | "after";
  winner: string | null;
  /** What the ranking looked like just before the save. */
  before: {
    sortedStats: PlayerStats[];
    podiumPlayers: PlayerStats[];
    eloRatings: Record<string, EloEntry>;
    monthlyEloDelta: Record<string, number> | undefined;
    monthlyRoundsPlayed: Record<string, number> | undefined;
  };
}

/** The player with the most round wins in a session; a tie goes to whoever won last. */
function sessionWinner(rounds: GameRound[]): string | null {
  const wins = new Map<string, number>();
  let best: string | null = null;
  for (const r of rounds) {
    const n = (wins.get(r.winner) ?? 0) + 1;
    wins.set(r.winner, n);
    if (best === null || n >= (wins.get(best) ?? 0)) best = r.winner;
  }
  return best;
}

export function HighscorePage() {
  const [players, setPlayers] = useState<string[]>([]);
  const [, setSessions] = useState<GameSession[]>([]);
  const [sortTab, setSortTab] = useState<SortTab>("elo");
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Monthly system
  const [currentMonth] = useState<string>(getCurrentMonth());
  const [selectedMonth, setSelectedMonth] = useState<MonthView>(getCurrentMonth());
  const [monthList, setMonthList] = useState<string[]>([]);
  const [allMonthlySessions, setAllMonthlySessions] = useState<Record<string, GameSession[]>>({});
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [devSectionOpen, setDevSectionOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePlayer1, setComparePlayer1] = useState<string | null>(null);
  const [comparePlayer2, setComparePlayer2] = useState<string | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiCopied, setApiCopied] = useState<string | null>(null);
  const [apiPreview, setApiPreview] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Registration flow
  const [registering, setRegistering] = useState(false);
  const [regStep, setRegStep] = useState<RegStep>("select-players");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [currentRounds, setCurrentRounds] = useState<GameRound[]>([]);
  const [hasUndone, setHasUndone] = useState(false);
  const [selectedFinalists, setSelectedFinalists] = useState<string[]>([]);
  const [pendingWinner, setPendingWinner] = useState<string | null>(null);
  const [rosterOpen, setRosterOpen] = useState(false);

  // Add player dialog
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🏓");
  const [showEmojiGrid, setShowEmojiGrid] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");

  // Loading
  const [loading, setLoading] = useState(true);
  const seedCheckedRef = useRef(false);
  const [historicalStats, setHistoricalStats] = useState<HistoricalStats>({});
  const [playerCards, setPlayerCards] = useState<PlayerCards>({});
  const [tournamentHistory, setTournamentHistory] = useState<TournamentHistoryEntry[]>([]);
  const [savedAchievements, setSavedAchievements] = useState<SavedPlayerAchievements>({});
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showGraphView, setShowGraphView] = useState(false);
  const [showRankingInfoModal, setShowRankingInfoModal] = useState(false);

  const [factIndex, setFactIndex] = useState(0);
  const [confirmRemovePlayer, setConfirmRemovePlayer] = useState<string | null>(null);
  const [showLockedAchievements, setShowLockedAchievements] = useState(false);

  // Rename player
  const [renamingPlayer, setRenamingPlayer] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Elo reset timestamp (sessions before this are ignored for Elo)
  const [eloResetTimestamp, setEloResetTimestamp] = useState<number | null>(null);

  // Navigation guard — block when a round is in progress
  const { registerGuard } = useNavigationGuard();
  const roundInProgressRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    roundInProgressRef.current = registering && currentRounds.length > 0;
  }, [registering, currentRounds]);

  useEffect(() => {
    return registerGuard(() => roundInProgressRef.current);
  }, [registerGuard]);

  // Delete session confirmation
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  // Close month picker on click outside
  useEffect(() => {
    if (!monthPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setMonthPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [monthPickerOpen]);

  // Mobile detection for responsive chart sizing
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Lock background scroll when player modal is open
  useEffect(() => {
    const mainEl = document.getElementById("main-scroll-area");
    if (selectedPlayer) {
      if (mainEl) mainEl.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      if (mainEl) mainEl.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      if (mainEl) mainEl.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [selectedPlayer]);

  const loadData = useCallback(async () => {
    const thisMonth = getCurrentMonth();
    let [p, h, ml, pc, th, sa, eloResetTs] = await Promise.all([
      fetchHighscorePlayers(),
      fetchHistoricalStats(),
      fetchMonthList(),
      fetchPlayerCards(),
      fetchTournamentHistory(),
      fetchPlayerAchievements(),
      fetchEloResetTimestamp(),
    ]);
    setPlayers(p);
    setHistoricalStats(h);
    setTournamentHistory(th);
    setPlayerCards(pc);
    setSavedAchievements(sa);
    setEloResetTimestamp(eloResetTs);

    // One-time seed: clear fake sessions/archived seasons & import real historical data.
    // IMPORTANT: Only check seed status on initial load (not on subsequent polls)
    // to prevent a transient network error from triggering a re-seed that would
    // overwrite any players added after the initial seed.
    if (!seedCheckedRef.current) {
      seedCheckedRef.current = true;
    const alreadySeeded = await fetchSeedStatus();
    if (!alreadySeeded) {
      console.log("[Highscore] Seeding real data and clearing fake sessions");
      const realPlayers = [
        "Hertsö-Waddlner 💅", "Eetu", "Mr Nyberg 🚬", "Tarzan Ibrahimović",
        "Robert", "Alexjander 🐣 (retired)", "dr drä och mr hyde - Provocateur👹",
        "Lodnert", "Jawe", "🧨dirty dirty Linus", "Jonken", "OK Renen",
        "Daniel K", "Björn", "Andreas S", "Jonte", "Patrik", "Mattias",
        "Johan E", "Jerker", "Kesokungen 🏠", "JonteOH", "Susanne",
        "TESTKINGEN", "KINGTESTEN",
      ];
      const realStats: HistoricalStats = {
        "Hertsö-Waddlner 💅": { wins: 29, finals: 44, gamesPlayed: 67 },
        "Eetu": { wins: 20, finals: 25, gamesPlayed: 55 },
        "Mr Nyberg 🚬": { wins: 14, finals: 40, gamesPlayed: 81 },
        "Tarzan Ibrahimović": { wins: 7, finals: 11, gamesPlayed: 21 },
        "Robert": { wins: 3, finals: 13, gamesPlayed: 45 },
        "Alexjander 🐣 (retired)": { wins: 3, finals: 10, gamesPlayed: 49 },
        "dr drä och mr hyde - Provocateur👹": { wins: 2, finals: 6, gamesPlayed: 63 },
        "Lodnert": { wins: 1, finals: 2, gamesPlayed: 7 },
        "Jawe": { wins: 1, finals: 3, gamesPlayed: 20 },
        "🧨dirty dirty Linus": { wins: 1, finals: 1, gamesPlayed: 20 },
        "Jonken": { wins: 0, finals: 4, gamesPlayed: 73 },
        "OK Renen": { wins: 0, finals: 0, gamesPlayed: 0 },
        "Daniel K": { wins: 0, finals: 0, gamesPlayed: 0 },
        "Björn": { wins: 0, finals: 0, gamesPlayed: 0 },
        "Andreas S": { wins: 0, finals: 0, gamesPlayed: 0 },
        "Jonte": { wins: 0, finals: 2, gamesPlayed: 11 },
        "Patrik": { wins: 0, finals: 0, gamesPlayed: 0 },
        "Mattias": { wins: 0, finals: 0, gamesPlayed: 0 },
        "Johan E": { wins: 0, finals: 0, gamesPlayed: 0 },
        "Jerker": { wins: 0, finals: 0, gamesPlayed: 0 },
        "Kesokungen 🏠": { wins: 0, finals: 0, gamesPlayed: 0 },
        "JonteOH": { wins: 0, finals: 1, gamesPlayed: 20 },
        "Susanne": { wins: 0, finals: 0, gamesPlayed: 0 },
        "TESTKINGEN": { wins: 0, finals: 0, gamesPlayed: 0 },
        "KINGTESTEN": { wins: 0, finals: 0, gamesPlayed: 0 },
      };
      // NOTE: We intentionally do NOT clear monthList or monthly sessions here.
      // If a re-seed ever fires (e.g. after a backend reset clears the seed
      // flag), wiping monthList would orphan all historical months. The seed
      // is meant to set baseline players/stats only, not destroy real history.
      await Promise.all([
        saveHighscoreSessions([]),
        saveArchivedSeasons([]),
        saveHighscorePlayers(realPlayers),
        saveHistoricalStats(realStats),
      ]);
      setPlayers(realPlayers);
      setHistoricalStats(realStats);
      // Preserve any existing month/session state — do NOT reset to empty.
      await markSeeded(); // Server-side flag — prevents re-seed from other browsers
      setLoading(false);
      return;
    }
    } // end seedCheckedRef guard

    // One-time migration: reconcile emoji-prefixed player names in session data
    // with the canonical player list. E.g. session has "🎩 TESTKINGEN" but
    // canonical list has "TESTKINGEN" (seed overwrote the emoji variant).
    const EMOJI_RECONCILE_KEY = "rpk-emoji-reconcile-v2";
    if (!localStorage.getItem(EMOJI_RECONCILE_KEY)) {
      // Collect ALL unique player names from session data
      const sessionPlayerNames = new Set<string>();
      const allMonthsForReconcile = ml.length > 0 ? ml : [thisMonth];
      const reconcileSessions = await Promise.all(
        allMonthsForReconcile.map((m) => fetchMonthlySessions(m))
      );
      for (const monthSess of reconcileSessions) {
        for (const session of monthSess) {
          for (const sp of session.players) sessionPlayerNames.add(sp);
          for (const round of session.rounds) {
            for (const f of round.finalists) sessionPlayerNames.add(f);
            if (round.winner) sessionPlayerNames.add(round.winner);
          }
        }
      }

      // Build a map: stripped name → emoji-prefixed name from sessions
      const strippedToSessionName: Record<string, string> = {};
      for (const sn of sessionPlayerNames) {
        const stripped = stripEmoji(sn).trim();
        // Only record if session name differs from stripped (i.e. has emoji prefix)
        if (sn !== stripped) {
          strippedToSessionName[stripped] = sn;
        }
      }

      // Find canonical players whose stripped name matches a session emoji name
      let needsUpdate = false;
      const updatedPlayers = p.map((canonical) => {
        const emojiVersion = strippedToSessionName[canonical];
        if (emojiVersion && !p.includes(emojiVersion)) {
          console.log(`[Highscore] Reconciling player name: "${canonical}" → "${emojiVersion}" (matches session data)`);
          needsUpdate = true;
          return emojiVersion;
        }
        return canonical;
      });

      if (needsUpdate) {
        // Also transfer historical stats to the new key
        const updatedStats = { ...h };
        for (const [stripped, emojiName] of Object.entries(strippedToSessionName)) {
          if (updatedStats[stripped] && !updatedStats[emojiName]) {
            updatedStats[emojiName] = updatedStats[stripped];
            delete updatedStats[stripped];
            console.log(`[Highscore] Transferred historical stats: "${stripped}" → "${emojiName}"`);
          }
        }
        const sortedPlayers = updatedPlayers.sort((a, b) => a.localeCompare(b, "sv"));
        await Promise.all([
          saveHighscorePlayers(sortedPlayers),
          saveHistoricalStats(updatedStats),
        ]);
        setPlayers(sortedPlayers);
        setHistoricalStats(updatedStats);
        p = sortedPlayers;
        h = updatedStats;
      }

      localStorage.setItem(EMOJI_RECONCILE_KEY, "done");
    }

    // Migration: move legacy flat sessions to monthly keys (one-time)
    const MIGRATION_KEY = "rpk-monthly-migration-v1";
    const alreadyMigrated = localStorage.getItem(MIGRATION_KEY);
    if (!alreadyMigrated) {
      const legacySessions = await fetchHighscoreSessions();
      if (legacySessions.length > 0) {
        console.log("[Highscore] Migrating legacy sessions to monthly keys");
        // Group sessions by month
        const grouped: Record<string, GameSession[]> = {};
        for (const s of legacySessions) {
          const d = new Date(s.date);
          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (!grouped[m]) grouped[m] = [];
          grouped[m].push(s);
        }
        const migratedMonths = Object.keys(grouped).sort();
        await Promise.all([
          ...migratedMonths.map((m) => saveMonthlySessions(m, grouped[m])),
          saveMonthList(migratedMonths),
          saveHighscoreSessions([]), // clear legacy
        ]);
      }
      localStorage.setItem(MIGRATION_KEY, "done");
    }

    // Fetch updated month list
    const months = alreadyMigrated ? ml : await fetchMonthList();
    // Recovery: always merge in any months discovered from underlying session
    // data on the server, in case monthList is stale (e.g. wiped by a prior
    // re-seed but the session keys still exist).
    const discovered = await discoverMonths();
    console.log(
      `[Highscore] discoverMonths() found ${discovered.length} months on server:`,
      discovered,
      `| current monthList from server:`,
      months,
    );
    let recovered = false;
    for (const dm of discovered) {
      if (!months.includes(dm)) {
        months.push(dm);
        recovered = true;
      }
    }
    if (recovered) {
      console.log("[Highscore] Recovered months from session data:", discovered);
    }
    // Ensure current month + archived stat months are all in the list
    const updatedMonths = [...months];
    let monthListChanged = recovered;
    if (!updatedMonths.includes(thisMonth)) { updatedMonths.push(thisMonth); monthListChanged = true; }
    for (const am of ARCHIVED_STAT_MONTHS) {
      if (!updatedMonths.includes(am)) { updatedMonths.push(am); monthListChanged = true; }
    }
    // Ensure the historical baseline month (March 2026) is also included
    if (!updatedMonths.includes(HISTORICAL_DATA_MONTH)) { updatedMonths.push(HISTORICAL_DATA_MONTH); monthListChanged = true; }
    if (monthListChanged) {
      await saveMonthList(updatedMonths);
    }
    setMonthList(updatedMonths.sort());

    // Fetch sessions for all known months
    const allMonthsSorted = updatedMonths.sort();
    const monthSessions = await Promise.all(
      allMonthsSorted.map((m) => fetchMonthlySessions(m))
    );
    const sessionMap: Record<string, GameSession[]> = {};
    let sessionDataRepaired = false;
    allMonthsSorted.forEach((m, i) => {
      // Repair data: ensure session.players includes all finalists/winners
      sessionMap[m] = monthSessions[i].map((session) => {
        const playerSet = new Set(session.players);
        for (const round of session.rounds) {
          for (const f of round.finalists) playerSet.add(f);
          if (round.winner) playerSet.add(round.winner);
        }
        if (playerSet.size !== session.players.length) {
          console.log(`[Highscore] Repaired session ${session.id}: added missing players from rounds`, Array.from(playerSet).filter((pp) => !session.players.includes(pp)));
          sessionDataRepaired = true;
          return { ...session, players: Array.from(playerSet) };
        }
        return session;
      });
    });
    // Persist repaired sessions
    if (sessionDataRepaired) {
      console.log("[Highscore] Saving repaired session data");
      await Promise.all(
        allMonthsSorted.map((m) => saveMonthlySessions(m, sessionMap[m]))
      );
    }
    setAllMonthlySessions(sessionMap);

    // Set current view sessions
    setSessions(sessionMap[thisMonth] || []);

    setLoading(false);
  }, []);

  // Without a backend every poll answers empty and would wipe what was just added locally.
  usePolling(loadData, { enabled: !!API_BASE });

  // Determine which sessions to show based on selected month view
  const activeSessions = useMemo(() => {
    if (selectedMonth === "total") {
      // All sessions from all months
      return Object.values(allMonthlySessions).flat();
    }
    return allMonthlySessions[selectedMonth] || [];
  }, [selectedMonth, allMonthlySessions]);

  const activePlayers = players;

  // Historical stats apply to "total" view and the month the data originates from (March 2026).
  // Archived month stats apply when viewing a specific archived month (e.g. Feb 2026).
  // For "total", we aggregate ALL archived months + the KV baseline (March 2026).
  const activeHistorical: HistoricalStats = useMemo(() => {
    if (selectedMonth === "total") {
      // Merge all archived month data + KV baseline into one cumulative object
      const merged: HistoricalStats = {};
      const mergeInto = (name: string, data: { wins: number; finals: number; gamesPlayed: number; h2h?: Record<string, { wins: number; losses: number }> }) => {
        if (!merged[name]) {
          merged[name] = { wins: 0, finals: 0, gamesPlayed: 0 };
        }
        merged[name].wins += data.wins;
        merged[name].finals += data.finals;
        merged[name].gamesPlayed += data.gamesPlayed;
        if (data.h2h) {
          if (!merged[name].h2h) merged[name].h2h = {};
          for (const [opp, record] of Object.entries(data.h2h)) {
            if (!merged[name].h2h![opp]) merged[name].h2h![opp] = { wins: 0, losses: 0 };
            merged[name].h2h![opp].wins += record.wins;
            merged[name].h2h![opp].losses += record.losses;
          }
        }
      };
      // First, add all archived months
      for (const monthKey of ARCHIVED_STAT_MONTHS) {
        const monthData = ARCHIVED_MONTH_STATS[monthKey];
        for (const [name, data] of Object.entries(monthData)) {
          mergeInto(name, data);
        }
      }
      // Then add the KV baseline (March 2026 data)
      for (const [name, data] of Object.entries(historicalStats)) {
        mergeInto(name, data);
      }
      return merged;
    }
    if (selectedMonth === HISTORICAL_DATA_MONTH) {
      return historicalStats;
    }
    if (ARCHIVED_MONTH_STATS[selectedMonth]) {
      return ARCHIVED_MONTH_STATS[selectedMonth];
    }
    return {};
  }, [selectedMonth, historicalStats]);

  const isViewingCurrentMonth = selectedMonth === currentMonth;
  const isArchivedStatMonth = typeof selectedMonth === "string" && !!ARCHIVED_MONTH_STATS[selectedMonth];

  const stats = useMemo(
    () => computeStats(activeSessions, activePlayers, activeHistorical, playerCards, tournamentHistory),
    [activeSessions, activePlayers, activeHistorical, playerCards, tournamentHistory]
  );

  // Elo is always computed from ALL sessions (not filtered by month) to give a global rating
  const allSessions = useMemo(() => Object.values(allMonthlySessions).flat(), [allMonthlySessions]);
  const lastPlayedMap = useMemo(() => computeLastPlayed(allSessions), [allSessions]);
  const eloRatings = useMemo(() => {
    const raw = computeElo(allSessions, players, eloResetTimestamp);
    return applyEloDecay(raw, lastPlayedMap, eloResetTimestamp);
  }, [allSessions, players, eloResetTimestamp, lastPlayedMap]);
  const h2hElo = useMemo(() => computeH2HElo(allSessions, eloResetTimestamp), [allSessions, eloResetTimestamp]);
  const eloHistory = useMemo(() => computeEloHistory(allSessions, players, eloResetTimestamp), [allSessions, players, eloResetTimestamp]);

  // Preliminary Elo: includes unsaved rounds from the current session so that
  // finalist Elo previews are accurate within an ongoing session.
  const preliminaryEloRatings = useMemo(() => {
    if (currentRounds.length === 0) return eloRatings;
    const tempSession: GameSession = {
      id: "pending",
      date: Date.now(),
      players: selectedPlayers,
      rounds: currentRounds,
    };
    const raw = computeElo([...allSessions, tempSession], players, eloResetTimestamp);
    // Players in the current session are active right now, so no decay for them
    const updatedLastPlayed = { ...lastPlayedMap };
    for (const p of selectedPlayers) updatedLastPlayed[p] = Date.now();
    return applyEloDecay(raw, updatedLastPlayed, eloResetTimestamp);
  }, [currentRounds, selectedPlayers, allSessions, players, eloRatings, eloResetTimestamp, lastPlayedMap]);

  // Monthly Elo delta + rounds played: for month views, compute Elo at month start vs Elo at month end
  const monthlyData: { delta: Record<string, number>; rounds: Record<string, number> } | undefined = useMemo(() => {
    if (selectedMonth === "total") return undefined;
    const monthStr = selectedMonth as string;
    const [y, m] = monthStr.split("-").map(Number);
    const monthStart = new Date(y, m - 1, 1).getTime();
    const monthEnd = new Date(y, m, 1).getTime();

    const sessionsBeforeMonth = allSessions.filter(s => s.date < monthStart);
    const sessionsDuringMonth = allSessions.filter(s => s.date >= monthStart && s.date < monthEnd);
    if (sessionsDuringMonth.length === 0) return undefined;

    const eloBefore = computeElo(sessionsBeforeMonth, players, eloResetTimestamp);
    const eloAfter = computeElo([...sessionsBeforeMonth, ...sessionsDuringMonth], players, eloResetTimestamp);

    const delta: Record<string, number> = {};
    const allNames = new Set([...Object.keys(eloBefore), ...Object.keys(eloAfter)]);
    for (const name of allNames) {
      const before = eloBefore[name]?.elo ?? ELO_START;
      const after = eloAfter[name]?.elo ?? ELO_START;
      delta[name] = after - before;
    }

    // Count rounds played per player this month
    const rounds: Record<string, number> = {};
    for (const session of sessionsDuringMonth) {
      const participantSet = new Set<string>();
      for (const p of session.players || []) participantSet.add(p);
      for (const round of session.rounds) {
        for (const f of round.finalists) participantSet.add(f);
        if (round.winner) participantSet.add(round.winner);
      }
      const participants = Array.from(participantSet);
      for (const _round of session.rounds) {
        for (const p of participants) {
          rounds[p] = (rounds[p] || 0) + 1;
        }
      }
    }

    return { delta, rounds };
  }, [selectedMonth, allSessions, players, eloResetTimestamp]);

  const monthlyEloDelta = monthlyData?.delta;
  const monthlyRoundsPlayed = monthlyData?.rounds;

  const isMonthView = selectedMonth !== "total";

  const sortedStats = useMemo(() => sortStats(stats, sortTab, sortDir, eloRatings, monthlyEloDelta, monthlyRoundsPlayed), [stats, sortTab, sortDir, eloRatings, monthlyEloDelta, monthlyRoundsPlayed]);

  // Podium: the view's top three by ranking (not by the chosen sort column), grouped like the
  // table — seeded first, then unseeded, inactive last — among players who played in the view.
  const podiumPlayers = useMemo(() => {
    const ranked = sortStats(stats, "elo", "desc", eloRatings, monthlyEloDelta, monthlyRoundsPlayed)
      .filter((s) => s.gamesPlayed > 0);
    if (ranked.length < 3) return [];
    const cutoff = Date.now() - INACTIVE_WEEKS * 7 * 24 * 60 * 60 * 1000;
    const group = (s: PlayerStats) => {
      const lp = lastPlayedMap[s.name];
      if (!lp || lp < cutoff) return 2;
      return s.gamesPlayed >= SEED_MIN_ROUNDS ? 0 : 1;
    };
    return [...ranked].sort((a, b) => group(a) - group(b)).slice(0, 3);
  }, [stats, eloRatings, monthlyEloDelta, monthlyRoundsPlayed, lastPlayedMap]);

  // ── After a saved round: show the old standings for a moment, then let Elo tick and rows
  // move to their new places, with confetti for the round's winner. Purely visual. ──
  const [celebration, setCelebration] = useState<SaveCelebration | null>(null);
  const celebrationPhase = celebration?.phase ?? null;
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!celebrationPhase || registering) return;
    const timer = setTimeout(
      () => setCelebration((c) => (c && c.phase === "before" ? { ...c, phase: "after" } : null)),
      celebrationPhase === "before" ? 350 : 2000,
    );
    return () => clearTimeout(timer);
  }, [celebrationPhase, registering]);

  function exportStatsCsv() {
    const csv = buildStatsCsv(sortedStats, eloRatings, activeSessions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const label = selectedMonth === "total" ? "Totalt" : selectedMonth;
    a.download = `rundpingis-statistik-${label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Achievement sync: persist newly earned achievements ──
  const achievementSyncRef = useRef(false);
  const savedAchievementsRef = useRef(savedAchievements);
  savedAchievementsRef.current = savedAchievements;
  useEffect(() => {
    if (stats.length === 0 || Object.keys(eloRatings).length === 0) return;
    if (achievementSyncRef.current) return;
    const { updated, hasNew } = syncAchievements(stats, allSessions, eloRatings, savedAchievementsRef.current, eloResetTimestamp);
    if (hasNew) {
      setSavedAchievements(updated);
      achievementSyncRef.current = true;
      savePlayerAchievements(updated).finally(() => {
        setTimeout(() => { achievementSyncRef.current = false; }, 10000);
      });
    }

  }, [stats, eloRatings, allSessions, eloResetTimestamp]);

  // Achievement ownership counts: how many players have each achievement
  const achievementOwnerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ac of [...ALL_ACHIEVEMENTS, MYTHIC_COMPLETIONIST]) {
      counts[ac.achievement.id] = 0;
    }
    const activePlayers = stats.filter((p) => p.gamesPlayed > 0);
    for (const player of activePlayers) {
      const unlocked = computePlayerAchievements(player, allSessions, eloRatings, stats, savedAchievements, eloResetTimestamp);
      for (const a of unlocked) {
        counts[a.id] = (counts[a.id] || 0) + 1;
      }
    }
    return counts;
  }, [stats, allSessions, eloRatings, savedAchievements, eloResetTimestamp]);

  // Session attendance: how many sessions each player attended
  const sessionAttendance = useMemo(() => {
    const totalSessions = allSessions.length;
    const attendance: Record<string, { attended: number; total: number; rate: number }> = {};
    for (const player of players) {
      const stripped = stripEmoji(player);
      const attended = allSessions.filter((s) => {
        if (s.players.includes(player)) return true;
        return s.players.some((p) => stripEmoji(p) === stripped);
      }).length;
      attendance[player] = {
        attended,
        total: totalSessions,
        rate: totalSessions > 0 ? (attended / totalSessions) * 100 : 0,
      };
    }
    return attendance;
  }, [allSessions, players]);

  // Revenge data for selected player
  const revengeData = useMemo(() => {
    if (!selectedPlayer) return [];
    return computeRevengeData(selectedPlayer.name, allSessions);
  }, [selectedPlayer, allSessions]);

  // Season summary for the selected month (only for non-"total" views)
  const seasonSummary = useMemo(() => {
    if (typeof selectedMonth !== "string" || selectedMonth === "total") return null;
    const monthSessions = allMonthlySessions[selectedMonth] || [];
    if (monthSessions.length === 0) return null;
    // Gather all sessions from months before this one
    const sortedMonths = Object.keys(allMonthlySessions).sort();
    const beforeSessions: GameSession[] = [];
    for (const m of sortedMonths) {
      if (m >= selectedMonth) break;
      beforeSessions.push(...allMonthlySessions[m]);
    }
    return computeSeasonSummary(selectedMonth, monthSessions, beforeSessions, players, eloResetTimestamp);
  }, [selectedMonth, allMonthlySessions, players, eloResetTimestamp]);
  const [showSeasonSummary, setShowSeasonSummary] = useState(false);

  const recentSessions = useMemo(() => {
    return [...activeSessions].sort((a, b) => b.date - a.date);
  }, [activeSessions]);

  const visibleSessions = showAllSessions ? recentSessions : recentSessions.slice(0, 5);

  const hasSessions = activeSessions.length > 0;
  const hasPlayers = players.length > 0;
  const canStartRound = players.length >= MIN_PLAYERS_FOR_ROUND;

  // Always show all columns regardless of whether data exists
  const hasFormData = true;
  const hasStreakData = true;

  // Compute previous month stats for "most improved" fun fact
  const prevMonthStats = useMemo(() => {
    if (typeof selectedMonth !== "string" || selectedMonth === "total") return undefined;
    const [y, m] = selectedMonth.split("-").map(Number);
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const prevKey = `${prevY}-${String(prevM).padStart(2, "0")}`;
    const prevSessions = allMonthlySessions[prevKey] || [];
    const prevHistorical = ARCHIVED_MONTH_STATS[prevKey] || (prevKey === HISTORICAL_DATA_MONTH ? historicalStats : {});
    if (prevSessions.length === 0 && Object.keys(prevHistorical).length === 0) return undefined;
    return computeStats(prevSessions, activePlayers, prevHistorical, playerCards, tournamentHistory);
  }, [selectedMonth, allMonthlySessions, activePlayers, historicalStats, playerCards, tournamentHistory]);

  const funFacts = useMemo(() => generateFunFacts(stats, activeSessions, prevMonthStats), [stats, activeSessions, prevMonthStats]);

  // Auto-cycle fun facts
  useEffect(() => {
    if (funFacts.length <= 1) return;
    const timer = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % funFacts.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [funFacts.length]);

  // Hero stats
  const topPlayer = useMemo(
    () => [...stats].sort((a, b) => b.wins - a.wins)[0],
    [stats]
  );
  const hotPlayer = useMemo(
    () => [...stats].sort((a, b) => b.currentStreak - a.currentStreak)[0],
    [stats]
  );
  const coldPlayer = useMemo(
    () => [...stats].sort((a, b) => b.coldStreak - a.coldStreak)[0],
    [stats]
  );

  // Player insights (weekday/time analysis)
  const playerInsights = useMemo(() => {
    if (!selectedPlayer) return null;
    return computePlayerInsights(selectedPlayer.name, activeSessions);
  }, [selectedPlayer, activeSessions]);

  // Previous month stats for the selected player (for delta display in player card)
  const prevPlayerStats = useMemo(() => {
    if (!selectedPlayer || !prevMonthStats) return null;
    return prevMonthStats.find(
      (p) => p.name === selectedPlayer.name || stripEmoji(p.name) === stripEmoji(selectedPlayer.name)
    ) || null;
  }, [selectedPlayer, prevMonthStats]);

  // ── Add player ──
  async function handleAddPlayer() {
    const name = newPlayerName.trim();
    if (!name) return;
    setDuplicateError("");

    // Check for duplicate by comparing the plain-text part of existing names
    const nameLower = name.toLowerCase();
    const existingMatch = players.find(
      (p) => stripEmoji(p).toLowerCase() === nameLower || p.toLowerCase() === nameLower
    );
    if (existingMatch) {
      setDuplicateError(`"${existingMatch}" finns redan i listan.`);
      return;
    }

    const fullName = `${selectedEmoji} ${name}`;
    const updated = [...players, fullName].sort((a, b) => a.localeCompare(b, "sv"));
    setPlayers(updated);
    setNewPlayerName("");
    setDuplicateError("");
    setSelectedEmoji(PLAYER_EMOJIS[Math.floor(Math.random() * PLAYER_EMOJIS.length)]);
    setShowAddPlayer(false);
    setShowEmojiGrid(false);
    await saveHighscorePlayers(updated);
  }

  // ── Registration flow ──
  function startRegistration() {
    setRegistering(true);
    setRegStep("select-players");
    setSelectedPlayers([]);
    setCurrentRounds([]);
    setSelectedFinalists([]);
  }

  function togglePlayer(name: string) {
    setSelectedPlayers((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  }

  function proceedToFinalists() {
    if (selectedPlayers.length < 5) return;
    setRegStep("select-finalists");
    setSelectedFinalists([]);
  }

  function toggleFinalist(name: string) {
    setSelectedFinalists((prev) => {
      if (prev.includes(name)) return prev.filter((p) => p !== name);
      if (prev.length >= 2) return prev;
      return [...prev, name];
    });
  }

  function proceedToWinner() {
    if (selectedFinalists.length !== 2) return;
    setPendingWinner(null);
    setRegStep("select-winner");
  }

  function selectWinner(name: string) {
    const round: GameRound = {
      finalists: selectedFinalists as [string, string],
      winner: name,
      players: [...selectedPlayers],
    };
    setCurrentRounds((prev) => [...prev, round]);
    setHasUndone(false);
    setSelectedFinalists([]);
    setRegStep("select-finalists");
  }

  function undoLastRound() {
    if (currentRounds.length === 0 || hasUndone) return;
    setCurrentRounds((prev) => prev.slice(0, -1));
    setHasUndone(true);
  }

  // Auto-advance to winner step when 2 finalists selected
  useEffect(() => {
    if (regStep === "select-finalists" && selectedFinalists.length === 2) {
      proceedToWinner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regStep, selectedFinalists.length]);

  function removePlayerFromRoster(name: string) {
    setSelectedPlayers((prev) => prev.filter((p) => p !== name));
    setSelectedFinalists((prev) => prev.filter((f) => f !== name));
  }

  function addPlayerToRoster(name: string) {
    setSelectedPlayers((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }

  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [sharedSession, setSharedSession] = useState<GameSession | null>(null);

  async function saveSession() {
    if (currentRounds.length === 0 || saving) return;
    setSaving(true);
    setCelebration({
      phase: "before",
      winner: sessionWinner(currentRounds),
      before: { sortedStats, podiumPlayers, eloRatings, monthlyEloDelta, monthlyRoundsPlayed },
    });
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Include all players who appeared in any round (even if removed from roster)
    const roundPlayers = new Set<string>();
    currentRounds.forEach((r) => {
      r.finalists.forEach((f) => roundPlayers.add(f));
    });
    const allSessionPlayers = Array.from(new Set([...selectedPlayers, ...roundPlayers]));
    const session: GameSession = {
      id: sessionId,
      date: Date.now(),
      players: allSessionPlayers,
      rounds: currentRounds,
    };
    const month = currentMonth;
    const currentSessions = allMonthlySessions[month] || [];
    const updated = [session, ...currentSessions];
    setAllMonthlySessions((prev) => ({ ...prev, [month]: updated }));
    setSessions(updated);

    // Ensure month is in the list
    if (!monthList.includes(month)) {
      const newMonths = [...monthList, month].sort();
      setMonthList(newMonths);
      await saveMonthList(newMonths);
    }
    await saveMonthlySessions(month, updated);

    setRegistering(false);
    setRegStep("select-players");
    setSelectedPlayers([]);
    setCurrentRounds([]);
    setSaving(false);
    setSharedSession(session);
  }

  // ── Delete session ──
  function confirmDeleteSession(sessionId: string) {
    setDeleteSessionId(sessionId);
  }

  async function handleDeleteSession(sessionId: string) {
    // Find which month this session belongs to
    let targetMonth = selectedMonth === "total" ? null : selectedMonth;
    if (!targetMonth) {
      // In total view, find the month by looking through all months
      for (const [m, ss] of Object.entries(allMonthlySessions)) {
        if (ss.some((s) => s.id === sessionId)) {
          targetMonth = m;
          break;
        }
      }
    }
    if (!targetMonth) return;

    const monthSessions = allMonthlySessions[targetMonth] || [];
    const updated = monthSessions.filter((s) => s.id !== sessionId);
    setAllMonthlySessions((prev) => ({ ...prev, [targetMonth!]: updated }));
    await deleteMonthlySession(sessionId, targetMonth);


  }

  // ── Rename player ──
  async function handleRenamePlayer(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName || players.includes(trimmed)) return;

    // Update players list
    const updatedPlayers = players.map((p) => (p === oldName ? trimmed : p));
    setPlayers(updatedPlayers);

    // Update all monthly sessions — player lists, finalists, winners
    const updatedAllMonthly = { ...allMonthlySessions };
    for (const month of Object.keys(updatedAllMonthly)) {
      updatedAllMonthly[month] = updatedAllMonthly[month].map((session) => ({
        ...session,
        players: session.players.map((p) => (p === oldName ? trimmed : p)),
        rounds: session.rounds.map((r) => ({
          ...r,
          finalists: r.finalists.map((f) => (f === oldName ? trimmed : f)) as [string, string],
          winner: r.winner === oldName ? trimmed : r.winner,
          players: r.players?.map((p) => (p === oldName ? trimmed : p)),
        })),
      }));
    }
    setAllMonthlySessions(updatedAllMonthly);

    // Update historical stats
    if (historicalStats[oldName]) {
      const updatedHistorical = { ...historicalStats };
      updatedHistorical[trimmed] = updatedHistorical[oldName];
      delete updatedHistorical[oldName];
      setHistoricalStats(updatedHistorical);
      await saveHistoricalStats(updatedHistorical);
    }

    // Update selected player reference
    if (selectedPlayer?.name === oldName) {
      setSelectedPlayer({ ...selectedPlayer, name: trimmed });
    }

    setRenamingPlayer(false);



    // Save all monthly sessions with renamed player
    await Promise.all([
      saveHighscorePlayers(updatedPlayers),
      ...Object.entries(updatedAllMonthly).map(([m, s]) => saveMonthlySessions(m, s)),
    ]);
  }

  // ── Remove player ──
  // Uses the server-side atomic endpoint that removes the player from:
  // 1. Players list  2. Historical stats  3. Player cards  4. All monthly session data
  async function handleRemovePlayer(name: string) {
    // Optimistic UI update
    setPlayers((prev) => prev.filter((p) => p !== name));
    setSelectedPlayer(null);
    setConfirmRemovePlayer(null);

    const result = await removePlayerFromServer(name);
    if (result.ok) {
      // Apply server-confirmed state
      if (result.players) setPlayers(result.players);
      if (result.historicalStats) setHistoricalStats(result.historicalStats);
      if (result.cards) setPlayerCards(result.cards as PlayerCards);

      // Reload sessions to reflect cleaned data
      await loadData();
    } else {
      // Rollback: reload everything from server
      console.log(`[Highscore] Failed to remove player "${name}", reloading data`);
      await loadData();
    }
  }

  // ── Give card ──
  async function handleGiveCard(name: string, type: "yellow" | "red") {
    const updatedCards = { ...playerCards };
    if (!updatedCards[name]) updatedCards[name] = { yellow: 0, red: 0 };
    updatedCards[name][type]++;
    setPlayerCards(updatedCards);

    // Update selected player reference so modal refreshes
    if (selectedPlayer?.name === name) {
      setSelectedPlayer({
        ...selectedPlayer,
        yellowCards: updatedCards[name].yellow,
        redCards: updatedCards[name].red,
      });
    }

    await savePlayerCards(updatedCards);
  }

  // ── Remove card ──
  async function handleRemoveCard(name: string, type: "yellow" | "red") {
    const updatedCards = { ...playerCards };
    if (!updatedCards[name]) return;
    updatedCards[name][type] = Math.max(0, updatedCards[name][type] - 1);
    setPlayerCards(updatedCards);

    if (selectedPlayer?.name === name) {
      setSelectedPlayer({
        ...selectedPlayer,
        yellowCards: updatedCards[name].yellow,
        redCards: updatedCards[name].red,
      });
    }

    await savePlayerCards(updatedCards);
  }

  // ── Compare players ──
  const compareStats = useMemo(() => {
    if (!comparePlayer1 || !comparePlayer2) return null;
    const p1 = stats.find((s) => s.name === comparePlayer1);
    const p2 = stats.find((s) => s.name === comparePlayer2);
    if (!p1 || !p2) return null;
    const h2h = p1.h2h[comparePlayer2] || { wins: 0, losses: 0 };
    return { p1, p2, h2h };
  }, [comparePlayer1, comparePlayer2, stats]);

  // H2H weekday/time insights for the compared pair
  const h2hInsights = useMemo(() => {
    if (!comparePlayer1 || !comparePlayer2) return null;
    return computeH2HInsights(comparePlayer1, comparePlayer2, activeSessions);
  }, [comparePlayer1, comparePlayer2, activeSessions]);

  // Always show all columns regardless of whether data exists


  // All known players: sorted by most games played (descending), then alphabetically as tiebreaker.
  // We intentionally do NOT merge in session-derived stats names here, so that removed players stay removed.
  const allKnownPlayers = useMemo(() => {
    const gamesMap: Record<string, number> = {};
    stats.forEach((s) => { gamesMap[s.name] = s.gamesPlayed; });
    return [...players].sort((a, b) => {
      const diff = (gamesMap[b] ?? 0) - (gamesMap[a] ?? 0);
      return diff !== 0 ? diff : a.localeCompare(b, "sv");
    });
  }, [players, stats]);

  // ── Rendering ──

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
          />
          <span
            className="text-muted-foreground"
            style={{ fontSize: "var(--text-base)" }}
          >
            Laddar...
          </span>
        </motion.div>
      </div>
    );
  }

  // ── Registration flow ──
  if (registering) {
    return (
      <RegistrationFlow
        confirmSave={confirmSave}
        currentRounds={currentRounds}
        setConfirmSave={setConfirmSave}
        saveSession={saveSession}
        regStep={regStep}
        setRegStep={setRegStep}
        setRegistering={setRegistering}
        hasUndone={hasUndone}
        undoLastRound={undoLastRound}
        activeSessions={activeSessions}
        allKnownPlayers={allKnownPlayers}
        selectedPlayers={selectedPlayers}
        stats={stats}
        setSelectedPlayers={setSelectedPlayers}
        togglePlayer={togglePlayer}
        proceedToFinalists={proceedToFinalists}
        preliminaryEloRatings={preliminaryEloRatings}
        eloHistory={eloHistory}
        selectedFinalists={selectedFinalists}
        toggleFinalist={toggleFinalist}
        saving={saving}
        players={players}
        setRosterOpen={setRosterOpen}
        rosterOpen={rosterOpen}
        removePlayerFromRoster={removePlayerFromRoster}
        addPlayerToRoster={addPlayerToRoster}
        pendingWinner={pendingWinner}
        selectWinner={selectWinner}
        setPendingWinner={setPendingWinner}
        setSelectedFinalists={setSelectedFinalists}
      />
    );
  }

  // ── Main highscore view ──

  // Right after a save the table and podium first show the standings from before it.
  const shownBefore = celebration?.phase === "before" ? celebration.before : null;

  // Helper: toggle sort on a column header click
  function handleHeaderSort(key: SortTab) {
    if (sortTab === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortTab(key);
      setSortDir("desc");
    }
  }

  // Sort indicator arrow
  function SortArrow({ column }: { column: SortTab }) {
    if (sortTab !== column) return null;
    return (
      <span style={{ fontSize: "var(--text-xs)", marginLeft: 2 }}>
        {sortDir === "desc" ? "▼" : "▲"}
      </span>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 py-4 pb-8 md:px-4 md:py-6">
      {/* Delete session confirm dialog */}
      <ConfirmDialog
        open={deleteSessionId !== null}
        title="Ta bort speltillfälle?"
        message="Är du säker på att du vill ta bort detta speltillfälle? All statistik från rundorna i detta tillfälle kommer att försvinna permanent."
        confirmLabel="Ta bort"
        cancelLabel="Avbryt"
        variant="destructive"
        onConfirm={() => {
          if (deleteSessionId) {
            handleDeleteSession(deleteSessionId);
          }
          setDeleteSessionId(null);
        }}
        onCancel={() => setDeleteSessionId(null)}
      />

      {/* ── Month Picker ── */}
      <MonthPicker
        monthList={monthList}
        currentMonth={currentMonth}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        setMonthPickerOpen={setMonthPickerOpen}
        monthPickerRef={monthPickerRef}
        monthPickerOpen={monthPickerOpen}
      />

      {/* ── Hero Stats (or one empty state while there are no players) ── */}
      {!hasPlayers ? (
        <HighscoreEmptyState onAddPlayer={() => setShowAddPlayer(true)} />
      ) : (
      <HeroStats
        topPlayer={topPlayer}
        hasStreakData={hasStreakData}
        hotPlayer={hotPlayer}
        coldPlayer={coldPlayer}
        funFacts={funFacts}
        factIndex={factIndex}
        setFactIndex={setFactIndex}
      />
      )}

      {/* ── Title Row ── */}
      {hasPlayers && (
      <TitleRow
        selectedMonth={selectedMonth}
        currentMonth={currentMonth}
        setShowRankingInfoModal={setShowRankingInfoModal}
        setShowGraphView={setShowGraphView}
        showGraphView={showGraphView}
        hasSessions={hasSessions}
        stats={stats}
        setCompareMode={setCompareMode}
        compareMode={compareMode}
        setComparePlayer1={setComparePlayer1}
        setComparePlayer2={setComparePlayer2}
        isViewingCurrentMonth={isViewingCurrentMonth}
        startRegistration={startRegistration}
        canStartRound={canStartRound}
        playerCount={players.length}
        onAddPlayer={() => setShowAddPlayer(true)}
      />
      )}

      {/* ── Compare Mode ── */}
      <CompareView
        compareMode={compareMode}
        comparePlayer1={comparePlayer1}
        setComparePlayer1={setComparePlayer1}
        activePlayers={activePlayers}
        comparePlayer2={comparePlayer2}
        setComparePlayer2={setComparePlayer2}
        compareStats={compareStats}
        eloRatings={eloRatings}
        h2hElo={h2hElo}
        h2hInsights={h2hInsights}
      />

      <div className="flex flex-col">

      {/* ── Season Summary Card ── */}
      <SeasonSummaryCard
        seasonSummary={seasonSummary}
        selectedMonth={selectedMonth}
        isViewingCurrentMonth={isViewingCurrentMonth}
        setShowSeasonSummary={setShowSeasonSummary}
        showSeasonSummary={showSeasonSummary}
      />

      {/* ── Podium: top three of the view ── */}
      {hasPlayers && (
        <Podium
          top={shownBefore?.podiumPlayers ?? podiumPlayers}
          eloRatings={shownBefore?.eloRatings ?? eloRatings}
          isMonthView={isMonthView}
          monthlyEloDelta={shownBefore ? shownBefore.monthlyEloDelta : monthlyEloDelta}
          monthlyRoundsPlayed={shownBefore ? shownBefore.monthlyRoundsPlayed : monthlyRoundsPlayed}
          onSelect={(p) => { setDevSectionOpen(false); setSelectedPlayer(p); }}
          animateChanges={celebration !== null}
        />
      )}

      {/* ── Table (always visible when there are players, below deep dive when active) ── */}
      {hasPlayers && (
      <LeaderboardTable
        sortedStats={shownBefore?.sortedStats ?? sortedStats}
        hasFormData={hasFormData}
        handleHeaderSort={handleHeaderSort}
        sortTab={sortTab}
        isMonthView={isMonthView}
        SortArrow={SortArrow}
        lastPlayedMap={lastPlayedMap}
        setDevSectionOpen={setDevSectionOpen}
        setSelectedPlayer={setSelectedPlayer}
        selectedPlayer={selectedPlayer}
        eloRatings={shownBefore?.eloRatings ?? eloRatings}
        monthlyEloDelta={shownBefore ? shownBefore.monthlyEloDelta : monthlyEloDelta}
        monthlyRoundsPlayed={shownBefore ? shownBefore.monthlyRoundsPlayed : monthlyRoundsPlayed}
        eloHistory={eloHistory}
        hasStreakData={hasStreakData}
        animateChanges={celebration !== null}
        layoutKey={celebrationPhase ?? "idle"}
        highlightPlayer={celebrationPhase === "after" ? celebration?.winner ?? null : null}
      />
      )}
      <ChampionConfetti active={celebrationPhase === "after" && !reduceMotion} duration={2000} />

      {/* ── Action row: Add player + Export CSV + API ── */}
      {hasPlayers && (
      <ActionRow
        sortedStats={sortedStats}
        isViewingCurrentMonth={isViewingCurrentMonth}
        setShowAddPlayer={setShowAddPlayer}
        setShowApiModal={setShowApiModal}
        exportStatsCsv={exportStatsCsv}
        selectedMonth={selectedMonth}
      />
      )}

      {/* ── API Info Modal ── */}
      <ApiInfoModal
        showApiModal={showApiModal}
        setApiCopied={setApiCopied}
        setShowApiModal={setShowApiModal}
        apiCopied={apiCopied}
        setApiLoading={setApiLoading}
        setApiPreview={setApiPreview}
        apiLoading={apiLoading}
        apiPreview={apiPreview}
      />

      {/* ── Ranking Info Modal ── */}
      <RankingInfoModal
        showRankingInfoModal={showRankingInfoModal}
        setShowRankingInfoModal={setShowRankingInfoModal}
      />

      {/* ── Deep Dive view (shown above table) ── */}
      <DeepDiveView
        showGraphView={showGraphView}
        sortedStats={sortedStats}
        eloRatings={eloRatings}
        isMobile={isMobile}
        stats={stats}
        activeSessions={activeSessions}
      />
      </div>{/* end flex col wrapper */}

      {/* ── Player Profile Modal ── */}
      <PlayerProfileModal
        selectedPlayer={selectedPlayer}
        setSelectedPlayer={setSelectedPlayer}
        isMobile={isMobile}
        setRenamingPlayer={setRenamingPlayer}
        renamingPlayer={renamingPlayer}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        handleRenamePlayer={handleRenamePlayer}
        isViewingCurrentMonth={isViewingCurrentMonth}
        eloRatings={eloRatings}
        isMonthView={isMonthView}
        monthlyEloDelta={monthlyEloDelta}
        hasFormData={hasFormData}
        hasStreakData={hasStreakData}
        prevPlayerStats={prevPlayerStats}
        sessionAttendance={sessionAttendance}
        selectedMonth={selectedMonth}
        setDevSectionOpen={setDevSectionOpen}
        devSectionOpen={devSectionOpen}
        stats={stats}
        monthlyRoundsPlayed={monthlyRoundsPlayed}
        eloHistory={eloHistory}
        handleRemoveCard={handleRemoveCard}
        handleGiveCard={handleGiveCard}
        playerInsights={playerInsights}
        revengeData={revengeData}
        h2hElo={h2hElo}
        allSessions={allSessions}
        savedAchievements={savedAchievements}
        eloResetTimestamp={eloResetTimestamp}
        achievementOwnerCounts={achievementOwnerCounts}
        showLockedAchievements={showLockedAchievements}
        setShowLockedAchievements={setShowLockedAchievements}
        confirmRemovePlayer={confirmRemovePlayer}
        handleRemovePlayer={handleRemovePlayer}
        setConfirmRemovePlayer={setConfirmRemovePlayer}
      />

      {/* Add player trigger moved to action row above */}

      {/* ── Add player modal ── */}
      <AddPlayerModal
        showAddPlayer={showAddPlayer}
        setShowAddPlayer={setShowAddPlayer}
        setNewPlayerName={setNewPlayerName}
        setShowEmojiGrid={setShowEmojiGrid}
        setDuplicateError={setDuplicateError}
        showEmojiGrid={showEmojiGrid}
        selectedEmoji={selectedEmoji}
        setSelectedEmoji={setSelectedEmoji}
        newPlayerName={newPlayerName}
        handleAddPlayer={handleAddPlayer}
        duplicateError={duplicateError}
      />



      {/* ── Archived month info banner ── */}
      {isArchivedStatMonth && (
        <div
          className="mt-4 md:mt-6 flex items-start gap-3 px-4 py-3 rounded-lg border border-border"
          style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)" }}
        >
          <Archive className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <span className="text-foreground block" style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" }}>
              Arkiverad statistik
            </span>
            <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}>
              Den här månaden har sammanställd statistik — inga detaljerade speltillfällen.
            </span>
          </div>
        </div>
      )}

      {/* ── Recent Sessions — only shown when there are sessions ── */}
      <RecentSessions
        hasSessions={hasSessions}
        selectedMonth={selectedMonth}
        currentMonth={currentMonth}
        visibleSessions={visibleSessions}
        expandedSession={expandedSession}
        setExpandedSession={setExpandedSession}
        confirmDeleteSession={confirmDeleteSession}
        recentSessions={recentSessions}
        setShowAllSessions={setShowAllSessions}
        showAllSessions={showAllSessions}
      />
      {/* ── Dela resultat: offered after a session is saved ── */}
      <ShareResultPrompt
        session={sharedSession}
        allSessions={allSessions}
        players={players}
        eloResetTimestamp={eloResetTimestamp}
        onDismiss={() => setSharedSession(null)}
      />
      {/* ── Mobile FAB: Ny omgång, or Lägg till spelare until there are enough players ── */}
      {isViewingCurrentMonth && hasPlayers && (
        <button
          onClick={canStartRound ? startRegistration : () => setShowAddPlayer(true)}
          className="md:hidden fixed right-4 bottom-20 z-40 flex items-center gap-2 px-5 h-14 rounded-full transition-all cursor-pointer active:scale-95"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)",
            fontFamily: FONT,
            fontSize: "var(--text-label)",
            fontWeight: "var(--font-weight-semibold)",
          }}
        >
          {canStartRound ? <Plus className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
          {canStartRound ? "Ny omgång" : "Lägg till spelare"}
        </button>
      )}

    </div>
  );
}
