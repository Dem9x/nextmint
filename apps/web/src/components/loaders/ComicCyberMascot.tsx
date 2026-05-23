"use client";

import { motion } from "framer-motion";

export default function ComicCyberMascot() {
  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[#f89b1c]">

      {/* LIGHT */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,180,0,0.2),transparent_60%)]" />

      {/* FLOATING DUST */}
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -20, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
            delay: i * 0.15,
          }}
          className="absolute h-2 w-2 rounded-full bg-black/20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        />
      ))}

      {/* CAT */}
      <motion.div
        animate={{
          y: [0, -10, 0],
          rotate: [0, -2, 2, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative"
      >
        {/* BODY */}
        <div className="relative h-[260px] w-[190px] rounded-[55%] bg-black">

          {/* BODY CURVE */}
          <div className="absolute right-0 top-0 h-full w-[120px] rounded-full bg-black" />

          {/* EAR LEFT */}
          <div
            className="
              absolute
              left-[28px]
              top-[26px]
              h-0
              w-0
              border-l-[18px]
              border-r-[18px]
              border-b-[32px]
              border-l-transparent
              border-r-transparent
              border-b-black
              rotate-[-12deg]
            "
          />

          {/* EAR RIGHT */}
          <div
            className="
              absolute
              right-[34px]
              top-[22px]
              h-0
              w-0
              border-l-[18px]
              border-r-[18px]
              border-b-[32px]
              border-l-transparent
              border-r-transparent
              border-b-black
              rotate-[12deg]
            "
          />

          {/* FACE */}
          <div className="absolute bottom-[38px] left-[28px] h-[92px] w-[120px] rounded-full bg-black">

            {/* EYE LEFT */}
            <motion.div
              animate={{
                scaleY: [1, 0.1, 1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
              }}
              className="absolute left-[10px] top-[22px] h-[28px] w-[28px] rounded-full bg-white"
            >
              <div className="absolute left-[8px] top-[8px] h-[10px] w-[10px] rounded-full bg-black" />
            </motion.div>

            {/* EYE RIGHT */}
            <motion.div
              animate={{
                scaleY: [1, 0.1, 1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: 0.2,
              }}
              className="absolute right-[10px] top-[22px] h-[28px] w-[28px] rounded-full bg-white"
            >
              <div className="absolute left-[8px] top-[8px] h-[10px] w-[10px] rounded-full bg-black" />
            </motion.div>

            {/* NOSE */}
            <div className="absolute left-1/2 top-[48px] h-[10px] w-[14px] -translate-x-1/2 rounded-full bg-[#ff8aa0]" />

            {/* MOUTH */}
            <motion.div
              animate={{
                scaleX: [1, 1.15, 1],
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
              }}
              className="absolute bottom-[10px] left-1/2 h-[16px] w-[28px] -translate-x-1/2 rounded-b-full bg-[#ff4d4d]"
            />

            {/* WHISKERS */}
            <div className="absolute left-[-18px] top-[58px] h-[2px] w-[26px] rotate-[-10deg] bg-black/40" />
            <div className="absolute left-[-18px] top-[66px] h-[2px] w-[26px] rotate-[8deg] bg-black/40" />

            <div className="absolute right-[-18px] top-[58px] h-[2px] w-[26px] rotate-[10deg] bg-black/40" />
            <div className="absolute right-[-18px] top-[66px] h-[2px] w-[26px] rotate-[-8deg] bg-black/40" />
          </div>

          {/* FRONT LEG */}
          <motion.div
            animate={{
              rotate: [12, -8, 12],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
            }}
            className="
              absolute
              bottom-0
              left-[82px]
              h-[90px]
              w-[28px]
              origin-top
              rounded-full
              bg-black
            "
          />

          {/* TAIL */}
          <motion.div
            animate={{
              rotate: [-18, 18, -18],
            }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="
              absolute
              right-[-12px]
              top-[8px]
              h-[120px]
              w-[26px]
              origin-bottom
              rounded-full
              bg-black
            "
          />

          {/* SHINE */}
          <div className="absolute left-[36px] top-[28px] h-[90px] w-[18px] rounded-full bg-white/10 blur-sm" />
        </div>

        {/* FOOTPRINTS */}
        <div className="absolute left-[180px] top-[210px] flex gap-4 opacity-30">
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="h-2 w-2 rounded-full bg-[#c46d00]"
            />
          ))}
        </div>

        {/* SHADOW */}
        <motion.div
          animate={{
            scale: [1, 0.85, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
          className="
            absolute
            -bottom-8
            left-1/2
            h-[26px]
            w-[160px]
            -translate-x-1/2
            rounded-full
            bg-black/20
            blur-xl
          "
        />
      </motion.div>
    </div>
  );
}