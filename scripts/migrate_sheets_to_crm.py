#!/usr/bin/env python3
"""CRM Migration CLI — Google Sheets to Supabase.

Usage:
    python migrate_sheets_to_crm.py              # Full migration
    python migrate_sheets_to_crm.py --dry-run    # Preview without writing
    python migrate_sheets_to_crm.py --batch 10   # Process in batches of 10
    python migrate_sheets_to_crm.py --resume     # Resume from checkpoint
    python migrate_sheets_to_crm.py --stress     # Run stress tests first
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

# Add parent dir to path so lib imports work
sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.config import config, groq_client, supabase_client
from lib.crm_writer import CRMWriter
from lib.groq_analyzer import GroqAnalyzer
from lib.logger import get_logger
from lib.orchestrator import (
    CircuitBreaker,
    PhaseResult,
    PhaseState,
    PipelineOrchestrator,
)
from lib.qa_validator import QAPipeline
from lib.sheet_reader import SheetReader
from lib.stress_test import StressTestHarness
from lib.validator import MigrationValidator

logger = get_logger(__name__)

CHECKPOINT_PATH = Path(__file__).resolve().parent / "logs" / "migration_checkpoint.json"
REPORT_PATH = Path(__file__).resolve().parent / "logs" / "migration_report.json"


def run_stress_tests(sample_rows: list[dict]) -> dict:
    """Run stress tests before migration."""
    logger.info("=" * 60)
    logger.info("STRESS TESTING PHASE")
    logger.info("=" * 60)

    analyzer = GroqAnalyzer(api_key=config.groq_api_key, model=config.groq_model)
    validator = MigrationValidator()
    writer = CRMWriter(supabase_client)

    harness = StressTestHarness()
    results = harness.run_all(
        sample_rows=sample_rows[:10],
        analyzer=analyzer,
        validator=validator,
        writer=writer,
        batch_size=5,
    )

    logger.info("Stress Test Results:")
    for test in results["tests"]:
        status = "PASS" if test.get("passed_threshold") else "FAIL"
        logger.info(
            "  [%s] %s (rate=%.1f%%)", status, test["test"], test.get("rate", 0) * 100
        )

    return results


def run_migration(
    dry_run: bool = False, batch_size: int = 0, resume: bool = False
) -> dict:
    """Run the full CRM migration pipeline.

    Args:
        dry_run: If True, only read and analyze — don't write to DB.
        batch_size: Process rows in batches (0 = all at once).
        resume: Resume from last checkpoint.

    Returns:
        Migration report dict.
    """
    logger.info("=" * 60)
    logger.info("CRM MIGRATION PIPELINE")
    logger.info("=" * 60)
    logger.info("Mode: %s", "DRY RUN" if dry_run else "LIVE")
    logger.info("Sheet: %s / %s", config.google_sheet_id, config.google_sheet_name)
    logger.info("Supabase: %s", config.supabase_url)

    # Initialize components
    sheet = SheetReader(
        sheet_id=config.google_sheet_id,
        sheet_name=config.google_sheet_name,
        client_id=config.google_client_id,
        client_secret=config.google_client_secret,
        refresh_token=config.google_refresh_token,
    )
    analyzer = GroqAnalyzer(api_key=config.groq_api_key, model=config.groq_model)
    writer = CRMWriter(supabase_client)
    circuit_breaker = CircuitBreaker()
    orchestrator = PipelineOrchestrator(
        checkpoint_path=str(CHECKPOINT_PATH),
        quality_threshold=0.95,
        circuit_breaker=circuit_breaker,
    )

    # Phase 1: Extract
    all_rows: list[dict] = []

    def extract_phase() -> PhaseResult:
        nonlocal all_rows
        logger.info("Connecting to Google Sheets...")
        if not sheet.validate_sheet_accessible():
            return PhaseResult(state=PhaseState.FAILED, error="Sheet not accessible")

        row_count = sheet.get_row_count()
        logger.info("Sheet has %d data rows", row_count)

        all_rows = sheet.get_all_rows()
        logger.info("Extracted %d rows from Google Sheets", len(all_rows))

        return PhaseResult(
            state=PhaseState.PASSED,
            data=all_rows,
            metrics={"rows_extracted": len(all_rows), "source_row_count": row_count},
        )

    # Phase 2: Transform (Groq Analysis)
    all_analyses: list[dict] = []

    def transform_phase() -> PhaseResult:
        nonlocal all_analyses
        rows = all_rows
        if batch_size > 0:
            rows = rows[:batch_size]
            logger.info("Batch mode: processing first %d rows", batch_size)

        logger.info("Analyzing %d rows with Groq AI...", len(rows))
        start = time.monotonic()

        for i, row in enumerate(rows):
            if not circuit_breaker.can_execute():
                logger.error("Circuit breaker OPEN — pausing analysis")
                return PhaseResult(
                    state=PhaseState.FAILED,
                    error="Circuit breaker opened during analysis",
                )

            try:
                analysis = analyzer.analyze_session(row)
                all_analyses.append(analysis)
                circuit_breaker.record_success()

                if (i + 1) % 5 == 0:
                    elapsed = time.monotonic() - start
                    rate = (i + 1) / elapsed if elapsed > 0 else 0
                    logger.info(
                        "Progress: %d/%d rows analyzed (%.1f rows/sec)",
                        i + 1,
                        len(rows),
                        rate,
                    )

            except Exception as e:
                circuit_breaker.record_failure()
                logger.error("Analysis failed for row %d: %s", i, e)
                all_analyses.append(
                    {"_error": str(e), "_session_id": row.get("session_id", "unknown")}
                )

        duration = time.monotonic() - start
        success_count = sum(1 for a in all_analyses if "_error" not in a)

        return PhaseResult(
            state=PhaseState.PASSED,
            data=all_analyses,
            metrics={
                "rows_analyzed": len(all_analyses),
                "successful_analyses": success_count,
                "failed_analyses": len(all_analyses) - success_count,
                "analysis_duration_sec": round(duration, 2),
                "analysis_rate": round(len(all_analyses) / duration, 2)
                if duration > 0
                else 0,
            },
        )

    # Phase 3: Validate
    def validate_phase() -> PhaseResult:
        validator = MigrationValidator()
        rows = all_rows if batch_size == 0 else all_rows[:batch_size]
        analyses = all_analyses

        logger.info("Validating %d rows...", len(rows))
        valid_count = 0
        warn_count = 0
        fail_count = 0
        scores = []

        for i, (row, analysis) in enumerate(zip(rows, analyses)):
            result = validator.validate_row_complete(row, analysis)
            scores.append(result["score"])

            if result["valid"]:
                if result["score"] >= 0.95:
                    valid_count += 1
                else:
                    warn_count += 1
            else:
                fail_count += 1

        avg_score = sum(scores) / len(scores) if scores else 0
        quality = valid_count / len(rows) if rows else 0

        logger.info(
            "Validation: %d pass, %d warn, %d fail (avg_score=%.3f)",
            valid_count,
            warn_count,
            fail_count,
            avg_score,
        )

        return PhaseResult(
            state=PhaseState.PASSED if fail_count == 0 else PhaseState.FAILED,
            metrics={
                "valid": valid_count,
                "warnings": warn_count,
                "failed": fail_count,
                "avg_score": round(avg_score, 4),
                "quality_score": round(quality, 4),
            },
        )

    # Phase 4: Load (skip in dry-run mode)
    def load_phase() -> PhaseResult:
        if dry_run:
            logger.info("DRY RUN — skipping database writes")
            rows = all_rows if batch_size == 0 else all_rows[:batch_size]
            analyses = all_analyses

            # Simulate writes to show what WOULD happen
            deals_count = sum(1 for a in analyses if a.get("is_qualified_lead"))
            tasks_count = sum(len(a.get("recommended_tasks", [])) for a in analyses)

            return PhaseResult(
                state=PhaseState.PASSED,
                metrics={
                    "dry_run": True,
                    "leads_would_write": len(rows),
                    "analytics_would_write": len(rows),
                    "deals_would_write": deals_count,
                    "tasks_would_write": tasks_count,
                    "interactions_would_write": len(rows),
                },
            )

        logger.info("Writing to Supabase...")
        rows = all_rows if batch_size == 0 else all_rows[:batch_size]
        analyses = all_analyses
        results = []

        for i, (row, analysis) in enumerate(zip(rows, analyses)):
            if not circuit_breaker.can_execute():
                logger.error("Circuit breaker OPEN — pausing writes")
                return PhaseResult(
                    state=PhaseState.FAILED,
                    error="Circuit breaker opened during write",
                )

            try:
                result = writer.write_full_session(row, analysis)
                results.append(result)
                circuit_breaker.record_success()

                if result["success"]:
                    logger.info(
                        "Row %d/%d: OK (score=%.3f, lead=%s, deal=%s, tasks=%d)",
                        i + 1,
                        len(rows),
                        result.get("score", 0),
                        "OK" if result.get("lead") else "N/A",
                        "OK" if result.get("deal") else "N/A",
                        len(result.get("tasks", [])),
                    )
                else:
                    logger.warning(
                        "Row %d/%d: FAILED — %s", i + 1, len(rows), result.get("error")
                    )
                    circuit_breaker.record_failure()

            except Exception as e:
                circuit_breaker.record_failure()
                logger.error("Write failed for row %d: %s", i, e)
                results.append({"success": False, "error": str(e)})

        stats = writer.get_stats()
        logger.info("Write stats: %s", json.dumps(stats, indent=2))

        return PhaseResult(
            state=PhaseState.PASSED,
            metrics=stats,
            data=results,
        )

    # Phase 5: Verify (skip in dry-run mode)
    def verify_phase() -> PhaseResult:
        if dry_run:
            return PhaseResult(state=PhaseState.SKIPPED, metrics={"skipped": "dry_run"})

        logger.info("Running QA verification...")
        qa = QAPipeline(supabase_client, quality_threshold=0.95)
        rows = all_rows if batch_size == 0 else all_rows[:batch_size]
        report = qa.run_all(source_rows=rows, sample_size=min(10, len(rows)))

        logger.info("QA Report:")
        logger.info("  Overall: %s", "PASS" if report["overall_pass"] else "FAIL")
        logger.info("  Accuracy: %.1f%%", report["accuracy"] * 100)
        logger.info(
            "  Passed: %d, Failed: %d, Warnings: %d",
            report["passed"],
            report["failed"],
            report["warnings"],
        )

        for r in report["results"]:
            status = "PASS" if r["passed"] else "FAIL"
            logger.info("  [%s] %s: %s", status, r["name"], r["details"])

        return PhaseResult(
            state=PhaseState.PASSED if report["overall_pass"] else PhaseState.FAILED,
            metrics=report,
        )

    # Build and run pipeline
    orchestrator.add_phase("extract", extract_phase)
    orchestrator.add_phase("transform", transform_phase, quality_gate=0.90)
    orchestrator.add_phase("validate", validate_phase, quality_gate=0.95)
    orchestrator.add_phase("load", load_phase)
    orchestrator.add_phase("verify", verify_phase, quality_gate=0.95)

    report = orchestrator.run(resume=resume)

    # Save report
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2, default=str))
    logger.info("Migration report saved: %s", REPORT_PATH)

    return report


def main() -> None:
    parser = argparse.ArgumentParser(
        description="CRM Migration: Google Sheets -> Supabase"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Preview without writing to DB"
    )
    parser.add_argument(
        "--batch", type=int, default=0, help="Process N rows only (0=all)"
    )
    parser.add_argument("--resume", action="store_true", help="Resume from checkpoint")
    parser.add_argument("--stress", action="store_true", help="Run stress tests first")
    args = parser.parse_args()

    try:
        if args.stress:
            sheet = SheetReader(
                sheet_id=config.google_sheet_id,
                sheet_name=config.google_sheet_name,
                client_id=config.google_client_id,
                client_secret=config.google_client_secret,
                refresh_token=config.google_refresh_token,
            )
            rows = sheet.get_all_rows()
            stress_results = run_stress_tests(rows)
            if not stress_results["overall_pass"]:
                logger.error("Stress tests FAILED — fix issues before migrating")
                sys.exit(1)
            logger.info("Stress tests PASSED — proceeding with migration")

        report = run_migration(
            dry_run=args.dry_run, batch_size=args.batch, resume=args.resume
        )

        if report["success"]:
            logger.info("=" * 60)
            logger.info("MIGRATION COMPLETED SUCCESSFULLY")
            logger.info("=" * 60)
            for phase in report["phases"]:
                logger.info(
                    "  [%s] %s (%.1fs)",
                    phase["state"].upper(),
                    phase["name"],
                    phase["duration_sec"],
                )
            sys.exit(0)
        else:
            logger.error("=" * 60)
            logger.error("MIGRATION FAILED")
            logger.error("=" * 60)
            for phase in report["phases"]:
                if phase["state"] == "failed":
                    logger.error("  [FAIL] %s: %s", phase["name"], phase.get("error"))
            sys.exit(1)

    except Exception as e:
        logger.error("Migration crashed: %s", e, exc_info=True)
        sys.exit(2)


if __name__ == "__main__":
    main()
