import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lightbulb, Send, Check, ChevronDown } from "lucide-react";
import { fetchSuggestions, submitSuggestion } from "./api";
import type { Suggestion } from "./api";

const FONT = "'Titillium Web', sans-serif";

const CATEGORIES = [
  "Ny funktion",
  "Förbättring",
  "Bugg / Problem",
  "Design / UI",
  "Allmänt",
];

export function SuggestionsPage() {
  const [text, setText] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showPrevious, setShowPrevious] = useState(false);

  useEffect(() => {
    fetchSuggestions().then(setSuggestions);
  }, []);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    setError("");

    const result = await submitSuggestion({ name: "Anonym", text: text.trim(), category });
    if (result.ok) {
      setSubmitted(true);
      setText("");
      setTimeout(() => setSubmitted(false), 3000);
      // Refresh list
      const updated = await fetchSuggestions();
      setSuggestions(updated);
    } else {
      setError(result.error || "Kunde inte skicka in");
    }
    setSubmitting(false);
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "new": return "Ny";
      case "read": return "Läst";
      case "planned": return "Planerad";
      case "done": return "Klar";
      case "rejected": return "Avvisad";
      default: return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "new": return "var(--primary)";
      case "read": return "var(--muted-foreground)";
      case "planned": return "var(--info)";
      case "done": return "var(--success)";
      case "rejected": return "var(--destructive)";
      default: return "var(--muted-foreground)";
    }
  };

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "var(--primary-container)" }}
          >
            <Lightbulb className="w-6 h-6" style={{ color: "var(--on-primary-container)" }} />
          </div>
          <h2
            className="text-foreground"
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-h3)",
              fontWeight: "var(--font-weight-bold)",
            }}
          >
            Förslag & Feedback
          </h2>
          <p
            className="text-muted-foreground"
            style={{ fontFamily: FONT, fontSize: "var(--text-base)" }}
          >
            Har du en idé, vill ha en ny funktion, eller hittat något som kan förbättras? Skicka in ditt förslag!
          </p>
        </div>

        {/* Form */}
        <div
          className="rounded-[var(--radius-card)] border border-border/50 p-5 flex flex-col gap-4"
          style={{ background: "var(--surface-container-low)" }}
        >
          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label
              style={{
                fontFamily: FONT,
                fontSize: "var(--text-label)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--muted-foreground)",
              }}
            >
              Kategori
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-[var(--radius-card)] border border-border bg-surface-container text-foreground outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                style={{ fontFamily: FONT, fontSize: "var(--text-base)" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: "var(--muted-foreground)" }}
              />
            </div>
          </div>

          {/* Text */}
          <div className="flex flex-col gap-1.5">
            <label
              style={{
                fontFamily: FONT,
                fontSize: "var(--text-label)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--muted-foreground)",
              }}
            >
              Ditt förslag
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Beskriv din idé eller ditt förslag..."
              maxLength={1000}
              rows={4}
              className="w-full px-4 py-2.5 rounded-[var(--radius-card)] border border-border bg-surface-container text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary transition-colors resize-none"
              style={{ fontFamily: FONT, fontSize: "var(--text-base)" }}
            />
            <span
              className="self-end"
              style={{
                fontFamily: FONT,
                fontSize: "var(--text-xs)",
                color: text.length > 900 ? "var(--destructive)" : "var(--muted-foreground)",
              }}
            >
              {text.length}/1000
            </span>
          </div>

          {/* Error */}
          {error && (
            <p style={{ fontFamily: FONT, fontSize: "var(--text-label)", color: "var(--destructive)" }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !text.trim()}
            className="self-start flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-button)] bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed"
            style={{
              fontFamily: FONT,
              fontSize: "var(--text-label)",
              fontWeight: "var(--font-weight-semibold)",
            }}
          >
            {submitted ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {submitted ? "Inskickat!" : submitting ? "Skickar..." : "Skicka in"}
          </button>
        </div>

        {/* Success toast */}
        <AnimatePresence>
          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-[var(--radius-button)] bg-primary text-primary-foreground shadow-lg flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span style={{ fontFamily: FONT, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>
                Tack för ditt förslag!
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Previous suggestions */}
        {suggestions.length > 0 && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowPrevious(!showPrevious)}
              className="flex items-center gap-2 cursor-pointer self-start"
              style={{
                fontFamily: FONT,
                fontSize: "var(--text-label)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--muted-foreground)",
                background: "none",
                border: "none",
                padding: 0,
              }}
            >
              <ChevronDown
                className="w-4 h-4 transition-transform"
                style={{ transform: showPrevious ? "rotate(180deg)" : "rotate(0deg)" }}
              />
              Inskickade förslag ({suggestions.length})
            </button>

            <AnimatePresence>
              {showPrevious && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-2 overflow-hidden"
                >
                  {suggestions.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-[var(--radius-card)] border border-border/50 p-4 flex flex-col gap-2"
                      style={{ background: "var(--surface-container)" }}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              fontFamily: FONT,
                              fontSize: "var(--text-label)",
                              fontWeight: "var(--font-weight-semibold)",
                              color: "var(--foreground)",
                            }}
                          >
                            {s.name}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-[var(--radius-button)]"
                            style={{
                              fontFamily: FONT,
                              fontSize: "var(--text-xs)",
                              fontWeight: "var(--font-weight-semibold)",
                              background: "var(--muted)",
                              color: "var(--muted-foreground)",
                            }}
                          >
                            {s.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded-[var(--radius-button)]"
                            style={{
                              fontFamily: FONT,
                              fontSize: "var(--text-xs)",
                              fontWeight: "var(--font-weight-semibold)",
                              color: statusColor(s.status),
                              border: `1px solid ${statusColor(s.status)}`,
                              opacity: 0.8,
                            }}
                          >
                            {statusLabel(s.status)}
                          </span>
                          <span
                            style={{
                              fontFamily: FONT,
                              fontSize: "var(--text-xs)",
                              color: "var(--muted-foreground)",
                            }}
                          >
                            {new Date(s.timestamp).toLocaleDateString("sv-SE")}
                          </span>
                        </div>
                      </div>
                      <p
                        style={{
                          fontFamily: FONT,
                          fontSize: "var(--text-base)",
                          color: "var(--foreground)",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {s.text}
                      </p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}