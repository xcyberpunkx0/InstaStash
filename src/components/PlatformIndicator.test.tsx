import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlatformIndicator } from './PlatformIndicator';

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

  it('applies different styling for Instagram vs YouTube', () => {
    const { rerender, container } = render(<PlatformIndicator platform="instagram" contentType="post" />);
    const igClasses = container.firstElementChild?.className ?? '';

    rerender(<PlatformIndicator platform="youtube" contentType="video" />);
    const ytClasses = container.firstElementChild?.className ?? '';

    // Different platforms should have different class styling
    expect(igClasses).not.toBe(ytClasses);
  });

  it('renders an SVG element for the icon', () => {
    const { container } = render(<PlatformIndicator platform="youtube" contentType="short" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
