import { describe, expect, it } from "vitest";
import type { GameSession } from "../app/components/api";
import { computeElo } from "../app/lib/elo";
import { buildResultCardData } from "../app/lib/result-card";

function session(id: string, date: number, players: string[], rounds: [string, string, string][]): GameSession {
  return { id, date, players, rounds: rounds.map(([a, b, winner]) => ({ finalists: [a, b], winner })) };
}

const PLAYERS = ["Anna", "Bert", "Cecilia", "David", "Eva"];

describe("Resultatkort", () => {
  it("visar vinnare, finalist och omgångens Elo-förändringar", () => {
    const before = [session("a", 1, PLAYERS, [["Anna", "Bert", "Anna"]])];
    const saved = session("b", 2, PLAYERS, [["Cecilia", "David", "Cecilia"], ["Cecilia", "Anna", "Cecilia"], ["Bert", "Eva", "Bert"]]);
    // The saved session is already part of allSessions when the card is built.
    const data = buildResultCardData(saved, [...before, saved], PLAYERS, null);

    expect(data.winner?.name).toBe("Cecilia");
    expect(data.winner?.wins).toBe(2);
    expect(data.finalist?.name).toBe("Anna");
    expect(data.rounds.map((r) => [r.winner, r.finalist])).toEqual([["Cecilia", "David"], ["Cecilia", "Anna"], ["Bert", "Eva"]]);

    // Deltas are what this session did on top of the earlier ones.
    const eloBefore = computeElo(before, PLAYERS);
    const eloAfter = computeElo([...before, saved], PLAYERS);
    for (const p of data.players) {
      expect(p.delta).toBe(eloAfter[p.name].elo - eloBefore[p.name].elo);
      expect(p.elo).toBe(eloAfter[p.name].elo);
    }
    expect(data.players.map((p) => p.delta)).toEqual([...data.players.map((p) => p.delta)].sort((a, b) => b - a));
    expect(data.playerCount).toBe(5);
  });
});
