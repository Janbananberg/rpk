import type { ReactNode } from "react";
import { Flame, Snowflake, Sparkles, Trophy, Zap } from "lucide-react";
import type { BigScreenData, BigScreenStreak } from "../../lib/big-screen";
import { formatMonthLabel, formatRelativeDate, formatSessionDate } from "../../lib/dates";
import { GruvrankBadge } from "../highscore/gruvrank-badge";

/** Size in the big screen's viewport unit (`--u`, set on the page root). */
export const u = (n: number) => `calc(var(--u) * ${n})`;

export type SlideKey = "leaderboard" | "latest" | "streaks" | "facts";

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const deltaColor = (n: number) => (n > 0 ? "var(--success)" : n < 0 ? "var(--destructive)" : "var(--muted-foreground)");

function SlideTitle({ icon, title, sub }: { icon: ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-end shrink-0" style={{ gap: u(2), marginBottom: u(2.5) }}>
      <span className="flex items-center text-primary" style={{ height: u(6.5) }}>{icon}</span>
      <h1 style={{ fontSize: u(6), fontWeight: "var(--font-weight-bold)", lineHeight: 1, margin: 0 }}>{title}</h1>
      {sub && (
        <span className="text-muted-foreground" style={{ fontSize: u(2.6), marginLeft: u(1), paddingBottom: u(0.4) }}>
          {sub}
        </span>
      )}
    </div>
  );
}

const iconStyle = { width: u(5.5), height: u(5.5) };

