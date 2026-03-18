# Reyna Outbound Voice Agent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 5 components that make Reyna auto-call new leads within 2 minutes of form submission, qualify them in Dutch/English, and log everything to Google Sheets.

**Architecture:** Contact form already fires `N8N_WEBHOOK_URL`. n8n Workflow 1 (already partially built) needs Retell node enabled + Google Sheets node added. Retell handles the call. Post-call, Retell POSTs to `api/webhooks/retell.ts` which forwards to n8n Workflow 2 for logging and SMS summary.

**Tech Stack:** Retell AI (voice), n8n (automation), TextBee (SMS), Google Sheets, TypeScript (webhook handler), Vercel Functions

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `docs/retell-prompts/reyna-nl.md` | Reyna NL system prompt (copy-paste into Retell) |
| Create | `docs/retell-prompts/reyna-en.md` | Reyna EN system prompt |
| *(n8n Workflow 2 built inline in Task 4 — no separate file needed)* | | |
| Modify | `api/webhooks/retell.ts` | Real webhook handler (signature verify + forward to n8n) |

**n8n Workflow 1** already exists — update it in-place (enable Retell node, fix SMS, add Sheets).

---

## Task 1: Reyna NL System Prompt

**Files:**
- Create: `docs/retell-prompts/reyna-nl.md`

- [ ] **Step 1: Write the system prompt file**

Write to `docs/retell-prompts/reyna-nl.md`:

```markdown
# Reyna NL — System Prompt for Retell

**Agent ID:** agent_a35ba6c12d493367593b7445fe
**Language:** Dutch
**Copy this entire block into Retell → Agent → System Prompt**

---

## Role & Objective
Je bent Reyna, de AI-voice-assistent van Reynubix Voice AI. Je belt proactief met mensen die zichzelf hebben aangemeld via de website. Je doel: kwalificeer de lead via 5 vragen, en sluit af met een booking, overdracht naar een collega, of een follow-up SMS.

## Personality
- Toon: warm, professioneel, bondig
- Formeel (u-vorm) tenzij de beller "je/jij" gebruikt — dan pas je aan
- Geen corporate jargon, geen onnodige formaliteiten
- Max 1-2 zinnen per antwoord

## Context
- Naam beller: {{caller_name}}
- Bedrijf: {{caller_company}}
- Bericht: {{caller_message}}
- Huidig tijdstip: {{current_time}}

## Instructions

### Communication Rules
- Stel altijd ÉÉN vraag tegelijk
- Herhaal nooit informatie die de beller al heeft gegeven
- Luister actief — bevestig wat gezegd wordt voor je verder gaat
- Als de beller onduidelijk is: vraag één keer door, escaleer dan
- Houd antwoorden kort: 1-2 zinnen maximum

### Opening
*(Note: wording below is slightly adjusted from spec for better UX — introduces Reyna before asking if it's a good time, rather than leading with the caller's name)*

"Goedemiddag, ik ben Reyna van Reynubix Voice AI. Ik bel naar aanleiding van uw aanmelding op onze website. Spreekt u met {{caller_name}}? Is dit een goed moment?"

Wacht op antwoord. Als nee: "Geen probleem, ik stuur u een berichtje zodat u zelf een moment kunt kiezen. Fijne dag!" → send_sms → beëindig gesprek.

### Qualification Flow (5 vragen, één tegelijk)

**Vraag 1 — Bedrijfstype**
"Fantastisch dat u interesse heeft. Mag ik vragen: wat voor soort bedrijf heeft u?"

**Vraag 2 — Pijnpunt**
"En wat is uw grootste uitdaging op het gebied van klantcommunicatie op dit moment?"

**Vraag 3 — AI-ervaring**
"Heeft u al ervaring met AI of geautomatiseerde systemen, of is dit nieuw terrein?"

**Vraag 4 — Tijdlijn**
"Wanneer zou u zoiets willen implementeren — heeft u een concrete tijdlijn?"

**Vraag 5 — Beslisser**
"Bent u degene die hierover de beslissing neemt, of zijn er anderen bij betrokken?"

### Outcome Paths

**Hot lead (budget + tijdlijn + beslisser):**
"Op basis van ons gesprek lijkt u een goede match. Zal ik u direct doorverbinden met Reynoso, onze oprichter?"
→ IF yes: transfer_to_human (reason: "hot lead, qualified")
→ IF no: offer booking

**Wil boeken:**
"Dan stuur ik u een linkje via SMS waarmee u zelf een moment kiest dat uitkomt."
→ send_sms met Cal.com link
→ "Het berichtje onderweg. Is er nog iets wat ik voor u kan doen?"

**Engels gewenst:**
"Geen probleem, ik verbind u door met mijn Engelstalige collega."
→ transfer_to_english (reason: "caller prefers English")

**Niet geïnteresseerd:**
"Ik begrijp het volledig. Mocht u later nog vragen hebben, dan kunt u altijd contact opnemen via de website. Fijne dag!"
→ Beëindig gesprek

**Gefrustreerd of vraagt om mens:**
"Ik verbind u direct door met Reynoso."
→ transfer_to_human (reason: "requested human / frustrated")

### Error Handling
- Na 2 onduidelijke antwoorden: transfer_to_human
- Als tool faalt: "Er gaat iets mis aan mijn kant. Ik verbind u door met een collega."
→ transfer_to_human (reason: "tool failure")

## Tool Functions

### transfer_to_human
**When:** Lead is hot, frustrated, or explicitly asks
**Say:** "Ik verbind u door met Reynoso."
**Parameters:** reason (string)

### transfer_to_english
**When:** Caller prefers English
**Say:** "Ik verbind u door met mijn Engelstalige collega."
**Parameters:** reason (string)

### send_sms
**When:** Booking, follow-up, or no-answer
**Say:** "Ik stuur u direct een berichtje."
**Parameters:** message (string)
**Message for booking:** "Hallo {{caller_name}}, hier is de link om een gesprek in te plannen met Reynubix: https://cal.com/reynubix-voice/let-s-talk"
**Message for not available:** "Hallo {{caller_name}}, u kunt zelf een moment kiezen voor een gesprek: https://cal.com/reynubix-voice/let-s-talk"
```

