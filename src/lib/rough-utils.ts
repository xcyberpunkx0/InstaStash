/**
 * Rough.js utilities — kept for backward compatibility with existing tests.
 * The new design system uses CSS-based styling instead of Rough.js canvas rendering.
 */
import rough from 'roughjs';
import type { Options as RoughOptions } from 'roughjs/bin/core';

/** Theme colors — mapped to AuraVault design system */
export const sketchColors = {
  primary: '#C97B4E',     // terra-500
  border: '#C9B89E',      // paper-400
  text: '#1F1B16',        // ink-900
  secondary: '#7A8A6F',   // sage-500
  accent: '#C97B4E',      // terra-500
  error: '#B25548',       // rouge-500
  success: '#7A8A6F',     // sage-500
} as const;

/** Animation duration constants (in ms) */
export const animationDurations = {
  micro: 140,
  standard: 240,
  slow: 420,
} as const;

/** Default Rough.js drawing options */
export const defaultRoughOptions: RoughOptions = {
  roughness: 1.5,
  bowing: 1,
  stroke: sketchColors.border,
  strokeWidth: 2,
  fillStyle: 'hachure',
};

/** Rough.js options for button borders */
export const buttonRoughOptions: RoughOptions = {
  roughness: 1.2,
  bowing: 0.8,
  stroke: sketchColors.primary,
  strokeWidth: 2,
  fillStyle: 'solid',
};

/** Rough.js options for subtle borders */
export const subtleRoughOptions: RoughOptions = {
  roughness: 0.8,
  bowing: 0.5,
  stroke: sketchColors.border,
  strokeWidth: 1.5,
  fillStyle: 'hachure',
};

export function createRoughSvg(svgElement: SVGSVGElement) {
  return rough.svg(svgElement);
}

export function drawRoughRect(
  svgElement: SVGSVGElement,
  x: number,
  y: number,
  width: number,
  height: number,
  options?: Partial<RoughOptions>
) {
  const rc = createRoughSvg(svgElement);
  const mergedOptions = { ...defaultRoughOptions, ...options };
  return rc.rectangle(x, y, width, height, mergedOptions);
}

export function drawSketchBorder(
  svgElement: SVGSVGElement,
  width: number,
  height: number,
  options?: Partial<RoughOptions>
) {
  const padding = 2;
  return drawRoughRect(svgElement, padding, padding, width - padding * 2, height - padding * 2, options);
}

export function mergeRoughOptions(custom: Partial<RoughOptions>): RoughOptions {
  return { ...defaultRoughOptions, ...custom };
}
