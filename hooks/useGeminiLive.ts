import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, Blob } from '@google/genai';
import { SYSTEM_INSTRUCTION, SILENCE_MODES } from '../components/AgentPrompt';

// ─── Tool Declarations ──────────────────────────────────────────────
const TOOLS = [
  {
    functionDeclarations: [
      // === EXISTING TOOLS ===
      {
        name: "highlight_element",
        description: "Visually highlight a specific element on the page with a glow effect. Supported IDs: receptionist, calculator, input-revenue, input-calls, result-box, solutions, comparison, automations, reviews, referral-section, footer",
        parameters: {
          type: Type.OBJECT,
          properties: {
            element_id: {
              type: Type.STRING,
              description: "The HTML ID of the element to highlight.",
            }
          },
          required: ["element_id"]
        }
      },
      {
        name: "control_website",
        description: "Scroll the webpage smoothly to a specific section. Supported Targets: receptionist, calculator, solutions, comparison, automations, reviews, referral-section, footer",
        parameters: {
          type: Type.OBJECT,
          properties: {
            target: {
              type: Type.STRING,
              description: "The section ID to scroll to."
            }
          },
          required: ["target"]
        }
      },
      {
        name: "update_calculator",
        description: "Update the values in the Revenue Loss Calculator to show the visitor their potential monthly loss.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            revenue: { type: Type.NUMBER, description: "Average revenue per customer in dollars" },
            missedCalls: { type: Type.NUMBER, description: "Missed calls per day (1-20)" }
          },
          required: ["revenue", "missedCalls"]
        }
      },
      // === NEW TOOLS ===
      {
        name: "navigate_carousel",
        description: "Navigate a carousel to show specific cards. Carousels: 'industry' (IndustrySlider with HVAC, Dental, Roofing, Tree, Auto), 'automation' (AutomationCards with partner tools), 'comparison' (Comparison 3D carousel). Actions: 'next', 'prev', or a card index number (0-based).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            carousel: {
              type: Type.STRING,
              description: "Which carousel: 'industry', 'automation', or 'comparison'"
            },
            action: {
              type: Type.STRING,
              description: "'next', 'prev', or a card index number (0-based string like '0', '1', '2')"
            }
          },
          required: ["carousel", "action"]
        }
      },
      {
        name: "toggle_theme",
        description: "Change the website appearance. Toggle between dark/light mode, or change the accent color to blue, green, or orange. Use this to show off the site or match the visitor's preference.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            mode: {
              type: Type.STRING,
              description: "Theme mode: 'dark' or 'light'. Omit to keep current."
            },
            accent: {
              type: Type.STRING,
              description: "Accent color: 'blue', 'green', or 'orange'. Omit to keep current."
            }
          },
          required: []
        }
      },
      {
        name: "open_cal_popup",
        description: "Open the Cal.com booking popup so the visitor can schedule a call. ONLY use this AFTER the visitor explicitly agrees to book.",
        parameters: {
          type: Type.OBJECT,
          properties: {},
          required: []
        }
      },
      {
        name: "trigger_animation",
        description: "Play a visual effect on a section to draw attention. Effects: 'pulse' (gentle scale throb), 'glow' (bright border glow), 'shake' (quick attention shake). Target is a section ID.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            target: {
              type: Type.STRING,
              description: "Section ID to animate (receptionist, calculator, solutions, comparison, automations, reviews, referral-section)"
            },
            effect: {
              type: Type.STRING,
              description: "Animation effect: 'pulse', 'glow', or 'shake'"
            }
          },
          required: ["target", "effect"]
        }
      },
      {
        name: "toggle_section",
        description: "Control expandable UI elements. Actions: 'set_category_filter' (filter mentor cards by category: 'all', 'n8n', 'voice', 'web', 'claude', 'mindset').",
        parameters: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description: "UI action: 'set_category_filter'"
            },
            value: {
              type: Type.STRING,
              description: "Parameter for the action (category name for filter)"
            }
          },
          required: ["action"]
        }
      }
    ]
  }
];

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
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

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

  // Session Ref
  const sessionRef = useRef<any>(null);

  // ─── Audio Helpers ──────────────────────────────────────────────
  const downsampleTo16k = (input: Float32Array, inputRate: number): Float32Array => {
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

  const decodeAudioData = async (b64: string, ctx: AudioContext): Promise<AudioBuffer> => {
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
  const handleToolCall = (fc: any): { status: string } => {
    let result = { status: "ok" };

    switch (fc.name) {
      case "control_website": {
        const target = (fc.args as any).target;
        const el = document.getElementById(target);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          result = { status: "scrolled_to_" + target };
        } else {
          result = { status: "element_not_found_" + target };
        }
        break;
      }

      case "update_calculator": {
        const { revenue, missedCalls } = fc.args as any;
        window.dispatchEvent(new CustomEvent('updateCalculator', {
          detail: { revenue, missedCalls }
        }));
        result = { status: "updated_calculator" };
        break;
      }

      case "highlight_element": {
        const { element_id } = fc.args as any;
        window.dispatchEvent(new CustomEvent('highlightElement', {
          detail: { id: element_id }
        }));
        result = { status: "highlighted_" + element_id };
        break;
      }

      case "navigate_carousel": {
        const { carousel, action } = fc.args as any;
        window.dispatchEvent(new CustomEvent('navigateCarousel', {
          detail: { carousel, action }
        }));
        result = { status: `navigated_${carousel}_${action}` };
        break;
      }

      case "toggle_theme": {
        const { mode, accent } = fc.args as any;
        window.dispatchEvent(new CustomEvent('toggleTheme', {
          detail: { mode, accent }
        }));
        result = { status: `theme_changed` };
        break;
      }

      case "open_cal_popup": {
        // Cal.com is loaded globally by Navbar.tsx
        const calApi = (window as any).Cal;
        if (calApi && calApi.ns && calApi.ns["let-s-talk"]) {
          calApi.ns["let-s-talk"]("openModal");
          result = { status: "cal_popup_opened" };
        } else {
          // Fallback: click the first cal.com button
          const calBtn = document.querySelector('[data-cal-link]') as HTMLElement;
          if (calBtn) {
            calBtn.click();
            result = { status: "cal_button_clicked" };
          } else {
            result = { status: "cal_not_available" };
          }
        }
        break;
      }

      case "trigger_animation": {
        const { target, effect } = fc.args as any;
        const el = document.getElementById(target);
        if (el) {
          const className = `reyna-animate-${effect}`;
          el.classList.add(className);
          setTimeout(() => el.classList.remove(className), 1500);
          result = { status: `animated_${target}_${effect}` };
        } else {
          result = { status: "element_not_found_" + target };
        }
        break;
      }

      case "toggle_section": {
        const { action, value } = fc.args as any;
        window.dispatchEvent(new CustomEvent('toggleSection', {
          detail: { action, value }
        }));
        result = { status: `section_${action}_${value || 'done'}` };
        break;
      }

      default:
        result = { status: "unknown_tool_" + fc.name };
    }

    return result;
  };

  // ─── Connect ──────────────────────────────────────────────────
  const connectToGemini = async () => {
    try {
      setError(null);
      setTranscript([]);
      setIsConnecting(true);

      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        setError("API Key is missing.");
        setIsConnecting(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const inputSampleRate = audioContextRef.current.sampleRate;

      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(outputAudioContextRef.current.destination);

      // Build dynamic system instruction with silence mode
      const silenceMode = localStorage.getItem('reyna-silence-mode') || 'checkin';
      const silenceContext = SILENCE_MODES[silenceMode as keyof typeof SILENCE_MODES] || SILENCE_MODES.checkin;
      const fullInstruction = SYSTEM_INSTRUCTION + '\n\n' + silenceContext;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: fullInstruction,
          tools: TOOLS,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            try {
              setIsConnecting(false);
              setConnected(true);

              // Short hum to wake the model
              const humRate = 16000;
              const duration = 0.2;
              const numSamples = humRate * duration;
              const humData = new Float32Array(numSamples);
              for (let i = 0; i < numSamples; i++) {
                const envelope = i < 500 ? i / 500 : (i > numSamples - 500 ? (numSamples - i) / 500 : 1);
                humData[i] = Math.sin(2 * Math.PI * 150 * i / humRate) * 0.1 * envelope;
              }
              const humBlob = createBlob(humData);

              setTimeout(() => {
                sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: humBlob });
                });
              }, 500);

              // Setup Mic Stream
              if (!audioContextRef.current) return;
              const source = audioContextRef.current.createMediaStreamSource(stream);
              inputSourceRef.current = source;
              const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
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

                const downsampledData = downsampleTo16k(inputData, inputSampleRate);
                const blob = createBlob(downsampledData);

                sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: blob });
                }).catch(() => {});
              };

              source.connect(processor);
              processor.connect(audioContextRef.current.destination);
            } catch (openErr) {
              setError("Failed to start mic streaming.");
            }
          },

          onmessage: async (msg: LiveServerMessage) => {
            // Handle Tool Calls
            if (msg.toolCall) {
              const responses = [];
              for (const fc of msg.toolCall.functionCalls) {
                const result = handleToolCall(fc);
                responses.push({
                  id: fc.id,
                  name: fc.name,
                  response: { result }
                });
              }
              sessionPromise.then(session => {
                session.sendToolResponse({ functionResponses: responses });
              });
            }

            // Handle Audio Output
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current) {
              const buffer = await decodeAudioData(audioData, outputAudioContextRef.current);
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
              sourcesRef.current.forEach(source => {
                try { source.stop(); } catch (e) { }
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAgentSpeaking(false);
            }

            // Handle AI Transcription
            const aiTranscription = msg.serverContent?.outputTranscription;
            if (aiTranscription && aiTranscription.text) {
              setTranscript(prev => {
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
                    isFinal: !!aiTranscription.finished
                  };
                  return newPrev;
                }
                return [
                  ...prev.map(m => m.speaker === 'ai' ? { ...m, isFinal: true } : m),
                  { speaker: 'ai' as const, text: aiTranscription.text as string, id: Math.random(), isFinal: !!aiTranscription.finished }
                ];
              });
            }

            // Handle turn complete
            if (msg.serverContent?.turnComplete) {
              setTranscript(prev => prev.map(m => ({ ...m, isFinal: true })));
            }

            // Handle User Transcription
            const userTranscription = msg.serverContent?.inputTranscription;
            if (userTranscription && userTranscription.text) {
              setTranscript(prev => {
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
                    isFinal: !!userTranscription.finished
                  };
                  return newPrev;
                }
                return [
                  ...prev.map(m => m.speaker === 'human' ? { ...m, isFinal: true } : m),
                  { speaker: 'human' as const, text: userTranscription.text as string, id: Math.random(), isFinal: !!userTranscription.finished }
                ];
              });
            }
          },

          onclose: () => {
            setConnected(false);
            setIsAgentSpeaking(false);
          },
          onerror: (e: ErrorEvent | Event) => {
            const msg = (e as ErrorEvent).message || 'Unknown WebSocket error';
            console.error('[Reyna] Live API error:', msg, e);
            setIsConnecting(false);
            setError(`Connection failed: ${msg}`);
            disconnect();
          }
        }
      });
      sessionRef.current = sessionPromise;

    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error('[Reyna] Connect error:', msg, e);
      setIsConnecting(false);
      setError(msg.includes('API') || msg.includes('key') || msg.includes('401') || msg.includes('403')
        ? `API error: ${msg}`
        : `Connection error: ${msg}`);
    }
  };

  // ─── Disconnect ───────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (inputSourceRef.current) { inputSourceRef.current.disconnect(); inputSourceRef.current = null; }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (outputAudioContextRef.current) { outputAudioContextRef.current.close(); outputAudioContextRef.current = null; }
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close()).catch(() => { });
      sessionRef.current = null;
    }
    setConnected(false);
    setIsConnecting(false);
    setIsAgentSpeaking(false);
    setIsUserSpeaking(false);
    setTranscript([]);
  }, []);

  return {
    connected,
    isConnecting,
    isAgentSpeaking,
    isUserSpeaking,
    error,
    transcript,
    connectToGemini,
    disconnect,
    // Stubs for Hero.tsx compatibility
    fallbackMode: false as const,
    isReconnecting: false as const,
  };
}