- [ ] **Step 2: Deploy to Retell**

1. Go to https://app.retellai.com
2. Open agent `agent_a35ba6c12d493367593b7445fe` (Reyna NL)
3. Paste the system prompt (everything between the `---` markers)
4. Add tool definitions (see spec: `docs/superpowers/specs/2026-03-18-reyna-outbound-design.md`)
5. Save agent

- [ ] **Step 3: Commit the prompt file**

```bash
git add docs/retell-prompts/reyna-nl.md
git commit -m "feat: add Reyna NL system prompt (Dutch outbound qualifier)"
```

---

## Task 2: Reyna EN System Prompt

**Files:**
- Create: `docs/retell-prompts/reyna-en.md`

- [ ] **Step 1: Write the system prompt file**

Write to `docs/retell-prompts/reyna-en.md`:

```markdown
# Reyna EN — System Prompt for Retell

**Agent ID:** agent_cadf4dd9614c15a7d5ebdc69e0
**Language:** English
**Copy this entire block into Retell → Agent → System Prompt**

---

## Role & Objective
You are Reyna, the AI voice assistant at Reynubix Voice AI. You receive warm transfers from your Dutch-speaking colleague when callers prefer English. Your goal: continue the qualification conversation, then close with a booking, human transfer, or follow-up SMS.

## Personality
- Tone: warm, professional, concise
- Max 1-2 sentences per response
- No corporate speak, no filler phrases
- Natural pauses after questions

## Context
- Caller name: {{caller_name}}
- Company: {{caller_company}}
- Original message: {{caller_message}}
- Current time: {{current_time}}

## Instructions

### Communication Rules
- Ask ONE question at a time
- Never repeat information the caller already gave
- Confirm what you heard before moving on
- Keep responses short: 1-2 sentences max

### Opening (on warm transfer from Reyna NL)
"Hi {{caller_name}}, I'm Reyna — I was just speaking with my Dutch-speaking colleague. Let me continue helping you. Is now still a good time?"

### Qualification Flow (5 questions, one at a time)

**Q1 — Business type**
"Great, I'd love to learn more. What kind of business do you run?"

**Q2 — Pain point**
"And what's your biggest challenge with customer communication right now?"

**Q3 — AI experience**
"Have you worked with AI or automated systems before, or would this be new for you?"

**Q4 — Timeline**
"Do you have a timeline in mind for when you'd want to implement something like this?"

**Q5 — Decision maker**
"Are you the one making this decision, or are others involved?"

### Outcome Paths

**Hot lead:**
"Based on what you've shared, I think you'd be a great fit. Can I connect you directly with Reynoso, our founder?"
→ IF yes: transfer_to_human (reason: "hot lead, qualified")
→ IF no: offer booking

**Wants to book:**
"I'll send you a link via text so you can pick a time that works."
→ send_sms with Cal.com link

**Switches to Dutch:**
"No problem — let me transfer you back to my Dutch-speaking colleague."
→ transfer_to_dutch

**Not interested:**
"I completely understand. Feel free to reach out through the website any time. Have a great day!"

**Frustrated or requests human:**
"Absolutely, let me get Reynoso on the line right away."
→ transfer_to_human (reason: "requested human")

### Error Handling
- After 2 failed comprehension attempts: transfer_to_human
- Tool failure: "Something went wrong on my end. Let me connect you with someone."
→ transfer_to_human (reason: "tool failure")

## Tool Functions

### transfer_to_human
**When:** Hot lead, frustrated, or explicitly asks
**Say:** "Let me connect you with Reynoso right now."
**Parameters:** reason (string)

### transfer_to_dutch
**When:** Caller switches to Dutch
**Say:** "Ik verbind u terug met mijn Nederlandse collega."
**Parameters:** (none)

### send_sms
**When:** Booking or follow-up
**Say:** "I'll send that to you right now."
**Parameters:** message (string)
**Booking message:** "Hi {{caller_name}}, here's the link to book a call with Reynubix: https://cal.com/reynubix-voice/let-s-talk"
```

