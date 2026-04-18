import type { LiveServerMessage } from '@google/genai';

export function extractModelAudioChunks(message: LiveServerMessage): string[] {
  const parts = message.serverContent?.modelTurn?.parts ?? [];
  const audioChunks: string[] = [];

  for (const part of parts) {
    const data = part.inlineData?.data;
    if (typeof data === 'string' && data.length > 0) {
      audioChunks.push(data);
    }
  }

  if (audioChunks.length > 0) {
    return audioChunks;
  }

  return typeof message.data === 'string' && message.data.length > 0
    ? [message.data]
    : [];
}

export function resolveAiTranscript(
  message: LiveServerMessage,
): { text: string; isFinal: boolean } | null {
  const outputTranscription = message.serverContent?.outputTranscription;
  if (
    typeof outputTranscription?.text === 'string' &&
    outputTranscription.text.length > 0
  ) {
    return {
      text: outputTranscription.text,
      isFinal: !!outputTranscription.finished,
    };
  }

  const textParts =
    message.serverContent?.modelTurn?.parts?.flatMap((part) => {
      return typeof part.text === 'string' && part.text.trim().length > 0
        ? [part.text]
        : [];
    }) ?? [];

  if (textParts.length > 0) {
    return {
      text: textParts.join(''),
      isFinal: !!message.serverContent?.turnComplete,
    };
  }

  if (typeof message.text === 'string' && message.text.trim().length > 0) {
    return {
      text: message.text,
      isFinal: !!message.serverContent?.turnComplete,
    };
  }

  return null;
}
