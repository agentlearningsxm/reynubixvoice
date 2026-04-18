import { describe, expect, it } from 'vitest';
import { buildGeminiLiveConfig } from '../../lib/voice/liveConfig.js';

describe('buildGeminiLiveConfig', () => {
  it('omits sessionResumption entirely on fresh sessions', () => {
    const config = buildGeminiLiveConfig('Stay helpful.');

    expect(config).not.toHaveProperty('sessionResumption');
    expect(config).not.toHaveProperty('contextWindowCompression');
    expect(config.speechConfig).toEqual({
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: 'Sulafat',
        },
      },
    });
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
