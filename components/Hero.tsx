import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Calendar, ChevronRight, PhoneCall, Mic, MicOff, AlertCircle } from 'lucide-react';
import Button from './ui/Button';
import VoiceOrb from './ui/VoiceOrb';
import { useLanguage } from '../contexts/LanguageContext';
import { GoogleGenAI, LiveServerMessage, Modality, Type, Blob } from "@google/genai";
import { SYSTEM_INSTRUCTION } from './AgentPrompt';



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

const Hero: React.FC = () =>
{
  const { t } = useLanguage();

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
      console.log("[Reyna] connectToGemini called");
      console.log("[Reyna] API_KEY present:", !!process.env.VITE_GEMINI_API_KEY);

      if (!process.env.VITE_GEMINI_API_KEY)
      {
        console.error("[Reyna] API Key is missing! process.env.VITE_GEMINI_API_KEY =", process.env.VITE_GEMINI_API_KEY);
        setError("API Key is missing.");
        return;
      }

      console.log("[Reyna] Creating GoogleGenAI instance...");
      const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
      console.log("[Reyna] GoogleGenAI created. Has live?", !!ai.live);

      console.log("[Reyna] Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      console.log("[Reyna] Microphone access granted!");
      // We accept whatever sample rate the browser gives us, then we downsample later.
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const inputSampleRate = audioContextRef.current.sampleRate;
      console.log("[Reyna] Input AudioContext created, sampleRate:", inputSampleRate);

      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(outputAudioContextRef.current.destination);
      console.log("[Reyna] Output AudioContext created. Calling ai.live.connect()...");

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
              console.log("[Reyna] Gemini Live Connected!");
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
                }).catch(e => console.error("Session send error", e));
              };

              source.connect(processor);
              processor.connect(audioContextRef.current.destination);
              console.log("[Reyna] Mic streaming started!");
            } catch (openErr)
            {
              console.error("[Reyna] Error in onopen callback:", openErr);
              setError("Failed to start mic streaming.");
            }
          },
          onmessage: async (msg: LiveServerMessage) =>
          {
            // Handle Tool Calls
            if (msg.toolCall)
            {
              console.log("Tool Call Received:", msg.toolCall);
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
          onclose: (e) =>
          {
            console.log("[Reyna] Connection closed:", e);
            setConnected(false);
            setIsAgentSpeaking(false);
          },
          onerror: (err) =>
          {
            console.error("[Reyna] Gemini Live Error:", err);
            console.error("[Reyna] Error details:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
            setError("Connection failed. Check console for details.");
            disconnect();
          }
        }
      });
      sessionRef.current = sessionPromise;

    } catch (e)
    {
      console.error(e);
      setError("Failed to initialize audio.");
    }
  };

  const disconnect = () =>
  {
    console.log("[Reyna] Disconnecting...");
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
    console.log("[Reyna] Disconnected.");
  };

  return (
    <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-28 overflow-hidden" id="receptionist">

      {/* Dot-grid background */}
      <div className="absolute inset-0 dot-grid opacity-100 pointer-events-none" />

      {/* Top radial glow */}
      <div className="absolute inset-x-0 top-0 h-[700px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(14,165,233,0.11) 0%, transparent 70%)' }} />

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--bg-main), transparent)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center">

          {/* ── Left: Copy ── */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center lg:text-left z-10"
          >
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7 border"
              style={{
                background: 'rgba(14, 165, 233, 0.07)',
                borderColor: 'rgba(14, 165, 233, 0.2)',
              }}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
              </span>
              <span className="text-[10.5px] font-bold tracking-[0.12em] uppercase text-brand-primary">
                {t.hero.tag}
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-[3.2rem] lg:text-[4.25rem] xl:text-[4.75rem] font-bold font-display tracking-[-0.03em] leading-[1.04] mb-6 text-text-primary">
              {t.hero.headline}{' '}
              <span className="text-gradient-danger">{t.hero.headlineHighlight}</span>.
            </h1>

            {/* Subheadline */}
            <p className="text-base lg:text-lg text-text-secondary mb-9 max-w-[480px] mx-auto lg:mx-0 leading-[1.7]">
              {t.hero.subheadline}
              <span className="text-text-primary font-medium block mt-2">{t.hero.payoff}</span>
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <Button size="lg" className="w-full sm:w-auto group" onClick={connected ? disconnect : connectToGemini}>
                {connected ? <MicOff className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                {connected ? "End Demo" : t.hero.listenSample}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
                data-cal-link="reynubix-voice/let-s-talk"
                data-cal-namespace="let-s-talk"
                data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
              >
                {t.hero.bookDemo} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {error && (
              <div className="mt-4 flex items-center justify-center lg:justify-start gap-2 text-money-loss text-sm font-medium">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Social proof */}
            <div className="mt-9 flex items-center justify-center lg:justify-start gap-3 text-sm text-text-secondary">
              <div className="flex -space-x-2.5">
                {[11, 22, 33, 44].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 overflow-hidden shrink-0"
                    style={{ borderColor: 'var(--bg-main)' }}>
                    <img src={`https://picsum.photos/40/40?random=${i}`} alt="User" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium">{t.hero.trustedBy}</p>
            </div>
          </motion.div>

          {/* ── Right: Phone mockup ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative lg:h-[640px] flex items-center justify-center"
          >
            {/* Layered glow behind phone */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.14) 0%, rgba(99,102,241,0.06) 55%, transparent 75%)' }} />

            {/* Decorative orbit rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
              style={{ border: '1px solid rgba(14, 165, 233, 0.07)' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
              style={{ border: '1px solid rgba(255, 255, 255, 0.025)' }} />

            {/* Phone mockup */}
            <motion.div
              animate={{ y: [0, -18, 0] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-[300px] h-[620px] rounded-[3rem] overflow-hidden z-10"
              style={{
                background: 'linear-gradient(145deg, #141424 0%, #080810 55%, #10101e 100%)',
                boxShadow: `
                  0 0 0 1px rgba(255,255,255,0.07),
                  0 0 0 3px #080810,
                  0 0 0 4px rgba(255,255,255,0.05),
                  0 30px 70px -15px rgba(0,0,0,0.8),
                  0 10px 24px rgba(0,0,0,0.5),
                  0 0 100px -20px rgba(14, 165, 233, 0.12),
                  inset 0 1px 0 rgba(255,255,255,0.06)
                `,
              }}
            >
              {/* Side buttons */}
              <div className="absolute right-[-1px] top-[120px] w-[3px] h-[40px] rounded-l-sm"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.04))' }} />
              <div className="absolute right-[-1px] top-[175px] w-[3px] h-[60px] rounded-l-sm"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))' }} />
              <div className="absolute left-[-1px] top-[155px] w-[3px] h-[35px] rounded-r-sm"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02))' }} />

              {/* Dynamic Island */}
              <div className="absolute top-[12px] left-1/2 -translate-x-1/2 w-[110px] h-[30px] bg-black rounded-full z-20 flex items-center justify-center gap-2"
                style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)' }}>
                <div className="w-[9px] h-[9px] rounded-full bg-[#141424] border border-[#1e1e30]" />
                <div className="w-[5px] h-[5px] rounded-full bg-[#0a0a14]" />
              </div>

              {/* Screen */}
              <div className="w-full h-full flex flex-col relative"
                style={{ background: 'linear-gradient(180deg, #0a0a12 0%, #050508 40%, #080810 100%)' }}>

                {/* Voice area */}
                <div className="flex-1 flex flex-col items-center justify-center pt-16 pb-8 px-6">
                  <div className="w-52 h-52 flex items-center justify-center mb-7 relative">
                    <VoiceOrb isActive={connected} isSpeaking={isAgentSpeaking} isUserSpeaking={isUserSpeaking} />
                  </div>
                  <h3 className="text-xl font-semibold text-white/90 mb-1.5 tracking-wide font-display">
                    {connected ? 'Reyna' : 'Start Demo'}
                  </h3>
                  <p className="text-[10.5px] text-white/35 font-mono tracking-[0.22em] uppercase">
                    {connected ? (isAgentSpeaking ? '● Speaking' : '● Listening') : 'Tap to Connect'}
                  </p>
                </div>

                {/* Controls */}
                <div className="h-28 flex items-center justify-around px-8 pb-6"
                  style={{
                    background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.018) 100%)',
                    borderTop: '1px solid rgba(255,255,255,0.035)'
                  }}>
                  <button
                    onClick={disconnect}
                    disabled={!connected}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      background: connected ? 'rgba(239, 68, 68, 0.13)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${connected ? 'rgba(239, 68, 68, 0.28)' : 'rgba(255,255,255,0.05)'}`,
                      color: connected ? '#ef4444' : 'rgba(255,255,255,0.18)',
                    }}
                  >
                    <PhoneCall className="w-5 h-5 rotate-[135deg]" />
                  </button>

                  <button
                    onClick={connected ? disconnect : connectToGemini}
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                    style={{
                      background: !connected
                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                        : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                      boxShadow: !connected
                        ? '0 0 24px rgba(34, 197, 94, 0.45), 0 4px 14px rgba(0,0,0,0.35)'
                        : '0 4px 14px rgba(0,0,0,0.35)',
                      color: !connected ? 'white' : '#0f172a',
                      animation: !connected ? 'phone-btn-pulse 2s ease-in-out infinite' : 'none',
                    }}
                  >
                    {connected ? <Mic className="w-7 h-7" /> : <PhoneCall className="w-7 h-7" />}
                  </button>

                  <button className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.2)',
                    }}
                  >
                    <MicOff className="w-5 h-5" />
                  </button>
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-[3px] rounded-full bg-white/[0.08]" />
              </div>

              <style>{`
                @keyframes phone-btn-pulse {
                  0%, 100% { box-shadow: 0 0 24px rgba(34, 197, 94, 0.4), 0 4px 14px rgba(0,0,0,0.3); }
                  50% { box-shadow: 0 0 36px rgba(34, 197, 94, 0.65), 0 4px 18px rgba(0,0,0,0.4); }
                }
              `}</style>
            </motion.div>

            {/* Floating widget — top right: revenue saved */}
            <motion.div
              animate={{ y: [0, 14, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-16 right-[-8px] lg:right-0 glass-card px-4 py-3 rounded-2xl flex items-center gap-3 z-20 max-w-[195px]"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset' }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-base"
                style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                {t.currency}
              </div>
              <div>
                <p className="text-[10px] font-medium text-text-secondary leading-tight">{t.hero.widget.saved}</p>
                <p className="text-base font-bold text-text-primary leading-tight mt-0.5">{t.currency}12,450</p>
              </div>
            </motion.div>

            {/* Floating widget — left: appointment booked */}
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-36 left-[-24px] lg:left-[-28px] glass-card px-4 py-3 rounded-2xl flex items-center gap-3 z-20"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset' }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#0EA5E9' }}>
                <Calendar className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-text-secondary leading-tight">{t.hero.widget.booked}</p>
                <p className="text-sm font-bold text-text-primary leading-tight mt-0.5">{t.hero.widget.time}</p>
              </div>
            </motion.div>

            {/* Floating widget — bottom right: calls answered */}
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute bottom-12 right-[-4px] lg:right-2 glass-card px-4 py-3 rounded-2xl flex items-center gap-3 z-20"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset' }}
            >
              <div className="w-2 h-2 rounded-full bg-green-400 shrink-0 animate-pulse" />
              <p className="text-xs font-semibold text-text-primary whitespace-nowrap">100% Answer Rate</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;