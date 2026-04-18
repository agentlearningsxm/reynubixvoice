import { afterEach, describe, expect, it } from 'vitest';
import { resolveGeminiApiKey } from '../../api/_lib/gemini.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('resolveGeminiApiKey', () => {
  it('throws when only the public browser Gemini key is configured', () => {
    delete process.env.GEMINI_API_KEY;
    process.env.VITE_GEMINI_API_KEY = 'public-browser-key';

    expect(() => resolveGeminiApiKey()).toThrow(
      'Gemini API key is not configured.',
    );
  });

  it('returns the server-side Gemini key when present', () => {
    process.env.GEMINI_API_KEY = 'server-key';
    process.env.VITE_GEMINI_API_KEY = 'public-browser-key';

    expect(resolveGeminiApiKey()).toBe('server-key');
  });
});
