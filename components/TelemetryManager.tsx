import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEventFireAndForget } from '../lib/telemetry/browser';

const SCROLL_MILESTONES = [25, 50, 75, 100];

const SECTION_IDS_BY_ROUTE: Record<string, string[]> = {
  '/': [
    'receptionist',
    'calculator',
    'solutions',
    'comparison',
    'automations',
    'reviews',
    'referral-section',
    'footer',
  ],
  '/contact': ['contact', 'footer'],
  '/privacy': ['footer'],
  '/terms': ['footer'],
};

const TelemetryManager: React.FC = () => {
  const location = useLocation();
  const seenSectionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    seenSectionsRef.current.clear();
    const path = `${location.pathname}${location.search}${location.hash}`;
    trackEventFireAndForget('page_view', {
      path,
      route: location.pathname,
    });
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    const sectionIds = SECTION_IDS_BY_ROUTE[location.pathname] ?? ['footer'];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const sectionId = entry.target.id;
          if (!sectionId || seenSectionsRef.current.has(sectionId)) continue;

          seenSectionsRef.current.add(sectionId);
          trackEventFireAndForget('section_view', {
            sectionId,
            route: location.pathname,
          });
        }
      },
      {
        rootMargin: '0px 0px -20% 0px',
        threshold: 0.35,
      },
    );

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [location.pathname]);

  useEffect(() => {
    const hitMilestones = new Set<number>();

    const handleScroll = () => {
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) {
        return;
      }

      const percent = Math.round((window.scrollY / maxScroll) * 100);
      for (const milestone of SCROLL_MILESTONES) {
        if (percent >= milestone && !hitMilestones.has(milestone)) {
          hitMilestones.add(milestone);
          trackEventFireAndForget('scroll_depth', {
            milestone,
            route: location.pathname,
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  return null;
};

export default TelemetryManager;
