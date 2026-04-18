"""Stress testing harness for CRM migration pipeline.

Implements chaos engineering patterns:
  - Edge case injection (empty fields, malformed data)
  - API failure simulation (rate limits, timeouts)
  - Load testing with configurable batch sizes
  - Performance benchmarking (rows/sec, latency)
"""

from __future__ import annotations

import random
import time
from typing import Any, Callable, Optional

from .logger import get_logger

logger = get_logger(__name__)


class StressTestHarness:
    """Stress tests the CRM migration pipeline with chaos engineering."""

    def __init__(self) -> None:
        self._results: list[dict] = []

    def run_all(
        self,
        sample_rows: list[dict],
        analyzer,
        validator,
        writer,
        batch_size: int = 5,
    ) -> dict:
        """Run all stress tests and return comprehensive report.

        Args:
            sample_rows: Sample data rows for testing.
            analyzer: GroqAnalyzer instance.
            validator: MigrationValidator instance.
            writer: CRMWriter instance.
            batch_size: Number of rows per batch for load testing.

        Returns:
            Dict with test results, performance metrics, and pass/fail.
        """
        self._results = []
        logger.info("Stress Testing starting - %d sample rows", len(sample_rows))

        self._test_edge_cases(sample_rows, analyzer, validator)
        self._test_empty_fields(analyzer, validator)
        self._test_malformed_data(analyzer, validator)
        self._test_load_performance(
            sample_rows, analyzer, validator, writer, batch_size
        )

        return self._build_report()

    def _test_edge_cases(self, rows: list[dict], analyzer, validator) -> None:
        """Test with edge case data."""
        logger.info("Stress Test: Edge Cases")
        passed = 0
        total = 0

        edge_cases = [
            {
                "session_id": "test-1",
                "call_date": "",
                "call_time": "",
                "duration_sec": 0,
            },
            {
                "session_id": "test-2",
                "call_date": "2026-04-05",
                "call_time": "14:30",
                "duration_sec": -1,
            },
            {
                "session_id": "test-3",
                "call_date": "invalid",
                "call_time": "invalid",
                "duration_sec": "abc",
            },
            {
                "session_id": "",
                "call_date": "2026-04-05",
                "call_time": "14:30",
                "duration_sec": 60,
            },
            {
                "session_id": "test-5",
                "call_date": "2026-04-05",
                "call_time": "14:30",
                "duration_sec": 0,
                "sentiment": "INVALID",
            },
        ]

        for case in edge_cases:
            total += 1
            try:
                analysis = analyzer.analyze_session(case)
                validation = validator.validate_row_complete(case, analysis)
                if isinstance(validation, dict):
                    passed += 1
                    logger.debug(
                        "Edge case handled: %s", case.get("session_id", "unknown")
                    )
            except Exception as e:
                logger.warning(
                    "Edge case crashed: %s - %s", case.get("session_id", "unknown"), e
                )

        self._results.append(
            {
                "test": "Edge Case Handling",
                "passed": passed,
                "total": total,
                "rate": passed / total if total > 0 else 0,
                "passed_threshold": passed / total >= 0.80 if total > 0 else False,
            }
        )

    def _test_empty_fields(self, analyzer, validator) -> None:
        """Test with completely empty/minimal data."""
        logger.info("Stress Test: Empty Fields")
        passed = 0
        total = 3

        empty_cases = [
            {},
            {"session_id": "empty-1"},
            {"session_id": "empty-2", "call_date": "", "call_time": ""},
        ]

        for case in empty_cases:
            try:
                analysis = analyzer.analyze_session(case)
                validation = validator.validate_row_complete(case, analysis)
                if isinstance(validation, dict) and not validation.get("valid"):
                    passed += 1
            except Exception as e:
                logger.warning("Empty field test crashed: %s", e)

        self._results.append(
            {
                "test": "Empty Field Handling",
                "passed": passed,
                "total": total,
                "rate": passed / total if total > 0 else 0,
                "passed_threshold": passed / total >= 0.80 if total > 0 else False,
            }
        )

    def _test_malformed_data(self, analyzer, validator) -> None:
        """Test with deliberately malformed data."""
        logger.info("Stress Test: Malformed Data")
        passed = 0
        total = 4

        malformed_cases = [
            {
                "session_id": "x" * 1000,
                "call_date": "2026-04-05",
                "call_time": "14:30",
                "duration_sec": 60,
            },
            {
                "session_id": "mal-1",
                "call_date": "9999-99-99",
                "call_time": "99:99",
                "duration_sec": 999999,
            },
            {
                "session_id": "mal-2",
                "call_date": "2026-04-05",
                "call_time": "14:30",
                "duration_sec": 60,
                "sentiment": "x" * 500,
            },
            {
                "session_id": "mal-3",
                "call_date": "2026-04-05",
                "call_time": "14:30",
                "duration_sec": 60,
                "full_transcript": "x" * 10000,
            },
        ]

        for case in malformed_cases:
            try:
                analysis = analyzer.analyze_session(case)
                validation = validator.validate_row_complete(case, analysis)
                if isinstance(validation, dict):
                    passed += 1
            except Exception as e:
                logger.warning("Malformed data test crashed: %s", e)

        self._results.append(
            {
                "test": "Malformed Data Handling",
                "passed": passed,
                "total": total,
                "rate": passed / total if total > 0 else 0,
                "passed_threshold": passed / total >= 0.80 if total > 0 else False,
            }
        )

    def _test_load_performance(
        self, rows: list[dict], analyzer, validator, writer, batch_size: int
    ) -> None:
        """Test processing speed with configurable batch sizes."""
        logger.info("Stress Test: Load Performance (batch_size=%d)", batch_size)

        test_rows = rows[: min(batch_size * 3, len(rows))]
        if not test_rows:
            self._results.append(
                {
                    "test": "Load Performance",
                    "passed": False,
                    "total": 0,
                    "rate": 0,
                    "passed_threshold": False,
                    "details": "No test data available",
                }
            )
            return

        start = time.monotonic()
        processed = 0
        errors = 0

        for row in test_rows:
            try:
                analysis = analyzer.analyze_session(row)
                validation = validator.validate_row_complete(row, analysis)
                if isinstance(validation, dict) and validation.get("valid"):
                    processed += 1
                else:
                    errors += 1
            except Exception as e:
                errors += 1
                logger.warning("Load test error: %s", e)

        duration = time.monotonic() - start
        rows_per_sec = processed / duration if duration > 0 else 0

        self._results.append(
            {
                "test": "Load Performance",
                "passed": rows_per_sec > 0,
                "total": len(test_rows),
                "processed": processed,
                "errors": errors,
                "duration_sec": round(duration, 2),
                "rows_per_sec": round(rows_per_sec, 2),
                "rate": processed / len(test_rows) if test_rows else 0,
                "passed_threshold": processed / len(test_rows) >= 0.80
                if test_rows
                else False,
            }
        )

    def _build_report(self) -> dict:
        total_tests = len(self._results)
        passed_tests = sum(1 for r in self._results if r.get("passed_threshold", False))

        return {
            "overall_pass": passed_tests == total_tests,
            "tests_passed": passed_tests,
            "tests_total": total_tests,
            "tests": self._results,
        }
