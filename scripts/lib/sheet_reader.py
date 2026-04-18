"""Google Sheets reader for CRM migration data.

Reads call analytics data from the 'reyna web' sheet containing
voice session analytics and maps them to structured Python dicts.
"""

import os
from typing import Optional

from google.oauth2 import credentials as oauth2_credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from .logger import get_logger

logger = get_logger(__name__)

COLUMN_KEYS = [
    "date",
    "time",
    "duration_sec",
    "language",
    "full_transcript",
    "ai_summary",
    "sentiment",
    "calculator_used",
    "revenue_entered",
    "missed_calls",
    "booking_requested",
    "error_log",
    "recording_url",
    "session_id",
    "call_quality_score",
    "errors_detected",
    "prompt_fix_recommendations",
    "failure_source",
    "call_outcome",
]

# Map sheet columns to validator-expected names
COLUMN_MAP = {
    "date": "call_date",
    "time": "call_time",
}

ALLOWED_SENTIMENTS = {"positive", "neutral", "negative", "frustrated"}
ALLOWED_FAILURE_SOURCES = {
    "greeting",
    "qualification",
    "calculator",
    "booking",
    "transfer",
    "closing",
    "none",
}
ALLOWED_CALL_OUTCOMES = {
    "qualified-lead",
    "information-only",
    "dropped",
    "error",
    "booking-made",
}

YES_VALUES = {"yes", "true"}


