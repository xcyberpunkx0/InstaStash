'use client';

import React, { useRef, useEffect, type ReactNode } from 'react';
import { drawSketchBorder, defaultRoughOptions } from '@/lib/rough-utils';
import type { Options as RoughOptions } from 'roughjs/bin/core';

export interface SketchBorderProps {
  children: ReactNode;
  /** Custom Rough.js options to override defaults */
  roughOptions?: Partial<RoughOptions>;
  /** Additional CSS class names for the outer container */
  className?: string;
}

/**
 * Wraps children in a container with a Rough.js hand-drawn rectangle border.
 * The border is rendered as an SVG overlay that adapts to the container size.
 */
export function SketchBorder({ children, roughOptions, className = '' }: SketchBorderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg) return;

    const draw = () => {
      const { width, height } = container.getBoundingClientRect();

      // Clear previous drawings
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }

      // Set SVG dimensions to match container
      svg.setAttribute('width', String(width));
      svg.setAttribute('height', String(height));

      // Draw the hand-drawn border
      const options = { ...defaultRoughOptions, ...roughOptions };
      const node = drawSketchBorder(svg, width, height, options);
      svg.appendChild(node);
    };

    draw();

    // Redraw on resize
    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [roughOptions]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <svg
        ref={svgRef}
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
