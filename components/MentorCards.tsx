import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Users, X, Youtube, GraduationCap } from 'lucide-react';
import { useLanguage, type Language } from '../contexts/LanguageContext';
import { FocusRail, type FocusRailItem } from './ui/focus-rail';

/* ─── Types ──────────────────────────────────────────────────────── */

interface MentorVideo {
  id: string;
  title: string;
}

interface Mentor {
  id: number;
  name: string;
  initials: string;
  category: string;
  specialty: string;
  youtubeChannel: string;
  videos: MentorVideo[];
  skoolLink: string | null;
  gradient: string;
  description: string;
}

/* ─── Constants ──────────────────────────────────────────────────── */

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'n8n', label: 'n8n Automations' },
  { id: 'voice', label: 'Voice AI' },
  { id: 'web', label: 'Web Design' },
  { id: 'claude', label: 'Claude Code' },
  { id: 'mindset', label: 'AI & Business' },
];

const USER_SKOOL = 'https://www.skool.com/@reynoso-anubis-8987';

const MENTORS: Mentor[] = [
  {
    id: 1,
    name: 'Nate Herk',
    initials: 'NH',
    category: 'n8n',
    specialty: 'n8n Automation Expert & Agency Builder',
    youtubeChannel: 'https://www.youtube.com/@nateherk',
videos: [
      { id: 'zKBPwDpBfhs', title: 'n8n Masterclass: Build & Sell AI Agents' },
    ],
    skoolLink: 'https://www.skool.com/ai-automation-society-plus',
    gradient: 'from-cyan-500 to-blue-600',
    description:
      "Nate taught me to build AI automation systems that run your business while you sleep. His n8n masterclass showed me how to create lead-capture bots, auto-follow-ups, and smart scheduling  so your phone rings with pre-qualified customers, not tire-kickers. Think: a Rotterdam plumber getting 30% more booked jobs without hiring anyone new.",
  },
  {
    id: 2,
    name: 'Michele Torti',
    initials: 'MT',
    category: 'n8n',
    specialty: 'n8n AI Workflows & Sales Automation',
    youtubeChannel: 'https://www.youtube.com/@michtortiyt',
videos: [
      { id: 'zVjX_vqyd7I', title: 'n8n AI Agent That Automates Workflows' },
    ],
    skoolLink: 'https://www.skool.com/the-ai-automation-circle',
    gradient: 'from-blue-500 to-indigo-600',
    description:
      "Michele showed me how to build AI sales teams that work 24/7 without calling in sick. From auto-processing invoices to qualifying leads while you're on a job site  his n8n workflows save hours every single week. That's real money back in your pocket: less admin, more revenue.",
  },
  {
    id: 3,
    name: 'Sixflow Automations',
    initials: 'SF',
    category: 'voice',
    specialty: 'Production-Grade Voice AI Systems',
youtubeChannel: 'https://www.youtube.com/@SixflowAutomations',
    videos: [
      { id: '0_TQV5tfFds', title: 'Production-Grade Voice AI Systems' },
    ],
    skoolLink: 'https://www.skool.com/voiceai',
    gradient: 'from-emerald-500 to-teal-600',
    description:
      "Sixflow builds production-grade voice AI that never misses a call. They taught me how to design agents that qualify leads, book appointments, and handle customer questions  even at 2 AM when your competitor's phone goes to voicemail. Their analytics platform shows exactly how many leads and bookings your AI receptionist handles each day.",
  },
  {
    id: 4,
    name: 'Alejo & Paige',
    initials: 'AP',
    category: 'voice',
    specialty: 'Retell AI Voice Agent Builders',
    youtubeChannel: 'https://www.youtube.com/@AlejoAndPaige',
videos: [
      { id: 'RY3j5aRLLao', title: 'Retell AI Tutorial: Build a Voice Receptionist' },
    ],
    skoolLink: 'https://www.skool.com/amplify-voice-ai',
    gradient: 'from-green-500 to-emerald-600',
    description:
      "Alejo & Paige run the Amplify Voice AI community  the go-to place for voice agent builders. They taught me step-by-step how to build a voice receptionist that sounds human, books jobs automatically, and never puts a caller on hold. Like having your best receptionist working 24/7  for a fraction of the cost.",
  },
  {
    id: 5,
    name: 'Henryk Brzozowski',
    initials: 'HB',
    category: 'voice',
    specialty: 'Voice AI Pioneer & Bootcamp Leader',
youtubeChannel: 'https://www.youtube.com/@HenrykAutomation',
    videos: [
      { id: 'rsks8RkIgbg', title: 'Voice AI Pioneer & Bootcamp Leader' },
    ],
    skoolLink: 'https://www.skool.com/voice-ai-bootcamp',
    gradient: 'from-teal-500 to-cyan-600',
    description:
      "Henryk is a Voice AI pioneer who deploys agents at 20x lower cost and 32x faster than traditional call centers. His Voice AI Bootcamp taught me how to build systems that handle hundreds of calls simultaneously  meaning your business never misses a lead, even during peak hours. Like hiring 50 receptionists for the price of one.",
  },
  {
    id: 6,
    name: 'Jannis Moore',
    initials: 'JM',
    category: 'voice',
    specialty: 'Voice AI Agency Builder & SaaS Founder',
    youtubeChannel: 'https://www.youtube.com/@jannismoore',
videos: [
      { id: 'wOmtvSPp2_k', title: "How I'd Start a Voice AI Agency in 2025" },
    ],
    skoolLink: 'https://www.skool.com/voice-ai-bootcamp',
    gradient: 'from-cyan-500 to-green-600',
    description:
      "Jannis built multiple SaaS companies and co-runs the Voice AI Bootcamp. He showed me exactly how to build and scale voice AI systems  from first agent to fully automated phone operations that save businesses thousands per month. His approach: never let another call go unanswered, and turn every missed call into a booked job.",
  },
{
    id: 7,
    name: 'Roberts',
    initials: 'JR',
    category: 'web',
    specialty: 'AI-Powered Web Design & Vibe Coding',
    youtubeChannel: 'https://www.youtube.com/@Itssssss_Jack',
videos: [
      { id: 'gh9Y3tHeFXQ', title: 'Build Web Apps with V0 + Claude AI + Cursor' },
    ],
    skoolLink: null,
    gradient: 'from-purple-500 to-pink-600',
    description:
      "Jack taught me how to build stunning, custom websites using AI tools  in days, not months. No cookie-cutter templates. Your business gets a high-converting site that matches your brand perfectly. That means more leads from your website, faster turnaround, and thousands saved compared to traditional web agencies.",
  },
  {
    id: 8,
    name: 'Mark Kashef',
    initials: 'MK',
    category: 'claude',
    specialty: 'Claude Code Expert & AI Consultant',
    youtubeChannel: 'https://www.youtube.com/@Mark_Kashef',
videos: [
      { id: 'dlb_XgFVrHQ', title: 'Claude Code: Build Apps Without Coding' },
    ],
    skoolLink: null,
    gradient: 'from-orange-500 to-amber-600',
    description:
      "Mark trained 700+ professionals and has 2M+ views teaching AI on YouTube. He showed me how to use Claude Code as a personal development team  building custom tools, automating repetitive tasks, and replacing expensive software subscriptions. That means lower overhead costs for your business and faster delivery on every project.",
  },
  {
    id: 9,
    name: 'Liam Ottley',
    initials: 'LO',
    category: 'mindset',
    specialty: '#1 AI Business Educator (730K+ Subs)',
    youtubeChannel: 'https://www.youtube.com/@LiamOttley',
videos: [
      { id: 'ykRToEkWvpA', title: 'The #1 AI Automation Agency Niche' },
    ],
    skoolLink: 'https://www.skool.com/ai-automation-agency-hub-8466',
    gradient: 'from-rose-500 to-red-600',
    description:
      "Liam built an $18M+ AI business portfolio and teaches 35,000+ agency owners. His AI Automation Agency model taught me exactly which AI solutions make businesses the most money  and how to deliver them reliably. Every strategy I use to grow your revenue and cut your costs comes from frameworks proven in his community.",
  },
  {
    id: 10,
    name: 'Alex Hormozi',
    initials: 'AH',
    category: 'mindset',
    specialty: '$250M/yr Business Empire Builder',
    youtubeChannel: 'https://www.youtube.com/@AlexHormozi',
videos: [
      { id: 'ZuJryiwxjDw', title: 'How to Grow Your Business Fast in 2025' },
    ],
    skoolLink: 'https://www.skool.com/acquisitionuniversity',
    gradient: 'from-red-500 to-orange-600',
    description:
      "Alex runs a $250M/year business empire and literally wrote the book on getting leads ($100M Leads). His frameworks taught me how to create offers customers can't refuse, generate leads on autopilot, and turn one-time buyers into repeat clients. When I build your systems, they're designed around his proven \"get more customers\" playbook.",
  },
  {
    id: 11,
    name: 'Nick Saraev',
    initials: 'NS',
    category: 'mindset',
    specialty: '#1 No-Code Community & AI Automations',
    youtubeChannel: 'https://www.youtube.com/@nicksaraev',
videos: [
      { id: 'gcuR_-rzlDw', title: 'n8n For Everyone: AI Agents & Workflows' },
    ],
    skoolLink: 'https://www.skool.com/makemoneywithmake',
    gradient: 'from-amber-500 to-red-600',
    description:
      "Nick runs the #1 no-code automation community on Skool and teaches 220K+ people. His workflows showed me how to build automations that save businesses 20+ hours a week  lead follow-ups, appointment reminders, customer onboarding  all running on autopilot while you focus on the work that actually pays.",
  },
];

