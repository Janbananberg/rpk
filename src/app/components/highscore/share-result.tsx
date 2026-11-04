import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Download, Share2, X } from "lucide-react";
import type { GameSession } from "../api";
import { buildResultCardData } from "../../lib/result-card";
import { canvasToPng, drawResultCard } from "./result-card-canvas";

// "Dela resultat": offered right after a session is saved. Renders the result card as a PNG
// that can be downloaded or copied straight into Teams.

interface ShareResultPromptProps {
  /** The session that was just saved, or null when there is nothing to share. */
  session: GameSession | null;
  allSessions: GameSession[];
  players: string[];
  eloResetTimestamp: number | null;
  onDismiss: () => void;
}

const PROMPT_TIMEOUT_MS = 2 * 60_000;

const canCopyImage = () =>
  typeof window !== "undefined" && typeof window.ClipboardItem !== "undefined" && !!navigator.clipboard?.write;

export function ShareResultPrompt({ session, allSessions, players, eloResetTimestamp, onDismiss }: ShareResultPromptProps) {
  const [open, setOpen] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // The offer goes away by itself after a while; an open dialog keeps it.
  useEffect(() => {
    if (!session || open) return;
    const timer = setTimeout(() => onDismissRef.current(), PROMPT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [session, open]);

  return (
    <>
      <AnimatePresence>
        {session && !open && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-36 md:bottom-6 z-40 flex items-center gap-2 pl-4 pr-2 py-2 rounded-full border"
            style={{
              background: "var(--surface-container-high)",
              borderColor: "color-mix(in srgb, var(--primary) 35%, var(--border))",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            }}
          >
            <span className="text-muted-foreground whitespace-nowrap" style={{ fontSize: "var(--text-label)" }}>
              Omgången är sparad
            </span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-opacity hover:opacity-90 whitespace-nowrap"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                fontSize: "var(--text-label)",
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              <Share2 className="w-4 h-4" />
              Dela resultat
            </button>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Stäng"
              className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {session && open && (
        <ShareResultDialog
          session={session}
          allSessions={allSessions}
          players={players}
          eloResetTimestamp={eloResetTimestamp}
          onClose={() => {
            setOpen(false);
            onDismiss();
          }}
        />
      )}
    </>
  );
}

interface ShareResultDialogProps {
  session: GameSession;
  allSessions: GameSession[];
  players: string[];
  eloResetTimestamp: number | null;
  onClose: () => void;
}

function ShareResultDialog({ session, allSessions, players, eloResetTimestamp, onClose }: ShareResultDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobRef = useRef<Promise<Blob> | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  // Snapshot when the dialog opens, so a background poll doesn't redraw the card under the user.
  const [data] = useState(() => buildResultCardData(session, allSessions, players, eloResetTimestamp));

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = drawResultCard(canvas, data).then(() => canvasToPng(canvas));
    blobRef.current = blob;
    blob
      .then((b) => {
        if (cancelled) return;
        url = URL.createObjectURL(b);
        setPreviewUrl(url);
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [data]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fileName = `rundpingis-resultat-${new Date(session.date).toISOString().slice(0, 10)}.png`;

  const download = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = fileName;
    a.click();
  };

  const copy = async () => {
    if (!blobRef.current) return;
    try {
      // Hand the clipboard a promise so Safari still sees the click as the user gesture.
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blobRef.current })]);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  };

  const buttonStyle = {
    fontSize: "var(--text-label)",
    fontWeight: "var(--font-weight-semibold)",
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Dela resultat"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-full overflow-y-auto rounded-[var(--radius-card)] border p-4 md:p-5 flex flex-col gap-4"
        style={{ background: "var(--surface-container-high)", borderColor: "var(--border)", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-bold)", color: "var(--foreground)" }}>
            Dela resultat
          </span>
          <button type="button" onClick={onClose} aria-label="Stäng" className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* The canvas is the renderer; the <img> shows its PNG so it scales and can be right-clicked. */}
        <canvas ref={canvasRef} className="hidden" />
        <div className="rounded-[var(--radius-card)] overflow-hidden border border-border" style={{ background: "var(--surface-container-lowest)" }}>
          {previewUrl ? (
            <img src={previewUrl} alt="Resultatkort för omgången" className="block w-full h-auto" />
          ) : (
            <div className="flex items-center justify-center" style={{ aspectRatio: "16 / 10" }}>
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {status === "copied" && (
            <span className="flex items-center gap-1 mr-auto" style={{ fontSize: "var(--text-label)", color: "var(--success)" }}>
              <Check className="w-4 h-4" /> Kopierad – klistra in i Teams
            </span>
          )}
          {status === "error" && (
            <span className="mr-auto" style={{ fontSize: "var(--text-label)", color: "var(--destructive)" }}>
              Det gick inte att kopiera. Ladda ner bilden i stället.
            </span>
          )}
          {canCopyImage() && (
            <button
              type="button"
              onClick={copy}
              disabled={!previewUrl}
              className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)] border border-border cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-default"
              style={{ ...buttonStyle, color: "var(--foreground)", background: "var(--surface-container)" }}
            >
              <Copy className="w-4 h-4" />
              Kopiera bild
            </button>
          )}
          <button
            type="button"
            onClick={download}
            disabled={!previewUrl}
            className="flex items-center gap-2 px-4 py-2 rounded-[var(--radius-button)] cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-default"
            style={{ ...buttonStyle, color: "var(--primary-foreground)", background: "var(--primary)" }}
          >
            <Download className="w-4 h-4" />
            Ladda ner PNG
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
