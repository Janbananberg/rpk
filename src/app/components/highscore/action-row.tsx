import { Users, Code2, Download } from "lucide-react";
import type { PlayerStats } from "../../lib/stats";
import { FONT } from "./constants";

interface ActionRowProps {
  sortedStats: PlayerStats[];
  isViewingCurrentMonth: boolean;
  setShowAddPlayer: React.Dispatch<React.SetStateAction<boolean>>;
  setShowApiModal: React.Dispatch<React.SetStateAction<boolean>>;
  exportStatsCsv: () => void;
  selectedMonth: string;
}

export function ActionRow({
  sortedStats,
  isViewingCurrentMonth,
  setShowAddPlayer,
  setShowApiModal,
  exportStatsCsv,
  selectedMonth,
}: ActionRowProps) {
  return (
    <>
      {(isViewingCurrentMonth || sortedStats.length > 0) && (
        <div className="flex items-center justify-between mt-3 mb-4" style={{ order: 3 }}>
          <div>
            {isViewingCurrentMonth && (
              <button
                onClick={() => setShowAddPlayer(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-border-strong transition-all cursor-pointer"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--font-weight-semibold)" as any,
                  borderRadius: "var(--radius-button)",
                }}
              >
                <Users className="w-4 h-4" />
                Lägg till spelare
              </button>
            )}
          </div>
          {sortedStats.length > 0 && (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setShowApiModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border transition-all cursor-pointer hover:opacity-80"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--font-weight-semibold)" as any,
                  color: "var(--foreground)",
                  background: "var(--surface-container-high)",
                  borderRadius: "var(--radius-button)",
                }}
              >
                <Code2 className="w-4 h-4" />
                API
              </button>
              <button
                onClick={exportStatsCsv}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border transition-all cursor-pointer hover:opacity-80"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--font-weight-semibold)" as any,
                  color: "var(--foreground)",
                  background: "var(--surface-container-high)",
                  borderRadius: "var(--radius-button)",
                }}
              >
                <Download className="w-4 h-4" />
                Exportera CSV{selectedMonth === "total" ? " (Totalt)" : ` (${selectedMonth})`}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
