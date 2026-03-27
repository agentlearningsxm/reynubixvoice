import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, GraduationCap, Users, X, Youtube } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Language, useLanguage } from '../contexts/LanguageContext';
import { CATEGORIES, MENTORS, type Mentor } from '../data/mentors';
import { FocusRail, type FocusRailItem } from './ui/focus-rail';

const USER_SKOOL = 'https://www.skool.com/@reynoso-anubis-8987';

/* ─── Section Copy (Multi-language) ──────────────────────────────── */

const SECTION_COPY: Record<
  Language,
  {
    eyebrow: string;
    title: string;
    highlight: string;
    description: string;
    cta: string;
  }
> = {
  en: {
    eyebrow: 'Expert Network',
    title: 'The Expert Network',
    highlight: 'Behind Every System We Launch.',
    description:
      'We learn from operators building with AI across automation, voice, web, and growth. Their frameworks sharpen how we design dependable systems for your business.',
    cta: 'View My Skool Profile',
  },
  fr: {
    eyebrow: 'R\u00e9seau d\u2019Experts',
    title: 'Le R\u00e9seau d\u2019Experts',
    highlight: 'Derri\u00e8re Chaque Syst\u00e8me Que Nous Lan\u00e7ons.',
    description:
      'Nous apprenons aupr\u00e8s d\u2019op\u00e9rateurs qui construisent avec l\u2019IA dans l\u2019automatisation, la voix, le web et la croissance. Leurs m\u00e9thodes renforcent la fiabilit\u00e9 des syst\u00e8mes que nous concevons pour votre entreprise.',
    cta: 'Voir Mon Profil Skool',
  },
  nl: {
    eyebrow: 'Expert Netwerk',
    title: 'Het Expert Netwerk',
    highlight: 'Achter Elk Systeem Dat We Lanceren.',
    description:
      'We leren van operators die met AI bouwen in automatisering, voice, web en groei. Hun frameworks helpen ons betrouwbaardere systemen voor jouw bedrijf te ontwerpen.',
    cta: 'Bekijk Mijn Skool Profiel',
  },
};

/* ─── Category Badge Color Map ───────────────────────────────────── */

