import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QualitySelector } from './QualitySelector';
import type { VideoQuality } from '@/types';

// Mock SketchBorder to avoid Rough.js canvas issues in tests
vi.mock('@/components/SketchBorder', () => ({
  SketchBorder: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sketch-border" className={className}>{children}</div>
  ),
}));

const mockOptions: VideoQuality[] = [
  { formatId: 'f1', resolution: '360p', fileSize: 15 * 1024 * 1024, label: '360p SD (~15MB)' },
  { formatId: 'f2', resolution: '720p', fileSize: 30 * 1024 * 1024, label: '720p HD (~30MB)' },
  { formatId: 'f3', resolution: '1080p', fileSize: 60 * 1024 * 1024, label: '1080p FHD (~60MB)' },
];

describe('QualitySelector', () => {
  it('returns null when options has only one item (Req 3.4)', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <QualitySelector options={[mockOptions[0]]} onSelect={onSelect} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when options is empty (Req 3.4)', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <QualitySelector options={[]} onSelect={onSelect} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders quality options sorted from highest to lowest resolution (Req 3.3)', () => {
    const onSelect = vi.fn();
    render(<QualitySelector options={mockOptions} onSelect={onSelect} />);

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);

    // Check order: 1080p, 720p, 360p
    const labels = screen.getAllByText(/\d+p/);
    expect(labels[0]).toHaveTextContent('1080p');
    expect(labels[1]).toHaveTextContent('720p');
    expect(labels[2]).toHaveTextContent('360p');
  });

  it('displays resolution label and approximate file size for each option (Req 3.1)', () => {
    const onSelect = vi.fn();
    render(<QualitySelector options={mockOptions} onSelect={onSelect} />);

    // Check resolution labels
    expect(screen.getByText('1080p')).toBeInTheDocument();
    expect(screen.getByText('720p')).toBeInTheDocument();
    expect(screen.getByText('360p')).toBeInTheDocument();

    // Check file sizes (formatted as MB)
    expect(screen.getByText('~60MB')).toBeInTheDocument();
    expect(screen.getByText('~30MB')).toBeInTheDocument();
    expect(screen.getByText('~15MB')).toBeInTheDocument();
  });

  it('calls onSelect with the formatId when a radio button is clicked (Req 3.5)', () => {
    const onSelect = vi.fn();
    render(<QualitySelector options={mockOptions} onSelect={onSelect} />);

    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[1]); // Click 720p (second in sorted order)

    expect(onSelect).toHaveBeenCalledWith('f2');
  });

  it('marks the selected option as checked when selectedId is provided', () => {
    const onSelect = vi.fn();
    render(
      <QualitySelector options={mockOptions} onSelect={onSelect} selectedId="f2" />
    );

    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    const checkedRadio = radios.find((r) => r.checked);
    expect(checkedRadio).toBeDefined();
    expect(checkedRadio!.value).toBe('f2');
  });

  it('uses accessible fieldset and legend', () => {
    const onSelect = vi.fn();
    render(<QualitySelector options={mockOptions} onSelect={onSelect} />);

    const fieldset = screen.getByRole('group');
    expect(fieldset).toBeInTheDocument();
    expect(screen.getByText('Choose Quality')).toBeInTheDocument();
  });

  it('pre-selects the first (highest quality) option when no selectedId is provided', () => {
    const onSelect = vi.fn();
    render(<QualitySelector options={mockOptions} onSelect={onSelect} />);

    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    // First radio in sorted order (1080p) should be checked
    expect(radios[0].checked).toBe(true);
    expect(radios[0].value).toBe('f3'); // f3 is 1080p, highest resolution
  });

  it('formats file sizes less than 1MB correctly', () => {
    const onSelect = vi.fn();
    const smallOptions: VideoQuality[] = [
      { formatId: 's1', resolution: '240p', fileSize: 500 * 1024, label: '240p (~0.5MB)' },
      { formatId: 's2', resolution: '360p', fileSize: 800 * 1024, label: '360p (~0.8MB)' },
    ];
    render(<QualitySelector options={smallOptions} onSelect={onSelect} />);

    expect(screen.getByText('~0.5MB')).toBeInTheDocument();
    expect(screen.getByText('~0.8MB')).toBeInTheDocument();
  });
});
