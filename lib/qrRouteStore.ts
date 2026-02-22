import * as fs from 'fs';
import * as path from 'path';

type RedirectType = 'single' | 'smart' | 'conditional';
type RouteStoreSource = 'supabase' | 'memory';

export interface QrRouteRecord {
  id: string;
  name: string;
  destination: string;
  enabled: boolean;
  redirectType: RedirectType;
  fallbackUrl: string;
  openInNewTab: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QrRoutePayload {
  name?: string;
  destination?: string;
  enabled?: boolean;
  redirectType?: RedirectType;
  fallbackUrl?: string;
  openInNewTab?: boolean;
}

interface RouteStoreResult<T> {
  data: T;
  source: RouteStoreSource;
}

interface ResolveQrRedirectResult {
  found: boolean;
  enabled: boolean;
  target: string;
  source: RouteStoreSource;
  route: QrRouteRecord | null;
}

interface SupabaseQrRouteRow {
  id: string;
  name: string | null;
  destination: string;
  enabled: boolean | null;
  redirect_type: string | null;
  fallback_url: string | null;
  open_in_new_tab: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

type GlobalRouteStore = typeof globalThis & {
  __reynubixQrRouteStore?: Map<string, QrRouteRecord>;
  __reynubixQrRouteSeeded?: boolean;
};

const ROUTE_ID_REGEX = /^[a-zA-Z0-9_-]{3,120}$/;
const DEFAULT_REDIRECT_URL = normalizeHttpUrl(process.env.QR_DEFAULT_REDIRECT_URL) || 'https://reynubixvoice.com/';
const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();
const SUPABASE_TABLE = process.env.QR_SUPABASE_TABLE?.trim() || 'qr_routes';
const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_KEY);
const QR_SEED_FILE = process.env.QR_ROUTE_SEED_FILE?.trim() || '';
const BLOCK_PRIVATE_HOSTS = process.env.QR_BLOCK_PRIVATE_HOSTS !== 'false';
const ALLOWED_DESTINATION_HOSTS = parseAllowedHosts(process.env.QR_ALLOWED_DESTINATION_HOSTS);

const globalStore = globalThis as GlobalRouteStore;
const memoryRouteStore = globalStore.__reynubixQrRouteStore ?? new Map<string, QrRouteRecord>();
if (!globalStore.__reynubixQrRouteStore) globalStore.__reynubixQrRouteStore = memoryRouteStore;

if (!globalStore.__reynubixQrRouteSeeded) {
  seedMemoryStoreFromEnv();
  globalStore.__reynubixQrRouteSeeded = true;
}

let hasLoggedSupabaseFallback = false;

function normalizeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function parseAllowedHosts(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase().replace(/\.$/, ''))
    .filter(Boolean);
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '');
}

function isPrivateIpv4Host(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) return false;
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => octet < 0 || octet > 255)) return false;

  if (octets[0] === 10) return true;
  if (octets[0] === 127) return true;
  if (octets[0] === 192 && octets[1] === 168) return true;
  if (octets[0] === 169 && octets[1] === 254) return true;
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  return false;
}

function isPrivateIpv6Host(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === '::1') return true;
  if (host.startsWith('fc') || host.startsWith('fd')) return true;
  if (host.startsWith('fe80:')) return true;
  return false;
}

function isPrivateHostname(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (!host) return false;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.local')) return true;
  if (isPrivateIpv4Host(host)) return true;
  if (isPrivateIpv6Host(host)) return true;
  return false;
}

function isHostAllowed(hostname: string): boolean {
  if (!ALLOWED_DESTINATION_HOSTS.length) return true;
  const host = normalizeHostname(hostname);
  return ALLOWED_DESTINATION_HOSTS.some((allowed) => (
    host === allowed || host.endsWith(`.${allowed}`)
  ));
}

function assertSafeDestinationUrl(urlValue: string, fieldName: 'destination' | 'fallbackUrl'): void {
  let parsed: URL;
  try {
    parsed = new URL(urlValue);
  } catch {
    throw new Error(`${fieldName} must be a valid absolute http(s) URL.`);
  }

  if (BLOCK_PRIVATE_HOSTS && isPrivateHostname(parsed.hostname)) {
    throw new Error(`${fieldName} cannot target private or localhost hosts.`);
  }

  if (!isHostAllowed(parsed.hostname)) {
    throw new Error(`${fieldName} host is not allowed by QR_ALLOWED_DESTINATION_HOSTS.`);
  }
}

function normalizeRedirectType(value: unknown): RedirectType {
  return value === 'smart' || value === 'conditional' ? value : 'single';
}

function sanitizeRouteName(value: unknown, fallback: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return fallback;
  return normalized.slice(0, 120);
}

