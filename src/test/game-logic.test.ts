import { describe, expect, it } from "vitest";
import type { GameSession } from "../app/components/api";
import { createMatch, recalcMatch } from "../app/components/match-card";
import {
  computeAllH2H,
  computeEloRatings,
  computeH2H,
  eloWinProbability,
  getH2H,
  isGoldenSet,
} from "../app/components/tournament-enhancements";
import { computePotDistribution } from "../app/components/highscore-page";

function session(date: number, players: string[], rounds: [string, string, string][]): GameSession {
  return {
    id: `s${date}`,
    date,
    players,
    rounds: rounds.map(([a, b, winner]) => ({ finalists: [a, b], winner })),
  };
}

describe("recalcMatch", () => {
  function play(bestOf: number, sets: [number, number][]) {
    const m = createMatch("m1", "Final", bestOf);
    m.player1.name = "Anna";
    m.player2.name = "Bert";
    sets.forEach(([a, b], i) => {
      m.player1.sets[i] = a;
      m.player2.sets[i] = b;
    });
    return recalcMatch(m, "Spelare 1", "Spelare 2");
  }

  it("utser vinnaren när tillräckligt många set är vunna", () => {
    const m = play(3, [[11, 5], [11, 9]]);
    expect(m.player1.matchWins).toBe(2);
    expect(m.winner).toBe("Anna");
  });

  it("kräver två poängs marginal i ett set", () => {
    const m = play(3, [[11, 10], [11, 9]]);
    expect(m.player1.matchWins).toBe(1);
    expect(m.winner).toBeNull();
  });

  it("räknar förlängda set", () => {
    const m = play(1, [[12, 14]]);
    expect(m.player2.matchWins).toBe(1);
    expect(m.winner).toBe("Bert");
  });

  it("faller tillbaka på platshållaren när namnet saknas", () => {
    const m = createMatch("m1", "Final", 1);
    m.player2.sets[0] = 11;
    expect(recalcMatch(m, "Spelare 1", "Spelare 2").winner).toBe("Spelare 2");
  });
});

describe("isGoldenSet", () => {
  it("är gyllene när förloraren tog högst två poäng", () => {
    expect(isGoldenSet(11, 0)).toBe(true);
    expect(isGoldenSet(2, 11)).toBe(true);
    expect(isGoldenSet(11, 3)).toBe(false);
  });

  it("är inte gyllene för ett oavgjort set", () => {
    expect(isGoldenSet(5, 2)).toBe(false);
  });
});

describe("eloWinProbability", () => {
  it("är 50 % vid lika rating och symmetrisk", () => {
    expect(eloWinProbability(1000, 1000)).toBe(0.5);
    expect(eloWinProbability(1200, 1000) + eloWinProbability(1000, 1200)).toBeCloseTo(1);
  });

  it("ger 400 poängs övertag ungefär 91 %", () => {
    expect(eloWinProbability(1400, 1000)).toBeCloseTo(10 / 11);
  });
});

describe("computePotDistribution", () => {
  it("delar potten lika mellan jämna finalister och är nollsumma", () => {
    const d = computePotDistribution(1000, 1000, 4);
    expect(d.pot).toBe(12);
    expect(d.eWinner).toBe(0.5);
    expect(d.winnerShare + d.loserShare).toBe(d.pot);
    expect(d.winnerDelta).toBe(5);
    expect(d.loserDelta).toBe(1);
    expect(d.isUpset).toBe(false);
  });

  it("ger förloraren minst insatsen plus ett", () => {
    const d = computePotDistribution(1000, 1000, 2);
    expect(d.loserShare).toBe(4);
    expect(d.loserDelta).toBe(1);
  });

  it("ger skrällbonus per 100 Elo i underläge", () => {
    const d = computePotDistribution(900, 1150, 4);
    expect(d.isUpset).toBe(true);
    expect(d.upsetBonus).toBe(20);
  });
});

describe("computeEloRatings", () => {
  it("startar på 1000 och flyttar insatser till finalisterna", () => {
    const r = computeEloRatings([session(1, ["A", "B", "C", "D"], [["A", "B", "A"]])]);
    expect(r.A.elo).toBe(1005);
    expect(r.B.elo).toBe(1001);
    expect(r.C.elo).toBe(997);
    expect(r.D.elo).toBe(997);
    expect(r.A.matches).toBe(1);
  });

  it("är nollsumma över alla spelare", () => {
    const r = computeEloRatings([
      session(1, ["A", "B", "C", "D"], [["A", "B", "A"], ["C", "A", "C"]]),
      session(2, ["A", "B", "C"], [["B", "C", "B"]]),
    ]);
    const total = Object.values(r).reduce((sum, p) => sum + p.elo, 0);
    expect(total).toBe(4000);
  });

  it("räknar i datumordning oavsett ordning i listan", () => {
    const a = session(1, ["A", "B"], [["A", "B", "A"]]);
    const b = session(2, ["A", "B"], [["A", "B", "B"]]);
    expect(computeEloRatings([b, a])).toEqual(computeEloRatings([a, b]));
  });

  it("hoppar över sessioner före återställningen", () => {
    const r = computeEloRatings([session(1, ["A", "B"], [["A", "B", "A"]]), session(5, ["A", "B"], [])], 3);
    expect(r.A.elo).toBe(1000);
  });

  it("använder samma pottfördelning som highscore-sidan", () => {
    const r = computeEloRatings([session(1, ["A", "B", "C", "D", "E"], [["A", "B", "B"]])]);
    const d = computePotDistribution(1000, 1000, 5);
    expect(r.B.elo).toBe(1000 + d.winnerDelta);
    expect(r.A.elo).toBe(1000 + d.loserDelta);
  });
});

describe("inbördes möten", () => {
  const sessions = [session(1, ["A", "B", "C"], [["A", "B", "A"], ["B", "A", "B"], ["A", "B", "A"], ["A", "C", "C"]])];

  it("räknar bara finaler mellan just de två", () => {
    expect(computeH2H(sessions, "A", "B")).toEqual({ wins1: 2, wins2: 1, total: 3 });
  });

  it("vänder posten när paret slås upp baklänges", () => {
    const map = computeAllH2H(sessions, ["A", "B", "C"]);
    expect(getH2H(map, "B", "A")).toEqual({ wins1: 1, wins2: 2, total: 3 });
    expect(getH2H(map, "X", "Y")).toEqual({ wins1: 0, wins2: 0, total: 0 });
  });
});
