#!/usr/bin/env python3
"""Stress Testing CLI for CRM Migration Pipeline.

Runs chaos engineering tests against the migration system:
  - Edge case injection
  - Empty field handling
  - Malformed data resilience
  - Load performance benchmarking

Usage:
    python run_stress_test.py              # Full stress test
    python run_stress_test.py --batch 20   # Load test with batch size 20
    python run_stress_test.py --json       # Output JSON only
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.config import config, groq_client, supabase_client
from lib.crm_writer import CRMWriter
from lib.groq_analyzer import GroqAnalyzer
from lib.logger import get_logger
from lib.sheet_reader import SheetReader
from lib.stress_test import StressTestHarness
from lib.validator import MigrationValidator

logger = get_logger(__name__)


def print_header(title: str) -> None:
    width = 70
    print()
    print("=" * width)
    print(f"  {title}")
    print("=" * width)


def print_section(title: str) -> None:
    print()
    print(f"--- {title} ---")


def print_row(label: str, value: str, status: str = "") -> None:
    status_str = f"  [{status}]" if status else ""
    print(f"  {label:<35} {value}{status_str}")


def run_stress_tests(batch_size: int = 5, json_only: bool = False) -> dict:
    """Run all stress tests and return report.

    Args:
        batch_size: Number of rows per batch for load testing.
        json_only: If True, output JSON only.

    Returns:
        Stress test report dict.
    """
    # Read sample data
    sheet = SheetReader(
        sheet_id=config.google_sheet_id,
        sheet_name=config.google_sheet_name,
        client_id=config.google_client_id,
        client_secret=config.google_client_secret,
        refresh_token=config.google_refresh_token,
    )

    rows = sheet.get_all_rows()

    if not json_only:
        print_header("CRM MIGRATION STRESS TEST SUITE")
        print_row("Source Rows", str(len(rows)))
        print_row("Batch Size", str(batch_size))
        print_row("Groq Model", config.groq_model)

    # Initialize components
    analyzer = GroqAnalyzer(api_key=config.groq_api_key, model=config.groq_model)
    validator = MigrationValidator()
    writer = CRMWriter(supabase_client)

    # Run stress tests
    harness = StressTestHarness()
    results = harness.run_all(
        sample_rows=rows,
        analyzer=analyzer,
        validator=validator,
        writer=writer,
        batch_size=batch_size,
    )

    if json_only:
        print(json.dumps(results, indent=2, default=str))
        return results

    # Display results
    print_header("STRESS TEST RESULTS")

    overall = "PASS" if results["overall_pass"] else "FAIL"
    print_row("Overall Status", overall, "PASS" if results["overall_pass"] else "FAIL")
    print_row("Tests Passed", f"{results['tests_passed']}/{results['tests_total']}")

    print_section("TEST DETAILS")
    for test in results["tests"]:
        status = "PASS" if test.get("passed_threshold") else "FAIL"
        print_row(test["test"], f"rate={test.get('rate', 0) * 100:.1f}%", status)

        if "rows_per_sec" in test:
            print_row("  Throughput", f"{test['rows_per_sec']} rows/sec")
        if "duration_sec" in test:
            print_row("  Duration", f"{test['duration_sec']}s")
        if "processed" in test:
            print_row("  Processed", f"{test['processed']}/{test['total']}")
        if "errors" in test:
            print_row("  Errors", str(test["errors"]))
        if "details" in test:
            print_row("  Details", test["details"])

    print_section("RECOMMENDATIONS")
    if results["overall_pass"]:
        print("  All stress tests PASSED. System is ready for migration.")
    else:
        failed = [t for t in results["tests"] if not t.get("passed_threshold")]
        print(f"  {len(failed)} test(s) FAILED. Review and fix before migrating:")
        for t in failed:
            print(f"    - {t['test']} (rate={t.get('rate', 0) * 100:.1f}%)")

    print()
    print("=" * 70)
    print()

    return results


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="CRM Migration Stress Test Suite")
    parser.add_argument(
        "--batch", type=int, default=5, help="Batch size for load testing"
    )
    parser.add_argument("--json", action="store_true", help="Output JSON only")
    args = parser.parse_args()

    try:
        results = run_stress_tests(batch_size=args.batch, json_only=args.json)
        sys.exit(0 if results["overall_pass"] else 1)
    except Exception as e:
        logger.error("Stress test crashed: %s", e, exc_info=True)
        print(f"\nERROR: {e}")
        sys.exit(2)


if __name__ == "__main__":
    main()