// ── Topplista ──
function LeaderboardSlide({ data }: { data: BigScreenData }) {
  const cols = `${u(7)} ${u(7.5)} 1fr ${u(15)} ${u(17)} ${u(17)}`;
  return (
    <>
      <SlideTitle
        icon={<Trophy style={iconStyle} />}
        title="Topplista"
        sub={data.leaderboardIsMonthly ? `${formatMonthLabel(data.month)} · rankad på månadens Elo-utveckling` : "Elo · ingen omgång den här månaden än"}
      />
      <div className="grid items-center text-muted-foreground shrink-0" style={{ gridTemplateColumns: cols, columnGap: u(2), padding: `0 ${u(2.5)}`, fontSize: u(2.2), textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: u(0.8) }}>
        <span>#</span>
        <span />
        <span>Spelare</span>
        <span className="text-right">Vinster</span>
        <span className="text-right">{data.leaderboardIsMonthly ? "Δ månad" : ""}</span>
        <span className="text-right">Elo</span>
      </div>
      <div className="flex flex-col" style={{ gap: u(0.8) }}>
        {data.leaderboard.map((p, i) => {
          const first = i === 0;
          return (
            <div
              key={p.name}
              className="grid items-center border"
              style={{
                gridTemplateColumns: cols,
                columnGap: u(2),
                height: u(7.2),
                padding: `0 ${u(2.5)}`,
                borderRadius: "var(--radius-card)",
                background: first ? "color-mix(in srgb, var(--primary) 16%, var(--surface-container))" : "var(--surface-container)",
                borderColor: first ? "color-mix(in srgb, var(--primary) 45%, var(--border))" : "var(--border)",
              }}
            >
              <span className={`tabular-nums ${first ? "text-primary" : "text-muted-foreground"}`} style={{ fontSize: u(4), fontWeight: "var(--font-weight-bold)" }}>
                {i + 1}
              </span>
              <GruvrankBadge rank={p.rank} size={48} style={{ width: u(5.6), height: u(5.6) }} />
              <span className="truncate" style={{ fontSize: u(4.2), fontWeight: first ? "var(--font-weight-bold)" : "var(--font-weight-semibold)" }}>
                {p.name}
              </span>
              <span className="text-right tabular-nums text-muted-foreground" style={{ fontSize: u(3.6) }}>{p.wins}</span>
              <span className="text-right tabular-nums" style={{ fontSize: u(3.6), fontWeight: "var(--font-weight-semibold)", color: p.monthDelta === null ? undefined : deltaColor(p.monthDelta) }}>
                {p.monthDelta === null ? "" : signed(p.monthDelta)}
              </span>
              <span className={`text-right tabular-nums ${first ? "text-primary" : ""}`} style={{ fontSize: u(4.2), fontWeight: "var(--font-weight-bold)" }}>
                {p.elo}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Senaste omgången / största skräll ──
const MAX_ROUNDS = 6;

function LatestSlide({ data }: { data: BigScreenData }) {
  const latest = data.latestSession;
  const rounds = latest ? latest.rounds.slice(-MAX_ROUNDS) : [];
  const hidden = latest ? latest.rounds.length - rounds.length : 0;
  const upset = data.biggestUpset;
  return (
    <>
      <SlideTitle
        icon={<Zap style={iconStyle} />}
        title="Senaste omgången"
        sub={latest ? `${formatRelativeDate(latest.date)} · ${latest.playerCount} spelare · ${latest.rounds.length} ${latest.rounds.length === 1 ? "runda" : "rundor"}` : undefined}
      />
      <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: upset ? "1.35fr 1fr" : "1fr", gap: u(4) }}>
        <div className="flex flex-col min-w-0" style={{ gap: u(1) }}>
          {hidden > 0 && (
            <span className="text-muted-foreground" style={{ fontSize: u(2.4) }}>+ {hidden} tidigare rundor</span>
          )}
          {rounds.map((r, i) => (
            <div
              key={i}
              className="flex items-center border min-w-0"
              style={{ gap: u(2), height: u(8), padding: `0 ${u(2.5)}`, borderRadius: "var(--radius-card)", background: "var(--surface-container)", borderColor: "var(--border)" }}
            >
              <Trophy className="shrink-0" style={{ width: u(3.6), height: u(3.6), color: "var(--warning)" }} />
              <span className="truncate" style={{ fontSize: u(4), fontWeight: "var(--font-weight-bold)", flex: "1 1 0" }}>{r.winner}</span>
              <span className="tabular-nums shrink-0" style={{ fontSize: u(3.2), fontWeight: "var(--font-weight-semibold)", color: deltaColor(r.winnerDelta) }}>{signed(r.winnerDelta)}</span>
              <span className="text-muted-foreground shrink-0" style={{ fontSize: u(2.6), padding: `0 ${u(1)}` }}>slog</span>
              <span className="truncate text-muted-foreground" style={{ fontSize: u(3.4), flex: "1 1 0" }}>{r.loser}</span>
              <span className="tabular-nums shrink-0" style={{ fontSize: u(3), color: deltaColor(r.loserDelta) }}>{signed(r.loserDelta)}</span>
            </div>
          ))}
        </div>
        {upset && (
          <div
            className="flex flex-col justify-center border min-w-0"
            style={{
              padding: u(4),
              gap: u(1.5),
              borderRadius: "var(--radius-card)",
              background: "color-mix(in srgb, var(--warning) 12%, var(--surface-container))",
              borderColor: "color-mix(in srgb, var(--warning) 45%, var(--border))",
            }}
          >
            <span className="flex items-center" style={{ gap: u(1.2), fontSize: u(2.6), color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "var(--font-weight-bold)" }}>
              <Sparkles style={{ width: u(3), height: u(3) }} /> Månadens största skräll
            </span>
            <span className="truncate" style={{ fontSize: u(6), fontWeight: "var(--font-weight-bold)", lineHeight: 1.1 }}>{upset.winner}</span>
            <span className="text-muted-foreground truncate" style={{ fontSize: u(3.4) }}>slog {upset.loser}</span>
            <span style={{ fontSize: u(4.4), fontWeight: "var(--font-weight-bold)", color: "var(--warning)", marginTop: u(1) }}>
              {upset.eloGap} Elo i underläge
            </span>
            <span className="text-muted-foreground" style={{ fontSize: u(2.4) }}>{formatSessionDate(upset.date)}</span>
          </div>
        )}
      </div>
    </>
  );
}

// ── Vinst- och förlustsviter ──
function StreakColumn({ title, icon, color, streaks, unit }: { title: string; icon: ReactNode; color: string; streaks: BigScreenStreak[]; unit: string }) {
  return (
    <div className="flex flex-col min-w-0" style={{ gap: u(1.2) }}>
      <span className="flex items-center" style={{ gap: u(1.5), fontSize: u(3.6), fontWeight: "var(--font-weight-bold)", color }}>
        {icon} {title}
      </span>
      {streaks.length === 0 ? (
        <span className="text-muted-foreground" style={{ fontSize: u(3) }}>Ingen svit just nu</span>
      ) : (
        streaks.map((s, i) => (
          <div
            key={s.name}
            className="flex items-center border min-w-0"
            style={{
              gap: u(2),
              height: i === 0 ? u(12) : u(8.5),
              padding: `0 ${u(3)}`,
              borderRadius: "var(--radius-card)",
              background: i === 0 ? `color-mix(in srgb, ${color} 14%, var(--surface-container))` : "var(--surface-container)",
              borderColor: i === 0 ? `color-mix(in srgb, ${color} 45%, var(--border))` : "var(--border)",
            }}
          >
            <span className="truncate flex-1" style={{ fontSize: i === 0 ? u(5) : u(3.8), fontWeight: "var(--font-weight-bold)" }}>{s.name}</span>
            <span className="tabular-nums shrink-0" style={{ fontSize: i === 0 ? u(7) : u(4.6), fontWeight: "var(--font-weight-bold)", color, lineHeight: 1 }}>{s.streak}</span>
            <span className="text-muted-foreground shrink-0 whitespace-nowrap" style={{ fontSize: u(2.4) }}>{unit}</span>
          </div>
        ))
      )}
    </div>
  );
}

function StreaksSlide({ data }: { data: BigScreenData }) {
  return (
    <>
      <SlideTitle icon={<Flame style={iconStyle} />} title="Aktuella sviter" sub="Finaler i rad" />
      <div className="grid flex-1 min-h-0" style={{ gridTemplateColumns: "1fr 1fr", gap: u(5) }}>
        <StreakColumn title="Vinstsviter" icon={<Flame style={{ width: u(4), height: u(4) }} />} color="var(--warning)" streaks={data.hotStreaks} unit="raka vinster" />
        <StreakColumn title="Förlustsviter" icon={<Snowflake style={{ width: u(4), height: u(4) }} />} color="var(--info)" streaks={data.coldStreaks} unit="raka förluster" />
      </div>
    </>
  );
}

// ── Fun fact ──
function FactsSlide({ data, factIndex }: { data: BigScreenData; factIndex: number }) {
  const fact = data.funFacts[factIndex % data.funFacts.length];
  const tiles = [
    { label: "Rundor i månaden", value: data.monthTotals.rounds },
    { label: "Omgångar", value: data.monthTotals.sessions },
    { label: "Spelare", value: data.monthTotals.players },
  ];
  return (
    <>
      <SlideTitle icon={<Sparkles style={iconStyle} />} title="Visste du att …" />
      <div className="flex-1 min-h-0 flex items-center">
        <p style={{ fontSize: u(7), fontWeight: "var(--font-weight-bold)", lineHeight: 1.2, margin: 0, maxWidth: u(150) }}>{fact}</p>
      </div>
      <div className="grid shrink-0" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: u(3), marginBottom: u(1) }}>
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col border" style={{ padding: `${u(2)} ${u(3)}`, borderRadius: "var(--radius-card)", background: "var(--surface-container)", borderColor: "var(--border)" }}>
            <span className="text-primary tabular-nums" style={{ fontSize: u(6), fontWeight: "var(--font-weight-bold)", lineHeight: 1.1 }}>{t.value}</span>
            <span className="text-muted-foreground" style={{ fontSize: u(2.6) }}>{t.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export const BIG_SCREEN_SLIDES: Record<SlideKey, { label: string; render: (data: BigScreenData, factIndex: number) => ReactNode }> = {
  leaderboard: { label: "Topplista", render: (data) => <LeaderboardSlide data={data} /> },
  latest: { label: "Senaste omgången", render: (data) => <LatestSlide data={data} /> },
  streaks: { label: "Sviter", render: (data) => <StreaksSlide data={data} /> },
  facts: { label: "Visste du att", render: (data, factIndex) => <FactsSlide data={data} factIndex={factIndex} /> },
};

/** Slides that have something to show, in rotation order. */
export function availableSlides(data: BigScreenData): SlideKey[] {
  const slides: SlideKey[] = [];
  if (data.leaderboard.length > 0) slides.push("leaderboard");
  if ((data.latestSession && data.latestSession.rounds.length > 0) || data.biggestUpset) slides.push("latest");
  if (data.hotStreaks.length > 0 || data.coldStreaks.length > 0) slides.push("streaks");
  if (data.funFacts.length > 0) slides.push("facts");
  return slides;
}
