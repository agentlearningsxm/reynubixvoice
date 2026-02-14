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
        description: "Visually highlight a specific element on the screen. Supported IDs: hero, calculator, input-revenue, input-calls, result-box, solutions, comparison, reviews",
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
        description: "Scroll the webpage to a specific section. Supported Targets: calculator, solutions, comparison, reviews, hero",
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
  const [error, setError] = useState<string | null>(null);

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);

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

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);

              source.onended = () =>
              {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0)
                {
                  setIsAgentSpeaking(false);
                }
              };

              setIsAgentSpeaking(true);
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
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden" id="hero">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center lg:text-left z-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card text-brand-primary text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
              </span>
              {t.hero.tag}
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold font-display tracking-tight leading-[1.1] mb-6 text-text-primary">
              {t.hero.headline} <span className="text-gradient-danger">{t.hero.headlineHighlight}</span>.
            </h1>

            <p className="text-lg lg:text-xl text-text-secondary mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {t.hero.subheadline}
              <span className="text-text-primary font-medium block mt-2"> {t.hero.payoff}</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Button size="lg" className="w-full sm:w-auto group" onClick={connected ? disconnect : connectToGemini}>
                {connected ? <MicOff className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                {connected ? "End Demo" : t.hero.listenSample}
              </Button>
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                {t.hero.bookDemo} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {error && (
              <div className="mt-4 flex items-center justify-center lg:justify-start gap-2 text-money-loss text-sm font-medium">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-text-secondary">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <img key={i} src={`https://picsum.photos/40/40?random=${i}`} alt="User" className="w-8 h-8 rounded-full border-2 border-bg-main" />
                ))}
              </div>
              <p>{t.hero.trustedBy}</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative lg:h-[600px] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-purple-500/20 rounded-full blur-[80px] animate-pulse-slow" />

            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-[320px] h-[640px] bg-bg-main border-[8px] border-bg-card rounded-[3rem] shadow-2xl overflow-hidden z-10"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-bg-card rounded-b-xl z-20"></div>

              <div className="w-full h-full bg-bg-main flex flex-col relative text-text-primary">
                <div className="flex-1 flex flex-col items-center justify-center pt-20 pb-10 px-6">
                  <div className="w-64 h-64 flex items-center justify-center mb-6 relative">
                    <VoiceOrb isActive={connected} isSpeaking={isAgentSpeaking} />
                  </div>
                  <h3 className="text-2xl font-semibold text-text-primary mb-2">
                    {connected ? 'Reyna (AI)' : 'Start Demo'}
                  </h3>
                  <p className="text-text-secondary text-sm font-mono">
                    {connected ? (isAgentSpeaking ? 'Speaking...' : 'Listening...') : 'Tap Green Button'}
                  </p>
                </div>
                <div className="h-24 bg-bg-card/50 backdrop-blur-md flex items-center justify-around px-8 pb-4">
                  <button
                    onClick={disconnect}
                    disabled={!connected}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors ${connected ? 'bg-red-500/20 hover:bg-red-500/40 text-red-500' : 'bg-bg-card text-text-secondary'
                      }`}
                  >
                    <PhoneCall className="w-5 h-5 rotate-[135deg]" />
                  </button>
                  <button
                    onClick={connected ? disconnect : connectToGemini}
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 ${!connected
                      ? 'bg-green-500 shadow-green-500/40 animate-pulse cursor-pointer'
                      : 'bg-text-primary text-bg-main'
                      }`}
                  >
                    {connected ? <Mic className="w-8 h-8" /> : <PhoneCall className="w-8 h-8" />}
                  </button>
                  <button className="w-12 h-12 rounded-full bg-bg-card flex items-center justify-center text-text-secondary">
                    <MicOff className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-20 right-0 glass-card p-4 rounded-xl flex items-center gap-3 shadow-xl z-20 max-w-[200px]"
            >
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold">
                {t.currency}
              </div>
              <div>
                <p className="text-xs text-text-secondary">{t.hero.widget.saved}</p>
                <p className="text-lg font-bold text-text-primary">{t.currency}12,450</p>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-40 left-[-20px] glass-card p-4 rounded-xl flex items-center gap-3 shadow-xl z-20"
            >
              <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-text-secondary">{t.hero.widget.booked}</p>
                <p className="text-sm font-bold text-text-primary">{t.hero.widget.time}</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;