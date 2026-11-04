import type { ResultCardData } from "../../lib/result-card";
import { formatSessionDate } from "../../lib/dates";

// Draws the shareable result card onto a <canvas>. Colors are read from the active theme's CSS
// variables, so the image matches whatever theme the app is showing.

const LOGO_URL = new URL("../../../imports/rpk2.svg", import.meta.url).href;
const FONT_FAMILY = `"Titillium Web", sans-serif`;
const WIDTH = 1200;
const PAD = 56;
const SCALE = 2;
const MAX_ROUNDS = 6;
const MAX_PLAYERS = 12;

interface Palette {
  background: string;
  surface: string;
  surfaceHigh: string;
  border: string;
  foreground: string;
  muted: string;
  primary: string;
  success: string;
  destructive: string;
  warning: string;
}

/** Resolves theme variables to concrete colors (nested var() and color-mix included). */
function readPalette(): Palette {
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.body.appendChild(probe);
  const resolve = (token: string, fallback: string) => {
    probe.style.color = "";
    probe.style.color = `var(${token}, ${fallback})`;
    return getComputedStyle(probe).color || fallback;
  };
  const palette: Palette = {
    background: resolve("--surface-container-lowest", "#0b0f17"),
    surface: resolve("--surface-container", "#151b26"),
    surfaceHigh: resolve("--surface-container-high", "#1d2533"),
    border: resolve("--border", "#3a4456"),
    foreground: resolve("--foreground", "#f2f4f8"),
    muted: resolve("--muted-foreground", "#a7b0bf"),
    primary: resolve("--primary", "#9cc3ff"),
    success: resolve("--success", "#36e18c"),
    destructive: resolve("--destructive", "#ff8a8a"),
    warning: resolve("--warning", "#f4bf0a"),
  };
  probe.remove();
  return palette;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), 3000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = src;
  });
}

