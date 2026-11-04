import { Check, Palette } from "lucide-react";
import { API_BASE } from "./api";
import { THEMES, useTheme } from "../theme";

/** Admin setting: picks the color theme for the whole app. */
export function ThemePicker() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="rounded-[var(--radius-card)] border border-border/50 p-5 flex flex-col gap-4" style={{ background: "var(--surface-container-low)" }}>
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-primary" />
        <span className="text-foreground" style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}>
          Tema
        </span>
      </div>
      <p className="text-muted-foreground" style={{ fontSize: "var(--text-label)" }}>
        {API_BASE
          ? "Gäller för alla som använder appen."
          : "Sparas bara i den här webbläsaren tills appen har en backend."}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {THEMES.map((option) => {
          const active = option.id === theme;
          return (
            <button
              key={option.id}
              onClick={() => setTheme(option.id)}
              aria-pressed={active}
              className={`flex items-center gap-3 p-3 rounded-[var(--radius-card)] border text-left transition-all cursor-pointer ${
                active ? "border-primary bg-primary/10" : "border-border/50 hover:border-border-strong"
              }`}
            >
              <span className="flex shrink-0 overflow-hidden rounded-md border border-border/50" aria-hidden>
                {option.swatch.map((color) => (
                  <span key={color} className="w-4 h-9" style={{ background: color }} />
                ))}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-foreground" style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>
                  {option.label}
                </span>
                <span className="block text-muted-foreground" style={{ fontSize: "var(--text-sm)" }}>
                  {option.description}
                </span>
              </span>
              {active && <Check className="w-4 h-4 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
