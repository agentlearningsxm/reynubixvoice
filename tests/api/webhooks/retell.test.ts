import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyRetellSignature } from '../../../api/webhooks/retell.js';

const FAKE_KEY = 'test-api-key-123';

function makeSignature(body: string, key: string): string {
  return crypto.createHmac('sha256', key).update(body).digest('hex');
}

describe('verifyRetellSignature', () => {
  it('returns true for valid signature', () => {
    const body = '{"event":"call_analyzed"}';
    const sig = makeSignature(body, FAKE_KEY);
    expect(verifyRetellSignature(body, sig, FAKE_KEY)).toBe(true);
  });

  it('returns false for invalid signature', () => {
    const body = '{"event":"call_analyzed"}';
    expect(verifyRetellSignature(body, 'not-a-valid-sig', FAKE_KEY)).toBe(
      false,
    );
  });

  it('returns false when key is missing', () => {
    const body = '{"event":"call_analyzed"}';
    const sig = makeSignature(body, FAKE_KEY);
    expect(verifyRetellSignature(body, sig, '')).toBe(false);
  });

  it('returns false for empty signature without throwing', () => {
    expect(verifyRetellSignature('body', '', FAKE_KEY)).toBe(false);
  });
});
