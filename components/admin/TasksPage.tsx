import { AlertCircle, Calendar, Check, Plus, Search, Trash2 } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  lead_id: string | null;
  lead?: { id: string; name: string | null; email: string } | null;
}

const priorityColors: Record<string, string> = {
  low: 'text-zinc-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  urgent: 'text-red-400',
};

const PAGE_SIZE = 20;

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from('tasks')
        .select('*, lead:leads(id, name, email)', { count: 'exact' })
        .order('due_date', { ascending: true, nullsFirst: false })
        .range(from, to);
      if (statusFilter) query = query.eq('status', statusFilter);
      if (search)
        query = query.or(
          `title.ilike.%${search}%,description.ilike.%${search}%`,
        );
      const { data, error, count } = await query;
      if (error) throw error;
      setTasks(data || []);
      setTotalCount(count || 0);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.title) return;
    const { error } = await supabase.from('tasks').insert({
      title: newTask.title,
      description: newTask.description || null,
      priority: newTask.priority,
      due_date: newTask.due_date || null,
      status: 'pending',
    });
    if (!error) {
      setShowAddModal(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
      });
      fetchTasks();
    }
  }

  async function completeTask(id: string) {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) fetchTasks();
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) fetchTasks();
  }

  const overdue = tasks.filter(
    (t) =>
      t.due_date &&
      new Date(t.due_date) < new Date() &&
      t.status !== 'completed',
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tasks</h1>
          <p className="text-zinc-400">
            {totalCount} total · {overdue.length} overdue
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          <Plus className="h-4 w-4" /> Add Task
        </button>
      </div>

      {overdue.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" /> {overdue.length} overdue task
          {overdue.length > 1 ? 's' : ''}
        </div>
      )}

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 ${task.status === 'completed' ? 'opacity-50' : ''}`}
            >
              <button
                type="button"
                onClick={() =>
                  task.status !== 'completed' && completeTask(task.id)
                }
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${task.status === 'completed' ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600 hover:border-emerald-500'}`}
              >
                {task.status === 'completed' && (
                  <Check className="h-3 w-3 text-white" />
                )}
              </button>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-white'}`}
                >
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-zinc-400">{task.description}</p>
                )}
                {task.lead && (
                  <p className="text-xs text-emerald-400/80">
                    {task.lead.name || task.lead.email}
                  </p>
                )}
              </div>
              <span
                className={`text-xs font-medium capitalize ${priorityColors[task.priority]}`}
              >
                {task.priority}
              </span>
              {task.due_date && (
                <div
                  className={`flex items-center gap-1 text-xs ${new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'text-red-400' : 'text-zinc-400'}`}
                >
                  <Calendar className="h-3 w-3" />{' '}
                  {new Date(task.due_date).toLocaleDateString()}
                </div>
              )}
              <button
                type="button"
                onClick={() => deleteTask(task.id)}
                className="rounded p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="py-12 text-center text-zinc-500">No tasks found</p>
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Add New Task
            </h2>
            <form onSubmit={handleAddTask} className="space-y-4">
              <input
                required
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
                placeholder="Task title *"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
              <textarea
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
                placeholder="Description"
                rows={3}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
              <div className="flex gap-3">
                <select
                  value={newTask.priority}
                  onChange={(e) =>
                    setNewTask({ ...newTask, priority: e.target.value })
                  }
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) =>
                    setNewTask({ ...newTask, due_date: e.target.value })
                  }
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
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
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
