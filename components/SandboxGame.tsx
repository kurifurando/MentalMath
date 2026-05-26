"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Problem, RoundResult, SandboxConfig } from "@/lib/types";
import { generateByTypes, generateSandboxRound } from "@/lib/problems";

// ── Shared visual components ─────────────────────────────────────────────────

function Ticker() {
  const items = [
    "AAPL +2.4%", "MSFT -0.8%", "BTC +1.2%", "SPX 0.0%",
    "GS +0.6%", "JPM -0.3%", "ES1 +0.4%", "VIX 18.2",
    "TSLA -1.1%", "NVDA +3.2%", "AMZN +0.7%", "QQQ -0.5%",
    "DXY 104.2", "10Y 4.38%", "WTI 78.4", "GOLD +0.2%",
  ];
  const doubled = [...items, ...items];
  return (
    <div className="border-b overflow-hidden text-xs" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
      <div className="ticker-track flex gap-8 py-1.5 px-4 whitespace-nowrap w-max">
        {doubled.map((t, i) => <span key={i} className="font-mono tracking-wider">{t}</span>)}
      </div>
    </div>
  );
}

function TimerBar({ value, max, danger = false }: { value: number; max: number; danger?: boolean }) {
  const pct = Math.max(0, (value / max) * 100);
  const color = danger
    ? (pct < 25 ? "var(--red)" : pct < 50 ? "var(--amber)" : "var(--cyan)")
    : "var(--green)";
  return (
    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.25, ease: "linear" }}
      />
    </div>
  );
}

function QuestionDisplay({ problem, index }: { problem: Problem; index: number }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.18 }}
        className="text-center"
      >
        <div
          className="text-5xl sm:text-6xl font-bold tracking-tight leading-none"
          style={{ color: "var(--amber)", fontFamily: '"Orbitron", monospace' }}
        >
          {problem.question}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── TIME TRIAL mode ───────────────────────────────────────────────────────────
// N questions, clock counts up, wrong = +3s penalty shown, goal = fastest time

interface TrialState {
  phase: "playing" | "results";
  problems: Problem[];
  index: number;
  results: RoundResult[];
  elapsedMs: number;
  totalPenaltyMs: number;
}

function TimeTrial({ config, onBack }: { config: SandboxConfig; onBack: () => void }) {
  const PENALTY_S = 3;
  const problems = useRef(generateSandboxRound(config.questionTypes, config.numberRange, config.questionCount));

  const [state, setState] = useState<TrialState>({
    phase: "playing",
    problems: problems.current,
    index: 0,
    results: [],
    elapsedMs: 0,
    totalPenaltyMs: 0,
  });
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "correct" | "wrong"; ans: number } | null>(null);
  const [penaltyFlash, setPenaltyFlash] = useState(false);

  const startMs = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    timerRef.current = setInterval(() => {
      setState(s => s.phase === "playing" ? { ...s, elapsedMs: Date.now() - startMs.current } : s);
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (state.phase === "playing") inputRef.current?.focus();
  }, [state.index, state.phase]);

  function submit() {
    const raw = parseFloat(input.trim());
    if (isNaN(raw)) return;

    const problem = state.problems[state.index];
    const correct = Math.abs(raw - problem.answer) <= (problem.tolerance || 0.005);
    const now = Date.now();
    const timeTaken = (now - startMs.current) / 1000;

    const result: RoundResult = { correct, timeTaken, problem, userAnswer: raw };
    setFeedback({ kind: correct ? "correct" : "wrong", ans: problem.answer });
    setInput("");

    if (!correct) {
      setPenaltyFlash(true);
      setTimeout(() => setPenaltyFlash(false), 600);
    }

    const nextIndex = state.index + 1;
    setTimeout(() => {
      setFeedback(null);
      if (nextIndex >= state.problems.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setState(s => ({
          ...s,
          phase: "results",
          index: nextIndex,
          results: [...s.results, result],
          totalPenaltyMs: s.totalPenaltyMs + (correct ? 0 : PENALTY_S * 1000),
          elapsedMs: Date.now() - startMs.current,
        }));
      } else {
        setState(s => ({
          ...s,
          index: nextIndex,
          results: [...s.results, result],
          totalPenaltyMs: s.totalPenaltyMs + (correct ? 0 : PENALTY_S * 1000),
        }));
      }
    }, 300);
  }

  if (state.phase === "results") {
    const correct = state.results.filter(r => r.correct).length;
    const accuracy = Math.round((correct / state.results.length) * 100);
    const rawMs = state.elapsedMs;
    const totalMs = rawMs + state.totalPenaltyMs;
    const fmt = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

    return (
      <ResultsShell
        title="TIME TRIAL"
        badge={fmt(totalMs)}
        badgeColor="var(--cyan)"
        onRetry={() => { problems.current = generateSandboxRound(config.questionTypes, config.numberRange, config.questionCount); onBack(); }}
        onBack={onBack}
        results={state.results}
      >
        <StatGrid stats={[
          { label: "RAW TIME",    value: fmt(rawMs),                          color: "var(--text)" },
          { label: "PENALTIES",   value: `+${fmt(state.totalPenaltyMs)}`,      color: state.totalPenaltyMs > 0 ? "var(--red)" : "var(--text-dim)" },
          { label: "TOTAL TIME",  value: fmt(totalMs),                         color: "var(--cyan)" },
          { label: "ACCURACY",    value: `${accuracy}%`,                       color: accuracy >= 80 ? "var(--green)" : "var(--amber)" },
        ]} />
      </ResultsShell>
    );
  }

  const elapsed = state.elapsedMs / 1000;

  return (
    <PlayShell
      config={config}
      label="TIME TRIAL"
      rightSlot={
        <span className="text-xs tabular-nums" style={{ color: penaltyFlash ? "var(--red)" : "var(--cyan)", fontFamily: '"Orbitron", monospace' }}>
          {elapsed.toFixed(1)}s {penaltyFlash && <span style={{ color: "var(--red)" }}>+{PENALTY_S}s</span>}
        </span>
      }
      progress={`${state.index + 1} / ${state.problems.length}`}
      inputRef={inputRef}
      input={input}
      onInputChange={setInput}
      onSubmit={submit}
      feedback={feedback}
      problem={state.problems[state.index]}
      questionIndex={state.index}
      timerSlot={null}
    />
  );
}

