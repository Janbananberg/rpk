import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle } from "lucide-react";

const FONT = "'Titillium Web', sans-serif";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Bekräfta",
  cancelLabel = "Avbryt",
  variant = "warning",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDestructive = variant === "destructive";
  const accentVar = isDestructive ? "--destructive" : "--warning";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={onCancel}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-[var(--radius-card)] border p-5 flex flex-col gap-4"
            style={{
              background: "var(--surface-container-high)",
              borderColor: `color-mix(in srgb, var(${accentVar}) 30%, var(--border))`,
              boxShadow: `0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px color-mix(in srgb, var(${accentVar}) 10%, transparent)`,
            }}
          >
            {/* Icon + title */}
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: `color-mix(in srgb, var(${accentVar}) 15%, transparent)`,
                }}
              >
                <AlertTriangle
                  className="w-5 h-5"
                  style={{ color: `var(${accentVar})` }}
                />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-base)",
                    fontWeight: "var(--font-weight-bold)",
                    color: "var(--foreground)",
                  }}
                >
                  {title}
                </span>
                <span
                  className="text-muted-foreground"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-label)",
                    lineHeight: 1.5,
                  }}
                >
                  {message}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-[var(--radius-button)] border border-border/40 text-muted-foreground hover:text-foreground hover:border-border/60 transition-colors cursor-pointer"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-label)",
                  fontWeight: "var(--font-weight-semibold)",
                }}
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-[var(--radius-button)] border transition-all cursor-pointer"
                style={{
                  fontFamily: FONT,
                  fontSize: "var(--text-label)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: `var(${accentVar})`,
                  background: `color-mix(in srgb, var(${accentVar}) 10%, transparent)`,
                  borderColor: `color-mix(in srgb, var(${accentVar}) 30%, var(--border))`,
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
