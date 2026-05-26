"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Difficulty,
  GameState,
  RoundResult,
  DIFFICULTY_CONFIG,
  BASE_REWARD,
  WRONG_PENALTY,
  STREAK_BONUS,
} from "@/lib/types";
import { generateRound } from "@/lib/problems";

// ── Sub-components ────────────────────────────────────────────────────────────

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
        {doubled.map((t, i) => (
          <span key={i} className="font-mono tracking-wider">{t}</span>
        ))}
      </div>
    </div>
  );
}

function PnlDisplay({ value }: { value: number }) {
  const sign = value >= 0 ? "+" : "";
  const color = value >= 0 ? "var(--green)" : "var(--red)";
  return (
    <motion.span
      key={value}
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.15 }}
      style={{ color, fontFamily: '"Orbitron", monospace' }}
      className="text-2xl font-bold tabular-nums"
    >
      {sign}${value.toLocaleString()}
    </motion.span>
  );
}

function TimerBar({ seconds, total }: { seconds: number; total: number }) {
  const pct = (seconds / total) * 100;
  const color = pct > 50 ? "var(--green)" : pct > 25 ? "var(--amber)" : "var(--red)";
  return (
    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color, width: `${pct}%` }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.2, ease: "linear" }}
      />
    </div>
  );
}

// ── Main engine ───────────────────────────────────────────────────────────────

interface Props {
  onExit: () => void;
}

