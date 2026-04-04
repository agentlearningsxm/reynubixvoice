import { afterEach, describe, expect, it, vi } from 'vitest';
import { SHEET_HEADERS } from '../../api/_lib/google-sheets.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('SHEET_HEADERS', () => {
  it('keeps the post-call export columns aligned and ordered', () => {
    expect(SHEET_HEADERS).toEqual([
      'Date',
      'Time',
      'Duration (s)',
      'Language',
      'Full Transcript',
      'AI Summary',
      'Sentiment',
      'Calculator Used',
      'Revenue Entered',
      'Missed Calls',
      'Booking Requested',
      'Error Log',
      'Recording URL',
      'Session ID',
      'Call Quality Score',
      'Errors Detected',
      'Prompt Fix Recommendations',
      'Failure Source',
      'Call Outcome',
    ]);
  });
});

describe('ensureSheetHeaders', () => {
  it('reports the post-call sync gate only when Google Sheets and Groq env vars exist', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_SHEET_ID = 'sheet-id';
    delete process.env.GROQ_API_KEY;

    const { hasPostCallSheetSyncConfig } = await import(
      '../../api/_lib/google-sheets.js'
    );

    expect(hasPostCallSheetSyncConfig()).toBe(false);

    process.env.GOOGLE_REFRESH_TOKEN = 'refresh-token';

    expect(hasPostCallSheetSyncConfig()).toBe(false);

    process.env.GROQ_API_KEY = 'groq-key';

    expect(hasPostCallSheetSyncConfig()).toBe(true);
  });

  it('skips rewriting headers when the sheet already matches exactly', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_REFRESH_TOKEN = 'refresh-token';
    process.env.GOOGLE_SHEET_ID = 'sheet-id';
    process.env.GOOGLE_SHEET_NAME = 'reyna web';

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'token', expires_in: 3600 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ values: [SHEET_HEADERS] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    const { ensureSheetHeaders } = await import(
      '../../api/_lib/google-sheets.js'
    );

    await ensureSheetHeaders();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toContain(
      '/values/reyna%20web!A1%3AS1',
    );
  });

  it('rewrites headers when the existing columns are out of order', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_REFRESH_TOKEN = 'refresh-token';
    process.env.GOOGLE_SHEET_ID = 'sheet-id';
    process.env.GOOGLE_SHEET_NAME = 'reyna web';

    const mismatchedHeaders = [...SHEET_HEADERS];
    [mismatchedHeaders[4], mismatchedHeaders[5]] = [
      mismatchedHeaders[5]!,
      mismatchedHeaders[4]!,
    ];

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'token', expires_in: 3600 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ values: [mismatchedHeaders] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ updatedRange: 'reyna web!A1:S1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    const { ensureSheetHeaders } = await import(
      '../../api/_lib/google-sheets.js'
    );

    await ensureSheetHeaders();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'PUT',
      headers: expect.objectContaining({
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      }),
    });
    expect(fetchMock.mock.calls[2]?.[1]?.body).toBe(
      JSON.stringify({ values: [SHEET_HEADERS] }),
    );
  });
});
