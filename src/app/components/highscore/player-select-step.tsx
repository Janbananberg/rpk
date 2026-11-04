import { useState } from "react";
import { Check, Clock, Trophy, Users, X } from "lucide-react";
import { motion } from "motion/react";
import type { PlayerStats } from "../../lib/stats";
import { EloSparkline } from "./elo-sparkline";
import { FormDots } from "./form-dots";

// ── Player Select Step Component ──
export function PlayerSelectStep({
  allKnownPlayers,
  selectedPlayers,
  setSelectedPlayers,
  togglePlayer,
  proceedToFinalists,
  allSelected,
  lastPlayers,
  statsMap,
  eloRatings,
  eloHistory,
}: {
  allKnownPlayers: string[];
  selectedPlayers: string[];
  setSelectedPlayers: React.Dispatch<React.SetStateAction<string[]>>;
  togglePlayer: (name: string) => void;
  proceedToFinalists: () => void;
  allSelected: boolean;
  lastPlayers: string[];
  statsMap: Record<string, PlayerStats | undefined>;
  eloRatings: Record<string, { elo: number; delta: number }>;
  eloHistory: Record<string, number[]>;
}) {
  const [playerSearch, setPlayerSearch] = useState("");
  const filtered = playerSearch.trim()
    ? allKnownPlayers.filter((n) => n.toLowerCase().includes(playerSearch.trim().toLowerCase()))
    : allKnownPlayers;

  return (
    <div>
      <h3
        className="text-foreground mb-1"
        style={{
          fontSize: "var(--text-h4)",
          fontWeight: "var(--font-weight-semibold)",
        }}
      >
        Vilka spelar?
      </h3>
      <p
        className="text-muted-foreground mb-4"
        style={{ fontSize: "var(--text-label)" }}
      >
        Välj alla spelare som deltar
      </p>

      {/* Quick actions row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => {
            if (allSelected) {
              setSelectedPlayers([]);
            } else {
              setSelectedPlayers([...allKnownPlayers]);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border hover:border-border-strong transition-all cursor-pointer"
          style={{
            background: "var(--surface-container)",
            borderRadius: "var(--radius-full, 9999px)",
            fontSize: "var(--text-sm)",
            color: "var(--foreground)",
          }}
        >
          {allSelected ? (
            <><X className="w-3.5 h-3.5 text-muted-foreground" /> Avmarkera alla</>
          ) : (
            <><Check className="w-3.5 h-3.5 text-muted-foreground" /> Välj alla</>
          )}
        </button>
        {lastPlayers.length >= 2 && (
          <button
            onClick={() => {
              const valid = lastPlayers.filter((p) => allKnownPlayers.includes(p));
              if (valid.length >= 2) setSelectedPlayers(valid);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border hover:border-border-strong transition-all cursor-pointer"
            style={{
              background: "var(--surface-container)",
              borderRadius: "var(--radius-full, 9999px)",
              fontSize: "var(--text-sm)",
              color: "var(--foreground)",
            }}
          >
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            Senaste ({lastPlayers.length})
          </button>
        )}
      </div>

      {/* Search filter (show if many players) */}
      {allKnownPlayers.length > 6 && (
        <div className="relative mb-3">
          <input
            type="text"
            value={playerSearch}
            onChange={(e) => setPlayerSearch(e.target.value)}
            placeholder="Sök spelare…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            style={{
              fontSize: "var(--text-sm)",
              background: "var(--surface-container-low, var(--surface-container))",
              borderRadius: "var(--radius-card)",
            }}
          />
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          {playerSearch && (
            <button
              onClick={() => setPlayerSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted/30 cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      {/* Player grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map((name) => {
          const selected = selectedPlayers.includes(name);
          const ps = statsMap[name];
          const elo = eloRatings[name]?.elo;
          const eloHist = eloHistory[name];
          return (
            <motion.button
              key={name}
              whileTap={{ scale: 0.97 }}
              onClick={() => togglePlayer(name)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-border-strong"
              }`}
              style={{
                background: selected ? undefined : "var(--surface-container)",
                borderRadius: "var(--radius-card)",
              }}
            >
              {/* Checkbox */}
              <div
                className={`w-5 h-5 rounded flex items-center justify-center border transition-all shrink-0 ${
                  selected ? "bg-primary border-primary" : "border-border-strong"
                }`}
                style={{ borderRadius: "var(--radius-badge, 4px)" }}
              >
                {selected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
              </div>

              {/* Name + stats */}
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span
                  className="text-foreground truncate w-full text-left"
                  style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-medium, 500)" }}
                >
                  {name}
                </span>
                {ps && ps.gamesPlayed > 0 ? (
                  <span
                    className="text-muted-foreground flex items-center gap-1.5 mt-0.5"
                    style={{ fontSize: "var(--text-xs)" }}
                  >
                    <Trophy className="w-3 h-3 shrink-0" />
                    {ps.wins}V
                    <span className="opacity-50">&middot;</span>
                    {ps.gamesPlayed}S
                    <span className="opacity-50">&middot;</span>
                    {elo ?? 1000}
                  </span>
                ) : (
                  <span
                    className="text-muted-foreground flex items-center gap-1.5 mt-0.5"
                    style={{ fontSize: "var(--text-xs)" }}
                  >
                    Elo {elo ?? 1000}
                  </span>
                )}
              </div>

              {/* Mini sparkline + form */}
              <div className="flex items-center gap-2 shrink-0">
                {ps && ps.recentForm.length > 0 && (
                  <FormDots form={ps.recentForm} />
                )}
                {eloHist && eloHist.length >= 2 && (
                  <EloSparkline data={eloHist} width={36} height={14} strokeWidth={1} />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* No results */}
      {filtered.length === 0 && playerSearch.trim() && (
        <p
          className="text-center text-muted-foreground py-6"
          style={{ fontSize: "var(--text-sm)" }}
        >
          Ingen spelare matchar &ldquo;{playerSearch}&rdquo;
        </p>
      )}

      {/* Continue button */}
      <div className="mt-6">
        <button
          onClick={proceedToFinalists}
          disabled={selectedPlayers.length < 5}
          className="w-full py-3 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            fontSize: "var(--text-label)",
            fontWeight: "var(--font-weight-semibold)",
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            borderRadius: "var(--radius-card)",
          }}
        >
          Fortsätt ({selectedPlayers.length} valda, minst 5)
        </button>
      </div>
    </div>
  );
}