export default function GameEngine({ onExit }: Props) {
  const [state, setState] = useState<GameState>({
    phase: "idle",
    difficulty: "analyst",
    score: 0,
    streak: 0,
    maxStreak: 0,
    questionIndex: 0,
    results: [],
    totalQuestions: 10,
  });

  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timeLeft, setTimeLeft] = useState(8);
  const [problems, setProblems] = useState(generateRound("analyst", 10));
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentProblem = problems[state.questionIndex];
  const config = DIFFICULTY_CONFIG[state.difficulty];

  // focus input when playing
  useEffect(() => {
    if (state.phase === "playing") inputRef.current?.focus();
  }, [state.phase, state.questionIndex]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const advanceQuestion = useCallback((result: RoundResult, newScore: number, newStreak: number) => {
    stopTimer();
    const nextIndex = state.questionIndex + 1;

    if (nextIndex >= config.totalQuestions) {
      setState(s => ({
        ...s,
        phase: "results",
        score: newScore,
        streak: newStreak,
        maxStreak: Math.max(s.maxStreak, newStreak),
        results: [...s.results, result],
      }));
    } else {
      setState(s => ({
        ...s,
        score: newScore,
        streak: newStreak,
        maxStreak: Math.max(s.maxStreak, newStreak),
        questionIndex: nextIndex,
        results: [...s.results, result],
      }));
      setTimeLeft(config.timePerQuestion);
    }
    setInput("");
    setFeedback(null);
  }, [state.questionIndex, config, stopTimer]);

  // timer tick
  useEffect(() => {
    if (state.phase !== "playing") return;
    stopTimer();
    setTimeLeft(config.timePerQuestion);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          // timeout = wrong
          const result: RoundResult = {
            correct: false,
            timeTaken: config.timePerQuestion,
            problem: currentProblem,
            userAnswer: NaN,
          };
          const newScore = Math.max(0, state.score - WRONG_PENALTY * config.multiplier);
          setFeedback("wrong");
          advanceQuestion(result, newScore, 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.questionIndex, state.phase]);

  function startGame(diff: Difficulty) {
    const cfg = DIFFICULTY_CONFIG[diff];
    const probs = generateRound(diff, cfg.totalQuestions);
    setProblems(probs);
    setState({
      phase: "playing",
      difficulty: diff,
      score: 0,
      streak: 0,
      maxStreak: 0,
      questionIndex: 0,
      results: [],
      totalQuestions: cfg.totalQuestions,
    });
    setInput("");
    setFeedback(null);
    setTimeLeft(cfg.timePerQuestion);
  }

  function submitAnswer() {
    const raw = parseFloat(input.trim());
    if (isNaN(raw)) return;
    stopTimer();

    const timeTaken = config.timePerQuestion - timeLeft;
    const correct = Math.abs(raw - currentProblem.answer) <= (currentProblem.tolerance || 0.005);
    const newStreak = correct ? state.streak + 1 : 0;
    const streakBonus = correct && newStreak > 1 ? STREAK_BONUS * config.multiplier * (newStreak - 1) : 0;
    const delta = correct
      ? BASE_REWARD * config.multiplier + streakBonus
      : -WRONG_PENALTY * config.multiplier;
    const newScore = Math.max(0, state.score + delta);

    setFeedback(correct ? "correct" : "wrong");
    const result: RoundResult = { correct, timeTaken, problem: currentProblem, userAnswer: raw };

    setTimeout(() => advanceQuestion(result, newScore, newStreak), 350);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") submitAnswer();
  }

  // ── PHASE: idle ───────────────────────────────────────────────────────────

  if (state.phase === "idle") {
    const diffs: Difficulty[] = ["intern", "analyst", "associate", "vp", "md"];
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <Ticker />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-xl"
          >
            <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-dim)" }}>
              SELECT ROUND TYPE
            </div>
            <div className="space-y-2">
              {diffs.map((d, i) => {
                const cfg = DIFFICULTY_CONFIG[d];
                return (
                  <motion.button
                    key={d}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * i, duration: 0.4 }}
                    onClick={() => startGame(d)}
                    className="w-full flex items-center justify-between px-5 py-4 border text-left group transition-all duration-150"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--bg-card)",
                      fontFamily: '"IBM Plex Mono", monospace',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--green)";
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-raised)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-card)";
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xs w-14" style={{ color: "var(--text-dim)" }}>
                        LVL {i + 1}
                      </span>
                      <span className="font-bold tracking-widest" style={{ color: "var(--white)", fontFamily: '"Orbitron", monospace' }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-xs" style={{ color: "var(--text-dim)" }}>
                      <span>{cfg.totalQuestions}Q</span>
                      <span>{cfg.timePerQuestion}s/Q</span>
                      <span style={{ color: "var(--amber)" }}>×{cfg.multiplier}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 text-xs space-y-1"
              style={{ color: "var(--text-dim)" }}
            >
              <p>— TYPE YOUR ANSWER AND PRESS <span style={{ color: "var(--green)" }}>ENTER</span></p>
              <p>— CORRECT: +$1,000 × LEVEL MULTIPLIER</p>
              <p>— STREAK BONUS APPLIES AFTER 2 CONSECUTIVE</p>
              <p>— TIMEOUT COUNTS AS WRONG</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── PHASE: results ────────────────────────────────────────────────────────

  if (state.phase === "results") {
    const correct = state.results.filter(r => r.correct).length;
    const accuracy = Math.round((correct / state.results.length) * 100);
    const avgTime = (state.results.reduce((a, r) => a + r.timeTaken, 0) / state.results.length).toFixed(1);
    const grade =
      accuracy >= 90 ? "S" : accuracy >= 80 ? "A" : accuracy >= 65 ? "B" : accuracy >= 50 ? "C" : "F";
    const gradeColor =
      grade === "S" ? "var(--cyan)" : grade === "A" ? "var(--green)" : grade === "B" ? "var(--amber)" : "var(--red)";

    return (
      <div className="flex-1 flex flex-col min-h-0">
        <Ticker />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-xl"
          >
            <div className="border p-8 space-y-6" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs tracking-widest mb-1" style={{ color: "var(--text-dim)" }}>
                    ROUND COMPLETE — {DIFFICULTY_CONFIG[state.difficulty].label}
                  </div>
                  <PnlDisplay value={state.score} />
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                  className="text-6xl font-black"
                  style={{ color: gradeColor, fontFamily: '"Orbitron", monospace' }}
                >
                  {grade}
                </motion.div>
              </div>

              <div className="grid grid-cols-3 gap-px" style={{ background: "var(--border)" }}>
                {[
                  { label: "ACCURACY", value: `${accuracy}%`, color: accuracy >= 80 ? "var(--green)" : "var(--amber)" },
                  { label: "STREAK", value: `×${state.maxStreak}`, color: "var(--cyan)" },
                  { label: "AVG TIME", value: `${avgTime}s`, color: "var(--text)" },
                ].map(s => (
                  <div key={s.label} className="px-4 py-3" style={{ background: "var(--bg-card)" }}>
                    <div className="text-xs mb-1" style={{ color: "var(--text-dim)" }}>{s.label}</div>
                    <div className="text-xl font-bold tabular-nums" style={{ color: s.color, fontFamily: '"Orbitron", monospace' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* problem log */}
              <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                {state.results.map((r, i) => (
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
                  onClick={() => startGame(state.difficulty)}
                  className="flex-1 py-3 text-xs tracking-widest font-bold transition-colors"
                  style={{ background: "var(--green)", color: "var(--bg)", fontFamily: '"Orbitron", monospace' }}
                >
                  RETRY
                </button>
                <button
                  onClick={() => setState(s => ({ ...s, phase: "idle" }))}
                  className="flex-1 py-3 text-xs tracking-widest border transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--text-dim)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                >
                  CHANGE LEVEL
                </button>
                <button
                  onClick={onExit}
                  className="px-5 py-3 text-xs tracking-widest border transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--text-dim)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                >
                  EXIT
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── PHASE: playing ────────────────────────────────────────────────────────

  const progress = `${state.questionIndex + 1} / ${config.totalQuestions}`;
  const feedbackBorder =
    feedback === "correct" ? "var(--green)" :
    feedback === "wrong" ? "var(--red)" :
    "var(--border-hi)";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Ticker />

      {/* header bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-6">
          <span className="text-xs tracking-widest" style={{ color: "var(--text-dim)", fontFamily: '"Orbitron", monospace' }}>
            {DIFFICULTY_CONFIG[state.difficulty].label}
          </span>
          <span className="text-xs" style={{ color: "var(--text-dim)" }}>{progress}</span>
        </div>
        <div className="flex items-center gap-6">
          {state.streak >= 2 && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-xs px-2 py-0.5 border"
              style={{ borderColor: "var(--amber)", color: "var(--amber)" }}
            >
              {state.streak}× STREAK
            </motion.span>
          )}
          <PnlDisplay value={state.score} />
        </div>
      </div>

      {/* main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-8">

          {/* timer */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs" style={{ color: "var(--text-dim)" }}>
              <span>TIME</span>
              <span style={{ color: timeLeft <= 3 ? "var(--red)" : "var(--text-dim)" }}>{timeLeft}s</span>
            </div>
            <TimerBar seconds={timeLeft} total={config.timePerQuestion} />
          </div>

          {/* question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={state.questionIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-dim)" }}>
                QUESTION {state.questionIndex + 1}
              </div>
              <div
                className="text-5xl font-bold tracking-tight leading-none"
                style={{ color: "var(--amber)", fontFamily: '"Orbitron", monospace' }}
              >
                {currentProblem.question}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* input */}
          <motion.div
            animate={{
              borderColor: feedbackBorder,
              boxShadow: feedback === "correct"
                ? "0 0 0 1px var(--green), 0 0 20px rgba(0,217,126,0.2)"
                : feedback === "wrong"
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
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="answer"
              className="flex-1 bg-transparent py-5 pr-4 text-2xl font-bold outline-none placeholder:opacity-20"
              style={{ color: "var(--white)", fontFamily: '"Orbitron", monospace', caretColor: "var(--green)" }}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={submitAnswer}
              className="px-5 py-5 text-xs tracking-widest border-l transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--green)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}
            >
              ENTER
            </button>
          </motion.div>

          {/* feedback flash */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center text-sm tracking-widest font-bold"
                style={{ color: feedback === "correct" ? "var(--green)" : "var(--red)" }}
              >
                {feedback === "correct" ? "✓ CORRECT" : `✗ WRONG — ${currentProblem.answer}`}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
