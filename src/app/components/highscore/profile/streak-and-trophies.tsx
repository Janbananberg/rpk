import { Flame, Trophy } from "lucide-react";
import type { PlayerStats } from "../../../lib/stats";
import { FONT } from "../constants";

interface ProfileStreakAndTrophiesProps {
  hasStreakData: boolean;
  selectedPlayer: PlayerStats;
  handleRemoveCard: (name: string, type: "yellow" | "red") => Promise<void>;
  handleGiveCard: (name: string, type: "yellow" | "red") => Promise<void>;
}

export function ProfileStreakAndTrophies({
  hasStreakData,
  selectedPlayer,
  handleRemoveCard,
  handleGiveCard,
}: ProfileStreakAndTrophiesProps) {
  return (
    <>
      {hasStreakData && selectedPlayer.bestStreak > 0 && (
        <div
          className="relative overflow-hidden rounded-lg border border-border"
          style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
        >
          {/* Warm gradient accent strip */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--warning) 10%, transparent) 0%, transparent 60%)",
            }}
          />
          <div className="relative flex items-center gap-3 px-4 py-3">
            {/* Icon badge */}
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-card)",
                background: "color-mix(in srgb, var(--warning) 12%, transparent)",
              }}
            >
              <Flame className="w-[18px] h-[18px] text-warning" />
            </div>
            {/* Text content */}
            <div className="flex flex-col gap-0.5 min-w-0">
              <span
                className="text-muted-foreground"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-xs)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Bästa streak
              </span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-warning"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-lg)",
                    fontWeight: "var(--font-weight-bold)",
                    lineHeight: 1.1,
                  }}
                >
                  {selectedPlayer.bestStreak}
                </span>
                <span
                  className="text-muted-foreground"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-label)",
                  }}
                >
                  raka vinster
                </span>
              </div>
            </div>
            {/* Visual flame repeaters */}
            <div className="ml-auto flex items-center gap-0.5 shrink-0">
              {Array.from({ length: Math.min(selectedPlayer.bestStreak, 7) }).map((_, i) => (
                <Flame
                  key={i}
                  className="text-warning"
                  style={{
                    width: 10 + i * 1.5,
                    height: 10 + i * 1.5,
                    opacity: 0.25 + (i / Math.min(selectedPlayer.bestStreak, 7)) * 0.75,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tournament Wins section ── */}
      {selectedPlayer.tournamentWins > 0 && (
        <div>
          <span
            className="text-muted-foreground mb-2 block"
            style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT }}
          >
            Turneringsvinster
          </span>
          <div
            className="p-3 rounded-lg border border-border"
            style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
              >
                <Trophy className="w-5 h-5" style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-h4)",
                    fontWeight: "var(--font-weight-bold)",
                    color: "var(--primary)",
                    lineHeight: 1.1,
                  }}
                >
                  {selectedPlayer.tournamentWins}
                </div>
                <div
                  className="text-muted-foreground"
                  style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}
                >
                  {selectedPlayer.tournamentWins === 1 ? "turnering vunnen" : "turneringar vunna"}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              {selectedPlayer.tournamentEntries.map((t) => {
                const d = new Date(t.date);
                const dateStr = d.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{ background: "var(--surface-container)", borderRadius: "var(--radius-sm)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: "var(--text-base)" }}>🏆</span>
                      <span
                        className="text-foreground"
                        style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
                      >
                        Mästare
                      </span>
                    </div>
                    <span
                      className="text-muted-foreground"
                      style={{ fontFamily: FONT, fontSize: "var(--text-xs)" }}
                    >
                      {dateStr}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Cards section ── */}
      <div>
        <span
          className="text-muted-foreground mb-2 block"
          style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}
        >
          Kort
        </span>
        <div className="flex items-center gap-3">
          {/* Yellow card */}
          <div
            className="flex items-center gap-2 p-3 rounded-lg border border-border flex-1"
            style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
          >
            <div
              className="w-5 h-7 rounded-sm"
              style={{ background: "var(--warning)", borderRadius: "2px" }}
            />
            <span
              style={{ fontSize: "var(--text-h4)", fontWeight: "var(--font-weight-semibold)", color: "var(--warning)" }}
            >
              {selectedPlayer.yellowCards}
            </span>
            <div className="ml-auto flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveCard(selectedPlayer.name, "yellow"); }}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ fontSize: "var(--text-base)", borderRadius: "var(--radius-card)" }}
                disabled={selectedPlayer.yellowCards === 0}
              >
                −
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleGiveCard(selectedPlayer.name, "yellow"); }}
                className="w-6 h-6 rounded flex items-center justify-center text-warning hover:bg-warning/20 transition-colors cursor-pointer"
                style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", borderRadius: "var(--radius-card)" }}
              >
                +
              </button>
            </div>
          </div>
          {/* Red card */}
          <div
            className="flex items-center gap-2 p-3 rounded-lg border border-border flex-1"
            style={{ background: "var(--surface-container-lowest)", borderRadius: "var(--radius-card)" }}
          >
            <div
              className="w-5 h-7 rounded-sm"
              style={{ background: "var(--destructive)", borderRadius: "2px" }}
            />
            <span
              style={{ fontSize: "var(--text-h4)", fontWeight: "var(--font-weight-semibold)", color: "var(--destructive)" }}
            >
              {selectedPlayer.redCards}
            </span>
            <div className="ml-auto flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveCard(selectedPlayer.name, "red"); }}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ fontSize: "var(--text-base)", borderRadius: "var(--radius-card)" }}
                disabled={selectedPlayer.redCards === 0}
              >
                −
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleGiveCard(selectedPlayer.name, "red"); }}
                className="w-6 h-6 rounded flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", borderRadius: "var(--radius-card)" }}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
