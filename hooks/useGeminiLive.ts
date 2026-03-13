import {
  type Blob as GeminiBlob,
  GoogleGenAI,
  type LiveServerMessage,
  Modality,
  Type,
} from '@google/genai';
import { type MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { SILENCE_MODES, SYSTEM_INSTRUCTION } from '../components/AgentPrompt';
import { trackEventFireAndForget } from '../lib/telemetry/browser';
import {
  endVoiceSession,
  recordVoiceError,
  recordVoiceToolCall,
  startVoiceSession,
  syncVoiceTranscript,
  uploadVoiceAudio,
} from '../lib/telemetry/voice';
import type { TranscriptTurnPayload, VoiceConsentPayload } from '../lib/telemetry/shared';

// ─── Reconnect constants ─────────────────────────────────────────────
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAYS: readonly number[] = [1000, 2000, 3000, 4000, 5000];

// ─── Tool Declarations ──────────────────────────────────────────────
const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'highlight_element',
        description:
          'Visually highlight a specific element on the page with a glow effect. Supported IDs: receptionist, calculator, input-revenue, input-calls, result-box, solutions, comparison, automations, reviews, referral-section, footer',
        parameters: {
          type: Type.OBJECT,
          properties: {
            element_id: {
              type: Type.STRING,
              description: 'The HTML ID of the element to highlight.',
            },
          },
          required: ['element_id'],
        },
      },
      {
        name: 'control_website',
        description:
          'Scroll the webpage smoothly to a specific section. Supported Targets: receptionist, calculator, solutions, comparison, automations, reviews, referral-section, footer',
        parameters: {
          type: Type.OBJECT,
          properties: {
            target: {
              type: Type.STRING,
              description: 'The section ID to scroll to.',
            },
          },
          required: ['target'],
        },
      },
      {
        name: 'update_calculator',
        description:
          'Update the values in the Revenue Loss Calculator to show the visitor their potential monthly loss.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            revenue: {
              type: Type.NUMBER,
              description: 'Average revenue per customer in dollars',
            },
            missedCalls: {
              type: Type.NUMBER,
              description: 'Missed calls per day (1-20)',
            },
          },
          required: ['revenue', 'missedCalls'],
        },
      },
      {
        name: 'navigate_carousel',
        description:
          "Navigate a carousel to show specific cards. Carousels: 'industry' (IndustrySlider with HVAC, Dental, Roofing, Tree, Auto), 'automation' (AutomationCards with partner tools), 'comparison' (Comparison 3D carousel). Actions: 'next', 'prev', or a card index number (0-based).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            carousel: {
              type: Type.STRING,
              description:
                "Which carousel: 'industry', 'automation', or 'comparison'",
            },
            action: {
              type: Type.STRING,
              description:
                "'next', 'prev', or a card index number (0-based string like '0', '1', '2')",
            },
          },
          required: ['carousel', 'action'],
        },
      },
      {
        name: 'toggle_theme',
        description:
          "Change the website appearance. Toggle between dark/light mode, or change the accent color to blue, green, or orange. Use this to show off the site or match the visitor's preference.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            mode: {
              type: Type.STRING,
              description:
                "Theme mode: 'dark' or 'light'. Omit to keep current.",
            },
            accent: {
              type: Type.STRING,
              description:
                "Accent color: 'blue', 'green', or 'orange'. Omit to keep current.",
            },
          },
          required: [],
        },
      },
      {
        name: 'open_cal_popup',
        description:
          'Open the Cal.com booking popup so the visitor can schedule a call. ONLY use this AFTER the visitor explicitly agrees to book.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
          required: [],
        },
      },
      {
        name: 'trigger_animation',
        description:
          "Play a visual effect on a section to draw attention. Effects: 'pulse' (gentle scale throb), 'glow' (bright border glow), 'shake' (quick attention shake). Target is a section ID.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            target: {
              type: Type.STRING,
              description:
                'Section ID to animate (receptionist, calculator, solutions, comparison, automations, reviews, referral-section)',
            },
            effect: {
              type: Type.STRING,
              description: "Animation effect: 'pulse', 'glow', or 'shake'",
            },
          },
          required: ['target', 'effect'],
        },
      },
      {
        name: 'toggle_section',
        description:
          "Control expandable UI elements. Actions: 'set_category_filter' (filter mentor cards by category: 'all', 'n8n', 'voice', 'web', 'claude', 'mindset').",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description: "UI action: 'set_category_filter'",
            },
            value: {
              type: Type.STRING,
              description:
                'Parameter for the action (category name for filter)',
            },
          },
          required: ['action'],
        },
      },
    ],
  },
];

