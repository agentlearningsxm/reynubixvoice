import { type Blob, GoogleGenAI, type LiveServerMessage } from '@google/genai';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SILENCE_MODES,
  SYSTEM_INSTRUCTION,
} from '../components/AgentPrompt.v4';
import {
  endVoiceSession,
  issueVoiceToken,
  recordVoiceToolCall,
  startVoiceSession,
  syncVoiceTranscript,
  uploadVoiceAudio,
} from '../lib/telemetry/voice';
import {
  buildGeminiLiveConfig,
  buildReconnectRestoreTurns,
} from '../lib/voice/liveConfig';
import {
  extractModelAudioChunks,
  resolveAiTranscript,
} from '../lib/voice/liveMessages';
import {
  GEMINI_LIVE_API_VERSION,
  GEMINI_LIVE_MODEL,
} from '../lib/voice/models';
import {
  buildResumeContextNote,
  compactTranscript,
  createPendingSessionBackup,
  inferGreetingDelivered,
  type TranscriptLike,
  toTranscriptTurnPayload,
  VOICE_SESSION_BACKUP_KEY,
  VOICE_SESSION_BACKUP_MAX_AGE_MS,
  type VoiceSessionBackup,
} from '../lib/voice/sessionMemory';

// ─── Resilience Constants ───────────────────────────────────────────
const MAX_RECONNECT_ATTEMPTS = 8;
const RECONNECT_BASE_DELAY_MS = 2000;
const CONNECTION_TIMEOUT_MS = 15000;

// ─── Transcript types ───────────────────────────────────────────────
export interface TranscriptEntry {
  speaker: 'ai' | 'human';
  text: string;
  id: number;
  isFinal?: boolean;
}

function normalizeLiveSessionBackup(parsed: any): VoiceSessionBackup | null {
  const updatedAt = parsed?.updatedAt ?? parsed?.lastUpdatedAt;
  if (!updatedAt || Date.now() - updatedAt > VOICE_SESSION_BACKUP_MAX_AGE_MS) {
    return null;
  }

  const transcript = compactTranscript(
    Array.isArray(parsed?.transcript)
      ? (parsed.transcript as TranscriptLike[])
      : [],
  );

  return {
    voiceSessionId: parsed?.voiceSessionId ?? null,
    sessionResumptionHandle:
      parsed?.sessionResumptionHandle ?? parsed?.resumptionHandle ?? null,
    transcript,
    updatedAt,
    sessionStartedAt:
      parsed?.sessionStartedAt ?? parsed?.startedAt ?? Date.now(),
    greetingDelivered:
      parsed?.greetingDelivered ?? inferGreetingDelivered(transcript),
    lastToolCallName: parsed?.lastToolCallName ?? null,
  };
}

function readLiveSessionBackup(): VoiceSessionBackup | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(VOICE_SESSION_BACKUP_KEY);
    if (!raw) {
      return null;
    }

    const parsed = normalizeLiveSessionBackup(JSON.parse(raw));
    if (!parsed) {
      window.sessionStorage.removeItem(VOICE_SESSION_BACKUP_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeLiveSessionBackup(backup: VoiceSessionBackup | null) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (!backup) {
      window.sessionStorage.removeItem(VOICE_SESSION_BACKUP_KEY);
      return;
    }

    window.sessionStorage.setItem(
      VOICE_SESSION_BACKUP_KEY,
      JSON.stringify(backup),
    );
  } catch {
    // Ignore storage quota or serialization issues.
  }
}

