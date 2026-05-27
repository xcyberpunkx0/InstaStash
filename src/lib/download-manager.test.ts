import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseProgressLine,
  enforceMonotonic,
  DownloadManager,
  DownloadTimeoutError,
  DownloadFailedError,
} from './download-manager';
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';

// ─── Unit tests for parseProgressLine ────────────────────────────────────────

describe('parseProgressLine', () => {
  it('parses a standard yt-dlp progress line', () => {
    expect(parseProgressLine('[download]  45.2% of ~50.00MiB at 2.50MiB/s ETA 00:11')).toBe(45);
  });

  it('parses 100% progress', () => {
    expect(parseProgressLine('[download] 100% of 50.00MiB in 00:20')).toBe(100);
  });

  it('parses 0% progress', () => {
    expect(parseProgressLine('[download]   0.0% of ~50.00MiB at Unknown speed ETA Unknown')).toBe(0);
  });

  it('parses single digit percentage', () => {
    expect(parseProgressLine('[download]   5.3% of ~50.00MiB at 1.00MiB/s ETA 00:47')).toBe(5);
  });

  it('returns null for non-progress lines', () => {
    expect(parseProgressLine('[info] Downloading video')).toBeNull();
    expect(parseProgressLine('[youtube] Extracting URL')).toBeNull();
    expect(parseProgressLine('')).toBeNull();
  });

  it('returns null for lines without [download] prefix', () => {
    expect(parseProgressLine('45.2% done')).toBeNull();
  });

  it('floors decimal percentages to integers', () => {
    expect(parseProgressLine('[download]  99.9% of ~50.00MiB at 2.50MiB/s ETA 00:00')).toBe(99);
  });

  it('clamps values above 100 to 100', () => {
    // Edge case: shouldn't happen but handle gracefully
    expect(parseProgressLine('[download] 100.5% of 50.00MiB')).toBe(100);
  });
});

// ─── Unit tests for enforceMonotonic ─────────────────────────────────────────

describe('enforceMonotonic', () => {
  it('returns value when greater than last', () => {
    expect(enforceMonotonic(50, 30)).toBe(50);
  });

  it('returns value when equal to last', () => {
    expect(enforceMonotonic(50, 50)).toBe(50);
  });

  it('returns null when value is less than last', () => {
    expect(enforceMonotonic(30, 50)).toBeNull();
  });

  it('returns 0 when both are 0', () => {
    expect(enforceMonotonic(0, 0)).toBe(0);
  });

  it('returns 100 when both are 100', () => {
    expect(enforceMonotonic(100, 100)).toBe(100);
  });
});

// ─── Integration tests for DownloadManager ───────────────────────────────────

// Mock child_process.spawn
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'child_process';
const mockSpawn = vi.mocked(spawn);

function createMockProcess(): {
  process: ChildProcess;
  stdout: EventEmitter;
  stderr: EventEmitter;
} {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const proc = new EventEmitter() as unknown as ChildProcess;
  (proc as any).stdout = stdout;
  (proc as any).stderr = stderr;
  (proc as any).kill = vi.fn();
  (proc as any).pid = 12345;
  return { process: proc, stdout, stderr };
}

