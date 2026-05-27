'use client';

import React, { useRef, useEffect, type ButtonHTMLAttributes } from 'react';
import { createRoughSvg, buttonRoughOptions, animationDurations } from '@/lib/rough-utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Options as RoughOptions } from 'roughjs/bin/core';

export interface SketchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Custom Rough.js options to override defaults */
  roughOptions?: Partial<RoughOptions>;
}

const variantStyles = {
  primary: {
    bg: 'bg-primary',
    text: 'text-white',
    stroke: '#BF5540',
  },
  secondary: {
    bg: 'bg-surface',
    text: 'text-text',
    stroke: '#C4B5A4',
  },
  ghost: {
    bg: 'bg-transparent',
    text: 'text-primary',
    stroke: '#BF5540',
  },
} as const;

/**
 * A button component with a hand-drawn Rough.js border and micro-animations.
 * Animations are between 150-400ms and respect prefers-reduced-motion.
 */
export function SketchButton({
  children,
  variant = 'primary',
  roughOptions,
  className = '',
  disabled,
  ...props
}: SketchButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const style = variantStyles[variant];

  useEffect(() => {
    const button = buttonRef.current;
    const svg = svgRef.current;
    if (!button || !svg) return;

    const draw = () => {
      const { width, height } = button.getBoundingClientRect();

      // Clear previous drawings
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }

      svg.setAttribute('width', String(width));
      svg.setAttribute('height', String(height));

      const rc = createRoughSvg(svg);
      const padding = 2;
      const options: RoughOptions = {
        ...buttonRoughOptions,
        stroke: style.stroke,
        ...roughOptions,
      };
      const node = rc.rectangle(padding, padding, width - padding * 2, height - padding * 2, options);
      svg.appendChild(node);
    };

    draw();

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(button);

    return () => {
      resizeObserver.disconnect();
    };
  }, [variant, roughOptions, style.stroke]);

  // Micro-animation duration: 200ms (within 150-400ms range)
  const transitionDuration = prefersReducedMotion ? '0ms' : `${animationDurations.micro}ms`;

  return (
    <button
      ref={buttonRef}
      className={`relative px-6 py-3 font-body cursor-pointer rounded-sketch
        focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2
        ${style.text}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}`}
      style={{
        transitionProperty: 'transform, box-shadow',
        transitionDuration,
        transitionTimingFunction: 'ease-in-out',
      }}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled && !prefersReducedMotion) {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px) rotate(-0.5deg)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !prefersReducedMotion) {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0) rotate(0deg)';
        }
      }}
      onMouseDown={(e) => {
        if (!disabled && !prefersReducedMotion) {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(1px) scale(0.98)';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled && !prefersReducedMotion) {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px) rotate(-0.5deg)';
        }
      }}
      {...props}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