const CATEGORY_COLORS: Record<string, string> = {
  n8n: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  voice: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  web: 'bg-amber-600/15 text-amber-500 border-amber-600/30',
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

const MentorModal: React.FC<{ mentor: Mentor | null; onClose: () => void }> = ({
  mentor,
  onClose,
}) => {
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
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-bg-glass/90 text-text-muted-strong backdrop-blur-md transition-colors hover:border-brand-primary/30 hover:text-text-primary"
            >
              <X className="w-4 h-4 text-text-primary" />
            </button>

            {/* Gradient Header */}
            <div
              className={`relative h-44 bg-gradient-to-br ${mentor.gradient} opacity-25 rounded-t-2xl`}
            />

            {/* Identity Row */}
            <div className="px-7 -mt-12 relative pb-6">
              <div className="flex items-end gap-5 mb-5">
                <div
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${mentor.gradient} flex items-center justify-center text-accent-ink text-2xl font-bold shadow-2xl border-4 border-bg-main shrink-0`}
                >
                  {mentor.initials}
                </div>
                <div className="pb-1 min-w-0">
                  <h3 className="text-2xl font-bold text-text-primary font-display leading-tight">
                    {mentor.name}
                  </h3>
                  <p className="mt-0.5 text-sm text-text-muted-strong">
                    {mentor.specialty}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${CATEGORY_COLORS[mentor.category]}`}
              >
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
              <p className="text-base leading-relaxed text-text-muted-strong">
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
                      <div
                        className="relative w-full rounded-xl overflow-hidden border border-border"
                        style={{ paddingBottom: '56.25%' }}
                      >
                        <iframe
                          src={`https://www.youtube.com/embed/${video.id}`}
                          title={video.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                          loading="lazy"
                        />
                      </div>
                      <p className="mt-2 text-sm text-text-muted-strong">
                        {video.title}
                      </p>
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
                className="inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/16"
              >
                <Youtube className="w-4 h-4" />
                Visit YouTube Channel
              </a>
              {mentor.skoolLink && (
                <a
                  href={mentor.skoolLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-primary/25 bg-brand-primary/10 px-4 py-2.5 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary/16"
                >
                  <Users className="w-4 h-4" />
                  Join Their Community
                </a>
              )}
              <a
                href={USER_SKOOL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-brand-primary/25 px-5 py-3 text-sm font-semibold text-accent-ink transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_var(--accent-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main"
                style={{
                  background:
                    'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                  boxShadow:
                    '0 12px 28px color-mix(in srgb, var(--accent-primary) 20%, transparent), 0 6px 20px rgba(0,0,0,0.2)',
                }}
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

  const filteredMentors =
    activeCategory === 'all'
      ? MENTORS
      : MENTORS.filter((m) => m.category === activeCategory);

  const handleClose = useCallback(() => setSelectedMentor(null), []);

  // Voice agent section control
  useEffect(() => {
    const handler = (e: Event) => {
      const { action, value } = (e as CustomEvent).detail;
      if (action === 'set_category_filter' && value) {
        const validCategories = CATEGORIES.map((c) => c.id);
        if (validCategories.includes(value)) {
          setActiveCategory(value);
        }
      } else if (action === 'open_mentor_modal' && value) {
        const mentor = MENTORS.find((m) =>
          m.name.toLowerCase().includes(value.toLowerCase()),
        );
        if (mentor) setSelectedMentor(mentor);
      } else if (action === 'close_modal') {
        setSelectedMentor(null);
      }
    };
    window.addEventListener('toggleSection', handler);
    return () => window.removeEventListener('toggleSection', handler);
  }, []);

  /* Lookup map: FocusRailItem id → Mentor */
  const mentorMap = useMemo(
    () =>
      Object.fromEntries(MENTORS.map((m) => [m.id, m])) as Record<
        number,
        Mentor
      >,
    [],
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
        : `https://placehold.co/1280x720/1a1714/ddb872?text=${encodeURIComponent(mentor.name)}`,
  }));

  return (
    <section className="relative py-14 md:py-28 section-grid-bg" id="reviews">
      {/* Light mode subtle background layer */}
      <div className="absolute inset-0 dark:hidden bg-gradient-to-b from-transparent via-slate-100/50 to-transparent pointer-events-none" />
      <div className="page-container relative">
        {/* Section Header */}
        <div className="mb-14 text-center">
          <div className="flex justify-center mb-4">
            <span className="section-eyebrow">{copy.eyebrow}</span>
          </div>

          <h2 className="mx-auto mb-5 max-w-5xl text-3xl font-bold font-display leading-tight tracking-[-0.02em] text-text-primary md:text-4xl lg:text-5xl">
            {copy.title}
            <br />
            <span className="text-gradient">{copy.highlight}</span>
          </h2>

          <p className="mx-auto max-w-4xl text-base leading-relaxed text-text-muted-strong md:text-lg">
            {copy.description}
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border cursor-pointer ${
                activeCategory === cat.id
                  ? 'border-brand-primary bg-brand-primary text-accent-ink shadow-[0_12px_24px_var(--accent-glow)]'
                  : 'bg-bg-glass/60 text-text-muted-strong border-border/80 hover:border-brand-primary/35 hover:text-text-primary'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FocusRail Carousel */}
        <div
          key={activeCategory}
          className="card-surface rounded-[32px] border-border/80 bg-bg-card/75 shadow-[0_18px_44px_rgba(0,0,0,0.14)]"
        >
          <FocusRail
            items={railItems}
            loop
            autoPlay={false}
            className="mx-auto max-w-[1400px]"
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
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/16"
                  >
                    <Youtube className="w-4 h-4" />
                    YouTube
                  </a>
                  {mentor.skoolLink && (
                    <a
                      href={mentor.skoolLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-brand-primary/25 bg-brand-primary/10 px-3 py-2 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary/16"
                    >
                      <Users className="w-4 h-4" />
                      Skool
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedMentor(mentor)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary/25 px-4 py-2 text-sm font-semibold text-accent-ink transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_var(--accent-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                    }}
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
          className="mt-20 text-center"
        >
          <div className="glass-card inline-flex flex-col items-center gap-4 rounded-[28px] bg-bg-glass/80 p-8 sm:flex-row">
            <div className="text-left">
              <p className="text-base font-semibold text-text-primary">
                Want access to the same expert network?
              </p>
              <p className="text-sm leading-relaxed text-text-muted-strong">
                Connect with me on Skool for the playbooks, operators, and
                practical AI strategies informing these builds.
              </p>
            </div>
            <a
              href={USER_SKOOL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-brand-primary/25 px-6 py-3 text-sm font-semibold text-accent-ink transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_var(--accent-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main"
              style={{
                background:
                  'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
              }}
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
