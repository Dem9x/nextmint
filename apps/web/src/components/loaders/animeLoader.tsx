"use client";

import React, { useEffect, useState } from "react";

const FX_WORDS = [
  "SYNC",
  "OVERDRIVE",
  "LINK START",
  "NEXUS",
  "POWER UP",
  "CYBER MODE",
  "AI ONLINE",
  "HYPER SIGNAL",
];

export default function AnimeLoadingFX() {
  const [slashes, setSlashes] = useState<any[]>([]);
  const [texts, setTexts] = useState<any[]>([]);

  /*
   * ENERGY SLASH EFFECT
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const id = Date.now();

      setSlashes((prev: any[]) =>
        [
          ...prev,
          {
            id,
            top: Math.random() * 100,
            left: Math.random() * 100,
            rotate: Math.random() * 360,
            scale: 0.7 + Math.random() * 1.5,
          },
        ].slice(-12)
      );
    }, 180);

    return () => clearInterval(interval);
  }, []);

  /*
   * JAPANESE / ANIME TEXT POP
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const id = Date.now();

      const colors = [
        "text-cyan-300",
        "text-pink-400",
        "text-violet-400",
        "text-yellow-300",
      ];

      setTexts((prev: any[]) =>
        [
          ...prev,
          {
            id,
            text:
              FX_WORDS[
                Math.floor(Math.random() * FX_WORDS.length)
              ],
            x: 10 + Math.random() * 80,
            y: 10 + Math.random() * 70,
            color:
              colors[Math.floor(Math.random() * colors.length)],
          },
        ].slice(-7)
      );
    }, 700);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-screen overflow-hidden bg-[#050816]">
      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.08),transparent_60%)]" />

      {/* GRID */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* ANIMATION STYLE */}
      <style>{`
        @keyframes slash {
          0% {
            transform:
              translate(-50%, -50%)
              rotate(var(--rotate))
              scaleX(0);

            opacity: 0;
          }

          20% {
            opacity: 1;
          }

          100% {
            transform:
              translate(-50%, -50%)
              rotate(var(--rotate))
              scaleX(1.8);

            opacity: 0;
          }
        }

        @keyframes anime-pop {
          0% {
            transform:
              translate(-50%, -50%)
              scale(0.2);

            opacity: 0;
            filter: blur(8px);
          }

          30% {
            transform:
              translate(-50%, -50%)
              scale(1.3);

            opacity: 1;
            filter: blur(0px);
          }

          100% {
            transform:
              translate(-50%, -50%)
              scale(1);

            opacity: 0;
          }
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(0.7);
            opacity: 0.7;
          }

          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        @keyframes float {
          0%,100% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-15px);
          }
        }

        @keyframes loading-bar {
          0% {
            width: 0%;
          }

          100% {
            width: 100%;
          }
        }
      `}</style>

      {/* ENERGY SLASHES */}
      {slashes.map((s: any) => (
        <div
          key={s.id}
          className="absolute z-10"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            "--rotate": `${s.rotate}deg`,
          } as React.CSSProperties}
        >
          <div
            className="h-[3px] w-[220px] rounded-full bg-gradient-to-r from-cyan-400 via-white to-pink-500"
            style={{
              transform: `scale(${s.scale})`,
              animation: "slash 700ms ease-out forwards",
              boxShadow:
                "0 0 20px rgba(0,255,255,0.8)",
            }}
          />
        </div>
      ))}

      {/* TEXT FX */}
      {texts.map((t: any) => (
        <div
          key={t.id}
          className={`absolute z-20 font-black tracking-widest ${t.color}`}
          style={{
            left: `${t.x}%`,
            top: `${t.y}%`,
            animation: "anime-pop 2s forwards",
            textShadow:
              "0 0 25px rgba(255,255,255,0.7)",
            fontSize: "clamp(18px,3vw,54px)",
            transform: "translate(-50%, -50%)",
          }}
        >
          {t.text}
        </div>
      ))}

      {/* CENTER CORE */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* OUTER RING */}
          <div
            className="absolute inset-0 rounded-full border border-cyan-400/40"
            style={{
              animation:
                "pulse-ring 2s linear infinite",
            }}
          />

          {/* MAIN CIRCLE */}
          <div className="relative flex h-52 w-52 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10 backdrop-blur-xl">
            {/* INNER GLOW */}
            <div className="absolute h-24 w-24 rounded-full bg-cyan-400 blur-3xl opacity-40" />

            {/* CORE */}
            <div
              className="relative z-10 text-center"
              style={{
                animation: "float 3s ease-in-out infinite",
              }}
            >
              <h1 className="text-5xl font-black tracking-[0.3em] text-white">
                AI
              </h1>

              <p className="mt-3 text-xs tracking-[0.5em] text-cyan-300">
                LOADING SYSTEM
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM HUD */}
      <div className="absolute bottom-16 left-1/2 w-[300px] -translate-x-1/2">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-pink-500 to-violet-500"
            style={{
              animation:
                "loading-bar 3s linear infinite",
              boxShadow:
                "0 0 20px rgba(0,255,255,0.8)",
            }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between text-xs tracking-[0.3em] text-cyan-300">
          <span>INITIALIZING</span>
          <span>99%</span>
        </div>
      </div>

      {/* CINEMATIC VIGNETTE */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.75)_100%)]" />
    </div>
  );
}