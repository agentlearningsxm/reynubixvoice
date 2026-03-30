import { describe, expect, it } from 'vitest';
import { buildGeminiLiveConfig } from '../../lib/voice/liveConfig.js';

describe('buildGeminiLiveConfig', () => {
  it('does not include the unsupported transparent resumption flag', () => {
    const config = buildGeminiLiveConfig('Stay helpful.');

    expect(config.sessionResumption).toEqual({});
    expect(config.sessionResumption).not.toHaveProperty('transparent');
    expect(config.inputAudioTranscription).toEqual({});
    expect(config.outputAudioTranscription).toEqual({});
  });

  it('preserves a session resumption handle without transparent mode', () => {
    const config = buildGeminiLiveConfig('Stay helpful.', {
      sessionResumptionHandle: 'auth_tokens/123',
    });

    expect(config.sessionResumption).toEqual({
      handle: 'auth_tokens/123',
    });
    expect(config.sessionResumption).not.toHaveProperty('transparent');
  });
});