function toRouteRecord(row: SupabaseQrRouteRow): QrRouteRecord {
  const now = new Date().toISOString();
  let destination = normalizeHttpUrl(row.destination) || DEFAULT_REDIRECT_URL;
  let fallbackUrl = normalizeHttpUrl(row.fallback_url) || '';

  try {
    assertSafeDestinationUrl(destination, 'destination');
  } catch {
    destination = DEFAULT_REDIRECT_URL;
  }

  if (fallbackUrl) {
    try {
      assertSafeDestinationUrl(fallbackUrl, 'fallbackUrl');
    } catch {
      fallbackUrl = '';
    }
  }

  return {
    id: row.id,
    name: sanitizeRouteName(row.name, `QR ${row.id}`),
    destination,
    enabled: row.enabled !== false,
    redirectType: normalizeRedirectType(row.redirect_type),
    fallbackUrl,
    openInNewTab: row.open_in_new_tab === true,
    createdAt: row.created_at || now,
    updatedAt: row.updated_at || now
  };
}

function toSupabaseRow(route: QrRouteRecord): SupabaseQrRouteRow {
  return {
    id: route.id,
    name: route.name,
    destination: route.destination,
    enabled: route.enabled,
    redirect_type: route.redirectType,
    fallback_url: route.fallbackUrl || null,
    open_in_new_tab: route.openInNewTab,
    created_at: route.createdAt,
    updated_at: route.updatedAt
  };
}

function parseSeedEntries(raw: unknown): Array<{ id: string; payload: QrRoutePayload }> {
  const entries: Array<{ id: string; payload: QrRoutePayload }> = [];
  if (!raw) return entries;

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const id = sanitizeQrId(item?.id);
      if (!id || !item || typeof item !== 'object') continue;
      entries.push({ id, payload: item as QrRoutePayload });
    }
    return entries;
  }

  if (typeof raw === 'object') {
    for (const [id, value] of Object.entries(raw)) {
      const safeId = sanitizeQrId(id);
      if (!safeId) continue;
      if (typeof value === 'string') {
        entries.push({ id: safeId, payload: { destination: value } });
      } else if (value && typeof value === 'object') {
        entries.push({ id: safeId, payload: value as QrRoutePayload });
      }
    }
  }

  return entries;
}

function readSeedJsonFromFile(filePath: string): unknown | null {
  if (!filePath) return null;

  try {
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolved)) return null;
    const fileContents = fs.readFileSync(resolved, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.warn('[QR Route Store] Could not read QR_ROUTE_SEED_FILE.', error);
    return null;
  }
}

function seedMemoryStoreFromEnv(): void {
  const candidates: Array<{ id: string; payload: QrRoutePayload }> = [];

  const fileSeed = readSeedJsonFromFile(QR_SEED_FILE);
  candidates.push(...parseSeedEntries(fileSeed));

  const rawSeed = process.env.QR_ROUTE_SEED_JSON;
  if (rawSeed) {
    try {
      candidates.push(...parseSeedEntries(JSON.parse(rawSeed)));
    } catch {
      // Invalid QR_ROUTE_SEED_JSON should not crash API handlers.
    }
  }

  if (!candidates.length) return;

  for (const candidate of candidates) {
    try {
      const normalized = normalizeRoutePayload(candidate.id, candidate.payload);
      memoryRouteStore.set(candidate.id, normalized);
    } catch {
      continue;
    }
  }
}

