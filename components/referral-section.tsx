'use client';

import { Link } from 'react-router-dom';
import { CardStack, type CardStackItem } from '@/components/ui/card-stack';

const referralCards: CardStackItem[] = [
  {
    id: 1,
    title: 'Hair to Dreads',
    description:
      "Since 2010, Hair to Dreads has been Rotterdam's go-to for premium loc maintenance. With 24/7 AI reception in place, booking intent is captured long after the salon closes.",
    imageSrc:
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
    tag: 'Case Study',
  },
  {
    id: 2,
    title: 'After-Hours Coverage',
    description:
      'Evening and weekend calls no longer wait for a callback. New inquiries are greeted, qualified, and routed the moment they come in.',
    imageSrc:
      'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80',
    tag: 'Operational Gain',
  },
  {
    id: 3,
    title: 'Fewer Lost Bookings',
    description:
      'Routine questions and booking intent get handled immediately, which means fewer missed opportunities and less callback triage for the team.',
    imageSrc:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
    tag: 'Lead Capture',
  },
  {
    id: 4,
    title: 'A Consistent First Impression',
    description:
      'Every caller hears the same clear, branded response whether they phone at 10 a.m. or 10 p.m., which keeps the client experience steady.',
    imageSrc:
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80',
    tag: 'Client Experience',
  },
  {
    id: 5,
    title: 'Referral-Ready Service',
    description:
      'Reliable answer coverage helped turn day-to-day service into a stronger word-of-mouth story, not just a saved lead here and there.',
    imageSrc:
      'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=800&q=80',
    tag: 'Referral Signal',
  },
  {
    id: 6,
    title: 'Could This Work for Your Team?',
    description:
      'If your business depends on inbound calls, we can walk you through the exact setup pattern and where it creates lift.',
    imageSrc:
      'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80',
    tag: 'Next Partnership',
    href: '#contact',
    ctaLabel: 'Book a Demo',
  },
];

export default function ReferralSection() {
  return (
    <section className="relative w-full section-grid-bg py-14 md:py-28 overflow-hidden">
      {/* Background Gradient Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg-main/80 via-bg-card/25 to-bg-main/80 opacity-70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-primary/8 via-transparent to-transparent opacity-50" />

      <div className="page-container relative z-10">
        {/* Header */}
        <div className="mb-8 md:mb-16 text-center">
          <div className="flex justify-center mb-4">
            <span className="section-eyebrow">Case Study</span>
          </div>
          <h2 className="mb-4 text-3xl font-bold font-display tracking-[-0.02em] text-text-primary sm:text-5xl md:text-6xl">
            How One Partner Turned{' '}
            <span className="text-gradient">Missed Calls</span> Into Booked
            Clients
          </h2>

          <p className="mx-auto max-w-3xl text-base leading-relaxed text-text-muted-strong sm:text-xl">
            Hair to Dreads gave us an early real-world proving ground. This
            section walks through the tone, consistency, and lead capture gains
            that came from answering every call.
          </p>
        </div>

        {/* CardStack Component -using Ruixen UI original API */}
        <div className="mx-auto w-full max-w-[1400px]">
          <CardStack
            items={referralCards}
            initialIndex={0}
            autoAdvance
            intervalMs={2800}
            pauseOnHover
            showDots
          />
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-brand-primary/25 px-8 py-4 text-base font-semibold text-accent-ink transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_var(--accent-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main"
            style={{
              background:
                'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
              boxShadow:
                '0 12px 28px color-mix(in srgb, var(--accent-primary) 20%, transparent), 0 6px 20px rgba(0,0,0,0.2)',
            }}
          >
            See If This Fits Your Business
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