/* ─── Section Copy (Multi-language) ──────────────────────────────── */

const SECTION_COPY: Record<Language, { eyebrow: string; title: string; highlight: string; description: string; cta: string }> = {
  en: {
    eyebrow: 'Direct Mentor Access',
    title: 'AI Is Moving Fast. These Are the Experts',
    highlight: 'I Learn From Directly.',
    description:
      'I stay connected with proven AI operators and turn their lessons into real results for your business  more calls answered, more leads booked, more revenue captured. You get enterprise-level AI quality at a fraction of the price.',
    cta: 'View My Skool Profile',
  },
  fr: {
    eyebrow: 'Acc\u00e8s Direct Aux Mentors',
    title: "L'IA Va Vite. Voici les Experts",
    highlight: 'Avec Qui J\u2019Apprends en Direct.',
    description:
      'Je reste en contact avec des op\u00e9rateurs IA reconnus et je transforme leurs le\u00e7ons en r\u00e9sultats concrets pour votre entreprise \u2014 plus d\u2019appels r\u00e9pondus, plus de rendez-vous, plus de revenus.',
    cta: 'Voir Mon Profil Skool',
  },
  nl: {
    eyebrow: 'Directe Mentor Toegang',
    title: 'AI Gaat Snel. Dit Zijn de Experts',
    highlight: 'Van Wie Ik Rechtstreeks Leer.',
    description:
      'Ik sta in direct contact met bewezen AI-specialisten en vertaal hun inzichten naar echte resultaten voor jouw bedrijf \u2014 meer oproepen beantwoord, meer leads geboekt, meer omzet.',
    cta: 'Bekijk Mijn Skool Profiel',
  },
};

