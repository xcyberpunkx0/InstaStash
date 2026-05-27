import { describe, it, expect } from 'vitest';
import {
  sketchColors,
  animationDurations,
  defaultRoughOptions,
  buttonRoughOptions,
  subtleRoughOptions,
  mergeRoughOptions,
} from './rough-utils';

describe('rough-utils', () => {
  describe('sketchColors', () => {
    it('defines the correct theme colors', () => {
      expect(sketchColors.primary).toBe('#BF5540');
      expect(sketchColors.border).toBe('#C4B5A4');
      expect(sketchColors.text).toBe('#3D3229');
      expect(sketchColors.secondary).toBe('#7BB5A3');
      expect(sketchColors.accent).toBe('#F4C06F');
      expect(sketchColors.error).toBe('#C04038');
      expect(sketchColors.success).toBe('#6BA87B');
    });
  });

  describe('animationDurations', () => {
    it('defines durations within 150-400ms range', () => {
      expect(animationDurations.micro).toBeGreaterThanOrEqual(150);
      expect(animationDurations.micro).toBeLessThanOrEqual(400);
      expect(animationDurations.standard).toBeGreaterThanOrEqual(150);
      expect(animationDurations.standard).toBeLessThanOrEqual(400);
      expect(animationDurations.slow).toBeGreaterThanOrEqual(150);
      expect(animationDurations.slow).toBeLessThanOrEqual(400);
    });

    it('has correct specific values', () => {
      expect(animationDurations.micro).toBe(200);
      expect(animationDurations.standard).toBe(300);
      expect(animationDurations.slow).toBe(400);
    });
  });

  describe('defaultRoughOptions', () => {
    it('uses border color as stroke', () => {
      expect(defaultRoughOptions.stroke).toBe(sketchColors.border);
    });

    it('has reasonable roughness and bowing values', () => {
      expect(defaultRoughOptions.roughness).toBeGreaterThan(0);
      expect(defaultRoughOptions.bowing).toBeGreaterThan(0);
      expect(defaultRoughOptions.strokeWidth).toBeGreaterThan(0);
    });
  });

  describe('buttonRoughOptions', () => {
    it('uses primary color as stroke', () => {
      expect(buttonRoughOptions.stroke).toBe(sketchColors.primary);
    });
  });

  describe('subtleRoughOptions', () => {
    it('has lower roughness than default', () => {
      expect(subtleRoughOptions.roughness).toBeLessThan(defaultRoughOptions.roughness!);
    });

    it('uses border color as stroke', () => {
      expect(subtleRoughOptions.stroke).toBe(sketchColors.border);
    });
  });

  describe('mergeRoughOptions', () => {
    it('merges custom options with defaults', () => {
      const custom = { stroke: '#FF0000', roughness: 3 };
      const merged = mergeRoughOptions(custom);
      expect(merged.stroke).toBe('#FF0000');
      expect(merged.roughness).toBe(3);
      expect(merged.bowing).toBe(defaultRoughOptions.bowing);
      expect(merged.strokeWidth).toBe(defaultRoughOptions.strokeWidth);
    });

    it('returns defaults when no custom options provided', () => {
      const merged = mergeRoughOptions({});
      expect(merged).toEqual(defaultRoughOptions);
    });
  });
});
