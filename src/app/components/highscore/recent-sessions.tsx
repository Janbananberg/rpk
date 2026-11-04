import { Clock, Trash2, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatMonthLabel, formatRelativeDate, formatSessionDate } from "../../lib/dates";
import type { GameSession } from "../api";
import { FONT } from "./constants";

interface RecentSessionsProps {
  hasSessions: boolean;
  selectedMonth: string;
  currentMonth: string;
  visibleSessions: GameSession[];
  expandedSession: string | null;
  setExpandedSession: React.Dispatch<React.SetStateAction<string | null>>;
  confirmDeleteSession: (sessionId: string) => void;
  recentSessions: GameSession[];
  setShowAllSessions: React.Dispatch<React.SetStateAction<boolean>>;
  showAllSessions: boolean;
}

export function RecentSessions({
  hasSessions,
  selectedMonth,
  currentMonth,
  visibleSessions,
  expandedSession,
  setExpandedSession,
  confirmDeleteSession,
  recentSessions,
  setShowAllSessions,
  showAllSessions,
}: RecentSessionsProps) {
  return (
    <>
      {hasSessions && (<div
        className="mt-8 md:mt-10 rounded-lg border border-border overflow-hidden"
        style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-center justify-between px-3 md:px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span
              className="text-foreground"
              style={{
                fontFamily: FONT,
                fontSize: "var(--text-base)",
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              {selectedMonth === "total"
                ? "Alla speltillfällen"
                : selectedMonth === currentMonth
                ? "Speltillfällen denna månad"
                : `Speltillfällen ${formatMonthLabel(selectedMonth)}`}
            </span>
          </div>
        </div>

        {visibleSessions.length === 0 ? (
          <div
            className="px-4 py-6 text-center text-muted-foreground"
            style={{ fontFamily: FONT, fontSize: "var(--text-base)" }}
          >
            Inga speltillfällen registrerade
          </div>
        ) : (
          <>
            {visibleSessions.map((session) => {
              const isExpanded = expandedSession === session.id;
              return (
                <div key={session.id} className="border-b border-border last:border-b-0">
                  <div
                    className="px-3 md:px-4 py-3 hover:bg-muted/10 active:bg-muted/20 transition-colors cursor-pointer group"
                    onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-foreground"
                            style={{
                              fontFamily: FONT,
                              fontSize: "var(--text-base)",
                              fontWeight: "var(--font-weight-semibold)",
                            }}
                          >
                            {formatRelativeDate(session.date)}
                          </span>
                          <span
                            className="text-muted-foreground"
                            style={{ fontSize: "var(--text-sm)" }}
                          >
                            {session.rounds.length} {session.rounds.length === 1 ? "runda" : "rundor"} · {session.players.length} spelare{(() => {
                              const hasRosterChanges = session.rounds.some((r) => r.players && r.players.length !== session.players.length);
                              return hasRosterChanges ? " ±" : "";
                            })()}
                          </span>
                        </div>
                        {/* Winner badges for session */}
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {(() => {
                            const winners = session.rounds.map((r) => r.winner);
                            const counts: Record<string, number> = {};
                            for (const w of winners) counts[w] = (counts[w] || 0) + 1;
                            return Object.entries(counts)
                              .sort(([, a], [, b]) => b - a)
                              .slice(0, 3)
                              .map(([name, count]) => (
                                <span
                                  key={name}
                                  className="px-1.5 py-0.5 rounded-full"
                                  style={{
                                    fontSize: "var(--text-xs)",
                                    background: "var(--primary)",
                                    color: "var(--primary-foreground)",
                                    opacity: 0.8,
                                  }}
                                >
                                  {name.split(" ")[0]} ×{count}
                                </span>
                              ));
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDeleteSession(session.id);
                          }}
                          className="md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded hover:bg-destructive/20 text-destructive transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded session details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="px-3 md:px-4 pb-3 space-y-1.5"
                          style={{ borderTop: "1px solid var(--border)" }}
                        >
                          <div className="pt-3">
                            <span
                              className="text-muted-foreground"
                              style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                            >
                              {formatSessionDate(session.date)}
                            </span>
                          </div>
                          {session.rounds.map((round, ri) => (
                            <div
                              key={ri}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg"
                              style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                            >
                              <span
                                className="text-muted-foreground w-8 flex flex-col items-center"
                                style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}
                              >
                                <span>R{ri + 1}</span>
                                {round.players && round.players.length !== session.players.length && (
                                  <span style={{ fontSize: "var(--text-xs)", opacity: 0.6 }}>
                                    {round.players.length} sp.
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-2 flex-1">
                                {round.finalists.map((f) => (
                                  <span
                                    key={f}
                                    className={f === round.winner ? "text-success" : "text-muted-foreground"}
                                    style={{
                                      fontFamily: FONT,
                                      fontSize: "var(--text-label)",
                                      fontWeight:
                                        f === round.winner
                                          ? "var(--font-weight-semibold)"
                                          : "var(--font-weight-normal)",
                                    }}
                                  >
                                    {f === round.winner && <Trophy className="w-3.5 h-3.5 inline align-[-2px] mr-1" aria-hidden />}
                                    {f}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                          {/* Session players — participation breakdown */}
                          <div className="pt-2">
                            <span
                              className="text-muted-foreground block mb-1.5"
                              style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT }}
                            >
                              Spelardeltagande
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {(() => {
                                const totalRounds = session.rounds.length;
                                const participation: Record<string, number> = {};
                                for (const p of session.players) participation[p] = 0;
                                session.rounds.forEach((round) => {
                                  const roundPlayers = round.players ?? session.players;
                                  roundPlayers.forEach((p) => {
                                    participation[p] = (participation[p] ?? 0) + 1;
                                  });
                                });
                                return Object.entries(participation)
                                  .sort(([, a], [, b]) => b - a)
                                  .map(([name, count]) => {
                                    const allRounds = count === totalRounds;
                                    return (
                                      <span
                                        key={name}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full border"
                                        style={{
                                          fontFamily: FONT,
                                          fontSize: "var(--text-xs)",
                                          borderColor: allRounds ? "color-mix(in srgb, var(--primary) 30%, var(--border))" : "var(--border)",
                                          background: allRounds ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "var(--surface-container)",
                                          color: allRounds ? "var(--primary)" : "var(--muted-foreground)",
                                          borderRadius: "var(--radius-full, 9999px)",
                                        }}
                                      >
                                        {name}
                                        <span
                                          style={{
                                            fontWeight: "var(--font-weight-semibold)",
                                            opacity: allRounds ? 1 : 0.7,
                                          }}
                                        >
                                          {count}/{totalRounds}
                                        </span>
                                      </span>
                                    );
                                  });
                              })()}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            {recentSessions.length > 5 && (
              <button
                onClick={() => setShowAllSessions(!showAllSessions)}
                className="w-full px-4 py-3 text-center text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                style={{ fontFamily: FONT, fontSize: "var(--text-label)" }}
              >
                {showAllSessions ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Visa färre
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Visa alla ({recentSessions.length})
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>)}
    </>
  );
}
