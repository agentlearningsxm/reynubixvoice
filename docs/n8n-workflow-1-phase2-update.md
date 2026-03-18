# n8n Workflow 1 — Phase 2 Update Guide

**Workflow:** Contact Lead Intake → Outbound Call
**URL:** https://n8n.srv1093654.hstgr.cloud
**Folder:** projects/5wwr0XG1do4pZDOa/folders/kxhjQ7jszTw3znp1/workflows

This workflow already exists from Phase 1. You are UPDATING it — not rebuilding.

Current chain (Phase 1):
```
Webhook → Normalize Phone → TextBee SMS Owner → TextBee SMS Visitor → Wait (15s) → Retell (DISABLED)
```

Target chain (Phase 2):
```
Webhook → Normalize Phone → Google Sheets (log lead) → TextBee SMS Owner → TextBee SMS Visitor → Wait (2 min) → Retell (ENABLED) → IF → [No Answer SMS]
```

---

## Step 1 — Confirm node names

Before editing, click each node and verify its name:
- "Normalize Phone" (Code node)
- "TextBee SMS Owner" or similar (HTTP Request)
- "TextBee SMS Visitor" or similar (HTTP Request)
- "Wait" (Wait node)
- "Retell" or "Retell Outbound Call" (HTTP Request — currently disabled)

If any name differs, substitute the real name in the steps below.

---

## Step 2 — Add Google Sheets node (log lead)

Insert a new node BETWEEN "Normalize Phone" and "TextBee SMS Owner":

1. Hover the connection line between those two nodes → click the **+** button
2. Search for: **Google Sheets**
3. Select it → Operation: **Append or Update Row** → choose **Append Row**

Configure:
- **Credential:** Select your Google Sheets OAuth2 credential (create if none)
- **Document:** Select your leads spreadsheet (or paste the Sheets URL)
- **Sheet:** `Leads`
- **Columns to Send:** Switch to Expression mode for each field:

| Column name | Value |
|-------------|-------|
| Timestamp | `{{ $now.toISO() }}` |
| Name | `{{ $json.name }}` |
| Email | `={{ $json.email }}` |
| Phone | `={{ $json.phoneE164 }}` |
| Company | `={{ $json.company ?? '' }}` |
| Message | `={{ $json.message ?? '' }}` |
| Lead ID | `={{ $json.leadId }}` |
| Call Status | `Pending` |

Click **Test node** to verify a row appears in Sheets.

---

## Step 3 — Update SMS Owner message (Dutch)

Open the **TextBee SMS Owner** node. Change the message body to:

```json
{
  "recipients": ["+31685367996"],
  "message": "Nieuwe lead: {{ $json.name }} ({{ $json.company ?? 'geen bedrijf' }}) — {{ $json.phoneE164 }}\n{{ $json.message ?? '' }}\nReyna belt over ~2 min."
}
```

---

## Step 4 — Update SMS Visitor message (Dutch)

Open the **TextBee SMS Visitor** node. Change the message body to:

```json
{
  "recipients": ["{{ $json.phoneE164 }}"],
  "message": "Hallo {{ $json.name }}, bedankt voor uw aanmelding bij Reynubix! Reyna, onze AI-assistent, belt u zo — even geduld."
}
```

---

## Step 5 — Change Wait from 15s to 2 minutes

Open the **Wait** node.
- Change the amount from `15` to `120`
- Unit: **Seconds** (or switch to Minutes and set `2`)

---

## Step 6 — Enable + configure the Retell node

Open the **Retell** node (currently disabled — shown greyed out).

1. Toggle it **ON** (the enable/disable toggle at the top of the node)
2. Set the following:

| Field | Value |
|-------|-------|
| Method | POST |
| URL | `https://api.retellai.com/v2/create-phone-call` |
| Authentication | Header Auth |
| Header name | `Authorization` |
| Header value | `Bearer {{ $env.RETELL_API_KEY }}` |
| Body Content Type | JSON |

Body JSON:
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

⚠️ Make sure `RETELL_API_KEY` is set as an n8n environment variable (Settings → Variables → Create).

---

## Step 7 — Add IF node + no-answer SMS (optional but recommended)

Connect the Retell node output to a new **IF** node:

- Condition: `{{ $json.status }}` **equals** `registered`
- True branch → nothing (call was initiated, Reyna handles it)
- False branch → add a **TextBee SMS** node with the no-answer message:

```json
{
  "recipients": ["{{ $json.phoneE164 }}"],
  "message": "Hallo {{ $json.name }}, we konden u niet bereiken. Plan zelf een gesprekje via: https://cal.com/reynubix-voice/let-s-talk"
}
```

Note: Retell returns `{ "status": "registered", "call_id": "..." }` on success. If the carrier blocks the call, Retell returns a 4xx — n8n error handling will catch it. Check the execution log after the first live test.

---

## Step 8 — Save and verify active

1. Click **Save** (top right)
2. Confirm the workflow toggle is **Active** (green)
3. An inactive workflow will not receive webhook calls

---

## Step 9 — Add RETELL_API_KEY to n8n

1. Go to n8n Settings → **Variables** (or **Credentials** if using credential type)
2. Create variable: `RETELL_API_KEY` = your key from https://app.retellai.com → Settings → API Keys

---

## Step 10 — Identity verification test

Run this curl from your terminal (replace `$RETELL_API_KEY` with your actual key):

```bash
curl -X POST https://api.retellai.com/v2/create-phone-call \
  -H "Authorization: Bearer YOUR_RETELL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from_number": "+31103024050",
    "to_number": "+31685367996",
    "agent_id": "agent_a35ba6c12d493367593b7445fe",
    "retell_llm_dynamic_variables": {
      "caller_name": "Reynoso",
      "caller_company": "Reynubix",
      "caller_message": "Identity test",
      "current_time": "2026-03-18T13:00:00Z"
    }
  }'
```

**If phone rings and Reyna speaks Dutch** → identity verification PASSES. Build is complete.

**If you get a 4xx or carrier error** → Reynoso must complete:
Retell dashboard → Settings → Compliance → Business Verification
(Submit business details, takes 1–3 business days)

---

## Workflow final structure

```
Webhook (POST /contact-lead)
  ↓
Normalize Phone (Code — Dutch number normalization)
  ↓
Google Sheets — Leads (log new lead)
  ↓
TextBee SMS → Reynoso (Dutch, includes name/company/message)
  ↓
TextBee SMS → Visitor (Dutch, "Reyna belt zo")
  ↓
Wait 120s (2 minutes)
  ↓
Retell API (create-phone-call → Reyna NL)
  ↓
IF call_status == registered
  → True: [end]
  → False: TextBee SMS → Visitor (Cal.com no-answer link)
```
