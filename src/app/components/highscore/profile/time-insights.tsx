import { CalendarDays, Coffee, Sun, Users, UserMinus, Clock } from "lucide-react";
import type { PlayerInsights } from "../../../lib/insights";
import { FONT } from "../constants";

interface ProfileTimeInsightsProps {
  playerInsights: PlayerInsights | null;
}

export function ProfileTimeInsights({
  playerInsights,
}: ProfileTimeInsightsProps) {
  return (
    <>
      {playerInsights && playerInsights.sessionCount > 0 && (
        <div className="space-y-3 md:space-y-4">
          <span
            className="text-muted-foreground block"
            style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            Spelinsikter
          </span>

          {/* Best weekday + Time preference + Crowd preference row */}
          <div className="grid grid-cols-3 gap-3">
            {/* Best weekday */}
            {playerInsights.bestWeekday && (
              <div
                className="p-3 rounded-lg border border-border"
                style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <CalendarDays className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                  <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Bästa dag
                  </span>
                </div>
                <div style={{ fontFamily: FONT, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", color: "var(--primary)" }}>
                  {playerInsights.bestWeekday.day}
                </div>
                <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                  {playerInsights.bestWeekday.winRate.toFixed(1)}% finalvinst
                </div>
              </div>
            )}

            {/* Time of day preference */}
            <div
              className="p-3 rounded-lg border border-border"
              style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {playerInsights.timePreference === "morning" ? (
                  <Coffee className="w-3.5 h-3.5" style={{ color: "var(--warning)" }} />
                ) : (
                  <Sun className="w-3.5 h-3.5" style={{ color: "var(--info)" }} />
                )}
                <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Bästa tid
                </span>
              </div>
              <div style={{
                fontFamily: FONT,
                fontSize: "var(--text-base)",
                fontWeight: "var(--font-weight-semibold)",
                color: playerInsights.timePreference === "morning" ? "var(--warning)" : "var(--info)",
              }}>
                {playerInsights.timePreference === "morning"
                  ? "Förmiddag"
                  : playerInsights.timePreference === "afternoon"
                  ? "Eftermiddag"
                  : "Ingen skillnad"}
              </div>
              <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                {playerInsights.timePreference === "morning"
                  ? `${playerInsights.beforeLunch.winRate.toFixed(1)}% finalvinst`
                  : playerInsights.timePreference === "afternoon"
                  ? `${playerInsights.afterLunch.winRate.toFixed(1)}% finalvinst`
                  : playerInsights.beforeLunch.games > 0 && playerInsights.afterLunch.games > 0
                  ? `Fm ${playerInsights.beforeLunch.winRate.toFixed(1)}% · Em ${playerInsights.afterLunch.winRate.toFixed(1)}%`
                  : "För lite data"}
              </div>
            </div>

            {/* eXtrovert / Introvert */}
            <div
              className="p-3 rounded-lg border border-border"
              style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {playerInsights.crowdPreference === "extrovert" ? (
                  <Users className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
                ) : playerInsights.crowdPreference === "introvert" ? (
                  <UserMinus className="w-3.5 h-3.5" style={{ color: "var(--info)" }} />
                ) : (
                  <Users className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
                )}
                <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Gruppstorlek
                </span>
              </div>
              <div style={{
                fontFamily: FONT,
                fontSize: "var(--text-base)",
                fontWeight: "var(--font-weight-semibold)",
                color: playerInsights.crowdPreference === "extrovert"
                  ? "var(--success)"
                  : playerInsights.crowdPreference === "introvert"
                  ? "var(--info)"
                  : "var(--muted-foreground)",
              }}>
                {playerInsights.crowdPreference === "extrovert"
                  ? "Bäst i stort gäng"
                  : playerInsights.crowdPreference === "introvert"
                  ? "Bäst i litet gäng"
                  : "Ingen skillnad"}
              </div>
              <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                {playerInsights.crowdPreference === "extrovert"
                  ? `${playerInsights.largeCrowd.winRate.toFixed(1)}% finalvinst vid 6+ spelare`
                  : playerInsights.crowdPreference === "introvert"
                  ? `${playerInsights.smallCrowd.winRate.toFixed(1)}% finalvinst vid <6 spelare`
                  : playerInsights.largeCrowd.games > 0 && playerInsights.smallCrowd.games > 0
                  ? `6+: ${playerInsights.largeCrowd.winRate.toFixed(0)}% · <6: ${playerInsights.smallCrowd.winRate.toFixed(0)}%`
                  : "För lite data"}
              </div>
            </div>
          </div>

          {/* Before/After lunch + Weekday breakdown - side by side on desktop */}
          <div className="md:grid md:grid-cols-2 md:gap-4 space-y-3 md:space-y-0">
          {/* Before/After lunch comparison bar */}
          {(playerInsights.beforeLunch.games > 0 || playerInsights.afterLunch.games > 0) && (
            <div
              className="p-3 rounded-lg border border-border"
              style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Före vs efter lunch
                </span>
                <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                  (kl 12:00)
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5" style={{ fontSize: "var(--text-sm)", color: "var(--warning)", fontFamily: "'Titillium Web', sans-serif" }}>
                      <Coffee className="w-3.5 h-3.5" /> Förmiddag
                    </span>
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", fontFamily: "'Titillium Web', sans-serif" }}>
                      {playerInsights.beforeLunch.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, playerInsights.beforeLunch.winRate)}%`,
                        background: "var(--warning)",
                      }}
                    />
                  </div>
                  <div className="text-muted-foreground mt-1" style={{ fontSize: "var(--text-xs)", fontFamily: "'Titillium Web', sans-serif" }}>
                    {playerInsights.beforeLunch.wins} vinster av {playerInsights.beforeLunch.games} finaler
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5" style={{ fontSize: "var(--text-sm)", color: "var(--info)", fontFamily: "'Titillium Web', sans-serif" }}>
                      <Sun className="w-3.5 h-3.5" /> Eftermiddag
                    </span>
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", fontFamily: "'Titillium Web', sans-serif" }}>
                      {playerInsights.afterLunch.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, playerInsights.afterLunch.winRate)}%`,
                        background: "var(--info)",
                      }}
                    />
                  </div>
                  <div className="text-muted-foreground mt-1" style={{ fontSize: "var(--text-xs)", fontFamily: "'Titillium Web', sans-serif" }}>
                    {playerInsights.afterLunch.wins} vinster av {playerInsights.afterLunch.games} finaler
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Weekday breakdown mini-chart */}
          {playerInsights.weekdays.some((d) => d.games > 0) && (
            <div
              className="p-3 rounded-lg border border-border"
              style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Per veckodag
                </span>
              </div>
              {/* Bar area — bars grow upward from bottom */}
              <div className="flex items-end gap-1.5" style={{ height: 56 }}>
                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                  const d = playerInsights.weekdays[dayIdx];
                  const maxGames = Math.max(...playerInsights.weekdays.map((w) => w.games), 1);
                  const barH = d.games > 0 ? Math.max(8, (d.games / maxGames) * 48) : 4;
                  const hasData = d.games > 0;
                  const isBest = playerInsights.bestWeekday?.day === d.day;
                  return (
                    <div
                      key={d.dayIndex}
                      className="flex-1"
                      title={
                        hasData
                          ? `${d.day}: ${d.wins} vinster av ${d.games} finaler (${d.winRate.toFixed(1)}%)`
                          : `${d.day}: Ingen data`
                      }
                    >
                      <div
                        className="w-full rounded-sm transition-all duration-300"
                        style={{
                          height: barH,
                          background: !hasData ? "var(--border)" : "var(--primary)",
                          opacity: !hasData ? 0.3 : isBest ? 1 : 0.4,
                          borderRadius: "var(--radius-sm)",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              {/* Percentage labels — separate row below bars */}
              <div className="flex gap-1.5 mt-1.5">
                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                  const d = playerInsights.weekdays[dayIdx];
                  const hasData = d.games > 0;
                  const isBest = playerInsights.bestWeekday?.day === d.day;
                  return (
                    <div key={`pct-${d.dayIndex}`} className="flex-1 text-center" style={{ minHeight: 12 }}>
                      {hasData && (
                        <span style={{
                          fontSize: "var(--text-xs)",
                          fontFamily: "'Titillium Web', sans-serif",
                          fontWeight: "var(--font-weight-semibold)",
                          color: isBest ? "var(--primary)" : "var(--muted-foreground)",
                          lineHeight: 1,
                        }}>
                          {d.winRate.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Day name labels — separate row below percentages */}
              <div className="flex gap-1.5 mt-0.5">
                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                  const d = playerInsights.weekdays[dayIdx];
                  const isBest = playerInsights.bestWeekday?.day === d.day;
                  return (
                    <div key={`lbl-${d.dayIndex}`} className="flex-1 text-center">
                      <span style={{
                        fontSize: "var(--text-xs)",
                        fontFamily: "'Titillium Web', sans-serif",
                        color: isBest ? "var(--primary)" : "var(--muted-foreground)",
                        fontWeight: isBest ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                        lineHeight: 1,
                      }}>
                        {d.dayShort}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <span className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                  Höjd = antal finaler
                </span>
                {playerInsights.peakHourLabel && (
                  <span className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                    <Clock className="w-3 h-3" />
                    Mest aktiv: {playerInsights.peakHourLabel}
                  </span>
                )}
              </div>
            </div>
          )}
          </div>{/* end 2-col grid for lunch + weekday */}

          {/* Worst weekday callout */}
          {playerInsights.worstWeekday && playerInsights.bestWeekday &&
            playerInsights.worstWeekday.day !== playerInsights.bestWeekday.day && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
              style={{
                background: "var(--surface-container-lowest)",
                borderColor: "var(--destructive)",
                borderRadius: "var(--radius-card)",
                opacity: 0.85,
              }}
            >
              <span style={{ fontSize: "var(--text-base)" }}>⚠️</span>
              <span className="text-muted-foreground" style={{ fontSize: "var(--text-sm)", lineHeight: 1.4 }}>
                Undvik <strong style={{ color: "var(--destructive)", fontWeight: "var(--font-weight-semibold)" }}>{playerInsights.worstWeekday.day}ar</strong> — bara{" "}
                {playerInsights.worstWeekday.winRate.toFixed(1)}% finalvinst jämfört med{" "}
                {playerInsights.bestWeekday.winRate.toFixed(1)}% på {playerInsights.bestWeekday.day}ar.
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