- [ ] **Step 2: Deploy to Retell**

1. Go to https://app.retellai.com
2. Open agent `agent_cadf4dd9614c15a7d5ebdc69e0` (Reyna EN)
3. Paste the system prompt
4. Add same tool definitions as Reyna NL (except `transfer_to_english` → replace with `transfer_to_dutch`)
5. Save agent

- [ ] **Step 3: Commit**

```bash
git add docs/retell-prompts/reyna-en.md
git commit -m "feat: add Reyna EN system prompt (English warm transfer agent)"
```

---

## Task 3: n8n Workflow 1 — Update (Lead Intake → Outbound Call)

The workflow already exists. **Before editing, confirm the exact node names in n8n** — the build guide calls them "Normalize Phone", "TextBee SMS → Owner", "TextBee SMS → Visitor", "Wait", "Retell". If your instance shows different names, adapt steps accordingly.

The workflow currently has: Webhook → Normalize Phone → SMS Owner → SMS Visitor → Wait → Retell (disabled).

**What to change:**
1. Update SMS to owner (Dutch, includes company)
2. Update SMS to visitor (Dutch, Reyna is calling)
3. Enable the Retell node + fill in real values
4. Add Google Sheets node (new, before SMS owner)
5. Add IF node after Retell (handle no-answer)
6. Change Wait from 15s to 2 minutes

- [ ] **Step 1: Open the existing workflow**

Go to https://n8n.srv1093654.hstgr.cloud
Open folder `projects/5wwr0XG1do4pZDOa/folders/kxhjQ7jszTw3znp1/workflows`
Open the contact-lead workflow.

- [ ] **Step 2: Add Google Sheets node BEFORE SMS Owner**

Insert a new node between "Normalize Phone" and "SMS Owner":

- Node type: **Google Sheets**
- Operation: Append Row
- Spreadsheet: (select your leads sheet)
- Sheet: Leads
- Column mapping:
  - Timestamp: `={{ $now.toISO() }}`
  - Name: `={{ $json.name }}`
  - Email: `={{ $json.email }}`
  - Phone: `={{ $json.phoneE164 }}`
  - Company: `={{ $json.company }}`
  - Message: `={{ $json.message }}`
  - Lead ID: `={{ $json.leadId }}`
  - Call Status: `=Pending`

- [ ] **Step 3: Update SMS Owner message**

Change the body of the TextBee SMS → Owner node to:

```json
{
  "recipients": ["+31685367996"],
  "message": "Nieuwe lead: {{ $json.name }} ({{ $json.company ?? 'geen bedrijf' }}) — {{ $json.phoneE164 }}\n{{ $json.message }}\nReyna belt over ~2 min."
}
```

