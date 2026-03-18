# Reyna Outbound Voice Agent — Phase 2 Design Spec

**Date:** 2026-03-18
**Status:** Approved — Build Ready
**Owner:** Reynoso / Reynubix Voice AI

---

## Goal

When a lead fills out the contact form at reynubixvoice.vercel.app, Reyna (an AI voice agent) automatically calls them within 2 minutes, qualifies them in Dutch, and either books a meeting, transfers to a human, or follows up via SMS.

---

## Data Flow

```
Contact form
  → api/contact.ts (fires N8N_WEBHOOK_URL: {name, email, phone, company, message, leadId})

  → n8n Workflow 1: Lead Intake → Outbound Call
      Step 1: Log lead to Google Sheets (Leads tab)
      Step 2: SMS to Reynoso (+31685367996): "New lead: {name} from {company} — {phone}"
      Step 3: SMS to visitor (+{phone}): "Hi {name}, Reyna van Reynubix belt u zo — even geduld!"
      Step 4: Wait 2 minutes
      Step 5: Retell API POST /create-phone-call
              from: +31103024050 (Dutch Retell number)
              to: {phone}
              agent_id: agent_a35ba6c12d493367593b7445fe (Reyna NL)
              metadata: { name, company, message, email, leadId }
      Step 6: If no answer → SMS to visitor: Cal.com link + update Sheets "No Answer"
      Step 6b: If connected → Reyna handles call (Retell takes over)

  → Reyna NL call flow:
      Greet with name from metadata
      Qualify: 5 questions (business type, pain point, AI experience, timeline, decision maker)
      Outcome paths:
        - English preferred → warm transfer to Reyna EN (agent_cadf4dd9614c15a7d5ebdc69e0)
        - Hot lead / wants human → transfer_to_human → +31685367996
        - Wants to book → send_sms with cal.com/reynubix-voice/let-s-talk
        - Not interested → polite close, log outcome

  → Call ends → Retell post-call webhook → api/webhooks/retell.ts
      Validate signature (RETELL_API_KEY)
      Forward call_analyzed payload to n8n Workflow 2

  → n8n Workflow 2: Post-Call Processing
      Step 1: Update Google Sheets (Post-Call Analysis tab)
              Columns: timestamp, name, call_outcome, sentiment, booking_made, follow_up_needed, summary
      Step 2: SMS to Reynoso: "Reyna belde {name}: {outcome}. Booking: {yes/no}. Follow-up: {yes/no}."
```

---

## Components to Build

| # | Component | Location | Notes |
|---|-----------|----------|-------|
| 1 | Reyna NL system prompt | Retell dashboard → agent_a35ba6c12d493367593b7445fe | Dutch, formal start, mirror informal |
| 2 | Reyna EN system prompt | Retell dashboard → agent_cadf4dd9614c15a7d5ebdc69e0 | English, warm transfer opener |
| 3 | n8n Workflow 1 | n8n.srv1093654.hstgr.cloud | Webhook → Sheets → SMS × 2 → Wait → Retell call |
| 4 | n8n Workflow 2 | n8n.srv1093654.hstgr.cloud | Retell webhook → Sheets → SMS summary to Reynoso |
| 5 | api/webhooks/retell.ts | Project codebase | Verify signature → forward to n8n Workflow 2 |

---

## Agent Credentials

| Agent | Retell ID | Language |
|-------|-----------|----------|
| Reyna NL | `agent_a35ba6c12d493367593b7445fe` | Dutch (primary, outbound) |
| Reyna EN | `agent_cadf4dd9614c15a7d5ebdc69e0` | English (receives warm transfers) |

| Phone | Purpose |
|-------|---------|
| `+31103024050` | Retell outbound caller ID |
| `+31685367996` | Reynoso personal — human transfer + test target |
| `+31026030724` | TextBee SMS number |

---

## Retell Tool Definitions

### transfer_to_human
```json
{
  "name": "transfer_to_human",
  "description": "Transfer the call to Reynoso (human) when lead is hot or explicitly asks",
  "parameters": {
    "reason": "string"
  }
}
```
Transfer number: `+31685367996`

