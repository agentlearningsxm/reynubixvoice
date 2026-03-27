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
import Calculator from './components/Calculator';
import ErrorBoundary from './components/ErrorBoundary';
import Comparison from './components/Comparison';
import Footer from './components/Footer';
import Hero from './components/Hero';
import IndustrySlider from './components/IndustrySlider';
import MentorCards from './components/MentorCards';
import Navbar from './components/Navbar';
import Privacy from './components/Privacy';
import ReferralSection from './components/referral-section';
import ScrollToTop from './components/ScrollToTop';
import TelemetryManager from './components/TelemetryManager';
import Terms from './components/Terms';
import { PremiumContact } from './components/ui/premium-contact';
import Spotlight from './components/ui/Spotlight';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';

const AutomationCards = lazy(() => import('./components/AutomationCards'));

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
                  <PremiumContact />
                </MarketingLayout>
              }
            />
            <Route
              path="/privacy"
              element={
                <MarketingLayout>
                  <Privacy />
                </MarketingLayout>
              }
            />
            <Route
              path="/terms"
              element={
                <MarketingLayout>
                  <Terms />
                </MarketingLayout>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ErrorBoundary>
      <Analytics />
      <SpeedInsights />
    </LanguageProvider>
  </ThemeProvider>
);

export default App;
