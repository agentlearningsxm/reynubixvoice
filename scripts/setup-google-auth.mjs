#!/usr/bin/env node
/**
 * One-time setup: opens your browser, you click "Allow",
 * refresh token is saved to .env.local automatically.
 *
 * Usage:  node scripts/setup-google-auth.mjs
 *
 * Prerequisites:
 *   1. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be in .env.local
 *   2. Google Cloud project must have Google Sheets API enabled
 *      https://console.cloud.google.com/apis/library/sheets.googleapis.com
 *   3. Add http://localhost:3333/callback as authorized redirect URI
 *      https://console.cloud.google.com/apis/credentials
 *      Click the OAuth client -> Authorized redirect URIs -> Add
 */

import { createServer } from 'node:http';
import { URL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ── Load credentials from .env.local ───────────────────────────
const envPath = join(process.cwd(), '.env.local');
let envContent = '';
try {
  envContent = readFileSync(envPath, 'utf-8');
} catch {
  console.error('Error: .env.local not found. Create it first.');
  process.exit(1);
}

function getEnvVar(name) {
  const match = envContent.match(new RegExp(`^${name}=(.+)$`, 'm'));
  return match?.[1]?.trim() || '';
}

const CLIENT_ID = getEnvVar('GOOGLE_CLIENT_ID');
const CLIENT_SECRET = getEnvVar('GOOGLE_CLIENT_SECRET');
const SHEET_ID =
  getEnvVar('GOOGLE_SHEET_ID') ||
  '1Xjb_TIhMFXSOpi9_xGG9Bg4tSIhFGQHLKVl3njragZc';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    'Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env.local',
  );
  console.error('Add them from your Google Cloud project credentials.');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3333/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/analytics.readonly',
].join(' ');

// ── Build consent URL ──────────────────────────────────────────
const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

console.log('\n--- Google Sheets OAuth Setup ---\n');
console.log('This will open your browser.');
console.log('Sign in and click "Allow" to grant Google Sheets access.\n');

// ── Local callback server ──────────────────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3333');

  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`<h2>Auth failed: ${error}</h2><p>Try again.</p>`);
    console.error(`\nAuth failed: ${error}`);
    server.close();
    process.exit(1);
    return;
  }

  if (!code) {
    res.writeHead(400);
    res.end('No authorization code received.');
    return;
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.refresh_token) {
      const msg =
        'No refresh token received. Revoke access at myaccount.google.com/permissions, then run this script again.';
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h2>Problem</h2><p>${msg}</p>`);
      console.error(`\n${msg}`);
      server.close();
      process.exit(1);
      return;
    }

    // ── Update .env.local with refresh token ─────────────────
    const lines = envContent.split('\n').filter(
      (line) =>
        !line.startsWith('GOOGLE_REFRESH_TOKEN=') &&
        !line.startsWith('GOOGLE_SHEET_ID=') &&
        !line.startsWith('GOOGLE_SHEET_NAME=') &&
        !line.includes('# Google Sheets — sheet ID'),
    );

    const cleaned = lines.join('\n').trimEnd();
    const newVars = [
      '',
      `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`,
      `GOOGLE_SHEET_ID=${SHEET_ID}`,
      `GOOGLE_SHEET_NAME=reyna web`,
      '',
    ].join('\n');

    writeFileSync(envPath, cleaned + newVars);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      `<html><body style="font-family:system-ui;text-align:center;padding:80px">
        <h1 style="color:#22c55e">Google Sheets Connected!</h1>
        <p>Refresh token saved to <code>.env.local</code></p>
        <p>You can close this tab.</p>
      </body></html>`,
    );

    console.log('\nDone! Refresh token saved to .env.local');
    console.log(`Sheet ID: ${SHEET_ID}`);
    console.log('Sheet name: reyna web\n');
    console.log('Next steps:');
    console.log(
      '  1. Add these env vars to Vercel (Settings > Environment Variables):',
    );
    console.log(
      '     GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,',
    );
    console.log(
      '     GOOGLE_REFRESH_TOKEN, GOOGLE_SHEET_ID, GOOGLE_SHEET_NAME',
    );
    console.log(
      '  2. Make sure Google Sheets API is enabled in your Google Cloud project',
    );
    console.log(
      '     https://console.cloud.google.com/apis/library/sheets.googleapis.com\n',
    );

    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500);
    res.end('Token exchange failed. Check console for details.');
    console.error('Token exchange failed:', err);
    server.close();
    process.exit(1);
  }
});

server.listen(3333, () => {
  console.log(`Open this URL in your browser:\n\n${authUrl.toString()}\n`);

  // Auto-open browser on Windows
  import('node:child_process').then(({ exec }) => {
    const open =
      process.platform === 'win32'
        ? 'start ""'
        : process.platform === 'darwin'
          ? 'open'
          : 'xdg-open';
    exec(`${open} "${authUrl.toString()}"`);
  });
});
