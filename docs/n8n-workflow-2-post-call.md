# n8n Workflow 2 — Post-Call Processing Build Guide

**Workflow name:** Post-Call Processing (new workflow)
**URL:** https://n8n.srv1093654.hstgr.cloud
**Folder:** projects/5wwr0XG1do4pZDOa/folders/kxhjQ7jszTw3znp1/workflows

This is a new workflow. Build it from scratch.

What it does:
1. Receives Retell `call_analyzed` event forwarded from `api/webhooks/retell.ts`
2. Logs call outcome to Google Sheets (Post-Call Analysis tab)
3. Sends SMS summary to Reynoso

---

## Retell call_analyzed payload shape

The webhook handler forwards this structure. Your n8n expressions use `$json.*`:

```json
{
  "event": "call_analyzed",
  "call": {
    "call_id": "abc123",
    "call_status": "ended",
    "agent_id": "agent_a35ba6c12d493367593b7445fe",
    "agent_name": "Reyna - Dutch (Main)",
    "start_timestamp": 1710763200000,
    "end_timestamp": 1710763320000,
    "recording_url": "https://dxc03zgurdly9.cloudfront.net/.../recording.wav",
    "recording_multi_channel_url": "https://dxc03zgurdly9.cloudfront.net/.../recording_multichannel.wav",
    "transcript": "Agent: Goededag...\nUser: ...",
    "metadata": {
      "leadId": "uuid-from-supabase",
      "name": "Jan de Vries",
      "email": "jan@bedrijf.nl"
    },
    "call_analysis": {
      "call_summary": "Caller is interested in AI reception for dental practice...",
      "user_sentiment": "Positive",
      "call_successful": true,
      "custom_analysis_data": {
        "call_outcome": "qualified",
        "lead_temperature": "warm",
        "appointment_booked": false,
        "lead_interest": "AI reception for dental practice",
        "next_steps": "Follow up next week"
      }
    }
  }
}
```

Key recording fields:
- `call.recording_url` — full call recording (WAV)
- `call.recording_multi_channel_url` — separate audio channels per speaker

Map fields as: `$json.call.metadata.name`, `$json.call.call_analysis.call_summary`, etc.

---

## Step 1 — Create new workflow

1. In n8n, open the folder: `projects/5wwr0XG1do4pZDOa/folders/kxhjQ7jszTw3znp1/workflows`
2. Click **+ New Workflow**
3. Name it: `Post-Call Processing`

---

## Step 2 — Add Webhook Trigger

1. Click **+** → search **Webhook**
2. Configure:
   - HTTP Method: `POST`
   - Path: `retell-post-call`
   - Response Mode: `Immediately`
   - Authentication: None
3. Click **Save**
4. Copy the **Production URL** — it looks like:
   `https://n8n.srv1093654.hstgr.cloud/webhook/retell-post-call`

⚠️ **Save this URL** — you need to add it as `N8N_POST_CALL_WEBHOOK_URL` in Vercel env vars (see Step 6).

---

## Step 3 — Add Google Sheets node (Post-Call Analysis)

