'use client';

import React, { useRef, useEffect } from 'react';
import { createRoughSvg, sketchColors } from '@/lib/rough-utils';
import type { Options as RoughOptions } from 'roughjs/bin/core';

export interface SketchCharacterProps {
  mood: 'idle' | 'thinking' | 'happy' | 'sad' | 'error';
}

const moodLabels: Record<SketchCharacterProps['mood'], string> = {
  idle: 'Character with a neutral expression',
  thinking: 'Character thinking with a raised eyebrow',
  happy: 'Character smiling happily with sparkles',
  sad: 'Character looking sad with a tear',
  error: 'Character showing an error with X eyes',
};

/**
 * An SVG-based illustrated character that changes expression based on mood.
 * Uses Rough.js for a hand-drawn sketchbook style.
 */
export function SketchCharacter({ mood }: SketchCharacterProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Clear previous drawings
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const rc = createRoughSvg(svg);
    const size = 80;
    const cx = size / 2;
    const cy = size / 2;
    const faceRadius = 28;

    const baseOptions: RoughOptions = {
      roughness: 1.5,
      bowing: 1,
      strokeWidth: 2,
      stroke: sketchColors.text,
    };

    // Draw face circle
    const face = rc.circle(cx, cy, faceRadius * 2, {
      ...baseOptions,
      fill: '#FFF8F0',
      fillStyle: 'solid',
    });
    svg.appendChild(face);

    // Draw mood-specific features
    switch (mood) {
      case 'idle':
        drawIdleFace(svg, rc, cx, cy, baseOptions);
        break;
      case 'thinking':
        drawThinkingFace(svg, rc, cx, cy, baseOptions);
        break;
      case 'happy':
        drawHappyFace(svg, rc, cx, cy, baseOptions);
        break;
      case 'sad':
        drawSadFace(svg, rc, cx, cy, baseOptions);
        break;
      case 'error':
        drawErrorFace(svg, rc, cx, cy, baseOptions);
        break;
    }
  }, [mood]);

  return (
    <svg
      ref={svgRef}
      width={80}
      height={80}
      viewBox="0 0 80 80"
      aria-label={moodLabels[mood]}
      role="img"
    />
  );
}

function drawIdleFace(
  svg: SVGSVGElement,
  rc: ReturnType<typeof createRoughSvg>,
  cx: number,
  cy: number,
  options: RoughOptions
) {
  // Eyes - two small circles
  const leftEye = rc.circle(cx - 9, cy - 5, 6, { ...options, fill: sketchColors.text, fillStyle: 'solid' });
  const rightEye = rc.circle(cx + 9, cy - 5, 6, { ...options, fill: sketchColors.text, fillStyle: 'solid' });
  svg.appendChild(leftEye);
  svg.appendChild(rightEye);

  // Neutral mouth - a simple line
  const mouth = rc.line(cx - 8, cy + 10, cx + 8, cy + 10, options);
  svg.appendChild(mouth);
}

function drawThinkingFace(
  svg: SVGSVGElement,
  rc: ReturnType<typeof createRoughSvg>,
  cx: number,
  cy: number,
  options: RoughOptions
) {
  // Left eye normal
  const leftEye = rc.circle(cx - 9, cy - 5, 6, { ...options, fill: sketchColors.text, fillStyle: 'solid' });
  svg.appendChild(leftEye);

  // Right eye raised (higher position for raised eyebrow effect)
  const rightEye = rc.circle(cx + 9, cy - 7, 6, { ...options, fill: sketchColors.text, fillStyle: 'solid' });
  svg.appendChild(rightEye);

  // Raised eyebrow (arc above right eye)
  const eyebrow = rc.arc(cx + 9, cy - 13, 14, 8, Math.PI, 0, false, { ...options, strokeWidth: 1.5 });
  svg.appendChild(eyebrow);

  // Slight frown/thinking mouth
  const mouth = rc.arc(cx, cy + 12, 12, 6, 0, Math.PI, false, { ...options, strokeWidth: 1.5 });
  svg.appendChild(mouth);

  // Thinking dots above head
  const dot1 = rc.circle(cx + 2, cy - 34, 4, { ...options, fill: sketchColors.accent, fillStyle: 'solid', stroke: sketchColors.accent });
  const dot2 = rc.circle(cx + 7, cy - 38, 3, { ...options, fill: sketchColors.accent, fillStyle: 'solid', stroke: sketchColors.accent });
  const dot3 = rc.circle(cx + 11, cy - 41, 2, { ...options, fill: sketchColors.accent, fillStyle: 'solid', stroke: sketchColors.accent });
  svg.appendChild(dot1);
  svg.appendChild(dot2);
  svg.appendChild(dot3);
}

