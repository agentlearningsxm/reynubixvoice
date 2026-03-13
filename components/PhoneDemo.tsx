// components/PhoneDemo.tsx
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { LoaderCircle, Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { TranscriptEntry } from '../hooks/useGeminiLive';
import ConstellationOrb, { type OrbState } from './ui/ConstellationOrb';

interface PhoneDemoProps {
  connected: boolean;
  isConnecting: boolean;
  isAgentSpeaking: boolean;
  isUserSpeaking: boolean;
  error: string | null;
  transcript: TranscriptEntry[];
  isLiveSession: boolean;
  isReconnecting: boolean;
  isGroqActive: boolean;
  consentAccepted: boolean;
  consentError: string | null;
  onConsentChange: (accepted: boolean) => void;
  onPhoneButtonClick: () => void;
}

function getOrbState(props: PhoneDemoProps): OrbState {
  if (props.error) return 'error';
  if (props.isConnecting) return 'connecting';
  if (props.isAgentSpeaking) return 'agent_speaking';
  if (props.isUserSpeaking) return 'user_speaking';
  return 'idle';
}

const PhoneDemo: React.FC<PhoneDemoProps> = (props) => {
  const { t } = useLanguage();
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = transcriptContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [props.transcript]);

  const orbState = getOrbState(props);
  const orbSize = props.connected ? 80 : 160;

  let phoneTitle = t.hero.live.idleTitle;
  let phoneSubtitle = t.hero.live.idleSubtitle;

  if (props.error) {
    phoneTitle = t.hero.live.errorTitle;
    phoneSubtitle = props.error;
  } else if (props.isConnecting) {
    phoneTitle = t.hero.live.connectingTitle;
    phoneSubtitle = t.hero.live.connectingSubtitle;
  } else if (props.connected) {
    phoneTitle = t.hero.live.connectedTitle;
    if (props.isAgentSpeaking) phoneSubtitle = t.hero.live.speaking;
    else if (props.isUserSpeaking) phoneSubtitle = t.hero.live.listening;
    else phoneSubtitle = t.hero.live.connectedSubtitle;
  }

  const callBtnBg = props.connected
    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    : props.isConnecting
      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
      : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';

  const callBtnShadow = props.connected
    ? '0 0 24px rgba(239,68,68,0.45), 0 4px 12px rgba(0,0,0,0.3)'
    : props.isConnecting
      ? '0 0 24px rgba(245,158,11,0.4), 0 4px 12px rgba(0,0,0,0.3)'
      : '0 0 20px rgba(34,197,94,0.4), 0 4px 12px rgba(0,0,0,0.3)';

  return (
    <LayoutGroup>
      <div
        className="relative w-[320px] rounded-[2.5rem] overflow-hidden flex flex-col"
        style={{
          height: 'clamp(520px, 58vw, 620px)',
          background: 'linear-gradient(145deg, #1a1a2e 0%, #0a0a0f 50%, #16162a 100%)',
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.06),
            0 0 0 3px #0a0a0f,
            0 0 0 4px rgba(255,255,255,0.08),
            0 25px 60px -12px rgba(0,0,0,0.7),
            0 8px 20px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.05)
          `,
        }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-2xl z-20" />

        {/* Inner screen */}
        <div
          className="absolute inset-[3px] rounded-[2.3rem] overflow-hidden flex flex-col"
          style={{ background: 'linear-gradient(180deg, #0c0c14 0%, #060609 40%, #0a0a12 100%)' }}
        >
          {/* ── STATUS BAR ─────────────────────────────── */}
          <div className="pt-8 pb-3 px-5 shrink-0 flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  props.error
                    ? 'bg-red-400'
                    : props.isLiveSession
                      ? 'bg-green-400 animate-pulse'
                      : 'bg-[#4fa8ff]'
                }`}
              />
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/70 whitespace-nowrap">
                {props.isLiveSession ? t.hero.live.sessionLabel : t.hero.tag}
              </span>
            </div>
            {props.isGroqActive && (
              <span className="text-[9px] text-amber-400 font-medium tracking-wider uppercase">
                Backup
              </span>
            )}
            {props.isReconnecting && (
              <span className="text-[9px] text-yellow-300/80 font-medium tracking-wider uppercase animate-pulse">
                Reconnecting…
              </span>
            )}
          </div>

          {/* ── ORB — shrinks to 80px when connected ────── */}
          <motion.div
            layout
            className="flex justify-center shrink-0"
            style={{ paddingBottom: props.connected ? 8 : 16 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <ConstellationOrb state={orbState} size={orbSize} />
          </motion.div>

          {/* ── TITLE + SUBTITLE (idle / connecting) ─────── */}
          <AnimatePresence mode="wait">
            {!props.connected && (
              <motion.div
                key="idle-text"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="text-center px-5 shrink-0 mb-2"
              >
                <h2 className="text-white text-xl font-bold mb-1">{phoneTitle}</h2>
                <p className="text-[11px] leading-[1.55] text-white/55">{phoneSubtitle}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── TRANSCRIPT (connected only) ──────────────── */}
          <AnimatePresence>
            {props.connected && (
              <motion.div
                key="transcript"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex-1 mx-4 mb-3 min-h-0 overflow-hidden"
              >
                <div
                  ref={transcriptContainerRef}
                  className="h-full overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 space-y-3"
                  style={{ maxHeight: 210 }}
                >
                  {props.transcript.filter((e) => e.text.trim()).length === 0 ? (
                    <p className="text-[11px] text-white/40 text-center pt-2">{phoneSubtitle}</p>
                  ) : (
                    props.transcript
                      .filter((e) => e.text.trim())
                      .map((entry) => (
                        <div key={entry.id}>
                          <p
                            className="text-[9px] font-bold uppercase tracking-[0.16em] mb-0.5"
                            style={{ color: entry.speaker === 'ai' ? '#4fa8ff' : '#38bdf8' }}
                          >
                            {entry.speaker === 'ai' ? t.hero.widget.agent : t.hero.live.userLabel}
                          </p>
                          <p className="text-[12px] leading-[1.6] text-white/80">{entry.text}</p>
                        </div>
                      ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── CONSENT (pre-connect only) ────────────────── */}
          <AnimatePresence>
            {!props.connected && (
              <motion.div
                key="consent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mx-4 mb-3 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
              >
                <label className="flex items-start gap-2.5 text-[10.5px] leading-[1.5] text-white/75 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={props.consentAccepted}
                    onChange={(e) => props.onConsentChange(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-white/25 bg-white/10 text-[#4fa8ff] shrink-0 cursor-pointer"
                  />
                  <span>{t.hero.live.consentLabel}</span>
                </label>
                <p className="mt-1.5 text-[10px] text-white/50 pl-6">{t.hero.live.consentHelp}</p>
                {props.consentError && (
                  <p className="mt-1 text-[9.5px] text-red-300 pl-6">{props.consentError}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── CONTROLS ─────────────────────────────────── */}
          <div className="flex items-center justify-center gap-6 pb-6 pt-1 shrink-0">
            <div
              className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors ${
                props.connected
                  ? 'bg-red-500/10 border-red-400/30 text-red-300'
                  : 'bg-white/[0.04] border-white/10 text-white/25'
              }`}
            >
              <PhoneOff size={18} />
            </div>

            <button
              type="button"
              onClick={props.onPhoneButtonClick}
              disabled={props.isConnecting}
              aria-label={props.connected ? t.hero.live.endButtonLabel : t.hero.live.startButtonLabel}
              aria-busy={props.isConnecting}
              aria-pressed={props.connected}
              className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-transform duration-200 active:scale-95 disabled:active:scale-100 disabled:cursor-wait disabled:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060b]"
              style={{
                background: callBtnBg,
                boxShadow: callBtnShadow,
                animation:
                  props.connected || props.isConnecting
                    ? 'none'
                    : 'phoneBtnPulse 2s ease-in-out infinite',
              }}
            >
              {props.isConnecting ? (
                <LoaderCircle size={28} className="animate-spin" />
              ) : props.connected ? (
                <PhoneOff size={28} />
              ) : (
                <Phone size={28} />
              )}
            </button>

            <div
              className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors ${
                props.isUserSpeaking
                  ? 'bg-sky-500/[0.12] border-sky-400/30 text-sky-300'
                  : 'bg-white/[0.04] border-white/10 text-white/25'
              }`}
            >
              {props.isUserSpeaking ? <Mic size={18} /> : <MicOff size={18} />}
            </div>
          </div>

          <style>{`
            @keyframes phoneBtnPulse {
              0%, 100% { box-shadow: 0 0 20px rgba(34,197,94,0.4), 0 4px 12px rgba(0,0,0,0.3); }
              50%       { box-shadow: 0 0 32px rgba(34,197,94,0.65), 0 4px 16px rgba(0,0,0,0.4); }
            }
          `}</style>
        </div>
      </div>
    </LayoutGroup>
  );
};

export default PhoneDemo;