// ─── Transcript types ───────────────────────────────────────────────
export interface TranscriptEntry {
  speaker: 'ai' | 'human';
  text: string;
  id: number;
  isFinal?: boolean;
}

function stopMediaRecorder(
  recorderRef: MutableRefObject<MediaRecorder | null>,
  chunksRef: MutableRefObject<Blob[]>,
) {
  return new Promise<Blob | null>((resolve) => {
    const recorder = recorderRef.current;

    if (!recorder) {
      resolve(null);
      return;
    }

    const finalize = () => {
      const blob = chunksRef.current.length
        ? new Blob(chunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          })
        : null;
      chunksRef.current = [];
      recorderRef.current = null;
      resolve(blob);
    };

    if (recorder.state === 'inactive') {
      finalize();
      return;
    }

    recorder.addEventListener('stop', finalize, { once: true });
    recorder.stop();
  });
}

function getRecorderOptions() {
  if (typeof MediaRecorder === 'undefined') {
    return undefined;
  }

  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    return { mimeType: 'audio/webm;codecs=opus' };
  }

  if (MediaRecorder.isTypeSupported('audio/webm')) {
    return { mimeType: 'audio/webm' };
  }

  return undefined;
}

// ─── Pure helpers (module-level — no refs, no state, stable forever) ─

type FunctionCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

function getConnectionErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return 'Microphone access was denied.';
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return 'No microphone was found on this device.';
    }
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return 'Failed to initialize audio.';
}

function downsampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === 16000) return input;
  const ratio = inputRate / 16000;
  const newLength = Math.floor(input.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    result[i] = input[Math.floor(i * ratio)];
  }
  return result;
}

function calculateRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

