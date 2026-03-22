import {
  type Blob,
  GoogleGenAI,
  type LiveServerMessage,
  Modality,
  Type,
} from '@google/genai';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SILENCE_MODES, SYSTEM_INSTRUCTION } from '../components/AgentPrompt';
import {
  startVoiceSession,
  endVoiceSession,
  uploadVoiceAudio,
  recordVoiceToolCall,
} from '../lib/telemetry/voice';

// ─── Tool Declarations ──────────────────────────────────────────────
const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'show_calculator',
        description:
          'Scroll the Revenue Loss Calculator into view. Call this when you START asking about revenue or missed calls, BEFORE you have both numbers. Does not animate anything.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
          required: [],
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
        name: 'open_cal_popup',
        description:
          'Open the Cal.com booking popup so the visitor can schedule a call. ONLY use this AFTER the visitor explicitly agrees to book.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
          required: [],
        },
      },
    ],
  },
];

// ─── Resilience Constants ───────────────────────────────────────────
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY_MS = 2000;
const CONNECTION_TIMEOUT_MS = 15000;

// ─── Transcript types ───────────────────────────────────────────────
export interface TranscriptEntry {
  speaker: 'ai' | 'human';
  text: string;
  id: number;
  isFinal?: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────
export function useGeminiLive() {
  // Connection State
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, _setTranscript] = useState<TranscriptEntry[]>([]);

  // Wrap setTranscript to keep ref in sync (avoids stale closure in disconnect)
  const setTranscript: typeof _setTranscript = useCallback((action) => {
    _setTranscript((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      transcriptRef.current = next;
      return next;
    });
  }, []);

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

  // Resilience Refs
  const intentionalDisconnectRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        if (calApi && calApi.ns && calApi.ns['let-s-talk']) {
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
        status = 'unknown_tool_' + fc.name;
    }

