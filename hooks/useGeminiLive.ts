import { useState, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, Blob } from '@google/genai';
import { SYSTEM_INSTRUCTION } from '../components/AgentPrompt';

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "highlight_element",
        description: "Visually highlight a specific element on the screen. Supported IDs: receptionist, calculator, input-revenue, input-calls, result-box, solutions, comparison, automations, reviews",
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
        description: "Scroll the webpage to a specific section. Supported Targets: receptionist, calculator, solutions, comparison, automations, reviews",
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
        description: "Update the values in the Revenue Loss Calculator.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            revenue: { type: Type.NUMBER, description: "Average revenue per customer" },
            missedCalls: { type: Type.NUMBER, description: "Missed calls per day" }
          },
          required: ["revenue", "missedCalls"]
        }
      }
    ]
  }
];

export function useGeminiLive() {
  // Connection State
  const [connected, setConnected] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false); // New state for user speech
  const [error, setError] = useState<string | null>(null);

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);

  // Volume detection ref to avoid state spam
  const userSpeakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Playback Queue
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Session Ref
  const sessionRef = useRef<any>(null);

  // Helper: Downsample audio to 16kHz
  const downsampleTo16k = (input: Float32Array, inputRate: number): Float32Array =>
  {
    if (inputRate === 16000) return input;
    const ratio = inputRate / 16000;
    const newLength = Math.floor(input.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++)
    {
      result[i] = input[Math.floor(i * ratio)];
    }
    return result;
  };

  // Helper: Calculate RMS (Root Mean Square) for volume detection
  const calculateRMS = (buffer: Float32Array): number =>
  {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++)
    {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  };

  // Audio Processing Helpers
  const createBlob = (data: Float32Array): Blob =>
  {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++)
    {
      // Clamp values to prevent overflow/distortion
      const val = Math.max(-1, Math.min(1, data[i]));
      int16[i] = val * 32767;
    }
    const uint8 = new Uint8Array(int16.buffer);
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++)
    {
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
    ctx: AudioContext
  ): Promise<AudioBuffer> =>
  {
    const binaryString = atob(b64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++)
    {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++)
    {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const connectToGemini = async () =>
  {
    try
    {
      setError(null);

      if (!import.meta.env.VITE_GEMINI_API_KEY)
      {
        setError("API Key is missing.");
        return;
      }

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      // We accept whatever sample rate the browser gives us, then we downsample later.
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const inputSampleRate = audioContextRef.current.sampleRate;

      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(outputAudioContextRef.current.destination);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: TOOLS,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
        },
        callbacks: {
          onopen: () =>
          {
            try
            {
              setConnected(true);

              // 1. Generate Synthetic Hum (at 16k directly)
              // Shortened to 200ms to avoid buffer overflow issues on init
              const humRate = 16000;
              const duration = 0.2;
              const numSamples = humRate * duration;
              const humData = new Float32Array(numSamples);

              for (let i = 0; i < numSamples; i++)
              {
                // Smooth fade in/out
                const envelope = i < 500 ? i / 500 : (i > numSamples - 500 ? (numSamples - i) / 500 : 1);
                humData[i] = Math.sin(2 * Math.PI * 150 * i / humRate) * 0.1 * envelope;
              }
              const humBlob = createBlob(humData);

              // 2. Delay sending the hum slightly to ensure session is ready
              setTimeout(() =>
              {
                sessionPromise.then(session =>
                {
                  session.sendRealtimeInput({ media: humBlob });
                });
              }, 500);

              // 3. Setup Mic Stream
              if (!audioContextRef.current) return;
              const source = audioContextRef.current.createMediaStreamSource(stream);
              inputSourceRef.current = source;
              const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

              processor.onaudioprocess = (e) =>
              {
                const inputData = e.inputBuffer.getChannelData(0);

                // --- User Speaking Detection ---
                // Only detect user speech when agent is NOT speaking
                // to prevent echo/feedback from agent audio triggering this
                if (sourcesRef.current.size === 0)
                {
                  const rms = calculateRMS(inputData);
                  const speakingThreshold = 0.015; // Sensitive but not too noisy

                  if (rms > speakingThreshold)
                  {
                    setIsUserSpeaking(true);

                    // Clear existing timeout to keep "speaking" true while talking
                    if (userSpeakingTimeoutRef.current)
                    {
                      clearTimeout(userSpeakingTimeoutRef.current);
                    }

                    // Set timeout to false after brief silence
                    userSpeakingTimeoutRef.current = setTimeout(() =>
                    {
                      setIsUserSpeaking(false);
                    }, 300); // 300ms of silence = stopped speaking (snappier)
                  }
                } else
                {
                  // Agent is speaking — force user speaking off
                  setIsUserSpeaking(false);
                }
                // -------------------------------

                // IMPORTANT: Downsample to 16000Hz before creating blob
                const downsampledData = downsampleTo16k(inputData, inputSampleRate);
                const blob = createBlob(downsampledData);

                sessionPromise.then(session =>
                {
                  session.sendRealtimeInput({ media: blob });
                }).catch(() => {});
              };

              source.connect(processor);
              processor.connect(audioContextRef.current.destination);
            } catch (openErr)
            {
              setError("Failed to start mic streaming.");
            }
          },
          onmessage: async (msg: LiveServerMessage) =>
          {
            // Handle Tool Calls
            if (msg.toolCall)
            {
              const responses = [];

              for (const fc of msg.toolCall.functionCalls)
              {
                let result = { status: "ok" };

                if (fc.name === "control_website")
                {
                  const target = (fc.args as any).target;
                  const el = document.getElementById(target);
                  if (el)
                  {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    result = { status: "scrolled_to_" + target };
                  }
                } else if (fc.name === "update_calculator")
                {
                  const { revenue, missedCalls } = fc.args as any;
                  const event = new CustomEvent('updateCalculator', {
                    detail: { revenue, missedCalls }
                  });
                  window.dispatchEvent(event);
                  result = { status: "updated_calculator" };
                } else if (fc.name === "highlight_element")
                {
                  const { element_id } = fc.args as any;
                  const event = new CustomEvent('highlightElement', {
                    detail: { id: element_id }
                  });
                  window.dispatchEvent(event);
                  result = { status: "highlighted_" + element_id };
                }

                responses.push({
                  id: fc.id,
                  name: fc.name,
                  response: { result }
                });
              }

              sessionPromise.then(session =>
              {
                session.sendToolResponse({ functionResponses: responses });
              });
            }

            // Handle Audio Output
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputAudioContextRef.current)
            {
              const buffer = await decodeAudioData(audioData, outputAudioContextRef.current);
              const now = outputAudioContextRef.current.currentTime;
              if (nextStartTimeRef.current < now)
              {
                nextStartTimeRef.current = now;
              }

              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(outputNodeRef.current!);

              const scheduledStart = nextStartTimeRef.current;
              source.start(scheduledStart);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);

              // Set speaking TRUE when this chunk actually starts playing
              const delayUntilPlay = Math.max(0, (scheduledStart - now) * 1000);
              setTimeout(() =>
              {
                if (sourcesRef.current.has(source))
                {
                  setIsAgentSpeaking(true);
                }
              }, delayUntilPlay);

              source.onended = () =>
              {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0)
                {
                  setIsAgentSpeaking(false);
                }
              };
            }

            if (msg.serverContent?.interrupted)
            {
              sourcesRef.current.forEach(source =>
              {
                try { source.stop(); } catch (e) { }
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAgentSpeaking(false);
            }
          },
          onclose: () =>
          {
            setConnected(false);
            setIsAgentSpeaking(false);
          },
          onerror: () =>
          {
            setError("Connection failed. Please try again.");
            disconnect();
          }
        }
      });
      sessionRef.current = sessionPromise;

    } catch (e)
    {
      setError("Failed to initialize audio.");
    }
  };

  const disconnect = () =>
  {
    if (inputSourceRef.current) { inputSourceRef.current.disconnect(); inputSourceRef.current = null; }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    // Stop all mic tracks to remove the red recording indicator
    if (mediaStreamRef.current)
    {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (outputAudioContextRef.current) { outputAudioContextRef.current.close(); outputAudioContextRef.current = null; }
    if (sessionRef.current)
    {
      sessionRef.current.then((session: any) => session.close()).catch(() => { });
      sessionRef.current = null;
    }
    setConnected(false);
    setIsAgentSpeaking(false);
  };

  return { connected, isAgentSpeaking, isUserSpeaking, error, connectToGemini, disconnect };
}