function createBlob(data: Float32Array): GeminiBlob {
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
  return { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' };
}

async function decodeAudioData(b64: string, ctx: AudioContext): Promise<AudioBuffer> {
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
}

function executeToolEffect(fc: FunctionCall): { status: string } {
  const args = fc.args as Record<string, string>;

  switch (fc.name) {
    case 'control_website': {
      const el = document.getElementById(args.target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return { status: `scrolled_to_${args.target}` };
      }
      return { status: `element_not_found_${args.target}` };
    }
    case 'update_calculator': {
      window.dispatchEvent(
        new CustomEvent('updateCalculator', {
          detail: { revenue: fc.args.revenue, missedCalls: fc.args.missedCalls },
        }),
      );
      return { status: 'updated_calculator' };
    }
    case 'highlight_element': {
      window.dispatchEvent(
        new CustomEvent('highlightElement', { detail: { id: args.element_id } }),
      );
      return { status: `highlighted_${args.element_id}` };
    }
    case 'navigate_carousel': {
      window.dispatchEvent(
        new CustomEvent('navigateCarousel', {
          detail: { carousel: args.carousel, action: args.action },
        }),
      );
      return { status: `navigated_${args.carousel}_${args.action}` };
    }
    case 'toggle_theme': {
      window.dispatchEvent(
        new CustomEvent('toggleTheme', {
          detail: { mode: args.mode, accent: args.accent },
        }),
      );
      return { status: 'theme_changed' };
    }
    case 'open_cal_popup': {
      const calApi = (window as unknown as Record<string, unknown>).Cal as {
        ns?: Record<string, (action: string) => void>;
      } | undefined;
      if (calApi?.ns?.['let-s-talk']) {
        calApi.ns['let-s-talk']('openModal');
        return { status: 'cal_popup_opened' };
      }
      const calBtn = document.querySelector('[data-cal-link]') as HTMLElement | null;
      if (calBtn) {
        calBtn.click();
        return { status: 'cal_button_clicked' };
      }
      return { status: 'cal_not_available' };
    }
    case 'trigger_animation': {
      const el = document.getElementById(args.target);
      if (el) {
        const className = `reyna-animate-${args.effect}`;
        el.classList.add(className);
        setTimeout(() => { el.classList.remove(className); }, 1500);
        return { status: `animated_${args.target}_${args.effect}` };
      }
      return { status: `element_not_found_${args.target}` };
    }
    case 'toggle_section': {
      window.dispatchEvent(
        new CustomEvent('toggleSection', {
          detail: { action: args.action, value: args.value },
        }),
      );
      return { status: `section_${args.action}_${args.value || 'done'}` };
    }
    default:
      return { status: `unknown_tool_${fc.name}` };
  }
}

// ─── Hook ───────────────────────────────────────────────────────────
export function useGeminiLive() {
  // Connection State
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);

  // Stable ref copies of state — lets callbacks read current values without
  // being listed as deps (avoids re-creating the entire connection closure).
  const connectedRef = useRef(false);
  const isConnectingRef = useRef(false);
  useEffect(() => { connectedRef.current = connected; }, [connected]);
  useEffect(() => { isConnectingRef.current = isConnecting; }, [isConnecting]);

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const outputCaptureDestinationRef =
    useRef<MediaStreamAudioDestinationNode | null>(null);
  const inputRecorderRef = useRef<MediaRecorder | null>(null);
  const outputRecorderRef = useRef<MediaRecorder | null>(null);
  const inputChunksRef = useRef<Blob[]>([]);
  const outputChunksRef = useRef<Blob[]>([]);

  // Volume detection ref
  const userSpeakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Playback Queue
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Tool-call sync queue: delays tool execution until audio catches up
  const pendingToolCallsRef = useRef<Array<{ fn: () => void; scheduledAt: number }>>([]);

  // Session Ref — typed loosely because @google/genai session type is internal
  const sessionRef = useRef<Promise<{ close: () => void; sendRealtimeInput: (v: unknown) => void; sendToolResponse: (v: unknown) => void }> | null>(null);

  // Reconnect Refs
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userDisconnectedRef = useRef<boolean>(false);
  const pendingConsentRef = useRef<VoiceConsentPayload | null>(null);
  const voiceSessionIdRef = useRef<string | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const syncedTranscriptSignatureRef = useRef('');
  const nextTranscriptIdRef = useRef(1);

  // Ref that holds the latest attemptReconnect — breaks the circular dep
  // between connectToGeminiInternal and attemptReconnect.
  const attemptReconnectRef = useRef<() => void>(() => {});
  // Guard: prevents onclose+onerror from both triggering reconnect for the same event
  const reconnectPendingRef = useRef(false);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const finalizeVoiceCapture = useCallback(
    async (status: 'completed' | 'cancelled' | 'failed') => {
      const voiceSessionId = voiceSessionIdRef.current;
      if (!voiceSessionId) {
        return;
      }

      const transcriptSnapshot = [...transcriptRef.current];
      const transcriptText = transcriptSnapshot
        .map((entry) => `${entry.speaker === 'ai' ? 'AI' : 'User'}: ${entry.text}`)
        .join('\n');
      const durationMs = sessionStartedAtRef.current
        ? Date.now() - sessionStartedAtRef.current
        : undefined;

      try {
        const [inputBlob, outputBlob] = await Promise.all([
          stopMediaRecorder(inputRecorderRef, inputChunksRef),
          stopMediaRecorder(outputRecorderRef, outputChunksRef),
        ]);

        if (transcriptSnapshot.length) {
          const turns: TranscriptTurnPayload[] = transcriptSnapshot.map((entry, index) => ({
            turnIndex: index + 1,
            speaker: entry.speaker,
            text: entry.text,
            isFinal: Boolean(entry.isFinal),
            capturedAt: new Date().toISOString(),
          }));
          await syncVoiceTranscript(voiceSessionId, turns);
        }

        if (inputBlob?.size) {
          await uploadVoiceAudio(voiceSessionId, 'microphone', inputBlob, {
            channel: 'microphone',
          });
        }

        if (outputBlob?.size) {
          await uploadVoiceAudio(voiceSessionId, 'assistant', outputBlob, {
            channel: 'assistant',
          });
        }

        await endVoiceSession({
          voiceSessionId,
          status,
          durationMs,
          transcriptText,
          metadata: {
            transcriptTurns: transcriptSnapshot.length,
          },
        });
      } catch (captureError) {
        console.error('Failed to finalize voice capture', captureError);
      } finally {
        voiceSessionIdRef.current = null;
        sessionStartedAtRef.current = null;
        syncedTranscriptSignatureRef.current = '';
        nextTranscriptIdRef.current = 1;
      }
    },
    [],
  );

  useEffect(() => {
    const voiceSessionId = voiceSessionIdRef.current;
    if (!voiceSessionId || transcript.length === 0) {
      return;
    }

    const turns: TranscriptTurnPayload[] = transcript.map((entry, index) => ({
      turnIndex: index + 1,
      speaker: entry.speaker,
      text: entry.text,
      isFinal: Boolean(entry.isFinal),
      capturedAt: new Date().toISOString(),
    }));

    const signature = JSON.stringify(
      turns.map((turn) => [turn.turnIndex, turn.speaker, turn.isFinal, turn.text]),
    );
    if (signature === syncedTranscriptSignatureRef.current) {
      return;
    }

    syncedTranscriptSignatureRef.current = signature;
    void syncVoiceTranscript(voiceSessionId, turns).catch((syncError) => {
      console.warn('Transcript sync failed', syncError);
      void recordVoiceError({
        voiceSessionId,
        scope: 'transcript_sync',
        message: syncError instanceof Error ? syncError.message : 'Transcript sync failed',
        severity: 'warning',
      });
    });
  }, [transcript]);

  // ─── scheduleToolExecution ────────────────────────────────────
  // Reads only stable refs — useCallback with [].
  const scheduleToolExecution = useCallback(
    (
      functionCalls: FunctionCall[],
    ): { id: string; name: string; response: { result: { status: string } } }[] => {
      const responses: { id: string; name: string; response: { result: { status: string } } }[] = [];
      const ctx = outputAudioContextRef.current;
      const now = ctx ? ctx.currentTime : 0;
      const audioQueueAhead = Math.max(0, nextStartTimeRef.current - now);
      const leadTime = 0.15;
      const delayMs = Math.max(0, (audioQueueAhead - leadTime) * 1000);

      for (const fc of functionCalls) {
        const effectFn = () => executeToolEffect(fc);
        if (delayMs < 50) {
          const result = effectFn();
          if (voiceSessionIdRef.current) {
            void recordVoiceToolCall({
              voiceSessionId: voiceSessionIdRef.current,
              callId: fc.id,
              toolName: fc.name,
              args: fc.args,
              result,
            }).catch((error) => {
              console.warn('Failed to record tool call', error);
            });
          }
          responses.push({ id: fc.id, name: fc.name, response: { result } });
        } else {
          const scheduledTime = Date.now() + delayMs;
          const timeout = setTimeout(() => {
            const result = effectFn();
            if (voiceSessionIdRef.current) {
              void recordVoiceToolCall({
                voiceSessionId: voiceSessionIdRef.current,
                callId: fc.id,
                toolName: fc.name,
                args: fc.args,
                result,
              }).catch((error) => {
                console.warn('Failed to record tool call', error);
              });
            }
            pendingToolCallsRef.current = pendingToolCallsRef.current.filter(
              (p) => p.scheduledAt !== scheduledTime,
            );
          }, delayMs);
          pendingToolCallsRef.current.push({
            fn: () => { clearTimeout(timeout); },
            scheduledAt: scheduledTime,
          });
          responses.push({
            id: fc.id,
            name: fc.name,
            response: { result: { status: `scheduled_${fc.name}` } },
          });
        }
      }
      return responses;
    },
    [],
  );

  // ─── Disconnect ───────────────────────────────────────────────
  // Stable: only touches refs and state setters.
  const disconnect = useCallback((status: 'completed' | 'cancelled' | 'failed' = 'cancelled') => {
    userDisconnectedRef.current = true;
    reconnectPendingRef.current = false;
    setIsReconnecting(false);
    setFallbackMode(false);
    reconnectAttemptsRef.current = 0;
    trackEventFireAndForget('voice_demo_disconnected', {
      status,
      voiceSessionId: voiceSessionIdRef.current,
    });
    void finalizeVoiceCapture(status);
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    pendingToolCallsRef.current.forEach((p) => { p.fn(); });
    pendingToolCallsRef.current = [];
    sourcesRef.current.forEach((source) => {
      try { source.stop(); } catch (_e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    if (userSpeakingTimeoutRef.current) {
      clearTimeout(userSpeakingTimeoutRef.current);
      userSpeakingTimeoutRef.current = null;
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
      mediaStreamRef.current.getTracks().forEach((track) => { track.stop(); });
      mediaStreamRef.current = null;
    }
    inputRecorderRef.current = null;
    outputRecorderRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    outputCaptureDestinationRef.current = null;
    if (sessionRef.current) {
      sessionRef.current
        .then((session) => { session.close(); })
        .catch(() => {});
      sessionRef.current = null;
    }
    setIsConnecting(false);
    setConnected(false);
    setIsAgentSpeaking(false);
    setIsUserSpeaking(false);
    setTranscript([]);
  }, [finalizeVoiceCapture]);

  // ─── Connect (internal) ───────────────────────────────────────
  // Reads connectedRef/isConnectingRef (not state) to avoid stale closures.
  // Uses attemptReconnectRef.current to call attemptReconnect without a
  // circular dep. Deps: [disconnect, scheduleToolExecution] — both stable.
  const connectToGeminiInternal = useCallback(async () => {
    if (connectedRef.current || isConnectingRef.current) return;

    try {
      setIsConnecting(true);
      setError(null);
      setTranscript([]);
      setIsAgentSpeaking(false);
      setIsUserSpeaking(false);
      nextTranscriptIdRef.current = 1;
      syncedTranscriptSignatureRef.current = '';

      const consent = pendingConsentRef.current;
      if (!consent?.accepted) {
        setIsConnecting(false);
        setError('Recording consent is required before starting the live demo.');
        return;
      }

      console.log('[Reyna] Starting voice session...');
      const startedSession = await startVoiceSession(consent);
      console.log('[Reyna] Voice session started with ID:', startedSession.voiceSessionId);

      if (!startedSession.token) {
        throw new Error('Gemini API key is missing. Please set VITE_GEMINI_API_KEY in your .env file.');
      }

      voiceSessionIdRef.current = startedSession.voiceSessionId;
      sessionStartedAtRef.current = Date.now();

      const ai = new GoogleGenAI({
        apiKey: startedSession.token,
        httpOptions: { apiVersion: 'v1alpha' },
      });

      console.log('[Reyna] Connecting to Gemini Multimodal Live API...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      // ... rest of audio context setup ...

      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      audioContextRef.current = new AudioCtx();
      const inputSampleRate = audioContextRef.current.sampleRate;

      outputAudioContextRef.current = new AudioCtx({ sampleRate: 24000 });
      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(outputAudioContextRef.current.destination);
      outputCaptureDestinationRef.current =
        outputAudioContextRef.current.createMediaStreamDestination();
      outputNodeRef.current.connect(outputCaptureDestinationRef.current);

      if (typeof MediaRecorder !== 'undefined') {
        const recorderOptions = getRecorderOptions();
        inputChunksRef.current = [];
        inputRecorderRef.current = recorderOptions
          ? new MediaRecorder(stream, recorderOptions)
          : new MediaRecorder(stream);
        inputRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            inputChunksRef.current.push(event.data);
          }
        };
        inputRecorderRef.current.start();

        outputChunksRef.current = [];
        outputRecorderRef.current = recorderOptions
          ? new MediaRecorder(outputCaptureDestinationRef.current.stream, recorderOptions)
          : new MediaRecorder(outputCaptureDestinationRef.current.stream);
        outputRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            outputChunksRef.current.push(event.data);
          }
        };
        outputRecorderRef.current.start();
      }

      const silenceMode = localStorage.getItem('reyna-silence-mode') || 'checkin';
      const silenceContext =
        SILENCE_MODES[silenceMode as keyof typeof SILENCE_MODES] || SILENCE_MODES.checkin;
      const fullInstruction = `${SYSTEM_INSTRUCTION}\n\n${silenceContext}`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-latest',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: fullInstruction,
          tools: TOOLS,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            try {
              setIsConnecting(false);
              setConnected(true);
              setIsReconnecting(false);
              trackEventFireAndForget('voice_demo_connected', {
                voiceSessionId: voiceSessionIdRef.current,
              });

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
                humData[i] = Math.sin((2 * Math.PI * 150 * i) / humRate) * 0.1 * envelope;
              }
              const humBlob = createBlob(humData);
              setTimeout(() => {
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({ media: humBlob });
                });
              }, 500);

              if (!audioContextRef.current) return;
              const source = audioContextRef.current.createMediaStreamSource(stream);
              inputSourceRef.current = source;
              const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);

                if (sourcesRef.current.size === 0) {
                  const rms = calculateRMS(inputData);
                  if (rms > 0.015) {
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

                const blob = createBlob(downsampleTo16k(inputData, inputSampleRate));
                sessionPromise
                  .then((session) => { session.sendRealtimeInput({ media: blob }); })
                  .catch(() => {});
              };

              source.connect(processor);
              processor.connect(audioContextRef.current.destination);
            } catch (openErr) {
              setIsConnecting(false);
              setError('Failed to start mic streaming.');
              console.error('Mic stream setup error:', openErr);
              disconnect();
            }
          },

          onmessage: async (msg: LiveServerMessage) => {
            if (msg.toolCall) {
              const responses = scheduleToolExecution(
                msg.toolCall.functionCalls as FunctionCall[],
              );
              sessionPromise.then((session) => {
                session.sendToolResponse({ functionResponses: responses });
              });
            }

            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              const buffer = await decodeAudioData(audioData, outputAudioContextRef.current);
              const now = outputAudioContextRef.current.currentTime;
              if (nextStartTimeRef.current < now) nextStartTimeRef.current = now;

              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = buffer;
              const outputNode = outputNodeRef.current;
              if (outputNode) source.connect(outputNode);

              const scheduledStart = nextStartTimeRef.current;
              source.start(scheduledStart);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);

              const delayUntilPlay = Math.max(0, (scheduledStart - now) * 1000);
              setTimeout(() => {
                if (sourcesRef.current.has(source)) setIsAgentSpeaking(true);
              }, delayUntilPlay);

              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsAgentSpeaking(false);
              };
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach((source) => {
                try { source.stop(); } catch (_e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAgentSpeaking(false);
              pendingToolCallsRef.current.forEach((p) => { p.fn(); });
              pendingToolCallsRef.current = [];
            }

            const aiTranscription = msg.serverContent?.outputTranscription;
            if (aiTranscription?.text) {
              setTranscript((prev) => {
                let lastIndex = -1;
                for (let i = prev.length - 1; i >= 0; i--) {
                  if (prev[i].speaker === 'ai' && !prev[i].isFinal) { lastIndex = i; break; }
                }
                if (lastIndex !== -1) {
                  const newPrev = [...prev];
                  const lastText = newPrev[lastIndex].text;
                  const newText = aiTranscription.text as string;
                  newPrev[lastIndex] = {
                    ...newPrev[lastIndex],
                    text: newText.startsWith(lastText) ? newText : lastText + newText,
                    isFinal: !!aiTranscription.finished,
                  };
                  return newPrev;
                }
                return [
                  ...prev.map((m) => (m.speaker === 'ai' ? { ...m, isFinal: true } : m)),
                  {
                    speaker: 'ai' as const,
                    text: aiTranscription.text as string,
                    id: nextTranscriptIdRef.current++,
                    isFinal: !!aiTranscription.finished,
                  },
                ];
              });
            }

            if (msg.serverContent?.turnComplete) {
              setTranscript((prev) => prev.map((m) => ({ ...m, isFinal: true })));
            }

            const userTranscription = msg.serverContent?.inputTranscription;
            if (userTranscription?.text) {
              setTranscript((prev) => {
                let lastIndex = -1;
                for (let i = prev.length - 1; i >= 0; i--) {
                  if (prev[i].speaker === 'human' && !prev[i].isFinal) { lastIndex = i; break; }
                }
                if (lastIndex !== -1) {
                  const newPrev = [...prev];
                  const lastText = newPrev[lastIndex].text;
                  const newText = userTranscription.text as string;
                  newPrev[lastIndex] = {
                    ...newPrev[lastIndex],
                    text: newText.startsWith(lastText) ? newText : lastText + newText,
                    isFinal: !!userTranscription.finished,
                  };
                  return newPrev;
                }
                return [
                  ...prev.map((m) => (m.speaker === 'human' ? { ...m, isFinal: true } : m)),
                  {
                    speaker: 'human' as const,
                    text: userTranscription.text as string,
                    id: nextTranscriptIdRef.current++,
                    isFinal: !!userTranscription.finished,
                  },
                ];
              });
            }
          },

          onclose: () => {
            setConnected(false);
            setIsConnecting(false);
            setIsAgentSpeaking(false);
            setIsUserSpeaking(false);
            // Stop audio processor immediately so it stops sending to dead session
            if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
            if (inputSourceRef.current) { inputSourceRef.current.disconnect(); inputSourceRef.current = null; }
            if (!userDisconnectedRef.current && !reconnectPendingRef.current) {
              reconnectPendingRef.current = true;
              void recordVoiceError({
                voiceSessionId: voiceSessionIdRef.current ?? undefined,
                scope: 'live_connection',
                message: 'Connection dropped unexpectedly.',
                severity: 'warning',
              });
              setError('Connection dropped — reconnecting...');
              attemptReconnectRef.current();
            }
          },

          onerror: (err: ErrorEvent) => {
            console.error(
              '[Reyna] Live API Error:',
              JSON.stringify(err, Object.getOwnPropertyNames(err)),
            );
            setIsConnecting(false);
            // Stop audio processor immediately so it stops sending to dead session
            if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
            if (inputSourceRef.current) { inputSourceRef.current.disconnect(); inputSourceRef.current = null; }
            if (!reconnectPendingRef.current) {
              reconnectPendingRef.current = true;
              setError('Connection issue — reconnecting...');
              void recordVoiceError({
                voiceSessionId: voiceSessionIdRef.current ?? undefined,
                scope: 'live_api',
                message: err?.message || 'Live API error',
                severity: 'error',
              });
              attemptReconnectRef.current();
            }
          },
        },
      });

      // Store as typed promise
      sessionRef.current = sessionPromise as typeof sessionRef.current;

      sessionPromise.catch((err: Error) => {
        console.error('[Reyna] Session connection error:', err);
        setIsConnecting(false);
        setError(err?.message || 'Failed to connect.');
        void recordVoiceError({
          voiceSessionId: voiceSessionIdRef.current ?? undefined,
          scope: 'session_connect',
          message: err?.message || 'Failed to connect',
          severity: 'error',
        });
        attemptReconnectRef.current();
      });
    } catch (e) {
      console.error('Init error:', e);
      setIsConnecting(false);
      setError(getConnectionErrorMessage(e));
      void recordVoiceError({
        voiceSessionId: voiceSessionIdRef.current ?? undefined,
        scope: 'voice_init',
        message: getConnectionErrorMessage(e),
        severity: 'error',
      });
      disconnect('failed');
    }
  }, [disconnect, scheduleToolExecution]);

  // ─── Reconnect Logic ──────────────────────────────────────────
  const attemptReconnect = useCallback(() => {
    if (userDisconnectedRef.current) return;

    const attempt = reconnectAttemptsRef.current;

    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[Reyna] Gemini reconnect exhausted. Switching to Groq fallback.');
      reconnectAttemptsRef.current = 0;
      setIsReconnecting(false);
      setFallbackMode(true);
      setError('Switched to backup voice mode.');
      setIsConnecting(false);
      void finalizeVoiceCapture('failed');
      return;
    }

    setIsReconnecting(true);
    reconnectAttemptsRef.current += 1;
    const delay = RECONNECT_DELAYS[attempt] ?? 4000;
    console.log(
      `[Reyna] Reconnect attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`,
    );

    reconnectTimerRef.current = setTimeout(async () => {
      reconnectPendingRef.current = false; // allow next disconnect to trigger reconnect
      try {
        if (inputSourceRef.current) { inputSourceRef.current.disconnect(); inputSourceRef.current = null; }
        if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
        // Stop old mic stream so new getUserMedia doesn't conflict
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => { track.stop(); });
          mediaStreamRef.current = null;
        }
        if (audioContextRef.current?.state !== 'closed') {
          void audioContextRef.current?.close();
          audioContextRef.current = null;
        }
        if (outputAudioContextRef.current?.state !== 'closed') {
          void outputAudioContextRef.current?.close();
          outputAudioContextRef.current = null;
        }
        if (sessionRef.current) {
          sessionRef.current
            .then((s) => { try { s.close(); } catch (_e) {} })
            .catch(() => {});
          sessionRef.current = null;
        }
      } catch (_e) {}
      setConnected(false);
      await finalizeVoiceCapture('failed');
      void connectToGeminiInternal();
    }, delay);
  }, [connectToGeminiInternal, finalizeVoiceCapture]);

  // Keep the ref in sync so connectToGeminiInternal can call the latest version
  // without it appearing in connectToGeminiInternal's deps array.
  useEffect(() => {
    attemptReconnectRef.current = attemptReconnect;
  }, [attemptReconnect]);

  // ─── Connect (public wrapper) ─────────────────────────────────
  const connectToGemini = useCallback((consent: VoiceConsentPayload) => {
    userDisconnectedRef.current = false;
    reconnectAttemptsRef.current = 0;
    reconnectPendingRef.current = false;
    setFallbackMode(false);
    setIsReconnecting(false);
    pendingConsentRef.current = consent;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    trackEventFireAndForget('voice_demo_start_requested', {
      consentVersion: consent.version,
    });
    void connectToGeminiInternal();
  }, [connectToGeminiInternal]);

  return {
    connected,
    isConnecting,
    isAgentSpeaking,
    isUserSpeaking,
    error,
    transcript,
    connectToGemini,
    disconnect,
    isReconnecting,
    fallbackMode,
  };
}
