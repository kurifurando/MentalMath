"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import dynamic from "next/dynamic";
import { SandboxConfig } from "@/lib/types";

const GameEngine  = dynamic(() => import("@/components/GameEngine"),  { ssr: false });
const SandboxCfg  = dynamic(() => import("@/components/SandboxConfig"), { ssr: false });
const SandboxGame = dynamic(() => import("@/components/SandboxGame"),   { ssr: false });

type AppPhase = "landing" | "difficulty" | "sandbox-config" | "sandbox-game";

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>("landing");
  const [sandboxConfig, setSandboxConfig] = useState<SandboxConfig | null>(null);

  function startSandbox(config: SandboxConfig) {
    setSandboxConfig(config);
    setPhase("sandbox-game");
  }

  return (
    <main className="min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      <AnimatePresence mode="wait">

        {phase === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            {/* nav */}
            <nav className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-xs tracking-[0.3em] font-bold" style={{ color: "var(--green)", fontFamily: '"Orbitron", monospace' }}>
                QUANT<span style={{ color: "var(--text-dim)" }}>/</span>TERMINAL
              </span>
              <span className="text-xs tabular-nums flex items-center gap-2" style={{ color: "var(--text-dim)" }}>
                v2.0 — LIVE
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)", boxShadow: "0 0 6px var(--green)" }} />
              </span>
            </nav>

            {/* hero */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6 max-w-2xl"
              >
                <div className="text-xs tracking-[0.4em]" style={{ color: "var(--text-dim)" }}>
                  MENTAL MATH UNDER PRESSURE
                </div>

                <h1
                  className="text-6xl sm:text-8xl font-black leading-none tracking-tight"
                  style={{ color: "var(--white)", fontFamily: '"Orbitron", monospace' }}
                >
                  QUANT<br />
                  <span style={{ color: "var(--amber)" }}>TERMINAL</span>
                </h1>

                <p className="text-sm leading-relaxed max-w-md mx-auto" style={{ color: "var(--text-dim)" }}>
                  Train the mental arithmetic expected in quant and trading desk interviews.
                  Five difficulty tiers — from intern arithmetic to MD-level speed calculations.
                </p>

                {/* two CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="flex flex-col sm:flex-row gap-3 justify-center"
                >
                  <button
                    onClick={() => setPhase("difficulty")}
                    className="px-10 py-4 text-sm tracking-[0.2em] font-bold transition-all duration-150"
                    style={{ background: "var(--green)", color: "var(--bg)", fontFamily: '"Orbitron", monospace' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--cyan)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--green)"; }}
                  >
                    DIFFICULTY ROUNDS
                  </button>
                  <button
                    onClick={() => setPhase("sandbox-config")}
                    className="px-10 py-4 text-sm tracking-[0.2em] font-bold border transition-all duration-150"
                    style={{ borderColor: "var(--amber)", color: "var(--amber)", fontFamily: '"Orbitron", monospace' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(240,192,96,0.1)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    SANDBOX MODE
                  </button>
                </motion.div>
              </motion.div>

              {/* stat strip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-px w-full max-w-xl"
                style={{ background: "var(--border)" }}
              >
                {[
                  { label: "DIFFICULTY TIERS", value: "5" },
                  { label: "QUESTION TYPES",   value: "9" },
                  { label: "GAME MODES",        value: "3+2" },
                  { label: "KEYBOARD FIRST",    value: "↵" },
                ].map(s => (
                  <div key={s.label} className="px-5 py-4 text-center" style={{ background: "var(--bg-card)" }}>
                    <div className="text-2xl font-bold mb-1" style={{ color: "var(--amber)", fontFamily: '"Orbitron", monospace' }}>{s.value}</div>
                    <div className="text-xs" style={{ color: "var(--text-dim)" }}>{s.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}

        {phase === "difficulty" && (
          <motion.div
            key="difficulty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            <GameEngine onExit={() => setPhase("landing")} />
          </motion.div>
        )}

        {phase === "sandbox-config" && (
          <motion.div
            key="sandbox-config"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            <SandboxCfg onStart={startSandbox} onBack={() => setPhase("landing")} />
          </motion.div>
        )}

        {phase === "sandbox-game" && sandboxConfig && (
          <motion.div
            key="sandbox-game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            <SandboxGame config={sandboxConfig} onBack={() => setPhase("sandbox-config")} />
          </motion.div>
        )}

      </AnimatePresence>
    </main>
  );
}
