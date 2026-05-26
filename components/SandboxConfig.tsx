"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type {
  NumberRange,
  QuestionType,
  SandboxConfig,
  SandboxGameMode,
} from "@/lib/types";
import { QUESTION_TYPE_LABELS } from "@/lib/types";

const ALL_TYPES: QuestionType[] = [
  "addition", "subtraction", "multiplication", "division",
  "fractions", "percentage", "squares", "roots", "decimals",
];

const MODES: { id: SandboxGameMode; label: string; sub: string; detail: string }[] = [
  {
    id: "time_trial",
    label: "TIME TRIAL",
    sub: "EXECUTION SPEED",
    detail: "Complete N questions as fast as possible. Wrong answers add a 3s penalty to your final time.",
  },
  {
    id: "speed_training",
    label: "SPEED TRAINING",
    sub: "FLOW STATE",
    detail: "Race the clock. Answer unlimited questions before time runs out. Maximize your correct count.",
  },
  {
    id: "penalized",
    label: "PENALIZED",
    sub: "LIVE POSITION",
    detail: "N questions with a countdown per question. Wrong answers cost P&L and burn 3s from your bank.",
  },
];

const RANGES: { id: NumberRange; label: string; example: string }[] = [
  { id: "easy",   label: "EASY",   example: "e.g. 8 × 7, 30 - 12" },
  { id: "medium", label: "MEDIUM", example: "e.g. 84 × 12, 65%" },
  { id: "hard",   label: "HARD",   example: "e.g. 47 × 93, 3-digit" },
];

const Q_COUNTS = [10, 20, 30, 50];
const TIME_BANKS = [45, 60, 90, 120];
const TIME_PER_Q = [4, 6, 8, 10];

interface Props {
  onStart: (config: SandboxConfig) => void;
  onBack: () => void;
}

