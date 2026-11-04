import { Shield, Target, Skull } from "lucide-react";
import type { PlayerStats } from "../../../lib/stats";
import type { RevengeTarget } from "../../../lib/insights";

interface ProfileRivalsProps {
  hasFormData: boolean;
  selectedPlayer: PlayerStats;
  revengeData: RevengeTarget[];
  h2hElo: Record<string, Record<string, number>>;
}

export function ProfileRivals({
  hasFormData,
  selectedPlayer,
  revengeData,
  h2hElo,
}: ProfileRivalsProps) {
  return (
    <>
      {hasFormData && (selectedPlayer.nemesis || selectedPlayer.prey) && (
        <div className="grid grid-cols-2 gap-3">
          {selectedPlayer.nemesis && (
            <div
              className="p-3 rounded-lg border border-destructive/20"
              style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
            >
              <div className="text-muted-foreground mb-1" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <Skull className="w-3 h-3 inline align-[-2px] mr-1" aria-hidden />Nemesis
              </div>
              <div className="text-destructive" style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>
                {selectedPlayer.nemesis}
              </div>
              {selectedPlayer.h2h[selectedPlayer.nemesis] && (
                <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                  {selectedPlayer.h2h[selectedPlayer.nemesis].wins}V – {selectedPlayer.h2h[selectedPlayer.nemesis].losses}F
                </div>
              )}
            </div>
          )}
          {selectedPlayer.prey && (
            <div
              className="p-3 rounded-lg border border-success/20"
              style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
            >
              <div className="text-muted-foreground mb-1" style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <Target className="w-3 h-3 inline align-[-2px] mr-1" aria-hidden />Favoritbyte
              </div>
              <div className="text-success" style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>
                {selectedPlayer.prey}
              </div>
              {selectedPlayer.h2h[selectedPlayer.prey] && (
                <div className="text-muted-foreground" style={{ fontSize: "var(--text-xs)" }}>
                  {selectedPlayer.h2h[selectedPlayer.prey].wins}V – {selectedPlayer.h2h[selectedPlayer.prey].losses}F
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Revenge Meter ── */}
      {revengeData.length > 0 && (
        <div>
          <span
            className="text-muted-foreground mb-2 block"
            style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> Ohämnade förluster
              <span
                className="px-1.5 py-0.5 rounded-full"
                style={{
                  fontSize: 10,
                  fontWeight: "var(--font-weight-bold)",
                  background: "color-mix(in srgb, var(--destructive) 15%, transparent)",
                  color: "var(--destructive)",
                }}
              >
                {revengeData.length}
              </span>
            </span>
          </span>
          <div className="space-y-1.5">
            {revengeData.slice(0, 5).map((rv) => {
              const dateStr = new Date(rv.lastLossDate).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
              const severity = rv.lossStreak >= 3 ? "high" : rv.lossStreak >= 2 ? "medium" : "low";
              return (
                <div
                  key={rv.opponent}
                  className="px-3 py-2.5 rounded-lg border"
                  style={{
                    background: "var(--surface-container-lowest)",
                    borderColor: severity === "high" ? "var(--destructive)" : severity === "medium" ? "color-mix(in srgb, var(--destructive) 40%, var(--border))" : "var(--border)",
                    borderRadius: "var(--radius-card)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Target
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: severity === "high" ? "var(--destructive)" : severity === "medium" ? "var(--warning)" : "var(--muted-foreground)" }}
                    />
                    <span
                      className="flex-1 truncate"
                      style={{
                        fontSize: "var(--text-label)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--foreground)",
                      }}
                    >
                      {rv.opponent}
                    </span>
                    <span
                      className="shrink-0 px-1.5 py-0.5 rounded-full"
                      style={{
                        fontSize: 10,
                        fontWeight: "var(--font-weight-bold)",
                        background: severity === "high"
                          ? "color-mix(in srgb, var(--destructive) 15%, transparent)"
                          : severity === "medium"
                          ? "color-mix(in srgb, var(--warning) 15%, transparent)"
                          : "color-mix(in srgb, var(--muted-foreground) 15%, transparent)",
                        color: severity === "high" ? "var(--destructive)" : severity === "medium" ? "var(--warning)" : "var(--muted-foreground)",
                      }}
                    >
                      {rv.lossStreak}× förlust i rad
                    </span>
                  </div>
                  {/* Mini revenge bar */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${rv.totalWins > 0 ? (rv.totalWins / (rv.totalWins + rv.totalLosses)) * 100 : 0}%`,
                          background: "var(--success)",
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                    <span
                      className="text-muted-foreground shrink-0"
                      style={{ fontSize: "var(--text-xs)" }}
                    >
                      {rv.totalWins}V–{rv.totalLosses}F
                    </span>
                    <span className="text-muted-foreground shrink-0" style={{ fontSize: "var(--text-xs)" }}>
                      · {dateStr}
                    </span>
                  </div>
                </div>
              );
            })}
            {revengeData.length > 5 && (
              <span className="text-muted-foreground block text-center" style={{ fontSize: "var(--text-xs)" }}>
                +{revengeData.length - 5} till
              </span>
            )}
          </div>
        </div>
      )}

      {/* Head-to-head records */}
      {hasFormData && Object.keys(selectedPlayer.h2h).length > 0 && (
        <div>
          <span
            className="text-muted-foreground mb-2 block"
            style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            Alla finalmöten
          </span>
          <div className="space-y-1.5 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
            {Object.entries(selectedPlayer.h2h)
              .sort(([, a], [, b]) => b.wins + b.losses - (a.wins + a.losses))
              .map(([opp, record]) => (
                <div
                  key={opp}
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
                >
                  <span
                    className="text-foreground"
                    style={{ fontSize: "var(--text-label)" }}
                  >
                    mot {opp}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        fontSize: "var(--text-label)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: record.wins >= record.losses ? "var(--success)" : "var(--destructive)",
                      }}
                    >
                      {record.wins}V – {record.losses}F
                    </span>
                    {h2hElo[selectedPlayer.name]?.[opp] !== undefined && h2hElo[selectedPlayer.name][opp] !== 0 && (
                      <span
                        title="Netto Elo vunnet/förlorat mot denna spelare"
                        style={{
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: h2hElo[selectedPlayer.name][opp] > 0 ? "var(--success)" : "var(--destructive)",
                          background: h2hElo[selectedPlayer.name][opp] > 0 ? "color-mix(in srgb, var(--success) 12%, transparent)" : "color-mix(in srgb, var(--destructive) 12%, transparent)",
                          padding: "1px 6px",
                          borderRadius: "var(--radius-card)",
                          cursor: "help",
                        }}
                      >
                        {h2hElo[selectedPlayer.name][opp] > 0 ? "+" : ""}{h2hElo[selectedPlayer.name][opp]} Elo
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
}
