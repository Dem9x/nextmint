"use client";

import { motion } from "framer-motion";

const NFTS = ["◼", "⬢", "⬡", "◆", "⬣", "⬟", "✦", "✧"];

const PARTICLES = [
  { left: "8%", top: "22%", duration: 3.2, delay: 0 },
  { left: "16%", top: "72%", duration: 4.4, delay: 0.2 },
  { left: "24%", top: "42%", duration: 5.2, delay: 0.4 },
  { left: "33%", top: "18%", duration: 3.8, delay: 0.6 },
  { left: "42%", top: "80%", duration: 5.6, delay: 0.8 },
  { left: "51%", top: "28%", duration: 4.2, delay: 1 },
  { left: "60%", top: "64%", duration: 3.6, delay: 1.2 },
  { left: "68%", top: "36%", duration: 5.1, delay: 1.4 },
  { left: "76%", top: "76%", duration: 4.7, delay: 1.6 },
  { left: "84%", top: "24%", duration: 3.4, delay: 1.8 },
  { left: "91%", top: "58%", duration: 5.5, delay: 2 },
  { left: "12%", top: "50%", duration: 4.9, delay: 2.2 },
  { left: "28%", top: "86%", duration: 3.9, delay: 2.4 },
  { left: "46%", top: "14%", duration: 5.8, delay: 2.6 },
  { left: "72%", top: "12%", duration: 4.1, delay: 2.8 }
];

export default function NFTDominoLoading() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0f] px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_58%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(139,92,246,0.12),transparent_32%)]" />

      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)
          `,
          backgroundSize: "42px 42px"
        }}
      />

      <div className="absolute top-16 text-center">
        <motion.h1
          animate={{ letterSpacing: ["0.16em", "0.34em", "0.16em"] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-3xl font-black uppercase text-white drop-shadow-[0_0_20px_rgba(34,211,238,0.65)] sm:text-5xl"
        >
          NEXMINT AI
        </motion.h1>
        <p className="mt-4 text-xs tracking-[0.42em] text-cyan-300/70 sm:text-sm">
          ACTIVATING DIGITAL LAYERS
        </p>
      </div>

      <div className="relative flex max-w-full items-end gap-2 sm:gap-3">
        {NFTS.map((shape, index) => (
          <motion.div
            key={shape}
            initial={{ rotate: 0, y: 0 }}
            animate={{ rotate: [-2, 0, 75], y: [0, -6, 0] }}
            transition={{
              duration: 1.4,
              delay: index * 0.18,
              repeat: Infinity,
              repeatDelay: 1,
              ease: "easeInOut"
            }}
            className="relative flex h-[118px] w-[54px] origin-bottom items-center justify-center rounded-[18px] border border-cyan-400/20 bg-gradient-to-b from-[#111827] to-[#050816] shadow-[0_0_40px_rgba(34,211,238,0.13)] backdrop-blur-xl sm:h-[180px] sm:w-[90px] sm:rounded-[24px]"
          >
            <div className="absolute inset-0 rounded-[inherit] bg-cyan-400/5" />
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 180, 360] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="text-3xl font-black text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.75)] sm:text-5xl"
            >
              {shape}
            </motion.div>
            <div className="absolute bottom-3 text-[9px] tracking-[0.26em] text-cyan-300/70 sm:bottom-4 sm:text-xs">
              NEX
            </div>
            <div className="absolute top-3 h-2 w-8 rounded-full bg-cyan-300/50 blur-md sm:w-10" />
          </motion.div>
        ))}
      </div>

      <div className="absolute bottom-20 w-[min(400px,calc(100vw-40px))]">
        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: ["0%", "100%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 shadow-[0_0_25px_rgba(34,211,238,0.75)]"
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 text-xs tracking-[0.22em] text-cyan-300 sm:text-sm sm:tracking-[0.3em]">
          <span>NEXMINT ASSETS</span>
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            LOADING...
          </motion.span>
        </div>
      </div>

      {PARTICLES.map((particle, index) => (
        <motion.div
          key={`${particle.left}-${particle.top}`}
          animate={{ y: [0, -40, 0], opacity: [0, 1, 0] }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay
          }}
          className="absolute h-2 w-2 rounded-full bg-cyan-400/40"
          style={{ left: particle.left, top: particle.top }}
        />
      ))}
    </div>
  );
}
