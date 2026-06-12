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

  it('has accessible role="status" with platform label', () => {
    render(<PlatformIndicator platform="instagram" contentType="reel" />);
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('aria-label', 'Detected platform: Instagram Reel');
  });

  it('renders an SVG element for the icon', () => {
    const { container } = render(<PlatformIndicator platform="instagram" contentType="reel" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
