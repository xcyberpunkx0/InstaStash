import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SketchCharacter } from './SketchCharacter';

// Mock roughjs to avoid canvas/SVG rendering issues in jsdom
vi.mock('roughjs', () => {
  const createMockNode = () => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    return el;
  };

  return {
    default: {
      svg: () => ({
        circle: () => createMockNode(),
        line: () => createMockNode(),
        arc: () => createMockNode(),
        ellipse: () => createMockNode(),
        rectangle: () => createMockNode(),
      }),
    },
  };
});

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

  it('renders at 80x80 size', () => {
    const { container } = render(<SketchCharacter mood="idle" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('80');
    expect(svg?.getAttribute('height')).toBe('80');
  });

  it('has correct viewBox', () => {
    const { container } = render(<SketchCharacter mood="idle" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 80 80');
  });

  it('displays distinct aria-labels for each mood', () => {
    const labels = new Set<string>();
    moods.forEach((mood) => {
      const { container } = render(<SketchCharacter mood={mood} />);
      const svg = container.querySelector('svg');
      const label = svg?.getAttribute('aria-label') ?? '';
      labels.add(label);
    });
    // Each mood should have a unique label
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
