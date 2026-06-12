'use client';

import React, { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';

/**
 * Theme-aware ambient background.
 *
 * Renders three big, soft, blurred color blobs that drift and breathe across
 * the canvas — the colors come from CSS variables (`--color-aura-1/2/3` and
 * `--color-aura-vignette`), so flipping the theme automatically retints the
 * background. On the default Aurora theme this reads as the Gemini iridescent
 * blue → violet → pink wash; on Solar it's a golden-hour glow; on Mint a
 * fresh leaf wash; etc.
 *
 * Three layers (bottom → top):
 *   1. Three motion-driven blobs that orbit in slow, lazy paths.
 *   2. A scatter of slow-pulsing sparkle stars.
 *   3. A radial cream-vignette so the central reading area stays luminous.
 *
 * All layers are pointer-events:none, sit at z-index -10, and respect
 * prefers-reduced-motion (durations collapse via globals.css).
 */

export interface BackgroundAnimeProps {
  className?: string;
}

const SPARKLE_COUNT = 14;

function rand(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const f = x - Math.floor(x);
  // Round to 2 decimals so server and client serialize the same string.
  return Math.round((min + f * (max - min)) * 100) / 100;
}

export function BackgroundAnime({ className = '' }: BackgroundAnimeProps) {
  useEffect(() => {
    document.body.classList.add('has-bg-lines');
    return () => document.body.classList.remove('has-bg-lines');
  }, []);

  const sparkles = useMemo(
    () =>
      Array.from({ length: SPARKLE_COUNT }, (_, i) => ({
        key: i,
        x: rand(i * 41 + 11, 5, 95),
        y: rand(i * 43 + 12, 5, 95),
        size: rand(i * 47 + 13, 3, 5),
        delay: rand(i * 53 + 14, 0, 6),
        duration: rand(i * 59 + 15, 4, 7),
      })),
    [],
  );

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
    >
      {/* 1 · Aura blob A — top right, biggest */}
      <motion.div
        className="absolute"
        style={{
          top: '-25vh',
          right: '-20vw',
          width: '90vw',
          height: '90vh',
          background:
            'radial-gradient(circle at center, var(--color-aura-1) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, -30, 20, 0],
          y: [0, 20, -15, 0],
          scale: [1, 1.05, 0.98, 1],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 2 · Aura blob B — bottom left, medium */}
      <motion.div
        className="absolute"
        style={{
          bottom: '-30vh',
          left: '-25vw',
          width: '80vw',
          height: '80vh',
          background:
            'radial-gradient(circle at center, var(--color-aura-2) 0%, transparent 65%)',
          filter: 'blur(70px)',
        }}
        animate={{
          x: [0, 25, -15, 0],
          y: [0, -20, 15, 0],
          scale: [1, 1.04, 1.02, 1],
        }}
        transition={{ duration: 36, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      {/* 3 · Aura blob C — center-ish, smaller */}
      <motion.div
        className="absolute"
        style={{
          top: '20vh',
          left: '20vw',
          width: '55vw',
          height: '55vh',
          background:
            'radial-gradient(circle at center, var(--color-aura-3) 0%, transparent 65%)',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, 40, -25, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.08, 0.95, 1],
        }}
        transition={{ duration: 44, repeat: Infinity, ease: 'easeInOut', delay: 8 }}
      />

      {/* 4 · Sparkle scatter — pulses subtly so the canvas feels alive */}
      <div className="absolute inset-0">
        {sparkles.map((s) => (
          <motion.div
            key={s.key}
            className="absolute"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size * 4}px`,
              height: `${s.size * 4}px`,
            }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.5, 0], scale: [0.6, 1, 0.6] }}
            transition={{
              duration: s.duration,
              delay: s.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <svg viewBox="0 0 16 16" className="w-full h-full text-terra-500">
              <path
                d="M8 0 L 9 7 L 16 8 L 9 9 L 8 16 L 7 9 L 0 8 L 7 7 Z"
                fill="currentColor"
              />
            </svg>
          </motion.div>
        ))}
      </div>

      {/* 5 · Final radial vignette — keeps central content luminous */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, var(--color-aura-vignette) 80%, var(--color-aura-vignette) 100%)',
        }}
      />
    </div>
  );
}
