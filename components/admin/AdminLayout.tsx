import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Bell,
  Briefcase,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'Leads', path: '/admin/leads' },
  { icon: Briefcase, label: 'Deals', path: '/admin/deals' },
  { icon: CheckSquare, label: 'Tasks', path: '/admin/tasks' },
  { icon: MessageSquare, label: 'Interactions', path: '/admin/interactions' },
  { icon: Database, label: 'Import', path: '/admin/import' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

const pageTitleMap: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/leads': 'Leads',
  '/admin/deals': 'Deals',
  '/admin/tasks': 'Tasks',
  '/admin/interactions': 'Interactions',
  '/admin/import': 'Import',
  '/admin/analytics': 'Analytics',
  '/admin/settings': 'Settings',
};

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'RV';

  const currentPageTitle = pageTitleMap[location.pathname] || 'Admin';

  return (
    <div className="flex h-screen bg-bg-main text-text-primary overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col
          bg-surface-overlay border-r border-border-subtle
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[72px]' : 'w-[240px]'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        initial={false}
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border-subtle">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center">
            <span className="text-brand-primary font-bold text-sm">RV</span>
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-text-primary font-semibold text-base whitespace-nowrap"
            >
              ReynubixVoice
            </motion.span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-lg transition-all duration-200 group
                  ${
                    isActive
                      ? 'bg-brand-primary/10 border-l-[3px] border-brand-primary text-brand-primary'
                      : 'border-l-[3px] border-transparent text-text-muted-strong hover:text-text-primary hover:bg-control-surface-hover'
                  }
                  ${collapsed ? 'justify-center px-0' : ''}
                `}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:flex justify-center py-2">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-text-muted-strong hover:text-text-primary hover:bg-control-surface-hover transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* User section */}
        <div className="border-t border-border-subtle p-3">
          <div
            className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center">
              <span className="text-brand-primary text-xs font-bold">
                {initials}
              </span>
            </div>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-text-primary truncate">
                  {user?.name || 'Admin'}
                </p>
                <p className="text-xs text-text-secondary truncate">
                  {user?.email || ''}
                </p>
              </motion.div>
            )}
            {!collapsed && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex-shrink-0 p-1.5 rounded-md text-text-muted-strong hover:text-red-400 hover:bg-control-surface-hover transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center gap-4 px-4 lg:px-6 py-3 bg-surface-raised/80 backdrop-blur-md border-b border-border-subtle">
          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-md text-text-muted-strong hover:text-text-primary hover:bg-control-surface-hover transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          {/* Page title */}
          <h1 className="text-lg font-semibold text-text-primary">
            {currentPageTitle}
          </h1>

          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="relative p-2 rounded-md text-text-muted-strong hover:text-text-primary hover:bg-control-surface-hover transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-primary" />
            </button>
            <div className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center cursor-pointer">
              <span className="text-brand-primary text-xs font-bold">
                {initials}
              </span>
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-bg-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
