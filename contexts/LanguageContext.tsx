import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'fr' | 'nl';

export const translations = {
  en: {
    nav: {
      calculator: "Calculator",
      solutions: "Solutions",
      comparison: "Comparison",
      reviews: "Reviews",
      bookDemo: "Book a Demo"
    },
    hero: {
      tag: "AI Receptionist Live Demo",
      headline: "Stop Burning Revenue on",
      headlineHighlight: "Missed Calls",
      subheadline: "The 24/7 AI receptionist that books appointments, qualifies leads, and integrates with your calendar instantly.",
      payoff: "Pay for itself with just one saved client.",
      listenSample: "Listen to Sample",
      bookDemo: "Book a Demo",
      trustedBy: "Trusted by 500+ businesses",
      widget: {
        incoming: "Incoming Call...",
        agent: "Reyna",
        transcript1: "Thanks for calling Apex Roofing. Do you have an emergency leak or need an estimate?",
        transcript2: "I need an estimate for a new roof.",
        transcript3: "Great! I can book you for Tuesday at 10 AM. Does that work?",
        saved: "Revenue Saved",
        booked: "Appointment Booked",
        time: "Tomorrow, 2:00 PM"
      }
    },
    calculator: {
      title: "The True Cost of",
      titleHighlight: "Silence",
      subtitle: "Use the slider below to see how much revenue walks out the door when you don't answer.",
      revenueLabel: "Avg. Revenue per Customer",
      missedLabel: "Missed Calls Per Day",
      monthlyLoss: "Monthly Loss",
      yearlyLoss: "Yearly Loss",
      disclaimer: "Assuming 25% booking rate",
      cta: "Our AI agent works 24/7 for a fraction of this loss. Recover",
      ctaHighlight: "up to 90%",
      scenarios: {
        contractor: "Contractor",
        hvac: "HVAC",
        dental: "Dental"
      }
    },
    industries: {
      title: "Built for",
      titleHighlight: "High-Value",
      titleSuffix: "Industries",
      subtitle: "Click your niche to see the impact.",
      items: {
        hvac: { name: "HVAC", stat: "One saved AC repair = 3x monthly agent cost", desc: "Emergency repairs happen 24/7. If you miss the call, you lose the job to the next guy on Google." },
        dental: { name: "Dental", stat: "Recovered patient LTV = $2,000+", desc: "Don't let new patients slip away. Instant booking means instant retention." },
        roofing: { name: "Roofing", stat: "Avg Job Value: $12k. Don't miss one.", desc: "Storm damage leads come in bursts. Capture every single lead instantly." },
        tree: { name: "Tree Service", stat: "Seasonal rush handling on autopilot", desc: "When the season hits, your phone rings off the hook. AI handles the overflow." },
        auto: { name: "Auto Repair", stat: "Book appointments while you turn wrenches", desc: "Stop washing your hands to answer the phone. Let AI fill your bay schedule." }
      }
    },
    comparison: {
      title: "The",
      titleHighlight: "100% Answer Rate",
      titleSuffix: "Difference",
      oldWay: {
        title: "The Old Way",
        items: [
          "Rings 5 times -> Goes to Voicemail",
          "Customer hangs up (60% don't leave msgs)",
          "Phone tag game for hours/days",
          "Lost Revenue & Customer goes to competitor"
        ]
      },
      aiWay: {
        title: "The AI Way",
        items: [
          "Rings 1 time -> AI answers instantly",
          "Handles request naturally & qualifies lead",
          "Books appointment directly to calendar",
          "Happy Customer + Revenue Secured on Autopilot"
        ]
      }
    },
    social: {
      trusted: "TRUSTED BY FORWARD-THINKING BUSINESSES",
      testimonials: [
        { quote: "We were missing 4 calls a day. The bot caught a $12k roofing job on its first night.", role: "Apex Roofing" },
        { quote: "My front desk was overwhelmed. Now the AI handles 80% of calls. It pays for a full employee's salary.", role: "Smile Dental" },
        { quote: "It sounds so human my customers don't even know it's AI. Incredible tech.", role: "DK HVAC" }
      ]
    },
    footer: {
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      contact: "Contact",
      rights: "All rights reserved."
    },
    currency: "$"
  },
  fr: {
    nav: {
      calculator: "Calculatrice",
      solutions: "Solutions",
      comparison: "Comparaison",
      reviews: "Avis",
      bookDemo: "Réserver"
    },
    hero: {
      tag: "Démo Agent IA en Direct",
      headline: "Arrêtez de Brûler vos Revenus sur des",
      headlineHighlight: "Appels Manqués",
      subheadline: "Le réceptionniste IA 24/7 qui prend les rendez-vous, qualifie les prospects et s'intègre à votre calendrier instantanément.",
      payoff: "Se paie avec un seul client sauvé.",
      listenSample: "Écouter un Exemple",
      bookDemo: "Réserver une Démo",
      trustedBy: "Reconnu par 500+ entreprises",
      widget: {
        incoming: "Appel Entrant...",
        agent: "Reyna",
        transcript1: "Merci d'appeler Apex Toiture. C'est pour une urgence ou un devis ?",
        transcript2: "J'ai besoin d'un devis pour une toiture.",
        transcript3: "Parfait ! Je peux vous noter pour mardi à 10h. Ça vous va ?",
        saved: "Revenus Sauvés",
        booked: "Rendez-vous Confirmé",
        time: "Demain, 14h00"
      }
    },
    calculator: {
      title: "Le Vrai Coût du",
      titleHighlight: "Silence",
      subtitle: "Utilisez le curseur pour voir combien de revenus vous perdez quand vous ne répondez pas.",
      revenueLabel: "Rev. Moyen par Client",
      missedLabel: "Appels Manqués / Jour",
      monthlyLoss: "Perte Mensuelle",
      yearlyLoss: "Perte Annuelle",
      disclaimer: "Basé sur 25% de conversion",
      cta: "Notre agent IA travaille 24/7 pour une fraction de cette perte. Récupérez",
      ctaHighlight: "jusqu'à 90%",
      scenarios: {
        contractor: "Entrepreneur",
        hvac: "CVC",
        dental: "Dentaire"
      }
    },
    industries: {
      title: "Conçu pour les Industries à",
      titleHighlight: "Haute Valeur",
      titleSuffix: "",
      subtitle: "Cliquez sur votre niche pour voir l'impact.",
      items: {
        hvac: { name: "CVC", stat: "Une réparation sauvée = 3x le coût mensuel de l'agent", desc: "Les urgences arrivent 24/7. Si vous manquez l'appel, vous perdez le travail au profit du suivant sur Google." },
        dental: { name: "Dentaire", stat: "LTV patient récupéré = 2 000 €+", desc: "Ne laissez pas filer les nouveaux patients. Réservation instantanée signifie rétention instantanée." },
        roofing: { name: "Toiture", stat: "Val. Moy. Job : 12k €. N'en manquez aucun.", desc: "Les prospects suite aux tempêtes arrivent par vagues. Capturez chaque prospect instantanément." },
        tree: { name: "Élagage", stat: "Gestion du rush saisonnier en pilote automatique", desc: "Quand la saison arrive, votre téléphone n'arrête pas de sonner. L'IA gère le débordement." },
        auto: { name: "Garage", stat: "Prenez des RDV pendant que vous réparez", desc: "Arrêtez de vous laver les mains pour répondre au téléphone. Laissez l'IA remplir votre planning." }
      }
    },
    comparison: {
      title: "La Différence d'un",
      titleHighlight: "Taux de Réponse de 100%",
      titleSuffix: "",
      oldWay: {
        title: "L'Ancienne Méthode",
        items: [
          "Sonne 5 fois -> Messagerie vocale",
          "Le client raccroche (60% ne laissent pas de msg)",
          "Jeu du chat et de la souris pendant des heures",
          "Revenu perdu & Client part chez le concurrent"
        ]
      },
      aiWay: {
        title: "La Méthode IA",
        items: [
          "Sonne 1 fois -> L'IA répond instantanément",
          "Gère la demande naturellement & qualifie",
          "Réserve le rendez-vous directement",
          "Client Heureux + Revenu Sécurisé en Pilote Auto"
        ]
      }
    },
    social: {
      trusted: "RECONNU PAR DES ENTREPRISES VISIONNAIRES",
      testimonials: [
        { quote: "Nous manquions 4 appels par jour. Le bot a décroché un contrat de 12k € dès sa première nuit.", role: "Apex Toiture" },
        { quote: "Mon accueil était débordé. Maintenant l'IA gère 80% des appels. Elle paie le salaire d'un employé.", role: "Sourire Dentaire" },
        { quote: "Ça sonne tellement humain que mes clients ne savent même pas que c'est une IA. Tech incroyable.", role: "DK CVC" }
      ]
    },
    footer: {
      privacy: "Confidentialité",
      terms: "Conditions",
      contact: "Contact",
      rights: "Tous droits réservés."
    },
    currency: "€"
  },
  nl: {
    nav: {
      calculator: "Calculator",
      solutions: "Oplossingen",
      comparison: "Vergelijking",
      reviews: "Reviews",
      bookDemo: "Boek Demo"
    },
    hero: {
      tag: "AI Receptionist Live Demo",
      headline: "Stop Met Omzetverlies Door",
      headlineHighlight: "Gemiste Oproepen",
      subheadline: "De 24/7 AI-receptionist die afspraken boekt, leads kwalificeert en direct integreert met uw agenda.",
      payoff: "Verdient zichzelf terug met slechts één geredde klant.",
      listenSample: "Luister naar Voorbeeld",
      bookDemo: "Boek een Demo",
      trustedBy: "Vertrouwd door 500+ bedrijven",
      widget: {
        incoming: "Inkomende Oproep...",
        agent: "Reyna",
        transcript1: "Bedankt voor het bellen naar Apex Dakwerken. Heeft u een lekkage of wilt u een offerte?",
        transcript2: "Ik wil graag een offerte voor een nieuw dak.",
        transcript3: "Top! Ik kan u inplannen voor dinsdag om 10 uur. Schikt dat?",
        saved: "Omzet Gered",
        booked: "Afspraak Geboekt",
        time: "Morgen, 14:00"
      }
    },
    calculator: {
      title: "De Ware Kosten van",
      titleHighlight: "Stilte",
      subtitle: "Gebruik de schuifregelaar hieronder om te zien hoeveel omzet de deur uitloopt als u niet opneemt.",
      revenueLabel: "Gem. Omzet per Klant",
      missedLabel: "Gemiste Oproepen per Dag",
      monthlyLoss: "Maandelijks Verlies",
      yearlyLoss: "Jaarlijks Verlies",
      disclaimer: "Op basis van 25% boekingspercentage",
      cta: "Onze AI-agent werkt 24/7 voor een fractie van dit verlies. Herstel",
      ctaHighlight: "tot 90%",
      scenarios: {
        contractor: "Aannemer",
        hvac: "Installateur",
        dental: "Tandarts"
      }
    },
    industries: {
      title: "Gemaakt voor",
      titleHighlight: "Hoogwaardige",
      titleSuffix: "Industrieën",
      subtitle: "Klik op uw sector om de impact te zien.",
      items: {
        hvac: { name: "Installatie", stat: "Eén geredde reparatie = 3x maandelijkse kosten", desc: "Noodreparaties gebeuren 24/7. Als u de oproep mist, verliest u de klus aan de volgende op Google." },
        dental: { name: "Tandarts", stat: "Geredde klantwaarde = €2.000+", desc: "Laat nieuwe patiënten niet wegglippen. Direct boeken betekent directe retentie." },
        roofing: { name: "Dakdekker", stat: "Gem. Kluswaarde: €12k. Mis er geen één.", desc: "Stormschade leads komen in golven. Leg elke lead direct vast." },
        tree: { name: "Boomverzorging", stat: "Seizoensdrukte op automatische piloot", desc: "Als het seizoen begint, staat uw telefoon roodgloeiend. AI vangt de overloop op." },
        auto: { name: "Garage", stat: "Boek afspraken terwijl u sleutelt", desc: "Stop met handen wassen om de telefoon op te nemen. Laat AI uw agenda vullen." }
      }
    },
    comparison: {
      title: "Het Verschil van",
      titleHighlight: "100% Antwoordratio",
      titleSuffix: "",
      oldWay: {
        title: "De Oude Manier",
        items: [
          "Gaat 5 keer over -> Voicemail",
          "Klant hangt op (60% laat geen bericht achter)",
          "Urenlang terugbellen zonder resultaat",
          "Verloren Omzet & Klant gaat naar concurrent"
        ]
      },
      aiWay: {
        title: "De AI Manier",
        items: [
          "Gaat 1 keer over -> AI neemt direct op",
          "Handelt verzoek natuurlijk af & kwalificeert",
          "Boekt afspraak direct in agenda",
          "Blije Klant + Omzet Veiliggesteld op Autopiloot"
        ]
      }
    },
    social: {
      trusted: "VERTROUWD DOOR VOORUITSTREVENDE BEDRIJVEN",
      testimonials: [
        { quote: "We misten 4 oproepen per dag. De bot pakte een dakklus van €12k op zijn eerste avond.", role: "Apex Dakwerken" },
        { quote: "Mijn receptie was overweldigd. Nu handelt AI 80% van de oproepen af. Het betaalt een volledig salaris.", role: "Smile Tandartsen" },
        { quote: "Het klinkt zo menselijk dat mijn klanten niet eens weten dat het AI is. Ongelooflijke tech.", role: "DK Installatietechniek" }
      ]
    },
    footer: {
      privacy: "Privacybeleid",
      terms: "Algemene Voorwaarden",
      contact: "Contact",
      rights: "Alle rechten voorbehouden."
    },
    currency: "€"
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};