export default function SandboxConfig({ onStart, onBack }: Props) {
  const [types, setTypes] = useState<Set<QuestionType>>(new Set(["addition", "multiplication"]));
  const [mode, setMode] = useState<SandboxGameMode>("time_trial");
  const [range, setRange] = useState<NumberRange>("medium");
  const [qCount, setQCount] = useState(20);
  const [timeBank, setTimeBank] = useState(60);
  const [timePerQ, setTimePerQ] = useState(8);

  function toggleType(t: QuestionType) {
    setTypes(prev => {
      const next = new Set(prev);
      if (next.has(t)) {
        if (next.size === 1) return prev; // always keep at least one
        next.delete(t);
      } else {
        next.add(t);
      }
      return next;
    });
  }

  function handleStart() {
    onStart({
      questionTypes: Array.from(types),
      gameMode: mode,
      questionCount: qCount,
      timeBank,
      timePerQuestion: timePerQ,
      numberRange: range,
    });
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={onBack}
          className="text-xs tracking-widest transition-colors"
          style={{ color: "var(--text-dim)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--green)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}
        >
          ← BACK
        </button>
        <span className="text-xs tracking-[0.3em] font-bold" style={{ color: "var(--green)", fontFamily: '"Orbitron", monospace' }}>
          SANDBOX CONFIG
        </span>
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>
          {types.size} TYPE{types.size !== 1 ? "S" : ""} SELECTED
        </span>
      </div>

      <div className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full space-y-10">

        {/* ── Question types ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-dim)" }}>
            01 — QUESTION TYPES
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ALL_TYPES.map(t => {
              const on = types.has(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className="py-2.5 px-3 text-xs tracking-wider border transition-all duration-100 text-left"
                  style={{
                    borderColor: on ? "var(--green)" : "var(--border)",
                    background: on ? "rgba(0,217,126,0.08)" : "var(--bg-card)",
                    color: on ? "var(--green)" : "var(--text-dim)",
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                >
                  {on && <span className="mr-1.5">✓</span>}
                  {QUESTION_TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-xs" style={{ color: "var(--text-faint)" }}>
            Tap to toggle. At least one required.
          </div>
        </motion.section>

        {/* ── Number range ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-dim)" }}>
            02 — NUMBER RANGE
          </div>
          <div className="grid grid-cols-3 gap-2">
            {RANGES.map(r => {
              const on = range === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className="py-3 px-4 border text-left transition-all duration-100"
                  style={{
                    borderColor: on ? "var(--amber)" : "var(--border)",
                    background: on ? "rgba(240,192,96,0.08)" : "var(--bg-card)",
                  }}
                >
                  <div className="text-xs font-bold mb-1" style={{ color: on ? "var(--amber)" : "var(--text)", fontFamily: '"Orbitron", monospace' }}>
                    {r.label}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-dim)" }}>{r.example}</div>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* ── Game mode ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-dim)" }}>
            03 — GAME MODE
          </div>
          <div className="space-y-2">
            {MODES.map(m => {
              const on = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className="w-full border p-4 text-left transition-all duration-100"
                  style={{
                    borderColor: on ? "var(--cyan)" : "var(--border)",
                    background: on ? "rgba(0,229,204,0.06)" : "var(--bg-card)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: on ? "var(--cyan)" : "var(--text-faint)" }}
                    />
                    <span className="text-xs font-bold tracking-widest" style={{ color: on ? "var(--cyan)" : "var(--text)", fontFamily: '"Orbitron", monospace' }}>
                      {m.label}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-dim)" }}>— {m.sub}</span>
                  </div>
                  <p className="text-xs ml-5" style={{ color: "var(--text-dim)" }}>{m.detail}</p>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* ── Mode-specific settings ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-dim)" }}>
            04 — PARAMETERS
          </div>

          {mode === "speed_training" ? (
            <div className="space-y-4">
              <Label>TIME BANK</Label>
              <SegmentPicker
                values={TIME_BANKS}
                selected={timeBank}
                onSelect={setTimeBank}
                fmt={v => `${v}s`}
                color="var(--cyan)"
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>QUESTIONS</Label>
                <SegmentPicker
                  values={Q_COUNTS}
                  selected={qCount}
                  onSelect={setQCount}
                  fmt={v => `${v}Q`}
                  color="var(--cyan)"
                />
              </div>
              {mode === "penalized" && (
                <div className="space-y-3">
                  <Label>TIME PER QUESTION</Label>
                  <SegmentPicker
                    values={TIME_PER_Q}
                    selected={timePerQ}
                    onSelect={setTimePerQ}
                    fmt={v => `${v}s`}
                    color="var(--red)"
                  />
                </div>
              )}
            </div>
          )}
        </motion.section>

        {/* ── CTA ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <button
            onClick={handleStart}
            className="w-full py-4 text-sm tracking-[0.2em] font-black transition-all duration-150"
            style={{ background: "var(--green)", color: "var(--bg)", fontFamily: '"Orbitron", monospace' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--cyan)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--green)"; }}
          >
            DEPLOY ROUND →
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs tracking-wider" style={{ color: "var(--text-dim)" }}>{children}</div>;
}

function SegmentPicker({
  values,
  selected,
  onSelect,
  fmt,
  color,
}: {
  values: number[];
  selected: number;
  onSelect: (v: number) => void;
  fmt: (v: number) => string;
  color: string;
}) {
  return (
    <div className="flex gap-2">
      {values.map(v => {
        const on = selected === v;
        return (
          <button
            key={v}
            onClick={() => onSelect(v)}
            className="flex-1 py-2.5 text-xs font-bold border transition-all duration-100"
            style={{
              borderColor: on ? color : "var(--border)",
              background: on ? `color-mix(in srgb, ${color} 10%, transparent)` : "var(--bg-card)",
              color: on ? color : "var(--text-dim)",
              fontFamily: '"Orbitron", monospace',
            }}
          >
            {fmt(v)}
          </button>
        );
      })}
    </div>
  );
}
