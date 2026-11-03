import { ArrowRight, RotateCcw, Settings2 } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

/* ── Settings types ─────────────────────────────────────────────────── */

type SpinSpeed = "slow" | "normal" | "fast" | "turbo";
type FlipDuration = 1 | 2 | 3 | 4 | 5;
type SpinAxis = "Y" | "X" | "diagonal" | "tornado";

const SPEED_CONFIG: Record<SpinSpeed, { spinsPerSec: number; label: string }> = {
  slow:   { spinsPerSec: 1.5, label: "Dvala" },
  normal: { spinsPerSec: 3,   label: "Strid" },
  fast:   { spinsPerSec: 5,   label: "Blixt" },
  turbo:  { spinsPerSec: 8,   label: "Ragnarök" },
};

const DURATION_OPTIONS: { value: FlipDuration; label: string }[] = [
  { value: 1, label: "1s" },
  { value: 2, label: "2s" },
  { value: 3, label: "3s" },
  { value: 4, label: "4s" },
  { value: 5, label: "5s" },
];

const AXIS_OPTIONS: { value: SpinAxis; label: string }[] = [
  { value: "Y", label: "Sidovind" },
  { value: "X", label: "Salto" },
  { value: "diagonal", label: "Kaos" },
  { value: "tornado", label: "Cyklon" },
];

/* ── Sound effects via Web Audio API ─────────────────────────────── */

let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

/** Create a white noise buffer for swoosh effects */
function createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** Epic swoosh — filtered noise with frequency sweep, building intensity */
function playSwoosh(durationSec: number, spinsPerSec: number): () => void {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const endTime = now + durationSec;
    const nodes: AudioNode[] = [];

    // ── Main swoosh: bandpass-filtered noise with frequency sweep ──
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = createNoiseBuffer(ctx, durationSec + 0.5);
    noiseSource.loop = false;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.Q.setValueAtTime(2.5, now);
    // Sweep frequency up as it spins faster, then back down at end
    const baseFreq = 300;
    const peakFreq = 800 + spinsPerSec * 150;
    bandpass.frequency.setValueAtTime(baseFreq, now);
    bandpass.frequency.linearRampToValueAtTime(peakFreq, now + durationSec * 0.4);
    bandpass.frequency.linearRampToValueAtTime(peakFreq * 1.3, now + durationSec * 0.75);
    bandpass.frequency.linearRampToValueAtTime(baseFreq * 0.6, endTime);

    // Volume envelope: quick attack, sustain with pulsing, then fade
    const swooshGain = ctx.createGain();
    swooshGain.gain.setValueAtTime(0, now);
    swooshGain.gain.linearRampToValueAtTime(0.18, now + 0.08);
    swooshGain.gain.linearRampToValueAtTime(0.22, now + durationSec * 0.5);
    swooshGain.gain.linearRampToValueAtTime(0.15, now + durationSec * 0.85);
    swooshGain.gain.linearRampToValueAtTime(0.04, endTime);

    noiseSource.connect(bandpass).connect(swooshGain).connect(ctx.destination);
    noiseSource.start(now);
    noiseSource.stop(endTime + 0.1);
    nodes.push(noiseSource);

    // ── Tonal woosh layer: sine wave with LFO for rhythmic swoosh ──
    const wooshOsc = ctx.createOscillator();
    wooshOsc.type = "sine";
    wooshOsc.frequency.setValueAtTime(120, now);
    wooshOsc.frequency.linearRampToValueAtTime(80 + spinsPerSec * 12, now + durationSec * 0.6);
    wooshOsc.frequency.linearRampToValueAtTime(60, endTime);

    // Amplitude modulation at spin rate for rhythmic "whomp whomp"
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(spinsPerSec * 2, now);
    lfo.frequency.linearRampToValueAtTime(spinsPerSec * 0.5, endTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.06, now);

    const wooshMainGain = ctx.createGain();
    wooshMainGain.gain.setValueAtTime(0.06, now);
    wooshMainGain.gain.linearRampToValueAtTime(0.1, now + durationSec * 0.4);
    wooshMainGain.gain.linearRampToValueAtTime(0.02, endTime);

    lfo.connect(lfoGain);
    lfoGain.connect(wooshMainGain.gain);
    wooshOsc.connect(wooshMainGain).connect(ctx.destination);
    lfo.start(now);
    wooshOsc.start(now);
    lfo.stop(endTime + 0.1);
    wooshOsc.stop(endTime + 0.1);
    nodes.push(wooshOsc, lfo);

    // ── High-pitched wind whistle layer ──
    const whistleSource = ctx.createBufferSource();
    whistleSource.buffer = createNoiseBuffer(ctx, durationSec + 0.5);
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(2000, now);
    highpass.frequency.linearRampToValueAtTime(4000 + spinsPerSec * 200, now + durationSec * 0.6);
    highpass.frequency.linearRampToValueAtTime(1500, endTime);
    highpass.Q.setValueAtTime(3, now);

    const whistleGain = ctx.createGain();
    whistleGain.gain.setValueAtTime(0, now);
    whistleGain.gain.linearRampToValueAtTime(0.04, now + durationSec * 0.3);
    whistleGain.gain.linearRampToValueAtTime(0.06, now + durationSec * 0.7);
    whistleGain.gain.linearRampToValueAtTime(0.01, endTime);

    whistleSource.connect(highpass).connect(whistleGain).connect(ctx.destination);
    whistleSource.start(now);
    whistleSource.stop(endTime + 0.1);
    nodes.push(whistleSource);

    return () => {
      nodes.forEach((n) => {
        try { (n as AudioScheduledSourceNode).stop(); } catch { /* */ }
      });
    };
  } catch {
    return () => {};
  }
}

