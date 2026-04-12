"""CRM migration configuration — env loading, client init, typed config."""

import os
from dataclasses import dataclass
from pathlib import Path

import groq
from dotenv import load_dotenv
from postgrest import SyncPostgrestClient

# Resolve .env.local in the parent directory (reynubixvoice-landing-page/)
_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env.local"
load_dotenv(dotenv_path=_ENV_PATH, override=True)


def _require_env(key: str) -> str:
    """Return env var value or raise RuntimeError if missing."""
    value = os.getenv(key)
    if value is None:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return value


@dataclass(frozen=True)
class Config:
    """Immutable configuration container for the CRM migration system."""

    supabase_url: str
    supabase_service_role_key: str
    groq_api_key: str
    google_client_id: str
    google_client_secret: str
    google_refresh_token: str
    google_sheet_id: str
    google_sheet_name: str
    groq_model: str


# ── Load required env vars ──────────────────────────────────────────

_SUPABASE_URL = _require_env("SUPABASE_URL")
_SUPABASE_SERVICE_ROLE_KEY = _require_env("SUPABASE_SERVICE_ROLE_KEY")
_GROQ_API_KEY = _require_env("GROQ_API_KEY")
_GOOGLE_CLIENT_ID = _require_env("GOOGLE_CLIENT_ID")
_GOOGLE_CLIENT_SECRET = _require_env("GOOGLE_CLIENT_SECRET")
_GOOGLE_REFRESH_TOKEN = _require_env("GOOGLE_REFRESH_TOKEN")
_GOOGLE_SHEET_ID = _require_env("GOOGLE_SHEET_ID")

# ── Load optional env vars with defaults ────────────────────────────

_GOOGLE_SHEET_NAME = os.getenv("GOOGLE_SHEET_NAME", "reyna web")
_GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# ── Log loaded vars (mask secrets) ──────────────────────────────────


def _mask(value: str) -> str:
    if len(value) <= 8:
        return "****"
    return value[:4] + "****" + value[-4:]


print("[config] Loaded environment:")
print(f"  SUPABASE_URL              = {_mask(_SUPABASE_URL)}")
print(f"  SUPABASE_SERVICE_ROLE_KEY = {_mask(_SUPABASE_SERVICE_ROLE_KEY)}")
print(f"  GROQ_API_KEY              = {_mask(_GROQ_API_KEY)}")
print(f"  GOOGLE_CLIENT_ID          = {_mask(_GOOGLE_CLIENT_ID)}")
print(f"  GOOGLE_CLIENT_SECRET      = {_mask(_GOOGLE_CLIENT_SECRET)}")
print(f"  GOOGLE_REFRESH_TOKEN      = {_mask(_GOOGLE_REFRESH_TOKEN)}")
print(f"  GOOGLE_SHEET_ID           = {_mask(_GOOGLE_SHEET_ID)}")
print(f"  GOOGLE_SHEET_NAME         = {_GOOGLE_SHEET_NAME}")
print(f"  GROQ_MODEL                = {_GROQ_MODEL}")

# ── Build typed config ──────────────────────────────────────────────

config = Config(
    supabase_url=_SUPABASE_URL,
    supabase_service_role_key=_SUPABASE_SERVICE_ROLE_KEY,
    groq_api_key=_GROQ_API_KEY,
    google_client_id=_GOOGLE_CLIENT_ID,
    google_client_secret=_GOOGLE_CLIENT_SECRET,
    google_refresh_token=_GOOGLE_REFRESH_TOKEN,
    google_sheet_id=_GOOGLE_SHEET_ID,
    google_sheet_name=_GOOGLE_SHEET_NAME,
    groq_model=_GROQ_MODEL,
)

# ── Initialize clients ──────────────────────────────────────────────
# Note: We use postgrest directly because the supabase meta-package
# requires storage3 → pyiceberg which needs MSVC++ build tools on Windows.


def _build_supabase_client():
    """Build a Supabase-compatible client using postgrest directly.

    Returns a simple wrapper that mimics the supabase-py Client interface
    for table operations with service role key authentication.
    """
    import httpx

    base_url = config.supabase_url.rstrip("/")
    headers = {
        "apikey": config.supabase_service_role_key,
        "Authorization": f"Bearer {config.supabase_service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    class SupabaseTableClient:
        """Minimal Supabase client using postgrest directly."""

        def __init__(self, base_url: str, headers: dict):
            self._base_url = base_url
            self._headers = headers
            self._http = httpx.Client(
                base_url=f"{base_url}/rest/v1", headers=headers, timeout=30.0
            )

        def table(self, table_name: str):
            """Return a Postgrest query builder for the given table."""
            return SyncPostgrestClient(
                f"{self._base_url}/rest/v1",
                headers=self._headers,
                schema="public",
            ).table(table_name)

        def close(self):
            """Close the underlying HTTP client."""
            pass

    return SupabaseTableClient(base_url, headers)


supabase_client = _build_supabase_client()
groq_client = groq.Groq(api_key=config.groq_api_key)
