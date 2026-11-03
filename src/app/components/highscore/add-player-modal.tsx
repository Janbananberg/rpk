import { AnimatePresence, motion } from "motion/react";
import { Users, X, Plus } from "lucide-react";
import { PLAYER_EMOJIS } from "../../lib/players";
import { FONT } from "./constants";

interface AddPlayerModalProps {
  showAddPlayer: boolean;
  setShowAddPlayer: React.Dispatch<React.SetStateAction<boolean>>;
  setNewPlayerName: React.Dispatch<React.SetStateAction<string>>;
  setShowEmojiGrid: React.Dispatch<React.SetStateAction<boolean>>;
  setDuplicateError: React.Dispatch<React.SetStateAction<string>>;
  showEmojiGrid: boolean;
  selectedEmoji: string;
  setSelectedEmoji: React.Dispatch<React.SetStateAction<string>>;
  newPlayerName: string;
  handleAddPlayer: () => Promise<void>;
  duplicateError: string;
}

export function AddPlayerModal({
  showAddPlayer,
  setShowAddPlayer,
  setNewPlayerName,
  setShowEmojiGrid,
  setDuplicateError,
  showEmojiGrid,
  selectedEmoji,
  setSelectedEmoji,
  newPlayerName,
  handleAddPlayer,
  duplicateError,
}: AddPlayerModalProps) {
  return (
    <>
      <AnimatePresence>
        {showAddPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAddPlayer(false);
                setNewPlayerName("");
                setShowEmojiGrid(false);
                setDuplicateError("");
              }
            }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />

            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative w-full md:max-w-md rounded-t-2xl md:rounded-2xl border border-border p-5 md:p-6"
              style={{
                background: "var(--surface-container)",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.3), 0 0 0 1px var(--border)",
              }}
            >
              {/* Drag handle (mobile) */}
              <div className="md:hidden flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full" style={{ background: "var(--border)" }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span
                    className="text-foreground"
                    style={{
                      fontFamily: FONT,
                      fontSize: "var(--text-base)",
                      fontWeight: "var(--font-weight-semibold)",
                    }}
                  >
                    Lägg till spelare
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowAddPlayer(false);
                    setNewPlayerName("");
                    setShowEmojiGrid(false);
                    setDuplicateError("");
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors cursor-pointer"
                  style={{ borderRadius: "var(--radius-card)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Emoji + name input */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiGrid(!showEmojiGrid)}
                    className="w-12 h-12 rounded-lg border border-border hover:border-border-strong flex items-center justify-center transition-all cursor-pointer"
                    style={{
                      background: "var(--surface-container-high)",
                      fontSize: "var(--text-h4)",
                      borderRadius: "var(--radius-card)",
                    }}
                  >
                    {selectedEmoji}
                  </button>
                  {showEmojiGrid && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowEmojiGrid(false)} />
                      <div
                        className="absolute left-0 bottom-full mb-2 p-3 rounded-lg border border-border shadow-lg z-50 grid grid-cols-8 gap-1.5"
                        style={{
                          background: "var(--popover)",
                          maxWidth: 280,
                          borderRadius: "var(--radius-card)",
                        }}
                      >
                        {PLAYER_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              setSelectedEmoji(emoji);
                              setShowEmojiGrid(false);
                            }}
                            className={`w-8 h-8 flex items-center justify-center rounded hover:bg-muted/40 transition-colors cursor-pointer ${
                              selectedEmoji === emoji ? "bg-primary/20 ring-1 ring-primary" : ""
                            }`}
                            style={{ fontSize: "var(--text-lg)" }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => { setNewPlayerName(e.target.value); setDuplicateError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                  placeholder="Spelarnamn..."
                  autoFocus
                  className="flex-1 px-4 py-3 rounded-lg border bg-input-background text-foreground placeholder:text-muted-foreground"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-base)",
                    borderRadius: "var(--radius-card)",
                    borderColor: duplicateError ? "var(--destructive)" : "var(--border)",
                    outline: "none",
                  }}
                />
              </div>

              {/* Error */}
              {duplicateError && (
                <div
                  className="mb-4 px-3 py-2 rounded-lg flex items-center gap-2"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-label)",
                    borderRadius: "var(--radius-card)",
                    background: "color-mix(in srgb, var(--destructive) 12%, transparent)",
                    color: "var(--destructive)",
                  }}
                >
                  <X className="w-3.5 h-3.5 shrink-0" />
                  {duplicateError}
                </div>
              )}

              {/* Preview */}
              {newPlayerName.trim() && !duplicateError && (
                <div
                  className="mb-4 px-3 py-2 rounded-lg bg-muted/20 text-muted-foreground"
                  style={{ fontFamily: FONT, fontSize: "var(--text-label)", borderRadius: "var(--radius-card)" }}
                >
                  Visas som:{" "}
                  <span
                    className="text-foreground"
                    style={{ fontWeight: "var(--font-weight-semibold)" }}
                  >
                    {selectedEmoji} {newPlayerName.trim()}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleAddPlayer}
                  disabled={!newPlayerName.trim()}
                  className="flex-1 py-3 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-label)",
                    fontWeight: "var(--font-weight-semibold)",
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                    borderRadius: "var(--radius-card)",
                  }}
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Lägg till
                </button>
                <button
                  onClick={() => {
                    setShowAddPlayer(false);
                    setNewPlayerName("");
                    setShowEmojiGrid(false);
                    setDuplicateError("");
                  }}
                  className="px-5 py-3 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                  style={{
                    fontFamily: FONT,
                    fontSize: "var(--text-label)",
                    borderRadius: "var(--radius-card)",
                  }}
                >
                  Avbryt
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
