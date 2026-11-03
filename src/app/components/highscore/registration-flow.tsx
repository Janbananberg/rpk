import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Undo2, Users, Swords, Trophy, Check, ChevronDown, X, Plus, TrendingUp } from "lucide-react";
import type { PlayerStats } from "../../lib/stats";
import { computePotDistribution, ELO_ANTE, ELO_UPSET_THRESHOLD } from "../../lib/elo";
import type { EloEntry } from "../../lib/elo";
import { ConfirmDialog } from "../confirm-dialog";
import type { GameRound, GameSession } from "../api";
import { FONT } from "./constants";
import type { RegStep } from "./constants";
import { PlayerSelectStep } from "./player-select-step";

interface RegistrationFlowProps {
  confirmSave: boolean;
  currentRounds: GameRound[];
  setConfirmSave: React.Dispatch<React.SetStateAction<boolean>>;
  saveSession: () => Promise<void>;
  regStep: RegStep;
  setRegStep: React.Dispatch<React.SetStateAction<RegStep>>;
  setRegistering: React.Dispatch<React.SetStateAction<boolean>>;
  hasUndone: boolean;
  undoLastRound: () => void;
  activeSessions: GameSession[];
  allKnownPlayers: string[];
  selectedPlayers: string[];
  stats: PlayerStats[];
  setSelectedPlayers: React.Dispatch<React.SetStateAction<string[]>>;
  togglePlayer: (name: string) => void;
  proceedToFinalists: () => void;
  preliminaryEloRatings: Record<string, EloEntry>;
  eloHistory: Record<string, number[]>;
  selectedFinalists: string[];
  toggleFinalist: (name: string) => void;
  saving: boolean;
  players: string[];
  setRosterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rosterOpen: boolean;
  removePlayerFromRoster: (name: string) => void;
  addPlayerToRoster: (name: string) => void;
  pendingWinner: string | null;
  selectWinner: (name: string) => void;
  setPendingWinner: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedFinalists: React.Dispatch<React.SetStateAction<string[]>>;
}

