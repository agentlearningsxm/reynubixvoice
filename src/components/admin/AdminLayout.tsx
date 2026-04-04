import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Phone,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'Contacts', path: '/admin/contacts' },
  { icon: Phone, label: 'Calls', path: '/admin/calls' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

const pageTitleMap: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/contacts': 'Contacts',
  '/admin/calls': 'Calls',
  '/admin/analytics': 'Analytics',
  '/admin/settings': 'Settings',
};

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileBreakpoint, setMobileBreakpoint] = useState(false);

  useEffect(() => {
    const checkBreakpoint = () => {
      const isMobile = window.innerWidth < 1024;
      setMobileBreakpoint(isMobile);
      if (!isMobile) setSidebarOpen(false);
    };
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const currentPageTitle = pageTitleMap[location.pathname] || 'Admin';
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="flex h-screen bg-bg-main text-text-primary overflow-hidden">
      <AnimatePresence>
        {sidebarOpen && mobileBreakpoint && (
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

      <motion.aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-surface-overlay border-r border-border-subtle transition-all duration-300 ${
          sidebarCollapsed && !mobileBreakpoint ? 'w-16' : 'w-60'
        } ${sidebarOpen || !mobileBreakpoint ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        initial={mobileBreakpoint ? { x: -240 } : false}
        animate={mobileBreakpoint ? { x: sidebarOpen ? 0 : -240 } : false}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div
          className={`flex items-center h-16 px-4 border-b border-border-subtle ${sidebarCollapsed && !mobileBreakpoint ? 'justify-center' : 'gap-3'}`}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-primary/20 border border-brand-primary/30 shrink-0">
            <span className="text-brand-primary font-bold text-sm">RV</span>
          </div>
          {(!sidebarCollapsed || mobileBreakpoint) && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-display font-semibold text-text-primary truncate"
            >
              ReynubixVoice
            </motion.span>
          )}
          {mobileBreakpoint && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto p-1 rounded-md hover:bg-control-surface transition-colors"
            >
              <X className="w-4 h-4 text-text-muted-strong" />
            </button>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-primary/10 text-brand-primary border-l-2 border-brand-primary'
                    : 'text-text-muted-strong hover:text-text-primary hover:bg-control-surface-hover border-l-2 border-transparent'
                } ${sidebarCollapsed && !mobileBreakpoint ? 'justify-center px-0' : ''}`}
              >
                <item.icon
                  className={`w-5 h-5 shrink-0 ${isActive ? 'text-brand-primary' : ''}`}
                />
                {(!sidebarCollapsed || mobileBreakpoint) && (
                  <motion.span
                    initial={false}
                    animate={{
                      opacity: sidebarCollapsed && !mobileBreakpoint ? 0 : 1,
                      width: sidebarCollapsed && !mobileBreakpoint ? 0 : 'auto',
                    }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border-subtle">
          <button
            onClick={() => {
              if (!mobileBreakpoint) setSidebarCollapsed(!sidebarCollapsed);
            }}
            className="hidden lg:flex items-center justify-center w-full p-2 rounded-lg hover:bg-control-surface-hover transition-colors text-text-muted-strong"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          <div
            className={`flex items-center gap-3 mt-2 ${sidebarCollapsed && !mobileBreakpoint ? 'justify-center' : ''}`}
          >
            <div className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center shrink-0">
              <span className="text-brand-primary text-xs font-bold">
                {initials}
              </span>
            </div>
            {(!sidebarCollapsed || mobileBreakpoint) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-text-secondary truncate">
                  {user?.email || ''}
                </p>
              </div>
            )}
            {(!sidebarCollapsed || mobileBreakpoint) && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md hover:bg-money-loss/10 text-text-muted-strong hover:text-money-loss transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 lg:px-6 bg-surface-overlay/80 backdrop-blur-md border-b border-border-subtle">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md hover:bg-control-surface-hover transition-colors mr-3"
          >
            <Menu className="w-5 h-5 text-text-muted-strong" />
          </button>

          <h1 className="text-lg font-semibold text-text-primary">
            {currentPageTitle}
          </h1>

          <div className="ml-auto flex items-center gap-2">
            <button className="relative p-2 rounded-md hover:bg-control-surface-hover transition-colors text-text-muted-strong">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-primary" />
            </button>
            <div className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center ml-1">
              <span className="text-brand-primary text-xs font-bold">
                {initials}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-bg-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
