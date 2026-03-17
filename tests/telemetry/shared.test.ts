import { describe, expect, it } from 'vitest';
import {
  type ContactSubmitPayload,
  createPublicId,
  guessFileExtension,
  parseDataUrl,
  readUtmParams,
  sanitizeEventName,
} from '../../lib/telemetry/shared';

describe('telemetry shared helpers', () => {
  it('creates prefixed public ids', () => {
    const id = createPublicId('voice');
    expect(id.startsWith('voice_')).toBe(true);
  });

  it('sanitizes event names', () => {
    expect(sanitizeEventName(' CTA Click / Hero ')).toBe('cta_click_hero');
  });

  it('extracts utm params from url', () => {
    const url = new URL(
      'https://reynubixvoice.com/?utm_source=google&utm_campaign=spring',
    );
    expect(readUtmParams(url)).toEqual({
      utm_source: 'google',
      utm_campaign: 'spring',
    });
  });

  it('parses audio data urls', () => {
    const parsed = parseDataUrl('data:audio/webm;base64,Zm9v');
    expect(parsed.mimeType).toBe('audio/webm');
    expect(parsed.base64).toBe('Zm9v');
  });

  it('guesses file extensions from mime types', () => {
    expect(guessFileExtension('audio/webm;codecs=opus')).toBe('webm');
    expect(guessFileExtension('audio/ogg')).toBe('ogg');
    expect(guessFileExtension('audio/mp4')).toBe('m4a');
  });

  it('ContactSubmitPayload includes phone field', () => {
    const payload: ContactSubmitPayload = {
      context: {},
      name: 'Test User',
      email: 'test@example.com',
      phone: '+31612345678',
      message: 'Hello',
    };
    expect(payload.phone).toBe('+31612345678');
  });
});
