import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { HelpSection, type PlatformExample } from './HelpSection';

// Mock SketchBorder since it uses Rough.js which requires DOM measurements
vi.mock('./SketchBorder', () => ({
  SketchBorder: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sketch-border" className={className}>
      {children}
    </div>
  ),
}));

const testPlatforms: PlatformExample[] = [
  {
    name: 'Instagram',
    icon: <span data-testid="instagram-icon">IG</span>,
    exampleUrls: ['https://www.instagram.com/p/ABC123/'],
    steps: [
      'Open Instagram and find the video',
      'Copy the link',
      'Paste it above',
      'Click download',
    ],
  },
  {
    name: 'YouTube',
    icon: <span data-testid="youtube-icon">YT</span>,
    exampleUrls: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    steps: [
      'Open YouTube and find the video',
      'Copy the URL',
      'Paste it above',
      'Choose quality',
      'Click download',
    ],
  },
];

describe('HelpSection', () => {
  it('renders the section title', () => {
    render(<HelpSection platforms={testPlatforms} />);
    expect(screen.getByText('How to Download Videos')).toBeInTheDocument();
  });

  it('renders platform names as headings', () => {
    render(<HelpSection platforms={testPlatforms} />);
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('renders platform icons', () => {
    render(<HelpSection platforms={testPlatforms} />);
    expect(screen.getByTestId('instagram-icon')).toBeInTheDocument();
    expect(screen.getByTestId('youtube-icon')).toBeInTheDocument();
  });

  it('renders step-by-step instructions for each platform', () => {
    render(<HelpSection platforms={testPlatforms} />);
    expect(screen.getByText('Open Instagram and find the video')).toBeInTheDocument();
    expect(screen.getByText('Copy the link')).toBeInTheDocument();
    expect(screen.getByText('Open YouTube and find the video')).toBeInTheDocument();
    // "Choose quality" appears in both platform steps and quick summary
    expect(screen.getAllByText('Choose quality').length).toBeGreaterThanOrEqual(1);
  });

  it('renders example URLs for each platform', () => {
    render(<HelpSection platforms={testPlatforms} />);
    expect(screen.getByText('https://www.instagram.com/p/ABC123/')).toBeInTheDocument();
    expect(screen.getByText('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeInTheDocument();
  });

  it('uses proper heading hierarchy (h2 for title, h3 for platforms)', () => {
    render(<HelpSection platforms={testPlatforms} />);
    const title = screen.getByRole('heading', { level: 2, name: 'How to Download Videos' });
    expect(title).toBeInTheDocument();

    const platformHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(platformHeadings.length).toBeGreaterThanOrEqual(2);
  });

  it('uses ordered list semantics for steps', () => {
    render(<HelpSection platforms={testPlatforms} />);
    const lists = screen.getAllByRole('list');
    expect(lists.length).toBeGreaterThan(0);
  });

  it('wraps content in SketchBorder', () => {
    render(<HelpSection platforms={testPlatforms} />);
    expect(screen.getByTestId('sketch-border')).toBeInTheDocument();
  });

  it('has accessible section with aria-labelledby', () => {
    render(<HelpSection platforms={testPlatforms} />);
    const section = document.querySelector('section[aria-labelledby="help-section-title"]');
    expect(section).toBeInTheDocument();
  });

  it('renders quick summary steps', () => {
    render(<HelpSection platforms={testPlatforms} />);
    expect(screen.getByText('Quick Steps')).toBeInTheDocument();
    expect(screen.getByText('Copy a video URL')).toBeInTheDocument();
    // "Paste it above" appears in both platform steps and quick summary
    expect(screen.getAllByText('Paste it above').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Download!')).toBeInTheDocument();
  });

  it('renders with default platforms when none provided', () => {
    render(<HelpSection platforms={[]} />);
    // Should still render the section structure
    expect(screen.getByText('How to Download Videos')).toBeInTheDocument();
  });
});
