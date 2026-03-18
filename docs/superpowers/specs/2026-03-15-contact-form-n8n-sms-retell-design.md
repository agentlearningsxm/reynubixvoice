# Spec: Contact Form → n8n → SMS + Retell Flow

**Date:** 2026-03-15
**Status:** Approved
**Project:** reynubixvoice-landing-page

---

## Goal

When a visitor fills in the contact form on `reynubixvoice-landing-page.vercel.app`, the system must:
1. Notify the owner (Reynoso) via SMS with the lead's details
2. Send the visitor a thank-you SMS
3. Wait 15 seconds
4. Trigger a Retell AI outbound call to pitch the visitor

---

## Current State

- Website: live at `reynubixvoice-landing-page.vercel.app` (deployed from `main` branch, GitHub: `agentlearningsxm/reynubixvoice.git`)
- Contact form: `components/ui/premium-contact.tsx` — collects name, email, phone (required), company, message
- API handler: `api/contact.ts` — saves to Supabase, sends email via Zoho SMTP
- Phone field: exists in form (required, validated client-side) and submitted in `formData`, but NOT yet extracted in `api/contact.ts` or its TypeScript type
- n8n: self-hosted at `https://n8n.srv1093654.hstgr.cloud` (Hostinger VPS) — connected via MCP
- n8n webhook stub: `api/webhooks/n8n.ts` exists but is not called from the contact form

---

## Architecture

### Data Flow

```
Visitor fills contact form (name, email, phone, company, message)
        ↓
Vercel API: api/contact.ts
  - validates phone as required (NEW)
  - saves to Supabase contact_submissions ✅
  - sends email to voice@reynubix.com via Zoho SMTP ✅
  - after leadId is assigned: fire-and-forget POST to N8N_WEBHOOK_URL (NEW)
        ↓
n8n: Webhook Trigger (node 1)
        ↓
n8n: TextBee — SMS to OWNER (node 2)
  "New lead: {name} | {phone} | {email} | {company} | {message}"
        ↓
n8n: TextBee — SMS to VISITOR (node 3)
  "Thanks for visiting Reynubix! We received your message and will be in touch shortly."
        ↓
n8n: Wait — 15 seconds (node 4)
        ↓
n8n: Retell — Outbound call to VISITOR (node 5, DISABLED until agent is ready)
```

---

## Code Changes

### 1. `lib/telemetry/shared.ts` — Add `phone` to `ContactSubmitPayload`

Add `phone: string` to the `ContactSubmitPayload` type so it flows through TypeScript correctly:

```ts
export interface ContactSubmitPayload {
  name: string;
  email: string;
  phone: string;   // ADD THIS
  company?: string;
  message: string;
  context?: TrackingContext;
}
```

### 2. `api/contact.ts`

- Destructure `phone` from payload alongside name, email, company, message
- Add server-side validation: if `!phone`, return `400 { error: 'Missing required fields' }`
- After `leadId` is assigned (after `upsertLead` resolves), fire the n8n POST — the `leadId` must be available in the payload
- n8n call pattern — use `await` inside a `try/catch` that never throws, ensuring Vercel does not terminate the function before the fetch completes:

```ts
try {
  await fetch(process.env.N8N_WEBHOOK_URL!, {
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
  console.error('[n8n webhook] failed:', err);
  // never rethrow — form submit must succeed regardless
}
```

### 3. Vercel Environment Variables

Add to Vercel project settings AND `.env.example`:
```
N8N_WEBHOOK_URL=https://n8n.srv1093654.hstgr.cloud/webhook/<webhook-id>
```
The `<webhook-id>` is obtained after creating the n8n workflow.

---

## Phone Number Format

The form collects `type="tel"` free-text with no format enforcement. TextBee and Retell require **E.164 format** (e.g. `+31685367996`).

**Decision for this phase:** Accept raw input. Add a format-normalizer node in n8n (before TextBee node 2) that strips spaces/dashes and prepends `+31` if the number starts with `06`. This keeps the API simple and puts formatting logic where it's easy to adjust.

If the number cannot be normalized to E.164, n8n should log the error and skip the TextBee + Retell nodes gracefully (use n8n error handling on those nodes).

---

## n8n Workflow

**Workflow name:** `Contact Form Lead`
**Webhook path:** `/contact-lead`

| # | Node | Type | Config |
|---|------|------|--------|
| 1 | Webhook Trigger | Webhook | Method: POST, Path: `/contact-lead`, Response: immediately |
| 2 | Normalize Phone | Code | Strip spaces/dashes, prepend `+31` if number starts with `06`. Output: `phoneE164`. On failure: stop and log error. |
| 3 | TextBee — Owner SMS | HTTP Request | POST TextBee API, to: owner number (+31685367996), body: lead summary |
| 4 | TextBee — Visitor SMS | HTTP Request | POST TextBee API, to: `{{ $json.phoneE164 }}`, body: thank-you message |
| 5 | Wait | Wait | 15 seconds |
| 6 | Retell — Outbound Call | HTTP Request | POST Retell API `/v2/create-phone-call`, **node DISABLED** until agent is configured |

**Important:** Node 5 must be built with the correct Retell endpoint and payload shape, then set to **disabled** — do not skip or delete it. This preserves the wiring for the next phase.

---

## Out of Scope (This Phase)

- Retell voice agent creation and configuration
- Webhook authentication (shared secret header) — noted as future security task
- Zoho CRM contact creation
- Multi-language thank-you SMS
- Retry logic for failed TextBee calls

---

## Success Criteria

- [ ] n8n webhook receives POST within 2 seconds of form submission (testable in n8n execution log)
- [ ] Owner SMS arrives (delivery is best-effort, not a hard gate)
- [ ] Visitor SMS arrives (delivery is best-effort, not a hard gate)
- [ ] Form submission succeeds even when n8n is unreachable (test by temporarily using a bad webhook URL)
- [ ] Phone number correctly passed through: form → API → n8n payload
- [ ] TypeScript build passes clean with `phone` added to `ContactSubmitPayload`

---

## Dependencies

- TextBee API key — check Vercel env or n8n credentials store
- n8n running at `https://n8n.srv1093654.hstgr.cloud`
- Retell API key — can be placeholder for now (node is disabled)
- `N8N_WEBHOOK_URL` set in Vercel environment variables after workflow is created
