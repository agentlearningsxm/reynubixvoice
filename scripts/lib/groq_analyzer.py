"""Groq AI analyzer for voice call session data."""

from __future__ import annotations

import json
import re
import time
from typing import Any

import groq

from lib.logger import get_logger

logger = get_logger(__name__)

FALLBACK_MODELS = [
    "openai/gpt-oss-120b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]

PROMPT_TEMPLATE = """\
You are a CRM data analyst. Analyze this voice call session and return structured JSON.

SESSION DATA:
- Session ID: {session_id}
- Duration: {duration_sec} seconds
- Language: {language}
- Transcript: {full_transcript}
- Existing AI Summary: {ai_summary}
- Existing Sentiment: {sentiment}
- Calculator Used: {calculator_used}
- Revenue Entered: {revenue_entered}
- Booking Requested: {booking_requested}
- Error Log: {error_log}
- Existing Quality Score: {call_quality_score}/10
- Existing Outcome: {call_outcome}

Return ONLY valid JSON with this exact structure:
{{
  "validated_sentiment": "positive|neutral|negative|frustrated",
  "validated_outcome": "qualified-lead|information-only|dropped|error|booking-made",
  "validated_failure_source": "greeting|qualification|calculator|booking|transfer|closing|none",
  "validated_quality_score": 8,
  "lead_extraction": {{
    "name": "extracted name or null",
    "company": "extracted company or null",
    "phone": "extracted phone or null",
    "email": "extracted email or null"
  }},
  "is_qualified_lead": true,
  "qualification_reasoning": "brief reason",
  "recommended_tasks": [
    {{
      "title": "Task title",
      "priority": "low|medium|high|urgent",
      "due_days_from_now": 3,
      "description": "Task description"
    }}
  ],
  "ai_summary_enriched": "enhanced summary of the call, max 200 chars"
}}

Do NOT include any text before or after the JSON. Return ONLY the JSON object.
"""

VALID_SENTIMENTS = {"positive", "neutral", "negative", "frustrated"}
VALID_OUTCOMES = {
    "qualified-lead",
    "information-only",
    "dropped",
    "error",
    "booking-made",
}
VALID_FAILURE_SOURCES = {
    "greeting",
    "qualification",
    "calculator",
    "booking",
    "transfer",
    "closing",
    "none",
}
VALID_PRIORITIES = {"low", "medium", "high", "urgent"}


def _build_fallback(row: dict[str, Any]) -> dict[str, Any]:
    """Return a safe fallback dict when Groq analysis is unavailable.

    Args:
        row: Original session row data.

    Returns:
        Fallback analysis dict preserving original values.
    """
    return {
        "validated_sentiment": row.get("sentiment") or "neutral",
        "validated_outcome": row.get("call_outcome") or "information-only",
        "validated_failure_source": row.get("failure_source") or "none",
        "validated_quality_score": row.get("call_quality_score") or 5,
        "lead_extraction": {
            "name": None,
            "company": None,
            "phone": None,
            "email": None,
        },
        "is_qualified_lead": False,
        "qualification_reasoning": "Groq analysis unavailable",
        "recommended_tasks": [],
        "ai_summary_enriched": row.get("ai_summary") or "",
    }


def _extract_json_from_text(text: str) -> dict[str, Any] | None:
    """Attempt to extract a JSON object from arbitrary response text.

    Tries multiple strategies:
    1. Parse the entire string as JSON.
    2. Find the first ``{`` and last ``}`` and parse that slice.
    3. Search for a JSON block inside triple-backtick code fences.

    Args:
        text: Raw response text that may contain JSON.

    Returns:
        Parsed dict or None if extraction fails.
    """
    text = text.strip()

    # Strategy 1: direct parse
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        pass

    # Strategy 2: find outermost braces
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        try:
            return json.loads(text[first : last + 1])
        except (json.JSONDecodeError, ValueError):
            pass

    # Strategy 3: markdown code fence
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except (json.JSONDecodeError, ValueError):
            pass

    return None


def _validate_and_coerce(result: dict[str, Any], row: dict[str, Any]) -> dict[str, Any]:
    """Validate required fields and coerce to safe defaults when missing.

    Args:
        result: Parsed JSON from Groq (may be incomplete).
        row: Original session row for fallback values.

    Returns:
        Validated and complete analysis dict.
    """
    fallback = _build_fallback(row)

    # Sentiment
    sentiment = result.get("validated_sentiment")
    if sentiment not in VALID_SENTIMENTS:
        logger.warning("Invalid sentiment '%s', using fallback", sentiment)
        result["validated_sentiment"] = fallback["validated_sentiment"]

    # Outcome
    outcome = result.get("validated_outcome")
    if outcome not in VALID_OUTCOMES:
        logger.warning("Invalid outcome '%s', using fallback", outcome)
        result["validated_outcome"] = fallback["validated_outcome"]

    # Failure source
    fs = result.get("validated_failure_source")
    if fs not in VALID_FAILURE_SOURCES:
        logger.warning("Invalid failure_source '%s', using fallback", fs)
        result["validated_failure_source"] = fallback["validated_failure_source"]

    # Quality score
    qs = result.get("validated_quality_score")
    if not isinstance(qs, (int, float)) or qs < 1 or qs > 10:
        logger.warning("Invalid quality_score '%s', using fallback", qs)
        result["validated_quality_score"] = fallback["validated_quality_score"]

    # Lead extraction
    lead = result.get("lead_extraction")
    if not isinstance(lead, dict):
        logger.warning("lead_extraction is not a dict, using fallback")
        result["lead_extraction"] = fallback["lead_extraction"]
    else:
        for key in ("name", "company", "phone", "email"):
            if key not in lead:
                lead[key] = None

    # is_qualified_lead
    if not isinstance(result.get("is_qualified_lead"), bool):
        logger.warning("is_qualified_lead is not a bool, defaulting to False")
        result["is_qualified_lead"] = False

    # qualification_reasoning
    if not isinstance(result.get("qualification_reasoning"), str):
        result["qualification_reasoning"] = fallback["qualification_reasoning"]

    # recommended_tasks
    tasks = result.get("recommended_tasks")
    if not isinstance(tasks, list):
        logger.warning("recommended_tasks is not a list, using empty list")
        result["recommended_tasks"] = []
    else:
        validated_tasks: list[dict[str, Any]] = []
        for task in tasks[:3]:  # max 3
            if not isinstance(task, dict):
                continue
            validated_tasks.append(
                {
                    "title": task.get("title", "Follow up"),
                    "priority": task.get("priority", "medium")
                    if task.get("priority") in VALID_PRIORITIES
                    else "medium",
                    "due_days_from_now": task.get("due_days_from_now", 3)
                    if isinstance(task.get("due_days_from_now"), int)
                    else 3,
                    "description": task.get("description", ""),
                }
            )
        result["recommended_tasks"] = validated_tasks

    # ai_summary_enriched
    summary = result.get("ai_summary_enriched")
    if not isinstance(summary, str):
        result["ai_summary_enriched"] = fallback["ai_summary_enriched"]
    elif len(summary) > 200:
        result["ai_summary_enriched"] = summary[:197] + "..."

    return result


class GroqAnalyzer:
    """Analyzes voice call sessions using Groq AI chat completions.

    Provides structured lead extraction, sentiment validation, task
    recommendations, and quality scoring for CRM migration purposes.
    """

    def __init__(self, api_key: str, model: str = "openai/gpt-oss-120b") -> None:
        """Initialize the Groq client.

        Args:
            api_key: Groq API key for authentication.
            model: Model identifier to use for completions.
        """
        self._client = groq.Groq(api_key=api_key)
        self._model = model
        logger.info("GroqAnalyzer initialized with model=%s", model)

    def _call_groq(self, prompt: str, model: str, max_retries: int = 2) -> str:
        """Call the Groq chat completions API with retry logic.

        Retries on rate-limit (429) errors with exponential backoff.

        Args:
            prompt: The full prompt text to send.
            model: Model to query.
            max_retries: Number of retries on transient errors.

        Returns:
            Raw response text from the model.

        Raises:
            groq.RateLimitError: After exhausting retries on 429.
            groq.APIError: On non-retryable API errors.
        """
        last_error: Exception | None = None

        for attempt in range(max_retries + 1):
            try:
                response = self._client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_tokens=1024,
                    timeout=30,
                )
                content = response.choices[0].message.content
                if content is None:
                    raise groq.APIError("Groq returned empty content")
                return content

            except groq.RateLimitError as exc:
                last_error = exc
                if attempt < max_retries:
                    delay = 2**attempt  # 1s, 2s
                    logger.warning(
                        "Rate limited (attempt %d/%d), retrying in %ds",
                        attempt + 1,
                        max_retries,
                        delay,
                    )
                    time.sleep(delay)
                else:
                    logger.error("Rate limit exhausted after %d retries", max_retries)
                    raise

            except groq.APIError as exc:
                # Non-retryable errors (bad request, auth, etc.)
                logger.error("Groq API error (non-retryable): %s", exc)
                raise

            except Exception as exc:
                last_error = exc
                logger.error(
                    "Unexpected error calling Groq (attempt %d): %s", attempt + 1, exc
                )
                if attempt < max_retries:
                    delay = 2**attempt
                    time.sleep(delay)
                else:
                    raise

        # Should not reach here, but satisfy type checker
        raise last_error  # type: ignore[misc]

    def _try_models(self, prompt: str) -> str:
        """Attempt the prompt against fallback models if the primary fails.

        Iterates through FALLBACK_MODELS, returning the first successful
        response.

        Args:
            prompt: The prompt to send.

        Returns:
            Response text from the first successful model.

        Raises:
            Exception: If all models fail.
        """
        models = [self._model] + [m for m in FALLBACK_MODELS if m != self._model]

        for model in models:
            try:
                logger.info("Trying model: %s", model)
                return self._call_groq(prompt, model)
            except Exception as exc:
                logger.warning("Model %s failed: %s", model, exc)
                continue

        raise RuntimeError("All Groq models failed")

    def analyze_session(self, row: dict[str, Any]) -> dict[str, Any]:
        """Analyze a single voice call session row.

        Sends session data to Groq AI, parses the structured JSON
        response, validates fields, and merges with the original row.

        Args:
            row: Session row dict from SheetReader. Expected keys include
                 session_id, full_transcript, ai_summary, sentiment,
                 calculator_used, revenue_entered, missed_calls,
                 booking_requested, error_log, call_quality_score,
                 errors_detected, prompt_fix_recommendations,
                 failure_source, call_outcome, duration_sec, language.

        Returns:
            Enriched analysis dict containing validated fields, lead
            extraction, qualification status, recommended tasks, and
            an enriched summary. On failure, returns a fallback dict
            preserving original row values.
        """
        session_id = row.get("session_id", "unknown")
        start = time.monotonic()
        logger.info("Analyzing session: %s", session_id)

        prompt = PROMPT_TEMPLATE.format(
            session_id=row.get("session_id", ""),
            duration_sec=row.get("duration_sec", ""),
            language=row.get("language", ""),
            full_transcript=row.get("full_transcript", ""),
            ai_summary=row.get("ai_summary", ""),
            sentiment=row.get("sentiment", ""),
            calculator_used=row.get("calculator_used", ""),
            revenue_entered=row.get("revenue_entered", ""),
            booking_requested=row.get("booking_requested", ""),
            error_log=row.get("error_log", ""),
            call_quality_score=row.get("call_quality_score", ""),
            call_outcome=row.get("call_outcome", ""),
        )

        try:
            raw_response = self._try_models(prompt)
            parsed = _extract_json_from_text(raw_response)

            if parsed is None:
                logger.error(
                    "Failed to extract JSON from Groq response for session %s",
                    session_id,
                )
                result = _build_fallback(row)
            else:
                result = _validate_and_coerce(parsed, row)

            elapsed = time.monotonic() - start
            logger.info(
                "Session %s analyzed in %.2fs — sentiment=%s, outcome=%s, qualified=%s",
                session_id,
                elapsed,
                result.get("validated_sentiment"),
                result.get("validated_outcome"),
                result.get("is_qualified_lead"),
            )

            # Merge with original row for traceability
            result["_session_id"] = session_id
            result["_analysis_time_sec"] = round(elapsed, 3)
            return result

        except Exception as exc:
            elapsed = time.monotonic() - start
            logger.error(
                "Groq analysis failed for session %s after %.2fs: %s",
                session_id,
                elapsed,
                exc,
            )
            fallback = _build_fallback(row)
            fallback["_session_id"] = session_id
            fallback["_analysis_time_sec"] = round(elapsed, 3)
            fallback["_error"] = str(exc)
            return fallback
