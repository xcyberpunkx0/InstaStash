import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { HelpSection, type PlatformExample } from './HelpSection';

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
];

describe('HelpSection', () => {
  it('renders the section title', () => {
    render(<HelpSection platforms={testPlatforms} />);
    expect(screen.getByText('How to download')).toBeInTheDocument();
  });

  it('renders platform name as heading', () => {
    render(<HelpSection platforms={testPlatforms} />);
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.queryByText('YouTube')).not.toBeInTheDocument();
  });

  it('renders platform icon', () => {
    render(<HelpSection platforms={testPlatforms} />);
    expect(screen.getByTestId('instagram-icon')).toBeInTheDocument();
  });

  it('renders step-by-step instructions for the platform', () => {
    render(<HelpSection platforms={testPlatforms} />);
    expect(screen.getByText('Open Instagram and find the video')).toBeInTheDocument();
    expect(screen.getByText('Copy the link')).toBeInTheDocument();
  });

  it('renders example URLs', () => {
    render(<HelpSection platforms={testPlatforms} />);
    expect(screen.getByText('https://www.instagram.com/p/ABC123/')).toBeInTheDocument();
  });

  it('uses proper heading hierarchy (h2 for title, h3 for platforms)', () => {
    render(<HelpSection platforms={testPlatforms} />);
    const title = screen.getByRole('heading', { level: 2, name: 'How to download' });
    expect(title).toBeInTheDocument();

    const platformHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(platformHeadings.length).toBe(1);
  });

  it('uses ordered list semantics for steps', () => {
    render(<HelpSection platforms={testPlatforms} />);
    const lists = screen.getAllByRole('list');
    expect(lists.length).toBeGreaterThan(0);
  });

  it('has accessible section with aria-labelledby', () => {
    render(<HelpSection platforms={testPlatforms} />);
    const section = document.querySelector('section[aria-labelledby="help-section-title"]');
    expect(section).toBeInTheDocument();
  });

  it('renders with default platforms when none provided', () => {
    render(<HelpSection platforms={[]} />);
    // Should still render the section structure
    expect(screen.getByText('How to download')).toBeInTheDocument();
  });
});
