import { AnimatePresence, motion } from "motion/react";
import { Code2, X, Check, Copy, ExternalLink } from "lucide-react";
import { API_BASE } from "../api";
import { FONT } from "./constants";

interface ApiInfoModalProps {
  showApiModal: boolean;
  setApiCopied: React.Dispatch<React.SetStateAction<string | null>>;
  setShowApiModal: React.Dispatch<React.SetStateAction<boolean>>;
  apiCopied: string | null;
  setApiLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setApiPreview: React.Dispatch<React.SetStateAction<string | null>>;
  apiLoading: boolean;
  apiPreview: string | null;
}

export function ApiInfoModal({
  showApiModal,
  setApiCopied,
  setShowApiModal,
  apiCopied,
  setApiLoading,
  setApiPreview,
  apiLoading,
  apiPreview,
}: ApiInfoModalProps) {
  return (
    <>
            <AnimatePresence>
              {showApiModal && (() => {
                const baseUrl = `${API_BASE}/api/stats`;
                const exampleTotal = `${baseUrl}?month=total`;
                // Browser test uses fetch with auth header + blob URL (apikey query param not supported by Edge Functions)
                const curlExample = `curl "${exampleTotal}"`;
                const fetchExample = `const res = await fetch("${baseUrl}?month=2026-03");
const data = await res.json();
console.log(data.players);`;
                const copyToClipboard = (text: string, label: string) => {
                  navigator.clipboard.writeText(text);
                  setApiCopied(label);
                  setTimeout(() => setApiCopied(null), 2000);
                };
                const codeBlockStyle: React.CSSProperties = {
                  fontFamily: "'Courier New', monospace",
                  fontSize: "var(--text-xs)",
                  background: "var(--surface-container-lowest)",
                  color: "var(--primary)",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px 14px",
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  border: "1px solid var(--outline-variant)",
                  position: "relative" as const,
                };
                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
                    onClick={() => setShowApiModal(false)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border"
                      style={{
                        fontFamily: FONT,
                        background: "var(--surface-container)",
                        borderRadius: "var(--radius-xl)",
                        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                      }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between p-5 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: "var(--primary)", color: "var(--on-primary)" }}>
                            <Code2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h2 style={{ fontFamily: FONT, fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-bold)" as any, color: "var(--foreground)" }}>
                              Statistik-API
                            </h2>
                            <p style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--on-surface-variant)" }}>
                              Rundpingisklubben — öppet JSON-API
                            </p>
                          </div>
                        </div>
                        <button onClick={() => setShowApiModal(false)} className="p-2 rounded-lg hover:opacity-80 transition-opacity cursor-pointer" style={{ color: "var(--on-surface-variant)" }}>
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-5 space-y-5">
                        {/* Endpoint */}
                        <div>
                          <h3 style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as any, color: "var(--foreground)", marginBottom: 6 }}>
                            Endpoint
                          </h3>
                          <div style={codeBlockStyle}>
                            <span style={{ color: "var(--tertiary)" }}>GET</span>{" "}
                            <span style={{ color: "var(--primary)" }}>{baseUrl}</span>
                            <button
                              onClick={() => copyToClipboard(baseUrl, "url")}
                              className="absolute top-2 right-2 p-1.5 rounded-md hover:opacity-80 transition-opacity cursor-pointer"
                              style={{ background: "var(--surface-container-high)", color: apiCopied === "url" ? "var(--primary)" : "var(--on-surface-variant)" }}
                            >
                              {apiCopied === "url" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Query params */}
                        <div>
                          <h3 style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as any, color: "var(--foreground)", marginBottom: 6 }}>
                            Query-parametrar
                          </h3>
                          <div className="rounded-lg overflow-hidden border border-border" style={{ borderRadius: "var(--radius-sm)" }}>
                            <table className="w-full" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                              <thead>
                                <tr style={{ background: "var(--surface-container-high)" }}>
                                  <th className="text-left px-3 py-2" style={{ color: "var(--on-surface-variant)", fontWeight: "var(--font-weight-semibold)" as any }}>Parameter</th>
                                  <th className="text-left px-3 py-2" style={{ color: "var(--on-surface-variant)", fontWeight: "var(--font-weight-semibold)" as any }}>Typ</th>
                                  <th className="text-left px-3 py-2" style={{ color: "var(--on-surface-variant)", fontWeight: "var(--font-weight-semibold)" as any }}>Beskrivning</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr style={{ borderTop: "1px solid var(--outline-variant)" }}>
                                  <td className="px-3 py-2" style={{ color: "var(--primary)", fontFamily: "'Courier New', monospace" }}>month</td>
                                  <td className="px-3 py-2" style={{ color: "var(--on-surface-variant)" }}>string</td>
                                  <td className="px-3 py-2" style={{ color: "var(--foreground)" }}>
                                    <code style={{ fontFamily: "'Courier New', monospace", background: "var(--surface-container-lowest)", padding: "1px 5px", borderRadius: 4 }}>YYYY-MM</code> eller{" "}
                                    <code style={{ fontFamily: "'Courier New', monospace", background: "var(--surface-container-lowest)", padding: "1px 5px", borderRadius: 4 }}>total</code>{" "}
                                    <span style={{ color: "var(--on-surface-variant)" }}>(default)</span>
                                  </td>
                                </tr>

                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* cURL example */}
                        <div>
                          <h3 style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as any, color: "var(--foreground)", marginBottom: 6 }}>
                            cURL-exempel
                          </h3>
                          <div style={codeBlockStyle}>
                            {curlExample}
                            <button
                              onClick={() => copyToClipboard(curlExample, "curl")}
                              className="absolute top-2 right-2 p-1.5 rounded-md hover:opacity-80 transition-opacity cursor-pointer"
                              style={{ background: "var(--surface-container-high)", color: apiCopied === "curl" ? "var(--primary)" : "var(--on-surface-variant)" }}
                            >
                              {apiCopied === "curl" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* JS/fetch example */}
                        <div>
                          <h3 style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as any, color: "var(--foreground)", marginBottom: 6 }}>
                            JavaScript / fetch
                          </h3>
                          <div style={codeBlockStyle}>
                            {fetchExample}
                            <button
                              onClick={() => copyToClipboard(fetchExample, "fetch")}
                              className="absolute top-2 right-2 p-1.5 rounded-md hover:opacity-80 transition-opacity cursor-pointer"
                              style={{ background: "var(--surface-container-high)", color: apiCopied === "fetch" ? "var(--primary)" : "var(--on-surface-variant)" }}
                            >
                              {apiCopied === "fetch" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Response fields */}
                        <div>
                          <h3 style={{ fontFamily: FONT, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" as any, color: "var(--foreground)", marginBottom: 6 }}>
                            Svarsformat
                          </h3>
                          <div className="rounded-lg overflow-hidden border border-border" style={{ borderRadius: "var(--radius-sm)" }}>
                            <table className="w-full" style={{ fontSize: "var(--text-xs)", fontFamily: FONT }}>
                              <thead>
                                <tr style={{ background: "var(--surface-container-high)" }}>
                                  <th className="text-left px-3 py-2" style={{ color: "var(--on-surface-variant)", fontWeight: "var(--font-weight-semibold)" as any }}>Fält</th>
                                  <th className="text-left px-3 py-2" style={{ color: "var(--on-surface-variant)", fontWeight: "var(--font-weight-semibold)" as any }}>Beskrivning</th>
                                </tr>
                              </thead>
                              <tbody style={{ color: "var(--foreground)" }}>
                                {[
                                  ["month", "Vald månad eller \"total\""],
                                  ["playerCount", "Antal spelare med data"],
                                  ["availableMonths", "Lista av YYYY-MM med data"],
                                  ["players[].name", "Spelarens namn"],
                                  ["players[].elo / peakElo", "Aktuellt och högsta Elo-tal"],
                                  ["players[].wins / finals / gamesPlayed", "Grundläggande statistik"],
                                  ["players[].winPct / finalPct / finalWinPct", "Vinstprocent"],
                                  ["players[].currentStreak / bestStreak", "Vinstsviter"],
                                  ["players[].nemesis / prey", "Svåraste motståndare / favoritbyte"],
                                  ["players[].h2h", "Inbördes facit per motståndare"],
                                  ["players[].yellowCards / redCards", "Kort"],
                                  ["players[].tournamentWins", "Antal turneringsvinster"],
                                  ["players[].insights", "Veckodag, tid, gruppstorleks-analys"],
                                ].map(([field, desc]) => (
                                  <tr key={field} style={{ borderTop: "1px solid var(--outline-variant)" }}>
                                    <td className="px-3 py-1.5" style={{ fontFamily: "'Courier New', monospace", color: "var(--primary)", fontSize: "var(--text-xs)" }}>{field}</td>
                                    <td className="px-3 py-1.5" style={{ fontSize: "var(--text-xs)" }}>{desc}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Try it */}
                        <div className="pt-2">
                          <button
                            onClick={async () => {
                              setApiLoading(true);
                              setApiPreview(null);
                              try {
                                const res = await fetch(exampleTotal);
                                const json = await res.json();
                                setApiPreview(JSON.stringify(json, null, 2));
                              } catch (err) {
                                setApiPreview(`Fel: ${err}`);
                              } finally {
                                setApiLoading(false);
                              }
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all hover:opacity-90 cursor-pointer"
                            style={{
                              fontFamily: FONT,
                              fontSize: "var(--text-sm)",
                              fontWeight: "var(--font-weight-semibold)" as any,
                              background: "var(--primary)",
                              color: "var(--primary-foreground)",
                              borderRadius: "var(--radius-button)",
                            }}
                          >
                            {apiLoading ? (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ExternalLink className="w-4 h-4" />
                            )}
                            {apiLoading ? "Hämtar..." : apiPreview ? "Hämta igen" : "Testa API:et"}
                          </button>
                          {apiPreview && (
                            <div className="mt-3 relative">
                              <div className="flex items-center justify-between mb-1.5">
                                <span style={{ fontFamily: FONT, fontSize: "var(--text-xs)", color: "var(--on-surface-variant)", fontWeight: "var(--font-weight-semibold)" as any }}>Svar (JSON)</span>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(apiPreview); setApiCopied("response"); setTimeout(() => setApiCopied(null), 2000); }}
                                  className="p-1.5 rounded-md hover:opacity-80 transition-opacity cursor-pointer"
                                  style={{ background: "var(--surface-container-high)", color: apiCopied === "response" ? "var(--primary)" : "var(--on-surface-variant)" }}
                                >
                                  {apiCopied === "response" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                              <pre style={{
                                ...codeBlockStyle,
                                maxHeight: 300,
                                overflowY: "auto",
                                fontSize: "11px",
                                margin: 0,
                              }}>{apiPreview}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
    </>
  );
}
