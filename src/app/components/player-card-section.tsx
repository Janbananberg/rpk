import React from "react";

const FONT = "'Titillium Web', sans-serif";

interface PlayerCardSectionProps {
  /** Optional section title shown as an uppercase label */
  title?: string;
  /** Optional icon rendered left of the title */
  icon?: React.ReactNode;
  /** Optional accent color for the icon dot / left border accent */
  accent?: string;
  /** Content */
  children: React.ReactNode;
  /** Extra className for the outer wrapper */
  className?: string;
  /** If true, renders children without the card wrapper (useful for already-styled compound cards) */
  bare?: boolean;
  /** If true, adds a subtle left accent border */
  accentBorder?: boolean;
}

/**
 * Visual grouping wrapper for the player detail card.
 * Provides a consistent section header + container adhering to the LKAB Holken DB design system.
 */
export function PlayerCardSection({
  title,
  icon,
  accent,
  children,
  className = "",
  bare = false,
  accentBorder = false,
}: PlayerCardSectionProps) {
  return (
    <div className={className}>
      {title && (
        <div className="flex items-center gap-1.5 mb-2">
          {icon && (
            <span style={{ color: accent || "var(--muted-foreground)" }}>
              {icon}
            </span>
          )}
          {!icon && accent && (
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: accent }}
            />
          )}
          <span
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-xs)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--muted-foreground)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              lineHeight: 1,
            }}
          >
            {title}
          </span>
        </div>
      )}
      {bare ? (
        children
      ) : (
        <div
          className="rounded-xl border border-border overflow-hidden"
          style={{
            background: "var(--surface-container-low)",
            borderRadius: "var(--radius-card)",
            borderLeft: accentBorder && accent
              ? `3px solid ${accent}`
              : undefined,
          }}
        >
          <div className="p-3 space-y-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
