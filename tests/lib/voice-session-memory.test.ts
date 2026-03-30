import { describe, expect, it } from 'vitest';
import {
  buildResumeContextNote,
  compactTranscript,
  toTranscriptTurnPayload,
} from '../../lib/voice/sessionMemory.js';

describe('voice session memory helpers', () => {
  it('builds a resume note that preserves context without re-greeting', () => {
    const note = buildResumeContextNote(
      [
        { speaker: 'human', text: 'We miss around four calls a day.' },
        {
          speaker: 'ai',
          text: 'Got it. And what is a typical job worth for you?',
          isFinal: true,
        },
      ],
      {
        greetingDelivered: true,
        lastToolCallName: 'show_calculator',
      },
    );

    expect(note).toContain('same ongoing Reyna call');
    expect(note).toContain('do not introduce yourself again');
    expect(note).toContain('show_calculator');
    expect(note).toContain('Visitor: We miss around four calls a day.');
  });

  it('compacts transcript entries and keeps only meaningful recent turns', () => {
    const compacted = compactTranscript([
      { speaker: 'human', text: '   ' },
      { speaker: 'human', text: 'First turn' },
      { speaker: 'ai', text: 'Second turn', isFinal: false },
    ]);

    expect(compacted).toEqual([
      { speaker: 'human', text: 'First turn', isFinal: true },
      { speaker: 'ai', text: 'Second turn', isFinal: false },
    ]);
  });

  it('maps transcript entries into stable sync payloads', () => {
    const payload = toTranscriptTurnPayload([
      { speaker: 'human', text: 'Five hundred per job', isFinal: true },
      { speaker: 'ai', text: 'Let me pull up the calculator.', isFinal: true },
    ]);

    expect(payload).toHaveLength(2);
    expect(payload[0]).toMatchObject({
      turnIndex: 0,
      speaker: 'human',
      text: 'Five hundred per job',
      isFinal: true,
    });
    expect(payload[1]).toMatchObject({
      turnIndex: 1,
      speaker: 'ai',
      text: 'Let me pull up the calculator.',
      isFinal: true,
    });
  });
});