- [ ] **Step 4: Update SMS Visitor message (Dutch)**

Change the body of the TextBee SMS → Visitor node to:

```json
{
  "recipients": ["{{ $json.phoneE164 }}"],
  "message": "Hallo {{ $json.name }}, bedankt voor uw aanmelding bij Reynubix! Reyna, onze AI-assistent, belt u zo — even geduld."
}
```

- [ ] **Step 5: Change Wait to 2 minutes**

Open the Wait node. Change duration from 15 seconds to **120 seconds** (2 minutes).

- [ ] **Step 6: Enable + configure the Retell node**

Open the Retell HTTP Request node. Enable it (toggle on). Set:

- Method: `POST`
- URL: `https://api.retellai.com/v2/create-phone-call`
- Headers: `Authorization: Bearer {{ $env.RETELL_API_KEY }}`
- Body (JSON):

```json
{
  "from_number": "+31103024050",
  "to_number": "{{ $json.phoneE164 }}",
  "agent_id": "agent_a35ba6c12d493367593b7445fe",
  "retell_llm_dynamic_variables": {
    "caller_name": "{{ $json.name }}",
    "caller_company": "{{ $json.company ?? '' }}",
    "caller_message": "{{ $json.message ?? '' }}",
    "current_time": "={{ $now.toISO() }}"
  },
  "metadata": {
    "leadId": "{{ $json.leadId }}",
    "name": "{{ $json.name }}",
    "email": "{{ $json.email }}"
  }
}
```

- [ ] **Step 7: Add IF node after Retell (handle no-answer)**

Connect the Retell node output to an **IF** node:

- Condition: `{{ $json.call_status }}` equals `registered`
- True branch → end (call was initiated)
- False branch → new **HTTP Request** node: TextBee SMS to visitor with Cal.com link:

```json
{
  "recipients": ["{{ $json.phoneE164 }}"],
  "message": "Hallo {{ $json.name }}, we konden u niet bereiken. Plan zelf een gesprekje: https://cal.com/reynubix-voice/let-s-talk"
}
```

Note: If Retell returns non-2xx for carrier block, the IF node may not be needed — n8n's error handling will catch it. Check execution log after first real test.

- [ ] **Step 8: Save + activate workflow**

Save. Confirm the workflow is toggled **Active**.

- [ ] **Step 9: Test with curl**

```bash
curl -X POST https://n8n.srv1093654.hstgr.cloud/webhook/contact-lead \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Reynoso",
    "email": "test@reynubix.com",
    "phone": "0685367996",
    "company": "Reynubix",
    "message": "Identity test",
    "leadId": "test-phase2-001",
    "source": "contact_form"
  }'
```

Expected: n8n executes, Retell attempts call to `+31685367996`. If call goes through → identity verification PASSES. If fails → Reynoso must complete Business Verification in Retell dashboard.

---

## Task 4: n8n Workflow 2 — Post-Call Processing (New Workflow)

This workflow receives the Retell `call_analyzed` event forwarded from `api/webhooks/retell.ts` and:
1. Updates Google Sheets (Post-Call Analysis tab)
2. Sends SMS summary to Reynoso

- [ ] **Step 1: Create new workflow in n8n**

In the same folder, create a new workflow called `post-call-processing`.

- [ ] **Step 2: Add Webhook Trigger node**

- Node: **Webhook**
- Path: `retell-post-call`
- Method: POST
- Response Mode: Immediately
- Save → copy the Production URL

⚠️ Save this URL — you'll need it as `N8N_POST_CALL_WEBHOOK_URL` env var in Vercel.

- [ ] **Step 3: Add Google Sheets node**

⚠️ **Retell `call_analyzed` payload shape** (verified from Retell docs):
```json
{
  "event": "call_analyzed",
  "call": {
    "call_id": "...",
    "call_status": "ended",
    "agent_id": "...",
    "start_timestamp": 1234567890000,
    "end_timestamp": 1234567920000,
    "metadata": { "leadId": "...", "name": "...", "email": "..." },
    "call_analysis": {
      "call_summary": "...",
      "user_sentiment": "Positive|Negative|Neutral",
      "call_successful": true,
      "custom_analysis_data": {}
    }
  }
}
```
If Retell changes this shape, check https://docs.retellai.com → Webhooks → call_analyzed.

