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
      // Updated to match InstaStash design system
      expect(sketchColors.primary).toBe('#C97B4E');     // terra-500
      expect(sketchColors.border).toBe('#C9B89E');      // paper-400
      expect(sketchColors.text).toBe('#1F1B16');        // ink-900
      expect(sketchColors.secondary).toBe('#7A8A6F');   // sage-500
      expect(sketchColors.accent).toBe('#C97B4E');      // terra-500
      expect(sketchColors.error).toBe('#B25548');       // rouge-500
      expect(sketchColors.success).toBe('#7A8A6F');     // sage-500
    });
  });

  describe('animationDurations', () => {
    it('defines durations within 100-500ms range', () => {
      expect(animationDurations.micro).toBeGreaterThanOrEqual(100);
      expect(animationDurations.micro).toBeLessThanOrEqual(500);
      expect(animationDurations.standard).toBeGreaterThanOrEqual(100);
      expect(animationDurations.standard).toBeLessThanOrEqual(500);
      expect(animationDurations.slow).toBeGreaterThanOrEqual(100);
      expect(animationDurations.slow).toBeLessThanOrEqual(500);
    });

    it('has correct specific values', () => {
      // Updated to match InstaStash design system: 140 / 240 / 420
      expect(animationDurations.micro).toBe(140);
      expect(animationDurations.standard).toBe(240);
      expect(animationDurations.slow).toBe(420);
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
