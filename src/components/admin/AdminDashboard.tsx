import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  Download,
  Percent,
  Phone,
  PhoneIncoming,
  Settings,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const metrics = [
  {
    label: 'Total Leads',
    value: '247',
    trend: '+12%',
    direction: 'up' as const,
    icon: UserPlus,
  },
  {
    label: 'Active Contacts',
    value: '189',
    trend: '+5%',
    direction: 'up' as const,
    icon: Users,
  },
  {
    label: 'Calls Today',
    value: '23',
    trend: '-3%',
    direction: 'down' as const,
    icon: Phone,
  },
  {
    label: 'Conversion Rate',
    value: '68%',
    trend: '+8%',
    direction: 'up' as const,
    icon: Percent,
  },
];

const activities = [
  {
    icon: UserPlus,
    description: 'New lead submitted',
    contact: 'John Doe',
    time: '2 min ago',
    color: 'text-brand-primary',
    bg: 'bg-brand-primary/10',
  },
  {
    icon: PhoneIncoming,
    description: 'Call completed',
    contact: '+31 6 1234 5678',
    time: '15 min ago',
    color: 'text-money-gain',
    bg: 'bg-money-gain/10',
  },
  {
    icon: CalendarCheck,
    description: 'Appointment booked',
    contact: 'Sarah K.',
    time: '1 hour ago',
    color: 'text-brand-primary',
    bg: 'bg-brand-primary/10',
  },
  {
    icon: Activity,
    description: 'Lead status changed to active',
    contact: 'Mike R.',
    time: '2 hours ago',
    color: 'text-text-muted-strong',
    bg: 'bg-text-muted-strong/10',
  },
  {
    icon: PhoneIncoming,
    description: 'Missed call',
    contact: '+31 6 9876 5432',
    time: '3 hours ago',
    color: 'text-money-loss',
    bg: 'bg-money-loss/10',
  },
  {
    icon: UserPlus,
    description: 'New lead submitted',
    contact: 'Emma V.',
    time: '5 hours ago',
    color: 'text-brand-primary',
    bg: 'bg-brand-primary/10',
  },
];

const quickActions = [
  {
    icon: Users,
    title: 'View All Leads',
    description: 'Browse and manage your lead pipeline',
    path: '/admin/contacts',
  },
  {
    icon: Download,
    title: 'Export Data',
    description: 'Download contacts and call reports as CSV',
    path: '/admin/analytics',
  },
  {
    icon: Settings,
    title: 'Manage Settings',
    description: 'Configure voice agents and integrations',
    path: '/admin/settings',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' as const },
  },
};

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState('7d');

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-7xl mx-auto"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Dashboard</h2>
          <p className="text-sm text-text-secondary mt-1">
            Overview of your voice AI performance
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-raised border border-border-subtle">
          {[
            { value: '7d', label: 'Last 7 days' },
            { value: '30d', label: '30 days' },
            { value: '90d', label: '90 days' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setDateRange(option.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                dateRange === option.value
                  ? 'bg-brand-primary/15 text-brand-primary'
                  : 'text-text-muted-strong hover:text-text-primary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {metrics.map((metric) => (
          <motion.div
            key={metric.label}
            whileHover={{ y: -2 }}
            className="bg-surface-raised border border-border-subtle rounded-xl p-5 relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div
                className={`p-2 rounded-lg ${metric.direction === 'up' ? 'bg-brand-primary/10' : 'bg-money-loss/10'}`}
              >
                <metric.icon
                  className={`w-5 h-5 ${metric.direction === 'up' ? 'text-brand-primary' : 'text-money-loss'}`}
                />
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  metric.direction === 'up'
                    ? 'bg-money-gain/10 text-money-gain'
                    : 'bg-money-loss/10 text-money-loss'
                }`}
              >
                {metric.direction === 'up' ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {metric.trend}
              </span>
            </div>
            <p className="text-3xl font-bold text-text-primary mt-4">
              {metric.value}
            </p>
            <p className="text-sm text-text-secondary mt-1">{metric.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h3 className="text-base font-semibold text-text-primary">
            Recent Activity
          </h3>
          <Link
            to="/admin/calls"
            className="text-xs text-brand-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-border-subtle">
          {activities.map((activity, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-control-surface-hover transition-colors cursor-pointer"
            >
              <div className={`p-2 rounded-lg ${activity.bg} shrink-0`}>
                <activity.icon className={`w-4 h-4 ${activity.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">
                  {activity.description}{' '}
                  <span className="text-text-muted-strong">
                    - {activity.contact}
                  </span>
                </p>
              </div>
              <span className="text-xs text-text-secondary shrink-0">
                {activity.time}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {quickActions.map((action) => (
          <Link
            key={action.title}
            to={action.path}
            className="group bg-surface-raised border border-border-subtle rounded-xl p-5 hover:border-brand-primary/30 transition-all duration-200"
          >
            <div className="p-2 rounded-lg bg-brand-primary/10 w-fit mb-3 group-hover:bg-brand-primary/20 transition-colors">
              <action.icon className="w-5 h-5 text-brand-primary" />
            </div>
            <h4 className="text-sm font-semibold text-text-primary">
              {action.title}
            </h4>
            <p className="text-xs text-text-secondary mt-1">
              {action.description}
            </p>
            <div className="flex items-center gap-1 mt-3 text-xs text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Open</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </motion.div>
    </motion.div>
  );
}