function drawHappyFace(
  svg: SVGSVGElement,
  rc: ReturnType<typeof createRoughSvg>,
  cx: number,
  cy: number,
  options: RoughOptions
) {
  // Happy eyes - small arcs (closed/squinting)
  const leftEye = rc.arc(cx - 9, cy - 5, 8, 6, Math.PI, 0, false, { ...options, strokeWidth: 2 });
  const rightEye = rc.arc(cx + 9, cy - 5, 8, 6, Math.PI, 0, false, { ...options, strokeWidth: 2 });
  svg.appendChild(leftEye);
  svg.appendChild(rightEye);

  // Big smile - wide arc
  const mouth = rc.arc(cx, cy + 8, 20, 14, 0, Math.PI, false, { ...options, strokeWidth: 2 });
  svg.appendChild(mouth);

  // Sparkles around the face
  const sparkleOpts: RoughOptions = { ...options, stroke: sketchColors.accent, strokeWidth: 1.5 };
  // Top-left sparkle
  const s1a = rc.line(cx - 28, cy - 20, cx - 28, cy - 26, sparkleOpts);
  const s1b = rc.line(cx - 31, cy - 23, cx - 25, cy - 23, sparkleOpts);
  svg.appendChild(s1a);
  svg.appendChild(s1b);
  // Top-right sparkle
  const s2a = rc.line(cx + 28, cy - 18, cx + 28, cy - 24, sparkleOpts);
  const s2b = rc.line(cx + 25, cy - 21, cx + 31, cy - 21, sparkleOpts);
  svg.appendChild(s2a);
  svg.appendChild(s2b);
}

function drawSadFace(
  svg: SVGSVGElement,
  rc: ReturnType<typeof createRoughSvg>,
  cx: number,
  cy: number,
  options: RoughOptions
) {
  // Sad eyes - circles
  const leftEye = rc.circle(cx - 9, cy - 5, 6, { ...options, fill: sketchColors.text, fillStyle: 'solid' });
  const rightEye = rc.circle(cx + 9, cy - 5, 6, { ...options, fill: sketchColors.text, fillStyle: 'solid' });
  svg.appendChild(leftEye);
  svg.appendChild(rightEye);

  // Frown - inverted arc
  const mouth = rc.arc(cx, cy + 16, 16, 10, Math.PI, 0, false, { ...options, strokeWidth: 2 });
  svg.appendChild(mouth);

  // Tear drop on left side
  const tear = rc.ellipse(cx - 12, cy + 2, 4, 6, {
    ...options,
    fill: sketchColors.secondary,
    fillStyle: 'solid',
    stroke: sketchColors.secondary,
    strokeWidth: 1,
  });
  svg.appendChild(tear);
}

function drawErrorFace(
  svg: SVGSVGElement,
  rc: ReturnType<typeof createRoughSvg>,
  cx: number,
  cy: number,
  options: RoughOptions
) {
  const errorOpts: RoughOptions = { ...options, stroke: sketchColors.error, strokeWidth: 2 };

  // X eyes - left
  const lx1 = rc.line(cx - 12, cy - 8, cx - 6, cy - 2, errorOpts);
  const lx2 = rc.line(cx - 6, cy - 8, cx - 12, cy - 2, errorOpts);
  svg.appendChild(lx1);
  svg.appendChild(lx2);

  // X eyes - right
  const rx1 = rc.line(cx + 6, cy - 8, cx + 12, cy - 2, errorOpts);
  const rx2 = rc.line(cx + 12, cy - 8, cx + 6, cy - 2, errorOpts);
  svg.appendChild(rx1);
  svg.appendChild(rx2);

  // Open mouth (circle for surprise/distress)
  const mouth = rc.ellipse(cx, cy + 12, 10, 8, { ...errorOpts, strokeWidth: 1.5 });
  svg.appendChild(mouth);

  // Exclamation mark above head
  const excLine = rc.line(cx, cy - 32, cx, cy - 38, { ...errorOpts, strokeWidth: 2.5 });
  const excDot = rc.circle(cx, cy - 29, 3, { ...errorOpts, fill: sketchColors.error, fillStyle: 'solid' });
  svg.appendChild(excLine);
  svg.appendChild(excDot);
}
