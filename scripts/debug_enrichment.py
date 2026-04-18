#!/usr/bin/env python3
"""Debug enrichment scoring."""

from lib.config import config
from lib.sheet_reader import SheetReader
from lib.groq_analyzer import GroqAnalyzer
from lib.validator import (
    MigrationValidator,
    VALID_SENTIMENTS,
    VALID_CALL_OUTCOMES,
    VALID_FAILURE_SOURCES,
)

sheet = SheetReader(
    sheet_id=config.google_sheet_id,
    sheet_name=config.google_sheet_name,
    client_id=config.google_client_id,
    client_secret=config.google_client_secret,
    refresh_token=config.google_refresh_token,
)
analyzer = GroqAnalyzer(api_key=config.groq_api_key, model=config.groq_model)
validator = MigrationValidator()

rows = sheet.get_all_rows()
row = rows[0]
analysis = analyzer.analyze_session(row)

print("=== Enrichment Check ===")
print(
    f"validated_sentiment: {analysis.get('validated_sentiment')!r} -> in VALID: {analysis.get('validated_sentiment') in VALID_SENTIMENTS}"
)
print(
    f"validated_outcome: {analysis.get('validated_outcome')!r} -> in VALID: {analysis.get('validated_outcome') in VALID_CALL_OUTCOMES}"
)
print(
    f"validated_failure_source: {analysis.get('validated_failure_source')!r} -> in VALID: {analysis.get('validated_failure_source') in VALID_FAILURE_SOURCES}"
)
qs = analysis.get("validated_quality_score")
print(
    f"validated_quality_score: {qs!r} -> is valid: {isinstance(qs, (int, float)) and 0 <= qs <= 10}"
)
le = analysis.get("lead_extraction")
print(f"lead_extraction: {type(le).__name__} -> is dict: {isinstance(le, dict)}")

result = validator.validate_row_complete(row, analysis)
print(f"\nRequired score: {result['required_score']}")
print(f"Format score: {result['format_score']}")
print(f"Enrichment score: {result['enrichment_score']}")
print(f"Total score: {result['score']}")
print(f"Valid: {result['valid']}")
print(f"Errors: {result['errors']}")
print(f"Warnings: {result['warnings']}")
