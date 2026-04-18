#!/usr/bin/env node

/**
 * Google OAuth2 Refresh Token Generator
 *
 * Run: node scripts/setup-google-auth.mjs
 *
 * This script generates a new GOOGLE_REFRESH_TOKEN for Google Sheets API access.
 * The token is valid for ~6 months and needs to be refreshed periodically.
 */

import fs from 'fs';
import { google } from 'googleapis';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0 && !key.startsWith('#')) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    'ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env.local',
  );
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3000/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
);

function generateAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

async function waitForCallback(port = 3000) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      const code = url.searchParams.get('code');

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #1a1a2e;">
              <div style="text-align: center; color: #4ade80;">
                <h1>Success!</h1>
                <p>You can close this window now.</p>
              </div>
            </body>
          </html>
        `);
        server.close();
        resolve(code);
      } else {
        res.writeHead(400);
        res.end('Missing authorization code');
        server.close();
        reject(new Error('Missing authorization code'));
      }
    });

    server.listen(port, () => {
      console.log(`\nCallback server listening on http://localhost:${port}`);
    });

    setTimeout(() => {
      server.close();
      reject(new Error('Timeout waiting for callback'));
    }, 120000);
  });
}

async function exchangeCodeForToken(code) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

function updateEnvFile(refreshToken) {
  const envFile = path.join(__dirname, '..', '.env.local');
  const content = fs.readFileSync(envFile, 'utf-8');

  const lines = content.split('\n');
  let found = false;
  const updatedLines = lines.map((line) => {
    if (line.startsWith('GOOGLE_REFRESH_TOKEN=')) {
      found = true;
      return `GOOGLE_REFRESH_TOKEN=${refreshToken}`;
    }
    return line;
  });

  if (!found) {
    updatedLines.push(`GOOGLE_REFRESH_TOKEN=${refreshToken}`);
  }

  fs.writeFileSync(envFile, updatedLines.join('\n'));
  console.log('\nUpdated .env.local with new refresh token');
}

async function testToken(refreshToken) {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME || 'reyna web';

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:A1`,
    });
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('=================================================');
  console.log('  Google OAuth2 Refresh Token Generator');
  console.log('=================================================\n');

  console.log('Client ID:', CLIENT_ID.substring(0, 20) + '...\n');

  const authUrl = generateAuthUrl();
  console.log('1. Opening browser for authorization...\n');
  console.log('2. If browser does not open, visit this URL manually:\n');
  console.log('   ', authUrl, '\n');

  // Try to open browser
  const { default: open } = await import('open').catch(() => ({
    default: () => {},
  }));
  open(authUrl).catch(() => {});

  console.log('3. Authorize the application in your browser.');
  console.log('4. Waiting for callback...\n');

  try {
    const code = await waitForCallback();
    console.log('5. Exchanging authorization code for tokens...\n');

    const tokens = await exchangeCodeForToken(code);

    if (!tokens.refresh_token) {
      console.error(
        'ERROR: No refresh token received. Try again and make sure to approve all permissions.',
      );
      process.exit(1);
    }

    console.log(
      'Refresh token received:',
      tokens.refresh_token.substring(0, 20) + '...\n',
    );

    // Update .env.local
    updateEnvFile(tokens.refresh_token);

    // Test the token
    console.log('Testing token against Google Sheet...');
    const success = await testToken(tokens.refresh_token);

    if (success) {
      console.log('\n=================================================');
      console.log('  SUCCESS! Token is working.');
      console.log('=================================================');
      console.log('\nYou can now run the CRM migration:');
      console.log(
        '  python scripts/migrate_sheets_to_crm.py --dry-run --batch 3',
      );
    } else {
      console.log('\nWARNING: Token generated but could not access sheet.');
      console.log(
        'Check that the sheet ID is correct and the Google account has access.',
      );
    }
  } catch (error) {
    console.error('\nERROR:', error.message);
    process.exit(1);
  }
}

main();