export function RegistrationFlow({
  confirmSave,
  currentRounds,
  setConfirmSave,
  saveSession,
  regStep,
  setRegStep,
  setRegistering,
  hasUndone,
  undoLastRound,
  activeSessions,
  allKnownPlayers,
  selectedPlayers,
  stats,
  setSelectedPlayers,
  togglePlayer,
  proceedToFinalists,
  preliminaryEloRatings,
  eloHistory,
  selectedFinalists,
  toggleFinalist,
  saving,
  players,
  setRosterOpen,
  rosterOpen,
  removePlayerFromRoster,
  addPlayerToRoster,
  pendingWinner,
  selectWinner,
  setPendingWinner,
  setSelectedFinalists,
}: RegistrationFlowProps) {
  return (
    <>
      <div className="max-w-2xl mx-auto px-3 py-4 md:px-4 md:py-6">
        {/* Save session confirm dialog */}
        <ConfirmDialog
          open={confirmSave}
          title="Spara speltillfälle?"
          message={`Vill du spara detta speltillfälle med ${currentRounds.length} ${currentRounds.length === 1 ? "runda" : "rundor"}? Statistik och Elo-ratings uppdateras.`}
          confirmLabel="Spara"
          cancelLabel="Avbryt"
          variant="warning"
          onConfirm={() => {
            setConfirmSave(false);
            saveSession();
          }}
          onCancel={() => setConfirmSave(false)}
        />
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => {
                if (regStep === "select-finalists" && currentRounds.length === 0) {
                  setRegStep("select-players");
                } else if (regStep === "select-winner") {
                  setRegStep("select-finalists");
                } else {
                  setRegistering(false);
                }
              }}
              className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-foreground cursor-pointer"
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span
              className="text-foreground"
              style={{
                fontSize: "var(--text-base)",
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              Registrera speltillfälle
            </span>
            {/* Step indicator */}
            <div className="ml-auto flex items-center gap-1.5">
              {["select-players", "select-finalists", "select-winner"].map((step, i, arr) => (
                <div
                  key={step}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: regStep === step ? 24 : 8,
                    background:
                      regStep === step
                        ? "var(--primary)"
                        : i <= arr.indexOf(regStep)
                        ? "var(--primary)"
                        : "var(--border)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Live round counter */}
          {currentRounds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4 rounded-lg border border-primary/20 p-3"
              style={{ background: "color-mix(in srgb, var(--primary) 10%, var(--surface-container))", borderRadius: "var(--radius-card)" }}
            >
              <div
                className="flex items-center justify-between"
              >
                <span
                  style={{
                    fontSize: "var(--text-label)",
                    color: "var(--primary)",
                    fontWeight: "var(--font-weight-semibold)",
                    fontFamily: FONT,
                  }}
                >
                  {currentRounds.length} {currentRounds.length === 1 ? "runda" : "rundor"} registrerade
                </span>
                <motion.button
                  whileTap={hasUndone ? undefined : { scale: 0.9 }}
                  onClick={undoLastRound}
                  disabled={hasUndone}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: hasUndone ? "var(--muted-foreground)" : "var(--warning, #f59e0b)",
                    borderColor: hasUndone ? "var(--border)" : "color-mix(in srgb, var(--warning, #f59e0b) 30%, transparent)",
                    background: hasUndone ? "transparent" : "color-mix(in srgb, var(--warning, #f59e0b) 8%, transparent)",
                    borderRadius: "var(--radius-button)",
                    opacity: hasUndone ? 0.5 : 1,
                    cursor: hasUndone ? "not-allowed" : "pointer",
                  }}
                  title={hasUndone ? "Redan ångrad" : "Ångra senaste finalen"}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Ångra senaste finalen
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 1: Select players */}
          {regStep === "select-players" && (() => {
            const lastSession = activeSessions[0];
            const lastPlayers = lastSession?.players ?? [];
            const allSelected = allKnownPlayers.length > 0 && allKnownPlayers.every((p) => selectedPlayers.includes(p));
            const statsMap: Record<string, PlayerStats | undefined> = {};
            stats.forEach((s) => { statsMap[s.name] = s; });
            return (
              <PlayerSelectStep
                allKnownPlayers={allKnownPlayers}
                selectedPlayers={selectedPlayers}
                setSelectedPlayers={setSelectedPlayers}
                togglePlayer={togglePlayer}
                proceedToFinalists={proceedToFinalists}
                allSelected={allSelected}
                lastPlayers={lastPlayers}
                statsMap={statsMap}
                eloRatings={preliminaryEloRatings}
                eloHistory={eloHistory}
              />
            );
          })()}

          {/* Step 2: Select finalists */}
          {regStep === "select-finalists" && (
            <div>
              <h3
                className="text-foreground mb-1 text-center"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-h4)",
                  fontWeight: "var(--font-weight-semibold)",
                }}
              >
                Välj två finalister
              </h3>
              <p
                className="text-muted-foreground text-center mb-6"
                style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
              >
                Runda {currentRounds.length + 1}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {selectedPlayers.map((name) => {
                  const isFinalist = selectedFinalists.includes(name);
                  const roundsWon = currentRounds.filter((r) => r.winner === name).length;
                  const roundsFinal = currentRounds.filter((r) =>
                    r.finalists.includes(name)
                  ).length;
                  const roundsPlayed = currentRounds.filter((r) =>
                    (r.players ?? selectedPlayers).includes(name)
                  ).length;
                  const isNew = currentRounds.length > 0 && roundsPlayed === 0;
                  return (
                    <motion.button
                      key={name}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleFinalist(name)}
                      className={`flex flex-col items-center gap-1 px-4 py-4 rounded-lg border transition-all cursor-pointer ${
                        isFinalist
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-border-strong"
                      }`}
                      style={{
                        background: isFinalist ? undefined : "var(--surface-container)",
                        borderRadius: "var(--radius-card)",
                      }}
                    >
                      <span
                        className="text-foreground"
                        style={{ fontFamily: FONT, fontSize: "var(--text-base)" }}
                      >
                        {name}
                      </span>
                      {currentRounds.length > 0 ? (
                        <span
                          className="flex items-center gap-2 text-muted-foreground"
                          style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}
                        >
                          <span className="flex items-center gap-0.5">
                            <Users className="w-3 h-3" />
                            {roundsPlayed}/{currentRounds.length}
                          </span>
                          {roundsFinal > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Swords className="w-3 h-3" />
                              {roundsFinal}F
                            </span>
                          )}
                          {roundsWon > 0 && (
                            <span className="flex items-center gap-0.5 text-success">
                              <Trophy className="w-3 h-3" />
                              {roundsWon}W
                            </span>
                          )}
                          {isNew && (
                            <span
                              className="px-1.5 py-0.5 rounded"
                              style={{
                                fontSize: "var(--text-xs)",
                                background: "color-mix(in srgb, var(--primary) 15%, transparent)",
                                color: "var(--primary)",
                                borderRadius: "var(--radius-badge, 4px)",
                                fontWeight: "var(--font-weight-semibold)",
                              }}
                            >
                              Ny
                            </span>
                          )}
                        </span>
                      ) : (
                        <span
                          className="text-muted-foreground flex items-center gap-1"
                          style={{ fontSize: "var(--text-sm)" }}
                        >
                          <Trophy className="w-3 h-3" />
                          Redo
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Action buttons — above roster management */}
              <div className="mt-5 flex flex-col gap-3">
                {currentRounds.length > 0 && (
                  <button
                    onClick={() => setConfirmSave(true)}
                    disabled={saving}
                    className="w-full py-3.5 rounded-lg border border-success/30 transition-all cursor-pointer hover:bg-success/10 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    style={{
                      fontFamily: FONT,
                      fontSize: "var(--text-base)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--success)",
                      background: "var(--surface-container)",
                      borderRadius: "var(--radius-card)",
                    }}
                  >
                    <Check className="w-4 h-4 inline mr-2" />
                    {saving ? "Sparar..." : `Spara (${currentRounds.length} rundor)`}
                  </button>
                )}
              </div>

              {/* Roster management panel */}
              {(() => {
                const availableToAdd = players.filter((p) => !selectedPlayers.includes(p));
                const removedPlayers = Array.from(
                  new Set(
                    currentRounds.flatMap((r) => r.finalists).filter((f) => !selectedPlayers.includes(f))
                  )
                );
                return (
                  <div className="mt-5">
                    <button
                      onClick={() => setRosterOpen((o) => !o)}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg border transition-all cursor-pointer active:scale-[0.98]"
                      style={{
                        background: rosterOpen ? "var(--surface-container-high)" : "var(--surface-container)",
                        borderColor: rosterOpen ? "var(--border-strong, var(--border))" : "var(--border)",
                        borderRadius: "var(--radius-card)",
                        fontFamily: FONT,
                        fontSize: "var(--text-base)",
                      }}
                    >
                      <span className="flex items-center gap-2.5 text-foreground">
                        <Users className="w-5 h-5 text-muted-foreground" />
                        <span style={{ fontWeight: "var(--font-weight-semibold)" }}>
                          Hantera spelare
                        </span>
                        <span
                          className="text-muted-foreground"
                          style={{ fontSize: "var(--text-label)" }}
                        >
                          ({selectedPlayers.length})
                        </span>
                        {removedPlayers.length > 0 && (
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{
                              background: "color-mix(in srgb, var(--warning, #f59e0b) 15%, transparent)",
                              color: "var(--warning, #f59e0b)",
                              fontFamily: FONT,
                              fontSize: "var(--text-xs)",
                              fontWeight: "var(--font-weight-semibold)",
                            }}
                          >
                            {removedPlayers.length} borttagna
                          </span>
                        )}
                      </span>
                      <motion.div
                        animate={{ rotate: rosterOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {rosterOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="mt-2 rounded-lg border border-border overflow-hidden"
                            style={{
                              background: "var(--surface-container-low, var(--surface-container))",
                              borderRadius: "var(--radius-card)",
                            }}
                          >
                            {/* Active players list */}
                            <div className="px-4 pt-3 pb-1">
                              <p
                                className="text-muted-foreground"
                                style={{
                                  fontFamily: FONT,
                                  fontSize: "var(--text-xs)",
                                  fontWeight: "var(--font-weight-semibold)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                Aktiva spelare
                              </p>
                            </div>
                            <div>
                              {selectedPlayers.map((name) => {
                                const rp = currentRounds.filter((r) => (r.players ?? selectedPlayers).includes(name)).length;
                                return (
                                  <div
                                    key={name}
                                    className="flex items-center justify-between px-4 py-3 border-t border-border/50 transition-colors"
                                    style={{ minHeight: 52 }}
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <span
                                        className="text-foreground truncate"
                                        style={{
                                          fontFamily: FONT,
                                          fontSize: "var(--text-base)",
                                          fontWeight: "var(--font-weight-normal)",
                                        }}
                                      >
                                        {name}
                                      </span>
                                      {currentRounds.length > 0 && (
                                        <span
                                          className="text-muted-foreground shrink-0"
                                          style={{
                                            fontFamily: FONT,
                                            fontSize: "var(--text-xs)",
                                          }}
                                        >
                                          {rp}/{currentRounds.length} rundor
                                        </span>
                                      )}
                                    </div>
                                    {selectedPlayers.length > 5 && (
                                      <button
                                        onClick={() => removePlayerFromRoster(name)}
                                        className="shrink-0 flex items-center justify-center w-10 h-10 -mr-1 rounded-lg transition-colors cursor-pointer active:scale-95"
                                        style={{
                                          background: "transparent",
                                          borderRadius: "var(--radius-card)",
                                        }}
                                        title={`Ta bort ${name}`}
                                      >
                                        <X className="w-5 h-5 text-muted-foreground hover:text-destructive transition-colors" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Removed players */}
                            {removedPlayers.length > 0 && (
                              <>
                                <div className="px-4 pt-4 pb-1">
                                  <p
                                    className="text-muted-foreground"
                                    style={{
                                      fontFamily: FONT,
                                      fontSize: "var(--text-xs)",
                                      fontWeight: "var(--font-weight-semibold)",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                    }}
                                  >
                                    Borttagna (statistik sparas)
                                  </p>
                                </div>
                                <div>
                                  {removedPlayers.map((name) => (
                                    <div
                                      key={name}
                                      className="flex items-center justify-between px-4 py-3 border-t transition-colors"
                                      style={{
                                        minHeight: 52,
                                        borderColor: "color-mix(in srgb, var(--warning, #f59e0b) 20%, var(--border))",
                                        background: "color-mix(in srgb, var(--warning, #f59e0b) 4%, transparent)",
                                      }}
                                    >
                                      <span
                                        className="text-muted-foreground line-through"
                                        style={{
                                          fontFamily: FONT,
                                          fontSize: "var(--text-base)",
                                        }}
                                      >
                                        {name}
                                      </span>
                                      <button
                                        onClick={() => addPlayerToRoster(name)}
                                        className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-lg border transition-all cursor-pointer active:scale-95"
                                        style={{
                                          fontFamily: FONT,
                                          fontSize: "var(--text-label)",
                                          fontWeight: "var(--font-weight-semibold)",
                                          color: "var(--primary)",
                                          borderColor: "color-mix(in srgb, var(--primary) 30%, var(--border))",
                                          background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                                          borderRadius: "var(--radius-card)",
                                        }}
                                        title={`Lägg till ${name} igen`}
                                      >
                                        <Plus className="w-4 h-4" />
                                        <span className="hidden sm:inline">Lägg till</span>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}

                            {/* Add from player list */}
                            {availableToAdd.length > 0 && (
                              <>
                                <div className="px-4 pt-4 pb-1">
                                  <p
                                    className="text-muted-foreground"
                                    style={{
                                      fontFamily: FONT,
                                      fontSize: "var(--text-xs)",
                                      fontWeight: "var(--font-weight-semibold)",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                    }}
                                  >
                                    Lägg till spelare
                                  </p>
                                </div>
                                <div>
                                  {availableToAdd.map((name) => (
                                    <button
                                      key={name}
                                      onClick={() => addPlayerToRoster(name)}
                                      className="w-full flex items-center gap-3 px-4 py-3 border-t border-border/50 transition-all cursor-pointer active:scale-[0.98]"
                                      style={{
                                        minHeight: 52,
                                        background: "transparent",
                                      }}
                                    >
                                      <div
                                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                                        style={{
                                          background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                                          borderRadius: "var(--radius-full, 9999px)",
                                        }}
                                      >
                                        <Plus className="w-4 h-4 text-primary" />
                                      </div>
                                      <span
                                        className="text-foreground"
                                        style={{
                                          fontFamily: FONT,
                                          fontSize: "var(--text-base)",
                                        }}
                                      >
                                        {name}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}

              {/* buttons moved above roster panel */}
            </div>
          )}

          {/* Step 3: Select winner */}
          {regStep === "select-winner" && (
            <div>
              <h3
                className="text-foreground mb-2 text-center"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-h4)",
                  fontWeight: "var(--font-weight-semibold)",
                }}
              >
                Vem vann?
              </h3>
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
                  {selectedFinalists[0]}
                </span>
                <span className="text-muted-foreground" style={{ fontSize: "var(--text-label)" }}>vs</span>
                <span className="text-muted-foreground" style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}>
                  {selectedFinalists[1]}
                </span>
              </div>

              {/* Elo preview — what's at stake */}
              {(() => {
                const p1 = selectedFinalists[0];
                const p2 = selectedFinalists[1];
                const p1Elo = preliminaryEloRatings[p1]?.elo ?? 1000;
                const p2Elo = preliminaryEloRatings[p2]?.elo ?? 1000;
                const N = selectedPlayers.length || 2;
                const p1Wins = computePotDistribution(p1Elo, p2Elo, N);
                const p2Wins = computePotDistribution(p2Elo, p1Elo, N);
                const pot = N * ELO_ANTE;
                const eloDiff = Math.abs(p1Elo - p2Elo);
                const underdog = p1Elo < p2Elo ? p1 : p2;
                const favorite = p1Elo < p2Elo ? p2 : p1;
                const underdogWinDelta = p1Elo < p2Elo ? p1Wins.winnerDelta : p2Wins.winnerDelta;
                const favoriteWinDelta = p1Elo < p2Elo ? p2Wins.winnerDelta : p1Wins.winnerDelta;
                const isUpsetScenario = eloDiff >= ELO_UPSET_THRESHOLD;
                return (
                  <div
                    className="mb-5 px-3 py-2.5 rounded-lg border border-border/30"
                    style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)", fontFamily: FONT }}
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
                        Elo-insats
                      </span>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--foreground)", fontWeight: "var(--font-weight-bold)" }}>
                        Pott {pot}
                      </span>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                        ({N} × {ELO_ANTE})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg" style={{ background: "var(--surface-container-high)", borderRadius: "var(--radius-button)" }}>
                        <span className="truncate max-w-full" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)" }}>
                          {p1} ({Math.round(p1Elo)})
                        </span>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontWeight: "var(--font-weight-bold)" }}>
                            Vinst +{p1Wins.winnerDelta}
                          </span>
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>|</span>
                          <span style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontWeight: "var(--font-weight-bold)" }}>
                            Förl +{p2Wins.loserDelta}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg" style={{ background: "var(--surface-container-high)", borderRadius: "var(--radius-button)" }}>
                        <span className="truncate max-w-full" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)" }}>
                          {p2} ({Math.round(p2Elo)})
                        </span>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontWeight: "var(--font-weight-bold)" }}>
                            Vinst +{p2Wins.winnerDelta}
                          </span>
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>|</span>
                          <span style={{ fontSize: "var(--text-sm)", color: "var(--success)", fontWeight: "var(--font-weight-bold)" }}>
                            Förl +{p1Wins.loserDelta}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-1.5 text-center">
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                        Övriga: <span style={{ color: "var(--destructive)", fontWeight: "var(--font-weight-bold)" }}>-{ELO_ANTE}</span>
                      </span>
                    </div>

                    {/* Upset indicator */}
                    {isUpsetScenario && (
                      <div
                        className="mt-2.5 flex items-center gap-2 px-3 py-2 rounded-lg border"
                        style={{
                          background: "color-mix(in srgb, var(--warning) 8%, var(--surface-container-high))",
                          borderColor: "color-mix(in srgb, var(--warning) 25%, transparent)",
                          borderRadius: "var(--radius-button)",
                        }}
                      >
                        <span style={{ fontSize: "16px", lineHeight: 1 }}>⚡</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-bold)", color: "var(--warning)" }}>
                              Upset-alert!
                            </span>
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                              Elo-gap: <span style={{ fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>{Math.round(eloDiff)}</span>
                            </span>
                          </div>
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                            Underdog <span style={{ fontWeight: "var(--font-weight-bold)", color: "var(--warning)" }}>{underdog}</span> vinner{" "}
                            <span style={{ fontWeight: "var(--font-weight-bold)", color: "var(--success)" }}>+{underdogWinDelta}</span>
                            {" "}vs favorit{" "}
                            <span style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>{favorite}</span>
                            {" "}<span style={{ fontWeight: "var(--font-weight-bold)", color: "var(--success)" }}>+{favoriteWinDelta}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                {selectedFinalists.map((name) => {
                  const isSelected = pendingWinner === name;
                  return (
                    <motion.button
                      key={name}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { selectWinner(name); setPendingWinner(null); }}
                      className="relative flex flex-col items-center gap-2 px-6 py-6 rounded-lg border transition-all cursor-pointer"
                      style={{
                        background: isSelected ? "color-mix(in srgb, var(--primary) 12%, var(--surface-container))" : "var(--surface-container)",
                        borderColor: isSelected ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)",
                        borderRadius: "var(--radius-card)",
                        boxShadow: isSelected ? "0 0 16px color-mix(in srgb, var(--primary) 20%, transparent)" : "none",
                      }}
                    >
                      {isSelected && (
                        <motion.div
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "var(--primary)" }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          <Check className="w-3.5 h-3.5" style={{ color: "var(--primary-foreground)" }} />
                        </motion.div>
                      )}
                      <Trophy className={`w-6 h-6 transition-colors ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span
                        className={isSelected ? "text-primary" : "text-foreground"}
                        style={{
                          fontFamily: FONT,
                          fontSize: "var(--text-base)",
                          fontWeight: "var(--font-weight-semibold)",
                        }}
                      >
                        {name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setSelectedFinalists([]);
                  setPendingWinner(null);
                  setRegStep("select-finalists");
                }}
                className="w-full mt-4 py-3 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all cursor-pointer"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-label)",
                  borderRadius: "var(--radius-card)",
                }}
              >
                <ArrowLeft className="w-4 h-4 inline mr-2" />
                Ändra finalister
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
