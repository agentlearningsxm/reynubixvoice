import React from 'react';
import { FocusRail, type FocusRailItem } from './ui/focus-rail';
import { useLanguage, type Language } from '../contexts/LanguageContext';

const VIDEO_ITEMS: FocusRailItem[] = [
  {
    id: 1,
    title: 'AI Foundations for Business Owners',
    description: 'Start with the frameworks that actually matter so you can make better AI decisions fast.',
    meta: 'YouTube Lesson 01',
    imageSrc: 'https://placehold.co/1280x720/050508/38bdf8?text=YouTube+Placeholder+01',
    href: 'https://www.youtube.com/',
  },
  {
    id: 2,
    title: 'What To Ignore and What To Implement',
    description: 'Skip hype cycles and focus on real AI workflows that improve revenue and operations.',
    meta: 'YouTube Lesson 02',
    imageSrc: 'https://placehold.co/1280x720/0b1220/22d3ee?text=YouTube+Placeholder+02',
    href: 'https://www.youtube.com/',
  },
  {
    id: 3,
    title: 'Real-World AI Wins and Failure Patterns',
    description: 'Learn from practical case studies, risks, and field-tested examples across industries.',
    meta: 'YouTube Lesson 03',
    imageSrc: 'https://placehold.co/1280x720/0f172a/60a5fa?text=YouTube+Placeholder+03',
    href: 'https://www.youtube.com/',
  },
  {
    id: 4,
    title: 'The Right People To Follow in AI',
    description: 'A curated path to trusted builders, so you do not waste hours watching random content.',
    meta: 'YouTube Lesson 04',
    imageSrc: 'https://placehold.co/1280x720/111827/0ea5e9?text=YouTube+Placeholder+04',
    href: 'https://www.youtube.com/',
  },
  {
    id: 5,
    title: 'Enterprise-Level Thinking, Fractional Cost',
    description: 'Apply high-quality AI strategy and execution standards without paying enterprise retainers.',
    meta: 'YouTube Lesson 05',
    imageSrc: 'https://placehold.co/1280x720/1e293b/38bdf8?text=YouTube+Placeholder+05',
    href: 'https://www.youtube.com/',
  },
];

const SECTION_COPY: Record<Language, { eyebrow: string; title: string; highlight: string; description: string }> = {
  en: {
    eyebrow: 'Direct Mentor Access',
    title: 'AI Is Moving Fast, and Everyone Is Still Learning.',
    highlight: 'These Are the Teachers I Learn From Directly.',
    description:
      'I stay in direct contact with proven AI operators and turn their lessons into clear, practical guidance for you: what actually works, what is dangerous, and who is worth following. You get enterprise-level AI quality for a fraction of enterprise pricing.',
  },
  fr: {
    eyebrow: 'Accès Direct Aux Mentors',
    title: 'L’IA Va Très Vite, et Tout le Monde Apprend Encore.',
    highlight: 'Voici les Experts avec qui J’Apprends en Direct.',
    description:
      'Je reste en contact direct avec des opérateurs IA reconnus, puis je transforme leurs enseignements en actions concrètes pour vous : ce qui fonctionne réellement, ce qui est risqué, et qui mérite votre attention. Vous obtenez une qualité de niveau entreprise pour une fraction du coût.',
  },
  nl: {
    eyebrow: 'Directe Mentor Toegang',
    title: 'AI Gaat Snel, en Iedereen Leert Nog.',
    highlight: 'Dit Zijn de Experts van Wie Ik Rechtstreeks Leer.',
    description:
      'Ik sta in direct contact met bewezen AI-specialisten en vertaal hun inzichten naar praktische stappen voor jou: wat echt werkt, wat risico’s heeft, en wie je moet volgen. Zo krijg je enterprise-kwaliteit voor een fractie van de enterprise-prijs.',
  },
};

const SocialProof: React.FC = () => {
  const { language } = useLanguage();
  const copy = SECTION_COPY[language];

  return (
    <section className="relative py-24" id="reviews">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mb-5 inline-flex items-center rounded-full glass-card px-4 py-2 text-sm font-medium text-brand-primary">
            {copy.eyebrow}
          </div>

          <h2 className="mx-auto mb-5 max-w-5xl text-3xl font-bold font-display leading-tight text-text-primary md:text-4xl lg:text-5xl">
            {copy.title} <span className="text-gradient">{copy.highlight}</span>
          </h2>

          <p className="mx-auto max-w-4xl text-base leading-relaxed text-text-secondary md:text-lg">
            {copy.description}
          </p>
        </div>

        <FocusRail items={VIDEO_ITEMS} autoPlay={false} loop className="mx-auto max-w-6xl" />
      </div>
    </section>
  );
};

export default SocialProof;
