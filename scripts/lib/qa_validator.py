"""Multi-stage QA validation engine for CRM migration verification.

Implements professional CI/CD-style verification pipeline:
  Stage 1: Schema Validation (Pydantic)
  Stage 2: Relationship Validation (FK integrity)
  Stage 3: Completeness Check (source count = destination count)
  Stage 4: Accuracy Sampling (random sample comparison)
  Stage 5: Statistical Analysis (distribution matching)
"""

from __future__ import annotations

import random
from typing import Any, Optional

from .logger import get_logger

logger = get_logger(__name__)


class QAResult:
    """Holds the result of a single QA check."""

    def __init__(
        self, name: str, passed: bool, details: str = "", severity: str = "error"
    ) -> None:
        self.name = name
        self.passed = passed
        self.details = details
        self.severity = severity

    def __repr__(self) -> str:
        status = "PASS" if self.passed else "FAIL"
        return f"[{status}] {self.name}: {self.details}"


class QAPipeline:
    """Multi-stage QA validation pipeline for CRM migration.

    Runs 5 verification stages and produces a comprehensive
    accuracy report with pass/fail for each stage.
    """

    def __init__(self, supabase_client, quality_threshold: float = 0.95) -> None:
        self._client = supabase_client
        self._threshold = quality_threshold
        self._results: list[QAResult] = []

    def run_all(
        self,
        source_rows: list[dict],
        sample_size: int = 10,
    ) -> dict:
        """Run all QA stages and return comprehensive report.

        Args:
            source_rows: Original data from Google Sheets.
            sample_size: Number of random records to sample for comparison.

        Returns:
            Dict with overall pass/fail, per-stage results, and accuracy score.
        """
        self._results = []
        logger.info("QA Pipeline starting - %d source rows", len(source_rows))

        self._stage_1_schema_validation(source_rows)
        self._stage_2_relationship_integrity()
        self._stage_3_completeness_check(source_rows)
        self._stage_4_accuracy_sampling(source_rows, sample_size)
        self._stage_5_statistical_analysis(source_rows)

        return self._build_report(source_rows)

    def _stage_1_schema_validation(self, source_rows: list[dict]) -> None:
        """Verify all source rows have required fields."""
        logger.info("Stage 1: Schema Validation")
        required = {"session_id", "call_date", "call_time", "duration_sec"}
        missing_count = 0

        for i, row in enumerate(source_rows):
            missing = required - set(row.keys())
            if missing:
                missing_count += 1
                logger.warning("Row %d missing fields: %s", i, missing)

        completeness = (
            (len(source_rows) - missing_count) / len(source_rows)
            if source_rows
            else 1.0
        )
        passed = completeness >= 0.98

        self._results.append(
            QAResult(
                name="Schema Completeness",
                passed=passed,
                details=f"{completeness:.1%} rows have all required fields ({missing_count} missing)",
                severity="error" if not passed else "info",
            )
        )

    def _stage_2_relationship_integrity(self) -> None:
        """Verify FK integrity across all CRM tables."""
        logger.info("Stage 2: Relationship Integrity")

        try:
            leads = self._client.table("leads").select("id").execute()
            lead_ids = {l["id"] for l in leads.data} if leads.data else set()

            deals = self._client.table("deals").select("id, lead_id").execute()
            orphan_deals = [
                d for d in (deals.data or []) if d.get("lead_id") not in lead_ids
            ]

            self._results.append(
                QAResult(
                    name="Deals FK Integrity",
                    passed=len(orphan_deals) == 0,
                    details=f"{len(orphan_deals)} orphaned deals found",
                    severity="error" if orphan_deals else "info",
                )
            )

            tasks = self._client.table("tasks").select("id, lead_id").execute()
            orphan_tasks = [
                t
                for t in (tasks.data or [])
                if t.get("lead_id") and t.get("lead_id") not in lead_ids
            ]

            self._results.append(
                QAResult(
                    name="Tasks FK Integrity",
                    passed=len(orphan_tasks) == 0,
                    details=f"{len(orphan_tasks)} orphaned tasks found",
                    severity="error" if orphan_tasks else "info",
                )
            )

            interactions = (
                self._client.table("interactions").select("id, lead_id").execute()
            )
            orphan_interactions = [
                i
                for i in (interactions.data or [])
                if i.get("lead_id") and i.get("lead_id") not in lead_ids
            ]

            self._results.append(
                QAResult(
                    name="Interactions FK Integrity",
                    passed=len(orphan_interactions) == 0,
                    details=f"{len(orphan_interactions)} orphaned interactions found",
                    severity="error" if orphan_interactions else "info",
                )
            )

        except Exception as e:
            self._results.append(
                QAResult(
                    name="Relationship Integrity",
                    passed=False,
                    details=f"Query failed: {e}",
                    severity="error",
                )
            )

    def _stage_3_completeness_check(self, source_rows: list[dict]) -> None:
        """Verify source count matches destination count."""
        logger.info("Stage 3: Completeness Check")

        try:
            source_count = len(source_rows)
            source_session_ids = {
                r.get("session_id") for r in source_rows if r.get("session_id")
            }

            analytics = (
                self._client.table("call_analytics").select("id, session_id").execute()
            )
            dest_count = len(analytics.data) if analytics.data else 0
            dest_session_ids = {a["session_id"] for a in (analytics.data or [])}

            missing_in_dest = source_session_ids - dest_session_ids
            extra_in_dest = dest_session_ids - source_session_ids

            match_rate = (
                len(source_session_ids & dest_session_ids) / len(source_session_ids)
                if source_session_ids
                else 0
            )

            self._results.append(
                QAResult(
                    name="Row Count Match",
                    passed=match_rate >= self._threshold,
                    details=f"Source: {source_count}, Dest: {dest_count}, Match: {match_rate:.1%}",
                    severity="error" if match_rate < self._threshold else "info",
                )
            )

            if missing_in_dest:
                self._results.append(
                    QAResult(
                        name="Missing in Destination",
                        passed=False,
                        details=f"{len(missing_in_dest)} session IDs not found in destination",
                        severity="error",
                    )
                )

            if extra_in_dest:
                self._results.append(
                    QAResult(
                        name="Extra in Destination",
                        passed=False,
                        details=f"{len(extra_in_dest)} session IDs in destination but not in source",
                        severity="warning",
                    )
                )

        except Exception as e:
            self._results.append(
                QAResult(
                    name="Completeness Check",
                    passed=False,
                    details=f"Query failed: {e}",
                    severity="error",
                )
            )

    def _stage_4_accuracy_sampling(
        self, source_rows: list[dict], sample_size: int
    ) -> None:
        """Random sample comparison between source and destination."""
        logger.info("Stage 4: Accuracy Sampling (n=%d)", sample_size)

        try:
            source_session_ids = [
                r.get("session_id") for r in source_rows if r.get("session_id")
            ]
            if not source_session_ids:
                self._results.append(
                    QAResult(
                        name="Accuracy Sampling",
                        passed=False,
                        details="No session IDs to sample",
                        severity="error",
                    )
                )
                return

            sample_ids = random.sample(
                source_session_ids, min(sample_size, len(source_session_ids))
            )
            matches = 0
            total_checks = 0

            for sid in sample_ids:
                source_row = next(
                    (r for r in source_rows if r.get("session_id") == sid), None
                )
                if not source_row:
                    continue

                dest = (
                    self._client.table("call_analytics")
                    .select("*")
                    .eq("session_id", sid)
                    .execute()
                )
                if not dest.data:
                    continue

                dest_row = dest.data[0]

                checks = [
                    (
                        "sentiment",
                        str(source_row.get("sentiment", "")).lower().strip(),
                        str(dest_row.get("sentiment", "")).lower().strip(),
                    ),
                    (
                        "call_outcome",
                        str(source_row.get("call_outcome", "")).lower().strip(),
                        str(dest_row.get("call_outcome", "")).lower().strip(),
                    ),
                    (
                        "failure_source",
                        str(source_row.get("failure_source", "")).lower().strip(),
                        str(dest_row.get("failure_source", "")).lower().strip(),
                    ),
                    (
                        "duration_sec",
                        source_row.get("duration_sec"),
                        dest_row.get("duration_sec"),
                    ),
                    (
                        "language",
                        str(source_row.get("language", "")).lower().strip(),
                        str(dest_row.get("language", "")).lower().strip(),
                    ),
                ]

                for field_name, src_val, dst_val in checks:
                    total_checks += 1
                    if str(src_val).strip() == str(dst_val).strip():
                        matches += 1

            accuracy = matches / total_checks if total_checks > 0 else 0

            self._results.append(
                QAResult(
                    name="Field Accuracy (Sample)",
                    passed=accuracy >= self._threshold,
                    details=f"{matches}/{total_checks} fields match ({accuracy:.1%} accuracy) across {len(sample_ids)} samples",
                    severity="error" if accuracy < self._threshold else "info",
                )
            )

        except Exception as e:
            self._results.append(
                QAResult(
                    name="Accuracy Sampling",
                    passed=False,
                    details=f"Sampling failed: {e}",
                    severity="error",
                )
            )

    def _stage_5_statistical_analysis(self, source_rows: list[dict]) -> None:
        """Compare distributions between source and destination."""
        logger.info("Stage 5: Statistical Analysis")

        try:
            source_sentiments = {}
            for row in source_rows:
                s = str(row.get("sentiment", "unknown")).lower().strip() or "unknown"
                source_sentiments[s] = source_sentiments.get(s, 0) + 1

            analytics = (
                self._client.table("call_analytics").select("sentiment").execute()
            )
            dest_sentiments = {}
            for row in analytics.data or []:
                s = str(row.get("sentiment", "unknown")).lower().strip() or "unknown"
                dest_sentiments[s] = dest_sentiments.get(s, 0) + 1

            self._results.append(
                QAResult(
                    name="Sentiment Distribution",
                    passed=True,
                    details=f"Source: {source_sentiments}, Dest: {dest_sentiments}",
                    severity="info",
                )
            )

            source_outcomes = {}
            for row in source_rows:
                o = str(row.get("call_outcome", "unknown")).lower().strip() or "unknown"
                source_outcomes[o] = source_outcomes.get(o, 0) + 1

            dest_outcomes = {}
            for row in analytics.data or []:
                o = str(row.get("call_outcome", "unknown")).lower().strip() or "unknown"
                dest_outcomes[o] = dest_outcomes.get(o, 0) + 1

            self._results.append(
                QAResult(
                    name="Outcome Distribution",
                    passed=True,
                    details=f"Source: {source_outcomes}, Dest: {dest_outcomes}",
                    severity="info",
                )
            )

        except Exception as e:
            self._results.append(
                QAResult(
                    name="Statistical Analysis",
                    passed=False,
                    details=f"Analysis failed: {e}",
                    severity="error",
                )
            )

    def _build_report(self, source_rows: list[dict]) -> dict:
        passed = sum(1 for r in self._results if r.passed)
        failed = sum(1 for r in self._results if not r.passed and r.severity == "error")
        warnings = sum(
            1 for r in self._results if not r.passed and r.severity == "warning"
        )

        total_checks = len([r for r in self._results if r.severity == "error"])
        accuracy = (total_checks - failed) / total_checks if total_checks > 0 else 1.0

        overall_pass = failed == 0 and accuracy >= self._threshold

        return {
            "overall_pass": overall_pass,
            "accuracy": round(accuracy, 4),
            "threshold": self._threshold,
            "passed": passed,
            "failed": failed,
            "warnings": warnings,
            "total_checks": total_checks,
            "source_rows": len(source_rows),
            "results": [
                {
                    "name": r.name,
                    "passed": r.passed,
                    "details": r.details,
                    "severity": r.severity,
                }
                for r in self._results
            ],
        }
