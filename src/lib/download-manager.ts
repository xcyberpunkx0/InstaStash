import { spawn, ChildProcess } from 'child_process';
import { Readable } from 'stream';

/** Error thrown when a download times out due to no progress */
export class DownloadTimeoutError extends Error {
  constructor(message = 'Download timed out: no progress received for 30 seconds') {
    super(message);
    this.name = 'DownloadTimeoutError';
  }
}

/** Error thrown when a download fails mid-progress */
export class DownloadFailedError extends Error {
  constructor(message = 'Download failed') {
    super(message);
    this.name = 'DownloadFailedError';
  }
}

/**
 * Parses a yt-dlp progress line and extracts the percentage value.
 * yt-dlp outputs lines like: "[download]  45.2% of ~50.00MiB at 2.50MiB/s ETA 00:11"
 * Returns an integer 0-100 or null if the line doesn't contain progress info.
 */
export function parseProgressLine(line: string): number | null {
  // Match patterns like "45.2%" or "100%" in download progress lines
  const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
  if (!match) return null;

  const raw = parseFloat(match[1]);
  if (isNaN(raw)) return null;

  // Clamp to [0, 100] and floor to integer
  const clamped = Math.min(100, Math.max(0, raw));
  return Math.floor(clamped);
}

/**
 * Ensures progress values are monotonically non-decreasing.
 * Returns the value if it's >= lastValue, otherwise returns null (skip).
 */
export function enforceMonotonic(value: number, lastValue: number): number | null {
  if (value >= lastValue) return value;
  return null;
}

/** Options for the DownloadManager */
export interface DownloadManagerOptions {
  /** Path to the yt-dlp binary. Defaults to 'yt-dlp'. */
  ytDlpPath?: string;
  /** Timeout in milliseconds for no-progress detection. Defaults to 30000 (30s). */
  progressTimeoutMs?: number;
}

/**
 * DownloadManager handles streaming video downloads via yt-dlp.
 * It spawns yt-dlp as a child process, parses progress output,
 * and returns a ReadableStream of the downloaded file content.
 */
export class DownloadManager {
  private readonly ytDlpPath: string;
  private readonly progressTimeoutMs: number;

  constructor(options: DownloadManagerOptions = {}) {
    this.ytDlpPath = options.ytDlpPath ?? 'yt-dlp';
    this.progressTimeoutMs = options.progressTimeoutMs ?? 30_000;
  }

  /**
   * Downloads a video and returns a ReadableStream of the file content.
   *
   * @param url - The video URL to download
   * @param formatId - The format ID to select (passed to yt-dlp -f flag)
   * @param onProgress - Callback receiving integer percentage values (0-100), monotonically non-decreasing
   * @returns A ReadableStream containing the downloaded video data
   * @throws DownloadTimeoutError if no progress is received for 30 seconds
   * @throws DownloadFailedError if yt-dlp exits with an error
   */
  download(
    url: string,
    formatId: string,
    onProgress: (pct: number) => void
  ): ReadableStream<Uint8Array> {
    let lastProgress = 0;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let process: ChildProcess | null = null;
    let aborted = false;

    const resetTimeout = (controller: ReadableStreamDefaultController<Uint8Array>) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      timeoutHandle = setTimeout(() => {
        aborted = true;
        if (process) {
          process.kill('SIGTERM');
        }
        controller.error(new DownloadTimeoutError());
      }, this.progressTimeoutMs);
    };

    const cleanup = () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
    };

    return new ReadableStream<Uint8Array>({
      start: (controller) => {
        // Spawn yt-dlp to download to stdout
        // -f formatId: select the specific format
        // -o -: output to stdout
        // --newline: print progress on new lines (easier to parse)
        const args = [
          '-f', formatId,
          '-o', '-',
          '--newline',
          '--no-part',
          url,
        ];

        process = spawn(this.ytDlpPath, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        // Start the progress timeout
        resetTimeout(controller);

        // Parse stderr for progress updates (yt-dlp writes progress to stderr)
        let stderrBuffer = '';
        process.stderr?.on('data', (chunk: Buffer) => {
          if (aborted) return;

          stderrBuffer += chunk.toString();
          const lines = stderrBuffer.split('\n');
          // Keep the last incomplete line in the buffer
          stderrBuffer = lines.pop() ?? '';

          for (const line of lines) {
            const pct = parseProgressLine(line);
            if (pct !== null) {
              const monotonic = enforceMonotonic(pct, lastProgress);
              if (monotonic !== null) {
                lastProgress = monotonic;
                onProgress(monotonic);
                // Reset timeout on progress
                resetTimeout(controller);
              }
            }
          }
        });

        // Pipe stdout (video data) into the ReadableStream
        process.stdout?.on('data', (chunk: Buffer) => {
          if (aborted) return;
          controller.enqueue(new Uint8Array(chunk));
          // Reset timeout on data received too
          resetTimeout(controller);
        });

        process.stdout?.on('end', () => {
          // stdout ended - don't close yet, wait for process exit
        });

        process.on('error', (err) => {
          cleanup();
          if (!aborted) {
            controller.error(new DownloadFailedError(`Failed to spawn yt-dlp: ${err.message}`));
          }
        });

        process.on('close', (code) => {
          cleanup();
          if (aborted) return;

          if (code === 0) {
            // Emit final 100% progress if not already emitted
            if (lastProgress < 100) {
              lastProgress = 100;
              onProgress(100);
            }
            controller.close();
          } else {
            controller.error(
              new DownloadFailedError(`yt-dlp exited with code ${code}`)
            );
          }
        });
      },

      cancel: () => {
        cleanup();
        aborted = true;
        if (process) {
          process.kill('SIGTERM');
        }
      },
    });
  }
}
