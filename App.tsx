import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import AutomationCards from './components/AutomationCards';
import Calculator from './components/Calculator';
import IndustrySlider from './components/IndustrySlider';
import Comparison from './components/Comparison';
import MentorCards from './components/MentorCards';
import Footer from './components/Footer';
import ReferralSection from './components/referral-section';
import Spotlight from './components/ui/Spotlight';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PremiumContact } from './components/ui/premium-contact';
import ScrollToTop from './components/ScrollToTop';
import QRStudioLayout from './components/qr-studio/Layout';
import QRRedirect from './components/qr-studio/QRRedirect';
import Privacy from './components/Privacy';
import Terms from './components/Terms';

const MarketingLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen w-full overflow-x-hidden bg-bg-main text-text-primary transition-colors duration-300 relative">
    <Spotlight />
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/10 rounded-full blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-brand-secondary/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
    </div>

    <div className="relative z-10">
      <Navbar />
      <main>{children}</main>
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
    <AutomationCards />
    <MentorCards />
    <ReferralSection />
  </>
);

const EnterpriseQrRedirect: React.FC = () =>
{
  React.useEffect(() =>
  {
    window.location.replace('/enterprise-qr/enterprise-qr.html');
  }, []);

  return null;
};

const App: React.FC = () =>
{
  const isQrSubdomain = typeof window !== 'undefined' && window.location.hostname.startsWith('qr.');

  return (
    <ThemeProvider>
      <LanguageProvider>
        <Router>
          <ScrollToTop />
          <Routes>
            {isQrSubdomain ? (
              <>
                <Route path="/enterprise-qr" element={<EnterpriseQrRedirect />} />
                <Route path="/tools/qr-studio" element={<QRStudioLayout />} />
                <Route path="/qr-studio" element={<QRStudioLayout />} />
                <Route path="/qr/:id" element={<QRRedirect />} />
                <Route path="/" element={<QRStudioLayout />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
              <>
                <Route path="/" element={<MarketingLayout><HomePage /></MarketingLayout>} />
                <Route path="/contact" element={<MarketingLayout><PremiumContact /></MarketingLayout>} />
                <Route path="/privacy" element={<MarketingLayout><Privacy /></MarketingLayout>} />
                <Route path="/terms" element={<MarketingLayout><Terms /></MarketingLayout>} />
                <Route path="/qr-studio" element={<QRStudioLayout />} />
                <Route path="/tools/qr-studio" element={<QRStudioLayout />} />
                <Route path="/qr/:id" element={<QRRedirect />} />
                <Route path="/enterprise-qr" element={<EnterpriseQrRedirect />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
