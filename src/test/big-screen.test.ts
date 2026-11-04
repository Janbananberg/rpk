import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameSession } from "../app/components/api";
import { computeBigScreenData } from "../app/lib/big-screen";
import { computeElo } from "../app/lib/elo";

function session(date: number, players: string[], rounds: [string, string, string][]): GameSession {
  return { id: `s${date}`, date, players, rounds: rounds.map(([a, b, winner]) => ({ finalists: [a, b], winner })) };
}

const PLAYERS = ["Anna", "Bert", "Cecilia", "David", "Eva"];
const oct = (day: number) => new Date(2026, 9, day, 12).getTime();
const nov = (day: number) => new Date(2026, 10, day, 12).getTime();

describe("Storbild", () => {
  afterEach(() => vi.useRealTimers());

  it("tar topplistan, senaste omgången och sviterna ur samma Elo som appen", () => {
    vi.useFakeTimers();
    vi.setSystemTime(nov(5));
    const october = [session(oct(20), PLAYERS, [["Anna", "Bert", "Anna"], ["Anna", "Cecilia", "Anna"]])];
    const november = [
      session(nov(2), PLAYERS, [["Bert", "Anna", "Bert"], ["David", "Eva", "Eva"]]),
      session(nov(4), PLAYERS, [["Bert", "Cecilia", "Bert"], ["Cecilia", "Anna", "Cecilia"]]),
    ];
    const data = computeBigScreenData({ "2026-10": october, "2026-11": november }, PLAYERS, null, "2026-11");

    expect(data.leaderboardIsMonthly).toBe(true);
    expect(data.leaderboard.length).toBe(5);
    const elo = computeElo([...october, ...november], PLAYERS);
    for (const row of data.leaderboard) expect(row.elo).toBe(elo[row.name].elo);

    expect(data.latestSession?.date).toBe(nov(4));
    expect(data.latestSession?.rounds.map((r) => r.winner)).toEqual(["Bert", "Cecilia"]);

    // Bert beat Anna in November while she was far ahead after October.
    expect(data.biggestUpset?.winner).toBe("Bert");
    expect(data.biggestUpset?.loser).toBe("Anna");

    // Bert has two final wins in a row, Anna two final losses in a row.
    expect(data.hotStreaks).toContainEqual({ name: "Bert", streak: 2 });
    expect(data.coldStreaks).toContainEqual({ name: "Anna", streak: 2 });

    expect(data.monthTotals).toEqual({ rounds: 4, sessions: 2, players: 5 });
    expect(data.funFacts.length).toBeGreaterThan(0);
  });

  it("faller tillbaka på Elo över all tid när månaden saknar omgångar", () => {
    vi.useFakeTimers();
    vi.setSystemTime(oct(25));
    const october = [session(oct(20), PLAYERS, [["Anna", "Bert", "Anna"]])];
    const data = computeBigScreenData({ "2026-10": october }, PLAYERS, null, "2026-11");
    expect(data.leaderboardIsMonthly).toBe(false);
    expect(data.leaderboard[0].name).toBe("Anna");
    expect(data.leaderboard[0].monthDelta).toBeNull();
    expect(data.biggestUpset).toBeNull();
  });

  it("visar ingenting utan data", () => {
    const data = computeBigScreenData({}, [], null, "2026-11");
    expect(data.leaderboard).toEqual([]);
    expect(data.latestSession).toBeNull();
    expect(data.funFacts).toEqual([]);
  });
});
