import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import type React from 'react';
import { lazy, Suspense } from 'react';
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from 'react-router-dom';
import { AdminDashboard } from './components/admin/AdminDashboard';
import AdminLayout from './components/admin/AdminLayout';
import { DealsPage } from './components/admin/DealsPage';
import { ImportPage } from './components/admin/ImportPage';
import { InteractionsPage } from './components/admin/InteractionsPage';
import { LeadsPage } from './components/admin/LeadsPage';
import { TasksPage } from './components/admin/TasksPage';
import { CallsPage } from './components/admin/CallsPage';
import { AuthProvider } from './components/auth/AuthProvider';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Calculator from './components/Calculator';
import Comparison from './components/Comparison';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/Footer';
import Hero from './components/Hero';
import IndustrySlider from './components/IndustrySlider';
import MentorCards from './components/MentorCards';
import Navbar from './components/Navbar';
import ReferralSection from './components/referral-section';
import ScrollToTop from './components/ScrollToTop';
import TelemetryManager from './components/TelemetryManager';
import Spotlight from './components/ui/Spotlight';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';

const AutomationCards = lazy(() => import('./components/AutomationCards'));
const PremiumContact = lazy(() =>
  import('./components/ui/premium-contact').then((m) => ({
    default: m.PremiumContact,
  })),
);
const Privacy = lazy(() => import('./components/Privacy'));
const Terms = lazy(() => import('./components/Terms'));

const MarketingLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="min-h-screen w-full overflow-x-hidden bg-bg-main text-text-primary transition-colors duration-300 relative">
    <Spotlight />
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[42%] h-[40%] bg-brand-primary/12 rounded-full blur-[125px] animate-pulse-slow" />
      <div
        className="absolute top-[10%] right-[18%] w-[24%] h-[24%] rounded-full blur-[110px] animate-pulse-slow"
        style={{
          background:
            'radial-gradient(circle, rgba(245, 194, 118, 0.12) 0%, rgba(245, 194, 118, 0.04) 45%, transparent 72%)',
        }}
      />
      <div
        className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-brand-secondary/10 rounded-full blur-[100px] animate-pulse-slow"
        style={{ animationDelay: '2s' }}
      />
    </div>
    {/* Full-page square gridCowork-inspired background texture, above glow blobs */}
    <div className="fixed inset-0 z-1 pointer-events-none square-grid" />

    <div className="relative z-10">
      <Navbar />
      <main className="relative">
        {/* Scrolling ambient orbsvisual flow between sections */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 0 }}
        >
          <div className="absolute top-[12%] right-[-8%] w-[50%] h-[18%] bg-brand-primary/5 rounded-full blur-[130px]" />
          <div
            className="absolute top-[28%] left-[-10%] w-[45%] h-[14%] rounded-full blur-[120px]"
            style={{
              background:
                'radial-gradient(circle, rgba(242, 184, 108, 0.08) 0%, rgba(242, 184, 108, 0.03) 42%, transparent 74%)',
            }}
          />
          <div className="absolute top-[45%] right-[-5%] w-[40%] h-[16%] bg-brand-secondary/5 rounded-full blur-[110px]" />
          <div
            className="absolute top-[62%] left-[-8%] w-[45%] h-[14%] rounded-full blur-[130px]"
            style={{
              background:
                'radial-gradient(circle, rgba(201, 127, 93, 0.08) 0%, rgba(201, 127, 93, 0.03) 48%, transparent 76%)',
            }}
          />
          <div className="absolute top-[78%] right-[5%] w-[40%] h-[15%] bg-brand-primary/5 rounded-full blur-[120px]" />
        </div>
        {children}
      </main>
      <Footer />
    </div>
  </div>
);

const HomePage: React.FC = () => (
  <>
    <Hero />
    <Calculator />
    <IndustrySlider />
    <Comparison />
    <Suspense fallback={<div className="min-h-[400px]" />}>
      <AutomationCards />
    </Suspense>
    <MentorCards />
    <ReferralSection />
  </>
);

const App: React.FC = () => (
  <ThemeProvider>
    <LanguageProvider>
      <ErrorBoundary>
        <AuthProvider>
          <Router>
            <ScrollToTop />
            <TelemetryManager />
            <Routes>
              <Route
                path="/"
                element={
                  <MarketingLayout>
                    <HomePage />
                  </MarketingLayout>
                }
              />
              <Route
                path="/contact"
                element={
                  <MarketingLayout>
                    <Suspense fallback={<div className="min-h-screen" />}>
                      <PremiumContact />
                    </Suspense>
                  </MarketingLayout>
                }
              />
              <Route
                path="/privacy"
                element={
                  <MarketingLayout>
                    <Suspense fallback={<div className="min-h-[60vh]" />}>
                      <Privacy />
                    </Suspense>
                  </MarketingLayout>
                }
              />
              <Route
                path="/terms"
                element={
                  <MarketingLayout>
                    <Suspense fallback={<div className="min-h-[60vh]" />}>
                      <Terms />
                    </Suspense>
                  </MarketingLayout>
                }
              />
              <Route path="/admin/login" element={<LoginPage />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="leads" element={<LeadsPage />} />
                <Route path="deals" element={<DealsPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="interactions" element={<InteractionsPage />} />
                <Route path="calls" element={<CallsPage />} />
                <Route path="import" element={<ImportPage />} />
                <Route
                  path="analytics"
                  element={
                    <ProtectedRoute>
                      <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                          <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13h4v8H3zM10 9h4v12h-4zM17 5h4v16h-4z" /></svg>
                        </div>
                        <h2 className="text-xl font-semibold text-white">Analytics</h2>
                        <p className="mt-2 max-w-sm text-sm text-zinc-400">Call volume trends, conversion funnels, and performance dashboards are coming soon.</p>
                      </div>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                          <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" /><circle cx="12" cy="12" r="3" /></svg>
                        </div>
                        <h2 className="text-xl font-semibold text-white">Settings</h2>
                        <p className="mt-2 max-w-sm text-sm text-zinc-400">Profile, notifications, and Groq model configuration are coming soon.</p>
                      </div>
                    </ProtectedRoute>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ErrorBoundary>
      <Analytics />
      <SpeedInsights />
    </LanguageProvider>
  </ThemeProvider>
);

export default App;