### transfer_to_english
```json
{
  "name": "transfer_to_english",
  "description": "Warm transfer to Reyna EN when caller prefers English",
  "parameters": {
    "reason": "string"
  }
}
```
Transfer to agent: `agent_cadf4dd9614c15a7d5ebdc69e0`

### transfer_to_dutch (Reyna EN only)
```json
{
  "name": "transfer_to_dutch",
  "description": "Transfer back to Reyna NL if caller switches to Dutch",
  "parameters": {}
}
```
Transfer to agent: `agent_a35ba6c12d493367593b7445fe`

### send_sms
```json
{
  "name": "send_sms",
  "description": "Send SMS to the caller with Cal.com booking link or follow-up message",
  "parameters": {
    "message": "string"
  }
}
```
Webhook: POST to n8n (TextBee via n8n)
Booking link: `cal.com/reynubix-voice/let-s-talk`

---

## Reyna NL — System Prompt Requirements

- **Language:** Dutch. Start formal (u-form). Mirror to informal if caller uses "je/jij".
- **Identity:** "Reyna, AI-voice-assistent van Reynubix Voice AI"
- **Opener:** "Goedemiddag, u spreekt met Reyna van Reynubix. Ik bel naar aanleiding van uw aanmelding. Is dit een goed moment?"
- **Context variables:** `{{caller_name}}`, `{{caller_company}}`, `{{caller_message}}`
- **Qualification flow (5 questions, one at a time):**
  1. "Wat voor soort bedrijf heeft u?" — business type
  2. "Wat is uw grootste uitdaging op het gebied van klantcommunicatie?" — pain point
  3. "Heeft u al ervaring met AI of geautomatiseerde systemen?" — experience level
  4. "Wanneer zou u dit willen implementeren?" — timeline
  5. "Bent u degene die hierover de beslissing neemt?" — decision maker check
- **Tone:** Warm, professioneel, bondig. Geen corporate taal.
- **Tools:** `transfer_to_english`, `transfer_to_human`, `send_sms`
- **Escalation:** Transfer to human if caller is hot lead, frustrated, or requests human after 2nd question

---

## Reyna EN — System Prompt Requirements

- **Language:** English.
- **Identity:** "Reyna, AI voice assistant at Reynubix Voice AI"
- **Opener:** "Hi {{caller_name}}, I'm Reyna — I was just speaking with my Dutch colleague. Let me continue helping you."
- **Same 5 qualification questions in English**
- **Same tools + `transfer_to_dutch`**
- **Tone:** Warm, professional, concise

---

## Webhook Handler — api/webhooks/retell.ts

The existing stub handles `call_started`, `call_ended`, `call_analyzed`. The real implementation must:

1. Verify Retell webhook signature using `RETELL_API_KEY`
2. On `call_analyzed` — POST payload to n8n Workflow 2 webhook URL
3. On `call_ended` — log to console (optional: update Supabase lead status)
4. Return `200 OK` quickly (Retell requires fast response)

Env vars needed:
- `RETELL_API_KEY` — for signature verification
- `N8N_POST_CALL_WEBHOOK_URL` — n8n Workflow 2 endpoint

---

## Google Sheets Structure

### Tab 1: Leads
Timestamp | Name | Email | Phone | Company | Message | Lead ID | Call Status | Call Duration

### Tab 2: Post-Call Analysis
Timestamp | Name | Call Outcome | Sentiment | Booking Made | Follow-Up Needed | Summary

---

## Identity Verification Warning

Reynoso has NOT completed Retell Business Verification (Settings → Compliance → Business Verification). Outbound calls may be blocked by carriers.

**Test plan:** Call `+31685367996` via Retell API first. If it fails → Reynoso must complete KYC in Retell dashboard before any leads get called.

---

## Success Criteria

- Lead fills form → Reyna calls within 2 minutes ✅
- Reyna correctly uses caller's name from metadata ✅
- All 5 qualification questions asked (one at a time) ✅
- Transfers work: English → EN agent, Human → +31685367996 ✅
- Booking SMS fires with correct Cal.com link ✅
- Post-call: Reynoso receives SMS summary within 1 minute ✅
- Google Sheets updated after every call ✅
