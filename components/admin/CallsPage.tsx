import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Filter,
  Headphones,
  Phone,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CallDetailModal } from './CallDetailModal';

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function sentimentColor(sentiment: string | null): string {
  switch (sentiment) {
    case 'positive':
      return 'bg-money-gain/10 text-money-gain';
    case 'negative':
    case 'frustrated':
      return 'bg-money-loss/10 text-money-loss';
    default:
      return 'bg-text-muted-strong/10 text-text-muted-strong';
  }
}

function outcomeColor(outcome: string | null): string {
  switch (outcome) {
    case 'qualified-lead':
    case 'booking-made':
      return 'bg-money-gain/10 text-money-gain';
    case 'dropped':
    case 'error':
      return 'bg-money-loss/10 text-money-loss';
    default:
      return 'bg-text-muted-strong/10 text-text-muted-strong';
  }
}

export function CallsPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  useEffect(() => {
    async function fetchCalls() {
      setLoading(true);
      try {
        let query = supabase
          .from('reporting_call_analytics_detail')
          .select('*', { count: 'exact' })
          .order('call_date', { ascending: false })
          .order('call_time', { ascending: false });

        if (sentimentFilter) {
          query = query.eq('sentiment', sentimentFilter);
        }
        if (outcomeFilter) {
          query = query.eq('call_outcome', outcomeFilter);
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) throw error;

        let results = (data || []) as CallRecord[];

        if (search.trim()) {
          const q = search.toLowerCase();
          results = results.filter(
            (c) =>
              c.session_id.toLowerCase().includes(q) ||
              (c.lead_name && c.lead_name.toLowerCase().includes(q)) ||
              (c.lead_email && c.lead_email.toLowerCase().includes(q)),
          );
        }

        setCalls(results);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('[calls-page] Failed to fetch calls:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCalls();
  }, [page, sentimentFilter, outcomeFilter, search]);

  function handleSearch() {
    setPage(1);
  }

  function resetFilters() {
    setSentimentFilter('');
    setOutcomeFilter('');
    setSearch('');
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-7xl mx-auto"
    >
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold text-text-primary">Calls</h2>
        <p className="text-sm text-text-secondary mt-1">
          View and analyze all voice AI sessions
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted-strong" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by session ID or lead name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-raised border border-border-subtle text-sm text-text-primary placeholder:text-text-muted-strong focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary/50"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
              showFilters || sentimentFilter || outcomeFilter
                ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/30'
                : 'bg-surface-raised border-border-subtle text-text-muted-strong hover:text-text-primary'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          {(sentimentFilter || outcomeFilter || search) && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-subtle text-sm text-text-muted-strong hover:text-text-primary transition-all"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-3 p-4 bg-surface-raised border border-border-subtle rounded-lg">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="outcome-filter"
                    className="text-xs font-medium text-text-secondary"
                  >
                    Outcome
                  </label>
                  <select
                    id="outcome-filter"
                    value={outcomeFilter}
                    onChange={(e) => {
                      setOutcomeFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 rounded-md bg-control-surface border border-border-subtle text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  >
                    <option value="">All</option>
                    <option value="qualified-lead">Qualified Lead</option>
                    <option value="information-only">Information Only</option>
                    <option value="dropped">Dropped</option>
                    <option value="error">Error</option>
                    <option value="booking-made">Booking Made</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
              <p className="text-sm text-text-secondary">Loading calls...</p>
            </div>
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Phone className="w-12 h-12 text-text-muted-strong/30 mb-3" />
            <p className="text-sm text-text-secondary">No calls found</p>
            <p className="text-xs text-text-muted-strong mt-1">
              {totalCount === 0
                ? 'Voice sessions will appear here after analysis'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Time
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Lead
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Sentiment
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Score
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Outcome
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Recording
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {calls.map((call) => (
                    <tr
                      key={call.id}
                      onClick={() => setSelectedCall(call)}
                      className="hover:bg-control-surface-hover transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-text-muted-strong shrink-0" />
                          <span className="text-text-primary font-medium">
                            {call.call_date}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-text-muted-strong shrink-0" />
                          <span className="text-text-secondary">
                            {call.call_time}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-text-secondary">
                        {formatDuration(call.duration_sec)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="min-w-0">
                          <p className="text-text-primary font-medium truncate">
                            {call.lead_name || 'Unknown'}
                          </p>
                          {call.lead_email && (
                            <p className="text-xs text-text-muted-strong truncate">
                              {call.lead_email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sentimentColor(call.sentiment)}`}
                        >
                          {call.sentiment || 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`font-semibold ${
                            (call.call_quality_score ?? 0) >= 7
                              ? 'text-money-gain'
                              : (call.call_quality_score ?? 0) >= 4
                                ? 'text-brand-primary'
                                : 'text-money-loss'
                          }`}
                        >
                          {call.call_quality_score ?? 'N/A'}
                          {call.call_quality_score != null && '/10'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${outcomeColor(call.call_outcome)}`}
                        >
                          {call.call_outcome
                            ? call.call_outcome.replace('-', ' ')
                            : 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {call.recording_url ? (
                          <Headphones className="w-4 h-4 text-brand-primary" />
                        ) : (
                          <span className="text-text-muted-strong">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
                <p className="text-xs text-text-secondary">
                  Showing {(page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, totalCount)} of {totalCount} calls
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-text-muted-strong hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-md text-xs font-medium transition-all ${
                          page === pageNum
                            ? 'bg-brand-primary/15 text-brand-primary'
                            : 'text-text-muted-strong hover:text-text-primary'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-text-muted-strong hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {selectedCall && (
          <CallDetailModal
            call={selectedCall}
            onClose={() => setSelectedCall(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
