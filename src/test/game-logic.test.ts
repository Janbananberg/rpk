import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameSession } from "../app/components/api";
import { createMatch, recalcMatch } from "../app/components/match-card";
import {
  applyEloDecay,
  computeAllH2H,
  computeElo,
  computeEloRatings,
  computeH2H,
  computePotDistribution,
  eloWinProbability,
  getH2H,
  weightedDelta,
} from "../app/lib/elo";
import type { EloEntry } from "../app/lib/elo";
import { matchPlayerName, stripEmoji } from "../app/lib/players";
import { computePlayerPercentile, getCSGORank } from "../app/lib/rank";
import { computeStats } from "../app/lib/stats";
import { buildStatsCsv } from "../app/lib/stats-csv";
import { isGoldenSet } from "../app/lib/golden-set";

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

describe("weightedDelta", () => {
  it("delar med roten ur antalet rundor", () => {
    expect(weightedDelta(20, 4)).toBe(10);
    expect(weightedDelta(-9, 9)).toBe(-3);
  });

  it("ger 0 utan rundor", () => {
    expect(weightedDelta(15, 0)).toBe(0);
    expect(weightedDelta(15, -1)).toBe(0);
  });
});

describe("computeElo", () => {
  it("ger samma rating som turneringens Elo och följer toppnoteringen", () => {
    const sessions = [
      session(1, ["A", "B", "C", "D"], [["A", "B", "A"], ["C", "A", "C"]]),
      session(2, ["A", "B", "C"], [["B", "C", "B"]]),
    ];
    const hs = computeElo(sessions);
    const t = computeEloRatings(sessions);
    for (const name of ["A", "B", "C", "D"]) {
      expect(hs[name].elo).toBe(t[name].elo);
      expect(hs[name].matches).toBe(t[name].matches);
    }
    expect(hs.A.peakElo).toBe(1006);
    expect(hs.D.peakElo).toBe(1000);
  });

  it("tar med spelare som aldrig spelat", () => {
    expect(computeElo([], ["Z"]).Z).toEqual({ name: "Z", elo: 1000, peakElo: 1000, matches: 0, delta: 0 });
  });
});

describe("applyEloDecay", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const FOUR_WEEKS = 28 * DAY;
  const NOW = Date.UTC(2026, 5, 1, 12);
  const entry = (name: string, elo: number): EloEntry => ({ name, elo, peakElo: elo, matches: 10, delta: 0 });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rör inte den som spelat de senaste fyra veckorna", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const r = applyEloDecay({ A: entry("A", 1100) }, { A: NOW - FOUR_WEEKS });
    expect(r.A.elo).toBe(1100);
  });

  it("drar 15 per hel dag efter fyra veckor, ned till 700", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const lp = NOW - FOUR_WEEKS - 10 * DAY - 60 * 60 * 1000;
    const r = applyEloDecay({ A: entry("A", 1100), B: entry("B", 720) }, { A: lp, B: lp });
    expect(r.A.elo).toBe(950);
    expect(r.A.peakElo).toBe(1100);
    expect(r.B.elo).toBe(700);
  });

  it("räknar från återställningen om spelaren senast spelade före den", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const reset = NOW - FOUR_WEEKS - 2 * DAY;
    const r = applyEloDecay({ A: entry("A", 1000) }, { A: NOW - 200 * DAY }, reset);
    expect(r.A.elo).toBe(970);
  });

  it("räknar från 1 februari 2026 för den som aldrig spelat", () => {
    vi.useFakeTimers();
    const baseline = Date.UTC(2026, 1, 1);
    vi.setSystemTime(baseline + FOUR_WEEKS + 3 * DAY);
    const r = applyEloDecay({ A: entry("A", 1000) }, {});
    expect(r.A.elo).toBe(955);
  });
});

describe("Gruvrank", () => {
  it("väljer högsta nivån vars tröskel nås", () => {
    expect(getCSGORank(100).name).toBe("Match‑Point Monarch");
    expect(getCSGORank(98).tier).toBe(7);
    expect(getCSGORank(97.9).tier).toBe(6);
    expect(getCSGORank(78).shortName).toBe("NN");
    expect(getCSGORank(35).tier).toBe(3);
    expect(getCSGORank(14.9).tier).toBe(1);
    expect(getCSGORank(0).name).toBe("Ball Boy/Girl");
  });

  it("faller tillbaka på lägsta nivån för negativa percentiler", () => {
    expect(getCSGORank(-5).tier).toBe(1);
  });

  it("räknar percentil bland övriga spelare", () => {
    expect(computePlayerPercentile(1000, [1000])).toBe(50);
    expect(computePlayerPercentile(1200, [900, 1000, 1200])).toBe(100);
    expect(computePlayerPercentile(900, [900, 1000, 1200])).toBe(0);
    expect(computePlayerPercentile(1000, [900, 1000, 1200])).toBe(50);
  });
});

describe("spelarnamn", () => {
  it("tar bort inledande emoji", () => {
    expect(stripEmoji("🏓 Anna")).toBe("Anna");
    expect(stripEmoji("Mr Nyberg 🚬")).toBe("Mr Nyberg 🚬");
    expect(stripEmoji(null)).toBe("");
  });

  it("matchar turneringsnamn mot highscore-namn", () => {
    expect(matchPlayerName("anna", "🏓 Anna")).toBe(true);
    expect(matchPlayerName("Lodnart", "Lodnert")).toBe(true);
    expect(matchPlayerName("Bert", "Anna")).toBe(false);
  });
});

describe("buildStatsCsv", () => {
  it("skriver BOM, rubrikrad och en rad per spelare utan emoji", () => {
    const sessions = [session(1, ["🏓 A", "B", "C", "D", "E"], [["🏓 A", "B", "🏓 A"]])];
    const stats = computeStats(sessions, ["🏓 A", "B", "C", "D", "E"]);
    const csv = buildStatsCsv(stats, computeElo(sessions), sessions);
    expect(csv.startsWith("﻿")).toBe(true);
    const [header, ...rows] = csv.slice(1).split("\n");
    expect(header.split(";")).toHaveLength(31);
    expect(rows).toHaveLength(5);
    const a = rows.find((r) => r.startsWith("A;"))!.split(";");
    expect(a.slice(0, 5)).toEqual(["A", "1007", "1", "1", "1"]);
    expect(a[30]).toBe("B:1-0");
  });
});
