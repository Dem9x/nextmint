'use client';
import React, { useState, useEffect } from "react";

const LOADING_FX = [
  "NEURAL LINK",
  "WARP DRIVE",
  "QUANTUM BOOT",
  "VOID SIGNAL",
  "DATA STORM",
  "HYPERCORE",
  "CYBER SYNC",
  "NEXUS ONLINE",
];

export const LoadingFX: React.FC = () => {
  const [particles, setParticles] = useState<
    {
      id: number;
      text: string;
      x: string;
      y: string;
      rot: number;
      color: string;
      glow: string;
    }[]
  >([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const id = Date.now();

      const text =
        LOADING_FX[Math.floor(Math.random() * LOADING_FX.length)];

      const x = `${10 + Math.random() * 80}%`;
      const y = `${10 + Math.random() * 80}%`;

      const rot = Math.random() * 40 - 20;

      const themes = [
        {
          color: "text-cyan-400",
          glow: "0 0 25px rgba(34,211,238,0.9)",
        },
        {
          color: "text-fuchsia-500",
          glow: "0 0 25px rgba(217,70,239,0.9)",
        },
        {
          color: "text-lime-400",
          glow: "0 0 25px rgba(163,230,53,0.9)",
        },
        {
          color: "text-blue-500",
          glow: "0 0 25px rgba(59,130,246,0.9)",
        },
      ];

      const theme = themes[Math.floor(Math.random() * themes.length)];

      setParticles((prev) =>
        [
          ...prev,
          {
            id,
            text,
            x,
            y,
            rot,
            color: theme.color,
            glow: theme.glow,
          },
        ].slice(-6)
      );
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black border-r border-cyan-500/30">
      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,255,255,0.12),_transparent_70%)]" />

      {/* GRID */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,255,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.15) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* SCANLINE */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-full h-24 bg-cyan-400/10 blur-3xl animate-scan" />
      </div>

      {/* ANIMATION STYLE */}
      <style>{`
        @keyframes cyber-pop {
          0% {
            transform: translate(-50%, -50%) scale(0.3) rotate(var(--rot));
            opacity: 0;
            filter: blur(8px);
          }

          20% {
            transform: translate(-50%, -50%) scale(1.3) rotate(var(--rot));
            opacity: 1;
            filter: blur(0px);
          }

          60% {
            transform: translate(-50%, -50%) scale(1) rotate(var(--rot));
            opacity: 1;
          }

          100% {
            transform: translate(-50%, -50%) scale(1.2) rotate(var(--rot));
            opacity: 0;
            filter: blur(4px);
          }
        }

        @keyframes scan {
          0% {
            top: -20%;
          }

          100% {
            top: 120%;
          }
        }

        .animate-scan {
          animation: scan 4s linear infinite;
        }

        @keyframes flicker {
          0%, 100% {
            opacity: 1;
          }

          50% {
            opacity: 0.7;
          }
        }

        .flicker {
          animation: flicker 2s infinite;
        }
      `}</style>

      {/* PARTICLES */}
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute font-black tracking-widest uppercase ${p.color} select-none whitespace-nowrap z-20`}
          style={
            {
              left: p.x,
              top: p.y,
              "--rot": `${p.rot}deg`,
              animation: "cyber-pop 2s forwards ease-out",
              textShadow: `
                0 0 8px rgba(255,255,255,0.8),
                ${p.glow},
                0 0 50px rgba(255,255,255,0.25)
              `,
              fontSize: "clamp(24px, 4vw, 72px)",
              letterSpacing: "0.15em",
              fontFamily: "Orbitron, sans-serif",
            } as React.CSSProperties
          }
        >
          {p.text}
        </div>
      ))}

      {/* HUD OVERLAY */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-4 left-4 w-32 h-32 border border-cyan-500/20 rounded-full" />
        <div className="absolute bottom-6 right-6 w-48 h-48 border border-fuchsia-500/20 rounded-full" />
      </div>

      {/* LOADING TEXT */}
      <div className="absolute bottom-16 inset-x-0 text-center z-30">
        <p className="text-cyan-400 text-sm md:text-lg tracking-[0.5em] font-bold flicker">
          INITIALIZING NEURAL MATRIX
        </p>

        <div className="mt-4 flex justify-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
          <div className="w-3 h-3 rounded-full bg-fuchsia-500 animate-pulse delay-100" />
          <div className="w-3 h-3 rounded-full bg-lime-400 animate-pulse delay-200" />
        </div>
      </div>
    </div>
  );
};