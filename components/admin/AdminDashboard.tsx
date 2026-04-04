import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Briefcase,
  CalendarCheck,
  CheckSquare,
  Download,
  Phone,
  PhoneIncoming,
  Settings,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' as const },
  },
};

const dateRanges = ['Last 7 days', 'Last 30 days', 'Last 90 days'];

export function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const [selectedRange, setSelectedRange] = useState(dateRanges[1]);
  const [stats, setStats] = useState({
    totalLeads: 0,
    voiceSessions: 0,
    bookings: 0,
    deals: 0,
    tasks: 0,
    overdueTasks: 0,
  });
  const [recentActivity, setRecentActivity] = useState<
    Array<{
      id: number;
      icon: typeof UserPlus;
      description: string;
      timestamp: string;
      color: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [leads, voiceSessions, bookings, deals, tasks] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase
          .from('voice_sessions')
          .select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('deals').select('id', { count: 'exact', head: true }),
        supabase
          .from('tasks')
          .select('id, status, due_date')
          .eq('status', 'pending'),
      ]);

      const overdueTasks = (tasks.data || []).filter(
        (t) => t.due_date && new Date(t.due_date) < new Date(),
      ).length;

      setStats({
        totalLeads: leads.count || 0,
        voiceSessions: voiceSessions.count || 0,
        bookings: bookings.count || 0,
        deals: deals.count || 0,
        tasks: tasks.data?.length || 0,
        overdueTasks,
      });

      const [interactions, recentLeads] = await Promise.all([
        supabase
          .from('interactions')
          .select('type, title, created_at')
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('leads')
          .select('name, email, created_at')
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      const iconMap: Record<string, typeof UserPlus> = {
        call: PhoneIncoming,
        email: CalendarCheck,
        meeting: CalendarCheck,
        note: Activity,
        voice_session: Phone,
        form_submission: UserPlus,
        booking: CalendarCheck,
      };

      const activity = [
        ...(interactions.data || []).map((i, idx) => ({
          id: idx,
          icon: iconMap[i.type] || Activity,
          description: i.title,
          timestamp: new Date(i.created_at).toLocaleString(),
          color: i.type === 'error' ? 'text-red-400' : 'text-brand-primary',
        })),
        ...(recentLeads.data || []).map((l, idx) => ({
          id: 100 + idx,
          icon: UserPlus,
          description: `New lead: ${l.name || l.email}`,
          timestamp: new Date(l.created_at).toLocaleString(),
          color: 'text-green-400',
        })),
      ].slice(0, 6);

      setRecentActivity(activity);
      setLoading(false);
    }
    fetchStats();
  }, []);

  const metricCards = [
    {
      label: 'Total Leads',
      value: stats.totalLeads,
      trend: `${stats.totalLeads > 0 ? '+' : ''}${stats.totalLeads}`,
      direction: 'up' as const,
      icon: UserPlus,
    },
    {
      label: 'Voice Sessions',
      value: stats.voiceSessions,
      trend: `${stats.voiceSessions > 0 ? '+' : ''}${stats.voiceSessions}`,
      direction: 'up' as const,
      icon: Phone,
    },
    {
      label: 'Active Deals',
      value: stats.deals,
      trend: `${stats.deals > 0 ? '+' : ''}${stats.deals}`,
      direction: 'up' as const,
      icon: Briefcase,
    },
    {
      label: 'Pending Tasks',
      value: stats.tasks,
      trend:
        stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : 'On track',
      direction: stats.overdueTasks > 0 ? ('down' as const) : ('up' as const),
      icon: CheckSquare,
    },
  ];

  const quickActions = [
    {
      icon: Users,
      title: 'View All Leads',
      description: 'Browse and manage your lead pipeline',
      link: '/admin/leads',
    },
    {
      icon: Download,
      title: 'Import Data',
      description: 'Migrate from Google Sheets',
      link: '/admin/import',
    },
    {
      icon: Settings,
      title: 'Manage Settings',
      description: 'Configure your account and preferences',
      link: '/admin/settings',
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 max-w-7xl mx-auto"
    >
      <motion.div
        variants={cardVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Dashboard</h2>
          <p className="text-sm text-text-secondary mt-1">
            Welcome back, {user?.email || 'Admin'}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-surface-raised border border-border-subtle rounded-lg p-1">
          {dateRanges.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setSelectedRange(range)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                ${
                  selectedRange === range
                    ? 'bg-brand-primary/15 text-brand-primary'
                    : 'text-text-muted-strong hover:text-text-primary'
                }
              `}
            >
              {range}
            </button>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            {metricCards.map((card) => (
              <motion.div
                key={card.label}
                variants={cardVariants}
                className="bg-surface-raised border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-colors duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-brand-primary/10">
                    <card.icon className="w-5 h-5 text-brand-primary" />
                  </div>
                  <div
                    className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
                    ${
                      card.direction === 'up'
                        ? 'text-money-gain bg-money-gain/10'
                        : 'text-money-loss bg-money-loss/10'
                    }
                  `}
                  >
                    {card.direction === 'up' ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {card.trend}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold text-text-primary">
                    {card.value}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    {card.label}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={cardVariants}
            className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border-subtle">
              <h3 className="text-base font-semibold text-text-primary">
                Recent Activity
              </h3>
            </div>
            <div className="divide-y divide-border-subtle">
              {recentActivity.map((activity) => (
                <motion.div
                  key={activity.id}
                  variants={cardVariants}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-control-surface-hover transition-colors duration-150"
                >
                  <div
                    className={`p-2 rounded-lg bg-control-surface ${activity.color}`}
                  >
                    <activity.icon className="w-4 h-4" />
                  </div>
                  <p className="flex-1 text-sm text-text-muted-strong">
                    {activity.description}
                  </p>
                  <span className="text-xs text-text-secondary whitespace-nowrap">
                    {activity.timestamp}
                  </span>
                </motion.div>
              ))}
              {recentActivity.length === 0 && (
                <p className="px-5 py-8 text-center text-text-secondary">
                  No recent activity
                </p>
              )}
            </div>
          </motion.div>

          <motion.div
            variants={cardVariants}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.link}
                className="group bg-surface-raised border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-brand-primary/10 group-hover:bg-brand-primary/20 transition-colors">
                    <action.icon className="w-5 h-5 text-brand-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {action.title}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
              </Link>
            ))}
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
