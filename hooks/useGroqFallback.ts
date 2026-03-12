import { useCallback, useRef, useState } from 'react';
import { SILENCE_MODES, SYSTEM_INSTRUCTION } from '../components/AgentPrompt';

// Match the TranscriptEntry shape from useGeminiLive
export interface TranscriptEntry {
  id: number;
  speaker: 'ai' | 'human';
  text: string;
  isFinal: boolean;
}

interface GroqMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function useGroqFallback() {
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const conversationHistoryRef = useRef<GroqMessage[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const groqClientRef = useRef<any>(null);
  const isProcessingRef = useRef(false);
  const isAgentSpeakingRef = useRef(false); // ref for use inside callbacks
  const isConnectedRef = useRef(false); // ref for use inside recognition.onend

  const appendTranscript = useCallback((speaker: 'ai' | 'human', text: string) => {
    setTranscript((prev) => [
      ...prev,
      { speaker, text, id: Date.now() + Math.random(), isFinal: true },
    ]);
  }, []);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Pick best available voice
      const loadVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const preferred =
            voices.find((v) => v.lang === 'en-US' && /neural|natural/i.test(v.name)) ||
            voices.find((v) => v.lang === 'en-US') ||
            voices[0];
          if (preferred) utterance.voice = preferred;
        }
      };

      loadVoice();
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', loadVoice, { once: true });
      }

      isAgentSpeakingRef.current = true;
      utterance.onstart = () => setIsAgentSpeaking(true);
      utterance.onend = () => {
        isAgentSpeakingRef.current = false;
        setIsAgentSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        isAgentSpeakingRef.current = false;
        setIsAgentSpeaking(false);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const sendToGroq = useCallback(async (userText: string) => {
    if (!groqClientRef.current || isProcessingRef.current) return;
    isProcessingRef.current = true;

    conversationHistoryRef.current.push({ role: 'user', content: userText });
    appendTranscript('human', userText);

    try {
      const response = await groqClientRef.current.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: conversationHistoryRef.current,
        max_tokens: 200,
        temperature: 0.7,
      });

      const aiText =
        response.choices[0]?.message?.content ??
        "Sorry, I had a hiccup. Could you repeat that?";

      conversationHistoryRef.current.push({ role: 'assistant', content: aiText });
      appendTranscript('ai', aiText);
      await speak(aiText);
    } catch (err) {
      console.error('[Reyna Groq] API error:', err);
      const fallbackMsg = "I'm having a moment — please try again.";
      appendTranscript('ai', fallbackMsg);
      await speak(fallbackMsg);
    } finally {
      isProcessingRef.current = false;
    }
  }, [appendTranscript, speak]);

  const connect = useCallback(async () => {
    if (isConnectedRef.current || isConnecting) return;
    setIsConnecting(true);
    setError(null);

    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      setError('Backup voice service unavailable.');
      setIsConnecting(false);
      return;
    }

    // Firefox guard
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setError('Backup voice mode requires Chrome or Edge.');
      setIsConnecting(false);
      return;
    }

    // Lazy-load groq-sdk
    try {
      const { default: Groq } = await import('groq-sdk');
      groqClientRef.current = new Groq({
        apiKey,
        dangerouslyAllowBrowser: true,
      });
    } catch (err) {
      console.error('[Reyna Groq] Failed to load Groq SDK:', err);
      setError('Backup voice service failed to load.');
      setIsConnecting(false);
      return;
    }

    // Build system prompt — KNOWLEDGE_BASE will be injected by SYSTEM_INSTRUCTION after Agent A's changes
    const silenceMode = localStorage.getItem('reyna-silence-mode') || 'checkin';
    const silenceContext =
      SILENCE_MODES[silenceMode as keyof typeof SILENCE_MODES] ?? SILENCE_MODES.checkin;
    const systemPrompt = `${SYSTEM_INSTRUCTION}\n\n${silenceContext}\n\nIMPORTANT: You are in backup voice mode (browser speech synthesis). Keep responses under 2 sentences. No bullet points or lists. Speak naturally.`;

    conversationHistoryRef.current = [{ role: 'system', content: systemPrompt }];

    // Set up Speech Recognition
    const recognition = new SpeechRecognitionAPI() as SpeechRecognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onspeechstart = () => setIsUserSpeaking(true);
    recognition.onspeechend = () => setIsUserSpeaking(false);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Prevent feedback loop — ignore results while agent is speaking
      if (isAgentSpeakingRef.current) return;

      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const text = result[0].transcript.trim();
        if (text.length > 2) {
          void sendToGroq(text);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.error('[Reyna Groq] SpeechRecognition error:', event.error);
    };

    recognition.onend = () => {
      // Auto-restart unless disconnected
      if (isConnectedRef.current && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (_e) {}
      }
    };

    recognition.onstart = () => {
      isConnectedRef.current = true;
      setConnected(true);
      setIsConnecting(false);
    };

    try {
      recognition.start();

      // Greeting after short delay
      setTimeout(async () => {
        if (!isConnectedRef.current) return;
        const greeting = "Hey! I'm Reyna, running in backup mode. How can I help you?";
        conversationHistoryRef.current.push({ role: 'assistant', content: greeting });
        appendTranscript('ai', greeting);
        await speak(greeting);
      }, 600);
    } catch (err) {
      setError('Could not start voice input — please allow microphone access.');
      setIsConnecting(false);
    }
  }, [isConnecting, sendToGroq, speak, appendTranscript]);

  const disconnect = useCallback(() => {
    window.speechSynthesis.cancel();
    isConnectedRef.current = false;
    isAgentSpeakingRef.current = false;
    isProcessingRef.current = false;

    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // prevent auto-restart
      recognitionRef.current.onresult = null;
      try { recognitionRef.current.stop(); } catch (_e) {}
      recognitionRef.current = null;
    }

    groqClientRef.current = null;
    conversationHistoryRef.current = [];
    setConnected(false);
    setIsConnecting(false);
    setIsAgentSpeaking(false);
    setIsUserSpeaking(false);
    setError(null);
    setTranscript([]);
  }, []);

  return {
    connected,
    isConnecting,
    isAgentSpeaking,
    isUserSpeaking,
    error,
    transcript,
    connect,
    disconnect,
  };
}