class SheetReader:
    """Read and parse call analytics data from a Google Sheet."""

    def __init__(
        self,
        sheet_id: str,
        sheet_name: str = "reyna web",
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        refresh_token: Optional[str] = None,
    ) -> None:
        """Initialize the SheetReader with credentials and sheet metadata.

        Args:
            sheet_id: The Google Sheets spreadsheet ID.
            sheet_name: The tab/sheet name within the spreadsheet.
            client_id: Google OAuth2 client ID. Falls back to env var.
            client_secret: Google OAuth2 client secret. Falls back to env var.
            refresh_token: Google OAuth2 refresh token. Falls back to env var.
        """
        self.sheet_id = sheet_id
        self.sheet_name = sheet_name

        self.client_id = client_id or os.environ.get("GOOGLE_CLIENT_ID")
        self.client_secret = client_secret or os.environ.get("GOOGLE_CLIENT_SECRET")
        self.refresh_token = refresh_token or os.environ.get("GOOGLE_REFRESH_TOKEN")

        self._service = self._build_service()

    def _build_service(self):
        """Build the Google Sheets API service client.

        Attempts OAuth2 with refresh token first, falls back to API key.

        Returns:
            googleapiclient.discovery.Resource: Sheets API service.

        Raises:
            PermissionError: If authentication cannot be established.
        """
        logger.info("Building Google Sheets API service")

        # Try OAuth2 with refresh token first
        if self.client_id and self.client_secret and self.refresh_token:
            try:
                creds = oauth2_credentials.Credentials(
                    token=None,
                    refresh_token=self.refresh_token,
                    token_uri="https://oauth2.googleapis.com/token",
                    client_id=self.client_id,
                    client_secret=self.client_secret,
                )
                # Force a token refresh to validate credentials immediately
                creds.refresh(Request())
                logger.info("Authenticated via OAuth2 refresh token")
                return build("sheets", "v4", credentials=creds)
            except Exception as e:
                logger.warning("OAuth2 authentication failed: %s", e)
                logger.info("Falling back to API key authentication")

        # Fall back to API key
        api_key = os.environ.get("GOOGLE_API_KEY")
        if api_key:
            logger.info("Using API key authentication")
            return build("sheets", "v4", developerKey=api_key)

        logger.error("No credentials available (OAuth2 or API key)")
        raise PermissionError(
            "Google Sheets authentication failed: no credentials configured"
        )

    def _clean_value(self, key: str, value: Optional[str]) -> Optional[object]:
        """Clean and cast a single cell value based on its column key.

        Args:
            key: The snake_case column key.
            value: The raw string value from the sheet (or None).

        Returns:
            The cleaned and typed value, or None if empty/invalid.
        """
        if value is None or str(value).strip() == "":
            return None

        val = str(value).strip()

        if key in ("calculator_used", "booking_requested"):
            return val.lower() in YES_VALUES

        if key == "duration_sec":
            try:
                return int(float(val))
            except (ValueError, TypeError):
                return None

        if key == "call_quality_score":
            try:
                return int(float(val))
            except (ValueError, TypeError):
                return None

        if key == "date":
            # Normalize DD/MM/YYYY or MM-DD-YYYY to YYYY-MM-DD
            for fmt in ("%d/%m/%Y", "%m-%d-%Y", "%Y-%m-%d"):
                try:
                    from datetime import datetime

                    return datetime.strptime(val, fmt).strftime("%Y-%m-%d")
                except ValueError:
                    continue
            return val  # Return raw if no format matches

        if key == "sentiment":
            normalized = val.lower()
            return normalized if normalized in ALLOWED_SENTIMENTS else None

        if key == "failure_source":
            normalized = val.lower()
            return normalized if normalized in ALLOWED_FAILURE_SOURCES else None

        if key == "call_outcome":
            normalized = val.lower()
            return normalized if normalized in ALLOWED_CALL_OUTCOMES else None

        return val

    def get_all_rows(self) -> list[dict]:
        """Fetch all data rows from the sheet as a list of dicts.

        Skips the header row (row 1). Maps columns to snake_case keys.
        Handles sheets with fewer or more columns than expected.

        Returns:
            List of dicts with column names as keys. Empty list if sheet
            has no data rows.

        Raises:
            ValueError: If the specified sheet is not found.
            ConnectionError: If the Google Sheets API returns an error.
            PermissionError: If authentication fails.
        """
        range_name = f"{self.sheet_name}!A:Z"
        logger.info(
            "Fetching all rows from '%s' range '%s'", self.sheet_name, range_name
        )

        try:
            result = (
                self._service.spreadsheets()
                .values()
                .get(spreadsheetId=self.sheet_id, range=range_name)
                .execute()
            )
        except HttpError as e:
            if e.resp.status == 404:
                logger.error(
                    "Sheet '%s' not found in spreadsheet %s",
                    self.sheet_name,
                    self.sheet_id,
                )
                raise ValueError(
                    f"Sheet '{self.sheet_name}' not found in spreadsheet {self.sheet_id}"
                ) from e
            if e.resp.status in (401, 403):
                logger.error("Authentication failed for spreadsheet %s", self.sheet_id)
                raise PermissionError(
                    f"Google Sheets authentication failed: {e}"
                ) from e
            logger.error("Google Sheets API error: %s", e)
            raise ConnectionError(f"Google Sheets API error: {e}") from e

        values = result.get("values", [])

        if len(values) <= 1:
            logger.warning("Sheet '%s' has no data rows", self.sheet_name)
            return []

        data_rows = values[1:]
        num_cols = len(COLUMN_KEYS)
        logger.info(
            "Processing %d data rows with %d expected columns", len(data_rows), num_cols
        )

        cleaned_rows = []
        for row in data_rows:
            row_dict = {}
            for i, key in enumerate(COLUMN_KEYS):
                raw_value = row[i] if i < len(row) else None
                row_dict[key] = self._clean_value(key, raw_value)
            # Apply column mapping for validator compatibility
            for src_key, dst_key in COLUMN_MAP.items():
                if src_key in row_dict:
                    row_dict[dst_key] = row_dict.pop(src_key)
            cleaned_rows.append(row_dict)

        logger.info("Successfully cleaned %d rows", len(cleaned_rows))
        return cleaned_rows

    def get_row_count(self) -> int:
        """Return the number of data rows in the sheet (excluding header).

        Returns:
            Integer count of data rows. 0 if sheet is empty or inaccessible.
        """
        range_name = f"{self.sheet_name}!A:A"
        logger.info("Counting rows in '%s'", self.sheet_name)

        try:
            result = (
                self._service.spreadsheets()
                .values()
                .get(spreadsheetId=self.sheet_id, range=range_name)
                .execute()
            )
        except HttpError as e:
            logger.error("Failed to count rows: %s", e)
            return 0

        values = result.get("values", [])
        count = max(0, len(values) - 1)
        logger.info("Row count (excluding header): %d", count)
        return count

    def validate_sheet_accessible(self) -> bool:
        """Check if the Google Sheet is accessible with current credentials.

        Returns:
            True if the sheet can be accessed, False otherwise.
            Logs the error if access fails.
        """
        logger.info("Validating sheet accessibility for '%s'", self.sheet_name)

        try:
            result = (
                self._service.spreadsheets()
                .values()
                .get(spreadsheetId=self.sheet_id, range=f"{self.sheet_name}!A1:A1")
                .execute()
            )
            accessible = "values" in result or "range" in result
            if accessible:
                logger.info("Sheet '%s' is accessible", self.sheet_name)
            else:
                logger.warning(
                    "Sheet '%s' returned unexpected response", self.sheet_name
                )
            return accessible
        except HttpError as e:
            logger.error("Sheet '%s' is not accessible: %s", self.sheet_name, e)
            return False
        except Exception as e:
            logger.error("Unexpected error validating sheet access: %s", e)
            return False
