import { describe, expect, it } from 'vitest';
import {
  buildResumeContextNote,
  buildResumeTurns,
  compactTranscript,
  inferGreetingDelivered,
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

  it('detects when Reyna already introduced herself', () => {
    expect(
      inferGreetingDelivered([
        { speaker: 'ai', text: "Hi, I'm Reyna from ReynubixVoice." },
      ]),
    ).toBe(true);
  });

  it('builds reconnect restore turns with recent context and resume note', () => {
    const turns = buildResumeTurns(
      [
        { speaker: 'human', text: 'We lose around four calls a day.' },
        {
          speaker: 'ai',
          text: 'Understood. What is a typical job worth for you?',
        },
      ],
      {
        greetingDelivered: true,
        lastToolCallName: 'show_calculator',
      },
    );

    expect(turns).toHaveLength(3);
    expect(turns[0]).toMatchObject({
      role: 'user',
      parts: [{ text: 'We lose around four calls a day.' }],
    });
    expect(turns[1]).toMatchObject({
      role: 'model',
      parts: [{ text: 'Understood. What is a typical job worth for you?' }],
    });
    expect(turns[2].parts[0].text).toContain('same ongoing Reyna call');
    expect(turns[2].parts[0].text).toContain('show_calculator');
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