const font = (weight: number, size: number) => `${weight} ${size}px ${FONT_FAMILY}`;
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const chars = Array.from(text);
  while (chars.length > 1 && ctx.measureText(chars.join("") + "…").width > maxWidth) chars.pop();
  return chars.join("").trimEnd() + "…";
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx: CanvasRenderingContext2D, p: Palette, x: number, y: number, w: number, h: number, tint?: string) {
  roundRect(ctx, x, y, w, h, 16);
  ctx.fillStyle = p.surface;
  ctx.fill();
  if (tint) {
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = tint;
    ctx.fill();
    ctx.restore();
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = tint ?? p.border;
  ctx.save();
  ctx.globalAlpha = tint ? 0.55 : 1;
  ctx.stroke();
  ctx.restore();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.font = font(700, 18);
  ctx.fillStyle = color;
  ctx.letterSpacing = "2px";
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.letterSpacing = "0px";
}

/** Renders the card into `canvas`. Resolves once fonts and the logo are drawn. */
export async function drawResultCard(canvas: HTMLCanvasElement, data: ResultCardData): Promise<void> {
  const p = readPalette();
  await Promise.all([
    document.fonts?.load(font(700, 40)).catch(() => undefined),
    document.fonts?.load(font(400, 20)).catch(() => undefined),
  ]);
  const logo = await loadImage(LOGO_URL);

  const rounds = data.rounds.slice(-MAX_ROUNDS);
  const hiddenRounds = data.rounds.length - rounds.length;
  const players = data.players.slice(0, MAX_PLAYERS);
  const playerRows = Math.ceil(players.length / 2);

  const headerH = 124;
  const winnerH = data.winner ? 196 : 0;
  const roundsH = rounds.length > 0 ? 64 + rounds.length * 52 + (hiddenRounds > 0 ? 30 : 0) : 0;
  const playersH = players.length > 0 ? 64 + playerRows * 48 : 0;
  const footerH = 72;
  const gap = 28;
  const sections = [winnerH, roundsH, playersH].filter((h) => h > 0);
  const height = headerH + sections.reduce((a, h) => a + h + gap, 0) + footerH;

  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = "alphabetic";

  // Background with a primary accent bar along the top
  ctx.fillStyle = p.background;
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.fillStyle = p.primary;
  ctx.fillRect(0, 0, WIDTH, 6);

  // ── Header: logo, app name, date ──
  const logoH = 64;
  if (logo) {
    const logoW = logoH * (logo.naturalWidth / logo.naturalHeight || 786 / 690);
    ctx.drawImage(logo, PAD, 34, logoW, logoH);
  } else {
    ctx.beginPath();
    ctx.arc(PAD + 32, 66, 32, 0, Math.PI * 2);
    ctx.fillStyle = p.primary;
    ctx.fill();
  }
  const titleX = PAD + 92;
  ctx.font = font(700, 38);
  ctx.fillStyle = p.foreground;
  ctx.fillText("Rundpingis", titleX, 68);
  ctx.font = font(400, 22);
  ctx.fillStyle = p.muted;
  ctx.fillText(`Resultat · ${formatSessionDate(data.date)}`, titleX, 98);
  ctx.textAlign = "right";
  ctx.font = font(700, 22);
  ctx.fillStyle = p.primary;
  ctx.fillText("RPK", WIDTH - PAD, 68);
  ctx.textAlign = "left";

  let y = headerH;
  const innerW = WIDTH - PAD * 2;

  // ── Winner ──
  if (data.winner) {
    panel(ctx, p, PAD, y, innerW, winnerH, p.primary);
    label(ctx, "🏆 Vinnare", PAD + 32, y + 46, p.primary);
    ctx.font = font(700, 60);
    ctx.fillStyle = p.foreground;
    ctx.fillText(fit(ctx, data.winner.name, innerW - 380), PAD + 32, y + 116);
    ctx.font = font(400, 24);
    ctx.fillStyle = p.muted;
    const roundsWon = `${data.winner.wins} av ${data.rounds.length} ${data.rounds.length === 1 ? "runda" : "rundor"} vunna`;
    const finalist = data.finalist ? ` · slog ${data.finalist.name} i finalen` : "";
    ctx.fillText(fit(ctx, roundsWon + finalist, innerW - 380), PAD + 32, y + 158);

    ctx.textAlign = "right";
    ctx.font = font(700, 56);
    ctx.fillStyle = data.winner.delta >= 0 ? p.success : p.destructive;
    ctx.fillText(`${signed(data.winner.delta)} Elo`, WIDTH - PAD - 32, y + 112);
    ctx.font = font(400, 24);
    ctx.fillStyle = p.muted;
    ctx.fillText(`Nu ${data.winner.elo} Elo`, WIDTH - PAD - 32, y + 152);
    ctx.textAlign = "left";
    y += winnerH + gap;
  }

  // ── Rounds: winner vs finalist ──
  if (rounds.length > 0) {
    panel(ctx, p, PAD, y, innerW, roundsH);
    label(ctx, "Finaler", PAD + 32, y + 44, p.muted);
    let ry = y + 64;
    if (hiddenRounds > 0) {
      ctx.font = font(400, 20);
      ctx.fillStyle = p.muted;
      ctx.fillText(`+ ${hiddenRounds} tidigare rundor`, PAD + 32, ry + 14);
      ry += 30;
    }
    const firstIndex = data.rounds.length - rounds.length;
    const colWinner = PAD + 120;
    const colVs = PAD + innerW / 2 + 10;
    rounds.forEach((r, i) => {
      const base = ry + i * 52 + 34;
      if (i > 0) {
        ctx.fillStyle = p.border;
        ctx.fillRect(PAD + 32, ry + i * 52, innerW - 64, 1);
      }
      ctx.font = font(400, 20);
      ctx.fillStyle = p.muted;
      ctx.fillText(`Runda ${firstIndex + i + 1}`, PAD + 32, base);
      ctx.font = font(700, 26);
      ctx.fillStyle = p.foreground;
      ctx.fillText(fit(ctx, r.winner, colVs - colWinner - 140), colWinner, base);
      ctx.textAlign = "right";
      ctx.fillStyle = p.success;
      ctx.fillText(signed(r.winnerDelta), colVs - 40, base);
      ctx.textAlign = "left";
      ctx.font = font(400, 20);
      ctx.fillStyle = p.muted;
      ctx.fillText("slog", colVs, base);
      ctx.font = font(400, 26);
      ctx.fillStyle = p.foreground;
      ctx.fillText(fit(ctx, r.finalist, WIDTH - PAD - 32 - (colVs + 56) - 90), colVs + 56, base);
      ctx.textAlign = "right";
      ctx.fillStyle = r.finalistDelta >= 0 ? p.success : p.destructive;
      ctx.fillText(signed(r.finalistDelta), WIDTH - PAD - 32, base);
      ctx.textAlign = "left";
    });
    y += roundsH + gap;
  }

  // ── Elo changes for everyone ──
  if (players.length > 0) {
    panel(ctx, p, PAD, y, innerW, playersH);
    label(ctx, "Elo-förändringar", PAD + 32, y + 44, p.muted);
    const colW = (innerW - 64 - 40) / 2;
    players.forEach((pl, i) => {
      const col = i < playerRows ? 0 : 1;
      const row = col === 0 ? i : i - playerRows;
      const x = PAD + 32 + col * (colW + 40);
      const base = y + 64 + row * 48 + 32;
      ctx.font = font(600, 24);
      ctx.fillStyle = p.foreground;
      ctx.fillText(fit(ctx, pl.name, colW - 200), x, base);
      ctx.textAlign = "right";
      ctx.font = font(400, 20);
      ctx.fillStyle = p.muted;
      ctx.fillText(`${pl.elo}`, x + colW - 92, base);
      ctx.font = font(700, 24);
      ctx.fillStyle = pl.delta > 0 ? p.success : pl.delta < 0 ? p.destructive : p.muted;
      ctx.fillText(signed(pl.delta), x + colW, base);
      ctx.textAlign = "left";
    });
    y += playersH + gap;
  }

  // ── Footer ──
  ctx.font = font(400, 20);
  ctx.fillStyle = p.muted;
  const extra = data.players.length > players.length ? ` (topp ${players.length} visas)` : "";
  ctx.fillText(`${data.playerCount} spelare · ${data.rounds.length} ${data.rounds.length === 1 ? "runda" : "rundor"}${extra}`, PAD, y + 26);
  ctx.textAlign = "right";
  ctx.fillText("Rundpingisklubben · RPK", WIDTH - PAD, y + 26);
  ctx.textAlign = "left";
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
  });
}
