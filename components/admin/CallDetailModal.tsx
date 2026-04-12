import { motion } from 'framer-motion';
import {
  AlertTriangle,
  AudioLines,
  Calendar,
  Clock,
  Headphones,
  MessageSquare,
  Phone,
  Star,
  X,
} from 'lucide-react';
import type { MouseEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

interface CallRecord {
  id: string;
  call_date: string;
  call_time: string;
  duration_sec: number;
  language: string;
  session_id: string;
  ai_summary: string | null;
  sentiment: string | null;
  calculator_used: boolean;
  booking_requested: boolean;
  call_quality_score: number | null;
  call_outcome: string | null;
  failure_source: string | null;
  recording_url: string | null;
  full_transcript: string | null;
  error_log: string | null;
  errors_detected: string | null;
  prompt_fix_recommendations: string | null;
  revenue_entered: string | null;
  missed_calls: string | null;
  lead_name: string | null;
  lead_email: string | null;
  lead_company: string | null;
  lead_phone: string | null;
  session_status: string | null;
  session_started_at: string | null;
}

interface CallDetailModalProps {
  call: CallRecord;
  onClose: () => void;
}

function sentimentColor(sentiment: string | null): string {
  switch (sentiment) {
    case 'positive':
      return 'bg-money-gain/10 text-money-gain';
    case 'negative':
      return 'bg-money-loss/10 text-money-loss';
    case 'frustrated':
      return 'bg-money-loss/10 text-money-loss';
    default:
      return 'bg-text-muted-strong/10 text-text-muted-strong';
  }
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export function CallDetailModal({ call, onClose }: CallDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<
    'transcript' | 'analysis' | 'errors'
  >('transcript');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleBackdropClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  const transcriptLines = call.full_transcript
    ? call.full_transcript.split('\n')
    : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdropClick}
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="bg-surface-overlay border border-border-subtle rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-brand-primary/10">
              <Phone className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">
                Call Details
              </h3>
              <p className="text-xs text-text-muted-strong">
                Session: {call.session_id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-control-surface-hover transition-colors text-text-muted-strong"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Info Bar */}
        <div className="flex flex-wrap items-center gap-4 px-6 py-3 bg-surface-raised border-b border-border-subtle text-sm">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Calendar className="w-3.5 h-3.5" />
            <span>{call.call_date}</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Clock className="w-3.5 h-3.5" />
            <span>{call.call_time}</span>
          </div>
          <span className="text-text-secondary">
            Duration: {formatDuration(call.duration_sec)}
          </span>
          <span
            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sentimentColor(call.sentiment)}`}
          >
            {call.sentiment || 'N/A'}
          </span>
          {call.call_quality_score != null && (
            <span className="flex items-center gap-1 text-text-secondary">
              <Star className="w-3.5 h-3.5 text-brand-primary" />
              {call.call_quality_score}/10
            </span>
          )}
          {call.recording_url && (
            <span className="flex items-center gap-1 text-brand-primary">
              <Headphones className="w-3.5 h-3.5" />
              Recording available
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-border-subtle">
          {[
            {
              key: 'transcript' as const,
              label: 'Transcript',
              icon: MessageSquare,
            },
            { key: 'analysis' as const, label: 'AI Analysis', icon: Star },
            {
              key: 'errors' as const,
              label: 'Errors & Tools',
              icon: AlertTriangle,
            },
          ].map((tab) => (
            <button
              type="button"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-brand-primary/10 text-brand-primary'
                  : 'text-text-muted-strong hover:text-text-primary'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'transcript' && (
            <div className="space-y-3">
              {transcriptLines.length > 0 ? (
                transcriptLines.map((line, i) => {
                  const isAi = line.startsWith('Reyna:');
                  const content = line.replace(/^(Reyna|Guest):\s*/, '');
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.5) }}
                      className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                          isAi
                            ? 'bg-surface-raised border border-border-subtle text-text-primary'
                            : 'bg-brand-primary/10 text-text-primary'
                        }`}
                      >
                        <p className="text-xs font-medium text-text-muted-strong mb-1">
                          {isAi ? 'Reyna (AI)' : 'Guest'}
                        </p>
                        <p className="leading-relaxed">{content}</p>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="w-10 h-10 text-text-muted-strong/30 mb-2" />
                  <p className="text-sm text-text-secondary">
                    No transcript available
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <div className="bg-surface-raised border border-border-subtle rounded-xl p-5">
                <h4 className="text-sm font-semibold text-text-primary mb-2">
                  AI Summary
                </h4>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {call.ai_summary || 'No summary available'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-raised border border-border-subtle rounded-xl p-4">
                  <p className="text-xs text-text-secondary mb-1">Sentiment</p>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sentimentColor(call.sentiment)}`}
                  >
                    {call.sentiment || 'N/A'}
                  </span>
                </div>
                <div className="bg-surface-raised border border-border-subtle rounded-xl p-4">
                  <p className="text-xs text-text-secondary mb-1">
                    Quality Score
                  </p>
                  <p className="text-2xl font-bold text-text-primary">
                    {call.call_quality_score ?? 'N/A'}
                    {call.call_quality_score != null && (
                      <span className="text-sm text-text-secondary">/10</span>
                    )}
                  </p>
                </div>
                <div className="bg-surface-raised border border-border-subtle rounded-xl p-4">
                  <p className="text-xs text-text-secondary mb-1">Outcome</p>
                  <p className="text-sm font-medium text-text-primary">
                    {call.call_outcome
                      ? call.call_outcome.replace(/-/g, ' ')
                      : 'N/A'}
                  </p>
                </div>
                <div className="bg-surface-raised border border-border-subtle rounded-xl p-4">
                  <p className="text-xs text-text-secondary mb-1">
                    Failure Source
                  </p>
                  <p className="text-sm font-medium text-text-primary">
                    {call.failure_source
                      ? call.failure_source.charAt(0).toUpperCase() +
                        call.failure_source.slice(1)
                      : 'None'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-raised border border-border-subtle rounded-xl p-4">
                  <p className="text-xs text-text-secondary mb-1">Language</p>
                  <p className="text-sm font-medium text-text-primary">
                    {call.language}
                  </p>
                </div>
                <div className="bg-surface-raised border border-border-subtle rounded-xl p-4">
                  <p className="text-xs text-text-secondary mb-1">Lead</p>
                  <p className="text-sm font-medium text-text-primary">
                    {call.lead_name || 'Unknown'}
                  </p>
                  {call.lead_email && (
                    <p className="text-xs text-text-muted-strong mt-0.5">
                      {call.lead_email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'errors' && (
            <div className="space-y-6">
              <div className="bg-surface-raised border border-border-subtle rounded-xl p-5">
                <h4 className="text-sm font-semibold text-text-primary mb-3">
                  Tool Usage
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${call.calculator_used ? 'bg-money-gain' : 'bg-text-muted-strong'}`}
                    />
                    <span className="text-sm text-text-secondary">
                      Calculator: {call.calculator_used ? 'Used' : 'Not used'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${call.booking_requested ? 'bg-money-gain' : 'bg-text-muted-strong'}`}
                    />
                    <span className="text-sm text-text-secondary">
                      Booking:{' '}
                      {call.booking_requested ? 'Requested' : 'Not requested'}
                    </span>
                  </div>
                  {call.revenue_entered && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand-primary" />
                      <span className="text-sm text-text-secondary">
                        Revenue: {call.revenue_entered}
                      </span>
                    </div>
                  )}
                  {call.missed_calls && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-money-loss" />
                      <span className="text-sm text-text-secondary">
                        Missed Calls: {call.missed_calls}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {call.errors_detected &&
                call.errors_detected !== 'None detected' && (
                  <div className="bg-surface-raised border border-border-subtle rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-money-loss" />
                      Errors Detected
                    </h4>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {call.errors_detected}
                    </p>
                  </div>
                )}

              {call.prompt_fix_recommendations &&
                call.prompt_fix_recommendations !== 'No changes needed' && (
                  <div className="bg-surface-raised border border-border-subtle rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-text-primary mb-2">
                      Prompt Recommendations
                    </h4>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {call.prompt_fix_recommendations}
                    </p>
                  </div>
                )}

              {call.error_log && call.error_log !== 'None' && (
                <div className="bg-surface-raised border border-border-subtle rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-text-primary mb-2">
                    Error Log
                  </h4>
                  <pre className="text-xs text-text-secondary bg-control-surface rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                    {call.error_log}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Audio Player */}
        {call.recording_url && (
          <div className="px-6 py-4 border-t border-border-subtle bg-surface-raised">
            <div className="flex items-center gap-3">
              <AudioLines className="w-5 h-5 text-brand-primary shrink-0" />
              <audio controls className="flex-1 h-8" src={call.recording_url}>
                <track kind="captions" src="" label="No captions available" />
                Your browser does not support the audio element.
              </audio>
              <span className="text-xs text-text-muted-strong shrink-0">
                {formatDuration(call.duration_sec)}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
