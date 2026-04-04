import {
  Calendar,
  Clock,
  FileText,
  Mail,
  MessageSquare,
  Mic,
  Phone,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Interaction {
  id: string;
  type: string;
  title: string;
  body: string | null;
  direction: string;
  status: string;
  created_at: string;
  lead_id: string | null;
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

export function InteractionsPage() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  const fetchInteractions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('interactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (typeFilter) query = query.eq('type', typeFilter);
      const { data, error } = await query;
      if (error) throw error;
      setInteractions(data || []);
    } catch {
      setInteractions([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Interactions</h1>
        <p className="text-zinc-400">
          {interactions.length} total interactions
        </p>
      </div>

      <select
        value={typeFilter}
        onChange={(e) => {
          setTypeFilter(e.target.value);
          fetchInteractions();
        }}
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

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {interactions.map((interaction) => {
            const Icon = typeIcons[interaction.type] || MessageSquare;
            return (
              <div
                key={interaction.id}
                className="flex items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Icon className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">
                      {interaction.title}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${interaction.direction === 'inbound' ? 'bg-blue-500/10 text-blue-400' : interaction.direction === 'outbound' ? 'bg-purple-500/10 text-purple-400' : 'bg-zinc-700 text-zinc-400'}`}
                    >
                      {interaction.direction}
                    </span>
                  </div>
                  {interaction.body && (
                    <p className="mt-1 text-sm text-zinc-400">
                      {interaction.body.length > 200
                        ? `${interaction.body.slice(0, 200)}...`
                        : interaction.body}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
                    <Clock className="h-3 w-3" />{' '}
                    {new Date(interaction.created_at).toLocaleString()}
                  </div>
                </div>
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
    </div>
  );
}