/** Bright crystalline "kling" — shimmering bell chime on landing */
function playEpicClang() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    // ── Soft tap instead of heavy thud ──
    const tap = ctx.createOscillator();
    const tapGain = ctx.createGain();
    tap.type = "sine";
    tap.frequency.setValueAtTime(320, now);
    tap.frequency.exponentialRampToValueAtTime(160, now + 0.08);
    tapGain.gain.setValueAtTime(0.10, now);
    tapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    tap.connect(tapGain).connect(ctx.destination);
    tap.start(now);
    tap.stop(now + 0.12);

    // ── Primary bell tone — bright, high, sustained shimmer ──
    const bellPartials = [
      { freq: 1200, vol: 0.12, decay: 2.2 },          // fundamental kling
      { freq: 2400 * 1.003, vol: 0.09, decay: 1.8 },  // octave with chorus detune
      { freq: 3600 * 0.997, vol: 0.06, decay: 1.4 },   // 3rd partial
      { freq: 4800, vol: 0.04, decay: 1.0 },            // sparkle
      { freq: 6400 * 1.005, vol: 0.025, decay: 0.7 },   // high shimmer
      { freq: 8000, vol: 0.015, decay: 0.5 },            // air
    ];

    bellPartials.forEach(({ freq, vol, decay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(vol, now);
      // Gentle exponential decay for sustained ring
      gain.gain.exponentialRampToValueAtTime(vol * 0.4, now + decay * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + decay);
    });

    // ── Chorus shimmer — slightly detuned copy for width ──
    const chorusPartials = [
      { freq: 1200 * 1.006, vol: 0.05, decay: 2.0 },
      { freq: 2400 * 0.994, vol: 0.035, decay: 1.5 },
      { freq: 3600 * 1.008, vol: 0.02, decay: 1.1 },
    ];

    chorusPartials.forEach(({ freq, vol, decay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + 0.005);
      gain.gain.setValueAtTime(vol, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + 0.005);
      osc.stop(now + decay);
    });

    // ── Bright attack transient — tiny crisp noise tick ──
    const noiseLen = 0.015;
    const noiseBuf = createNoiseBuffer(ctx, noiseLen);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(8000, now);
    noiseFilter.Q.setValueAtTime(2, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + noiseLen);
    noiseSrc.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
    noiseSrc.start(now);
    noiseSrc.stop(now + noiseLen);

    // ── Gentle settling pings (coin landing delicately) ──
    const pingTimes = [0.12, 0.20, 0.26, 0.30];
    pingTimes.forEach((dt, i) => {
      const t = now + dt;
      const freq = 4000 - i * 400;
      const v = 0.025 * (1 - i / pingTimes.length);
      const oP = ctx.createOscillator();
      const gP = ctx.createGain();
      oP.type = "sine";
      oP.frequency.setValueAtTime(freq, t);
      gP.gain.setValueAtTime(v, t);
      gP.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      oP.connect(gP).connect(ctx.destination);
      oP.start(t);
      oP.stop(t + 0.06);
    });
  } catch { /* silent */ }
}

/* ── Component ──────────────────────────────────────────────────────── */

