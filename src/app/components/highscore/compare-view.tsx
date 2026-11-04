import { AnimatePresence, motion } from "motion/react";
import { Swords, X, TrendingUp, Clock, Coffee, Sun, CalendarDays, Lightbulb } from "lucide-react";
import { computePlayerPercentile, getCSGORank } from "../../lib/rank";
import { stripEmoji } from "../../lib/players";
import type { PlayerStats } from "../../lib/stats";
import type { EloEntry } from "../../lib/elo";
import type { H2HInsight } from "../../lib/insights";
import { FONT } from "./constants";
import { GruvrankBadge } from "./gruvrank-badge";

interface CompareViewProps {
  compareMode: boolean;
  comparePlayer1: string | null;
  setComparePlayer1: React.Dispatch<React.SetStateAction<string | null>>;
  activePlayers: string[];
  comparePlayer2: string | null;
  setComparePlayer2: React.Dispatch<React.SetStateAction<string | null>>;
  compareStats: { p1: PlayerStats; p2: PlayerStats; h2h: { wins: number; losses: number; }; } | null;
  eloRatings: Record<string, EloEntry>;
  h2hElo: Record<string, Record<string, number>>;
  h2hInsights: H2HInsight | null;
}

export function CompareView({
  compareMode,
  comparePlayer1,
  setComparePlayer1,
  activePlayers,
  comparePlayer2,
  setComparePlayer2,
  compareStats,
  eloRatings,
  h2hElo,
  h2hInsights,
}: CompareViewProps) {
  return (
    <>
      <AnimatePresence>
        {compareMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div
              className="rounded-lg border border-primary/20 overflow-hidden"
              style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)" }}
            >
              {/* Header */}
              <div
                className="px-4 py-3 flex items-center gap-2 border-b border-border"
                style={{ background: "var(--surface-container-high)" }}
              >
                <Swords className="w-4 h-4 text-primary" />
                <span
                  className="text-foreground"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-base)",
                    fontWeight: "var(--font-weight-semibold)",
                  }}
                >
                  Inbördes möten
                </span>
              </div>

              <div className="p-4">
                {/* Player selectors */}
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center mb-4">
                  <div className="relative">
                    <select
                      value={comparePlayer1 || ""}
                      onChange={(e) => setComparePlayer1(e.target.value || null)}
                      className="px-3 py-2.5 rounded-lg border border-border text-foreground w-full truncate appearance-none"
                      style={{
                        fontFamily: FONT,
                        fontSize: "var(--text-label)",
                        background: "var(--input-background)",
                        borderRadius: "var(--radius-card)",
                        paddingRight: comparePlayer1 ? "2.25rem" : "0.75rem",
                      }}
                    >
                      <option value="">Spelare 1</option>
                      {activePlayers.filter((p) => p !== comparePlayer2).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    {comparePlayer1 && (
                      <button
                        type="button"
                        onClick={() => setComparePlayer1(null)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-container-highest)"; e.currentTarget.style.color = "var(--foreground)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                        aria-label="Rensa spelare 1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--surface-container-highest)" }}
                  >
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontWeight: "var(--font-weight-semibold)" }}>VS</span>
                  </div>
                  <div className="relative">
                    <select
                      value={comparePlayer2 || ""}
                      onChange={(e) => setComparePlayer2(e.target.value || null)}
                      className="px-3 py-2.5 rounded-lg border border-border text-foreground w-full truncate appearance-none"
                      style={{
                        fontFamily: FONT,
                        fontSize: "var(--text-label)",
                        background: "var(--input-background)",
                        borderRadius: "var(--radius-card)",
                        paddingRight: comparePlayer2 ? "2.25rem" : "0.75rem",
                      }}
                    >
                      <option value="">Spelare 2</option>
                      {activePlayers.filter((p) => p !== comparePlayer1).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    {comparePlayer2 && (
                      <button
                        type="button"
                        onClick={() => setComparePlayer2(null)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-container-highest)"; e.currentTarget.style.color = "var(--foreground)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                        aria-label="Rensa spelare 2"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {compareStats && (() => {
                  const { p1, p2, h2h } = compareStats;
                  const totalMeetings = h2h.wins + h2h.losses;
                  const h2hPct1 = totalMeetings > 0 ? (h2h.wins / totalMeetings) * 100 : 50;

                  const h2hPct2 = totalMeetings > 0 ? (h2h.losses / totalMeetings) * 100 : 50;

                  // Compute ranks for both players
                  const allElosH2H = Object.values(eloRatings).map((e) => e.elo);
                  const p1Elo = eloRatings[p1.name];
                  const p2Elo = eloRatings[p2.name];
                  const p1Percentile = p1Elo ? computePlayerPercentile(p1Elo.elo, allElosH2H) : null;
                  const p2Percentile = p2Elo ? computePlayerPercentile(p2Elo.elo, allElosH2H) : null;
                  const p1Rank = p1Percentile !== null ? getCSGORank(p1Percentile) : null;
                  const p2Rank = p2Percentile !== null ? getCSGORank(p2Percentile) : null;

                  return (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-3">

                      {/* ── Player Cards with Rank ── */}
                      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
                        {/* Player 1 Card */}
                        <div
                          className="rounded-lg p-3 border flex flex-col items-center text-center gap-1.5"
                          style={{
                            background: p1Rank ? `linear-gradient(180deg, ${p1Rank.bgColor} 0%, var(--surface-container-lowest) 100%)` : "var(--surface-container-lowest)",
                            borderColor: p1Rank ? `color-mix(in srgb, ${p1Rank.color} 30%, var(--border))` : "var(--border)",
                            borderRadius: "var(--radius-card)",
                          }}
                        >
                          {p1Rank && <GruvrankBadge rank={p1Rank} size={40} className="mb-0.5" />}
                          <span className="truncate w-full" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)", lineHeight: 1.2 }}>
                            {stripEmoji(p1.name).split(" ")[0]}
                          </span>
                          {p1Rank && (
                            <span className="truncate w-full" style={{ fontFamily: FONT, fontSize: 10, color: p1Rank.color, fontWeight: "var(--font-weight-semibold)", lineHeight: 1 }}>
                              {p1Rank.name}
                            </span>
                          )}
                          {p1Elo && (
                            <span style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1 }}>
                              {p1Elo.elo} Elo
                            </span>
                          )}
                        </div>

                        {/* VS divider */}
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center"
                            style={{ background: "var(--surface-container-highest)", border: "1px solid var(--border)" }}
                          >
                            <Swords className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                          </div>
                          {totalMeetings > 0 && (
                            <span style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                              {totalMeetings}x
                            </span>
                          )}
                        </div>

                        {/* Player 2 Card */}
                        <div
                          className="rounded-lg p-3 border flex flex-col items-center text-center gap-1.5"
                          style={{
                            background: p2Rank ? `linear-gradient(180deg, ${p2Rank.bgColor} 0%, var(--surface-container-lowest) 100%)` : "var(--surface-container-lowest)",
                            borderColor: p2Rank ? `color-mix(in srgb, ${p2Rank.color} 30%, var(--border))` : "var(--border)",
                            borderRadius: "var(--radius-card)",
                          }}
                        >
                          {p2Rank && <GruvrankBadge rank={p2Rank} size={40} className="mb-0.5" />}
                          <span className="truncate w-full" style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)", lineHeight: 1.2 }}>
                            {stripEmoji(p2.name).split(" ")[0]}
                          </span>
                          {p2Rank && (
                            <span className="truncate w-full" style={{ fontFamily: FONT, fontSize: 10, color: p2Rank.color, fontWeight: "var(--font-weight-semibold)", lineHeight: 1 }}>
                              {p2Rank.name}
                            </span>
                          )}
                          {p2Elo && (
                            <span style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1 }}>
                              {p2Elo.elo} Elo
                            </span>
                          )}
                        </div>
                      </div>

                      {/* H2H Finals record — big visual */}
                      <div
                        className="rounded-lg p-4 border"
                        style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, var(--surface-container-lowest)) 0%, color-mix(in srgb, var(--warning) 6%, var(--surface-container-lowest)) 100%)", borderColor: "var(--border)", borderRadius: "var(--radius-card)" }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span style={{ fontFamily: FONT, fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                            Finalmöten
                          </span>
                          <span
                            style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}
                          >
                            {totalMeetings} matcher
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            style={{ fontFamily: FONT, fontSize: "var(--text-h3)", fontWeight: "var(--font-weight-bold)", color: "var(--primary)", minWidth: 32, textAlign: "center" }}
                          >
                            {h2h.wins}
                          </span>
                          <div className="flex-1 h-4 rounded-full overflow-hidden flex" style={{ background: "var(--muted)" }}>
                            {totalMeetings > 0 ? (
                              <>
                                <motion.div
                                  className="h-full"
                                  initial={{ width: "50%" }}
                                  animate={{ width: `${h2hPct1}%` }}
                                  transition={{ duration: 0.6, ease: "easeOut" }}
                                  style={{
                                    background: "var(--primary)",
                                    borderRadius: h2h.losses === 0 ? "9999px" : "9999px 0 0 9999px",
                                  }}
                                />
                                <motion.div
                                  className="h-full"
                                  initial={{ width: "50%" }}
                                  animate={{ width: `${100 - h2hPct1}%` }}
                                  transition={{ duration: 0.6, ease: "easeOut" }}
                                  style={{
                                    background: "var(--warning)",
                                    borderRadius: h2h.wins === 0 ? "9999px" : "0 9999px 9999px 0",
                                  }}
                                />
                              </>
                            ) : (
                              <div className="h-full w-full" style={{ background: "var(--muted)" }} />
                            )}
                          </div>
                          <span
                            style={{ fontFamily: FONT, fontSize: "var(--text-h3)", fontWeight: "var(--font-weight-bold)", color: "var(--warning)", minWidth: 32, textAlign: "center" }}
                          >
                            {h2h.losses}
                          </span>
                        </div>
                        {totalMeetings === 0 && (
                          <div className="text-center" style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", fontFamily: FONT }}>
                            Inget finalmöte ännu
                          </div>
                        )}
                        {totalMeetings > 0 && (
                          <div className="flex items-center justify-between mt-1">
                            <span
                              style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--primary)" }}
                            >
                              {h2hPct1.toFixed(0)}%
                            </span>
                            <span
                              style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--warning)" }}
                            >
                              {h2hPct2.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* ── H2H Elo Exchange ── */}
                      {totalMeetings > 0 && comparePlayer1 && comparePlayer2 && (() => {
                        const p1EloNet = h2hElo[comparePlayer1]?.[comparePlayer2] || 0;
                        const p2EloNet = h2hElo[comparePlayer2]?.[comparePlayer1] || 0;
                        if (p1EloNet === 0 && p2EloNet === 0) return null;
                        return (
                          <div
                            className="rounded-lg p-4 border"
                            style={{ background: "var(--surface-container-lowest)", borderColor: "var(--border)", borderRadius: "var(--radius-card)" }}
                          >
                            <div className="flex items-center gap-1.5 mb-3">
                              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                              <span style={{ fontFamily: FONT, fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                                Elo-utbyte
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-center">
                                <span className="block truncate" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--muted-foreground)", marginBottom: 4 }}>
                                  {stripEmoji(comparePlayer1).split(" ")[0]}
                                </span>
                                <span
                                  style={{
                                    fontFamily: FONT,
                                    fontSize: "var(--text-h3)",
                                    fontWeight: "var(--font-weight-bold)",
                                    color: p1EloNet > 0 ? "var(--success)" : p1EloNet < 0 ? "var(--destructive)" : "var(--muted-foreground)",
                                  }}
                                >
                                  {p1EloNet > 0 ? "+" : ""}{p1EloNet}
                                </span>
                              </div>
                              <div className="text-center">
                                <span className="block truncate" style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--muted-foreground)", marginBottom: 4 }}>
                                  {stripEmoji(comparePlayer2).split(" ")[0]}
                                </span>
                                <span
                                  style={{
                                    fontFamily: FONT,
                                    fontSize: "var(--text-h3)",
                                    fontWeight: "var(--font-weight-bold)",
                                    color: p2EloNet > 0 ? "var(--success)" : p2EloNet < 0 ? "var(--destructive)" : "var(--muted-foreground)",
                                  }}
                                >
                                  {p2EloNet > 0 ? "+" : ""}{p2EloNet}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 text-center">
                              <span style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                                Netto Elo vunnet/förlorat mot varandra
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ── H2H Weekday & Time Insights ── */}
                      {h2hInsights && h2hInsights.totalMeetings > 0 && (
                        <div className="space-y-3">
                          <span
                            className="text-muted-foreground block"
                            style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT }}
                          >
                            När möts de?
                          </span>

                          {/* Before/After lunch H2H */}
                          {(h2hInsights.beforeLunch.total > 0 || h2hInsights.afterLunch.total > 0) && (
                            <div
                              className="p-3 rounded-lg border border-border"
                              style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                            >
                              <div className="flex items-center gap-1.5 mb-2">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT }}>
                                  Tid på dagen
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {/* Before lunch */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="flex items-center gap-1" style={{ fontSize: "var(--text-sm)", color: "var(--warning)", fontFamily: FONT }}>
                                      <Coffee className="w-3 h-3" /> Fm
                                    </span>
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: FONT }}>
                                      {h2hInsights.beforeLunch.total} möten
                                    </span>
                                  </div>
                                  {h2hInsights.beforeLunch.total > 0 ? (
                                    <>
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="flex-1 h-2 rounded-full overflow-hidden flex" style={{ background: "var(--muted)" }}>
                                          <div
                                            className="h-full"
                                            style={{
                                              width: `${(h2hInsights.beforeLunch.p1Wins / h2hInsights.beforeLunch.total) * 100}%`,
                                              background: "var(--primary)",
                                              borderRadius: h2hInsights.beforeLunch.p2Wins === 0 ? "9999px" : "9999px 0 0 9999px",
                                            }}
                                          />
                                          <div
                                            className="h-full"
                                            style={{
                                              width: `${(h2hInsights.beforeLunch.p2Wins / h2hInsights.beforeLunch.total) * 100}%`,
                                              background: "var(--warning)",
                                              borderRadius: h2hInsights.beforeLunch.p1Wins === 0 ? "9999px" : "0 9999px 9999px 0",
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--primary)", fontFamily: FONT }}>
                                          {h2hInsights.beforeLunch.p1Wins}
                                        </span>
                                        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--warning)", fontFamily: FONT }}>
                                          {h2hInsights.beforeLunch.p2Wins}
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>Inga möten</span>
                                  )}
                                </div>
                                {/* After lunch */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="flex items-center gap-1" style={{ fontSize: "var(--text-sm)", color: "var(--info)", fontFamily: FONT }}>
                                      <Sun className="w-3 h-3" /> Em
                                    </span>
                                    <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontFamily: FONT }}>
                                      {h2hInsights.afterLunch.total} möten
                                    </span>
                                  </div>
                                  {h2hInsights.afterLunch.total > 0 ? (
                                    <>
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="flex-1 h-2 rounded-full overflow-hidden flex" style={{ background: "var(--muted)" }}>
                                          <div
                                            className="h-full"
                                            style={{
                                              width: `${(h2hInsights.afterLunch.p1Wins / h2hInsights.afterLunch.total) * 100}%`,
                                              background: "var(--primary)",
                                              borderRadius: h2hInsights.afterLunch.p2Wins === 0 ? "9999px" : "9999px 0 0 9999px",
                                            }}
                                          />
                                          <div
                                            className="h-full"
                                            style={{
                                              width: `${(h2hInsights.afterLunch.p2Wins / h2hInsights.afterLunch.total) * 100}%`,
                                              background: "var(--warning)",
                                              borderRadius: h2hInsights.afterLunch.p1Wins === 0 ? "9999px" : "0 9999px 9999px 0",
                                            }}
                                          />
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--primary)", fontFamily: FONT }}>
                                          {h2hInsights.afterLunch.p1Wins}
                                        </span>
                                        <span style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--warning)", fontFamily: FONT }}>
                                          {h2hInsights.afterLunch.p2Wins}
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>Inga möten</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Weekday H2H breakdown */}
                          {h2hInsights.weekdays.some((d) => d.total > 0) && (
                            <div
                              className="p-3 rounded-lg border border-border"
                              style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                            >
                              <div className="flex items-center gap-1.5 mb-3">
                                <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT }}>
                                  Veckodag
                                </span>
                              </div>
                              {/* Stacked bars per weekday */}
                              <div className="flex items-end gap-1.5" style={{ height: 56 }}>
                                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                                  const d = h2hInsights.weekdays[dayIdx];
                                  const maxTotal = Math.max(...h2hInsights.weekdays.map((w) => w.total), 1);
                                  const barH = d.total > 0 ? Math.max(10, (d.total / maxTotal) * 48) : 4;
                                  const p1Pct = d.total > 0 ? (d.p1Wins / d.total) * 100 : 0;
                                  return (
                                    <div
                                      key={d.dayIndex}
                                      className="flex-1"
                                      title={d.total > 0 ? `${d.day}: ${d.p1Wins}-${d.p2Wins}` : `${d.day}: Inga möten`}
                                    >
                                      {d.total > 0 ? (
                                        <div
                                          className="w-full rounded-sm overflow-hidden flex flex-col"
                                          style={{ height: barH, borderRadius: "var(--radius-sm)" }}
                                        >
                                          <div style={{ height: `${p1Pct}%`, background: "var(--primary)", minHeight: d.p1Wins > 0 ? 2 : 0 }} />
                                          <div style={{ height: `${100 - p1Pct}%`, background: "var(--warning)", minHeight: d.p2Wins > 0 ? 2 : 0 }} />
                                        </div>
                                      ) : (
                                        <div
                                          className="w-full rounded-sm"
                                          style={{ height: barH, background: "var(--border)", opacity: 0.3, borderRadius: "var(--radius-sm)" }}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Score labels */}
                              <div className="flex gap-1.5 mt-1.5">
                                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                                  const d = h2hInsights.weekdays[dayIdx];
                                  return (
                                    <div key={`h2h-score-${d.dayIndex}`} className="flex-1 text-center" style={{ minHeight: 12 }}>
                                      {d.total > 0 && (
                                        <span style={{ fontSize: "var(--text-xs)", fontFamily: FONT, fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)" }}>
                                          {d.p1Wins}-{d.p2Wins}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Day labels */}
                              <div className="flex gap-1.5 mt-0.5">
                                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                                  const d = h2hInsights.weekdays[dayIdx];
                                  return (
                                    <div key={`h2h-lbl-${d.dayIndex}`} className="flex-1 text-center">
                                      <span style={{ fontSize: "var(--text-xs)", fontFamily: FONT, color: d.total > 0 ? "var(--foreground)" : "var(--muted-foreground)", lineHeight: 1 }}>
                                        {d.dayShort}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Legend */}
                              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--primary)" }} />
                                  <span className="text-muted-foreground truncate" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                                    {stripEmoji(p1.name).split(" ")[0]}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--warning)" }} />
                                  <span className="text-muted-foreground truncate" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                                    {stripEmoji(p2.name).split(" ")[0]}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Best context callouts */}
                          {(h2hInsights.p1BestContext || h2hInsights.p2BestContext) && (
                            <div className="space-y-1.5">
                              {h2hInsights.p1BestContext && (
                                <div
                                  className="flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm"
                                  style={{
                                    background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                                    borderColor: "var(--border)",
                                    borderRadius: "var(--radius-card)",
                                    boxShadow: "var(--elevation-sm)",
                                  }}
                                >
                                  <div
                                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                                    style={{ background: "var(--muted)" }}
                                  >
                                    <Lightbulb className="w-3.5 h-3.5" style={{ color: "var(--warning)" }} aria-hidden />
                                  </div>
                                  <span style={{ fontSize: "var(--text-label)", lineHeight: 1.6, fontFamily: FONT, color: "var(--foreground)" }}>
                                    <strong style={{ color: "var(--primary)", fontWeight: "var(--font-weight-bold)" }}>{stripEmoji(p1.name).split(" ")[0]}</strong>
                                    {" "}presterar bäst mot{" "}
                                    <span style={{ color: "var(--muted-foreground)" }}>{stripEmoji(p2.name).split(" ")[0]}</span>
                                    {" "}på{" "}
                                    <strong style={{ color: "var(--foreground)", fontWeight: "var(--font-weight-bold)" }}>{h2hInsights.p1BestContext}</strong>
                                  </span>
                                </div>
                              )}
                              {h2hInsights.p2BestContext && h2hInsights.p2BestContext !== h2hInsights.p1BestContext && (
                                <div
                                  className="flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm"
                                  style={{
                                    background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                                    borderColor: "var(--border)",
                                    borderRadius: "var(--radius-card)",
                                    boxShadow: "var(--elevation-sm)",
                                  }}
                                >
                                  <div
                                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                                    style={{ background: "var(--muted)" }}
                                  >
                                    <Lightbulb className="w-3.5 h-3.5" style={{ color: "var(--warning)" }} aria-hidden />
                                  </div>
                                  <span style={{ fontSize: "var(--text-label)", lineHeight: 1.6, fontFamily: FONT, color: "var(--foreground)" }}>
                                    <strong style={{ color: "var(--warning)", fontWeight: "var(--font-weight-bold)" }}>{stripEmoji(p2.name).split(" ")[0]}</strong>
                                    {" "}presterar bäst mot{" "}
                                    <span style={{ color: "var(--muted-foreground)" }}>{stripEmoji(p1.name).split(" ")[0]}</span>
                                    {" "}på{" "}
                                    <strong style={{ color: "var(--foreground)", fontWeight: "var(--font-weight-bold)" }}>{h2hInsights.p2BestContext}</strong>
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                    </motion.div>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