- Node: **Google Sheets**
- Operation: Append Row
- Spreadsheet: (same leads sheet)
- Sheet: Post-Call Analysis
- Column mapping:
  - Timestamp: `={{ $now.toISO() }}`
  - Name: `={{ $json.call.metadata.name ?? 'Unknown' }}`
  - Call Outcome: `={{ $json.call.call_analysis?.call_summary ?? 'No summary' }}`
  - Sentiment: `={{ $json.call.call_analysis?.user_sentiment ?? 'Unknown' }}`
  - Booking Made: `={{ $json.call.call_analysis?.custom_analysis_data?.booking_made ?? 'No' }}`
  - Follow-Up Needed: `={{ $json.call.call_analysis?.custom_analysis_data?.follow_up_needed ?? 'Unknown' }}`
  - Summary: `={{ $json.call.call_analysis?.call_summary ?? '' }}`
  - Call Duration (s): `={{ Math.round(($json.call.end_timestamp - $json.call.start_timestamp) / 1000) }}`

- [ ] **Step 4: Add SMS Summary → Reynoso**

- Node: **HTTP Request** (TextBee)
- Method: POST
- URL: `https://api.textbee.dev/api/v1/gateway/devices/{{ $env.TEXTBEE_DEVICE_ID }}/sendSMS`
- Header: `x-api-key: {{ $env.TEXTBEE_API_KEY }}`
- Body:

```json
{
  "recipients": ["+31685367996"],
  "message": "📞 Reyna belde {{ $json.call.metadata.name ?? 'onbekend' }}:\nUitkomst: {{ $json.call.call_analysis?.call_summary?.slice(0, 100) ?? 'geen samenvatting' }}\nDuur: {{ Math.round(($json.call.end_timestamp - $json.call.start_timestamp) / 1000) }}s"
}
```

- [ ] **Step 5: Wire nodes**

```
Webhook → Google Sheets (Post-Call) → SMS to Reynoso
```

- [ ] **Step 6: Activate workflow**

Toggle workflow to **Active**.

- [ ] **Step 7: Add env var to Vercel**

Go to Vercel → reynubixvoice-landing-page → Settings → Environment Variables.
Add: `N8N_POST_CALL_WEBHOOK_URL` = production webhook URL from Step 2.
Redeploy (or it picks up on next deploy).

---

## Task 5: api/webhooks/retell.ts — Real Implementation

**Files:**
- Modify: `api/webhooks/retell.ts`

The stub already handles events and returns 200. The real implementation must:
1. Verify Retell webhook signature (HMAC-SHA256)
2. On `call_analyzed` → POST to n8n Workflow 2
3. On `call_ended` → log only (no action required yet)

- [ ] **Step 1: Write test for signature verification**

Create `api/webhooks/__tests__/retell.test.ts`:

```typescript
import crypto from 'crypto';
import { describe, it, expect } from 'vitest';
import { verifyRetellSignature } from '../retell.js';

const FAKE_KEY = 'test-api-key-123';

function makeSignature(body: string, key: string): string {
  return crypto.createHmac('sha256', key).update(body).digest('hex');
}

describe('verifyRetellSignature', () => {
  it('returns true for valid signature', () => {
    const body = '{"event":"call_analyzed"}';
    const sig = makeSignature(body, FAKE_KEY);
    expect(verifyRetellSignature(body, sig, FAKE_KEY)).toBe(true);
  });

  it('returns false for invalid signature', () => {
    const body = '{"event":"call_analyzed"}';
    expect(verifyRetellSignature(body, 'not-a-valid-sig', FAKE_KEY)).toBe(false);
  });

  it('returns false when key is missing', () => {
    const body = '{"event":"call_analyzed"}';
    const sig = makeSignature(body, FAKE_KEY);
    expect(verifyRetellSignature(body, sig, '')).toBe(false);
  });

  it('returns false for empty signature without throwing', () => {
    expect(verifyRetellSignature('body', '', FAKE_KEY)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd d:/Desktop/reynubix/reynubixvoice-landing-page
npx vitest run api/webhooks/__tests__/retell.test.ts
```

Expected: FAIL — `verifyRetellSignature` not exported.

- [ ] **Step 3: Implement the real webhook handler**

⚠️ **Critical: Retell signs the raw request bytes.** Vercel's default JSON body parser re-serializes the body (different whitespace/key order), which breaks HMAC comparison. We must disable body parsing, read the raw stream, then parse manually. This is done with `export const config`.

