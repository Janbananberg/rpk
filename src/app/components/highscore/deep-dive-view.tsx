import { AnimatePresence, motion } from "motion/react";
import { Activity, Grid3X3 as Grid3X3Icon, CalendarDays, TrendingUp, Info, Zap } from "lucide-react";
import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, Label, YAxis, ReferenceLine, Tooltip, Scatter } from "recharts";
import { ELO_START, ELO_ANTE, ELO_ALPHA, ELO_UPSET_THRESHOLD, ELO_UPSET_BONUS } from "../../lib/elo";
import type { EloEntry } from "../../lib/elo";
import type { PlayerStats } from "../../lib/stats";
import { stripEmoji } from "../../lib/players";
import { H2HMatrix, WeekdayHeatmap } from "../highscore-insights";
import type { GameSession } from "../api";
import { FONT } from "./constants";
import { getRankIcon } from "./rank-icon";

interface DeepDiveViewProps {
  showGraphView: boolean;
  sortedStats: PlayerStats[];
  eloRatings: Record<string, EloEntry>;
  isMobile: boolean;
  stats: PlayerStats[];
  activeSessions: GameSession[];
}

export function DeepDiveView({
  showGraphView,
  sortedStats,
  eloRatings,
  isMobile,
  stats,
  activeSessions,
}: DeepDiveViewProps) {
  return (
    <>
      <AnimatePresence>
      {showGraphView && (
        <motion.div
          initial={{ opacity: 0, height: 0, scale: 0.98 }}
          animate={{ opacity: 1, height: "auto", scale: 1 }}
          exit={{ opacity: 0, height: 0, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="rounded-lg border border-border overflow-hidden"
          style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)", order: 1, marginBottom: 24 }}
        >
          <div className="flex items-center gap-3 px-3 md:px-4 py-3 border-b border-border" style={{ background: "var(--surface-container-high)" }}>
            <Activity className="w-4 h-4 text-primary" />
            <span style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", letterSpacing: "0.02em" }}>
              Fördjupning
            </span>
          </div>

          <div className="p-2 md:p-4">
            {/* ── Scatter chart: Finalvinst% vs Elo ── */}
            {(() => {
              const scatterData = sortedStats
                .filter((s) => s.gamesPlayed > 0)
                .map((s) => ({ ...s, elo: eloRatings[s.name]?.elo ?? ELO_START }));
              const eloValues = scatterData.map((d) => d.elo);
              const minElo = eloValues.length > 0 ? Math.floor((Math.min(...eloValues) - 30) / 50) * 50 : 900;
              const maxElo = eloValues.length > 0 ? Math.ceil((Math.max(...eloValues) + 30) / 50) * 50 : 1100;
              return (
            <ResponsiveContainer width="100%" height={isMobile ? 300 : 420}>
                <ScatterChart margin={isMobile ? { top: 15, right: 10, bottom: 35, left: 10 } : { top: 20, right: 30, bottom: 40, left: 30 }}>
                  <CartesianGrid key="scatter-grid" strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis
                    key="scatter-x"
                    type="number"
                    dataKey="vfPct"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    stroke="var(--muted-foreground)"
                    tick={{ fontSize: 11, fontFamily: "'Titillium Web', sans-serif" }}
                    tickLine={{ stroke: "var(--border)" }}
                  >
                    <Label
                      value="Finalvinst% — Vinstfrekvens i finaler (%)"
                      position="bottom"
                      offset={20}
                      style={{ fontSize: 12, fill: "var(--muted-foreground)", fontFamily: "'Titillium Web', sans-serif" }}
                    />
                  </XAxis>
                  <YAxis
                    key="scatter-y"
                    type="number"
                    dataKey="elo"
                    domain={[minElo, maxElo]}
                    stroke="var(--muted-foreground)"
                    tick={{ fontSize: 11, fontFamily: "'Titillium Web', sans-serif" }}
                    tickLine={{ stroke: "var(--border)" }}
                  >
                    <Label
                      value="Elo-tal"
                      angle={-90}
                      position="left"
                      offset={10}
                      style={{ fontSize: 12, fill: "var(--muted-foreground)", fontFamily: "'Titillium Web', sans-serif" }}
                    />
                  </YAxis>
                  <ReferenceLine key="ref-x" x={50} stroke="var(--border-strong)" strokeDasharray="5 5" strokeWidth={1} />
                  <ReferenceLine key="ref-y" y={ELO_START} stroke="var(--border-strong)" strokeDasharray="5 5" strokeWidth={1} label={{ value: "Start", position: "right", fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "'Titillium Web', sans-serif" }} />
                  <Tooltip
                    key="scatter-tooltip"
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as PlayerStats & { elo: number };
                      const eloEntry = eloRatings[d.name];
                      return (
                        <div
                          className="px-4 py-3 rounded-lg border border-border shadow-lg"
                          style={{
                            background: "var(--popover)",
                            borderRadius: "var(--radius-card)",
                            backdropFilter: "blur(12px)",
                          }}
                        >
                          <div
                            className="text-foreground mb-2"
                            style={{ fontFamily: FONT, fontWeight: "var(--font-weight-semibold)", fontSize: "var(--text-base)" }}
                          >
                            {d.name}
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between gap-6" style={{ fontSize: "var(--text-sm)" }}>
                              <span className="text-muted-foreground">Elo</span>
                              <span className="text-primary" style={{ fontWeight: "var(--font-weight-semibold)" }}>
                                {d.elo}
                                {eloEntry && eloEntry.delta !== 0 && (
                                  <span style={{ color: eloEntry.delta > 0 ? "var(--success)" : "var(--destructive)", fontSize: "var(--text-xs)", marginLeft: 4 }}>
                                    {eloEntry.delta > 0 ? "+" : ""}{eloEntry.delta}
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between gap-6" style={{ fontSize: "var(--text-sm)" }}>
                              <span className="text-muted-foreground">Finalvinst%</span>
                              <span className="text-foreground" style={{ fontWeight: "var(--font-weight-semibold)" }}>{d.vfPct.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between gap-6" style={{ fontSize: "var(--text-sm)" }}>
                              <span className="text-muted-foreground">Vinst%</span>
                              <span className="text-foreground" style={{ fontWeight: "var(--font-weight-semibold)" }}>{d.bwp.toFixed(1)}%</span>
                            </div>
                            <div className="pt-1 border-t border-border mt-1 flex justify-between gap-6" style={{ fontSize: "var(--text-sm)" }}>
                              <span className="text-muted-foreground">Statistik</span>
                              <span className="text-foreground">{d.wins}V / {d.finals}F / {d.gamesPlayed}S</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    key="scatter-data"
                    data={scatterData}
                    fill="var(--primary)"
                    shape={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (cx == null || cy == null) return <g />;
                      const r = Math.max(5, Math.min(14, 4 + Math.sqrt(payload.gamesPlayed) * 1.2));
                      const eloNorm = Math.min(Math.max((payload.elo - 900) / 300, 0), 1);
                      return (
                        <g>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={r + 2}
                            fill="var(--primary)"
                            opacity={0.15}
                          />
                          <circle
                            cx={cx}
                            cy={cy}
                            r={r}
                            fill="var(--primary)"
                            opacity={0.35 + eloNorm * 0.55}
                            stroke="var(--primary)"
                            strokeWidth={1.5}
                            strokeOpacity={0.6}
                          />
                          <text
                            x={cx}
                            y={cy - r - 5}
                            textAnchor="middle"
                            fill="var(--foreground)"
                            style={{ fontSize: 10, fontWeight: payload.elo > ELO_START ? 600 : 400, fontFamily: "'Titillium Web', sans-serif" }}
                          >
                            {stripEmoji(payload.name).split(" ")[0]}
                          </text>
                        </g>
                      );
                    }}
                  />
                  {/* Quadrant labels */}
                  <text key="q-hype" x="18%" y="10%" textAnchor="middle" fill="var(--warning)" opacity={0.18} style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "'Titillium Web', sans-serif" }}>
                    HÖG ELO
                  </text>
                  <text key="q-elite" x="78%" y="10%" textAnchor="middle" fill="var(--success)" opacity={0.18} style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "'Titillium Web', sans-serif" }}>
                    ELIT
                  </text>
                  <text key="q-weak" x="18%" y="92%" textAnchor="middle" fill="var(--muted-foreground)" opacity={0.18} style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "'Titillium Web', sans-serif" }}>
                    SVAG
                  </text>
                  <text key="q-clutch" x="78%" y="92%" textAnchor="middle" fill="var(--info)" opacity={0.18} style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", fontFamily: "'Titillium Web', sans-serif" }}>
                    AVGÖRARE
                  </text>
                </ScatterChart>
              </ResponsiveContainer>
              );
            })()}

          </div>

          {/* ── H2H Matrix ── */}
          <div
            className="border-t border-border p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Grid3X3Icon className="w-4 h-4 text-primary" />
              <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                Inbördesmatris
              </span>
            </div>
            <H2HMatrix stats={stats} />
          </div>

          {/* ── Speltider Heatmap ── */}
          {activeSessions.length > 0 && (
            <div
              className="border-t border-border p-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                  Speltider
                </span>
              </div>
              <WeekdayHeatmap sessions={activeSessions} />
            </div>
          )}

          {/* ── Elo Rating Table ── */}
          {Object.keys(eloRatings).length > 0 && (
            <div className="border-t border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                  Elo-tal
                </span>
              </div>

              {/* Elo table */}
              <div className="overflow-x-auto -mx-2">
                <table className="w-full" style={{ fontFamily: FONT }}>
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-2 py-2" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)", letterSpacing: "0.05em", textTransform: "uppercase" }}>#</th>
                      <th className="text-left px-2 py-2" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Spelare</th>
                      <th className="text-right px-2 py-2" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Elo</th>
                      <th className="text-right px-2 py-2" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Högsta</th>
                      <th className="text-right px-2 py-2" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)", letterSpacing: "0.05em", textTransform: "uppercase", cursor: "help" }}>Δ senaste</th>
                      <th className="text-right px-2 py-2" style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--muted-foreground)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Rundor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(eloRatings)
                      .sort((a, b) => b.elo - a.elo || a.name.localeCompare(b.name, "sv"))
                      .map((entry, idx) => (
                        <tr key={entry.name} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-2 py-2" style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                            {idx < 3 ? getRankIcon(idx + 1) : <span>{idx + 1}</span>}
                          </td>
                          <td className="px-2 py-2" style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                            {entry.name}
                          </td>
                          <td className="text-right px-2 py-2" style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-bold)", color: "var(--primary)" }}>
                            {entry.elo}
                          </td>
                          <td className="text-right px-2 py-2" style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                            {entry.peakElo}
                          </td>
                          <td className="text-right px-2 py-2" title="Elo-förändring från senaste runda" style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: entry.delta > 0 ? "var(--success)" : entry.delta < 0 ? "var(--destructive)" : "var(--muted-foreground)", cursor: "help" }}>
                            {entry.delta > 0 ? "+" : ""}{entry.delta}
                          </td>
                          <td className="text-right px-2 py-2" style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                            {entry.matches}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Model explanation */}
              <div
                className="mt-4 p-3 rounded-lg border border-border/60"
                style={{ background: "var(--surface-container-high)", borderRadius: "var(--radius-card)" }}
              >
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                      Hur Elo-potten fungerar
                    </span>
                    <div className="mt-1 space-y-1" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                      <p>Alla spelare startar på <strong style={{ color: "var(--foreground)" }}>1000 Elo</strong>. Varje runda satsar alla deltagare <strong style={{ color: "var(--foreground)" }}>{ELO_ANTE} Elo</strong> i en gemensam pott.</p>
                      <p>
                        <strong style={{ color: "var(--foreground)" }}>Pott = N × {ELO_ANTE}</strong> &nbsp;→&nbsp;
                        Finalisterna delar potten baserat på Elo-skillnad (α={ELO_ALPHA}).
                      </p>
                      <p>
                        Icke-finalist: <strong style={{ color: "var(--destructive)" }}>−{ELO_ANTE}</strong> &nbsp;·&nbsp;
                        Finalist (förlust): <strong style={{ color: "var(--success)" }}>+1 till +{Math.round(8 * ELO_ANTE * 0.5 - ELO_ANTE)}</strong> &nbsp;·&nbsp;
                        Finalist (vinst): <strong style={{ color: "var(--success)" }}>+{Math.round(8 * ELO_ANTE * 0.5 - ELO_ANTE)} till +{Math.round(8 * ELO_ANTE * (0.5 + ELO_ALPHA) - ELO_ANTE)}</strong>
                      </p>
                      <p>
                        <strong className="inline-flex items-center gap-1" style={{ color: "var(--warning)" }}><Zap className="w-3 h-3" aria-hidden />Skrällbonus:</strong> Om den lägre rankade spelaren vinner finalen och Elo-skillnaden är ≥{" "}
                        <strong style={{ color: "var(--foreground)" }}>{ELO_UPSET_THRESHOLD}</strong> poäng, får vinnaren en extra bonus på{" "}
                        <strong style={{ color: "var(--success)" }}>+{ELO_UPSET_BONUS} Elo</strong> utöver sin pottandel.
                        {" "}Denna bonus ligger <em>utanför</em> nollsumman och belönar skrällar.
                      </p>
                      <p>I övrigt är systemet <strong style={{ color: "var(--foreground)" }}>nollsumma</strong> — ingen Elo skapas eller förstörs från potten.</p>
                      <p>Kolumnen Högsta visar spelarens högsta uppnådda Elo.</p>
                      <p style={{ fontStyle: "italic", color: "var(--muted-foreground)" }}>Obs: Elo beräknas från all sessionsdata (från mars 2026). Arkiverade månader utan runddata ingår ej.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
