import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GEMINI_LIVE_MODEL } from '../../lib/voice/models.js';

const authTokenCreateMock = vi.fn();
const readJsonBodyMock = vi.fn();
const rejectMethodMock = vi.fn();
const recordEventMock = vi.fn();
const updateVoiceSessionMock = vi.fn();

vi.mock('../../api/_lib/gemini.js', () => ({
  getGeminiLiveAdminClient: () => ({
    authTokens: {
      create: authTokenCreateMock,
    },
  }),
}));

vi.mock('../../api/_lib/http.js', () => ({
  readJsonBody: readJsonBodyMock,
  rejectMethod: rejectMethodMock,
}));

vi.mock('../../api/_lib/telemetry.js', () => ({
  recordEvent: recordEventMock,
  updateVoiceSession: updateVoiceSessionMock,
}));

describe('voice token handler', () => {
  beforeEach(() => {
    rejectMethodMock.mockReturnValue(false);
    authTokenCreateMock.mockResolvedValue({ name: 'auth_tokens/test-token' });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('returns a token even if telemetry persistence fails for a real session id', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T12:00:00.000Z'));
    readJsonBodyMock.mockReturnValue({
      voiceSessionId: 'vs_real_session_123',
    });
    updateVoiceSessionMock.mockResolvedValue(undefined);
    recordEventMock.mockRejectedValue({
      code: 'PGRST116',
      message: 'Cannot coerce the result to a single JSON object',
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { default: handler } = await import('../../api/voice/token.js');
    const req = {} as never;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await handler(req, res as never);

    expect(authTokenCreateMock).toHaveBeenCalledOnce();
    expect(authTokenCreateMock).toHaveBeenCalledWith({
      config: {
        uses: 1,
        expireTime: '2026-03-30T12:30:00.000Z',
        newSessionExpireTime: '2026-03-30T12:01:00.000Z',
        liveConnectConstraints: {
          model: GEMINI_LIVE_MODEL,
          config: {
            responseModalities: ['AUDIO'],
            sessionResumption: {},
          },
        },
      },
    });
    expect(updateVoiceSessionMock).toHaveBeenCalledOnce();
    expect(recordEventMock).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(
      '[voice-token] Token issued but telemetry persistence failed:',
      expect.objectContaining({ code: 'PGRST116' }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      token: 'auth_tokens/test-token',
      expiresAt: '2026-03-30T12:30:00.000Z',
      newSessionExpiresAt: '2026-03-30T12:01:00.000Z',
    });
  });

  it('skips telemetry persistence for mock session ids', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T12:00:00.000Z'));
    readJsonBodyMock.mockReturnValue({
      voiceSessionId: 'vs_mock_123',
    });

    const { default: handler } = await import('../../api/voice/token.js');
    const req = {} as never;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await handler(req, res as never);

    expect(authTokenCreateMock).toHaveBeenCalledOnce();
    expect(authTokenCreateMock).toHaveBeenCalledWith({
      config: {
        uses: 1,
        expireTime: '2026-03-30T12:30:00.000Z',
        newSessionExpireTime: '2026-03-30T12:01:00.000Z',
        liveConnectConstraints: {
          model: GEMINI_LIVE_MODEL,
          config: {
            responseModalities: ['AUDIO'],
            sessionResumption: {},
          },
        },
      },
    });
    expect(updateVoiceSessionMock).not.toHaveBeenCalled();
    expect(recordEventMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