1. Connect from Webhook → **+** → search **Google Sheets**
2. Operation: **Append Row**
3. Select the same spreadsheet as Workflow 1
4. Sheet name: `Post-Call Analysis` (create this tab in Sheets if it doesn't exist yet)

Column mapping (switch each field to Expression mode):

| Column name | n8n Expression |
|-------------|----------------|
| Timestamp | `={{ $now.toISO() }}` |
| Name | `={{ $json.call.metadata?.name ?? 'Unknown' }}` |
| Lead ID | `={{ $json.call.metadata?.leadId ?? '' }}` |
| Phone | `={{ $json.call.metadata?.phone ?? $json.call.to_number ?? '' }}` |
| Call Outcome | `={{ $json.call.call_analysis?.custom_analysis_data?.call_outcome ?? 'unknown' }}` |
| Lead Temperature | `={{ $json.call.call_analysis?.custom_analysis_data?.lead_temperature ?? 'unknown' }}` |
| Appointment Booked | `={{ $json.call.call_analysis?.custom_analysis_data?.appointment_booked ? 'Yes' : 'No' }}` |
| Lead Interest | `={{ $json.call.call_analysis?.custom_analysis_data?.lead_interest ?? '' }}` |
| Next Steps | `={{ $json.call.call_analysis?.custom_analysis_data?.next_steps ?? '' }}` |
| Call Successful | `={{ $json.call.call_analysis?.call_successful ? 'Yes' : 'No' }}` |
| Sentiment | `={{ $json.call.call_analysis?.user_sentiment ?? 'Unknown' }}` |
| Duration (s) | `={{ $json.call.end_timestamp && $json.call.start_timestamp ? Math.round(($json.call.end_timestamp - $json.call.start_timestamp) / 1000) : 0 }}` |
| Summary | `={{ $json.call.call_analysis?.call_summary ?? '' }}` |
| Transcript | `={{ ($json.call.transcript ?? '').slice(0, 4000) }}` |
| Recording URL | `={{ $json.call.recording_url ?? '' }}` |
| Agent | `={{ $json.call.agent_name ?? $json.call.agent_id ?? '' }}` |

---

## Step 4 — Add SMS node → Reynoso

1. Connect from Google Sheets → **+** → search **HTTP Request**
2. Configure:
   - Method: `POST`
   - URL: `https://api.textbee.dev/api/v1/gateway/devices/{{ $env.TEXTBEE_DEVICE_ID }}/sendSMS`
   - Authentication: **Header Auth**
   - Header name: `x-api-key`
   - Header value: `{{ $env.TEXTBEE_API_KEY }}`
   - Body Content Type: **JSON**

Body (expression mode):
```
={
  "recipients": ["+31685367996"],
  "message": "Reyna call done:\n" + ($json.call.metadata?.name ?? "onbekend") + " (" + ($json.call.call_analysis?.custom_analysis_data?.lead_temperature ?? "?") + ")\nOutcome: " + ($json.call.call_analysis?.custom_analysis_data?.call_outcome ?? "unknown") + "\nBooked: " + ($json.call.call_analysis?.custom_analysis_data?.appointment_booked ? "Yes" : "No") + "\nAgent: " + ($json.call.agent_name ?? "?") + "\nDuur: " + ($json.call.end_timestamp && $json.call.start_timestamp ? Math.round(($json.call.end_timestamp - $json.call.start_timestamp) / 1000) : "?") + "s" + ($json.call.recording_url ? "\nRec: " + $json.call.recording_url : "")
}
```

The SMS now includes: lead name, temperature, outcome, booking status, which agent handled the call, duration, and a clickable recording URL.

---

## Step 5 — Wire nodes

Final node chain:
```
Webhook (POST /retell-post-call)
  ↓
Google Sheets — Post-Call Analysis (append row)
  ↓
TextBee SMS → Reynoso (call summary)
```

---

## Step 6 — Activate workflow

Toggle the workflow to **Active** (green toggle, top right).

---

## Step 7 — Add env var to Vercel

Add `N8N_POST_CALL_WEBHOOK_URL` to Vercel:

1. Vercel dashboard → `reynubixvoice-landing-page` → Settings → Environment Variables
2. Add new variable:
   - Name: `N8N_POST_CALL_WEBHOOK_URL`
   - Value: the Production URL from Step 2 (e.g. `https://n8n.srv1093654.hstgr.cloud/webhook/retell-post-call`)
   - Environment: Production + Preview
3. Redeploy: push any commit or use Vercel dashboard → Deployments → Redeploy

---

## Step 8 — Set RETELL_API_KEY in Vercel

Also add `RETELL_API_KEY` to Vercel if not already set:
1. Get from: https://app.retellai.com → Settings → API Keys
2. Add as `RETELL_API_KEY` in Vercel env vars (same as Step 7)
3. This is used by `api/webhooks/retell.ts` to verify the Retell signature

---

## Step 9 — Configure Retell post-call webhook URL

Tell Retell where to send post-call events:

1. Go to https://app.retellai.com
2. Settings → **Webhooks** (or inside each Agent → Webhook URL)
3. Set webhook URL to: `https://reynubixvoice.vercel.app/api/webhooks/retell`
4. Enable events: `call_analyzed`, `call_ended`, `call_started`
5. Save

---

## Step 10 — Test with curl

Simulate a Retell post-call event:

```bash
curl -X POST https://n8n.srv1093654.hstgr.cloud/webhook/retell-post-call \
  -H "Content-Type: application/json" \
  -d '{
    "event": "call_analyzed",
    "call": {
      "call_id": "test-001",
      "call_status": "ended",
      "agent_id": "agent_a35ba6c12d493367593b7445fe",
      "agent_name": "Reyna - Dutch (Main)",
      "start_timestamp": 1710763200000,
      "end_timestamp": 1710763320000,
      "recording_url": "https://example.com/test-recording.wav",
      "transcript": "Agent: Goededag, test call.\nUser: Hello, this is a test.",
      "to_number": "+31612345678",
      "metadata": {
        "leadId": "test-lead-001",
        "name": "Jan de Vries",
        "email": "jan@test.nl"
      },
      "call_analysis": {
        "call_summary": "Lead runs a dental practice. Wants AI reception for after-hours calls. Decision maker. Timeline Q2. Booked a meeting.",
        "user_sentiment": "Positive",
        "call_successful": true,
        "custom_analysis_data": {
          "call_outcome": "qualified",
          "lead_temperature": "warm",
          "appointment_booked": true,
          "lead_interest": "AI reception for dental practice, after-hours calls",
          "next_steps": "Meeting booked for next week"
        }
      }
    }
  }'
```

Expected outcome:
- n8n execution log: both nodes green
- Google Sheets "Post-Call Analysis" tab: new row appears
- Reynoso's phone (+31685367996): receives SMS within 30 seconds

---

## Google Sheets setup (if Post-Call Analysis tab doesn't exist)

In your leads Google Sheet, create a new tab called `Post-Call Analysis` with these column headers in row 1:

```
Timestamp | Name | Lead ID | Phone | Call Outcome | Lead Temperature | Appointment Booked | Lead Interest | Next Steps | Call Successful | Sentiment | Duration (s) | Summary | Transcript | Recording URL | Agent
```

Also add a `Recording URL` column to the `Leads` tab — the workflow updates this column after each call so you can listen back from the main lead view.

---

## Done criteria

- [ ] Workflow active in n8n
- [ ] `N8N_POST_CALL_WEBHOOK_URL` added to Vercel and deployed
- [ ] `RETELL_API_KEY` added to Vercel
- [ ] Retell webhook URL configured in Retell dashboard
- [ ] Post-Call Analysis tab exists in Google Sheets
- [ ] curl test: Sheets row + SMS both arrive
