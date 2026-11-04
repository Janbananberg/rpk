import { describe, expect, it } from "vitest";
import type { GameSession } from "../app/components/api";
import { addSession, findSamePlayer, isGameSession, mergeSessions, renameInSessions, renameKey } from "../../worker/sessions";

function session(id: string, date: number, rounds: [string, string, string][] = [["Anna", "Bert", "Anna"]]): GameSession {
  return { id, date, players: ["Anna", "Bert", "Cecilia"], rounds: rounds.map(([a, b, winner]) => ({ finalists: [a, b], winner })) };
}

describe("Speltillfällen på servern", () => {
  it("lägger ett nytt speltillfälle först och behåller de som redan finns", () => {
    const stored = [session("a", 1)];
    expect(addSession(stored, session("b", 2)).map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("sparar inte samma speltillfälle två gånger", () => {
    const stored = [session("a", 1)];
    expect(addSession(stored, session("a", 1))).toBe(stored);
  });

  it("tar inte bort omgångar som en gammal kopia av månaden saknar", () => {
    // A phone that never fetched "b" sends the month as it knows it: an empty list, or "a" only.
    const stored = [session("b", 2), session("a", 1)];
    expect(mergeSessions(stored, []).map((s) => s.id)).toEqual(["b", "a"]);
    expect(mergeSessions(stored, [session("a", 1, [["Cecilia", "Anna", "Cecilia"]])]).map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("låter en skickad kopia ersätta den sparade med samma id", () => {
    const stored = [session("a", 1)];
    const [merged] = mergeSessions(stored, [session("a", 1, [["Cecilia", "Anna", "Cecilia"]])]);
    expect(merged.rounds[0].winner).toBe("Cecilia");
  });

  it("byter namn i spelare, finalister, vinnare och rundans spelare", () => {
    const s: GameSession = {
      id: "a",
      date: 1,
      players: ["Anna", "Bert"],
      rounds: [{ finalists: ["Anna", "Bert"], winner: "Anna", players: ["Anna", "Bert"] }, { finalists: ["Bert", "Anna"], winner: "Bert" }],
    };
    const [renamed] = renameInSessions([s], "Anna", "Annika");
    expect(renamed.players).toEqual(["Annika", "Bert"]);
    expect(renamed.rounds[0]).toEqual({ finalists: ["Annika", "Bert"], winner: "Annika", players: ["Annika", "Bert"] });
    expect(renamed.rounds[1]).toEqual({ finalists: ["Bert", "Annika"], winner: "Bert" });
  });

  it("flyttar en spelares värde till det nya namnet", () => {
    expect(renameKey({ Anna: 1, Bert: 2 }, "Anna", "Annika")).toEqual({ Annika: 1, Bert: 2 });
    const unchanged = { Bert: 2 };
    expect(renameKey(unchanged, "Anna", "Annika")).toBe(unchanged);
  });

  it("räknar samma namn med annan emoji som upptaget", () => {
    expect(findSamePlayer(["🦊 Björn", "Anna"], "🐶 björn")).toBe("🦊 Björn");
    expect(findSamePlayer(["🦊 Björn"], "Bert")).toBeUndefined();
  });

  it("godtar bara något som ser ut som ett speltillfälle", () => {
    expect(isGameSession(session("a", 1))).toBe(true);
    expect(isGameSession({ id: "", date: 1, players: [], rounds: [] })).toBe(false);
    expect(isGameSession({ id: "a", date: "igår", players: [], rounds: [] })).toBe(false);
    expect(isGameSession(null)).toBe(false);
  });
});
