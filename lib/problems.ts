import { Difficulty, NumberRange, Problem, QuestionType } from "./types";

function rng(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Shared generators (used by both difficulty + sandbox) ────────────────────

function makeAddition(maxA: number, maxB: number): Problem {
  const a = rng(1, maxA);
  const b = rng(1, maxB);
  return { question: `${a} + ${b}`, answer: a + b, tolerance: 0, type: "arithmetic" };
}

function makeSubtraction(maxA: number, maxB: number): Problem {
  const a = rng(2, maxA);
  const b = rng(1, Math.min(a, maxB));
  return { question: `${a} - ${b}`, answer: a - b, tolerance: 0, type: "arithmetic" };
}

function makeMultiplication(maxA: number, maxB: number): Problem {
  const a = rng(2, maxA);
  const b = rng(2, maxB);
  return { question: `${a} × ${b}`, answer: a * b, tolerance: 0, type: "arithmetic" };
}

function makeDivision(maxQuotient: number): Problem {
  const b = rng(2, 12);
  const answer = rng(2, maxQuotient);
  return { question: `${b * answer} ÷ ${b}`, answer, tolerance: 0, type: "arithmetic" };
}

function makeFractions(): Problem {
  const pairs: [string, number][] = [
    ["1/4", 0.25], ["3/4", 0.75], ["1/8", 0.125], ["3/8", 0.375],
    ["5/8", 0.625], ["7/8", 0.875], ["1/3", 0.33], ["2/3", 0.67],
    ["1/6", 0.17], ["5/6", 0.83], ["1/5", 0.2], ["2/5", 0.4],
    ["3/5", 0.6], ["4/5", 0.8],
  ];
  const [q, a] = pick(pairs);
  return { question: `${q} = ?  (2 dec.)`, answer: a, tolerance: 0.01, type: "fraction" };
}

function makePercentage(maxBase: number): Problem {
  const pcts = [5, 10, 15, 20, 25, 30, 40, 50, 75];
  const p = pick(pcts);
  const base = rng(2, Math.floor(maxBase / 10)) * 10;
  return { question: `${p}% of ${base}`, answer: (p / 100) * base, tolerance: 0, type: "percentage" };
}

function makeSquares(maxN: number): Problem {
  const n = rng(2, maxN);
  return { question: `${n}²`, answer: n * n, tolerance: 0, type: "arithmetic" };
}

function makeRoots(): Problem {
  const perfect = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225];
  const n = pick(perfect);
  return { question: `√${n}`, answer: Math.sqrt(n), tolerance: 0, type: "arithmetic" };
}

function makeDecimals(): Problem {
  // decimal × whole, e.g. 0.25 × 80
  const decimals: [number, string][] = [
    [0.1, "0.1"], [0.2, "0.2"], [0.25, "0.25"], [0.5, "0.5"], [0.75, "0.75"],
    [1.5, "1.5"], [2.5, "2.5"],
  ];
  const [d, ds] = pick(decimals);
  const n = rng(2, 20) * 4;
  return { question: `${ds} × ${n}`, answer: d * n, tolerance: 0.01, type: "arithmetic" };
}

// ── Number range → params ────────────────────────────────────────────────────

const RANGE_PARAMS: Record<NumberRange, { addMax: number; mulMax: number; divMax: number; pctMax: number; sqMax: number }> = {
  easy:   { addMax: 30,  mulMax: 9,  divMax: 10, pctMax: 100, sqMax: 9  },
  medium: { addMax: 200, mulMax: 12, divMax: 30, pctMax: 200, sqMax: 15 },
  hard:   { addMax: 999, mulMax: 25, divMax: 99, pctMax: 500, sqMax: 20 },
};

// ── Sandbox: generate by type ────────────────────────────────────────────────

export function generateByTypes(types: QuestionType[], range: NumberRange): Problem {
  const p = RANGE_PARAMS[range];
  const type = pick(types);
  switch (type) {
    case "addition":       return makeAddition(p.addMax, p.addMax);
    case "subtraction":    return makeSubtraction(p.addMax, p.addMax);
    case "multiplication": return makeMultiplication(p.mulMax, p.mulMax);
    case "division":       return makeDivision(p.divMax);
    case "fractions":      return makeFractions();
    case "percentage":     return makePercentage(p.pctMax);
    case "squares":        return makeSquares(p.sqMax);
    case "roots":          return makeRoots();
    case "decimals":       return makeDecimals();
  }
}

export function generateSandboxRound(types: QuestionType[], range: NumberRange, count: number): Problem[] {
  return Array.from({ length: count }, () => generateByTypes(types, range));
}

// ── Difficulty-mapped generator (existing) ───────────────────────────────────

function addSub(maxA: number, maxB: number): Problem {
  const a = rng(1, maxA);
  const b = rng(1, maxB);
  const op = pick(["+", "-"] as const);
  const [x, y] = op === "-" && b > a ? [b, a] : [a, b];
  return { question: `${x} ${op} ${y}`, answer: op === "+" ? x + y : x - y, tolerance: 0, type: "arithmetic" };
}

function squareRoot(): Problem { return makeRoots(); }

function compoundPct(): Problem {
  const base = rng(100, 500) * 10;
  const pct = pick([5, 10, 12.5, 15, 20, 25]);
  return { question: `${base} + ${pct}% =`, answer: base * (1 + pct / 100), tolerance: 1, type: "percentage" };
}

function estimation(): Problem {
  const a = rng(10, 99);
  const b = rng(10, 99);
  const answer = a * b;
  return { question: `≈ ${a} × ${b}  (±5%)`, answer, tolerance: answer * 0.05, type: "estimation" };
}

function threeDigitMul(): Problem {
  const a = rng(10, 99);
  const b = rng(10, 99);
  const op = pick(["×", "+"] as const);
  return op === "×"
    ? { question: `${a} × ${b}`, answer: a * b, tolerance: 0, type: "arithmetic" }
    : { question: `${a * 10} + ${b * 11}`, answer: a * 10 + b * 11, tolerance: 0, type: "arithmetic" };
}

export function generateProblem(difficulty: Difficulty): Problem {
  switch (difficulty) {
    case "intern":
      return pick([
        () => addSub(50, 50),
        () => makeMultiplication(9, 9),
        () => makePercentage(100),
      ])();
    case "analyst":
      return pick([
        () => addSub(200, 200),
        () => makeMultiplication(12, 12),
        () => makeDivision(20),
        () => makeFractions(),
      ])();
    case "associate":
      return pick([
        () => addSub(500, 500),
        () => makeMultiplication(25, 25),
        () => makeDivision(50),
        () => squareRoot(),
        () => compoundPct(),
      ])();
    case "vp":
      return pick([
        () => threeDigitMul(),
        () => compoundPct(),
        () => squareRoot(),
        () => estimation(),
        () => makeFractions(),
      ])();
    case "md":
      return pick([
        () => threeDigitMul(),
        () => estimation(),
        () => compoundPct(),
        () => { const a = rng(100, 999); const b = rng(100, 999); return { question: `${a} + ${b}`, answer: a + b, tolerance: 0, type: "arithmetic" as const }; },
      ])();
  }
}

export function generateRound(difficulty: Difficulty, count: number): Problem[] {
  return Array.from({ length: count }, () => generateProblem(difficulty));
}
