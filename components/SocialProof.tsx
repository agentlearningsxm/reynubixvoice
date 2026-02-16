import React from 'react';
import CosmicOrb from './ui/CosmicOrb';
import { useLanguage } from '../contexts/LanguageContext';

const SocialProof: React.FC = () =>
{
  const { t } = useLanguage();

  return (
    <section className="py-24 relative" id="reviews">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-2xl">👇</span>
            <p className="text-brand-primary font-medium text-lg">(something to play with)</p>
            <span className="text-2xl">👇</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <CosmicOrb />
        </div>

      </div>
    </section>
  );
};

export default SocialProof;
