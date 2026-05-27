import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorMessage, getErrorMessage, moodMap } from './ErrorMessage';
import type { ErrorMessageProps } from './ErrorMessage';

// Mock window.matchMedia for useReducedMotion hook used by SketchButton
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock ResizeObserver used by SketchButton
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

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

describe('ErrorMessage', () => {
  const errorTypes: ErrorMessageProps['type'][] = [
    'network',
    'private',
    'unavailable',
    'unsupported',
    'timeout',
    'rate-limit',
    'duration',
    'format',
  ];

  describe('renders for each error type', () => {
    errorTypes.forEach((type) => {
      it(`renders without crashing for type "${type}"`, () => {
        const { container } = render(
          <ErrorMessage type={type} message={`Test ${type}`} />
        );
        expect(container).toBeTruthy();
      });
    });
  });

  describe('error messages are distinct', () => {
    it('each error type maps to a unique message', () => {
      const messages = new Set(
        errorTypes.map((type) => getErrorMessage(type))
      );
      expect(messages.size).toBe(errorTypes.length);
    });
  });

  describe('accessibility', () => {
    it('displays error message with role="alert"', () => {
      render(<ErrorMessage type="network" message="test" />);
      const alert = screen.getByRole('alert');
      expect(alert).toBeTruthy();
      expect(alert.textContent).toContain("Couldn't connect");
    });
  });

  describe('SketchCharacter mood mapping', () => {
    it('renders SketchCharacter with sad mood for network errors', () => {
      const { container } = render(
        <ErrorMessage type="network" message="test" />
      );
      const svg = container.querySelector('svg[aria-label*="sad"]');
      expect(svg).not.toBeNull();
    });

    it('renders SketchCharacter with error mood for unsupported errors', () => {
      const { container } = render(
        <ErrorMessage type="unsupported" message="test" />
      );
      const svg = container.querySelector('svg[aria-label*="error"]');
      expect(svg).not.toBeNull();
    });

    it('renders SketchCharacter with error mood for duration errors', () => {
      const { container } = render(
        <ErrorMessage type="duration" message="test" />
      );
      const svg = container.querySelector('svg[aria-label*="error"]');
      expect(svg).not.toBeNull();
    });

    it('renders SketchCharacter with error mood for format errors', () => {
      const { container } = render(
        <ErrorMessage type="format" message="test" />
      );
      const svg = container.querySelector('svg[aria-label*="error"]');
      expect(svg).not.toBeNull();
    });

    it('maps moods correctly for all error types', () => {
      expect(moodMap['network']).toBe('sad');
      expect(moodMap['private']).toBe('sad');
      expect(moodMap['unavailable']).toBe('sad');
      expect(moodMap['unsupported']).toBe('error');
      expect(moodMap['timeout']).toBe('thinking');
      expect(moodMap['rate-limit']).toBe('thinking');
      expect(moodMap['duration']).toBe('error');
      expect(moodMap['format']).toBe('error');
    });
  });

  describe('retry button', () => {
    it('shows retry button when retryAction is provided', () => {
      const retryAction = vi.fn();
      render(
        <ErrorMessage type="network" message="test" retryAction={retryAction} />
      );
      const button = screen.getByRole('button', { name: /retry/i });
      expect(button).toBeTruthy();
    });

    it('does not show retry button when retryAction is not provided', () => {
      render(<ErrorMessage type="network" message="test" />);
      const button = screen.queryByRole('button', { name: /retry/i });
      expect(button).toBeNull();
    });

    it('calls retryAction when retry button is clicked', () => {
      const retryAction = vi.fn();
      render(
        <ErrorMessage type="network" message="test" retryAction={retryAction} />
      );
      const button = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(button);
      expect(retryAction).toHaveBeenCalledTimes(1);
    });

    it('disables retry button when retryDisabled is true', () => {
      const retryAction = vi.fn();
      render(
        <ErrorMessage
          type="network"
          message="test"
          retryAction={retryAction}
          retryDisabled={true}
        />
      );
      const button = screen.getByRole('button', { name: /retry/i });
      expect(button).toBeDisabled();
    });
  });

  describe('countdown timer', () => {
    it('shows countdown for rate-limit errors when countdown > 0', () => {
      render(
        <ErrorMessage
          type="rate-limit"
          message="test"
          countdown={15}
          retryAction={() => {}}
          retryDisabled={true}
        />
      );
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toContain('15s');
    });

    it('does not show countdown section when countdown is 0', () => {
      const { container } = render(
        <ErrorMessage
          type="rate-limit"
          message="test"
          countdown={0}
          retryAction={() => {}}
        />
      );
      expect(container.textContent).not.toContain('Retry available in');
    });
  });

  describe('getErrorMessage', () => {
    it('returns correct message for network error', () => {
      expect(getErrorMessage('network')).toBe(
        "Couldn't connect — check your internet and try again!"
      );
    });

    it('returns correct message for private error', () => {
      expect(getErrorMessage('private')).toBe(
        'This content is private — we can only download public videos.'
      );
    });

    it('returns correct message for unavailable error', () => {
      expect(getErrorMessage('unavailable')).toBe(
        'This content is no longer available on the platform.'
      );
    });

    it('returns correct message for unsupported error', () => {
      expect(getErrorMessage('unsupported')).toBe(
        "We don't recognize this URL. We support Instagram and YouTube!"
      );
    });

    it('returns correct message for timeout error', () => {
      expect(getErrorMessage('timeout')).toBe(
        'That took too long! Try pasting the URL again.'
      );
    });

    it('returns correct message for rate-limit with countdown', () => {
      expect(getErrorMessage('rate-limit', 30)).toBe(
        'Too many requests! Please wait 30s...'
      );
    });

    it('returns correct message for duration error', () => {
      expect(getErrorMessage('duration')).toBe(
        'This video is too long! We support videos up to 60 minutes.'
      );
    });

    it('returns correct message for format error', () => {
      expect(getErrorMessage('format')).toBe(
        "This doesn't look like a video link. Check the URL?"
      );
    });
  });
});
