#!/usr/bin/env node
/**
 * One-time setup: opens your browser, you click "Allow",
 * then writes the refresh token into local env files used by the app.
 *
 * Usage: node scripts/setup-google-auth.mjs
 *
 * Preferred for Docker/server deployments:
 *   Use a Google service account instead of a refresh token.
 *
 * Refresh-token prerequisites:
 *   1. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must exist in .env.local or .env.docker
 *   2. Google Sheets API must be enabled in your Google Cloud project
 *   3. http://localhost:3333/callback must be an authorized redirect URI
 */

import { exec } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { URL } from 'node:url';

const ENV_FILES = ['.env.local', '.env.docker'];
const REDIRECT_URI = 'http://localhost:3333/callback';
const DEFAULT_SHEET_ID = '1Xjb_TIhMFXSOpi9_xGG9Bg4tSIhFGQHLKVl3njragZc';
const DEFAULT_SHEET_NAME = 'reyna web';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'].join(' ');

function loadEnvFile(filename) {
  const path = join(process.cwd(), filename);
  if (!existsSync(path)) {
    return { path, content: '' };
  }
  return { path, content: readFileSync(path, 'utf-8') };
}

function getEnvVar(content, name) {
  const match = content.match(new RegExp(`^${name}=(.+)$`, 'm'));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '') || '';
}

function upsertEnvFile(filename, updates) {
  const { path, content } = loadEnvFile(filename);
  const keptLines = content
    .split('\n')
    .filter(
      (line) =>
        line && !Object.keys(updates).some((key) => line.startsWith(`${key}=`)),
    );

  const nextContent = [
    ...keptLines,
    ...Object.entries(updates).map(([key, value]) => `${key}=${value}`),
    '',
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

  writeFileSync(path, nextContent, 'utf-8');
}

const envSources = ENV_FILES.map(loadEnvFile);
const mergedEnvContent = envSources.map((entry) => entry.content).join('\n');

const CLIENT_ID = getEnvVar(mergedEnvContent, 'GOOGLE_CLIENT_ID');
const CLIENT_SECRET = getEnvVar(mergedEnvContent, 'GOOGLE_CLIENT_SECRET');
const SHEET_ID =
  getEnvVar(mergedEnvContent, 'GOOGLE_SHEET_ID') || DEFAULT_SHEET_ID;
const SHEET_NAME =
  getEnvVar(mergedEnvContent, 'GOOGLE_SHEET_NAME') || DEFAULT_SHEET_NAME;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    'Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env.local or .env.docker',
  );
  process.exit(1);
}

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

console.log('\n--- Google Sheets OAuth Setup ---\n');
console.log('This flow is for refresh-token auth only.');
console.log(
  'For Docker or production servers, a Google service account is more reliable.',
);
console.log('This will open your browser for Google consent.\n');

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);

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
        'No refresh token received. Revoke the old app access in your Google account, then rerun this script.';
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h2>Problem</h2><p>${msg}</p>`);
      console.error(`\n${msg}`);
      server.close();
      process.exit(1);
      return;
    }

    const updates = {
      GOOGLE_REFRESH_TOKEN: tokens.refresh_token,
      GOOGLE_SHEET_ID: SHEET_ID,
      GOOGLE_SHEET_NAME: SHEET_NAME,
    };

    for (const filename of ENV_FILES) {
      upsertEnvFile(filename, updates);
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      `<html><body style="font-family:system-ui;text-align:center;padding:80px">
        <h1 style="color:#22c55e">Google Sheets Connected</h1>
        <p>Refresh token saved to <code>.env.local</code> and <code>.env.docker</code>.</p>
        <p>You can close this tab.</p>
      </body></html>`,
    );

    console.log('\nDone. Refresh token saved to:');
    for (const filename of ENV_FILES) {
      console.log(`  - ${filename}`);
    }
    console.log(`Sheet ID: ${SHEET_ID}`);
    console.log(`Sheet name: ${SHEET_NAME}`);
    console.log('\nNext steps:');
    console.log('  1. Rebuild Docker so the new token is loaded');
    console.log(
      '  2. If the token expires again, switch to a Google service account for long-lived server auth',
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

  const open =
    process.platform === 'win32'
      ? 'start ""'
      : process.platform === 'darwin'
        ? 'open'
        : 'xdg-open';

  exec(`${open} "${authUrl.toString()}"`);
});
