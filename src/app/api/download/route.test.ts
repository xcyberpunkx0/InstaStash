import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

const { mockSpawn, mockMkdtemp, mockReaddir, mockRm, mockStat, mockCreateReadStream } = vi.hoisted(() => {
  return {
    mockSpawn: vi.fn(),
    mockMkdtemp: vi.fn(),
    mockReaddir: vi.fn(),
    mockRm: vi.fn(),
    mockStat: vi.fn(),
    mockCreateReadStream: vi.fn(),
  };
});

vi.mock('child_process', () => {
  const m = { spawn: mockSpawn };
  return { ...m, default: m };
});

vi.mock('fs', () => {
  const m = { createReadStream: mockCreateReadStream };
  return { ...m, default: m };
});

vi.mock('fs/promises', () => {
  const m = {
    mkdtemp: mockMkdtemp,
    readdir: mockReaddir,
    rm: mockRm,
    stat: mockStat,
  };
  return { ...m, default: m };
});

class MockProcess extends EventEmitter {
  stdout: Readable;
  stderr: Readable;
  constructor() {
    super();
    this.stdout = new Readable({ read() {} });
    this.stderr = new Readable({ read() {} });
  }
  kill() {
    /* killed by route on failure/abort */
  }
}

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createInvalidRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not json',
  });
}

/** Configures the happy-path mocks: temp dir, produced file, read stream. */
function mockSuccessfulDownload(content = 'dummy file content', fileName = 'video.mp4') {
  const proc = new MockProcess();
  mockSpawn.mockReturnValue(proc as never);
  mockMkdtemp.mockResolvedValue('/tmp/vdl-test');
  mockReaddir.mockResolvedValue([fileName]);
  mockStat.mockResolvedValue({ size: content.length });
  mockRm.mockResolvedValue(undefined);
  mockCreateReadStream.mockImplementation(() => {
    const stream = Readable.from([Buffer.from(content)]);
    return stream;
  });
  setTimeout(() => proc.emit('close', 0), 10);
  return proc;
}

