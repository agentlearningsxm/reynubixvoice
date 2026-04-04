# ReynubixVoice — AGENTS.md

## 1 · Project Overview
AI-powered voice receptionist landing page for ReynubixVoice (reynubixvoice-landing-page.vercel.app).
Converts missed calls into booked appointments for service businesses (HVAC, dental, roofing, etc.).
Includes a full CRM admin dashboard at `/admin` with Supabase Auth, lead management, deal pipeline, tasks, interactions, and Google Sheets import.

## 2 · Stack
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

## 3 · Project Structure
```
App.tsx / index.tsx        — App bootstrap, routing, providers
components/                — Landing page sections + UI primitives
  ui/                      — Reusable components (Button, VoiceOrb, etc.)
  admin/                   — CRM admin dashboard pages + layout
  auth/                    — Auth components (login, protected route, provider)
contexts/                  — LanguageContext (en/fr/nl), ThemeContext
hooks/                     — useGeminiLive
lib/                       — Utilities (telemetry, supabase client, sentry)
  telemetry/               — Event tracking, shared types
  three/                   — Three.js particle system (AutomationCards)
api/                       — Vercel serverless endpoints
  contact.ts               — Contact form → Supabase + Zoho email
  events.ts                — Telemetry event ingestion
  auth/                    — Auth endpoints (login, logout, session, create-admin)
  crm/                     — CRM endpoints (leads, deals, tasks, interactions, notes, dashboard)
  import/                  — Google Sheets import endpoint
  voice/                   — Voice session management (start, end, audio, transcript, token, tool-call)
  webhooks/                — External webhooks (cal.ts, n8n.ts, retell.ts)
  _lib/                    — Shared server utilities (auth middleware, supabase admin, http, telemetry)
config/                    — App configuration
store/                     — Zustand stores (auth, CRM)
types/                     — TypeScript definitions
supabase/migrations/       — SQL migration files
public/                    — Static assets (logos, images)
tests/                     — Vitest test files
```

## 4 · Routes
| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | HomePage | Marketing landing page |
| `/contact` | PremiumContact | Lead capture form |
| `/privacy` | Privacy | Privacy policy |
| `/terms` | Terms | Terms of service |
| `/admin/login` | LoginPage | Admin authentication |
| `/admin` | AdminLayout + AdminDashboard | CRM dashboard (protected) |
| `/admin/leads` | LeadsPage | Lead management (CRUD, search, filter) |
| `/admin/deals` | DealsPage | Deal pipeline (kanban board) |
| `/admin/tasks` | TasksPage | Task management (priorities, due dates) |
| `/admin/interactions` | InteractionsPage | Activity timeline (calls, emails, bookings) |
| `/admin/import` | ImportPage | Google Sheets data migration |
| `/admin/analytics` | — | Analytics (coming soon) |
| `/admin/settings` | — | Settings (coming soon) |

## 5 · Commands
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

## 6 · Coding Conventions
- **Formatting:** 2-space indent, single quotes, semicolons (enforced by Biome)
- **Components:** `PascalCase.tsx` (e.g., `Hero.tsx`, `LeadsPage.tsx`)
- **Utilities:** `camelCase.ts` (e.g., `supabaseClient.ts`)
- **API routes:** Match Vercel patterns (e.g., `api/crm/leads/index.ts`)
- **Imports:** Use `@/` alias for root imports
- **Commits:** `type: description` format (feat / fix / refactor / chore / docs)
- **Error handling:** Always check Supabase query errors, never silently fail
- **Type safety:** No `any` types, use proper interfaces and type assertions