/* ─── Category Badge Color Map ───────────────────────────────────── */

const CATEGORY_COLORS: Record<string, string> = {
  n8n: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  voice: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  web: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  claude: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  mindset: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

const CATEGORY_LABELS: Record<string, string> = {
  n8n: 'n8n Automations',
  voice: 'Voice AI',
  web: 'Web Design',
  claude: 'Claude Code',
  mindset: 'AI & Business',
};

/* ─── Mentor Modal Component ─────────────────────────────────────── */

const MentorModal: React.FC<{ mentor: Mentor | null; onClose: () => void }> = ({ mentor, onClose }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (mentor) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [mentor, onClose]);

  return (
    <AnimatePresence>
      {mentor && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl bg-bg-main border border-border shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-bg-card/80 hover:bg-bg-card border border-border/50 flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <X className="w-4 h-4 text-text-primary" />
            </button>

            {/* Gradient Header */}
            <div className={`relative h-44 bg-gradient-to-br ${mentor.gradient} opacity-25 rounded-t-2xl`} />

            {/* Identity Row */}
            <div className="px-7 -mt-12 relative pb-6">
              <div className="flex items-end gap-5 mb-5">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${mentor.gradient} flex items-center justify-center text-white text-2xl font-bold shadow-2xl border-4 border-bg-main shrink-0`}>
                  {mentor.initials}
                </div>
                <div className="pb-1 min-w-0">
                  <h3 className="text-2xl font-bold text-text-primary font-display leading-tight">{mentor.name}</h3>
                  <p className="text-sm text-text-secondary mt-0.5">{mentor.specialty}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${CATEGORY_COLORS[mentor.category]}`}>
                {CATEGORY_LABELS[mentor.category]}
              </span>
            </div>

            {/* Divider */}
            <div className="border-t border-border/50 mx-7" />

            {/* Description */}
            <div className="px-7 py-6">
              <h4 className="text-xs font-semibold text-brand-primary uppercase tracking-widest mb-3">
                What I Learned & How It Helps Your Business
              </h4>
              <p className="text-base text-text-secondary leading-relaxed">
                {mentor.description}
              </p>
            </div>

            {/* Video Embeds */}
            {mentor.videos.length > 0 && (
              <>
                <div className="border-t border-border/50 mx-7" />
                <div className="px-7 py-6 space-y-6">
                  <h4 className="text-xs font-semibold text-text-primary uppercase tracking-widest">
                    Featured Videos
                  </h4>
                  {mentor.videos.map((video) => (
                    <div key={video.id}>
                      <div className="relative w-full rounded-xl overflow-hidden border border-border" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${video.id}`}
                          title={video.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                          loading="lazy"
                        />
                      </div>
                      <p className="text-sm text-text-secondary mt-2">{video.title}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Divider */}
            <div className="border-t border-border/50 mx-7" />

            {/* Action Links */}
            <div className="px-7 py-6 flex flex-wrap gap-3">
              <a
                href={mentor.youtubeChannel}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
              >
                <Youtube className="w-4 h-4" />
                Visit YouTube Channel
              </a>
              {mentor.skoolLink && (
                <a
                  href={mentor.skoolLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-colors border border-brand-primary/20"
                >
                  <Users className="w-4 h-4" />
                  Join Their Community
                </a>
              )}
              <a
                href={USER_SKOOL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors"
              >
                <GraduationCap className="w-4 h-4" />
                My Skool Profile
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─── Main MentorCards Section ───────────────────────────────────── */

const MentorCards: React.FC = () => {
  const { language } = useLanguage();
  const copy = SECTION_COPY[language];
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);

  const filteredMentors = activeCategory === 'all'
    ? MENTORS
    : MENTORS.filter((m) => m.category === activeCategory);

  const handleClose = useCallback(() => setSelectedMentor(null), []);

  /* Lookup map: FocusRailItem id → Mentor */
  const mentorMap = useMemo(
    () => Object.fromEntries(MENTORS.map((m) => [m.id, m])) as Record<number, Mentor>,
    []
  );

  /* Convert filtered mentors → FocusRailItem[] */
  const railItems: FocusRailItem[] = filteredMentors.map((mentor) => ({
    id: mentor.id,
    title: mentor.name,
    description: mentor.specialty,
    meta: CATEGORY_LABELS[mentor.category],
    imageSrc:
      mentor.videos.length > 0
        ? `https://img.youtube.com/vi/${mentor.videos[0].id}/hqdefault.jpg`
        : `https://placehold.co/1280x720/050f1a/38bdf8?text=${encodeURIComponent(mentor.name)}`,
  }));

  return (
    <section className="relative py-24" id="reviews">
      {/* Light mode subtle background layer */}
      <div className="absolute inset-0 dark:hidden bg-gradient-to-b from-transparent via-slate-100/50 to-transparent pointer-events-none" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <div className="flex justify-center mb-5">
            <span className="section-eyebrow">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary" />
              </span>
              {copy.eyebrow}
            </span>
          </div>

          <h2 className="mx-auto mb-5 max-w-5xl text-3xl font-bold font-display leading-tight tracking-[-0.02em] text-text-primary md:text-4xl lg:text-5xl">
            {copy.title}
            <br />
            <span className="text-gradient">{copy.highlight}</span>
          </h2>

          <p className="mx-auto max-w-4xl text-base leading-relaxed text-text-secondary md:text-lg">
            {copy.description}
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/25'
                  : 'bg-transparent text-text-secondary border-slate-300 dark:border-border hover:border-brand-primary hover:text-text-primary'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FocusRail Carousel */}
        <div className="rounded-3xl shadow-2xl shadow-slate-300/60 dark:shadow-none">
        <FocusRail
          key={activeCategory}
          items={railItems}
          loop
          autoPlay={false}
          className="mx-auto max-w-6xl"
          onItemDoubleClick={(activeItem) => {
            const mentor = mentorMap[activeItem.id as number];
            if (mentor) setSelectedMentor(mentor);
          }}
          renderActions={(activeItem) => {
            const mentor = mentorMap[activeItem.id as number];
            if (!mentor) return null;
            return (
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={mentor.youtubeChannel}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                >
                  <Youtube className="w-4 h-4" />
                  YouTube
                </a>
                {mentor.skoolLink && (
                  <a
                    href={mentor.skoolLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 border border-brand-primary/20 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    Skool
                  </a>
                )}
                <button
                  onClick={() => setSelectedMentor(mentor)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Learn More
                </button>
              </div>
            );
          }}
        />
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <div className="glass-card inline-flex flex-col sm:flex-row items-center gap-4 rounded-2xl px-8 py-6">
            <div className="text-left">
              <p className="text-base font-semibold text-text-primary">
                Want access to the same AI knowledge base?
              </p>
              <p className="text-sm text-text-secondary">
                Connect with me on Skool and get direct access to proven AI strategies that drive real revenue.
              </p>
            </div>
            <a
              href={USER_SKOOL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/25"
            >
              <GraduationCap className="w-4 h-4" />
              {copy.cta}
            </a>
          </div>
        </motion.div>
      </div>

      {/* Modal */}
      <MentorModal mentor={selectedMentor} onClose={handleClose} />
    </section>
  );
};

export default MentorCards;
