import { Info, BarChart3, Swords, Plus, UserPlus, Trophy } from "lucide-react";
import { formatMonthLabel } from "../../lib/dates";
import type { PlayerStats } from "../../lib/stats";
import { MIN_PLAYERS_FOR_ROUND } from "./constants";

interface TitleRowProps {
  selectedMonth: string;
  currentMonth: string;
  setShowRankingInfoModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowGraphView: React.Dispatch<React.SetStateAction<boolean>>;
  showGraphView: boolean;
  hasSessions: boolean;
  stats: PlayerStats[];
  setCompareMode: React.Dispatch<React.SetStateAction<boolean>>;
  compareMode: boolean;
  setComparePlayer1: React.Dispatch<React.SetStateAction<string | null>>;
  setComparePlayer2: React.Dispatch<React.SetStateAction<string | null>>;
  isViewingCurrentMonth: boolean;
  startRegistration: () => void;
  canStartRound: boolean;
  playerCount: number;
  onAddPlayer: () => void;
}

export function TitleRow({
  selectedMonth,
  currentMonth,
  setShowRankingInfoModal,
  setShowGraphView,
  showGraphView,
  hasSessions,
  stats,
  setCompareMode,
  compareMode,
  setComparePlayer1,
  setComparePlayer2,
  isViewingCurrentMonth,
  startRegistration,
  canStartRound,
  playerCount,
  onAddPlayer,
}: TitleRowProps) {
  return (
    <>
      <div className="flex flex-col gap-3 mb-5 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h2
            className="text-foreground flex items-center gap-2 flex-wrap"
            style={{
              fontSize: "var(--text-h3)",
              fontWeight: "var(--font-weight-semibold)",
            }}
          >
            <Trophy className="w-6 h-6 shrink-0" style={{ color: "var(--primary)" }} aria-hidden />
            Rankning
            {selectedMonth !== currentMonth && (
              <span
                className="text-muted-foreground"
                style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-normal)" }}
              >
                {selectedMonth === "total" ? "— Totalt" : `— ${formatMonthLabel(selectedMonth)}`}
              </span>
            )}
          </h2>
          <button
            onClick={() => setShowRankingInfoModal(true)}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all cursor-pointer"
            title="Hur fungerar rankningen?"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Fördjupning toggle */}
          <button
            onClick={() => setShowGraphView(!showGraphView)}
            className={`flex items-center gap-1.5 px-3 py-2 md:py-1.5 rounded-lg border transition-all cursor-pointer ${
              showGraphView
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border-strong"
            }`}
            style={{
              fontSize: "var(--text-label)",
              fontWeight: showGraphView ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <BarChart3 className="w-4 h-4 md:w-3.5 md:h-3.5" />
            Fördjupning
          </button>

          {/* Compare button — available when there are sessions or historical h2h data */}
          {(hasSessions || stats.some(s => Object.keys(s.h2h).length > 0)) && (
            <button
              onClick={() => {
                setCompareMode(!compareMode);
                setComparePlayer1(null);
                setComparePlayer2(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 md:py-1.5 rounded-lg border transition-all cursor-pointer ${
                compareMode ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
              style={{
                fontSize: "var(--text-label)",
                borderRadius: "var(--radius-card)",
              }}
            >
              <Swords className="w-4 h-4 md:w-3.5 md:h-3.5" />
              Inbördes
            </button>
          )}

          {/* Until there are enough players, adding players is the primary action (desktop; mobile uses the FAB) */}
          {isViewingCurrentMonth && !canStartRound && (
            <button
              onClick={onAddPlayer}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer hover:opacity-90"
              style={{
                fontSize: "var(--text-label)",
                fontWeight: "var(--font-weight-semibold)",
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                borderRadius: "var(--radius-card)",
              }}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Lägg till spelare
            </button>
          )}

          {/* Ny omgång — only when viewing current month (desktop only in title row) */}
          {isViewingCurrentMonth && (
            <button
              onClick={startRegistration}
              disabled={!canStartRound}
              title={canStartRound ? undefined : `Minst ${MIN_PLAYERS_FOR_ROUND} spelare behövs`}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed"
              style={{
                fontSize: "var(--text-label)",
                fontWeight: "var(--font-weight-semibold)",
                background: canStartRound ? "var(--primary)" : "var(--surface-container-high)",
                color: canStartRound ? "var(--primary-foreground)" : "var(--muted-foreground)",
                border: canStartRound ? "none" : "1px solid var(--border)",
                borderRadius: "var(--radius-card)",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Ny omgång
            </button>
          )}
        </div>
      </div>
      {isViewingCurrentMonth && !canStartRound && (
        <p
          className="flex items-center gap-1.5 -mt-3 mb-5 md:mb-6 text-muted-foreground"
          style={{ fontSize: "var(--text-sm)" }}
        >
          <Info className="w-3.5 h-3.5 shrink-0" />
          Minst {MIN_PLAYERS_FOR_ROUND} spelare behövs för att registrera en omgång – {playerCount} av {MIN_PLAYERS_FOR_ROUND} tillagda.
        </p>
      )}
    </>
  );
}
