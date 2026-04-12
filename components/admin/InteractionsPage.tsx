import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Mail,
  MessageSquare,
  Mic,
  Phone,
  Play,
  Search,
  Star,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface InteractionMeta {
  session_id?: string;
  sentiment?: string;
  call_quality_score?: number;
  call_outcome?: string;
  recording_url?: string;
  calculator_used?: boolean;
  booking_requested?: boolean;
  [key: string]: unknown;
}

interface Lead {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  phone: string | null;
  status: string;
  metadata?: { business_type?: string };
}

interface Interaction {
  id: string;
  type: string;
  title: string;
  body: string | null;
  direction: string;
  status: string;
  duration_seconds: number | null;
  completed_at: string | null;
  created_at: string;
  lead_id: string | null;
  metadata: InteractionMeta;
  lead?: Lead | null;
}

const typeIcons: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  voice_session: Mic,
  form_submission: FileText,
  booking: Calendar,
};

const sentimentColors: Record<string, string> = {
  positive: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  neutral: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  negative: 'bg-red-500/10 text-red-400 border-red-500/20',
  frustrated: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const outcomeColors: Record<string, string> = {
  'qualified-lead': 'bg-emerald-500/10 text-emerald-400',
  'information-only': 'bg-blue-500/10 text-blue-400',
  dropped: 'bg-red-500/10 text-red-400',
  error: 'bg-red-500/10 text-red-400',
  'booking-made': 'bg-purple-500/10 text-purple-400',
};

function formatDuration(seconds: number | null) {
  if (!seconds) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const PAGE_SIZE = 20;

export function InteractionsPage() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchInteractions = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from('interactions')
        .select(
          '*, lead:leads(id, name, email, company, phone, status, metadata)',
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(from, to);
      if (typeFilter) query = query.eq('type', typeFilter);
      if (search)
        query = query.or(
          `title.ilike.%${search}%,body.ilike.%${search}%`,
        );
      const { data, error, count } = await query;
      if (error) throw error;
      setInteractions((data as Interaction[]) || []);
      setTotalCount(count || 0);
    } catch {
      setInteractions([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search, page]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Interactions</h1>
        <p className="text-zinc-400">
          {totalCount} total interactions
        </p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search interactions..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="call">Calls</option>
          <option value="email">Emails</option>
          <option value="meeting">Meetings</option>
          <option value="note">Notes</option>
          <option value="voice_session">Voice Sessions</option>
          <option value="form_submission">Form Submissions</option>
          <option value="booking">Bookings</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {interactions.map((interaction) => {
            const Icon = typeIcons[interaction.type] || MessageSquare;
            const isExpanded = expandedId === interaction.id;
            const meta = interaction.metadata || {};
            const lead = interaction.lead;

            return (
              <div
                key={interaction.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : interaction.id)
                  }
                  className="flex items-start gap-4 p-4 w-full text-left hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Icon className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white truncate">
                        {interaction.title}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${interaction.direction === 'inbound' ? 'bg-blue-500/10 text-blue-400' : interaction.direction === 'outbound' ? 'bg-purple-500/10 text-purple-400' : 'bg-zinc-700 text-zinc-400'}`}
                      >
                        {interaction.direction}
                      </span>
                      {meta.call_outcome && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${outcomeColors[meta.call_outcome] || 'bg-zinc-700 text-zinc-400'}`}
                        >
                          {meta.call_outcome}
                        </span>
                      )}
                      {interaction.duration_seconds && (
                        <span className="text-[10px] text-zinc-500">
                          {formatDuration(interaction.duration_seconds)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(interaction.created_at).toLocaleString()}
                      </span>
                      {lead?.name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {lead.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-zinc-500">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-zinc-800 px-4 pb-4 pt-3 space-y-4">
                        {interaction.body && (
                          <div>
                            <p className="text-xs font-medium text-zinc-500 uppercase mb-1">
                              Summary
                            </p>
                            <p className="text-sm text-zinc-300 leading-relaxed">
                              {interaction.body}
                            </p>
                          </div>
                        )}

                        {lead && (
                          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 p-3">
                            <p className="text-xs font-medium text-zinc-500 uppercase mb-2">
                              Contact
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-zinc-500">Name: </span>
                                <span className="text-white">
                                  {lead.name || 'Unknown'}
                                </span>
                              </div>
                              <div>
                                <span className="text-zinc-500">
                                  Company:{' '}
                                </span>
                                <span className="text-white">
                                  {lead.company || '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-zinc-500">Email: </span>
                                <span className="text-white">
                                  {!lead.email ||
                                  lead.email.includes(
                                    '@lead.reynubix.local',
                                  )
                                    ? 'Not provided'
                                    : lead.email}
                                </span>
                              </div>
                              <div>
                                <span className="text-zinc-500">Phone: </span>
                                <span className="text-white">
                                  {lead.phone || '-'}
                                </span>
                              </div>
                              {lead.metadata?.business_type && (
                                <div>
                                  <span className="text-zinc-500">
                                    Business:{' '}
                                  </span>
                                  <span className="text-white capitalize">
                                    {lead.metadata.business_type}
                                  </span>
                                </div>
                              )}
                              <div>
                                <span className="text-zinc-500">Status: </span>
                                <span className="text-white capitalize">
                                  {lead.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {interaction.type === 'voice_session' && (
                          <div className="flex flex-wrap gap-3">
                            {meta.sentiment && (
                              <div
                                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${sentimentColors[meta.sentiment] || sentimentColors.neutral}`}
                              >
                                Sentiment: {meta.sentiment}
                              </div>
                            )}
                            {meta.call_quality_score != null && (
                              <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400">
                                <Star className="h-3 w-3" />
                                Quality: {meta.call_quality_score}/10
                              </div>
                            )}
                            {meta.calculator_used && (
                              <div className="rounded-lg border border-zinc-600/30 bg-zinc-700/20 px-3 py-1.5 text-xs text-zinc-400">
                                Calculator used
                              </div>
                            )}
                            {meta.booking_requested && (
                              <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-400">
                                Booking requested
                              </div>
                            )}
                          </div>
                        )}

                        {meta.recording_url && (
                          <div>
                            <p className="text-xs font-medium text-zinc-500 uppercase mb-2 flex items-center gap-1">
                              <Play className="h-3 w-3" /> Recording
                            </p>
                            <audio
                              controls
                              preload="none"
                              className="w-full h-10 rounded-lg"
                              src={meta.recording_url}
                            >
                              Your browser does not support audio playback.
                            </audio>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {interactions.length === 0 && (
            <p className="py-12 text-center text-zinc-500">
              No interactions found
            </p>
          )}
        </div>
      )}

      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-zinc-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page * PAGE_SIZE >= totalCount}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
