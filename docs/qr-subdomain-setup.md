# QR Subdomain Setup

This project now supports dynamic QR redirects through:

- `GET /r/{qrId}` -> rewritten to `api/r/[qrId].ts`
- `GET/POST /api/qr/configs`
- `GET/PUT/PATCH /api/qr/configs/{qrId}`

## Vercel Domain

1. In Vercel project settings, add the custom domain `qr.reynubixvoice.com`.
2. Point DNS with a CNAME from `qr` to Vercel (`cname.vercel-dns.com`).
3. Keep this repo deployed as the same project (rewrites already route `/r/*` and app paths).

## Environment Variables

Set these in Vercel:

- `QR_DEFAULT_REDIRECT_URL` (fallback when QR id is missing/disabled)
- `QR_CONFIG_WRITE_TOKEN` (required in production for config writes)
- `QR_ALLOW_UNAUTHENTICATED_WRITES` (keep `false` in production)
- `QR_ROUTE_SEED_JSON` (optional bootstrapped route map)
- `QR_ROUTE_SEED_FILE` (optional file path for seed JSON)
- `QR_ALLOWED_DESTINATION_HOSTS` (optional comma list allowlist, e.g. `reynubixvoice.com,booking.reynubixvoice.com`)
- `QR_BLOCK_PRIVATE_HOSTS` (default `true`, blocks localhost/private network targets)
- `SUPABASE_URL` (optional durable storage)
- `SUPABASE_SERVICE_ROLE_KEY` (optional durable storage)
- `QR_SUPABASE_TABLE` (optional, default `qr_routes`)

Notes:
- Write APIs are rate-limited and require `x-qr-admin-token` when token is configured.
- In production, writes are disabled if `QR_CONFIG_WRITE_TOKEN` is missing (unless explicitly overridden).
- Example seed file: `config/qr-routes.seed.example.json` (copy and customize, then set `QR_ROUTE_SEED_FILE`).

## Optional Supabase Table

If you want durable routing in Supabase, create table `qr_routes`:

```sql
create table if not exists public.qr_routes (
  id text primary key,
  name text not null default '',
  destination text not null,
  enabled boolean not null default true,
  redirect_type text not null default 'single',
  fallback_url text,
  open_in_new_tab boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists qr_routes_updated_at_idx on public.qr_routes(updated_at desc);
```

If using service role key in API routes, do not expose it to the browser.

Repository migration added:
- `supabase/migrations/202602200002_qr_routes.sql`
