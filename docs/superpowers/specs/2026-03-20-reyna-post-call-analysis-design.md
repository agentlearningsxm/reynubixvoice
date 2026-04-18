# Reyna Post-Call Analysis — Direct Google Sheets Automation

**Date:** 2026-03-20
**Status:** Approved
**Approach:** A — Upgrade existing code + deploy env vars

## Problem

The website voice agent (Reyna, Gemini API) has existing code to sync call data to Google Sheets after each session, but it is completely non-functional in production because:

1. **5 Google env vars are missing from Vercel** — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_NAME` exist in `.env.local` but were never deployed
2. **Guard clause blocks execution** — `end.ts:45` checks `if (process.env.GOOGLE_REFRESH_TOKEN)` and skips sync entirely
3. **Gemini model is weak** — uses `gemini-2.0-flash`, insufficient for deep call analysis
4. **Analysis is shallow** — only returns summary + sentiment (2 fields)
5. **Recording URL shows N/A** — depends on `voice_audio_assets` table which may not have data
6. **Missing critical columns** — no error analysis, no prompt recommendations, no call quality scoring

## Solution

No architecture changes needed. The existing flow is correct:
```
Voice session ends → /api/voice/session/end.ts → syncSessionToSheet() via waitUntil()
→ Supabase queries → Groq analysis → Google Sheets append
```

### Changes

#### 1. Deploy env vars to Vercel (5 vars)
- `GOOGLE_CLIENT_ID` = from `.env.local`
- `GOOGLE_CLIENT_SECRET` = from `.env.local`
- `GOOGLE_REFRESH_TOKEN` = from `.env.local`
- `GOOGLE_SHEET_ID` = from `.env.local`
- `GOOGLE_SHEET_NAME` = `reyna web`

#### 2. Upgrade Gemini model
- From: `gemini-2.0-flash`
- To: `gemini-2.5-pro`
- Location: `api/_lib/groq-summary.ts`

#### 3. Expand analysis prompt
Gemini 2.5 Pro will return 7 fields instead of 2:

| Field | Type | Description |
|-------|------|-------------|
| `summary` | string | 2-3 sentence summary (existing) |
| `sentiment` | string | positive/neutral/negative/frustrated (existing) |
| `callQualityScore` | number | 1-10 rating of how well Reyna handled the call |
| `errorsDetected` | string | Specific errors: misunderstandings, wrong info, failed tool calls, awkward responses |
| `promptFixRecommendations` | string | What to change in Reyna's prompt to prevent errors |
| `failureSource` | string | Which part failed: greeting/qualification/calculator/booking/transfer/closing or "none" |
| `callOutcome` | string | qualified-lead/information-only/dropped/error/booking-made |

#### 4. Update Google Sheet columns (14 → 19)

Existing columns (unchanged):
1. Date
2. Time
3. Duration (s)
4. Language
5. Full Transcript
6. AI Summary
7. Sentiment
8. Calculator Used
9. Revenue Entered
10. Missed Calls
11. Booking Requested
12. Error Log
13. Recording URL
14. Session ID

New columns:
15. Call Quality Score
16. Errors Detected
17. Prompt Fix Recommendations
18. Failure Source
19. Call Outcome

#### 5. Fix recording URL (existing bug found in review)
- **Bug:** `sheet-sync.ts:123` uses bucket name `voice-audio` but actual Supabase bucket is `voice-session-audio` — all recording URLs are broken 404s
- **Bug:** Bucket is created with `public: false` but URL uses `/object/public/` path — won't work even with correct name
- **Fix:** Change bucket name to `voice-session-audio` AND use Supabase signed URLs instead of public URLs (keeps bucket private/secure)
- Fallback: if no recording exists, show "N/A" (existing behavior, keep it)

#### 6. Add fallback defaults for all new Gemini fields
All 5 new analysis fields must have safe defaults if Gemini returns partial/malformed JSON:
- `callQualityScore` → `0`
- `errorsDetected` → `"Analysis unavailable"`
- `promptFixRecommendations` → `"N/A"`
- `failureSource` → `"unknown"`
- `callOutcome` → `"unknown"`

## Files to modify

| File | Change |
|------|--------|
| `api/_lib/groq-summary.ts` | Current post-call analysis path; keep the 7-field contract and fallback defaults aligned with Groq |
| `api/_lib/google-sheets.ts` | Update HEADERS array (19 columns), update ranges from `A:N`/`A1:N1` to `A:S`/`A1:S1` |
| `api/_lib/sheet-sync.ts` | Map the Groq analysis fields to row values + fix recording URL bucket name + use signed URLs |
| Vercel env vars | Deploy 5 Google env vars via CLI |

## Google Sheet

- **Sheet URL:** https://docs.google.com/spreadsheets/d/1Xjb_TIhMFXSOpi9_xGG9Bg4tSIhFGQHLKVl3njragZc/edit?gid=102204233#gid=102204233
- **Tab name:** `reyna web`
- **Sheet ID:** (from `GOOGLE_SHEET_ID` env var)

## Success criteria

1. After a voice session on reynubixvoice-landing-page.vercel.app, a new row appears in the "reyna web" Google Sheet tab within 30 seconds
2. All 19 columns are populated with correct data
3. Gemini 2.5 Pro provides actionable analysis — not just "summary: user asked about services"
4. Recording URL links to actual audio when available
5. Error analysis identifies specific prompt/flow issues when they occur

## Out of scope (for now)

- Audio file analysis (sending recording to Gemini) — future enhancement
- Fixing the voice agent prompts themselves — separate task after analysis data accumulates
- n8n workflow 2 (Retell calls) — separate system, not touched
