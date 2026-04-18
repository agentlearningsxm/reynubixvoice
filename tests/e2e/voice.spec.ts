import { expect, test } from '@playwright/test';

test.describe('Reyna voice — Gemini Live WebSocket', () => {
  test('connects, holds open, uses 16kHz input AudioContext', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.addInitScript(() => {
      (window as any).__reynaAudioSampleRates = [] as number[];
      (window as any).__reynaWsCloses = [] as Array<{
        url: string;
        code: number;
        reason: string;
        wasClean: boolean;
      }>;
      const OriginalAudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (OriginalAudioContext) {
        const Patched = function (this: any, opts?: AudioContextOptions) {
          const inst = new OriginalAudioContext(opts);
          (window as any).__reynaAudioSampleRates.push(inst.sampleRate);
          return inst;
        } as any;
        Patched.prototype = OriginalAudioContext.prototype;
        (window as any).AudioContext = Patched;
        (window as any).webkitAudioContext = Patched;
      }
      const OriginalWs = window.WebSocket;
      const PatchedWs = function (this: any, url: string, protocols?: string | string[]) {
        const ws = protocols ? new OriginalWs(url, protocols) : new OriginalWs(url);
        ws.addEventListener('close', (evt: CloseEvent) => {
          (window as any).__reynaWsCloses.push({
            url,
            code: evt.code,
            reason: evt.reason,
            wasClean: evt.wasClean,
          });
        });
        return ws;
      } as any;
      PatchedWs.prototype = OriginalWs.prototype;
      PatchedWs.CONNECTING = OriginalWs.CONNECTING;
      PatchedWs.OPEN = OriginalWs.OPEN;
      PatchedWs.CLOSING = OriginalWs.CLOSING;
      PatchedWs.CLOSED = OriginalWs.CLOSED;
      (window as any).WebSocket = PatchedWs;
    });

    const consoleLogs: string[] = [];
    const wsEvents: Array<{ type: string; url?: string; code?: number; reason?: string }> = [];

    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', (err) => {
      consoleLogs.push(`[pageerror] ${err.message}`);
    });

    page.on('websocket', (ws) => {
      wsEvents.push({ type: 'open', url: ws.url() });
      ws.on('close', () => {
        wsEvents.push({ type: 'close', url: ws.url() });
      });
      ws.on('framereceived', (frame) => {
        const text = (() => {
          try {
            const p = frame.payload;
            if (typeof p === 'string') return p.slice(0, 300);
            return Buffer.from(p).toString('utf-8').slice(0, 300);
          } catch {
            return '<binary>';
          }
        })();
        wsEvents.push({ type: 'framereceived', url: ws.url(), reason: text });
      });
      ws.on('framesent', () => {
        wsEvents.push({ type: 'framesent', url: ws.url() });
      });
      ws.on('socketerror', (err) => {
        wsEvents.push({ type: 'error', url: ws.url(), reason: String(err) });
      });
    });

    await page.goto('/');

    const consentCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(consentCheckbox).toBeVisible({ timeout: 15_000 });
    await consentCheckbox.check({ force: true });

    const startBtn = page.getByRole('button', {
      name: /start voice demo with reyna/i,
    });
    await expect(startBtn).toBeVisible({ timeout: 15_000 });
    await startBtn.click({ force: true });

    await page.waitForTimeout(10_000);

    const sampleRates = await page.evaluate(
      () => (window as any).__reynaAudioSampleRates as number[],
    );
    const wsCloses = await page.evaluate(
      () => (window as any).__reynaWsCloses as Array<{
        url: string;
        code: number;
        reason: string;
        wasClean: boolean;
      }>,
    );

    const isGeminiWs = (url: string | undefined) =>
      !!url && url.includes('generativelanguage');

    const geminiOpened = wsEvents.some((e) => e.type === 'open' && isGeminiWs(e.url));
    const geminiClosed = wsEvents.some((e) => e.type === 'close' && isGeminiWs(e.url));
    const framesReceived = wsEvents.filter(
      (e) => e.type === 'framereceived' && isGeminiWs(e.url),
    ).length;
    const framesSent = wsEvents.filter(
      (e) => e.type === 'framesent' && isGeminiWs(e.url),
    ).length;

    const geminiFrames = wsEvents
      .filter((e) => e.type === 'framereceived' && isGeminiWs(e.url))
      .map((e) => e.reason)
      .slice(0, 5);

    const geminiCloses = wsCloses.filter((c) => c.url.includes('generativelanguage'));

    const diagnostic = [
      `sampleRates: ${JSON.stringify(sampleRates)}`,
      `geminiOpened: ${geminiOpened}`,
      `geminiClosed: ${geminiClosed}`,
      `framesReceived: ${framesReceived}`,
      `framesSent: ${framesSent}`,
      `totalWsEvents: ${wsEvents.length}`,
      '--- ws close codes ---',
      ...geminiCloses.map((c) =>
        `code=${c.code} clean=${c.wasClean} reason="${c.reason}"`,
      ),
      '--- first gemini frames ---',
      ...geminiFrames,
      '--- console tail ---',
      ...consoleLogs.slice(-40),
    ].join('\n');

    console.log(diagnostic);

    expect(geminiOpened, `Gemini WebSocket should open\n${diagnostic}`).toBe(true);

    expect(
      sampleRates.includes(16000),
      `Input AudioContext should be 16000Hz (Bug 1 fix)\n${diagnostic}`,
    ).toBe(true);

    expect(
      geminiClosed,
      `Gemini WebSocket should NOT close within 10s (code 1000 bug)\n${diagnostic}`,
    ).toBe(false);

    expect(framesReceived, `should receive frames from Gemini\n${diagnostic}`).toBeGreaterThan(0);
    expect(framesSent, `should send frames to Gemini\n${diagnostic}`).toBeGreaterThan(0);
  });
});
