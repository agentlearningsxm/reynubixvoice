import {
  createPublicId,
  type EventIngestPayload,
  LEAD_STORAGE_KEY,
  readUtmParams,
  SESSION_STORAGE_KEY,
  type TrackingContextInput,
  VISITOR_STORAGE_KEY,
} from './shared';

interface JsonRequestOptions {
  keepalive?: boolean;
}

function canUseDom() {
  return typeof window !== 'undefined';
}

function getStoredId(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) {
    return existing;
  }

  const id = createPublicId(
    key.includes('visitor')
      ? 'visitor'
      : key.includes('lead')
        ? 'lead'
        : 'session',
  );
  storage.setItem(key, id);
  return id;
}

export function getTrackingContext(
  overrides: Partial<TrackingContextInput> = {},
): TrackingContextInput {
  if (!canUseDom()) {
    return overrides;
  }

  const url = new URL(window.location.href);
  const visitorId = getStoredId(window.localStorage, VISITOR_STORAGE_KEY);
  const sessionId = getStoredId(window.sessionStorage, SESSION_STORAGE_KEY);
  const leadId = window.localStorage.getItem(LEAD_STORAGE_KEY);

  return {
    visitorId,
    sessionId,
    leadId,
    pagePath: overrides.pagePath ?? `${url.pathname}${url.search}${url.hash}`,
    pageTitle: overrides.pageTitle ?? document.title,
    referrer: overrides.referrer ?? (document.referrer || null),
    timezone:
      overrides.timezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone ??
      'UTC',
    language: overrides.language ?? navigator.language,
    utm: {
      ...readUtmParams(url),
      ...(overrides.utm ?? {}),
    },
  };
}

export function persistLeadId(leadId: string | null | undefined) {
  if (!canUseDom() || !leadId) {
    return;
  }

  window.localStorage.setItem(LEAD_STORAGE_KEY, leadId);
}

async function postJson<TResponse = void>(
  url: string,
  body: unknown,
  options: JsonRequestOptions = {},
) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: options.keepalive,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export async function trackEvent(
  eventName: string,
  properties: Record<string, unknown> = {},
  overrides: Partial<TrackingContextInput> = {},
) {
  if (!canUseDom()) {
    return;
  }

  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isDev) return;

  const payload: EventIngestPayload = {
    eventName,
    properties,
    occurredAt: new Date().toISOString(),
    context: getTrackingContext(overrides),
  };

  try {
    await postJson('/api/events', payload, { keepalive: true });
  } catch (error) {
    console.warn('Telemetry event failed', error);
  }
}

export function trackEventFireAndForget(
  eventName: string,
  properties: Record<string, unknown> = {},
  overrides: Partial<TrackingContextInput> = {},
) {
  void trackEvent(eventName, properties, overrides);
}

export function postJsonWithContext<TResponse>(
  url: string,
  body: Record<string, unknown>,
  overrides: Partial<TrackingContextInput> = {},
) {
  return postJson<TResponse>(url, {
    ...body,
    context: getTrackingContext(overrides),
  });
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error('Failed to read blob'));
    reader.onloadend = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}