interface CoinFlipProps {
  player1: string;
  player2: string;
  onResult: (server: string) => void;
  onSkip: () => void;
}

export function CoinFlip({ player1, player2, onResult, onSkip }: CoinFlipProps) {
  const [state, setState] = useState<"idle" | "flipping" | "done">("idle");
  const [winner, setWinner] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [speed, setSpeed] = useState<SpinSpeed>("normal");
  const [duration, setDuration] = useState<FlipDuration>(2);
  const [axis, setAxis] = useState<SpinAxis>("Y");
  const rotationRef = useRef({ x: 0, y: 0, z: 0 });
  const swooshCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => { swooshCleanupRef.current?.(); };
  }, []);

  const flip = useCallback(() => {
    if (state === "flipping") return;

    const landOnBack = Math.random() < 0.5;
    const result = landOnBack ? player2 : player1;
    setWinner(result);

    const sps = SPEED_CONFIG[speed].spinsPerSec;
    const totalSpins = Math.round(sps * duration);
    const faceDeg = landOnBack ? 180 : 0;

    if (axis === "Y") {
      rotationRef.current = { x: 0, y: totalSpins * 360 + faceDeg, z: 0 };
    } else if (axis === "X") {
      rotationRef.current = { x: totalSpins * 360 + faceDeg, y: 0, z: 0 };
    } else if (axis === "diagonal") {
      const xSpins = Math.max(2, totalSpins - 1);
      rotationRef.current = { x: xSpins * 360, y: totalSpins * 360 + faceDeg, z: 0 };
    } else {
      const zSpins = totalSpins * 2 + Math.floor(Math.random() * 3);
      rotationRef.current = { x: 0, y: totalSpins * 360 + faceDeg, z: zSpins * 360 };
    }

    // Epic swoosh sound
    swooshCleanupRef.current = playSwoosh(duration, sps);

    setState("flipping");

    setTimeout(() => {
      swooshCleanupRef.current?.();
      playEpicClang();
      setState("done");
    }, duration * 1000 + 200);
  }, [state, player1, player2, speed, duration, axis]);

  const reflip = useCallback(() => {
    setState("idle");
    setWinner(null);
  }, []);

  const showChrome = state === "idle" || state === "done";
  const animDuration = duration;

  return (
    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-background">
      {/* Settings gear */}
      <AnimatePresence>
        {state === "idle" && (
          <motion.button
            key="settings-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setShowSettings((v) => !v)}
            className="absolute top-6 right-6 p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-container-high transition-all duration-200 cursor-pointer z-20"
            aria-label="Inställningar"
          >
            <Settings2 className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Settings panel — responsive overlay */}
      <AnimatePresence>
        {showSettings && state === "idle" && (
          <>
            {/* Backdrop on mobile */}
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-30 sm:hidden"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              key="settings-panel"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="fixed sm:absolute inset-x-4 top-20 sm:inset-x-auto sm:top-16 sm:right-6 p-6 sm:p-7 rounded-[var(--radius-card)] bg-surface-container-high border border-border flex flex-col gap-5 sm:gap-6 z-40 max-h-[calc(100vh-120px)] overflow-y-auto"
              style={{ maxWidth: "min(380px, calc(100vw - 32px))" }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between">
                <span
                  className="text-foreground"
                  style={{
                    fontSize: "var(--text-base)",
                    fontWeight: "var(--font-weight-semibold)",
                  }}
                >
                  Ritualen
                </span>
                <button
                  onClick={() => setShowSettings(false)}
                  className="sm:hidden p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <span style={{ fontSize: "18px" }}>✕</span>
                </button>
              </div>

              {/* Duration */}
              <div className="flex flex-col gap-2.5">
                <span
                  className="text-muted-foreground"
                  style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Tid
                </span>
                <div className="flex gap-1.5">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDuration(opt.value)}
                      className={`flex-1 py-2.5 sm:py-2 rounded-[var(--radius-button)] transition-all duration-200 cursor-pointer ${
                        duration === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-container text-muted-foreground hover:text-foreground hover:bg-surface-container-highest"
                      }`}
                      style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed / Intensitet */}
              <div className="flex flex-col gap-2.5">
                <span
                  className="text-muted-foreground"
                  style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Intensitet
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(SPEED_CONFIG) as SpinSpeed[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`py-2.5 sm:py-2 rounded-[var(--radius-button)] transition-all duration-200 cursor-pointer ${
                        speed === s
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-container text-muted-foreground hover:text-foreground hover:bg-surface-container-highest"
                      }`}
                      style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
                    >
                      {SPEED_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Axis / Öde */}
              <div className="flex flex-col gap-2.5">
                <span
                  className="text-muted-foreground"
                  style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Öde
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {AXIS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setAxis(opt.value)}
                      className={`py-2.5 sm:py-2 rounded-[var(--radius-button)] transition-all duration-200 cursor-pointer ${
                        axis === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-container text-muted-foreground hover:text-foreground hover:bg-surface-container-highest"
                      }`}
                      style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary chip */}
              <div
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--radius-button)] bg-surface-container/80"
              >
                <span
                  className="text-muted-foreground/70"
                  style={{ fontSize: "var(--text-sm)" }}
                >
                  {duration}s · {Math.round(SPEED_CONFIG[speed].spinsPerSec * duration)} varv
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Title */}
      <AnimatePresence>
        {showChrome && state === "idle" && (
          <motion.div
            key="title"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center gap-3 mb-12"
          >
            <span
              className="text-muted-foreground"
              style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Titillium Web', sans-serif" }}
            >
              Vem servar först?
            </span>
            <span
              className="text-foreground"
              style={{ fontSize: "var(--text-h2)", fontWeight: "var(--font-weight-bold)", fontFamily: "'Titillium Web', sans-serif" }}
            >
              Singla slant
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer */}
      <AnimatePresence>
        {!showChrome && (
          <motion.div key="spacer-top" initial={{ height: 0 }} animate={{ height: 0 }} className="shrink-0" />
        )}
      </AnimatePresence>

      {/* ── Coin area ── */}
      <div className="relative w-48 h-48 sm:w-60 sm:h-60" style={{ perspective: "800px" }}>
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.button
              key="coin-idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.25 }}
              onClick={flip}
              className="w-full h-full cursor-pointer"
              style={{ transformStyle: "preserve-3d" }}
            >
              <CoinFace name={player1} side="front" axis={axis} />
              <CoinFace name={player2} side="back" axis={axis} />
            </motion.button>
          )}

          {state === "flipping" && (
            <motion.div
              key="coin-flipping"
              className="w-full h-full"
              style={{ transformStyle: "preserve-3d" }}
              initial={{ rotateX: 0, rotateY: 0, rotateZ: 0, y: 0, scale: 1 }}
              animate={{
                rotateX: rotationRef.current.x,
                rotateY: rotationRef.current.y,
                rotateZ: rotationRef.current.z,
                y: axis === "tornado"
                  ? [0, -160, -100, -140, -40, 0]
                  : [0, -120, -80, -100, -20, 0],
                scale: axis === "tornado"
                  ? [1, 0.75, 0.85, 0.78, 0.92, 1]
                  : [1, 0.88, 0.95, 0.9, 0.97, 1],
              }}
              transition={{
                rotateX: { duration: animDuration, ease: [0.2, 0.8, 0.3, 1] },
                rotateY: { duration: animDuration, ease: [0.2, 0.8, 0.3, 1] },
                rotateZ: { duration: animDuration, ease: [0.15, 0.7, 0.25, 1] },
                y: { duration: animDuration, ease: [0.22, 1, 0.36, 1] },
                scale: { duration: animDuration, ease: [0.22, 1, 0.36, 1] },
              }}
            >
              <CoinFace name={player1} side="front" axis={axis} />
              <CoinFace name={player2} side="back" axis={axis} />
            </motion.div>
          )}

          {state === "done" && winner && (
            <motion.div
              key="coin-done"
              className="w-full h-full"
              style={{ transformStyle: "preserve-3d" }}
              initial={{ opacity: 0, scale: 0.85, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <CoinFace name={winner} side="front" axis={axis} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom content */}
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div
            key="names"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center gap-5 mt-12"
          >
            <div className="flex items-center gap-5">
              <span
                className="text-foreground"
                style={{ fontSize: "var(--text-h4)", fontWeight: "var(--font-weight-semibold)", fontFamily: "'Titillium Web', sans-serif" }}
              >
                {player1}
              </span>
              <span
                className="text-muted-foreground/50"
                style={{ fontSize: "var(--text-base)", fontFamily: "'Titillium Web', sans-serif" }}
              >
                vs
              </span>
              <span
                className="text-foreground"
                style={{ fontSize: "var(--text-h4)", fontWeight: "var(--font-weight-semibold)", fontFamily: "'Titillium Web', sans-serif" }}
              >
                {player2}
              </span>
            </div>
            <span
              className="text-muted-foreground/60"
              style={{ fontSize: "var(--text-base)", fontFamily: "'Titillium Web', sans-serif" }}
            >
              Tryck på myntet för att singla
            </span>
          </motion.div>
        )}

        {state === "flipping" && (
          <motion.div
            key="flipping-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="flex items-center gap-2 mt-12"
          >
            <motion.span
              className="text-muted-foreground/60"
              style={{ fontSize: "var(--text-base)" }}
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              Singlar...
            </motion.span>
          </motion.div>
        )}

        {state === "done" && winner && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
            className="flex flex-col items-center gap-8 mt-12"
          >
            <div className="flex flex-col items-center gap-2">
              <span
                className="text-primary"
                style={{ fontSize: "var(--text-h2)", fontWeight: "var(--font-weight-bold)" }}
              >
                {winner}
              </span>
              <span
                className="text-muted-foreground/60"
                style={{ fontSize: "var(--text-base)" }}
              >
                servar först
              </span>
            </div>

            <button
              onClick={() => onResult(winner)}
              className="flex items-center gap-2.5 px-8 py-3.5 rounded-[var(--radius-button)] bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 cursor-pointer active:scale-95"
              style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}
            >
              Starta match
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={reflip}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-button)] text-muted-foreground hover:text-foreground hover:bg-surface-container-high transition-all duration-200 cursor-pointer active:scale-95"
              style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
            >
              <RotateCcw className="w-4 h-4" />
              Singla om
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip link */}
      <AnimatePresence>
        {showChrome && state === "idle" && (
          <motion.div
            key="skip"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-10"
          >
            <button
              onClick={onSkip}
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-200 cursor-pointer"
              style={{ fontSize: "var(--text-label)" }}
            >
              Hoppa över
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Coin face sub-component ──────────────────────────────────────────── */

function CoinFace({
  name,
  side,
  axis = "Y",
}: {
  name: string;
  side: "front" | "back";
  axis?: SpinAxis;
}) {
  const isBack = side === "back";

  // The back face needs to be rotated 180° on the flip axis so it shows correctly
  let backTransform: string | undefined;
  if (isBack) {
    if (axis === "X") {
      backTransform = "rotateX(180deg)";
    } else {
      // Y, diagonal, tornado all use Y as primary flip axis
      backTransform = "rotateY(180deg)";
    }
  }

  const shadowColor = "var(--coin-shadow)";
  const bodyColor = "var(--coin)";
  const sheenAngle = isBack ? "205deg" : "155deg";

  return (
    <div
      className="absolute inset-0 rounded-full"
      style={{
        backfaceVisibility: "hidden",
        transform: backTransform,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Outer ridged edge */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: shadowColor,
          boxShadow:
            "inset 0 2px 4px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.25), 0 3px 10px rgba(0,0,0,0.4)",
        }}
      />

      {/* Ridged ring */}
      <div
        className="absolute rounded-full"
        style={{
          inset: "3px",
          border: "1.5px dashed var(--coin-edge)",
          opacity: 0.4,
        }}
      />

      {/* Main coin body */}
      <div
        className="absolute rounded-full flex flex-col items-center justify-center gap-1"
        style={{
          inset: "6px",
          background: bodyColor,
          boxShadow: "inset 0 2px 3px rgba(255,255,255,0.2), inset 0 -2px 3px rgba(0,0,0,0.15)",
        }}
      >
        {/* Inner decorative ring */}
        <div
          className="absolute rounded-full"
          style={{ inset: "8px", border: "1.5px solid var(--coin-edge)", opacity: 0.35 }}
        />

        {/* Sheen highlight */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: "6px",
            background: `linear-gradient(${sheenAngle}, rgba(255,255,255,0.18) 0%, transparent 40%)`,
          }}
        />

        {/* Content — no KRONA/KLAVE text, just emoji + name */}
        <span style={{ fontSize: "32px", lineHeight: 1 }} className="relative z-10">🏓</span>
        <span
          className="relative z-10 truncate max-w-[70%] text-center"
          style={{
            fontSize: "var(--text-label)",
            fontWeight: "var(--font-weight-semibold)",
            letterSpacing: "0.04em",
            color: "var(--coin-foreground)",
            textShadow: "0 1px 1px rgba(255,255,255,0.15)",
          }}
        >
          {name}
        </span>
      </div>
    </div>
  );
}