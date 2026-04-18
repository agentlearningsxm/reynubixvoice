import { describe, expect, it } from 'vitest';
import {
  extractModelAudioChunks,
  resolveAiTranscript,
} from '../../lib/voice/liveMessages.js';

describe('extractModelAudioChunks', () => {
  it('collects every inline audio chunk from a model turn', () => {
    const chunks = extractModelAudioChunks({
      serverContent: {
        modelTurn: {
          parts: [
            { text: 'ignored transcript text' },
            { inlineData: { data: 'audio-1', mimeType: 'audio/pcm' } },
            { inlineData: { data: 'audio-2', mimeType: 'audio/pcm' } },
          ],
          role: 'model',
        },
      },
    } as any);

    expect(chunks).toEqual(['audio-1', 'audio-2']);
  });

  it('returns an empty array when no audio parts are present', () => {
    const chunks = extractModelAudioChunks({
      serverContent: {
        modelTurn: {
          parts: [{ text: 'no audio here' }],
          role: 'model',
        },
      },
    } as any);

    expect(chunks).toEqual([]);
  });

  it('falls back to the sdk data getter when audio parts are flattened', () => {
    const chunks = extractModelAudioChunks({
      serverContent: {
        modelTurn: {
          parts: [],
          role: 'model',
        },
      },
      data: 'audio-combined',
    } as any);

    expect(chunks).toEqual(['audio-combined']);
  });
});

describe('resolveAiTranscript', () => {
  it('prefers output transcription when the server sends it', () => {
    const transcript = resolveAiTranscript({
      serverContent: {
        outputTranscription: {
          text: 'Hello there',
          finished: true,
        },
        modelTurn: {
          parts: [{ text: 'fallback text' }],
          role: 'model',
        },
      },
    } as any);

    expect(transcript).toEqual({
      text: 'Hello there',
      isFinal: true,
    });
  });

  it('falls back to model text parts when output transcription is absent', () => {
    const transcript = resolveAiTranscript({
      serverContent: {
        modelTurn: {
          parts: [{ text: 'Hello' }, { text: ' there' }],
          role: 'model',
        },
        turnComplete: true,
      },
    } as any);

    expect(transcript).toEqual({
      text: 'Hello there',
      isFinal: true,
    });
  });
});
