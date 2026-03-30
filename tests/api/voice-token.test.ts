import { describe, expect, it } from 'vitest';
import { buildVoiceAuthTokenConfig } from '../../api/voice/token.js';
import { GEMINI_LIVE_MODEL } from '../../lib/voice/models.js';

describe('buildVoiceAuthTokenConfig', () => {
  it('locks ephemeral tokens to the official Gemini Live model', () => {
    const expiresAt = '2026-03-28T19:00:00.000Z';
    const newSessionExpiresAt = '2026-03-28T18:31:00.000Z';

    expect(
      buildVoiceAuthTokenConfig(expiresAt, newSessionExpiresAt),
    ).toEqual({
      uses: 1,
      expireTime: expiresAt,
      newSessionExpireTime: newSessionExpiresAt,
      liveConnectConstraints: {
        model: GEMINI_LIVE_MODEL,
        config: {
          responseModalities: ['AUDIO'],
          sessionResumption: {},
        },
      },
    });
  });
});

