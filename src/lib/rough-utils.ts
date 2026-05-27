/**
 * Rough.js canvas rendering utilities for the sketchbook theme.
 * Provides common drawing options and helper functions for creating
 * hand-drawn SVG elements using Rough.js.
 */
import rough from 'roughjs';
import type { Options as RoughOptions } from 'roughjs/bin/core';

/** Theme colors used for Rough.js rendering */
export const sketchColors = {
  primary: '#BF5540',
  border: '#C4B5A4',
  text: '#3D3229',
  secondary: '#7BB5A3',
  accent: '#F4C06F',
  error: '#C04038',
  success: '#6BA87B',
} as const;

/** Animation duration constants (in ms) for micro-animations */
export const animationDurations = {
  micro: 200,
  standard: 300,
  slow: 400,
} as const;

/** Default Rough.js drawing options for the sketchbook aesthetic */
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

/** Rough.js options for a lighter, more subtle border */
export const subtleRoughOptions: RoughOptions = {
  roughness: 0.8,
  bowing: 0.5,
  stroke: sketchColors.border,
  strokeWidth: 1.5,
  fillStyle: 'hachure',
};

/**
 * Creates a Rough.js SVG instance from an SVG element.
 */
export function createRoughSvg(svgElement: SVGSVGElement) {
  return rough.svg(svgElement);
}

/**
 * Draws a hand-drawn rectangle on an SVG element using Rough.js.
 * Returns the generated SVG node for appending to the SVG.
 */
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

/**
 * Draws a hand-drawn rounded rectangle (approximated with a rectangle
 * since Rough.js doesn't natively support border-radius).
 */
export function drawSketchBorder(
  svgElement: SVGSVGElement,
  width: number,
  height: number,
  options?: Partial<RoughOptions>
) {
  const padding = 2; // Small padding so strokes don't clip
  return drawRoughRect(
    svgElement,
    padding,
    padding,
    width - padding * 2,
    height - padding * 2,
    options
  );
}

/**
 * Merges custom options with default rough options.
 */
export function mergeRoughOptions(custom: Partial<RoughOptions>): RoughOptions {
  return { ...defaultRoughOptions, ...custom };
}
