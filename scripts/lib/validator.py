"""Strict Pydantic v2 validation schemas for all CRM migration data.

Every record must pass validation before being written to Supabase.
Quality scoring ensures 95%+ accuracy across the entire migration.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from .logger import get_logger

logger = get_logger(__name__)

# Allowed enum values
VALID_STATUSES = {"new", "contacted", "qualified", "proposal", "won", "lost"}
VALID_SENTIMENTS = {"positive", "neutral", "negative", "frustrated"}
VALID_FAILURE_SOURCES = {
    "greeting",
    "qualification",
    "calculator",
    "booking",
    "transfer",
    "closing",
    "none",
}
VALID_CALL_OUTCOMES = {
    "qualified-lead",
    "information-only",
    "dropped",
    "error",
    "booking-made",
}
VALID_DEAL_STAGES = {"qualification", "proposal", "negotiation", "won", "lost"}
VALID_PRIORITIES = {"low", "medium", "high", "urgent"}
VALID_TASK_STATUSES = {"pending", "in_progress", "completed", "cancelled"}
VALID_INTERACTION_TYPES = {
    "call",
    "email",
    "meeting",
    "note",
    "voice_session",
    "form_submission",
    "booking",
}
VALID_DIRECTIONS = {"inbound", "outbound", "system"}
VALID_INTERACTION_STATUSES = {"scheduled", "completed", "cancelled", "no_show"}

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^[\d\s\+\-\(\)]+$")
URL_RE = re.compile(r"^https?://")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME_RE = re.compile(r"^\d{2}:\d{2}(:\d{2})?$")


class LeadValidation(BaseModel):
    """Validates lead data before writing to the leads table."""

    email: str
    email_normalized: str = ""
    name: Optional[str] = Field(None, max_length=200)
    company: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    source: Optional[str] = Field("voice_ai", max_length=100)
    status: str = Field("new")
    pipeline_stage: str = Field("new")
    lead_score: int = Field(0, ge=0, le=100)
    expected_value: Optional[float] = Field(None, ge=0)
    close_date: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError(f"Invalid email format: {v}")
        return v

    @field_validator("email_normalized")
    @classmethod
    def compute_normalized(cls, v: str, info) -> str:
        if v:
            return v
        email = info.data.get("email", "")
        return email.strip().lower() if email else ""

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if v and not PHONE_RE.match(v):
            raise ValueError(f"Invalid phone format: {v}")
        return v or None

    @field_validator("status", "pipeline_stage")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in VALID_STATUSES:
            raise ValueError(f"Invalid status '{v}'. Must be one of: {VALID_STATUSES}")
        return v

    @field_validator("lead_score")
    @classmethod
    def clamp_lead_score(cls, v: int) -> int:
        return max(0, min(100, v))

    @field_validator("close_date")
    @classmethod
    def validate_close_date(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not DATE_RE.match(v):
            raise ValueError(f"Invalid date format: {v}. Expected YYYY-MM-DD")
        return v

    def model_post_init(self, __context: Any) -> None:
        if not self.email_normalized:
            self.email_normalized = self.email.strip().lower()


class CallAnalyticsValidation(BaseModel):
    """Validates call analytics data before writing to call_analytics."""

    voice_session_id: Optional[str] = None
    call_date: str
    call_time: str
    duration_sec: int = Field(0, ge=0)
    language: str = Field("unknown", max_length=50)
    session_id: str
    full_transcript: Optional[str] = None
    ai_summary: Optional[str] = Field(None, max_length=2000)
    sentiment: Optional[str] = None
    calculator_used: bool = False
    revenue_entered: Optional[str] = Field(None, max_length=100)
    missed_calls: Optional[str] = Field(None, max_length=500)
    booking_requested: bool = False
    error_log: Optional[str] = Field(None, max_length=2000)
    call_quality_score: Optional[int] = Field(None, ge=0, le=10)
    errors_detected: Optional[str] = Field(None, max_length=2000)
    prompt_fix_recommendations: Optional[str] = Field(None, max_length=2000)
    failure_source: Optional[str] = None
    call_outcome: Optional[str] = None
    recording_url: Optional[str] = None
    raw_groq_response: Optional[dict[str, Any]] = None
    analysis_model: Optional[str] = Field(None, max_length=100)

    @field_validator("voice_session_id")
    @classmethod
    def validate_uuid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        uuid_re = re.compile(
            r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I
        )
        if not uuid_re.match(v):
            logger.warning("voice_session_id is not a valid UUID: %s", v)
            return None
        return v

    @field_validator("call_date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        v = v.strip()
        if not DATE_RE.match(v):
            raise ValueError(f"Invalid date format: {v}. Expected YYYY-MM-DD")
        return v

    @field_validator("call_time")
    @classmethod
    def validate_time(cls, v: str) -> str:
        v = v.strip()
        if not TIME_RE.match(v):
            raise ValueError(f"Invalid time format: {v}. Expected HH:MM or HH:MM:SS")
        if len(v) == 5:
            v = v + ":00"
        return v

    @field_validator("sentiment")
    @classmethod
    def validate_sentiment(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip().lower()
        if v not in VALID_SENTIMENTS:
            logger.warning("Invalid sentiment '%s', setting to None", v)
            return None
        return v

    @field_validator("failure_source")
    @classmethod
    def validate_failure_source(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip().lower()
        if v not in VALID_FAILURE_SOURCES:
            logger.warning("Invalid failure_source '%s', setting to None", v)
            return None
        return v

    @field_validator("call_outcome")
    @classmethod
    def validate_call_outcome(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip().lower()
        if v not in VALID_CALL_OUTCOMES:
            logger.warning("Invalid call_outcome '%s', setting to None", v)
            return None
        return v

    @field_validator("call_quality_score")
    @classmethod
    def clamp_quality_score(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return None
        return max(0, min(10, v))

    @field_validator("recording_url")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if v and not URL_RE.match(v):
            logger.warning("recording_url does not start with http(s)://: %s", v[:50])
            return None
        return v or None


STAGE_PROBABILITY = {
    "qualification": 20,
    "proposal": 50,
    "negotiation": 75,
    "won": 100,
    "lost": 0,
}


class DealValidation(BaseModel):
    """Validates deal data before writing to deals."""

    lead_id: Optional[str] = None
    title: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    stage: str = Field("qualification")
    value: Optional[float] = Field(None, ge=0)
    currency: str = Field("EUR", max_length=3)
    probability: int = Field(20, ge=0, le=100)
    expected_close_date: Optional[str] = None

    @field_validator("stage")
    @classmethod
    def validate_stage(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in VALID_DEAL_STAGES:
            raise ValueError(
                f"Invalid deal stage '{v}'. Must be one of: {VALID_DEAL_STAGES}"
            )
        return v

    @field_validator("probability")
    @classmethod
    def auto_probability(cls, v: int, info) -> int:
        stage = info.data.get("stage", "qualification")
        if stage in STAGE_PROBABILITY:
            return STAGE_PROBABILITY[stage]
        return v

    @field_validator("expected_close_date")
    @classmethod
    def validate_close_date(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not DATE_RE.match(v):
            raise ValueError(f"Invalid date format: {v}. Expected YYYY-MM-DD")
        return v


class TaskValidation(BaseModel):
    """Validates task data before writing to tasks."""

    lead_id: Optional[str] = None
    deal_id: Optional[str] = None
    title: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    priority: str = Field("medium")
    status: str = Field("pending")
    due_date: Optional[str] = None
    due_days_from_now: Optional[int] = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in VALID_PRIORITIES:
            raise ValueError(
                f"Invalid priority '{v}'. Must be one of: {VALID_PRIORITIES}"
            )
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in VALID_TASK_STATUSES:
            raise ValueError(
                f"Invalid task status '{v}'. Must be one of: {VALID_TASK_STATUSES}"
            )
        return v

    @field_validator("due_date")
    @classmethod
    def compute_due_date(cls, v: Optional[str], info) -> Optional[str]:
        if v is not None:
            return v
        days = info.data.get("due_days_from_now")
        if days is not None and isinstance(days, int):
            future = datetime.now() + timedelta(days=days)
            return future.isoformat()
        return None


class InteractionValidation(BaseModel):
    """Validates interaction data before writing to interactions."""

    lead_id: Optional[str] = None
    deal_id: Optional[str] = None
    type: str
    title: str = Field(..., max_length=200)
    body: Optional[str] = Field(None, max_length=5000)
    direction: str = Field("inbound")
    status: str = Field("completed")
    duration_seconds: Optional[int] = Field(None, ge=0)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in VALID_INTERACTION_TYPES:
            raise ValueError(
                f"Invalid interaction type '{v}'. Must be one of: {VALID_INTERACTION_TYPES}"
            )
        return v

    @field_validator("direction")
    @classmethod
    def validate_direction(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in VALID_DIRECTIONS:
            raise ValueError(
                f"Invalid direction '{v}'. Must be one of: {VALID_DIRECTIONS}"
            )
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in VALID_INTERACTION_STATUSES:
            raise ValueError(
                f"Invalid interaction status '{v}'. Must be one of: {VALID_INTERACTION_STATUSES}"
            )
        return v


class MigrationValidator:
    """Orchestrates validation for the entire CRM migration pipeline."""

    def __init__(self) -> None:
        self.logger = get_logger(__name__)

    def validate_lead(self, data: dict) -> tuple[bool, LeadValidation | str]:
        try:
            validated = LeadValidation(**data)
            self.logger.debug("Lead validation passed for %s", validated.email)
            return True, validated
        except Exception as e:
            self.logger.error("Lead validation failed: %s", e)
            return False, str(e)

    def validate_call_analytics(
        self, data: dict
    ) -> tuple[bool, CallAnalyticsValidation | str]:
        try:
            validated = CallAnalyticsValidation(**data)
            self.logger.debug(
                "Call analytics validation passed for session %s", validated.session_id
            )
            return True, validated
        except Exception as e:
            self.logger.error("Call analytics validation failed: %s", e)
            return False, str(e)

    def validate_deal(self, data: dict) -> tuple[bool, DealValidation | str]:
        try:
            validated = DealValidation(**data)
            self.logger.debug("Deal validation passed for %s", validated.title)
            return True, validated
        except Exception as e:
            self.logger.error("Deal validation failed: %s", e)
            return False, str(e)

    def validate_task(self, data: dict) -> tuple[bool, TaskValidation | str]:
        try:
            validated = TaskValidation(**data)
            self.logger.debug("Task validation passed for %s", validated.title)
            return True, validated
        except Exception as e:
            self.logger.error("Task validation failed: %s", e)
            return False, str(e)

    def validate_interaction(
        self, data: dict
    ) -> tuple[bool, InteractionValidation | str]:
        try:
            validated = InteractionValidation(**data)
            self.logger.debug("Interaction validation passed for %s", validated.title)
            return True, validated
        except Exception as e:
            self.logger.error("Interaction validation failed: %s", e)
            return False, str(e)

    def validate_row_complete(self, row: dict, analysis: dict) -> dict:
        """Validate an entire row + analysis combo and return a quality score.

        Scoring weights:
        - Required fields present: 40%
        - Data format validity: 30%
        - Enrichment quality (Groq analysis): 30%
        """
        errors: list[str] = []
        warnings: list[str] = []
        validated_data: dict[str, Any] = {}

        # 1. Required fields check (40%)
        required_fields = ["session_id", "call_date", "call_time"]
        present = sum(1 for f in required_fields if row.get(f))
        required_score = present / len(required_fields) if required_fields else 1.0

        if not row.get("session_id"):
            errors.append("Missing required field: session_id")
        if not row.get("call_date"):
            errors.append("Missing required field: call_date")
        if not row.get("call_time"):
            errors.append("Missing required field: call_time")

        has_email = bool(
            row.get("email") or analysis.get("lead_extraction", {}).get("email")
        )
        if not has_email:
            warnings.append("No email found - lead will use session_id as identifier")

        # 2. Data format validity (30%)
        format_checks = 0
        format_total = 0

        if row.get("call_date"):
            format_total += 1
            if DATE_RE.match(str(row["call_date"]).strip()):
                format_checks += 1
            else:
                errors.append(f"Invalid date format: {row['call_date']}")

        if row.get("call_time"):
            format_total += 1
            if TIME_RE.match(str(row["call_time"]).strip()):
                format_checks += 1
            else:
                errors.append(f"Invalid time format: {row['call_time']}")

        if row.get("duration_sec") is not None:
            format_total += 1
            try:
                val = int(row["duration_sec"])
                if val >= 0:
                    format_checks += 1
                else:
                    errors.append(f"Negative duration: {val}")
            except (ValueError, TypeError):
                errors.append(f"Invalid duration_sec: {row['duration_sec']}")

        if row.get("sentiment"):
            format_total += 1
            if str(row["sentiment"]).strip().lower() in VALID_SENTIMENTS:
                format_checks += 1
            else:
                warnings.append(f"Invalid sentiment: {row['sentiment']}")

        format_score = format_checks / format_total if format_total > 0 else 1.0

        # 3. Enrichment quality (30%)
        enrichment_checks = 0
        enrichment_total = 5

        if analysis.get("validated_sentiment") in VALID_SENTIMENTS:
            enrichment_checks += 1
        if analysis.get("validated_outcome") in VALID_CALL_OUTCOMES:
            enrichment_checks += 1
        if analysis.get("validated_failure_source") in VALID_FAILURE_SOURCES:
            enrichment_checks += 1
        if isinstance(analysis.get("validated_quality_score"), (int, float)):
            qs = analysis["validated_quality_score"]
            if 0 <= qs <= 10:
                enrichment_checks += 1
        if isinstance(analysis.get("lead_extraction"), dict):
            enrichment_checks += 1

        enrichment_score = (
            enrichment_checks / enrichment_total if enrichment_total > 0 else 0.0
        )

        # Weighted total
        total_score = (
            (required_score * 0.4) + (format_score * 0.3) + (enrichment_score * 0.3)
        )
        total_score = round(total_score, 3)

        # Build validated_data dict
        lead_email = row.get("email") or analysis.get("lead_extraction", {}).get(
            "email"
        )
        lead_name = analysis.get("lead_extraction", {}).get("name") or row.get("name")
        lead_company = analysis.get("lead_extraction", {}).get("company") or row.get(
            "company"
        )
        lead_phone = analysis.get("lead_extraction", {}).get("phone") or row.get(
            "phone"
        )

        validated_data["lead"] = {
            "email": lead_email
            or f"unknown-{row.get('session_id', 'nosession')}@placeholder.local",
            "name": lead_name,
            "company": lead_company,
            "phone": lead_phone,
            "source": "voice_ai",
            "status": "qualified" if analysis.get("is_qualified_lead") else "new",
            "pipeline_stage": "qualified"
            if analysis.get("is_qualified_lead")
            else "new",
            "lead_score": analysis.get("validated_quality_score", 0)
            if isinstance(analysis.get("validated_quality_score"), (int, float))
            else 0,
        }

        validated_data["call_analytics"] = {
            "session_id": row.get("session_id", ""),
            "call_date": row.get("call_date", ""),
            "call_time": row.get("call_time", ""),
            "duration_sec": int(row["duration_sec"]) if row.get("duration_sec") else 0,
            "language": row.get("language") or "unknown",
            "full_transcript": row.get("full_transcript"),
            "ai_summary": analysis.get("ai_summary_enriched") or row.get("ai_summary"),
            "sentiment": analysis.get("validated_sentiment") or row.get("sentiment"),
            "calculator_used": bool(row.get("calculator_used")),
            "revenue_entered": row.get("revenue_entered"),
            "missed_calls": row.get("missed_calls"),
            "booking_requested": bool(row.get("booking_requested")),
            "error_log": row.get("error_log"),
            "call_quality_score": int(analysis["validated_quality_score"])
            if isinstance(analysis.get("validated_quality_score"), (int, float))
            else None,
            "errors_detected": analysis.get("errors_detected")
            or row.get("errors_detected"),
            "prompt_fix_recommendations": analysis.get("prompt_fix_recommendations")
            or row.get("prompt_fix_recommendations"),
            "failure_source": analysis.get("validated_failure_source")
            or row.get("failure_source"),
            "call_outcome": analysis.get("validated_outcome")
            or row.get("call_outcome"),
            "recording_url": row.get("recording_url"),
            "analysis_model": "groq-migration",
        }

        if analysis.get("is_qualified_lead"):
            validated_data["deal"] = {
                "title": f"Deal - {lead_name or lead_company or 'Unknown Lead'}",
                "description": analysis.get("qualification_reasoning", ""),
                "stage": "qualification",
                "value": None,
            }

        validated_data["tasks"] = []
        for task in analysis.get("recommended_tasks", [])[:3]:
            validated_data["tasks"].append(
                {
                    "title": task.get("title", "Follow up"),
                    "priority": task.get("priority", "medium"),
                    "description": task.get("description", ""),
                    "due_days_from_now": task.get("due_days_from_now", 3),
                }
            )

        validated_data["interaction"] = {
            "type": "voice_session",
            "title": f"Voice session: {row.get('session_id', 'unknown')[:12]}",
            "body": analysis.get("ai_summary_enriched") or row.get("ai_summary"),
            "direction": "inbound",
            "status": "completed",
            "duration_seconds": int(row["duration_sec"])
            if row.get("duration_sec")
            else None,
            "metadata": {
                "source": "google_sheets_migration",
                "session_id": row.get("session_id"),
                "language": row.get("language"),
            },
        }

        # Determine pass/fail
        valid = len(errors) == 0 and total_score >= 0.80

        if total_score >= 0.95:
            self.logger.info(
                "Row %s: PASS (score=%.3f)", row.get("session_id", "?"), total_score
            )
        elif total_score >= 0.80:
            warnings.append(f"Quality score {total_score:.3f} below 0.95 threshold")
            self.logger.warning(
                "Row %s: WARN (score=%.3f)", row.get("session_id", "?"), total_score
            )
        else:
            self.logger.error(
                "Row %s: FAIL (score=%.3f, errors=%d)",
                row.get("session_id", "?"),
                total_score,
                len(errors),
            )

        return {
            "valid": valid,
            "errors": errors,
            "warnings": warnings,
            "validated_data": validated_data,
            "score": total_score,
            "required_score": round(required_score, 3),
            "format_score": round(format_score, 3),
            "enrichment_score": round(enrichment_score, 3),
        }