function parseGoAwayTimeLeftMs(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, value);
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const secondsMatch = value.match(/^([0-9]+(?:\.[0-9]+)?)s$/);
  if (secondsMatch) {
    return Math.max(0, Number(secondsMatch[1]) * 1000);
  }

  const millisMatch = value.match(/^([0-9]+(?:\.[0-9]+)?)ms$/);
  if (millisMatch) {
    return Math.max(0, Number(millisMatch[1]));
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

// ─── Hook ───────────────────────────────────────────────────────────
export function useGeminiLive() {
  // Connection State
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, _setTranscript] = useState<TranscriptEntry[]>([]);

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);

  // Volume detection ref
  const userSpeakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Playback Queue
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Session Refs
  const sessionRef = useRef<any>(null);
  const resolvedSessionRef = useRef<any>(null);
  const sessionResumptionHandleRef = useRef<string | null>(null);
  const restoreContextOnConnectRef = useRef(false);
  const lastSyncedTranscriptHashRef = useRef('');

  // Resilience Refs
  const intentionalDisconnectRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const goAwayReconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Telemetry Refs
  const voiceSessionIdRef = useRef<string | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const transcriptRef = useRef<TranscriptEntry[]>([]);

  // Anti-loop: track greeting delivery and tool call state
  const greetingDeliveredRef = useRef(false);
  const toolCallCountRef = useRef(0);
  const lastToolCallNameRef = useRef<string | null>(null);

  // Recording Refs (mix mic + AI into one WebM for Google Sheets)
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const micSourceForMixRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Connect ref (breaks circular dependency between reconnect and connectToGemini)
  const connectToGeminiRef = useRef<
    ((isReconnect?: boolean) => Promise<void>) | null
  >(null);

  const syncSessionBackup = useCallback(
    (nextTranscript: TranscriptEntry[] = transcriptRef.current) => {
      const hasRecoverableState =
        !!voiceSessionIdRef.current ||
        !!sessionResumptionHandleRef.current ||
        nextTranscript.length > 0;

      if (!hasRecoverableState) {
        writeLiveSessionBackup(null);
        return;
      }

      writeLiveSessionBackup({
        voiceSessionId: voiceSessionIdRef.current,
        sessionResumptionHandle: sessionResumptionHandleRef.current,
        transcript: compactTranscript(nextTranscript),
        updatedAt: Date.now(),
        sessionStartedAt: sessionStartTimeRef.current || Date.now(),
        greetingDelivered: greetingDeliveredRef.current,
        lastToolCallName: lastToolCallNameRef.current,
      });
    },
    [],
  );

  const clearSessionBackup = useCallback(() => {
    writeLiveSessionBackup(null);
  }, []);

  // Wrap setTranscript to keep ref in sync (avoids stale closure in disconnect)
  const setTranscript: typeof _setTranscript = useCallback(
    (action) => {
      _setTranscript((prev) => {
        const next = typeof action === 'function' ? action(prev) : action;
        transcriptRef.current = next;
        syncSessionBackup(next);
        return next;
      });
    },
    [syncSessionBackup],
  );

  // ─── AudioContext Resume on Tab Switch ────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (
          audioContextRef.current &&
          audioContextRef.current.state === 'suspended'
        ) {
          audioContextRef.current.resume().catch(() => {});
        }
        if (
          outputAudioContextRef.current &&
          outputAudioContextRef.current.state === 'suspended'
        ) {
          outputAudioContextRef.current.resume().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const backup = readLiveSessionBackup();
    if (!backup) {
      return;
    }

    if (backup.voiceSessionId) {
      voiceSessionIdRef.current = backup.voiceSessionId;
    }
    if (backup.sessionStartedAt) {
      sessionStartTimeRef.current = backup.sessionStartedAt;
    }
    if (backup.sessionResumptionHandle) {
      sessionResumptionHandleRef.current = backup.sessionResumptionHandle;
    }
    greetingDeliveredRef.current = backup.greetingDelivered;
    lastToolCallNameRef.current = backup.lastToolCallName;
    if (backup.transcript.length > 0) {
      const restoredTranscript = backup.transcript.map((entry, index) => ({
        speaker: entry.speaker,
        text: entry.text,
        isFinal: entry.isFinal,
        id: Date.now() + index,
      }));
      transcriptRef.current = restoredTranscript;
      _setTranscript(restoredTranscript);
    }
  }, []);

  useEffect(() => {
    const sessionId = voiceSessionIdRef.current;
    if (!sessionId || sessionId.startsWith('vs_mock_')) {
      return;
    }

    const finalizedTurns = toTranscriptTurnPayload(
      transcript.filter(
        (entry) => entry.isFinal && entry.text.trim().length > 0,
      ),
    );

    if (finalizedTurns.length === 0) {
      return;
    }

    const transcriptHash = finalizedTurns
      .map((turn) => `${turn.turnIndex}:${turn.speaker}:${turn.text}`)
      .join('|');
    if (transcriptHash === lastSyncedTranscriptHashRef.current) {
      return;
    }

    lastSyncedTranscriptHashRef.current = transcriptHash;
    syncVoiceTranscript(sessionId, finalizedTurns).catch(() => {
      lastSyncedTranscriptHashRef.current = '';
    });
  }, [transcript]);

  // ─── Audio Helpers ──────────────────────────────────────────────
  const downsampleTo16k = (
    input: Float32Array,
    inputRate: number,
  ): Float32Array => {
    if (inputRate === 16000) return input;
    const ratio = inputRate / 16000;
    const newLength = Math.floor(input.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      result[i] = input[Math.floor(i * ratio)];
    }
    return result;
  };

  const calculateRMS = (buffer: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  };

  const createBlob = (data: Float32Array): Blob => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      const val = Math.max(-1, Math.min(1, data[i]));
      int16[i] = val * 32767;
    }
    const uint8 = new Uint8Array(int16.buffer);
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const b64 = btoa(binary);
    return {
      data: b64,
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const decodeAudioData = async (
    b64: string,
    ctx: AudioContext,
  ): Promise<AudioBuffer> => {
    const binaryString = atob(b64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  // ─── Tool Handlers ────────────────────────────────────────────
  // Returns enriched result with context anchor to prevent Gemini
  // from losing conversation state after tool responses.
  const handleToolCall = (fc: any): Record<string, unknown> => {
    toolCallCountRef.current += 1;
    lastToolCallNameRef.current = fc.name;
    syncSessionBackup();
    let status = 'ok';

    switch (fc.name) {
      case 'show_calculator': {
        window.dispatchEvent(new CustomEvent('showCalculator'));
        status = 'calculator_shown';
        break;
      }

      case 'update_calculator': {
        const { revenue, missedCalls } = fc.args as any;
        window.dispatchEvent(
          new CustomEvent('updateCalculator', {
            detail: { revenue, missedCalls },
          }),
        );
        status = 'updated_calculator';
        break;
      }

      case 'open_cal_popup': {
        // Cal.com is loaded globally by Navbar.tsx
        const calApi = (window as any).Cal;
        if (calApi?.ns?.['let-s-talk']) {
          calApi.ns['let-s-talk']('openModal');
          status = 'cal_popup_opened';
        } else {
          // Fallback: click the first cal.com button
          const calBtn = document.querySelector(
            '[data-cal-link]',
          ) as HTMLElement;
          if (calBtn) {
            calBtn.click();
            status = 'cal_button_clicked';
          } else {
            status = 'cal_not_available';
          }
        }
        break;
      }

      default:
        status = `unknown_tool_${fc.name}`;
    }

    // Enrich response with context anchor -prevents the model from
    // resetting its conversation state and re-greeting after tool calls.
    return {
      status,
      context:
        'IMPORTANT: The tool executed successfully. You are mid-conversation. Your greeting was already delivered. Continue naturally from where you left off. Do NOT re-introduce yourself.',
    };
  };

  // ─── Cleanup Audio (without clearing transcript) ───────────────
  const cleanupAudio = useCallback(() => {
    if (micSourceForMixRef.current) {
      micSourceForMixRef.current.disconnect();
      micSourceForMixRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  // ─── Close Session ─────────────────────────────────────────────
  const closeSession = useCallback(() => {
    resolvedSessionRef.current = null;
    if (sessionRef.current) {
      sessionRef.current
        .then((session: any) => session.close())
        .catch(() => {});
      sessionRef.current = null;
    }
  }, []);

  // ─── Disconnect (user-initiated full teardown) ─────────────────
  const disconnect = useCallback(() => {
    // Guard: prevent double-disconnect (e.g. rapid button clicks)
    if (!voiceSessionIdRef.current && !connected && !isConnecting) return;

    intentionalDisconnectRef.current = true;
    reconnectAttemptsRef.current = 0;

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (goAwayReconnectTimeoutRef.current) {
      clearTimeout(goAwayReconnectTimeoutRef.current);
      goAwayReconnectTimeoutRef.current = null;
    }

    // Capture state before cleanup
    const sessionId = voiceSessionIdRef.current;
    const currentTranscript = transcriptRef.current;
    const startTime = sessionStartTimeRef.current;
    const recorder = recorderRef.current;
    const chunks = recordingChunksRef.current;

    // Helper: fire endVoiceSession (triggers sheet sync)
    const fireEndSession = () => {
      if (!sessionId || sessionId.startsWith('vs_mock_')) return;
      const transcriptText = currentTranscript
        .map((t) => `${t.speaker}: ${t.text}`)
        .join('\n')
        .slice(0, 50000);
      const durationMs = startTime ? Date.now() - startTime : undefined;
      endVoiceSession({
        voiceSessionId: sessionId,
        status: 'completed',
        durationMs,
        transcriptText: transcriptText || undefined,
      }).catch(() => {});
    };

    // Upload recording BEFORE ending session so sheet sync finds the audio.
    // Helper: upload accumulated chunks, then fire session-end.
    // NOTE: cleanupAudio() is called synchronously OUTSIDE this helper
    // to prevent it from running after refs are reassigned by a new session.
    const uploadAndEnd = async () => {
      const audioBlob = new window.Blob(chunks, { type: 'audio/webm' });

      if (
        sessionId &&
        !sessionId.startsWith('vs_mock_') &&
        audioBlob.size > 0
      ) {
        const upload = uploadVoiceAudio(
          sessionId,
          'recording',
          audioBlob,
        ).catch(() => {});
        // Cap wait at 15s -prevents dangling sessions on slow networks
        await Promise.race([
          upload,
          new Promise<void>((r) =>
            setTimeout(() => {
              r();
            }, 15_000),
          ),
        ]);
      }

      fireEndSession();
    };

    if (recorder && recorder.state !== 'inactive') {
      // Recorder is still running -stop it and upload in the onstop callback
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = () => {
        uploadAndEnd();
      };
      recorder.stop();
    } else {
      // Recorder already stopped (auto-stop when audio tracks ended)
      // chunks were already collected via ondataavailable during the session.
      // Upload them directly instead of skipping.
      uploadAndEnd();
    }

    // Clean up audio resources synchronously -safe because recorder.stop()
    // already captured all data, and uploadAndEnd uses only captured locals.
    closeSession();
    cleanupAudio();

    // Clear refs
    sessionResumptionHandleRef.current = null;
    voiceSessionIdRef.current = null;
    sessionStartTimeRef.current = 0;
    recorderRef.current = null;
    recordingChunksRef.current = [];
    restoreContextOnConnectRef.current = false;
    clearSessionBackup();

    setConnected(false);
    setIsConnecting(false);
    setIsReconnecting(false);
    setIsAgentSpeaking(false);
    setIsUserSpeaking(false);
    setTranscript([]);
  }, [
    clearSessionBackup,
    closeSession,
    cleanupAudio,
    connected,
    isConnecting,
    setTranscript,
  ]);

  // ─── Reconnect (automatic recovery) ────────────────────────────
  const reconnect = useCallback(
    (countAttempt = true) => {
      if (intentionalDisconnectRef.current) return;
      if (reconnectTimeoutRef.current) return;

      if (countAttempt) {
        reconnectAttemptsRef.current += 1;
      }
      const attempt = Math.max(reconnectAttemptsRef.current, 1);

      if (countAttempt && attempt > MAX_RECONNECT_ATTEMPTS) {
        closeSession();
        cleanupAudio();
        setConnected(false);
        setIsConnecting(false);
        setIsReconnecting(false);
        setIsAgentSpeaking(false);
        setError(
          'The live connection is still trying to recover. Your session memory is preserved, and the call will continue if the connection returns.',
        );
        return;
      }

      // Tear down current connection but keep transcript
      if (goAwayReconnectTimeoutRef.current) {
        clearTimeout(goAwayReconnectTimeoutRef.current);
        goAwayReconnectTimeoutRef.current = null;
      }
      closeSession();
      cleanupAudio();
      setConnected(false);
      setIsAgentSpeaking(false);
      setIsReconnecting(true);

      const delay = RECONNECT_BASE_DELAY_MS * attempt;
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        if (!intentionalDisconnectRef.current) {
          // connectToGemini is called directly -it's hoisted
          void connectToGeminiRef.current?.(true);
        }
      }, delay);
    },
    [closeSession, cleanupAudio],
  );

// ─── Connect ──────────────────────────────────────────────────
const connectToGemini = async (isReconnect = false) => {
  connectToGeminiRef.current = connectToGemini;
  try {
    const persistedBackup = readLiveSessionBackup();
    // Check for recoverable session: either explicit IDs or a pending backup
    // with sessionStartedAt (created before first connection attempt).
    const hasRecoverableSession =
      !!voiceSessionIdRef.current ||
      !!persistedBackup?.voiceSessionId ||
      !!sessionResumptionHandleRef.current ||
      !!persistedBackup?.sessionResumptionHandle ||
      !!persistedBackup?.sessionStartedAt;
    const shouldResumeSession = isReconnect || hasRecoverableSession;

    if (!shouldResumeSession) {
      intentionalDisconnectRef.current = false;
      reconnectAttemptsRef.current = 0;
      setError(null);
      setTranscript([]);
      
      // Create pending backup immediately for graceful failure recovery.
      // This ensures we have a sessionStartedAt even if connection fails.
      const pendingBackup = createPendingSessionBackup();
      sessionStartTimeRef.current = pendingBackup.sessionStartedAt;
    } else {
      setError(null);
      // Restore sessionStartTime from pending backup if not already set.
      if (!sessionStartTimeRef.current && persistedBackup?.sessionStartedAt) {
        sessionStartTimeRef.current = persistedBackup.sessionStartedAt;
      }
    }

    setIsConnecting(true);

      // Connection timeout -if onopen doesn't fire in time, retry
      connectionTimeoutRef.current = setTimeout(() => {
        closeSession();
        cleanupAudio();
        setIsConnecting(false);
        reconnect();
      }, CONNECTION_TIMEOUT_MS);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioContextRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const inputSampleRate = audioContextRef.current.sampleRate;

      outputAudioContextRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )({ sampleRate: 24000 });
      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(outputAudioContextRef.current.destination);

      // Build dynamic system instruction with silence mode
      const silenceMode =
        localStorage.getItem('reyna-silence-mode') || 'checkin';
      const silenceContext =
        SILENCE_MODES[silenceMode as keyof typeof SILENCE_MODES] ||
        SILENCE_MODES.checkin;
      const fullInstruction = `${SYSTEM_INSTRUCTION}\n\n${silenceContext}`;
      const resumptionHandle =
        sessionResumptionHandleRef.current ??
        persistedBackup?.sessionResumptionHandle ??
        null;
let activeVoiceSessionId =
      voiceSessionIdRef.current ?? persistedBackup?.voiceSessionId ?? null;
    if (!activeVoiceSessionId) {
      // Preserve sessionStartTime from pending backup (set earlier in connectToGemini).
      // Only set to Date.now() if somehow not already set.
      if (!sessionStartTimeRef.current) {
        sessionStartTimeRef.current = Date.now();
      }
      const session = await startVoiceSession(
        {
          accepted: true,
          acceptedAt: new Date().toISOString(),
          version: '1.0',
        },
        { allowMockFallback: true },
      );
      activeVoiceSessionId = session.voiceSessionId;
      voiceSessionIdRef.current = activeVoiceSessionId;
      syncSessionBackup();
    }
    if (!sessionStartTimeRef.current) {
      sessionStartTimeRef.current =
        persistedBackup?.sessionStartedAt ?? Date.now();
    }

      const issuedToken = await issueVoiceToken(activeVoiceSessionId);
      const authKey = issuedToken.token;

      const ai = new GoogleGenAI({
        apiKey: authKey,
        httpOptions: { apiVersion: GEMINI_LIVE_API_VERSION },
      });

      restoreContextOnConnectRef.current =
        shouldResumeSession &&
        !resumptionHandle &&
        transcriptRef.current.length > 0;

      const sessionPromise = ai.live.connect({
        model: GEMINI_LIVE_MODEL,
        config: buildGeminiLiveConfig(fullInstruction, {
          sessionResumptionHandle: resumptionHandle,
        }),
        callbacks: {
          onopen: () => {
            try {
              // Clear connection timeout -we're in
              if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = null;
              }
              if (goAwayReconnectTimeoutRef.current) {
                clearTimeout(goAwayReconnectTimeoutRef.current);
                goAwayReconnectTimeoutRef.current = null;
              }

              // Reset reconnection state on successful connect
              reconnectAttemptsRef.current = 0;
              if (!shouldResumeSession) {
                greetingDeliveredRef.current = false;
                toolCallCountRef.current = 0;
                lastToolCallNameRef.current = null;
              }
              setIsConnecting(false);
              setIsReconnecting(false);
              setConnected(true);
              setError(null);

              // Store resolved session for direct access
              sessionPromise.then((session) => {
                resolvedSessionRef.current = session;

                if (restoreContextOnConnectRef.current) {
                  try {
                    session.sendClientContent({
                      turns: buildReconnectRestoreTurns(transcriptRef.current, {
                        greetingDelivered: greetingDeliveredRef.current,
                        lastToolCallName: lastToolCallNameRef.current,
                      }),
                      turnComplete: true,
                    });
                  } catch (_restoreError) {
                  } finally {
                    restoreContextOnConnectRef.current = false;
                  }
                }
              });

              syncSessionBackup();

              // Short hum to wake the model
              const humRate = 16000;
              const duration = 0.2;
              const numSamples = humRate * duration;
              const humData = new Float32Array(numSamples);
              for (let i = 0; i < numSamples; i++) {
                const envelope =
                  i < 500
                    ? i / 500
                    : i > numSamples - 500
                      ? (numSamples - i) / 500
                      : 1;
                humData[i] =
                  Math.sin((2 * Math.PI * 150 * i) / humRate) * 0.1 * envelope;
              }
              const humBlob = createBlob(humData);

              setTimeout(() => {
                resolvedSessionRef.current?.sendRealtimeInput({
                  audio: humBlob,
                });
              }, 500);

              // Setup Mic Stream
              if (!audioContextRef.current) return;
              const source =
                audioContextRef.current.createMediaStreamSource(stream);
              inputSourceRef.current = source;
              const processor = audioContextRef.current.createScriptProcessor(
                4096,
                1,
                1,
              );
              processorRef.current = processor;

              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);

                // User Speaking Detection (only when agent not speaking)
                if (sourcesRef.current.size === 0) {
                  const rms = calculateRMS(inputData);
                  const speakingThreshold = 0.015;

                  if (rms > speakingThreshold) {
                    setIsUserSpeaking(true);
                    if (userSpeakingTimeoutRef.current) {
                      clearTimeout(userSpeakingTimeoutRef.current);
                    }
                    userSpeakingTimeoutRef.current = setTimeout(() => {
                      setIsUserSpeaking(false);
                    }, 300);
                  }
                } else {
                  setIsUserSpeaking(false);
                }

                const downsampledData = downsampleTo16k(
                  inputData,
                  inputSampleRate,
                );
                const blob = createBlob(downsampledData);

                // Use resolved session ref instead of promise chain
                try {
                  resolvedSessionRef.current?.sendRealtimeInput({
                    audio: blob,
                  });
                } catch (_) {
                  // Session may have closed -ignore
                }
              };

              source.connect(processor);
              processor.connect(audioContextRef.current.destination);

              // ── Recording: mix mic + AI into one WebM ──────────
              try {
                const mixDest =
                  outputAudioContextRef.current?.createMediaStreamDestination();
                outputNodeRef.current?.connect(mixDest);
                const micForMix =
                  outputAudioContextRef.current?.createMediaStreamSource(
                    stream,
                  );
                micForMix.connect(mixDest);
                micSourceForMixRef.current = micForMix;

                const mimeType = MediaRecorder.isTypeSupported(
                  'audio/webm;codecs=opus',
                )
                  ? 'audio/webm;codecs=opus'
                  : 'audio/webm';
                const recorder = new MediaRecorder(mixDest.stream, {
                  mimeType,
                });
                const chunks: BlobPart[] = [];
                recorder.ondataavailable = (e) => {
                  if (e.data.size) chunks.push(e.data);
                };
                recorder.onstop = () => {
                  // Log auto-stop so we know it happened (disconnect() overrides this)
                };
                recordingChunksRef.current = chunks;
                recorderRef.current = recorder;
                recorder.start(1000);
              } catch (_recErr) {}
            } catch (_openErr) {
              setError('Failed to start mic streaming.');
            }
          },

          onmessage: async (msg: LiveServerMessage) => {
            if (msg.sessionResumptionUpdate) {
              sessionResumptionHandleRef.current =
                msg.sessionResumptionUpdate.newHandle ??
                sessionResumptionHandleRef.current;
              syncSessionBackup();
            }

            if (msg.goAway && !intentionalDisconnectRef.current) {
              const goAwayDelayMs = Math.max(
                parseGoAwayTimeLeftMs(msg.goAway.timeLeft) - 1000,
                0,
              );

              if (!goAwayReconnectTimeoutRef.current) {
                goAwayReconnectTimeoutRef.current = setTimeout(() => {
                  goAwayReconnectTimeoutRef.current = null;
                  if (!intentionalDisconnectRef.current) {
                    reconnect(false);
                  }
                }, goAwayDelayMs);
              }
            }

            // Handle Tool Calls
            if (msg.toolCall) {
              const responses = [];
              for (const fc of msg.toolCall.functionCalls) {
                const result = handleToolCall(fc);

                // Record tool call to backend (fire-and-forget)
                const sid = voiceSessionIdRef.current;
                if (sid && !sid.startsWith('vs_mock_')) {
                  recordVoiceToolCall({
                    voiceSessionId: sid,
                    callId: fc.id,
                    toolName: fc.name,
                    args: fc.args as Record<string, unknown>,
                    result: result as Record<string, unknown>,
                  }).catch(() => {});
                }

                responses.push({
                  id: fc.id,
                  name: fc.name,
                  response: { result },
                });
              }
              try {
                resolvedSessionRef.current?.sendToolResponse({
                  functionResponses: responses,
                });
                // Anti-loop: inject a context anchor after tool response via
                // sendRealtimeInput (gemini-3.1: sendClientContent is restricted
                // to history seeding only; live text must use sendRealtimeInput).
                const toolNames = responses.map((r: any) => r.name).join(', ');
                const contextNote = buildResumeContextNote(transcriptRef.current, {
                  greetingDelivered: greetingDeliveredRef.current,
                  lastToolCallName: toolNames,
                });
                resolvedSessionRef.current?.sendRealtimeInput({
                  text: contextNote,
                });
              } catch (_) {
                // Session may have closed
              }
            }

            // Gemini 3.1 Live can return multiple content parts in one event.
            // Queue every audio part so we do not silently drop speech.
            const audioChunks = extractModelAudioChunks(msg);
            for (const audioData of audioChunks) {
              if (!outputAudioContextRef.current) {
                break;
              }

              const buffer = await decodeAudioData(
                audioData,
                outputAudioContextRef.current,
              );
              const now = outputAudioContextRef.current.currentTime;
              if (nextStartTimeRef.current < now) {
                nextStartTimeRef.current = now;
              }

              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(outputNodeRef.current!);

              const scheduledStart = nextStartTimeRef.current;
              source.start(scheduledStart);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);

              const delayUntilPlay = Math.max(0, (scheduledStart - now) * 1000);
              setTimeout(() => {
                if (sourcesRef.current.has(source)) {
                  setIsAgentSpeaking(true);
                }
              }, delayUntilPlay);

              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                  setIsAgentSpeaking(false);
                }
              };
            }

            // Handle Interruptions
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach((source) => {
                try {
                  source.stop();
                } catch (_e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAgentSpeaking(false);
            }

            // Handle AI Transcription
            const aiTranscription = resolveAiTranscript(msg);
            if (aiTranscription) {
              // Track greeting delivery for anti-loop detection
              const aiText = aiTranscription.text.toLowerCase();
              if (
                !greetingDeliveredRef.current &&
                aiText.includes("i'm reyna")
              ) {
                greetingDeliveredRef.current = true;
              }
              // Detect greeting loop: if greeting pattern appears AFTER first delivery
              // AND a tool call just happened, log a warning (the sendClientContent
              // context anchor should prevent this, but log for diagnostics)
              if (
                greetingDeliveredRef.current &&
                toolCallCountRef.current > 0 &&
                aiText.includes("i'm reyna") &&
                aiText.includes('what brings you')
              ) {
                // Greeting loop detected after tool call
              }
              setTranscript((prev) => {
                let lastIndex = -1;
                for (let i = prev.length - 1; i >= 0; i--) {
                  if (prev[i].speaker === 'ai' && !prev[i].isFinal) {
                    lastIndex = i;
                    break;
                  }
                }
                if (lastIndex !== -1) {
                  const newPrev = [...prev];
                  const lastText = newPrev[lastIndex].text;
                  const newText = aiTranscription.text;
                  newPrev[lastIndex] = {
                    ...newPrev[lastIndex],
                    text: newText.startsWith(lastText)
                      ? newText
                      : lastText + newText,
                    isFinal: aiTranscription.isFinal,
                  };
                  return newPrev;
                }
                return [
                  ...prev.map((m) =>
                    m.speaker === 'ai' ? { ...m, isFinal: true } : m,
                  ),
                  {
                    speaker: 'ai' as const,
                    text: aiTranscription.text,
                    id: Math.random(),
                    isFinal: aiTranscription.isFinal,
                  },
                ];
              });
            }

            // Handle turn complete
            if (msg.serverContent?.turnComplete) {
              setTranscript((prev) =>
                prev.map((m) => ({ ...m, isFinal: true })),
              );
            }

            // Handle User Transcription
            const userTranscription = msg.serverContent?.inputTranscription;
            if (userTranscription?.text) {
              setTranscript((prev) => {
                let lastIndex = -1;
                for (let i = prev.length - 1; i >= 0; i--) {
                  if (prev[i].speaker === 'human' && !prev[i].isFinal) {
                    lastIndex = i;
                    break;
                  }
                }
                if (lastIndex !== -1) {
                  const newPrev = [...prev];
                  const lastText = newPrev[lastIndex].text;
                  const newText = userTranscription.text as string;
                  newPrev[lastIndex] = {
                    ...newPrev[lastIndex],
                    text: newText.startsWith(lastText)
                      ? newText
                      : lastText + newText,
                    isFinal: !!userTranscription.finished,
                  };
                  return newPrev;
                }
                return [
                  ...prev.map((m) =>
                    m.speaker === 'human' ? { ...m, isFinal: true } : m,
                  ),
                  {
                    speaker: 'human' as const,
                    text: userTranscription.text as string,
                    id: Math.random(),
                    isFinal: !!userTranscription.finished,
                  },
                ];
              });
            }
          },

          onclose: () => {
            setConnected(false);
            setIsAgentSpeaking(false);
            resolvedSessionRef.current = null;

            // Auto-reconnect unless user pressed end call
            if (!intentionalDisconnectRef.current) {
              reconnect();
            }
          },

          onerror: (e: ErrorEvent | Event) => {
            const msg = (e as ErrorEvent).message || 'Unknown WebSocket error';
            setIsConnecting(false);
            resolvedSessionRef.current = null;

            // Don't hard-disconnect -try to reconnect
            if (!intentionalDisconnectRef.current) {
              reconnect();
            } else {
              setError(`Connection failed: ${msg}`);
            }
          },
        },
      });
      sessionRef.current = sessionPromise;
    } catch (e: any) {
      const msg = e?.message || String(e);
      closeSession();
      cleanupAudio();
      setConnected(false);
      setIsAgentSpeaking(false);
      setIsUserSpeaking(false);
      setIsConnecting(false);

      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      // API key errors shouldn't trigger reconnection
      const isAuthError =
        msg.includes('API') ||
        msg.includes('key') ||
        msg.includes('401') ||
        msg.includes('403');

      if (isAuthError) {
        setIsReconnecting(false);
        setError(`API error: ${msg}`);
      } else if (!intentionalDisconnectRef.current) {
        reconnect();
      } else {
        setError(`Connection error: ${msg}`);
      }
    }
  };

  return {
    connected,
    isConnecting,
    isReconnecting,
    isAgentSpeaking,
    isUserSpeaking,
    error,
    transcript,
    connectToGemini,
    disconnect,
  };
}
