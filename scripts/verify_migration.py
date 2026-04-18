#!/usr/bin/env python3
"""Interactive Verification Console for CRM Migration.

Compares source (Google Sheets) vs destination (Supabase) data,
runs integrity checks, and produces a final accuracy report.

Usage:
    python verify_migration.py              # Full verification
    python verify_migration.py --sample 20  # Sample 20 records
    python verify_migration.py --json       # Output JSON only
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib.config import config, supabase_client
from lib.logger import get_logger
from lib.qa_validator import QAPipeline
from lib.sheet_reader import SheetReader

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


def run_verification(sample_size: int = 10, json_only: bool = False) -> dict:
    """Run full verification and return report.

    Args:
        sample_size: Number of random records to sample.
        json_only: If True, output JSON only (no interactive display).

    Returns:
        Verification report dict.
    """
    # Read source data
    sheet = SheetReader(
        sheet_id=config.google_sheet_id,
        sheet_name=config.google_sheet_name,
        client_id=config.google_client_id,
        client_secret=config.google_client_secret,
        refresh_token=config.google_refresh_token,
    )

    source_rows = sheet.get_all_rows()

    if not json_only:
        print_header("CRM MIGRATION VERIFICATION CONSOLE")
        print_row("Source", f"Google Sheets: {config.google_sheet_id}")
        print_row("Sheet", config.google_sheet_name)
        print_row("Destination", f"Supabase: {config.supabase_url}")
        print_row("Source Rows", str(len(source_rows)))

    # Run QA pipeline
    qa = QAPipeline(supabase_client, quality_threshold=0.95)
    report = qa.run_all(source_rows=source_rows, sample_size=sample_size)

    if json_only:
        print(json.dumps(report, indent=2, default=str))
        return report

    # Display results
    print_header("VERIFICATION RESULTS")

    overall = "PASS" if report["overall_pass"] else "FAIL"
    print_row("Overall Status", overall, "PASS" if report["overall_pass"] else "FAIL")
    print_row("Accuracy", f"{report['accuracy'] * 100:.1f}%")
    print_row("Threshold", f"{report['threshold'] * 100:.1f}%")
    print_row("Source Rows", str(report["source_rows"]))

    print_section("CHECK RESULTS")
    for r in report["results"]:
        status = (
            "PASS"
            if r["passed"]
            else ("WARN" if r["severity"] == "warning" else "FAIL")
        )
        print_row(r["name"], r["details"], status)

    print_section("DATABASE TABLE COUNTS")
    tables = ["leads", "call_analytics", "deals", "tasks", "interactions", "notes"]
    for table in tables:
        try:
            resp = supabase_client.table(table).select("id", count="exact").execute()
            count = resp.count if resp.count is not None else "N/A"
            print_row(table, str(count))
        except Exception as e:
            print_row(table, f"Error: {e}", "ERROR")

    print_section("SAMPLE RECORDS")
    try:
        analytics = (
            supabase_client.table("call_analytics")
            .select("*")
            .limit(sample_size)
            .execute()
        )
        for i, row in enumerate(analytics.data or []):
            print(f"\n  Record {i + 1}:")
            print_row("  Session ID", str(row.get("session_id", "N/A")))
            print_row("  Date", str(row.get("call_date", "N/A")))
            print_row("  Sentiment", str(row.get("sentiment", "N/A")))
            print_row("  Outcome", str(row.get("call_outcome", "N/A")))
            print_row("  Quality Score", str(row.get("call_quality_score", "N/A")))
            print_row("  Duration", f"{row.get('duration_sec', 0)}s")
    except Exception as e:
        print(f"  Error fetching sample: {e}")

    print_section("SUMMARY")
    if report["overall_pass"]:
        print("  Migration verification PASSED.")
        print(
            f"  Accuracy: {report['accuracy'] * 100:.1f}% (threshold: {report['threshold'] * 100:.1f}%)"
        )
        print(f"  {report['passed']} of {report['total_checks']} checks passed.")
    else:
        print("  Migration verification FAILED.")
        print(
            f"  Accuracy: {report['accuracy'] * 100:.1f}% (threshold: {report['threshold'] * 100:.1f}%)"
        )
        print(f"  {report['failed']} checks failed, {report['warnings']} warnings.")
        print("  Review failed checks above and re-run migration if needed.")

    print()
    print("=" * 70)
    print()

    return report


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="CRM Migration Verification Console")
    parser.add_argument(
        "--sample", type=int, default=10, help="Sample size for accuracy check"
    )
    parser.add_argument("--json", action="store_true", help="Output JSON only")
    args = parser.parse_args()

    try:
        report = run_verification(sample_size=args.sample, json_only=args.json)
        sys.exit(0 if report["overall_pass"] else 1)
    except Exception as e:
        logger.error("Verification crashed: %s", e, exc_info=True)
        print(f"\nERROR: {e}")
        sys.exit(2)


if __name__ == "__main__":
    main()
