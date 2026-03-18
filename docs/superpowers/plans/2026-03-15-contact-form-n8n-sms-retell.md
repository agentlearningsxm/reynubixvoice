# Contact Form → n8n → SMS + Retell Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a visitor submits the contact form, automatically SMS the owner with lead details, SMS the visitor a thank-you, wait 15 seconds, then trigger a Retell outbound call.

**Architecture:** Three-layer chain — Vercel API fires a webhook to n8n, n8n orchestrates TextBee SMS nodes and a disabled Retell stub. Code changes are minimal (one type update, one API update). n8n handles all automation logic.

**Tech Stack:** TypeScript + Vercel serverless functions, n8n (self-hosted at https://n8n.srv1093654.hstgr.cloud), TextBee SMS API, Retell AI API (stub)

**Spec:** `docs/superpowers/specs/2026-03-15-contact-form-n8n-sms-retell-design.md`

**Session context:** `D:\Desktop\Second brain\30_System\Context\2026-03-15-contact-form-n8n-sms-session.md`

---

## Chunk 1: TypeScript + API Code Changes

### Task 1: Add `phone` to `ContactSubmitPayload` type

**Files:**
- Modify: `lib/telemetry/shared.ts:24-30`
- Test: `tests/telemetry/shared.test.ts`

- [ ] **Step 1.1: Write the failing type test**

Add to `tests/telemetry/shared.test.ts`:

```ts
it('ContactSubmitPayload includes phone field', () => {
  // This is a compile-time check — if phone is missing from the type,
  // this file will fail to compile and the test suite will not run.
  const payload: import('../../lib/telemetry/shared').ContactSubmitPayload = {
    context: {},           // required field
    name: 'Test User',
    email: 'test@example.com',
    phone: '+31612345678',
    message: 'Hello',
  };
  expect(payload.phone).toBe('+31612345678');
});
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
cd D:/Desktop/reynubix/reynubixvoice-landing-page
npm test -- tests/telemetry/shared.test.ts
```

Expected: FAIL — TypeScript error: `Object literal may only specify known properties, and 'phone' does not exist`

- [ ] **Step 1.3: Add `phone` to the type**

In `lib/telemetry/shared.ts`, update `ContactSubmitPayload` (currently lines 24-30):

```ts
export interface ContactSubmitPayload {
  context: TrackingContextInput;
  name: string;
  email: string;
  phone: string;
  company?: string;
  message: string;
}
```

- [ ] **Step 1.4: Run test to verify it passes**

```bash
npm test -- tests/telemetry/shared.test.ts
```

Expected: All tests PASS including the new phone field test

- [ ] **Step 1.5: Verify TypeScript build is clean**

```bash
npm run build
```

Expected: Build succeeds with no new TypeScript errors

- [ ] **Step 1.6: Commit**

```bash
git add lib/telemetry/shared.ts tests/telemetry/shared.test.ts
git commit -m "feat: add phone field to ContactSubmitPayload type"
```

---

### Task 2: Update `api/contact.ts` — extract phone, validate, fire n8n webhook

**Files:**
- Modify: `api/contact.ts`

- [ ] **Step 2.1: Extract and validate `phone` in the handler**

In `api/contact.ts`, make these two edits:

**Edit 1** — line 19, destructure `phone`:
```ts
// Before:
const { context, name, email, company, message } = payload;

// After:
const { context, name, email, phone, company, message } = payload;
```

**Edit 2** — line 21, add `phone` to validation:
```ts
// Before:
if (!name || !email || !message) {
  return res.status(400).json({ error: 'Missing required fields' });
}

// After:
if (!name || !email || !phone || !message) {
  return res.status(400).json({ error: 'Missing required fields' });
}
```

- [ ] **Step 2.2: Add the n8n webhook call after `leadId` is assigned**

Add the following block after line 110 (after `recordEvent` resolves, before the final `return`):

```ts
// Fire n8n webhook — fire-and-forget, never block the form response
if (process.env.N8N_WEBHOOK_URL) {
  try {
    await fetch(process.env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: safeEmail,
        phone: phone.trim(),
        company: company?.trim() || null,
        message: message.trim(),
        leadId,
        source: 'contact_form',
      }),
    });
  } catch (err) {
    console.error('[n8n webhook] failed to notify:', err);
    // never rethrow — form submission must succeed regardless
  }
}
```

**Placement in file — final shape of the bottom of the function:**
```ts
  await recordEvent({ ... }); // existing

  // NEW — n8n webhook (fire-and-forget)
  if (process.env.N8N_WEBHOOK_URL) {
    try {
      await fetch(process.env.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: safeEmail,
          phone: phone.trim(),
          company: company?.trim() || null,
          message: message.trim(),
          leadId,
          source: 'contact_form',
        }),
      });
    } catch (err) {
      console.error('[n8n webhook] failed to notify:', err);
    }
  }

  return res.status(200).json({ success: true, leadId }); // existing
```

- [ ] **Step 2.3: Verify TypeScript build passes**

```bash
npm run build
```

Expected: Build succeeds — no TypeScript errors

- [ ] **Step 2.4: Commit**

```bash
git add api/contact.ts
git commit -m "feat: extract phone from contact form payload and fire n8n webhook"
```

---

### Task 3: Update `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 3.1: Uncomment `N8N_WEBHOOK_URL`**

In `.env.example`, line 21, change:
```
# N8N_WEBHOOK_URL=
```
to:
```
N8N_WEBHOOK_URL=https://n8n.srv1093654.hstgr.cloud/webhook/<webhook-id>
```

- [ ] **Step 3.2: Commit**

```bash
git add .env.example
git commit -m "chore: document N8N_WEBHOOK_URL env var"
```

---

## Chunk 2: n8n Workflow

> Build the 6-node workflow in n8n. Use the n8n MCP if available, otherwise build manually at https://n8n.srv1093654.hstgr.cloud.

### Task 4: Create the n8n workflow

**n8n URL:** https://n8n.srv1093654.hstgr.cloud
**Workflow name:** `Contact Form Lead`

- [ ] **Step 4.1: Create new workflow**

In n8n, create a new workflow named `Contact Form Lead`.

- [ ] **Step 4.2: Add Node 1 — Webhook Trigger**

- Type: `Webhook`
- HTTP Method: `POST`
- Path: `contact-lead`
- Response Mode: `Immediately`
- Authentication: None (for now)

After saving, copy the **Production webhook URL** — it will look like:
`https://n8n.srv1093654.hstgr.cloud/webhook/contact-lead`

This is your `N8N_WEBHOOK_URL`.

- [ ] **Step 4.3: Add Node 2 — Normalize Phone (Code node)**

- Type: `Code`
- Language: JavaScript
- Mode: `Run Once for All Items`

Code:
```js
const phone = $input.first().json.phone ?? '';

// Strip all spaces, dashes, parentheses
let normalized = phone.replace(/[\s\-\(\)]/g, '');

// Dutch local format: 06... → +316...
if (normalized.startsWith('06')) {
  normalized = '+31' + normalized.slice(1);
}

// Already has country code without +
if (normalized.startsWith('316') && !normalized.startsWith('+')) {
  normalized = '+' + normalized;
}

// Validate: must start with + and be at least 10 digits
if (!/^\+\d{10,15}$/.test(normalized)) {
  throw new Error(`Invalid phone number format: "${phone}" → "${normalized}"`);
}

return [{
  json: {
    ...$input.first().json,
    phoneE164: normalized,
  }
}];
```

- [ ] **Step 4.4: Add Node 3 — TextBee SMS to Owner**

- Type: `HTTP Request`
- Method: `POST`
- URL: `https://api.textbee.dev/api/v1/gateway/devices/{{ $env.TEXTBEE_DEVICE_ID }}/sendSMS`
  *(or the TextBee endpoint format you use — check your existing TextBee setup)*
- Authentication: Add `apiKey` header using TextBee API key from n8n credentials
- Body (JSON):
```json
{
  "recipients": ["+31685367996"],
  "message": "New lead: {{ $json.name }} | {{ $json.phoneE164 }} | {{ $json.email }} | {{ $json.company ?? 'N/A' }}\n{{ $json.message }}"
}
```

> **Note:** Check your TextBee account for the exact API endpoint and auth method. TextBee uses either an API key header or a device-based endpoint.

- [ ] **Step 4.5: Add Node 4 — TextBee SMS to Visitor**

- Type: `HTTP Request`
- Same TextBee endpoint and auth as Node 3
- Body (JSON):
```json
{
  "recipients": ["{{ $json.phoneE164 }}"],
  "message": "Thanks for contacting Reynubix! We received your message and will be in touch shortly. 🎙️"
}
```

- [ ] **Step 4.6: Add Node 5 — Wait**

- Type: `Wait`
- Duration: `15` seconds

- [ ] **Step 4.7: Add Node 6 — Retell Outbound Call (DISABLED)**

- Type: `HTTP Request`
- Method: `POST`
- URL: `https://api.retellai.com/v2/create-phone-call`
- Headers: `Authorization: Bearer {{ $env.RETELL_API_KEY }}`
- Body (JSON):
```json
{
  "from_number": "+31XXXXXXXXX",
  "to_number": "{{ $json.phoneE164 }}",
  "agent_id": "RETELL_AGENT_ID_PLACEHOLDER",
  "metadata": {
    "leadId": "{{ $json.leadId }}",
    "name": "{{ $json.name }}"
  }
}
```

**⚠️ IMPORTANT: Set this node to DISABLED** (toggle off in n8n node settings). It must be built with the correct shape but not active until the Retell agent is configured.

- [ ] **Step 4.8: Connect all nodes in order**

Wire: Webhook → Normalize Phone → TextBee Owner → TextBee Visitor → Wait → Retell (disabled)

- [ ] **Step 4.9: Activate the workflow**

Toggle the workflow to **Active** in n8n. Inactive workflows do not receive webhook calls.

- [ ] **Step 4.10: Test the webhook manually**

Send a test POST to verify n8n receives it and nodes 2-5 execute:

```bash
curl -X POST https://n8n.srv1093654.hstgr.cloud/webhook/contact-lead \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@reynubix.com",
    "phone": "0612345678",
    "company": "Test Co",
    "message": "Testing the webhook",
    "leadId": "test-123",
    "source": "contact_form"
  }'
```

Expected:
- n8n execution log shows all nodes ran successfully
- You receive an SMS on +31685367996 with the lead details
- `0612345678` → normalized to `+31612345678`
- Visitor SMS sent to `+31612345678`
- Retell node shows as disabled/skipped

---

## Chunk 3: Connect + Deploy

### Task 5: Set `N8N_WEBHOOK_URL` in Vercel

**Files:** Vercel dashboard (no code change)

- [ ] **Step 5.1: Copy the webhook URL from Step 4.2**

URL format: `https://n8n.srv1093654.hstgr.cloud/webhook/contact-lead`

- [ ] **Step 5.2: Add to Vercel environment variables**

Go to: Vercel dashboard → `reynubixvoice-landing-page` project → Settings → Environment Variables

Add:
- Key: `N8N_WEBHOOK_URL`
- Value: `https://n8n.srv1093654.hstgr.cloud/webhook/contact-lead`
- Environment: Production + Preview

- [ ] **Step 5.3: Redeploy to pick up the new env var**

Either push a commit or trigger a manual redeploy in Vercel dashboard.

---

### Task 6: Push code changes and run end-to-end test

- [ ] **Step 6.1: Push all commits to main**

```bash
cd D:/Desktop/reynubix/reynubixvoice-landing-page
git push origin main
```

Wait for Vercel to deploy (watch the Vercel dashboard — usually 1-2 minutes).

- [ ] **Step 6.2: End-to-end test — fill the live form**

Go to `https://reynubixvoice-landing-page.vercel.app`, scroll to the contact form, fill in:
- Name: your name
- Email: your email
- Phone: your Dutch mobile number (e.g. `06 12 34 56 78`)
- Company: (optional)
- Message: "Testing the automation"

Submit the form.

- [ ] **Step 6.3: Verify each step**

Check in this order:
1. ✅ Form shows success message (no error)
2. ✅ n8n execution log shows a new run with all nodes green
3. ✅ Owner SMS received on +31685367996 with lead details
4. ✅ Visitor SMS received on your test number
5. ✅ n8n wait node ran for 15 seconds
6. ✅ Retell node shows as disabled (not executed)
7. ✅ Supabase `contact_submissions` table has a new row with phone populated

- [ ] **Step 6.4: Test graceful failure (n8n down)**

Temporarily set `N8N_WEBHOOK_URL` to a bad URL in your local `.env`:
```
N8N_WEBHOOK_URL=https://example.com/bad-webhook
```

Run locally with `npm run dev:full`, submit the form.

Expected: Form still returns success. Terminal shows `[n8n webhook] failed to notify:` error log. Form submission is NOT broken.

Restore the correct URL after testing.

- [ ] **Step 6.5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address any issues found during e2e test"
git push origin main
```

---

## Checklist Summary

### Chunk 1 — Code
- [ ] `phone` added to `ContactSubmitPayload` type
- [ ] `phone` extracted and validated in `api/contact.ts`
- [ ] n8n webhook call added (fire-and-forget, never throws)
- [ ] `.env.example` updated
- [ ] TypeScript build passes clean
- [ ] Tests pass

### Chunk 2 — n8n
- [ ] Workflow `Contact Form Lead` created and activated
- [ ] 6 nodes wired in correct order
- [ ] Normalize Phone code node handles Dutch `06` → `+31` conversion
- [ ] Retell node built but DISABLED
- [ ] Manual curl test passes (SMS received, n8n log green)

### Chunk 3 — Deploy
- [ ] `N8N_WEBHOOK_URL` set in Vercel
- [ ] Code pushed to `main`
- [ ] Live form test passes end-to-end
- [ ] Graceful failure test passes