describe('POST /api/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 JSON error for invalid JSON body', async () => {
    const response = await POST(createInvalidRequest());

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toEqual({
      error: 'Invalid request body',
      code: 'INVALID_REQUEST',
    });
  });

  it('returns 400 JSON error when url is missing', async () => {
    const response = await POST(createRequest({ url: '', formatId: 'best' }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toEqual({
      error: 'Both url and formatId are required',
      code: 'INVALID_REQUEST',
    });
  });

  it('returns 400 JSON error when formatId is missing', async () => {
    const response = await POST(
      createRequest({ url: 'https://instagram.com/reel/abc', formatId: '' }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toEqual({
      error: 'Both url and formatId are required',
      code: 'INVALID_REQUEST',
    });
  });

  it('returns 400 JSON error for non-Instagram URLs', async () => {
    const response = await POST(
      createRequest({ url: 'https://example.com/video/123', formatId: 'best' }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toEqual({
      error: 'Only Instagram post/reel URLs are supported',
      code: 'INVALID_REQUEST',
    });
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('returns video/mp4 with Content-Disposition on success', async () => {
    mockSuccessfulDownload();

    const response = await POST(
      createRequest({ url: 'https://instagram.com/reel/abc123/', formatId: 'best' }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('video/mp4');
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="abc123.mp4"');
    expect(response.headers.get('Content-Length')).toBe('18'); // 'dummy file content'.length
  });

  it('returns binary file data on success', async () => {
    mockSuccessfulDownload();

    const response = await POST(
      createRequest({ url: 'https://instagram.com/reel/test123/', formatId: 'best' }),
    );

    expect(response.status).toBe(200);
    const body = await response.arrayBuffer();
    expect(Buffer.from(body).toString()).toBe('dummy file content');
  });

  it('derives filename extension from the produced file', async () => {
    mockSuccessfulDownload('webm-bytes', 'video.webm');

    const response = await POST(
      createRequest({ url: 'https://instagram.com/reel/abc123/', formatId: 'best' }),
    );

    expect(response.headers.get('Content-Type')).toBe('video/webm');
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="abc123.webm"');
  });

  it('returns 502 JSON error with the yt-dlp ERROR line on failure', async () => {
    const proc = new MockProcess();
    mockSpawn.mockReturnValue(proc as never);
    mockMkdtemp.mockResolvedValue('/tmp/vdl-test');
    mockRm.mockResolvedValue(undefined);

    setTimeout(() => {
      proc.stderr.emit('data', Buffer.from('ERROR: [instagram] something went wrong\n'));
      proc.emit('close', 1);
    }, 10);

    const response = await POST(
      createRequest({ url: 'https://instagram.com/reel/fail/', formatId: 'best' }),
    );

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.code).toBe('DOWNLOAD_FAILED');
    expect(json.error).toContain('something went wrong');
  });

  it('maps login-required failures to 429 with a friendly message', async () => {
    const proc = new MockProcess();
    mockSpawn.mockReturnValue(proc as never);
    mockMkdtemp.mockResolvedValue('/tmp/vdl-test');
    mockRm.mockResolvedValue(undefined);

    setTimeout(() => {
      proc.stderr.emit(
        'data',
        Buffer.from('ERROR: [instagram] abc: login required (use --cookies)\n'),
      );
      proc.emit('close', 1);
    }, 10);

    const response = await POST(
      createRequest({ url: 'https://instagram.com/reel/blocked/', formatId: 'best' }),
    );

    expect(response.status).toBe(429);
    const json = await response.json();
    expect(json.error).toMatch(/blocking anonymous access/);
  });

  it('returns a clear error when yt-dlp exits 0 without producing a file', async () => {
    const proc = new MockProcess();
    mockSpawn.mockReturnValue(proc as never);
    mockMkdtemp.mockResolvedValue('/tmp/vdl-test');
    mockReaddir.mockResolvedValue([]);
    mockRm.mockResolvedValue(undefined);

    setTimeout(() => proc.emit('close', 0), 10);

    const response = await POST(
      createRequest({ url: 'https://instagram.com/reel/empty/', formatId: 'best' }),
    );

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.error).toMatch(/no file was produced/);
  });

  it('passes the normalized url and a fallback format selector to yt-dlp', async () => {
    mockSuccessfulDownload();

    await POST(createRequest({ url: 'https://instagram.com/reel/test/', formatId: 'best' }));

    expect(mockSpawn).toHaveBeenCalledWith(
      'yt-dlp',
      expect.arrayContaining(['-f', 'b/bestvideo*+bestaudio/best']),
      expect.any(Object),
    );
    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args[args.length - 1]).toContain('instagram.com/reel/test');
  });

  it('tries the requested format id first when it looks like a yt-dlp id', async () => {
    mockSuccessfulDownload();

    await POST(
      createRequest({
        url: 'https://instagram.com/reel/test/',
        formatId: 'dash-1270852721231081v',
      }),
    );

    expect(mockSpawn).toHaveBeenCalledWith(
      'yt-dlp',
      expect.arrayContaining([
        '-f',
        'dash-1270852721231081v+bestaudio/dash-1270852721231081v/b/bestvideo*+bestaudio/best',
      ]),
      expect.any(Object),
    );
  });

  it('cleans up the temp dir on failure', async () => {
    const proc = new MockProcess();
    mockSpawn.mockReturnValue(proc as never);
    mockMkdtemp.mockResolvedValue('/tmp/vdl-test');
    mockRm.mockResolvedValue(undefined);

    setTimeout(() => proc.emit('close', 1), 10);

    await POST(createRequest({ url: 'https://instagram.com/reel/fail/', formatId: 'best' }));

    expect(mockRm).toHaveBeenCalledWith('/tmp/vdl-test', { recursive: true, force: true });
  });
});
