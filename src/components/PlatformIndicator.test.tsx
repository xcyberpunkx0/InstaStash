import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlatformIndicator } from './PlatformIndicator';

// Mock roughjs to avoid canvas/SVG rendering issues in jsdom
vi.mock('roughjs', () => ({
  default: {
    svg: () => ({
      rectangle: () => document.createElementNS('http://www.w3.org/2000/svg', 'g'),
      circle: () => document.createElementNS('http://www.w3.org/2000/svg', 'g'),
      polygon: () => document.createElementNS('http://www.w3.org/2000/svg', 'g'),
    }),
  },
}));

describe('PlatformIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Instagram Post label', () => {
    render(<PlatformIndicator platform="instagram" contentType="post" />);
    expect(screen.getByText('Instagram Post')).toBeInTheDocument();
  });

  it('renders Instagram Reel label', () => {
    render(<PlatformIndicator platform="instagram" contentType="reel" />);
    expect(screen.getByText('Instagram Reel')).toBeInTheDocument();
  });

  it('renders YouTube Video label', () => {
    render(<PlatformIndicator platform="youtube" contentType="video" />);
    expect(screen.getByText('YouTube Video')).toBeInTheDocument();
  });

  it('renders YouTube Short label', () => {
    render(<PlatformIndicator platform="youtube" contentType="short" />);
    expect(screen.getByText('YouTube Short')).toBeInTheDocument();
  });

  it('has accessible role="status" with platform label', () => {
    render(<PlatformIndicator platform="instagram" contentType="reel" />);
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('aria-label', 'Detected platform: Instagram Reel');
  });

  it('applies color styling for Instagram', () => {
    render(<PlatformIndicator platform="instagram" contentType="post" />);
    const label = screen.getByText('Instagram Post');
    // Verify color style is applied (jsdom converts hex to rgb)
    expect(label.style.color).toBeTruthy();
  });

  it('applies color styling for YouTube', () => {
    render(<PlatformIndicator platform="youtube" contentType="video" />);
    const label = screen.getByText('YouTube Video');
    // Verify color style is applied (jsdom converts hex to rgb)
    expect(label.style.color).toBeTruthy();
  });

  it('applies different colors for different platforms', () => {
    const { rerender } = render(<PlatformIndicator platform="instagram" contentType="post" />);
    const igLabel = screen.getByText('Instagram Post');
    const igColor = igLabel.style.color;

    rerender(<PlatformIndicator platform="youtube" contentType="video" />);
    const ytLabel = screen.getByText('YouTube Video');
    const ytColor = ytLabel.style.color;

    expect(igColor).not.toBe(ytColor);
  });

  it('renders an SVG element for the icon', () => {
    const { container } = render(<PlatformIndicator platform="youtube" contentType="short" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