describe('DownloadManager', () => {
  let manager: DownloadManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new DownloadManager({ progressTimeoutMs: 30_000 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('spawns yt-dlp with correct arguments', () => {
    const { process: mockProc, stdout, stderr } = createMockProcess();
    mockSpawn.mockReturnValue(mockProc as any);

    const onProgress = vi.fn();
    manager.download('https://youtube.com/watch?v=abc123', '22', onProgress);

    expect(mockSpawn).toHaveBeenCalledWith(
      'yt-dlp',
      ['-f', '22', '-o', '-', '--newline', '--no-part', 'https://youtube.com/watch?v=abc123'],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
  });

  it('emits progress updates from stderr parsing', async () => {
    const { process: mockProc, stdout, stderr } = createMockProcess();
    mockSpawn.mockReturnValue(mockProc as any);

    const onProgress = vi.fn();
    const stream = manager.download('https://youtube.com/watch?v=abc123', '22', onProgress);
    const reader = stream.getReader();

    // Simulate progress output
    stderr.emit('data', Buffer.from('[download]  25.0% of ~50.00MiB at 2.50MiB/s ETA 00:15\n'));
    stderr.emit('data', Buffer.from('[download]  50.5% of ~50.00MiB at 2.50MiB/s ETA 00:10\n'));
    stderr.emit('data', Buffer.from('[download]  75.8% of ~50.00MiB at 2.50MiB/s ETA 00:05\n'));

    expect(onProgress).toHaveBeenCalledWith(25);
    expect(onProgress).toHaveBeenCalledWith(50);
    expect(onProgress).toHaveBeenCalledWith(75);
  });

  it('enforces monotonically non-decreasing progress', async () => {
    const { process: mockProc, stdout, stderr } = createMockProcess();
    mockSpawn.mockReturnValue(mockProc as any);

    const onProgress = vi.fn();
    const stream = manager.download('https://youtube.com/watch?v=abc123', '22', onProgress);

    // Simulate progress that goes backwards (shouldn't emit the lower value)
    stderr.emit('data', Buffer.from('[download]  50.0% of ~50.00MiB at 2.50MiB/s ETA 00:10\n'));
    stderr.emit('data', Buffer.from('[download]  30.0% of ~50.00MiB at 2.50MiB/s ETA 00:14\n'));
    stderr.emit('data', Buffer.from('[download]  60.0% of ~50.00MiB at 2.50MiB/s ETA 00:08\n'));

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalledWith(50);
    expect(onProgress).toHaveBeenCalledWith(60);
    // 30 should NOT have been emitted
    expect(onProgress).not.toHaveBeenCalledWith(30);
  });

  it('streams video data from stdout', async () => {
    const { process: mockProc, stdout, stderr } = createMockProcess();
    mockSpawn.mockReturnValue(mockProc as any);

    const onProgress = vi.fn();
    const stream = manager.download('https://youtube.com/watch?v=abc123', '22', onProgress);
    const reader = stream.getReader();

    // Simulate video data
    const videoData = new Uint8Array([1, 2, 3, 4, 5]);
    stdout.emit('data', Buffer.from(videoData));

    const { value, done } = await reader.read();
    expect(done).toBe(false);
    expect(value).toEqual(videoData);
  });

  it('closes stream on successful process exit', async () => {
    const { process: mockProc, stdout, stderr } = createMockProcess();
    mockSpawn.mockReturnValue(mockProc as any);

    const onProgress = vi.fn();
    const stream = manager.download('https://youtube.com/watch?v=abc123', '22', onProgress);
    const reader = stream.getReader();

    // Simulate some data then close
    stdout.emit('data', Buffer.from(new Uint8Array([1, 2, 3])));
    (mockProc as EventEmitter).emit('close', 0);

    const { value } = await reader.read();
    expect(value).toEqual(new Uint8Array([1, 2, 3]));

    const { done } = await reader.read();
    expect(done).toBe(true);
  });

  it('emits 100% progress on successful completion', async () => {
    const { process: mockProc, stdout, stderr } = createMockProcess();
    mockSpawn.mockReturnValue(mockProc as any);

    const onProgress = vi.fn();
    const stream = manager.download('https://youtube.com/watch?v=abc123', '22', onProgress);

    stderr.emit('data', Buffer.from('[download]  50.0% of ~50.00MiB at 2.50MiB/s ETA 00:10\n'));
    (mockProc as EventEmitter).emit('close', 0);

    expect(onProgress).toHaveBeenCalledWith(50);
    expect(onProgress).toHaveBeenCalledWith(100);
  });

  it('throws DownloadFailedError on non-zero exit code', async () => {
    const { process: mockProc, stdout, stderr } = createMockProcess();
    mockSpawn.mockReturnValue(mockProc as any);

    const onProgress = vi.fn();
    const stream = manager.download('https://youtube.com/watch?v=abc123', '22', onProgress);
    const reader = stream.getReader();

    (mockProc as EventEmitter).emit('close', 1);

    await expect(reader.read()).rejects.toThrow(DownloadFailedError);
  });

  it('throws DownloadTimeoutError after 30 seconds of no progress', async () => {
    const { process: mockProc, stdout, stderr } = createMockProcess();
    mockSpawn.mockReturnValue(mockProc as any);

    const onProgress = vi.fn();
    const stream = manager.download('https://youtube.com/watch?v=abc123', '22', onProgress);
    const reader = stream.getReader();

    // Advance time by 30 seconds
    vi.advanceTimersByTime(30_000);

    await expect(reader.read()).rejects.toThrow(DownloadTimeoutError);
    expect((mockProc as any).kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('resets timeout on progress updates', async () => {
    const { process: mockProc, stdout, stderr } = createMockProcess();
    mockSpawn.mockReturnValue(mockProc as any);

    const onProgress = vi.fn();
    const stream = manager.download('https://youtube.com/watch?v=abc123', '22', onProgress);
    const reader = stream.getReader();

    // Advance 20 seconds
    vi.advanceTimersByTime(20_000);

    // Emit progress (should reset timeout)
    stderr.emit('data', Buffer.from('[download]  50.0% of ~50.00MiB at 2.50MiB/s ETA 00:10\n'));

    // Advance another 20 seconds (total 40s from start, but only 20s since last progress)
    vi.advanceTimersByTime(20_000);

    // Should NOT have timed out yet
    expect((mockProc as any).kill).not.toHaveBeenCalled();

    // Advance another 10 seconds (30s since last progress)
    vi.advanceTimersByTime(10_000);

    // NOW it should timeout
    expect((mockProc as any).kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('resets timeout on stdout data', async () => {
    const { process: mockProc, stdout, stderr } = createMockProcess();
    mockSpawn.mockReturnValue(mockProc as any);

    const onProgress = vi.fn();
    const stream = manager.download('https://youtube.com/watch?v=abc123', '22', onProgress);

    // Advance 20 seconds
    vi.advanceTimersByTime(20_000);

    // Emit stdout data (should reset timeout)
    stdout.emit('data', Buffer.from(new Uint8Array([1, 2, 3])));

    // Advance another 25 seconds (only 25s since last data)
    vi.advanceTimersByTime(25_000);

    // Should NOT have timed out
    expect((mockProc as any).kill).not.toHaveBeenCalled();
  });

  it('handles spawn errors gracefully', async () => {
    const { process: mockProc, stdout, stderr } = createMockProcess();
    mockSpawn.mockReturnValue(mockProc as any);

    const onProgress = vi.fn();
    const stream = manager.download('https://youtube.com/watch?v=abc123', '22', onProgress);
    const reader = stream.getReader();

    (mockProc as EventEmitter).emit('error', new Error('ENOENT: yt-dlp not found'));

    await expect(reader.read()).rejects.toThrow(DownloadFailedError);
  });

  it('kills process on stream cancel', () => {
    const { process: mockProc, stdout, stderr } = createMockProcess();
    mockSpawn.mockReturnValue(mockProc as any);

    const onProgress = vi.fn();
    const stream = manager.download('https://youtube.com/watch?v=abc123', '22', onProgress);

    stream.cancel();

    expect((mockProc as any).kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('uses custom yt-dlp path when provided', () => {
    const customManager = new DownloadManager({ ytDlpPath: '/usr/local/bin/yt-dlp' });
    const { process: mockProc } = createMockProcess();
    mockSpawn.mockReturnValue(mockProc as any);

    const onProgress = vi.fn();
    customManager.download('https://youtube.com/watch?v=abc123', '22', onProgress);

    expect(mockSpawn).toHaveBeenCalledWith(
      '/usr/local/bin/yt-dlp',
      expect.any(Array),
      expect.any(Object)
    );
  });
});
