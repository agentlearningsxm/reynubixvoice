# ReynubixVoice — Project Guidelines

## What This Is
AI-powered voice receptionist landing page for ReynubixVoice (reynubixvoice-landing-page.vercel.app).
Converts missed calls into booked appointments for service businesses (HVAC, dental, roofing, etc.).

## Stack
- **Frontend:** React 19 + TypeScript 5.8 + Vite 6
- **Styling:** CSS custom properties + Tailwind (CDN) + Framer Motion
- **State:** Zustand + React Context (theme, language)
- **Voice AI:** Google Gemini Real-Time API (`@google/genai`)
- **Backend:** Vercel serverless functions (`api/`)
- **Database:** Supabase (PostgreSQL)
- **Email:** Zoho SMTP via Nodemailer
- **Booking:** Cal.com embedded widget
- **Monitoring:** Sentry (errors) + Vercel Analytics + Speed Insights
- **Linter:** Biome 2.4.4

## Project Structure
```
App.tsx / index.tsx        — App bootstrap, routing, providers
components/                — Landing page sections + UI primitives
  ui/                      — Reusable components (Button, VoiceOrb, etc.)
contexts/                  — LanguageContext (en/fr/nl), ThemeContext
hooks/                     — useGeminiLive
lib/                       — Utilities (telemetry, supabase client, sentry)
  telemetry/               — Event tracking, shared types
  three/                   — Three.js particle system (AutomationCards)
api/                       — Vercel serverless endpoints
  contact.ts               — Contact form → Supabase + Zoho email
  events.ts                — Telemetry event ingestion
  voice/                   — Voice session management (start, end, audio, transcript, token, tool-call)
  webhooks/                — External webhooks (cal.ts, n8n.ts, retell.ts)
  _lib/                    — Shared server utilities (gemini, http, supabase admin, telemetry)
config/                    — App configuration
store/                     — Zustand stores
types/                     — TypeScript definitions
supabase/migrations/       — SQL migration files
public/                    — Static assets (logos, images)
tests/                     — Vitest test files
```

## Routes
| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | HomePage | Marketing landing page |
| `/contact` | PremiumContact | Lead capture form |
| `/privacy` | Privacy | Privacy policy |
| `/terms` | Terms | Terms of service |

## Commands
```bash
npm run dev           # Vite dev server → http://localhost:3000
npm run build         # Production build → dist/
npm run preview       # Preview production build
npm run test          # Run Vitest
npm run test:ui       # Vitest interactive UI
npm run test:coverage # Coverage report (v8)
npm run lint          # Biome lint + format check
npm run lint:fix      # Auto-fix lint issues
npm run analyze       # Bundle visualizer
```

## Coding Conventions
- **Formatting:** 2-space indent, single quotes, semicolons (enforced by Biome)
- **Components:** `PascalCase.tsx` (e.g., `Hero.tsx`)
- **Utilities:** `camelCase.ts` (e.g., `supabaseClient.ts`)
- **API routes:** Match Vercel patterns (e.g., `api/voice/session/start.ts`)
- **Imports:** Use `@/` alias for root imports
- **Commits:** `type: description` format (feat / fix / refactor / chore / docs)

## Testing Checklist
Before any PR:
1. `npm run build` — must pass with zero errors
2. `npm run lint` — must pass clean
3. `npm run dev` — verify:
   - All routes load (/, /contact, /privacy, /terms)
   - Theme toggle works (dark/light)
   - Language toggle works (en/fr/nl)
   - Contact form submits successfully
   - Voice demo connects (Gemini Live)
   - Calculator sliders update values
   - Carousel navigation works

## Environment Variables
See `.env.example` for all required variables. Never commit real credentials.

**Client-side (VITE_ prefix):**
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key
- `VITE_SENTRY_DSN` — Sentry error tracking

**Server-side (api/ only):**
- `GEMINI_API_KEY` — Google Gemini API
- `GROQ_API_KEY` — Groq server-side analysis API
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` / `GOOGLE_SHEET_ID` — Required together for post-call Google Sheets sync
- `GOOGLE_SHEET_NAME` — Optional sheet tab name override
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase admin access
- `ZOHO_EMAIL` — Zoho SMTP sender
- `ZOHO_APP_PASSWORD` — Zoho app password

**Future integrations (stubs ready):**
- `RETELL_API_KEY` — Retell voice AI
- `N8N_WEBHOOK_URL` — n8n automation webhooks

## Integrations Map
```
Website (Vite/React) ──→ Supabase (DB + leads)
         │                    │
         ├──→ Cal.com (booking widget)
         │
         ├──→ Zoho SMTP (contact form emails)
         │
         ├──→ Gemini Live (voice demo on page)
         │
         ├──→ n8n (automation webhooks) [connecting]
         │
         └──→ Retell AI (outbound calls) [planned]
```

## Security
- Secrets in `.env.local` only — never hardcode
- Supabase anon key is safe for client-side (RLS protects data)
- Server-side keys (`SUPABASE_SERVICE_ROLE_KEY`, API keys) only in `api/` functions
- Input validation on all API endpoints via `_lib/http.ts`

## Memory & Context
- **Project context:** This file (AGENTS.md)
- **Second Brain:** `d:\Desktop\Second brain\` (Obsidian vault, MCP on localhost:27124)
- **Project note:** `10_Projects/Active/ReynubixVoice.md`
- **Session handoffs:** `30_System/Context/`
