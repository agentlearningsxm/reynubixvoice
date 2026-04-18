import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const from =
    (location.state as { from?: Location })?.from?.pathname || '/admin';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim() || !password.trim()) {
      setFormError('Please enter both email and password');
      return;
    }

    const success = await login(email.trim(), password);

    if (!success) {
      setFormError('Invalid email or password. Please try again.');
    }
  };

  if (isAuthenticated) {
    return null;
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  const inputFocusVariants = {
    focus: { scale: 1.01, transition: { duration: 0.2 } },
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-main px-4 py-12">
      <motion.div
        className="w-full max-w-md"
        initial="hidden"
        animate="visible"
        variants={cardVariants}
      >
        <div className="relative rounded-2xl border border-border-subtle bg-surface-raised/80 p-8 backdrop-blur-xl shadow-2xl">
          {/* Branding */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-primary/10 border border-brand-primary/20">
              <Shield className="h-7 w-7 text-brand-primary" />
            </div>
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{
                background:
                  'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 60%, #b8956a 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ReynubixVoice
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Sign in to access the admin dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {formError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
              >
                {formError}
              </motion.div>
            )}

            {/* Email */}
            <motion.div variants={inputFocusVariants} whileFocus="focus">
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-text-secondary"
              >
                Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-text-secondary" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@reynubix.com"
                  autoComplete="email"
                  className="w-full rounded-lg border border-border-subtle bg-surface-raised py-3 pl-10 pr-4 text-text-primary placeholder-text-secondary/60 transition-all duration-200 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-focus-ring/50"
                  disabled={isLoading}
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div variants={inputFocusVariants} whileFocus="focus">
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-text-secondary"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-text-secondary" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-border-subtle bg-surface-raised py-3 pl-10 pr-12 text-text-primary placeholder-text-secondary/60 transition-all duration-200 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-focus-ring/50"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary hover:text-text-primary transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </motion.div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-lg px-4 py-3 font-medium text-accent-ink transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 focus:ring-offset-bg-main"
              style={{
                background:
                  'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-ink border-t-transparent" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          {/* Back to site */}
          <div className="mt-6 flex items-center justify-center">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-brand-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to site
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
