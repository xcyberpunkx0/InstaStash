import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SketchCharacter } from './SketchCharacter';

describe('SketchCharacter', () => {
  const moods = ['idle', 'thinking', 'happy', 'sad', 'error'] as const;

  moods.forEach((mood) => {
    it(`renders with mood "${mood}" without crashing`, () => {
      const { container } = render(<SketchCharacter mood={mood} />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
    });

    it(`has correct aria-label for mood "${mood}"`, () => {
      const { container } = render(<SketchCharacter mood={mood} />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('aria-label')).toBeTruthy();
    });
  });

  it('has role="img" for accessibility', () => {
    const { container } = render(<SketchCharacter mood="idle" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
  });

  it('renders at 64x64 size', () => {
    const { container } = render(<SketchCharacter mood="idle" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('64');
    expect(svg?.getAttribute('height')).toBe('64');
  });

  it('has correct viewBox', () => {
    const { container } = render(<SketchCharacter mood="idle" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 64 64');
  });

  it('displays distinct aria-labels for each mood', () => {
    const labels = new Set<string>();
    moods.forEach((mood) => {
      const { container } = render(<SketchCharacter mood={mood} />);
      const svg = container.querySelector('svg');
      const label = svg?.getAttribute('aria-label') ?? '';
      labels.add(label);
    });
    expect(labels.size).toBe(moods.length);
  });

  it('re-renders when mood changes', () => {
    const { container, rerender } = render(<SketchCharacter mood="idle" />);
    const svg = container.querySelector('svg');
    const initialLabel = svg?.getAttribute('aria-label');

    rerender(<SketchCharacter mood="happy" />);
    const updatedLabel = svg?.getAttribute('aria-label');

    expect(initialLabel).not.toBe(updatedLabel);
  });
});