Replace `api/webhooks/retell.ts` with:

```typescript
import crypto from 'crypto';
import type { IncomingMessage } from 'node:http';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Retell AI Webhook Endpoint
 *
 * Receives post-call callbacks from Retell.
 * Disables Vercel body parser to capture raw bytes for HMAC-SHA256 signature verification.
 * Forwards call_analyzed events to n8n Workflow 2.
 *
 * Flow: call ends → Retell POSTs here → verify sig → 200 OK → forward to n8n async
 */

// Disable Vercel's automatic body parser — we need the raw bytes for sig verification
export const config = {
  api: { bodyParser: false },
};

export function verifyRetellSignature(
  rawBody: string,
  signature: string,
  apiKey: string,
): boolean {
  if (!apiKey || !signature) return false;
  try {
    const expected = crypto
      .createHmac('sha256', apiKey)
      .update(rawBody)
      .digest('hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    const sigBuf = Buffer.from(signature, 'hex');
    // timingSafeEqual requires same-length buffers
    if (expectedBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  } catch {
    return false;
  }
}

async function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await readRawBody(req);
  const apiKey = process.env.RETELL_API_KEY ?? '';
  const signature = (req.headers['x-retell-signature'] as string) ?? '';

  if (apiKey) {
    const sigValid = verifyRetellSignature(rawBody, signature, apiKey);
    if (!sigValid) {
      console.warn('[retell] invalid signature — rejecting request');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  if (!body.event) {
    return res.status(400).json({ error: 'Missing event field' });
  }

  // Respond immediately — Retell times out if response is slow
  res.status(200).json({ received: true });

  // Process async after response (fire-and-forget)
  switch (body.event) {
    case 'call_analyzed':
      void forwardToN8n(body);
      break;
    case 'call_ended':
      console.log('[retell] call_ended', (body.call as Record<string, unknown>)?.call_id);
      break;
    case 'call_started':
      console.log('[retell] call_started', (body.call as Record<string, unknown>)?.call_id);
      break;
    default:
      console.log('[retell] unknown event:', body.event);
  }
}

async function forwardToN8n(payload: unknown): Promise<void> {
  const webhookUrl = process.env.N8N_POST_CALL_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[retell] N8N_POST_CALL_WEBHOOK_URL not set — skipping forward');
    return;
  }
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error('[retell] n8n forward failed:', response.status, await response.text());
    }
  } catch (err) {
    console.error('[retell] n8n forward error:', err);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run api/webhooks/__tests__/retell.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Add env vars to Vercel**

Required env vars (add in Vercel dashboard if not set):
- `RETELL_API_KEY` — from https://app.retellai.com → Settings → API Keys
- `N8N_POST_CALL_WEBHOOK_URL` — from Task 4, Step 2

- [ ] **Step 6: Commit**

```bash
git add api/webhooks/retell.ts api/webhooks/__tests__/retell.test.ts
git commit -m "feat: implement Retell post-call webhook handler with n8n forwarding"
```

---

## Final: Identity Verification Test

- [ ] **Call +31685367996 via Retell API**

```bash
curl -X POST https://api.retellai.com/v2/create-phone-call \
  -H "Authorization: Bearer $RETELL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from_number": "+31103024050",
    "to_number": "+31685367996",
    "agent_id": "agent_a35ba6c12d493367593b7445fe",
    "retell_llm_dynamic_variables": {
      "caller_name": "Reynoso",
      "caller_company": "Reynubix",
      "caller_message": "Identity test"
    }
  }'
```

**Expected:** Phone rings at +31685367996. Reyna speaks in Dutch.

**If blocked (carrier error):** Reynoso must complete:
Retell dashboard → Settings → Compliance → Business Verification

---

## Done Criteria

- [ ] Reyna NL prompt live in Retell dashboard
- [ ] Reyna EN prompt live in Retell dashboard
- [ ] n8n Workflow 1 active, Retell node enabled
- [ ] n8n Workflow 2 active, receiving post-call data
- [ ] `api/webhooks/retell.ts` deployed, tests pass
- [ ] Identity test: Reyna calls +31685367996 successfully
- [ ] Google Sheets receives lead rows + post-call rows
- [ ] Reynoso receives SMS on new lead + post-call summary
