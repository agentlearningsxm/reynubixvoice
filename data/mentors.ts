export interface MentorVideo {
  id: string;
  title: string;
}

export interface Mentor {
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

export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'n8n', label: 'n8n Automations' },
  { id: 'voice', label: 'Voice AI' },
  { id: 'web', label: 'Web Design' },
  { id: 'claude', label: 'Claude Code' },
  { id: 'mindset', label: 'AI & Business' },
];

export const MENTORS: Mentor[] = [
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
    gradient: 'from-amber-500 to-yellow-600',
    description:
      'Nate taught me to build AI automation systems that run your business while you sleep. His n8n masterclass showed me how to create lead-capture bots, auto-follow-ups, and smart scheduling  so your phone rings with pre-qualified customers, not tire-kickers. Think: a Rotterdam plumber getting 30% more booked jobs without hiring anyone new.',
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
    gradient: 'from-yellow-500 to-amber-600',
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
    videos: [{ id: '0_TQV5tfFds', title: 'Production-Grade Voice AI Systems' }],
    skoolLink: 'https://www.skool.com/voiceai',
    gradient: 'from-emerald-500 to-emerald-700',
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
      {
        id: 'RY3j5aRLLao',
        title: 'Retell AI Tutorial: Build a Voice Receptionist',
      },
    ],
    skoolLink: 'https://www.skool.com/amplify-voice-ai',
    gradient: 'from-green-500 to-emerald-600',
    description:
      'Alejo & Paige run the Amplify Voice AI community  the go-to place for voice agent builders. They taught me step-by-step how to build a voice receptionist that sounds human, books jobs automatically, and never puts a caller on hold. Like having your best receptionist working 24/7  for a fraction of the cost.',
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
    gradient: 'from-amber-500 to-yellow-600',
    description:
      'Henryk is a Voice AI pioneer who deploys agents at 20x lower cost and 32x faster than traditional call centers. His Voice AI Bootcamp taught me how to build systems that handle hundreds of calls simultaneously  meaning your business never misses a lead, even during peak hours. Like hiring 50 receptionists for the price of one.',
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
    gradient: 'from-yellow-500 to-amber-600',
    description:
      'Jannis built multiple SaaS companies and co-runs the Voice AI Bootcamp. He showed me exactly how to build and scale voice AI systems  from first agent to fully automated phone operations that save businesses thousands per month. His approach: never let another call go unanswered, and turn every missed call into a booked job.',
  },
  {
    id: 7,
    name: 'Roberts',
    initials: 'JR',
    category: 'web',
    specialty: 'AI-Powered Web Design & Vibe Coding',
    youtubeChannel: 'https://www.youtube.com/@Itssssss_Jack',
    videos: [
      {
        id: 'gh9Y3tHeFXQ',
        title: 'Build Web Apps with V0 + Claude AI + Cursor',
      },
    ],
    skoolLink: null,
    gradient: 'from-amber-600 to-yellow-700',
    description:
      'Roberts taught me how to build stunning, custom websites using AI tools  in days, not months. No cookie-cutter templates. Your business gets a high-converting site that matches your brand perfectly. That means more leads from your website, faster turnaround, and thousands saved compared to traditional web agencies.',
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
      'Mark trained 700+ professionals and has 2M+ views teaching AI on YouTube. He showed me how to use Claude Code as a personal development team  building custom tools, automating repetitive tasks, and replacing expensive software subscriptions. That means lower overhead costs for your business and faster delivery on every project.',
  },
  {
    id: 9,
    name: 'Liam Ottley',
    initials: 'LO',
    category: 'mindset',
    specialty: '#1 AI Business Educator (730K+ Subs)',
    youtubeChannel: 'https://www.youtube.com/@LiamOttley',
    videos: [{ id: 'ykRToEkWvpA', title: 'The #1 AI Automation Agency Niche' }],
    skoolLink: 'https://www.skool.com/ai-automation-agency-hub-8466',
    gradient: 'from-rose-500 to-red-600',
    description:
      'Liam built an $18M+ AI business portfolio and teaches 35,000+ agency owners. His AI Automation Agency model taught me exactly which AI solutions make businesses the most money  and how to deliver them reliably. Every strategy I use to grow your revenue and cut your costs comes from frameworks proven in his community.',
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
      'Alex runs a $250M/year business empire and literally wrote the book on getting leads ($100M Leads). His frameworks taught me how to create offers customers can\'t refuse, generate leads on autopilot, and turn one-time buyers into repeat clients. When I build your systems, they\'re designed around his proven "get more customers" playbook.',
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
      'Nick runs the #1 no-code automation community on Skool and teaches 220K+ people. His workflows showed me how to build automations that save businesses 20+ hours a week  lead follow-ups, appointment reminders, customer onboarding  all running on autopilot while you focus on the work that actually pays.',
  },
];
