import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";

const EMOJI_GROUPS = [
  {
    label: "Sport",
    emojis: ["🏓", "🏆", "🥇", "🥈", "🥉", "⚽", "🏀", "🎾", "🏐", "🎯", "🔥", "⭐", "💪", "🎉"],
  },
  {
    label: "Ansikten",
    emojis: ["😀", "😎", "🤩", "😤", "🥳", "😈", "🤯", "💀", "👻", "🤖", "👑", "🦊", "🐉", "🦅"],
  },
  {
    label: "Flaggor",
    emojis: ["🇸🇪", "🇳🇴", "🇩🇰", "🇫🇮", "🇩🇪", "🇬🇧", "🇺🇸", "🇫🇷", "🇪🇸", "🇮🇹", "🇧🇷", "🇯🇵", "🇰🇷", "🇨🇳"],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 cursor-pointer"
        title="Lägg till emoji"
      >
        <Smile className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-[240px] p-3 rounded-[var(--radius-card)] bg-surface-container-high border border-border shadow-[var(--elevation-sm)] backdrop-blur-xl">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label} className="mb-2 last:mb-0">
              <span
                className="block mb-1 text-muted-foreground"
                style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}
              >
                {group.label}
              </span>
              <div className="flex flex-wrap gap-1">
                {group.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onSelect(emoji);
                      setOpen(false);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-primary/15 transition-colors duration-150 cursor-pointer"
                    style={{ fontSize: "var(--text-lg)" }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}