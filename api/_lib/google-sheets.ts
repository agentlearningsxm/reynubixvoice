/**
 * Google Sheets REST API wrapper -zero extra npm packages.
 * Supports either OAuth2 refresh tokens or service-account JWT auth.
 */
import { createSign } from 'node:crypto';

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface GoogleOAuthErrorResponse {
  error?: string;
  error_description?: string;
}

interface ServiceAccountCredentials {
  clientEmail: string;
  privateKey: string;
  privateKeyId?: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return '';
  }

  const unwrapped =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;

  return unwrapped.replace(/\\n/g, '\n');
}

function getOptionalEnv(name: string) {
  return normalizeEnvValue(process.env[name]);
}

function requireEnv(name: string): string {
  const value = getOptionalEnv(name);
  if (!value) {
    throw new Error(
      `Missing env var ${name}. Configure Google Sheets auth or run: node scripts/setup-google-auth.mjs`,
    );
  }
  return value;
}

function getServiceAccountCredentials(): ServiceAccountCredentials | null {
  const rawJson = getOptionalEnv('GOOGLE_SERVICE_ACCOUNT_JSON');
  const rawJsonBase64 = getOptionalEnv('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64');

  if (rawJson || rawJsonBase64) {
    const parsed = JSON.parse(
      rawJson || Buffer.from(rawJsonBase64, 'base64').toString('utf-8'),
    ) as {
      client_email?: string;
      private_key?: string;
      private_key_id?: string;
    };

    if (parsed.client_email && parsed.private_key) {
      return {
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key.replace(/\\n/g, '\n'),
        privateKeyId: parsed.private_key_id,
      };
    }
  }

  const clientEmail =
    getOptionalEnv('GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL') ||
    getOptionalEnv('GOOGLE_CLIENT_EMAIL');
  const privateKey =
    getOptionalEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY') ||
    getOptionalEnv('GOOGLE_PRIVATE_KEY');
  const privateKeyId =
    getOptionalEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID') ||
    getOptionalEnv('GOOGLE_PRIVATE_KEY_ID');

  if (!clientEmail || !privateKey) {
    return null;
  }

  return {
    clientEmail,
    privateKey,
    privateKeyId: privateKeyId || undefined,
  };
}

function hasRefreshTokenAuthConfig() {
  return Boolean(
    getOptionalEnv('GOOGLE_CLIENT_ID') &&
      getOptionalEnv('GOOGLE_CLIENT_SECRET') &&
      getOptionalEnv('GOOGLE_REFRESH_TOKEN'),
  );
}

export function hasGoogleSheetsConfig() {
  return Boolean(
    getOptionalEnv('GOOGLE_SHEET_ID') &&
      (getServiceAccountCredentials() || hasRefreshTokenAuthConfig()),
  );
}

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createServiceAccountAssertion(
  credentials: ServiceAccountCredentials,
  scope: string,
) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    ...(credentials.privateKeyId ? { kid: credentials.privateKeyId } : {}),
  };
  const payload = {
    iss: credentials.clientEmail,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signer = createSign('RSA-SHA256');
  signer.update(`${encodedHeader}.${encodedPayload}`);
  signer.end();
  const signature = signer.sign(credentials.privateKey);
  return `${encodedHeader}.${encodedPayload}.${encodeBase64Url(signature)}`;
}

function cacheAccessToken(data: TokenResponse) {
  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return data.access_token;
}

async function getAccessTokenFromRefreshToken() {
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

    let parsedError: GoogleOAuthErrorResponse | null = null;
    try {
      parsedError = JSON.parse(body) as GoogleOAuthErrorResponse;
    } catch {
      parsedError = null;
    }

    const details = body.toLowerCase();
    if (
      response.status === 400 &&
      (parsedError?.error === 'invalid_grant' ||
        details.includes('invalid_grant')) &&
      (parsedError?.error_description
        ?.toLowerCase()
        .includes('expired or revoked') ||
        details.includes('expired or revoked'))
    ) {
      throw new Error(
        'Google refresh token expired or was revoked. Rerun scripts/setup-google-auth.mjs and update .env.docker, or switch to a Google service account for Docker/server usage.',
      );
    }
    throw new Error(`Google token refresh failed (${response.status})`);
  }

  return cacheAccessToken((await response.json()) as TokenResponse);
}

async function getAccessTokenFromServiceAccount() {
  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    throw new Error('Google service account credentials are not configured.');
  }

  const assertion = createServiceAccountAssertion(
    credentials,
    'https://www.googleapis.com/auth/spreadsheets',
  );

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('[google-sheets] Service account token error body:', body);
    throw new Error(
      `Google service account token exchange failed (${response.status})`,
    );
  }

  return cacheAccessToken((await response.json()) as TokenResponse);
}

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  const serviceAccountCredentials = getServiceAccountCredentials();
  if (serviceAccountCredentials) {
    try {
      return await getAccessTokenFromServiceAccount();
    } catch (error) {
      if (!hasRefreshTokenAuthConfig()) {
        throw error;
      }
      console.warn(
        '[google-sheets] Service account auth failed, falling back to refresh token auth.',
        error,
      );
    }
  }

  if (hasRefreshTokenAuthConfig()) {
    return getAccessTokenFromRefreshToken();
  }

  throw new Error(
    'Google Sheets auth is not configured. Add service-account env vars or rerun scripts/setup-google-auth.mjs.',
  );
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
  const sheetName = getOptionalEnv('GOOGLE_SHEET_NAME') || 'reyna web';
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
  const sheetName = getOptionalEnv('GOOGLE_SHEET_NAME') || 'reyna web';
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
    throw new Error(
      `Failed to append row to Google Sheet (${response.status})`,
    );
  }
}
