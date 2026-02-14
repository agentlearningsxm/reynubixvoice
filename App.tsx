import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Calculator from './components/Calculator';
import IndustrySlider from './components/IndustrySlider';
import Comparison from './components/Comparison';
import SocialProof from './components/SocialProof';
import Footer from './components/Footer';
import Spotlight from './components/ui/Spotlight';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen w-full overflow-x-hidden bg-bg-main text-text-primary transition-colors duration-300 relative">
          <Spotlight />
          <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/10 rounded-full blur-[120px] animate-pulse-slow" />
            <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-brand-secondary/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
          </div>
          
          <div className="relative z-10">
            <Navbar />
            <main>
              <Hero />
              <Calculator />
              <IndustrySlider />
              <Comparison />
              <SocialProof />
            </main>
            <Footer />
          </div>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;