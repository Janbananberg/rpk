import { useRef, useState } from "react";

// ── Elo Sparkline Component ──
// Uses distinct visual patterns beyond color for accessibility:
//   Uptrend: solid line + upward triangle end marker (▲)
//   Downtrend: dashed line + downward triangle end marker (▼)
//   Neutral: dotted line + circle end marker (●)
export function EloSparkline({
  data, width = 48, height = 18, strokeWidth = 1.5, interactive = false, responsive = false,
}: {
  data: number[]; width?: number; height?: number; strokeWidth?: number; interactive?: boolean; responsive?: boolean;
}) {
  const gradId = useRef(`spark-${Math.random().toString(36).slice(2, 8)}`).current;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!data || data.length < 2) return null;

  const points = data.slice(-20);
  const mn = Math.min(...points), mx = Math.max(...points), rng = mx - mn || 1;
  const pad = interactive ? 4 : 2;
  const topPad = interactive ? 16 : pad;
  const svgH = interactive ? height + 14 : height;
  const cW = width - pad * 2, cH = height - pad - topPad;
  const pts = points.map((v, i) => ({
    x: pad + (i / (points.length - 1)) * cW,
    y: topPad + cH - ((v - mn) / rng) * cH,
    val: v,
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const trend = points[points.length - 1] - points[0];
  const color = trend > 0 ? "var(--success)" : trend < 0 ? "var(--destructive)" : "var(--muted-foreground)";
  // Stroke dash pattern: solid for up, dashed for down, dotted for neutral
  const strokeDash = trend > 0 ? "none" : trend < 0 ? `${strokeWidth * 3} ${strokeWidth * 2}` : `${strokeWidth} ${strokeWidth * 2}`;
  const fillD = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${svgH - pad} L${pts[0].x.toFixed(1)},${svgH - pad} Z`;
  const endPt = pts[pts.length - 1];
  const markerSize = interactive ? 3.5 : 2.2;

  const handleMouseMove = interactive ? (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    let closest = 0, closestDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const dist = Math.abs(pts[i].x - mouseX);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    }
    setHoverIdx(closest);
  } : undefined;

  const hp = hoverIdx !== null ? pts[hoverIdx] : null;
  const hoverDelta = hoverIdx !== null && hoverIdx > 0 ? points[hoverIdx] - points[hoverIdx - 1] : null;

  // End marker shape based on trend direction
  const renderEndMarker = (cx: number, cy: number, s: number) => {
    if (trend > 0) {
      return <polygon points={`${cx},${cy - s} ${cx + s},${cy + s * 0.7} ${cx - s},${cy + s * 0.7}`} fill={color} />;
    } else if (trend < 0) {
      return <polygon points={`${cx},${cy + s} ${cx + s},${cy - s * 0.7} ${cx - s},${cy - s * 0.7}`} fill={color} />;
    } else {
      return <circle cx={cx} cy={cy} r={s * 0.7} fill={color} />;
    }
  };

  return (
    <svg
      ref={svgRef}
      width={responsive ? undefined : width}
      height={responsive ? undefined : svgH}
      viewBox={`0 0 ${width} ${svgH}`}
      className="shrink-0"
      style={responsive ? { width: "100%", height: svgH } : undefined}
      preserveAspectRatio={responsive ? "xMidYMid meet" : undefined}
      onMouseMove={handleMouseMove}
      onMouseLeave={interactive ? () => setHoverIdx(null) : undefined}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={strokeDash}
      />
      {/* Data point ticks along the curve (interactive mode) */}
      {interactive && pts.map((p, i) => {
        if (i === 0 || i === pts.length - 1) return null;
        const localTrend = points[i] - points[i - 1];
        return (
          <circle
            key={`tick-${i}`}
            cx={p.x}
            cy={p.y}
            r={1.2}
            fill={localTrend > 0 ? "var(--success)" : localTrend < 0 ? "var(--destructive)" : "var(--muted-foreground)"}
            opacity={0.6}
          />
        );
      })}
      {/* End marker: ▲ up / ▼ down / ● neutral */}
      {renderEndMarker(endPt.x, endPt.y, markerSize)}
      {interactive && hp && (
        <>
          <line x1={hp.x} y1={topPad} x2={hp.x} y2={svgH - pad} stroke={color} strokeWidth={0.7} strokeDasharray="3 2" opacity={0.5} />
          <circle cx={hp.x} cy={hp.y} r={3.5} fill={color} />
          <circle cx={hp.x} cy={hp.y} r={2} fill="var(--surface-container-lowest)" />
          {(() => {
            const label = `${hp.val}${hoverDelta !== null && hoverDelta !== 0 ? ` (${hoverDelta > 0 ? "+" : ""}${hoverDelta})` : ""}`;
            const textX = Math.max(pad + 14, Math.min(hp.x, width - pad - 14));
            return (
              <text x={textX} y={topPad - 4} textAnchor="middle" fill={color}
                style={{ fontSize: 10, fontWeight: 600 }}
              >{label}</text>
            );
          })()}
        </>
      )}
      {interactive && pts.map((p, i) => {
        const halfGap = cW / (pts.length - 1) / 2;
        return <rect key={i} x={p.x - halfGap} y={0} width={halfGap * 2} height={svgH} fill="transparent" />;
      })}
    </svg>
  );
}
