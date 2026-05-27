import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { URLInputField } from './URLInputField';

// Mock SketchBorder to avoid Rough.js canvas/SVG issues in jsdom
vi.mock('./SketchBorder', () => ({
  SketchBorder: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sketch-border" className={className}>{children}</div>
  ),
}));

describe('URLInputField', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the input field with proper label', () => {
    render(<URLInputField {...defaultProps} />);

    expect(screen.getByLabelText('Paste a video URL')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '2048');
  });

  it('trims whitespace on paste and calls onSubmit', () => {
    const onSubmit = vi.fn();
    render(<URLInputField {...defaultProps} onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox');
    fireEvent.paste(input, {
      clipboardData: { getData: () => '  https://youtube.com/watch?v=abc123def45  ' },
    });

    expect(onSubmit).toHaveBeenCalledWith('https://youtube.com/watch?v=abc123def45');
  });

  it('does not call onSubmit when pasted text is only whitespace', () => {
    const onSubmit = vi.fn();
    render(<URLInputField {...defaultProps} onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox');
    fireEvent.paste(input, {
      clipboardData: { getData: () => '   ' },
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit on Enter key press', () => {
    const onSubmit = vi.fn();
    render(<URLInputField {...defaultProps} onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'https://instagram.com/p/abc123/' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledWith('https://instagram.com/p/abc123/');
  });

  it('shows loading spinner when isLoading is true', () => {
    render(<URLInputField {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Detecting platform...')).toBeInTheDocument();
  });

  it('disables input when loading', () => {
    render(<URLInputField {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('displays error message below input', () => {
    render(<URLInputField {...defaultProps} error="URL not recognized" />);

    const errorEl = screen.getByRole('alert');
    expect(errorEl).toHaveTextContent('URL not recognized');
  });

  it('sets aria-invalid when error is present', () => {
    render(<URLInputField {...defaultProps} error="Invalid URL" />);

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows platform badge for Instagram Reel', () => {
    render(
      <URLInputField
        {...defaultProps}
        detectedPlatform={{ platform: 'instagram', contentType: 'reel' }}
      />
    );

    expect(screen.getByText(/Instagram Reel/)).toBeInTheDocument();
  });

  it('shows platform badge for YouTube Video', () => {
    render(
      <URLInputField
        {...defaultProps}
        detectedPlatform={{ platform: 'youtube', contentType: 'video' }}
      />
    );

    expect(screen.getByText(/YouTube Video/)).toBeInTheDocument();
  });

  it('does not show platform badge when isLoading', () => {
    render(
      <URLInputField
        {...defaultProps}
        isLoading={true}
        detectedPlatform={{ platform: 'youtube', contentType: 'video' }}
      />
    );

    expect(screen.queryByText(/YouTube Video/)).not.toBeInTheDocument();
  });

  it('does not show error element when no error', () => {
    render(<URLInputField {...defaultProps} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