## 7 · Testing
Before any PR:
1. `npm run build` — must pass with zero errors
2. `npm run lint` — must pass clean
3. `npm run dev` — verify:
   - All routes load (/, /contact, /privacy, /terms, /admin/login, /admin/*)
   - Theme toggle works (dark/light)
   - Language toggle works (en/fr/nl)
   - Contact form submits successfully
   - Voice demo connects (Gemini Live)
   - Calculator sliders update values
   - Carousel navigation works
   - Admin login works with valid credentials
   - CRM pages load with data (leads, deals, tasks, interactions)
   - Google Sheets import endpoint responds (with valid API key)

## 8 · Security
- Secrets in `.env.local` only — never hardcode, never commit
- Supabase anon key is safe for client-side (RLS protects data)
- Server-side keys (`SUPABASE_SERVICE_ROLE_KEY`, API keys) only in `api/` functions
- Input validation on all API endpoints via `_lib/http.ts`
- All CRM API routes require authentication via `requireAuth()` middleware
- RLS policies on all database tables — no table accessible without auth
- `create-admin.ts` disabled in production (`NODE_ENV` check)
- Never expose `service_role` key to client bundles
- Google API key used server-side only (never in client code)

## 9 · Environment Variables
See `.env.example` for all required variables. Never commit real credentials.

**Client-side (VITE_ prefix):**
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon key (safe for client) |
| `VITE_SENTRY_DSN` | No | Sentry error tracking |

**Server-side (api/ only):**
| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API |
| `GROQ_API_KEY` | No | Groq server-side analysis API |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth (post-call Sheets sync) |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth secret |
| `GOOGLE_REFRESH_TOKEN` | Yes | Google OAuth refresh token |
| `GOOGLE_SHEET_ID` | Yes | Google Sheet for post-call logging |
| `GOOGLE_SHEET_NAME` | No | Optional sheet tab name override |
| `GOOGLE_API_KEY` | No | Google Sheets API (CRM import) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase admin access (server only) |
| `ZOHO_EMAIL` | Yes | Zoho SMTP sender |
| `ZOHO_APP_PASSWORD` | Yes | Zoho SMTP app password |

**Future integrations (stubs ready):**
- `RETELL_API_KEY` — Retell voice AI
- `N8N_WEBHOOK_URL` — n8n automation webhooks

## 10 · Database & Migrations
- **Migrations:** Sequential only, never parallel. Files in `supabase/migrations/`
- **RLS:** Enable on every table. Specify role (`to authenticated`), not just `using`
- **Performance:** Wrap auth functions in `select` — `(select auth.uid())` not `auth.uid()` (94-99% faster)
- **Indexes:** Add indexes on all RLS policy columns and foreign keys
- **Profiles:** Auto-create profile on auth user signup (trigger on `auth.users` insert)
- **Types:** Generate TypeScript types with `npx supabase gen types typescript --project-ref $REF`
- **Zero-downtime:** Separate schema changes from data migrations. Add columns nullable, backfill, then constrain
- **Reversible:** All migrations must be reversible (use `if not exists`, `drop if exists`)

### Key Tables
| Table | Purpose | Access |
|-------|---------|--------|
| `leads` | CRM leads from website + manual | Authenticated users |
| `profiles` | Admin user profiles + roles | Users own, admins all |
| `deals` | Sales pipeline opportunities | Authenticated users |
| `interactions` | Activity log (calls, emails, bookings) | Authenticated users |
| `tasks` | Follow-up tasks | Authenticated users |
| `notes` | Free-form notes on leads/deals | Authenticated users |
| `crm_audit_log` | Admin activity tracking | Admins only |
| `visitors` | Website visitor tracking | Server-side |
| `voice_sessions` | Voice AI session data | Server-side |
| `bookings` | Cal.com booking data | Server-side + CRM |
| `contact_submissions` | Contact form submissions | Server-side + CRM |

## 11 · CRM & Admin
### Auth Flow
1. User enters email/password at `/admin/login`
2. Supabase `signInWithPassword()` → JWT session
3. Profile lookup for role (admin/viewer)
4. `ProtectedRoute` checks auth state → redirects if unauthenticated
5. All API routes verify JWT via `requireAuth()` middleware

### Admin Pages
- **Dashboard** — Real-time stats from Supabase (leads, sessions, deals, tasks)
- **Leads** — Table with search, status filter, add/delete modal
- **Deals** — Kanban pipeline (qualification → proposal → negotiation → won/lost)
- **Tasks** — Task list with priorities (low/medium/high/urgent), due dates, overdue detection
- **Interactions** — Chronological activity timeline with type filtering
- **Import** — Google Sheets migration with upsert (matches by `email_normalized`)

### API Routes (13 endpoints, all auth-protected)
- `GET/POST /api/crm/leads` — List + create leads
- `GET/PATCH/DELETE /api/crm/leads/[id]` — Single lead operations
- `GET/POST /api/crm/deals` — List + create deals
- `GET/PATCH/DELETE /api/crm/deals/[id]` — Single deal operations
- `GET/POST /api/crm/tasks` — List + create tasks
- `GET/PATCH/DELETE /api/crm/tasks/[id]` — Single task operations
- `GET/POST /api/crm/interactions` — List + create interactions
- `GET/PATCH/DELETE /api/crm/interactions/[id]` — Single interaction operations
- `GET/POST /api/crm/notes` — List + create notes
- `GET/PATCH/DELETE /api/crm/notes/[id]` — Single note operations
- `GET /api/crm/dashboard` — Aggregated dashboard stats
- `POST /api/import/google-sheets` — Google Sheets import (admin-only)

### Google Sheets Import
- Requires `GOOGLE_API_KEY` env var
- Dynamic column detection (email, name, company, phone, source, status)
- Upsert pattern with `onConflict: 'email_normalized'`
- Audit logging of import results
- Instructions at `/admin/import`

## 12 · Integrations Map
```
Website (Vite/React) ──→ Supabase (DB + leads + CRM)
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

Admin Dashboard ──→ Supabase (RLS-protected)
         │
         ├──→ Google Sheets (import migration)
         │
         └──→ Vercel API routes (auth, CRM CRUD)
```

## 13 · Anti-Patterns
- **Never** hardcode secrets or use placeholder fallbacks for env vars
- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to client bundles
- **Never** skip error handling on CRUD operations — always check `error` from Supabase
- **Never** use `NODE_ENV` as a security boundary (use secret tokens for admin endpoints)
- **Never** bypass RLS by using service role key in client-side code
- **Never** commit `.env.local` or any file containing secrets
- **Never** use `git add .` — stage files explicitly
- **Never** re-run the same test suite with different filters — capture output once, analyze
- **Never** increase timeouts instead of fixing root cause of race conditions
- **Always** wrap `fetch*` functions in `useCallback` when used in `useEffect` deps
- **Always** add confirmation dialogs before destructive operations (delete)
- **Always** check Supabase query errors — don't assume `data` is non-null

## 14 · Self-Improvement
After completing work that reveals a non-obvious pattern, repo quirk, or security consideration not already documented here, propose an update to this file. Keep it current.

## 15 · Memory & Context
- **Project context:** This file (AGENTS.md)
- **Second Brain:** `d:\Desktop\Second brain\` (Obsidian vault, MCP on localhost:27124)
- **Project note:** `10_Projects/Active/ReynubixVoice.md`
- **Session handoffs:** `30_System/Context/`
- **HQ status:** `d:\Desktop\Second brain\30_System\Agents\hq-status.js`