    // Enrich response with context anchor — prevents the model from
    // resetting its conversation state and re-greeting after tool calls.
    return {
      status,
      context: 'IMPORTANT: The tool executed successfully. You are mid-conversation. Your greeting was already delivered. Continue naturally from where you left off. Do NOT re-introduce yourself.',
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
      }).catch((err) =>
        console.warn('[Reyna] endVoiceSession failed:', err),
      );
    };

    // Upload recording BEFORE ending session so sheet sync finds the audio.
    // Helper: upload accumulated chunks, then fire session-end.
    // NOTE: cleanupAudio() is called synchronously OUTSIDE this helper
    // to prevent it from running after refs are reassigned by a new session.
    const uploadAndEnd = async () => {
      const audioBlob = new window.Blob(chunks, { type: 'audio/webm' });

      if (sessionId && !sessionId.startsWith('vs_mock_') && audioBlob.size > 0) {
        console.log('[Reyna] Uploading recording:', audioBlob.size, 'bytes');
        const upload = uploadVoiceAudio(sessionId, 'recording', audioBlob)
          .catch((e) => console.warn('[Reyna] Audio upload failed:', e));
        // Cap wait at 15s — prevents dangling sessions on slow networks
        await Promise.race([
          upload,
          new Promise<void>((r) => setTimeout(() => {
            console.warn('[Reyna] Upload timed out after 15s, proceeding');
            r();
          }, 15_000)),
        ]);
      }

      fireEndSession();
    };

    if (recorder && recorder.state !== 'inactive') {
      // Recorder is still running — stop it and upload in the onstop callback
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = () => { uploadAndEnd(); };
      recorder.stop();
    } else {
      // Recorder already stopped (auto-stop when audio tracks ended) —
      // chunks were already collected via ondataavailable during the session.
      // Upload them directly instead of skipping.
      uploadAndEnd();
    }

    // Clean up audio resources synchronously — safe because recorder.stop()
    // already captured all data, and uploadAndEnd uses only captured locals.
    closeSession();
    cleanupAudio();

    // Clear refs
    voiceSessionIdRef.current = null;
    sessionStartTimeRef.current = 0;
    recorderRef.current = null;
    recordingChunksRef.current = [];

    setConnected(false);
    setIsConnecting(false);
    setIsReconnecting(false);
    setIsAgentSpeaking(false);
    setIsUserSpeaking(false);
    setTranscript([]);
  }, [closeSession, cleanupAudio]);

  // ─── Reconnect (automatic recovery) ────────────────────────────
  const reconnect = useCallback(() => {
    if (intentionalDisconnectRef.current) return;

    reconnectAttemptsRef.current += 1;
    const attempt = reconnectAttemptsRef.current;

    console.warn(
      `[Reyna] Reconnection attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS}`,
    );

    if (attempt > MAX_RECONNECT_ATTEMPTS) {
      console.error(
        '[Reyna] Max reconnection attempts reached — switching to Groq fallback',
      );
      closeSession();
      cleanupAudio();
      setConnected(false);
      setIsConnecting(false);
      setIsReconnecting(false);
      setIsAgentSpeaking(false);
      setFallbackMode(true);
      return;
    }

    // Tear down current connection but keep transcript
    closeSession();
    cleanupAudio();
    setConnected(false);
    setIsAgentSpeaking(false);
    setIsReconnecting(true);

    const delay = RECONNECT_BASE_DELAY_MS * attempt;
    reconnectTimeoutRef.current = setTimeout(() => {
      if (!intentionalDisconnectRef.current) {
        // connectToGemini is called directly — it's hoisted
        void connectToGemini(true);
      }
    }, delay);
  }, [closeSession, cleanupAudio]);

  // ─── Connect ──────────────────────────────────────────────────
  const connectToGemini = async (isReconnect = false) => {
    try {
      if (!isReconnect) {
        intentionalDisconnectRef.current = false;
        reconnectAttemptsRef.current = 0;
        setFallbackMode(false);
        setError(null);
        setTranscript([]);
      }

      setIsConnecting(true);

      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        setError('API Key is missing.');
        setIsConnecting(false);
        setIsReconnecting(false);
        return;
      }

      // Connection timeout — if onopen doesn't fire in time, retry
      connectionTimeoutRef.current = setTimeout(() => {
        console.warn('[Reyna] Connection timeout — attempting reconnect');
        closeSession();
        cleanupAudio();
        setIsConnecting(false);
        reconnect();
      }, CONNECTION_TIMEOUT_MS);

      const ai = new GoogleGenAI({
        apiKey: import.meta.env.VITE_GEMINI_API_KEY,
      });

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
      const fullInstruction = SYSTEM_INSTRUCTION + '\n\n' + silenceContext;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
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
              // Clear connection timeout — we're in
              if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = null;
              }

              // Reset reconnection state on successful connect
              reconnectAttemptsRef.current = 0;
              greetingDeliveredRef.current = false;
              toolCallCountRef.current = 0;
              lastToolCallNameRef.current = null;
              setIsConnecting(false);
              setIsReconnecting(false);
              setConnected(true);
              setError(null);

              // Store resolved session for direct access
              sessionPromise.then((session) => {
                resolvedSessionRef.current = session;
              });

              // Start telemetry session → gets voiceSessionId for sheet sync
              sessionStartTimeRef.current = Date.now();
              startVoiceSession({
                accepted: true,
                acceptedAt: new Date().toISOString(),
                version: '1.0',
              })
                .then(({ voiceSessionId }) => {
                  voiceSessionIdRef.current = voiceSessionId;
                })
                .catch((err) =>
                  console.warn('[Reyna] Telemetry session start failed:', err),
                );

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
                  media: humBlob,
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
                    media: blob,
                  });
                } catch (_) {
                  // Session may have closed — ignore
                }
              };

              source.connect(processor);
              processor.connect(audioContextRef.current.destination);

              // ── Recording: mix mic + AI into one WebM ──────────
              try {
                const mixDest =
                  outputAudioContextRef.current!.createMediaStreamDestination();
                outputNodeRef.current!.connect(mixDest);
                const micForMix =
                  outputAudioContextRef.current!.createMediaStreamSource(stream);
                micForMix.connect(mixDest);
                micSourceForMixRef.current = micForMix;

                const mimeType = MediaRecorder.isTypeSupported(
                  'audio/webm;codecs=opus',
                )
                  ? 'audio/webm;codecs=opus'
                  : 'audio/webm';
                const recorder = new MediaRecorder(mixDest.stream, { mimeType });
                const chunks: BlobPart[] = [];
                recorder.ondataavailable = (e) => {
                  if (e.data.size) chunks.push(e.data);
                };
                recorder.onstop = () => {
                  // Log auto-stop so we know it happened (disconnect() overrides this)
                  console.log(
                    '[Reyna] Recorder auto-stopped. Chunks collected:',
                    chunks.length,
                  );
                };
                recordingChunksRef.current = chunks;
                recorderRef.current = recorder;
                recorder.start(1000);
              } catch (recErr) {
                console.warn('[Reyna] Recording setup failed:', recErr);
              }
            } catch (openErr) {
              setError('Failed to start mic streaming.');
            }
          },

          onmessage: async (msg: LiveServerMessage) => {
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
                  }).catch((err) =>
                    console.warn('[Reyna] Tool call recording failed:', err),
                  );
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
                // Anti-loop: inject a context anchor after tool response
                // to prevent Gemini from resetting and re-greeting.
                const toolNames = responses.map((r: any) => r.name).join(', ');
                resolvedSessionRef.current?.sendClientContent({
                  turns: [
                    {
                      role: 'user',
                      parts: [
                        {
                          text: `[System note: ${toolNames} executed successfully. The visitor can see the result on screen. Continue the conversation from where you left off. You already introduced yourself — do NOT greet again.]`,
                        },
                      ],
                    },
                  ],
                  turnComplete: true,
                });
              } catch (_) {
                // Session may have closed
              }
            }

            // Handle Audio Output
            const audioData =
              msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
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
                } catch (e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAgentSpeaking(false);
            }

            // Handle AI Transcription
            const aiTranscription = msg.serverContent?.outputTranscription;
            if (aiTranscription && aiTranscription.text) {
              // Track greeting delivery for anti-loop detection
              const aiText = (aiTranscription.text as string).toLowerCase();
              if (!greetingDeliveredRef.current && aiText.includes("i'm reyna")) {
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
                console.warn(
                  '[Reyna] GREETING LOOP DETECTED after tool call:',
                  lastToolCallNameRef.current,
                  '— sendClientContent context anchor may not be working',
                );
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
                  const newText = aiTranscription.text as string;
                  newPrev[lastIndex] = {
                    ...newPrev[lastIndex],
                    text: newText.startsWith(lastText)
                      ? newText
                      : lastText + newText,
                    isFinal: !!aiTranscription.finished,
                  };
                  return newPrev;
                }
                return [
                  ...prev.map((m) =>
                    m.speaker === 'ai' ? { ...m, isFinal: true } : m,
                  ),
                  {
                    speaker: 'ai' as const,
                    text: aiTranscription.text as string,
                    id: Math.random(),
                    isFinal: !!aiTranscription.finished,
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
            if (userTranscription && userTranscription.text) {
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
              console.warn(
                '[Reyna] Connection closed unexpectedly — reconnecting',
              );
              reconnect();
            }
          },

          onerror: (e: ErrorEvent | Event) => {
            const msg = (e as ErrorEvent).message || 'Unknown WebSocket error';
            console.error('[Reyna] Live API error:', msg, e);
            setIsConnecting(false);
            resolvedSessionRef.current = null;

            // Don't hard-disconnect — try to reconnect
            if (!intentionalDisconnectRef.current) {
              console.warn('[Reyna] Error received — attempting reconnect');
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
      console.error('[Reyna] Connect error:', msg, e);
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
    fallbackMode,
    isAgentSpeaking,
    isUserSpeaking,
    error,
    transcript,
    connectToGemini,
    disconnect,
  };
}
