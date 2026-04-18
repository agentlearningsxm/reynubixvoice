import { Calendar, DollarSign, Plus, Trash2 } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const stages = ['qualification', 'proposal', 'negotiation', 'won', 'lost'];
const stageColors: Record<string, string> = {
  qualification: 'border-blue-500',
  proposal: 'border-yellow-500',
  negotiation: 'border-purple-500',
  won: 'border-emerald-500',
  lost: 'border-red-500',
};

interface Deal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  probability: number | null;
  expected_close_date: string | null;
  leads: {
    name: string | null;
    company: string | null;
    email: string | null;
  } | null;
}

export function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeal, setNewDeal] = useState({
    title: '',
    lead_id: '',
    value: '',
    stage: 'qualification',
  });
  const [leads, setLeads] = useState<
    { id: string; name: string | null; email: string }[]
  >([]);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*, leads(name, company, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDeals(data || []);
    } catch {
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch {
      setLeads([]);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
    fetchLeads();
  }, [fetchDeals, fetchLeads]);

  async function handleAddDeal(e: React.FormEvent) {
    e.preventDefault();
    if (!newDeal.title || !newDeal.lead_id) return;
    const { error } = await supabase.from('deals').insert({
      title: newDeal.title,
      lead_id: newDeal.lead_id,
      value: newDeal.value ? parseFloat(newDeal.value) : null,
      stage: newDeal.stage,
      probability:
        newDeal.stage === 'qualification'
          ? 20
          : newDeal.stage === 'proposal'
            ? 50
            : newDeal.stage === 'negotiation'
              ? 75
              : newDeal.stage === 'won'
                ? 100
                : 0,
    });
    if (!error) {
      setShowAddModal(false);
      setNewDeal({ title: '', lead_id: '', value: '', stage: 'qualification' });
      fetchDeals();
    }
  }

  async function updateStage(id: string, stage: string) {
    const probability =
      stage === 'qualification'
        ? 20
        : stage === 'proposal'
          ? 50
          : stage === 'negotiation'
            ? 75
            : stage === 'won'
              ? 100
              : 0;
    const { error } = await supabase
      .from('deals')
      .update({ stage, probability })
      .eq('id', id);
    if (!error) fetchDeals();
  }

  async function deleteDeal(id: string) {
    const { error } = await supabase.from('deals').delete().eq('id', id);
    if (!error) fetchDeals();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Deals Pipeline</h1>
          <p className="text-zinc-400">{deals.length} total deals</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          <Plus className="h-4 w-4" /> Add Deal
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage);
            const totalValue = stageDeals.reduce(
              (sum, d) => sum + (d.value || 0),
              0,
            );
            return (
              <div
                key={stage}
                className={`rounded-xl border-t-2 ${stageColors[stage]} border-zinc-800 bg-zinc-900/50`}
              >
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-medium capitalize text-white">
                      {stage}
                    </h3>
                    <span className="text-xs text-zinc-500">
                      {stageDeals.length}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {totalValue > 0 ? `€${totalValue.toLocaleString()}` : '—'}
                  </p>
                </div>
                <div className="space-y-2 px-3 pb-3">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 p-3"
                    >
                      <p className="text-sm font-medium text-white">
                        {deal.title}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">
                        {deal.leads?.name || deal.leads?.email || 'Unknown'}
                      </p>
                      {deal.value && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                          <DollarSign className="h-3 w-3" /> €
                          {deal.value.toLocaleString()}
                        </div>
                      )}
                      {deal.expected_close_date && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                          <Calendar className="h-3 w-3" />{' '}
                          {new Date(
                            deal.expected_close_date,
                          ).toLocaleDateString()}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {stages
                          .filter((s) => s !== stage)
                          .map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => updateStage(deal.id, s)}
                              className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] capitalize text-zinc-300 hover:bg-zinc-600"
                              title={`Move to ${s}`}
                            >
                              {s.slice(0, 3)}
                            </button>
                          ))}
                        <button
                          type="button"
                          onClick={() => deleteDeal(deal.id)}
                          className="ml-auto rounded p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Add New Deal
            </h2>
            <form onSubmit={handleAddDeal} className="space-y-4">
              <input
                required
                value={newDeal.title}
                onChange={(e) =>
                  setNewDeal({ ...newDeal, title: e.target.value })
                }
                placeholder="Deal title *"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
              <select
                required
                value={newDeal.lead_id}
                onChange={(e) =>
                  setNewDeal({ ...newDeal, lead_id: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Select lead *</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name || l.email}
                  </option>
                ))}
              </select>
              <input
                value={newDeal.value}
                onChange={(e) =>
                  setNewDeal({ ...newDeal, value: e.target.value })
                }
                placeholder="Value (EUR)"
                type="number"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
              <select
                value={newDeal.stage}
                onChange={(e) =>
                  setNewDeal({ ...newDeal, stage: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                >
                  Add Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
