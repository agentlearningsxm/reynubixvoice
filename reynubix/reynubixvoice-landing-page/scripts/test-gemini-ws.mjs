/**
 * test-gemini-ws.mjs
 * Tests the full voice pipeline end-to-end from Node.js:
 * 1. Hit /api/voice/session/start
 * 2. Hit /api/voice/token
 * 3. Open a real Gemini Live WebSocket using the returned token
 *
 * Run: node scripts/test-gemini-ws.mjs
 */

const BASE = 'http://localhost:3000';

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} → HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function run() {
  console.log('=== Gemini Live End-to-End Test ===\n');

  // ── Step 1: Start voice session ──────────────────────────────────────
  console.log('1. POST /api/voice/session/start...');
  const t0 = Date.now();
  const sessionResp = await post('/api/voice/session/start', {
    consent: {
      accepted: true,
      acceptedAt: new Date().toISOString(),
      version: '1.0',
    },
    context: {},
    metadata: {},
  });
  console.log(
    `   ✅ voiceSessionId: ${sessionResp.voiceSessionId}  (${Date.now() - t0}ms)\n`,
  );

  // ── Step 2: Get voice token ───────────────────────────────────────────
  console.log('2. POST /api/voice/token...');
  const t1 = Date.now();
  const tokenResp = await post('/api/voice/token', {
    voiceSessionId: sessionResp.voiceSessionId,
  });
  console.log(`   ✅ token: ${tokenResp.token?.slice(0, 40)}...`);
  console.log(`   expiresAt: ${tokenResp.expiresAt}  (${Date.now() - t1}ms)\n`);

  // ── Step 3: Connect to Gemini Live via WebSocket ──────────────────────
  console.log('3. Connecting to Gemini Live WebSocket...');
  const { GoogleGenAI } = await import('@google/genai');

  // The token could be an ephemeral token ("auth_tokens/...") or a raw API key
  const isEphemeral = tokenResp.token?.startsWith('auth_tokens/');
  console.log(`   Token type: ${isEphemeral ? 'ephemeral' : 'raw API key'}`);

  // Clear env vars that would override our explicit apiKey
  // (The SDK warns when both GOOGLE_API_KEY and GEMINI_API_KEY are set)
  const savedGoogleApiKey = process.env.GOOGLE_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_API_KEY;

  // Mirror exactly what the browser client does (lib/voice/models.ts + useGeminiLive.ts)
  const GEMINI_LIVE_API_VERSION = 'v1beta';
  const GEMINI_LIVE_MODEL = 'gemini-live-2.5-flash-preview';

  const ai = new GoogleGenAI({
    apiKey: tokenResp.token,
    httpOptions: { apiVersion: GEMINI_LIVE_API_VERSION },
  });

  let connected = false;
  let firstMessage = null;
  const connectStart = Date.now();

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`WebSocket did not open within 15 seconds`));
    }, 15_000);

    ai.live
      .connect({
        model: GEMINI_LIVE_MODEL,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
        callbacks: {
          onopen: () => {
            clearTimeout(timeout);
            connected = true;
            console.log(
              `   ✅ WebSocket opened! (${Date.now() - connectStart}ms)`,
            );
            resolve(null);
          },
          onerror: (e) => {
            clearTimeout(timeout);
            reject(
              new Error(`WebSocket error: ${e?.message || JSON.stringify(e)}`),
            );
          },
          onclose: () => {
            console.log('   WebSocket closed.');
          },
          onmessage: (msg) => {
            if (!firstMessage) {
              firstMessage = JSON.stringify(msg).slice(0, 200);
              console.log(`   First message: ${firstMessage}`);
            }
          },
        },
      })
      .then((session) => {
        // Send a simple text ping to confirm two-way comms
        setTimeout(() => {
          try {
            session.sendRealtimeInput({ text: 'Hello, are you there?' });
            console.log('   Sent test message to Reyna.');
          } catch (e) {
            console.warn('   Could not send test message:', e.message);
          }
          setTimeout(() => session.close(), 2000);
        }, 1000);
      })
      .catch(reject);
  });

  console.log('\n=== RESULT ===');
  if (connected) {
    console.log(
      '✅ Full pipeline works: session → token → WebSocket connected',
    );
  }
}

run().catch((err) => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