function normalizeRoutePayload(id: string, payload: QrRoutePayload, existing?: QrRouteRecord): QrRouteRecord {
  const destination = normalizeHttpUrl(payload.destination ?? existing?.destination);
  if (!destination) {
    throw new Error('Destination must be a valid absolute http(s) URL.');
  }

  const fallbackCandidate = payload.fallbackUrl ?? existing?.fallbackUrl ?? '';
  const fallbackUrl = fallbackCandidate ? (normalizeHttpUrl(fallbackCandidate) || '') : '';
  assertSafeDestinationUrl(destination, 'destination');
  if (fallbackUrl) assertSafeDestinationUrl(fallbackUrl, 'fallbackUrl');
  const now = new Date().toISOString();

  return {
    id,
    name: sanitizeRouteName(payload.name, existing?.name || `QR ${id}`),
    destination,
    enabled: typeof payload.enabled === 'boolean' ? payload.enabled : existing?.enabled ?? true,
    redirectType: normalizeRedirectType(payload.redirectType ?? existing?.redirectType),
    fallbackUrl,
    openInNewTab: typeof payload.openInNewTab === 'boolean' ? payload.openInNewTab : existing?.openInNewTab ?? false,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isSupabaseConfigured(): boolean {
  return HAS_SUPABASE;
}

function logSupabaseFallback(error: unknown): void {
  if (hasLoggedSupabaseFallback) return;
  hasLoggedSupabaseFallback = true;
  console.warn('[QR Route Store] Falling back to in-memory storage.', error);
}

async function supabaseRequest(pathWithQuery: string, init: RequestInit = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase configuration is missing.');
  }

  const headers: HeadersInit = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...init.headers
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathWithQuery}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${body}`);
  }

  return response;
}

async function listRoutesFromSupabase(limit: number): Promise<QrRouteRecord[]> {
  const params = new URLSearchParams({
    select: 'id,name,destination,enabled,redirect_type,fallback_url,open_in_new_tab,created_at,updated_at',
    order: 'updated_at.desc',
    limit: String(limit)
  });

  const response = await supabaseRequest(`${SUPABASE_TABLE}?${params.toString()}`);
  const rows = (await response.json()) as SupabaseQrRouteRow[];
  return rows.map(toRouteRecord);
}

async function getRouteFromSupabase(id: string): Promise<QrRouteRecord | null> {
  const params = new URLSearchParams({
    select: 'id,name,destination,enabled,redirect_type,fallback_url,open_in_new_tab,created_at,updated_at',
    id: `eq.${id}`,
    limit: '1'
  });

  const response = await supabaseRequest(`${SUPABASE_TABLE}?${params.toString()}`);
  const rows = (await response.json()) as SupabaseQrRouteRow[];
  if (!rows.length) return null;
  return toRouteRecord(rows[0]);
}

async function upsertRouteToSupabase(route: QrRouteRecord): Promise<QrRouteRecord> {
  const params = new URLSearchParams({
    on_conflict: 'id',
    select: 'id,name,destination,enabled,redirect_type,fallback_url,open_in_new_tab,created_at,updated_at'
  });
  const payload = [toSupabaseRow(route)];

  const response = await supabaseRequest(`${SUPABASE_TABLE}?${params.toString()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(payload)
  });
  const rows = (await response.json()) as SupabaseQrRouteRow[];
  if (!rows.length) return route;
  return toRouteRecord(rows[0]);
}

function listRoutesFromMemory(limit: number): QrRouteRecord[] {
  return Array
    .from(memoryRouteStore.values())
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit);
}

export function sanitizeQrId(candidate: unknown): string | null {
  if (typeof candidate !== 'string') return null;
  const normalized = candidate.trim();
  if (!ROUTE_ID_REGEX.test(normalized)) return null;
  return normalized;
}

export function getDefaultRedirectUrl(): string {
  return DEFAULT_REDIRECT_URL;
}

export async function listQrRoutes(limitInput = 50): Promise<RouteStoreResult<QrRouteRecord[]>> {
  const limit = clamp(Number.isFinite(limitInput) ? Math.floor(limitInput) : 50, 1, 200);
  if (isSupabaseConfigured()) {
    try {
      return { data: await listRoutesFromSupabase(limit), source: 'supabase' };
    } catch (error) {
      logSupabaseFallback(error);
    }
  }
  return { data: listRoutesFromMemory(limit), source: 'memory' };
}

export async function getQrRoute(id: string): Promise<RouteStoreResult<QrRouteRecord | null>> {
  if (!isSupabaseConfigured()) {
    return { data: memoryRouteStore.get(id) || null, source: 'memory' };
  }

  try {
    return { data: await getRouteFromSupabase(id), source: 'supabase' };
  } catch (error) {
    logSupabaseFallback(error);
    return { data: memoryRouteStore.get(id) || null, source: 'memory' };
  }
}

export async function upsertQrRoute(id: string, payload: QrRoutePayload): Promise<RouteStoreResult<QrRouteRecord>> {
  const existing = memoryRouteStore.get(id);
  const normalized = normalizeRoutePayload(id, payload, existing);
  memoryRouteStore.set(id, normalized);

  if (!isSupabaseConfigured()) {
    return { data: normalized, source: 'memory' };
  }

  try {
    const persisted = await upsertRouteToSupabase(normalized);
    memoryRouteStore.set(id, persisted);
    return { data: persisted, source: 'supabase' };
  } catch (error) {
    logSupabaseFallback(error);
    return { data: normalized, source: 'memory' };
  }
}

export async function resolveQrRedirect(id: string): Promise<ResolveQrRedirectResult> {
  const routeResult = await getQrRoute(id);
  const route = routeResult.data;
  if (!route) {
    return {
      found: false,
      enabled: false,
      target: DEFAULT_REDIRECT_URL,
      source: routeResult.source,
      route: null
    };
  }

  if (!route.enabled) {
    return {
      found: true,
      enabled: false,
      target: route.fallbackUrl || DEFAULT_REDIRECT_URL,
      source: routeResult.source,
      route
    };
  }

  return {
    found: true,
    enabled: true,
    target: route.destination,
    source: routeResult.source,
    route
  };
}
