# n8n Workflow Build Guide: Contact Form Lead

**When:** After code is deployed to Vercel
**Where:** https://n8n.srv1093654.hstgr.cloud
**Folder:** projects/5wwr0XG1do4pZDOa/folders/kxhjQ7jszTw3znp1/workflows

---

## Step-by-step: Build this workflow in n8n

### Node 1: Webhook Trigger

- Add node: **Webhook**
- HTTP Method: `POST`
- Path: `contact-lead`
- Response Mode: `Immediately`
- Auth: None (for now)
- Save → copy the **Production URL** (you'll need it for Vercel)

### Node 2: Normalize Phone (Code node)

- Add node: **Code**
- Language: JavaScript
- Mode: Run Once for All Items

Paste this code:

```javascript
const phone = $input.first().json.phone ?? '';

// Strip spaces, dashes, parentheses
let normalized = phone.replace(/[\s\-\(\)]/g, '');

// Dutch local: 06... → +316...
if (normalized.startsWith('06')) {
  normalized = '+31' + normalized.slice(1);
}

// Has country code without +
if (normalized.startsWith('316') && !normalized.startsWith('+')) {
  normalized = '+' + normalized;
}

// Must be E.164: + followed by 10-15 digits
if (!/^\+\d{10,15}$/.test(normalized)) {
  throw new Error(`Invalid phone: "${phone}" → "${normalized}"`);
}

return [{
  json: {
    ...$input.first().json,
    phoneE164: normalized,
  }
}];
```

### Node 3: TextBee SMS → Owner

- Add node: **HTTP Request**
- Method: `POST`
- URL: `https://api.textbee.dev/api/v1/gateway/devices/{{ $env.TEXTBEE_DEVICE_ID }}/sendSMS`
- Auth: Add header `x-api-key` with your TextBee API key
- Body type: JSON
- Body:

```json
{
  "recipients": ["+31685367996"],
  "message": "New lead: {{ $json.name }} | {{ $json.phoneE164 }} | {{ $json.email }} | {{ $json.company ?? 'N/A' }}\n{{ $json.message }}"
}
```

### Node 4: TextBee SMS → Visitor

- Add node: **HTTP Request**
- Same setup as Node 3, but:
- Body:

```json
{
  "recipients": ["{{ $json.phoneE164 }}"],
  "message": "Thanks for contacting Reynubix! We received your message and will be in touch shortly."
}
```

### Node 5: Wait

- Add node: **Wait**
- Duration: `15` seconds

### Node 6: Retell Outbound Call (DISABLED)

- Add node: **HTTP Request**
- Method: `POST`
- URL: `https://api.retellai.com/v2/create-phone-call`
- Headers: `Authorization: Bearer {{ $env.RETELL_API_KEY }}`
- Body:

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

**⚠️ IMPORTANT: Disable this node** (toggle it off). It stays wired but doesn't execute until Phase 2.

### Wire the nodes

```
Webhook → Normalize Phone → TextBee Owner → TextBee Visitor → Wait → Retell (disabled)
```

### Activate the workflow

Toggle the workflow to **Active** — inactive workflows don't receive webhooks.

---

## After building: Connect to Vercel

1. Copy the production webhook URL from Node 1 (looks like `https://n8n.srv1093654.hstgr.cloud/webhook/contact-lead`)
2. Go to Vercel dashboard → reynubixvoice-landing-page → Settings → Environment Variables
3. Add: `N8N_WEBHOOK_URL` = the webhook URL (Production + Preview)
4. Redeploy (push a commit or manual redeploy)

---

## Test it

Send a test POST:

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

**Expected:**
- n8n execution log: all nodes green
- Owner SMS arrives on +31685367996
- Phone normalized: `0612345678` → `+31612345678`
- Visitor SMS sent to +31612345678
- Retell node shows as disabled/skipped
