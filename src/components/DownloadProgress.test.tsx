import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DownloadProgress } from './DownloadProgress';

describe('DownloadProgress', () => {
  describe('downloading state', () => {
    it('renders progress bar with correct ARIA attributes', () => {
      render(<DownloadProgress percentage={45} status="downloading" />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '45');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('displays percentage text', () => {
      render(<DownloadProgress percentage={72} status="downloading" />);

      expect(screen.getByText('72%')).toBeInTheDocument();
    });

    it('clamps percentage to 0-100 range', () => {
      const { rerender } = render(<DownloadProgress percentage={150} status="downloading" />);

      let progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '100');

      rerender(<DownloadProgress percentage={-10} status="downloading" />);
      progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    });

    it('rounds percentage to integer', () => {
      render(<DownloadProgress percentage={45.7} status="downloading" />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '46');
    });

    it('shows downloading label', () => {
      render(<DownloadProgress percentage={30} status="downloading" />);

      expect(screen.getByText('Downloading...')).toBeInTheDocument();
    });

    it('has data-testid for downloading state', () => {
      render(<DownloadProgress percentage={50} status="downloading" />);

      expect(screen.getByTestId('download-progress-downloading')).toBeInTheDocument();
    });
  });

  describe('complete state', () => {
    it('shows completion message', () => {
      render(<DownloadProgress percentage={100} status="complete" />);

      expect(screen.getByText(/Download complete/)).toBeInTheDocument();
    });

    it('does not show progress bar', () => {
      render(<DownloadProgress percentage={100} status="complete" />);

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('has data-testid for complete state', () => {
      render(<DownloadProgress percentage={100} status="complete" />);

      expect(screen.getByTestId('download-progress-complete')).toBeInTheDocument();
    });

    it('renders celebratory SVG', () => {
      const { container } = render(<DownloadProgress percentage={100} status="complete" />);

      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('error state', () => {
    it('shows error message', () => {
      render(<DownloadProgress percentage={50} status="error" />);

      expect(screen.getByText('Something went wrong during download.')).toBeInTheDocument();
    });

    it('shows retry button when onRetry is provided', () => {
      const onRetry = vi.fn();
      render(<DownloadProgress percentage={50} status="error" onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const onRetry = vi.fn();
      render(<DownloadProgress percentage={50} status="error" onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not show retry button when onRetry is not provided', () => {
      render(<DownloadProgress percentage={50} status="error" />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('has data-testid for error state', () => {
      render(<DownloadProgress percentage={50} status="error" />);

      expect(screen.getByTestId('download-progress-error')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible label on progress bar', () => {
      render(<DownloadProgress percentage={60} status="downloading" />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', 'Download progress: 60%');
    });

    it('hides decorative SVGs from screen readers', () => {
      const { container } = render(<DownloadProgress percentage={100} status="complete" />);

      const svgs = container.querySelectorAll('svg');
      svgs.forEach((svg) => {
        expect(svg.getAttribute('aria-hidden')).toBe('true');
      });
    });
  });
});
