export interface AutomationTool {
  name: string;
  description: string;
  logo: string;
  color: string;
}

export const AUTOMATION_TOOLS: AutomationTool[] = [
  {
    name: 'Claude Code',
    description:
      'Builds and updates your website, apps, and digital tools automatically, saving you thousands in developer costs every month.',
    logo: '/claude-logo-light.png',
    color: '#D97706',
  },
  {
    name: 'n8n',
    description:
      'Connects all your business apps together so data flows automatically. No more copying and pasting between your CRM, email, calendar, and billing.',
    logo: '/n8n-logo.webp',
    color: '#EA4B71',
  },
  {
    name: 'Antigravity',
    description:
      'Your 24/7 digital employee that handles research, planning, and complex tasks while you sleep, scaling your team without adding headcount.',
    logo: '/Antigravity-logo.webp',
    color: '#a07d4f',
  },
  {
    name: 'Airtable',
    description:
      'Replaces your messy spreadsheets with a smart database your whole team loves. Track projects, clients, and inventory without hiring a developer.',
    logo: '/airtable-logo.webp',
    color: '#FCB400',
  },
  {
    name: 'OpenAI',
    description:
      'Writes your marketing copy, analyzes customer feedback, and creates business strategies on demand. Like having an expert consultant always on call.',
    logo: '/chatgpt-logo.webp',
    color: '#00A67E',
  },
  {
    name: 'Retell AI',
    description:
      'Answers every customer call instantly with a natural human voice, books appointments, and never misses a lead. Your 24/7 AI receptionist.',
    logo: '/retell-logo-light.png',
    color: '#c8a960',
  },
  {
    name: 'LiveKit',
    description:
      'Powers real-time voice and video conversations with your customers. Qualify leads and provide instant support right on your website.',
    logo: '/livekit-logo.webp',
    color: '#FF6B6B',
  },
  {
    name: 'Perplexity',
    description:
      'Delivers instant market research and competitor analysis with verified sources. Make confident business decisions in minutes, not weeks.',
    logo: '/Perplexity-logo.webp',
    color: '#20B2AA',
  },
];
