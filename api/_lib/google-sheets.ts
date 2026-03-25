/**
 * Google Sheets REST API wrapper -zero extra npm packages.
 * Uses OAuth2 refresh token to get access tokens on the fly.
 */

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing env var ${name}. Run: node scripts/setup-google-auth.mjs`,
    );
  }
  return value;
}

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      refresh_token: requireEnv('GOOGLE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('[google-sheets] Token refresh error body:', body);
    throw new Error(`Google token refresh failed (${response.status})`);
  }

  const data = (await response.json()) as TokenResponse;
  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return data.access_token;
}

const HEADERS = [
  'Date',
  'Time',
  'Duration (s)',
  'Language',
  'Full Transcript',
  'AI Summary',
  'Sentiment',
  'Calculator Used',
  'Revenue Entered',
  'Missed Calls',
  'Booking Requested',
  'Error Log',
  'Recording URL',
  'Session ID',
  'Call Quality Score',
  'Errors Detected',
  'Prompt Fix Recommendations',
  'Failure Source',
  'Call Outcome',
];

export async function ensureSheetHeaders() {
  const sheetId = requireEnv('GOOGLE_SHEET_ID');
  const sheetName = process.env.GOOGLE_SHEET_NAME || 'reyna web';
  const token = await getAccessToken();
  const range = encodeURIComponent(`${sheetName}!A1:S1`);

  const getRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (getRes.ok) {
    const data = await getRes.json();
    if (data.values?.length && data.values[0]?.length >= HEADERS.length) return; // all headers exist
  }

  const putRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [HEADERS] }),
    },
  );

  if (!putRes.ok) {
    const body = await putRes.text();
    console.error('[google-sheets] Write headers error:', body);
    throw new Error(`Failed to write sheet headers (${putRes.status})`);
  }
}

export async function appendSheetRow(values: (string | number | null)[]) {
  const sheetId = requireEnv('GOOGLE_SHEET_ID');
  const sheetName = process.env.GOOGLE_SHEET_NAME || 'reyna web';
  const token = await getAccessToken();
  const range = encodeURIComponent(`${sheetName}!A:S`);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [values] }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error('[google-sheets] Append row error:', body);
    throw new Error(`Failed to append row to Google Sheet (${response.status})`);
  }
}
