import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'fr' | 'nl';

export const translations = {
  en: {
    nav: {
      receptionist: "Receptionist",
      automations: "Automations",
      calculator: "Calculator",
      solutions: "Solutions",
      comparison: "Comparison",
      reviews: "Reviews",
      bookDemo: "Let's Talk"
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
        hvac: { name: "HVAC", stat: "One saved AC repair = 3x monthly agent cost", desc: "Emergency repairs happen 24/7 — but your team clocks out at 5. Every missed call is a $500+ job walking straight to your competitor on Google. Our AI voice agent answers instantly, qualifies the emergency, books the dispatch, and sends a confirmation text — all before the customer even thinks about calling someone else. During peak summer and winter surges, your AI scales infinitely while your techs focus on turning wrenches." },
        dental: { name: "Dental", stat: "Recovered patient LTV = $2,000+", desc: "A single missed new-patient call costs you $2,000+ in lifetime value — cleanings, fillings, crowns, referrals. Your front desk is already juggling check-ins, insurance, and walk-ins. Our AI voice agent handles every inbound call with warmth and precision: confirming insurance, booking the right time slot, and sending appointment reminders. No hold music. No voicemail. Just instant, professional patient care from the very first ring." },
        roofing: { name: "Roofing", stat: "Avg Job Value: $12k. Don't miss one.", desc: "When a storm rolls through, your phone explodes — 50, 100, 200 calls in a single day. Your crew can't answer them all, and every missed call is a $8K–$15K job gone. Our AI voice agent captures every single lead: collecting property details, qualifying urgency, scheduling inspections, and following up automatically. While your competitors let calls go to voicemail, you're booking jobs around the clock." },
        tree: { name: "Tree Service", stat: "Seasonal rush handling on autopilot", desc: "Spring storms and fall cleanups create massive call surges that overwhelm your office. Homeowners call once — if nobody answers, they move on. Your AI voice agent handles unlimited concurrent calls: assessing the job scope, providing rough estimates, and booking on-site consultations. It even follows up with leads who didn't book right away. Capture every seasonal opportunity without hiring temporary office staff." },
        auto: { name: "Auto Repair", stat: "Book appointments while you turn wrenches", desc: "Your best mechanics shouldn't be answering phones — they should be under the hood. But when calls go to voicemail, customers drive to the next shop. Our AI voice agent books appointments, answers common questions about services and pricing, and sends text confirmations — all while your team stays focused on repairs. It handles oil changes, brake jobs, diagnostics, and tire appointments without missing a beat. More booked bays, zero phone interruptions." }
      }
    },
    comparison: {
      title: "The",
      titleHighlight: "100% Answer Rate",
      titleSuffix: "Difference",
      gallery: [
        {
          title: "The Roadmap to Success",
          subtitle: "Old Way vs. The AI Way",
          description: "Experience the shift from missed calls to instant engagement. See how AI transforms your customer's journey from frustration to satisfaction."
        },
        {
          title: "Discovery Call",
          subtitle: "Step 1: Understanding You",
          description: "We don't just sell software; we build solutions. our first conversation is a deep dive into your business bottlenecks and call flows."
        },
        {
          title: "The Strategy",
          subtitle: "Step 2: Implementation",
          description: "We design a custom voice architecture. From script nuances to integration logic, we tailor the perfect voice solution for your specific workflow."
        },
        {
          title: "The Solution",
          subtitle: "Step 3: Growth & Results",
          description: "Harvesting low-hanging fruits immediately. We deploy the agent and you start capturing every missed opportunity, scaling your revenue on autopilot."
        },
        {
          title: "The Old Way",
          subtitle: "Frustration & Voicemail",
          description: "Rings 5 times -> Goes to Voicemail. Customers hang up. You lose the lead, and they call your competitor within seconds."
        },
        {
          title: "Lost Opportunity",
          subtitle: "Phone Tag & Ghosting",
          description: "60% of callers don't leave messages. You play phone tag for days, wasting hours of admin time only to find they've already hired someone else."
        }
      ]
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
      receptionist: "Réceptionniste",
      automations: "Automatisations",
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
        hvac: { name: "CVC", stat: "Une réparation sauvée = 3x le coût mensuel de l'agent", desc: "Les urgences arrivent 24/7 — mais votre équipe s'arrête à 17h. Chaque appel manqué, c'est un job de 500€+ qui file droit chez votre concurrent sur Google. Notre agent vocal IA répond instantanément, qualifie l'urgence, planifie l'intervention et envoie un SMS de confirmation — avant même que le client pense à appeler quelqu'un d'autre. Pendant les pics d'été et d'hiver, votre IA s'adapte à l'infini pendant que vos techniciens se concentrent sur les réparations." },
        dental: { name: "Dentaire", stat: "LTV patient récupéré = 2 000 €+", desc: "Un seul appel manqué d'un nouveau patient vous coûte 2 000€+ en valeur à vie — détartrages, soins, couronnes, parrainages. Votre accueil jongle déjà entre les arrivées, les assurances et les sans rendez-vous. Notre agent vocal IA gère chaque appel entrant avec chaleur et précision : vérifie l'assurance, réserve le bon créneau et envoie des rappels. Pas de musique d'attente. Pas de messagerie. Juste un accueil patient professionnel et instantané dès la première sonnerie." },
        roofing: { name: "Toiture", stat: "Val. Moy. Job : 12k €. N'en manquez aucun.", desc: "Quand la tempête frappe, votre téléphone explose — 50, 100, 200 appels en une journée. Votre équipe ne peut pas tous les prendre, et chaque appel manqué c'est un chantier de 8 000 à 15 000€ perdu. Notre agent vocal IA capture chaque prospect : collecte les détails du bien, qualifie l'urgence, planifie les inspections et relance automatiquement. Pendant que vos concurrents laissent sonner, vous bookez des chantiers 24/7." },
        tree: { name: "Élagage", stat: "Gestion du rush saisonnier en pilote automatique", desc: "Les tempêtes de printemps et les nettoyages d'automne créent des pics d'appels massifs qui submergent votre bureau. Les propriétaires appellent une fois — si personne ne répond, ils passent à autre chose. Votre agent vocal IA gère un nombre illimité d'appels simultanés : évalue l'ampleur du travail, fournit des estimations et planifie les consultations sur place. Il relance même les prospects qui n'ont pas réservé immédiatement. Capturez chaque opportunité saisonnière sans embaucher de personnel temporaire." },
        auto: { name: "Garage", stat: "Prenez des RDV pendant que vous réparez", desc: "Vos meilleurs mécaniciens ne devraient pas répondre au téléphone — ils devraient être sous le capot. Mais quand les appels tombent sur la messagerie, les clients vont au garage d'à côté. Notre agent vocal IA prend les rendez-vous, répond aux questions courantes sur les services et tarifs, et envoie des confirmations par SMS — le tout pendant que votre équipe reste concentrée sur les réparations. Vidanges, freins, diagnostics, pneumatiques : tout est géré sans rater un battement. Plus de baies réservées, zéro interruption téléphonique." }
      }
    },
    comparison: {
      title: "La Différence d'un",
      titleHighlight: "Taux de Réponse de 100%",
      titleSuffix: "",
      gallery: [
        {
          title: "La Différence 100%",
          subtitle: "Ancienne Méthode vs IA",
          description: "Découvrez le passage des appels manqués à l'engagement instantané. Voyez comment l'IA transforme le parcours de votre client, de la frustration à la satisfaction."
        },
        {
          title: "Appel de Découverte",
          subtitle: "Étape 1 : Vous Comprendre",
          description: "Nous ne vendons pas juste un logiciel ; nous construisons des solutions. Notre première conversation est une analyse approfondie de vos goulots d'étranglement."
        },
        {
          title: "La Stratégie",
          subtitle: "Étape 2 : Implémentation",
          description: "Nous concevons une architecture vocale sur mesure. Des nuances du script à la logique d'intégration, nous créons la solution vocale parfaite pour votre flux de travail."
        },
        {
          title: "La Solution",
          subtitle: "Étape 3 : Croissance & Résultats",
          description: "Récoltez les fruits immédiatement. Nous déployons l'agent et vous commencez à capturer chaque opportunité manquée, augmentant vos revenus en pilote automatique."
        },
        {
          title: "L'Ancienne Méthode",
          subtitle: "Frustration & Messagerie",
          description: "Sonne 5 fois -> Messagerie. Les clients raccrochent. Vous perdez le prospect, et ils appellent votre concurrent dans la seconde."
        },
        {
          title: "Opportunité Perdue",
          subtitle: "Jeu du Chat & Fantômes",
          description: "60% des appelants ne laissent pas de message. Vous jouez au chat et à la souris pendant des jours, perdant des heures d'admin pour découvrir qu'ils ont déjà engagé quelqu'un d'autre."
        }
      ]
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
      receptionist: "Receptionist",
      automations: "Automatisering",
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
        hvac: { name: "Installatie", stat: "Eén geredde reparatie = 3x maandelijkse kosten", desc: "Noodreparaties gebeuren 24/7 — maar uw team stopt om 17u. Elke gemiste oproep is een klus van €500+ die rechtstreeks naar uw concurrent op Google gaat. Onze AI-spraakagent neemt direct op, kwalificeert de noodsituatie, plant de afspraak en stuurt een bevestigings-SMS — allemaal vóórdat de klant eraan denkt iemand anders te bellen. Tijdens piekperiodes in zomer en winter schaalt uw AI oneindig terwijl uw monteurs zich op reparaties focussen." },
        dental: { name: "Tandarts", stat: "Geredde klantwaarde = €2.000+", desc: "Eén gemist telefoontje van een nieuwe patiënt kost u €2.000+ aan levenslange waarde — controles, vullingen, kronen, doorverwijzingen. Uw receptie jongleert al met check-ins, verzekeringen en inlopers. Onze AI-spraakagent behandelt elk inkomend gesprek met warmte en precisie: controleert de verzekering, boekt het juiste tijdslot en stuurt afspraakherinneringen. Geen wachtmuziek. Geen voicemail. Gewoon directe, professionele patiëntenzorg vanaf de allereerste bel." },
        roofing: { name: "Dakdekker", stat: "Gem. Kluswaarde: €12k. Mis er geen één.", desc: "Als er een storm doortrekt, ontploft uw telefoon — 50, 100, 200 oproepen op één dag. Uw team kan ze niet allemaal beantwoorden, en elke gemiste oproep is een klus van €8.000–€15.000 kwijt. Onze AI-spraakagent legt elke lead vast: verzamelt objectgegevens, beoordeelt de urgentie, plant inspecties en volgt automatisch op. Terwijl uw concurrenten de voicemail laten opnemen, boekt u klussen dag en nacht." },
        tree: { name: "Boomverzorging", stat: "Seizoensdrukte op automatische piloot", desc: "Lentestormen en herfstopruimingen veroorzaken enorme belpieken die uw kantoor overspoelen. Huiseigenaren bellen één keer — als niemand opneemt, gaan ze verder. Uw AI-spraakagent handelt onbeperkt gelijktijdige oproepen af: beoordeelt de omvang van het werk, geeft ruwe schattingen en plant consultaties ter plaatse. Hij volgt zelfs leads op die niet direct hebben geboekt. Grijp elke seizoenskans zonder tijdelijk kantoorpersoneel in te huren." },
        auto: { name: "Garage", stat: "Boek afspraken terwijl u sleutelt", desc: "Uw beste monteurs horen niet de telefoon op te nemen — ze horen onder de motorkap te zitten. Maar als oproepen naar de voicemail gaan, rijden klanten naar de volgende garage. Onze AI-spraakagent boekt afspraken, beantwoordt veelgestelde vragen over diensten en prijzen, en stuurt SMS-bevestigingen — terwijl uw team gefocust blijft op reparaties. Olieverversingen, remmen, diagnoses en banden: alles wordt afgehandeld zonder een tel te missen. Meer gevulde werkplaatsen, nul telefoononderbrekingen." }
      }
    },
    comparison: {
      title: "Het Verschil van",
      titleHighlight: "100% Antwoordratio",
      titleSuffix: "",
      gallery: [
        {
          title: "Het 100% Verschil",
          subtitle: "Oude Manier vs. De AI Manier",
          description: "Ervaar de verschuiving van gemiste oproepen naar directe betrokkenheid. Zie hoe AI de klantreis transformeert van frustratie naar tevredenheid."
        },
        {
          title: "Ontdekkingsgesprek",
          subtitle: "Stap 1: U Begrijpen",
          description: "Wij verkopen geen software; wij bouwen oplossingen. Ons eerste gesprek is een diepe duik in uw knelpunten en gesprekflows."
        },
        {
          title: "De Strategie",
          subtitle: "Stap 2: Implementatie",
          description: "Wij ontwerpen een spraakarchitectuur op maat. Van scriptnuances tot integratielogica, wij maken de perfecte spraakoplossing voor uw specifieke workflow."
        },
        {
          title: "De Oplossing",
          subtitle: "Stap 3: Groei & Resultaten",
          description: "Pluk direct de vruchten. Wij implementeren de agent en u begint elke gemiste kans te benutten, waardoor uw omzet op de automatische piloot schaalt."
        },
        {
          title: "De Oude Manier",
          subtitle: "Frustratie & Voicemail",
          description: "Gaat 5 keer over -> Voicemail. Klanten hangen op. U verliest de lead, en ze bellen uw concurrent binnen enkele seconden."
        },
        {
          title: "Verloren Kans",
          subtitle: "Telefoontag & Spookbeelden",
          description: "60% van de bellers laat geen bericht achter. U speelt dagenlang telefoontag, verspilt uren aan administratie om erachter te komen dat ze al iemand anders hebben ingehuurd."
        }
      ]
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

interface LanguageContextType
{
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) =>
{
  const [language, setLanguage] = useState<Language>('en');

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () =>
{
  const context = useContext(LanguageContext);
  if (context === undefined)
  {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};