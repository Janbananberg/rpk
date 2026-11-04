import { CalendarDays, BarChart3, Archive, ChevronDown, Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { formatMonthShort, formatMonthLabel } from "../../lib/dates";

interface MonthPickerProps {
  monthList: string[];
  currentMonth: string;
  selectedMonth: string;
  setSelectedMonth: React.Dispatch<React.SetStateAction<string>>;
  setMonthPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  monthPickerRef: React.RefObject<HTMLDivElement>;
  monthPickerOpen: boolean;
}

export function MonthPicker({
  monthList,
  currentMonth,
  selectedMonth,
  setSelectedMonth,
  setMonthPickerOpen,
  monthPickerRef,
  monthPickerOpen,
}: MonthPickerProps) {
  return (
    <>
      {monthList.length > 0 && (() => {
        const pastMonths = [...monthList].filter(m => m !== currentMonth).sort().reverse();
        const isViewingPast = typeof selectedMonth === "string" && selectedMonth !== "total" && selectedMonth !== currentMonth;
        return (
          <div className="flex items-center gap-2 mb-6 md:mb-8">
            <style>{`
              @keyframes pulse-live {
                0%, 100% { opacity: 1; box-shadow: 0 0 4px var(--success); }
                50% { opacity: 0.5; box-shadow: 0 0 8px var(--success); }
              }
            `}</style>
            {/* Segmented control */}
            <div
              className="flex items-center rounded-xl border"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface-container-low)",
                backdropFilter: "blur(12px)",
                padding: 4,
                gap: 3,
                boxShadow: "var(--elevation-sm)",
              }}
            >
              {/* Current month */}
              <button
                onClick={() => { setSelectedMonth(currentMonth); setMonthPickerOpen(false); }}
                className="cursor-pointer transition-all"
                style={{
                  fontSize: "var(--text-label)",
                  fontWeight: "var(--font-weight-semibold)",
                  padding: "7px 14px",
                  color: selectedMonth === currentMonth ? "var(--on-primary-container)" : "var(--muted-foreground)",
                  background: selectedMonth === currentMonth ? "var(--primary-container)" : "transparent",
                  border: "none",
                  borderRadius: "9px",
                  boxShadow: selectedMonth === currentMonth ? "var(--elevation-sm)" : "none",
                }}
              >
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {formatMonthShort(currentMonth)}
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--success)",
                      display: "inline-block",
                      animation: "pulse-live 2s ease-in-out infinite",
                    }}
                  />
                </span>
              </button>

              {/* Totalt */}
              <button
                onClick={() => { setSelectedMonth("total"); setMonthPickerOpen(false); }}
                className="cursor-pointer transition-all"
                style={{
                  fontSize: "var(--text-label)",
                  fontWeight: "var(--font-weight-semibold)",
                  padding: "7px 14px",
                  color: selectedMonth === "total" ? "var(--on-primary-container)" : "var(--muted-foreground)",
                  background: selectedMonth === "total" ? "var(--primary-container)" : "transparent",
                  border: "none",
                  borderRadius: "9px",
                  boxShadow: selectedMonth === "total" ? "var(--elevation-sm)" : "none",
                }}
              >
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Totalt
                </span>
              </button>

              {/* Historik dropdown trigger */}
              {pastMonths.length > 0 && (
                <div className="relative" ref={monthPickerRef}>
                  <button
                    onClick={() => setMonthPickerOpen(!monthPickerOpen)}
                    className="cursor-pointer transition-all"
                    style={{
                      fontSize: "var(--text-label)",
                      fontWeight: "var(--font-weight-semibold)",
                      padding: "7px 14px",
                      color: isViewingPast ? "var(--on-primary-container)" : "var(--muted-foreground)",
                      background: isViewingPast ? "var(--primary-container)" : "transparent",
                      border: "none",
                      borderRadius: "9px",
                      boxShadow: isViewingPast ? "var(--elevation-sm)" : "none",
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      <Archive className="w-3.5 h-3.5" />
                      {isViewingPast ? formatMonthShort(selectedMonth) : "Historik"}
                      <ChevronDown
                        className="w-3 h-3 transition-transform"
                        style={{ transform: monthPickerOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                      />
                    </span>
                  </button>

                  {/* Dropdown menu */}
                  <AnimatePresence>
                    {monthPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-1.5 z-50 rounded-xl border"
                        style={{
                          background: "var(--surface-container-high)",
                          borderColor: "var(--border)",
                          backdropFilter: "blur(16px)",
                          minWidth: 200,
                          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          className="py-1.5 px-1.5"
                          style={{ display: "flex", flexDirection: "column", gap: 2 }}
                        >
                          {pastMonths.map((month) => {
                            const isActive = selectedMonth === month;
                            return (
                              <button
                                key={month}
                                onClick={() => { setSelectedMonth(month); setMonthPickerOpen(false); }}
                                className="w-full text-left cursor-pointer transition-colors"
                                style={{
                                  fontSize: "var(--text-label)",
                                  fontWeight: isActive ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                                  padding: "9px 12px",
                                  color: isActive ? "var(--on-primary-container)" : "var(--foreground)",
                                  background: isActive ? "var(--primary-container)" : "transparent",
                                  border: "none",
                                  borderRadius: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--surface-container)"; }}
                                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                              >
                                <CalendarDays className="w-3.5 h-3.5 shrink-0" style={{ opacity: 0.5 }} />
                                <span className="flex-1">{formatMonthLabel(month)}</span>
                                {isActive && (
                                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--primary)" }} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </>
  );
}
