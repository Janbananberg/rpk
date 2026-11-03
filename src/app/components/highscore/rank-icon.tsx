export function getRankIcon(rank: number) {
  if (rank === 1) return <span style={{ fontSize: "var(--text-lg)" }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize: "var(--text-lg)" }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: "var(--text-lg)" }}>🥉</span>;
  return (
    <span
      className="text-muted-foreground"
      style={{ fontSize: "var(--text-label)" }}
    >
      {rank}
    </span>
  );
}
