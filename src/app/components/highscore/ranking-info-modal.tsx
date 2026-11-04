import { AnimatePresence, motion } from "motion/react";
import { X, BarChart3, Ruler, Target } from "lucide-react";

interface RankingInfoModalProps {
  showRankingInfoModal: boolean;
  setShowRankingInfoModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export function RankingInfoModal({
  showRankingInfoModal,
  setShowRankingInfoModal,
}: RankingInfoModalProps) {
  return (
    <>
      <AnimatePresence>
        {showRankingInfoModal && (
          <motion.div
            key="ranking-info-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowRankingInfoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-xl border border-border overflow-hidden"
              style={{ background: "var(--popover)", color: "var(--popover-foreground)", fontFamily: "'Titillium Web', sans-serif", boxShadow: "var(--elevation-sm)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h3 style={{ fontSize: "var(--text-h4)", fontWeight: "var(--font-weight-semibold)", fontFamily: "'Titillium Web', sans-serif", margin: 0 }}>
                  Månadsrankning
                </h3>
                <button onClick={() => setShowRankingInfoModal(false)} className="p-2 rounded-lg hover:opacity-80 transition-opacity cursor-pointer text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 overflow-y-auto" style={{ maxHeight: "70vh" }}>
                {/* Formula section */}
                <div className="mb-5">
                  <h4 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-semibold)", fontFamily: "'Titillium Web', sans-serif", margin: "0 0 8px 0" }}>
                    Viktat Elo-delta (Eff. Δ)
                  </h4>
                  <p style={{ fontSize: "var(--text-base)", fontFamily: "'Titillium Web', sans-serif", margin: "0 0 12px 0" }} className="text-muted-foreground">
                    Rankningen baseras på effektivitet, inte bara volym. Formeln är:
                  </p>
                  <div className="rounded-lg border border-border p-4 mb-4" style={{ background: "var(--surface-container-high)", fontFamily: "'Titillium Web', sans-serif" }}>
                    <p style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-bold)", textAlign: "center", margin: 0 }} className="text-primary">
                      Eff. Δ = Elo Δ / √rundor
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <BarChart3 className="w-5 h-5 shrink-0 text-primary" aria-hidden />
                      <p style={{ fontSize: "var(--text-sm)", fontFamily: "'Titillium Web', sans-serif", margin: 0 }} className="text-muted-foreground">
                        <strong className="text-foreground">Elo Δ</strong> = netto Elo-förändring under månaden
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Ruler className="w-5 h-5 shrink-0 text-primary" aria-hidden />
                      <p style={{ fontSize: "var(--text-sm)", fontFamily: "'Titillium Web', sans-serif", margin: 0 }} className="text-muted-foreground">
                        <strong className="text-foreground">√rundor</strong> = kvadratroten av antal spelade rundor, normaliserar för volym
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Target className="w-5 h-5 shrink-0 text-primary" aria-hidden />
                      <p style={{ fontSize: "var(--text-sm)", fontFamily: "'Titillium Web', sans-serif", margin: 0 }} className="text-muted-foreground">
                        <strong className="text-foreground">Minst 30 rundor</strong> under månaden krävs för att kvalificera som seedad
                      </p>
                    </div>
                  </div>
                </div>

                {/* Example section */}
                <div>
                  <h4 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-semibold)", fontFamily: "'Titillium Web', sans-serif", margin: "0 0 12px 0" }}>
                    Exempel
                  </h4>
                  <div className="flex flex-col gap-2 mb-3">
                    {[
                      { rank: "#1", name: "Lisa", delta: "Δ+45", rounds: "32r", eff: "8.0" },
                      { rank: "#2", name: "Erik", delta: "Δ+55", rounds: "60r", eff: "7.1" },
                      { rank: "#3", name: "Kalle", delta: "Δ+42", rounds: "50r", eff: "5.9" },
                    ].map((row) => (
                      <div
                        key={row.rank}
                        className="flex items-center gap-3 rounded-lg border border-border px-4 py-2.5"
                        style={{ background: row.rank === "#1" ? "var(--primary-container)" : "var(--surface-container)", fontFamily: "'Titillium Web', sans-serif" }}
                      >
                        <span style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-bold)", minWidth: "28px" }} className={row.rank === "#1" ? "text-primary" : "text-muted-foreground"}>
                          {row.rank}
                        </span>
                        <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", flex: 1 }} className="text-foreground">
                          {row.name}
                        </span>
                        <span style={{ fontSize: "var(--text-sm)" }} className="text-success">{row.delta}</span>
                        <span style={{ fontSize: "var(--text-sm)" }} className="text-muted-foreground">{row.rounds}</span>
                        <span style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-bold)" }} className="text-primary">{row.eff}</span>
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: "var(--text-sm)", fontFamily: "'Titillium Web', sans-serif", margin: "0 0 8px 0" }} className="text-muted-foreground">
                    Lisa rankas <strong className="text-foreground">#1</strong> — högst Eff. Δ trots lägre rått delta
                  </p>
                  <p style={{ fontSize: "var(--text-sm)", fontFamily: "'Titillium Web', sans-serif", margin: 0 }} className="text-muted-foreground">
                    Volym ger fortfarande fördel, men avtagande: 4× fler rundor kräver bara 2× högre delta för samma placering.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