// ── SPEED TRAINING mode ───────────────────────────────────────────────────────
// Fixed time bank, answer as many as possible

interface SpeedState {
  phase: "playing" | "results";
  index: number;
  results: RoundResult[];
  timeLeft: number;
}

function SpeedTraining({ config, onBack }: { config: SandboxConfig; onBack: () => void }) {
  const [state, setState] = useState<SpeedState>({
    phase: "playing",
    index: 0,
    results: [],
    timeLeft: config.timeBank,
  });
  const [currentProblem, setCurrentProblem] = useState<Problem>(() =>
    generateByTypes(config.questionTypes, config.numberRange)
  );
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "correct" | "wrong"; ans: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    timerRef.current = setInterval(() => {
      setState(s => {
        if (s.timeLeft <= 1) {
          clearInterval(timerRef.current!);
          return { ...s, phase: "results", timeLeft: 0 };
        }
        return { ...s, timeLeft: s.timeLeft - 1 };
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (state.phase === "playing") inputRef.current?.focus();
  }, [state.index, state.phase]);

  function submit() {
    if (state.phase !== "playing") return;
    const raw = parseFloat(input.trim());
    if (isNaN(raw)) return;

    const correct = Math.abs(raw - currentProblem.answer) <= (currentProblem.tolerance || 0.005);
    const result: RoundResult = { correct, timeTaken: config.timeBank - state.timeLeft, problem: currentProblem, userAnswer: raw };

    setFeedback({ kind: correct ? "correct" : "wrong", ans: currentProblem.answer });
    setInput("");
    const nextProblem = generateByTypes(config.questionTypes, config.numberRange);

    setTimeout(() => {
      setFeedback(null);
      setCurrentProblem(nextProblem);
      setState(s => ({ ...s, index: s.index + 1, results: [...s.results, result] }));
    }, 250);
  }

  if (state.phase === "results") {
    const correct = state.results.filter(r => r.correct).length;
    const rate = state.results.length > 0 ? ((correct / config.timeBank) * 60).toFixed(1) : "0";
    const pnl = correct * 500;

    return (
      <ResultsShell
        title="SPEED TRAINING"
        badge={`${correct} ✓`}
        badgeColor="var(--green)"
        onRetry={onBack}
        onBack={onBack}
        results={state.results}
      >
        <StatGrid stats={[
          { label: "CORRECT",     value: `${correct}`,       color: "var(--green)" },
          { label: "ATTEMPTED",   value: `${state.results.length}`, color: "var(--text)" },
          { label: "RATE",        value: `${rate}/min`,       color: "var(--cyan)" },
          { label: "P&L",         value: `+$${pnl.toLocaleString()}`, color: "var(--green)" },
        ]} />
      </ResultsShell>
    );
  }

  const correct = state.results.filter(r => r.correct).length;

  return (
    <PlayShell
      config={config}
      label="SPEED TRAINING"
      rightSlot={
        <span className="text-lg font-bold tabular-nums" style={{ color: "var(--green)", fontFamily: '"Orbitron", monospace' }}>
          {correct} ✓
        </span>
      }
      progress={`${state.results.length + 1} answered`}
      inputRef={inputRef}
      input={input}
      onInputChange={setInput}
      onSubmit={submit}
      feedback={feedback}
      problem={currentProblem}
      questionIndex={state.index}
      timerSlot={
        <div className="space-y-2">
          <div className="flex justify-between text-xs" style={{ color: "var(--text-dim)" }}>
            <span>TIME REMAINING</span>
            <span style={{ color: state.timeLeft <= 10 ? "var(--red)" : "var(--text-dim)" }}>
              {state.timeLeft}s
            </span>
          </div>
          <TimerBar value={state.timeLeft} max={config.timeBank} danger />
        </div>
      }
    />
  );
}

// ── PENALIZED mode ────────────────────────────────────────────────────────────
// N questions with countdown, wrong = P&L loss + 3s time penalty

interface PenalizedState {
  phase: "playing" | "results";
  problems: Problem[];
  index: number;
  results: RoundResult[];
  score: number;
  streak: number;
  maxStreak: number;
  timeLeft: number;
  timePenaltyTotal: number;
}

function PenalizedGame({ config, onBack }: { config: SandboxConfig; onBack: () => void }) {
  const PENALTY_S = 3;
  const BASE = 1000;
  const PENALTY_PNL = 750;

  const [state, setState] = useState<PenalizedState>(() => ({
    phase: "playing",
    problems: generateSandboxRound(config.questionTypes, config.numberRange, config.questionCount),
    index: 0,
    results: [],
    score: 0,
    streak: 0,
    maxStreak: 0,
    timeLeft: config.timePerQuestion,
    timePenaltyTotal: 0,
  }));
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "correct" | "wrong"; ans: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  const currentProblem = state.problems[state.index];

  const advance = useCallback((result: RoundResult, newScore: number, newStreak: number, penalty: number) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    processingRef.current = false;
    const nextIndex = result.correct ? state.index + 1 : state.index + 1;

    if (nextIndex >= state.problems.length) {
      setState(s => ({
        ...s,
        phase: "results",
        index: nextIndex,
        results: [...s.results, result],
        score: newScore,
        streak: newStreak,
        maxStreak: Math.max(s.maxStreak, newStreak),
        timePenaltyTotal: s.timePenaltyTotal + penalty,
      }));
    } else {
      setState(s => ({
        ...s,
        index: nextIndex,
        results: [...s.results, result],
        score: newScore,
        streak: newStreak,
        maxStreak: Math.max(s.maxStreak, newStreak),
        timeLeft: config.timePerQuestion,
        timePenaltyTotal: s.timePenaltyTotal + penalty,
      }));
    }
    setInput("");
    setFeedback(null);
  }, [state.index, state.problems.length, config.timePerQuestion]);

  // timer
  useEffect(() => {
    if (state.phase !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setState(s => {
        if (s.timeLeft <= 1 && !processingRef.current) {
          processingRef.current = true;
          clearInterval(timerRef.current!);
          const result: RoundResult = { correct: false, timeTaken: config.timePerQuestion, problem: currentProblem, userAnswer: NaN };
          const newScore = Math.max(0, s.score - PENALTY_PNL);
          setFeedback({ kind: "wrong", ans: currentProblem.answer });
          setTimeout(() => advance(result, newScore, 0, PENALTY_S), 350);
          return { ...s, timeLeft: 0 };
        }
        return s.timeLeft > 0 ? { ...s, timeLeft: s.timeLeft - 1 } : s;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index, state.phase]);

  useEffect(() => {
    if (state.phase === "playing") inputRef.current?.focus();
  }, [state.index, state.phase]);

  function submit() {
    if (processingRef.current) return;
    const raw = parseFloat(input.trim());
    if (isNaN(raw)) return;
    processingRef.current = true;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const correct = Math.abs(raw - currentProblem.answer) <= (currentProblem.tolerance || 0.005);
    const newStreak = correct ? state.streak + 1 : 0;
    const streakBonus = correct && newStreak > 1 ? 250 * (newStreak - 1) : 0;
    const delta = correct ? BASE + streakBonus : -PENALTY_PNL;
    const newScore = Math.max(0, state.score + delta);
    const timePenalty = correct ? 0 : PENALTY_S;
    const timeTaken = config.timePerQuestion - state.timeLeft;

    const result: RoundResult = { correct, timeTaken, problem: currentProblem, userAnswer: raw };
    setFeedback({ kind: correct ? "correct" : "wrong", ans: currentProblem.answer });
    setTimeout(() => advance(result, newScore, newStreak, timePenalty), 350);
  }

  if (state.phase === "results") {
    const correct = state.results.filter(r => r.correct).length;
    const accuracy = Math.round((correct / state.results.length) * 100);
    const grade = accuracy >= 90 ? "S" : accuracy >= 80 ? "A" : accuracy >= 65 ? "B" : accuracy >= 50 ? "C" : "F";
    const gradeColor = grade === "S" ? "var(--cyan)" : grade === "A" ? "var(--green)" : grade === "B" ? "var(--amber)" : "var(--red)";

    return (
      <ResultsShell
        title="PENALIZED"
        badge={grade}
        badgeColor={gradeColor}
        onRetry={onBack}
        onBack={onBack}
        results={state.results}
      >
        <StatGrid stats={[
          { label: "P&L",          value: (state.score >= 0 ? "+" : "") + `$${state.score.toLocaleString()}`, color: state.score >= 0 ? "var(--green)" : "var(--red)" },
          { label: "ACCURACY",     value: `${accuracy}%`,        color: accuracy >= 80 ? "var(--green)" : "var(--amber)" },
          { label: "PEAK STREAK",  value: `×${state.maxStreak}`, color: "var(--cyan)" },
          { label: "TIME BURNED",  value: `${state.timePenaltyTotal}s`, color: state.timePenaltyTotal > 0 ? "var(--red)" : "var(--text-dim)" },
        ]} />
      </ResultsShell>
    );
  }

  const sign = state.score >= 0 ? "+" : "";

  return (
    <PlayShell
      config={config}
      label="PENALIZED"
      rightSlot={
        <span className="text-xl font-bold tabular-nums" style={{ color: state.score >= 0 ? "var(--green)" : "var(--red)", fontFamily: '"Orbitron", monospace' }}>
          {sign}${state.score.toLocaleString()}
        </span>
      }
      progress={`${state.index + 1} / ${state.problems.length}`}
      inputRef={inputRef}
      input={input}
      onInputChange={setInput}
      onSubmit={submit}
      feedback={feedback}
      problem={currentProblem}
      questionIndex={state.index}
      timerSlot={
        <div className="space-y-2">
          <div className="flex justify-between text-xs" style={{ color: "var(--text-dim)" }}>
            <span>TIME</span>
            <span style={{ color: state.timeLeft <= 3 ? "var(--red)" : "var(--text-dim)" }}>{state.timeLeft}s</span>
          </div>
          <TimerBar value={state.timeLeft} max={config.timePerQuestion} danger />
        </div>
      }
    />
  );
}

// ── Shared layout shells ──────────────────────────────────────────────────────

interface PlayShellProps {
  config: SandboxConfig;
  label: string;
  rightSlot: React.ReactNode;
  progress: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  feedback: { kind: "correct" | "wrong"; ans: number } | null;
  problem: Problem;
  questionIndex: number;
  timerSlot: React.ReactNode;
}

function PlayShell({
  label, rightSlot, progress, inputRef, input, onInputChange, onSubmit,
  feedback, problem, questionIndex, timerSlot,
}: PlayShellProps) {
  const feedbackBorder =
    feedback?.kind === "correct" ? "var(--green)" :
    feedback?.kind === "wrong"   ? "var(--red)"   : "var(--border-hi)";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Ticker />
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-xs tracking-widest" style={{ color: "var(--text-dim)", fontFamily: '"Orbitron", monospace' }}>
          {label}
        </span>
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: "var(--text-dim)" }}>{progress}</span>
          {rightSlot}
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-8">
          {timerSlot}
          <QuestionDisplay problem={problem} index={questionIndex} />
          <motion.div
            animate={{
              borderColor: feedbackBorder,
              boxShadow: feedback?.kind === "correct"
                ? "0 0 0 1px var(--green), 0 0 20px rgba(0,217,126,0.2)"
                : feedback?.kind === "wrong"
                ? "0 0 0 1px var(--red), 0 0 20px rgba(255,59,71,0.2)"
                : "none",
            }}
            transition={{ duration: 0.15 }}
            className="border flex items-center"
            style={{ background: "var(--bg-raised)" }}
          >
            <span className="px-4 text-xl" style={{ color: "var(--text-dim)" }}>›</span>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={input}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onSubmit()}
              placeholder="answer"
              className="flex-1 bg-transparent py-5 pr-4 text-2xl font-bold outline-none placeholder:opacity-20"
              style={{ color: "var(--white)", fontFamily: '"Orbitron", monospace', caretColor: "var(--green)" }}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={onSubmit}
              className="px-5 py-5 text-xs tracking-widest border-l transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--green)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}
            >
              ENTER
            </button>
          </motion.div>
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center text-sm tracking-widest font-bold"
                style={{ color: feedback.kind === "correct" ? "var(--green)" : "var(--red)" }}
              >
                {feedback.kind === "correct" ? "✓ CORRECT" : `✗ WRONG — ${feedback.ans}`}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StatGrid({ stats }: { stats: { label: string; value: string; color: string }[] }) {
  return (
    <div className="grid grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
      {stats.map(s => (
        <div key={s.label} className="px-3 py-3" style={{ background: "var(--bg-card)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>{s.label}</div>
          <div className="text-base font-bold tabular-nums" style={{ color: s.color, fontFamily: '"Orbitron", monospace' }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

function ResultsShell({
  title, badge, badgeColor, onRetry, onBack, results, children,
}: {
  title: string;
  badge: string;
  badgeColor: string;
  onRetry: () => void;
  onBack: () => void;
  results: RoundResult[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Ticker />
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-xl"
        >
          <div className="border p-6 space-y-5" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs tracking-widest mb-1" style={{ color: "var(--text-dim)" }}>
                  ROUND COMPLETE — {title}
                </div>
                <div className="text-xs" style={{ color: "var(--text-dim)" }}>
                  {results.filter(r => r.correct).length} / {results.length} CORRECT
                </div>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.25, type: "spring", stiffness: 300 }}
                className="text-4xl font-black"
                style={{ color: badgeColor, fontFamily: '"Orbitron", monospace' }}
              >
                {badge}
              </motion.div>
            </div>

            {children}

            {/* problem log */}
            <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs py-1 px-2"
                  style={{
                    background: r.correct ? "rgba(0,217,126,0.05)" : "rgba(255,59,71,0.05)",
                    borderLeft: `2px solid ${r.correct ? "var(--green)" : "var(--red)"}`,
                  }}
                >
                  <span style={{ color: "var(--text-dim)" }}>{r.problem.question}</span>
                  <span style={{ color: r.correct ? "var(--green)" : "var(--red)" }}>
                    {r.correct ? `= ${r.problem.answer}` : `✗ (${r.problem.answer})`}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onRetry}
                className="flex-1 py-3 text-xs tracking-widest font-bold"
                style={{ background: "var(--green)", color: "var(--bg)", fontFamily: '"Orbitron", monospace' }}
              >
                RECONFIGURE
              </button>
              <button
                onClick={onBack}
                className="flex-1 py-3 text-xs tracking-widest border"
                style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--text-dim)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
              >
                EXIT SANDBOX
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

interface Props {
  config: SandboxConfig;
  onBack: () => void;
}

export default function SandboxGame({ config, onBack }: Props) {
  switch (config.gameMode) {
    case "time_trial":     return <TimeTrial config={config} onBack={onBack} />;
    case "speed_training": return <SpeedTraining config={config} onBack={onBack} />;
    case "penalized":      return <PenalizedGame config={config} onBack={onBack} />;
  }
}
