import { motion } from "motion/react";
import { FONT } from "./constants";

// ── Stat card ──
export function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border p-3 md:p-4 flex flex-col gap-0.5 md:gap-1"
      style={{ background: "var(--surface-container)", borderRadius: "var(--radius-card)" }}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span style={{ fontSize: "var(--text-label)", fontFamily: FONT }}>{label}</span>
      </div>
      <span
        className="truncate"
        style={{
          fontSize: "var(--text-h4)",
          fontWeight: "var(--font-weight-semibold)",
          color: color || "var(--foreground)",
          fontFamily: FONT,
        }}
      >
        {value}
      </span>
      {sub && (
        <span
          className="text-muted-foreground"
          style={{ fontSize: "var(--text-sm)" }}
        >
          {sub}
        </span>
      )}
    </motion.div>
  );
}
