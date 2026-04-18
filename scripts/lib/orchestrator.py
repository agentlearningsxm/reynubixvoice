"""Pipeline orchestrator with state machine, circuit breaker, and quality gates.

Manages the full CRM migration pipeline:
  Extract (Google Sheets) -> Transform (Groq AI) -> Load (Supabase)

Implements professional ETL patterns:
  - Pipeline state machine with explicit phase transitions
  - Circuit breaker for API failure resilience
  - Quality gates between phases
  - Checkpoint/resume capability
  - Comprehensive progress reporting
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Optional

from .logger import get_logger

logger = get_logger(__name__)


class PhaseState(Enum):
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"


class PipelinePhase(Enum):
    EXTRACT = "extract"
    TRANSFORM = "transform"
    VALIDATE = "validate"
    LOAD = "load"
    VERIFY = "verify"


@dataclass
class PhaseResult:
    state: PhaseState
    data: Any = None
    error: Optional[str] = None
    metrics: dict = field(default_factory=dict)
    duration_sec: float = 0.0


@dataclass
class Checkpoint:
    """Serializable checkpoint for resume capability."""

    phase: str
    row_index: int
    total_rows: int
    stats: dict
    timestamp: str
    results: list[dict] = field(default_factory=list)


class CircuitBreaker:
    """Circuit breaker pattern for API resilience.

    If error rate exceeds threshold, opens the circuit and stops
    making requests until cooldown period expires.
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        error_rate_threshold: float = 0.10,
        cooldown_sec: float = 30.0,
        window_size: int = 20,
    ) -> None:
        self._failure_threshold = failure_threshold
        self._error_rate_threshold = error_rate_threshold
        self._cooldown_sec = cooldown_sec
        self._window_size = window_size
        self._failures = 0
        self._total = 0
        self._window: list[bool] = []
        self._opened_at: Optional[float] = None
        self._state = "closed"

    @property
    def state(self) -> str:
        return self._state

    def record_success(self) -> None:
        self._total += 1
        self._window.append(True)
        if len(self._window) > self._window_size:
            self._window.pop(0)
        if self._state == "half-open":
            self._state = "closed"
            self._failures = 0
            logger.info("Circuit breaker CLOSED - service recovered")

    def record_failure(self) -> None:
        self._total += 1
        self._failures += 1
        self._window.append(False)
        if len(self._window) > self._window_size:
            self._window.pop(0)

        error_rate = (
            self._window.count(False) / len(self._window) if self._window else 0
        )

        if (
            self._failures >= self._failure_threshold
            or error_rate >= self._error_rate_threshold
        ):
            self._state = "open"
            self._opened_at = time.monotonic()
            logger.error(
                "Circuit breaker OPENED - failures=%d, error_rate=%.2f",
                self._failures,
                error_rate,
            )

    def can_execute(self) -> bool:
        if self._state == "closed":
            return True
        if self._state == "open":
            if (
                self._opened_at
                and (time.monotonic() - self._opened_at) > self._cooldown_sec
            ):
                self._state = "half-open"
                logger.info("Circuit breaker HALF-OPEN - testing recovery")
                return True
            return False
        return True

    def reset(self) -> None:
        self._failures = 0
        self._total = 0
        self._window = []
        self._opened_at = None
        self._state = "closed"

    @property
    def stats(self) -> dict:
        error_rate = (
            self._window.count(False) / len(self._window) if self._window else 0.0
        )
        return {
            "state": self._state,
            "total_calls": self._total,
            "failures": self._failures,
            "error_rate": round(error_rate, 3),
            "window_size": len(self._window),
        }


class PipelineOrchestrator:
    """Manages the full CRM migration pipeline with quality gates.

    Usage:
        orchestrator = PipelineOrchestrator(checkpoint_path="...")
        orchestrator.add_phase("extract", extract_fn)
        orchestrator.add_phase("transform", transform_fn, quality_gate=0.95)
        result = orchestrator.run()
    """

    def __init__(
        self,
        checkpoint_path: Optional[str] = None,
        quality_threshold: float = 0.95,
        circuit_breaker: Optional[CircuitBreaker] = None,
    ) -> None:
        self._phases: list[tuple[str, Callable, float]] = []
        self._checkpoint_path = Path(checkpoint_path) if checkpoint_path else None
        self._quality_threshold = quality_threshold
        self._circuit_breaker = circuit_breaker or CircuitBreaker()
        self._results: list[PhaseResult] = []
        self._start_time: Optional[float] = None
        self._checkpoint_data: Optional[Checkpoint] = None

    def add_phase(
        self,
        name: str,
        fn: Callable,
        quality_gate: float = 0.0,
    ) -> None:
        """Add a phase to the pipeline.

        Args:
            name: Phase identifier.
            fn: Callable that returns PhaseResult.
            quality_gate: Minimum quality score (0.0-1.0) to pass. 0.0 = no gate.
        """
        self._phases.append((name, fn, quality_gate))
        logger.info("Phase added: %s (quality_gate=%.2f)", name, quality_gate)

    def run(self, resume: bool = False) -> dict:
        """Execute all phases in sequence with quality gates.

        Args:
            resume: If True, attempt to resume from last checkpoint.

        Returns:
            Dict with overall success status, phase results, and stats.
        """
        self._start_time = time.monotonic()
        logger.info("Pipeline starting - %d phases", len(self._phases))

        start_phase = 0
        if resume and self._checkpoint_path and self._checkpoint_path.exists():
            self._checkpoint_data = self._load_checkpoint()
            if self._checkpoint_data:
                logger.info(
                    "Resuming from checkpoint: phase=%s, row=%d/%d",
                    self._checkpoint_data.phase,
                    self._checkpoint_data.row_index,
                    self._checkpoint_data.total_rows,
                )
                phase_names = [p[0] for p in self._phases]
                if self._checkpoint_data.phase in phase_names:
                    start_phase = phase_names.index(self._checkpoint_data.phase)

        for i, (name, fn, quality_gate) in enumerate(self._phases):
            if i < start_phase:
                logger.info("Skipping completed phase: %s", name)
                continue

            logger.info("=== Phase %d/%d: %s ===", i + 1, len(self._phases), name)

            phase_result = self._execute_phase(name, fn, quality_gate)
            self._results.append(phase_result)

            if phase_result.state == PhaseState.FAILED:
                logger.error("Pipeline FAILED at phase: %s", name)
                self._save_checkpoint(name)
                return self._build_report(success=False)

            if phase_result.state == PhaseState.PASSED:
                logger.info("Phase PASSED: %s (%.1fs)", name, phase_result.duration_sec)

        logger.info("Pipeline COMPLETED in %.1fs", time.monotonic() - self._start_time)
        return self._build_report(success=True)

    def _execute_phase(
        self, name: str, fn: Callable, quality_gate: float
    ) -> PhaseResult:
        start = time.monotonic()
        try:
            result = fn()

            if not isinstance(result, PhaseResult):
                result = PhaseResult(
                    state=PhaseState.PASSED if result else PhaseState.FAILED,
                    data=result,
                )

            result.duration_sec = time.monotonic() - start

            if result.state == PhaseState.PASSED and quality_gate > 0:
                quality = result.metrics.get(
                    "quality_score", result.metrics.get("accuracy", 1.0)
                )
                if quality < quality_gate:
                    logger.error(
                        "Quality gate FAILED for %s: score=%.3f < threshold=%.3f",
                        name,
                        quality,
                        quality_gate,
                    )
                    result.state = PhaseState.FAILED
                    result.error = f"Quality score {quality:.3f} below threshold {quality_gate:.3f}"

            return result

        except Exception as e:
            duration = time.monotonic() - start
            logger.error(
                "Phase %s crashed after %.1fs: %s", name, duration, e, exc_info=True
            )
            self._circuit_breaker.record_failure()
            return PhaseResult(
                state=PhaseState.FAILED,
                error=str(e),
                duration_sec=duration,
            )

    def _save_checkpoint(self, current_phase: str) -> None:
        if not self._checkpoint_path:
            return
        try:
            cp = Checkpoint(
                phase=current_phase,
                row_index=0,
                total_rows=0,
                stats=self._build_report(success=False),
                timestamp=time.strftime("%Y-%m-%dT%H:%M:%S"),
            )
            self._checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
            self._checkpoint_path.write_text(
                json.dumps(cp.__dict__, default=str, indent=2)
            )
            logger.info("Checkpoint saved: %s", self._checkpoint_path)
        except Exception as e:
            logger.error("Failed to save checkpoint: %s", e)

    def _load_checkpoint(self) -> Optional[Checkpoint]:
        if not self._checkpoint_path or not self._checkpoint_path.exists():
            return None
        try:
            data = json.loads(self._checkpoint_path.read_text())
            return Checkpoint(**data)
        except Exception as e:
            logger.error("Failed to load checkpoint: %s", e)
            return None

    def _build_report(self, success: bool) -> dict:
        total_duration = time.monotonic() - self._start_time if self._start_time else 0
        return {
            "success": success,
            "total_duration_sec": round(total_duration, 2),
            "phases": [
                {
                    "name": name,
                    "state": r.state.value,
                    "duration_sec": round(r.duration_sec, 2),
                    "error": r.error,
                    "metrics": r.metrics,
                }
                for (name, _, _), r in zip(self._phases, self._results)
            ],
            "circuit_breaker": self._circuit_breaker.stats,
            "quality_threshold": self._quality_threshold,
        }

    @property
    def circuit_breaker(self) -> CircuitBreaker:
        return self._circuit_breaker

    @property
    def results(self) -> list[PhaseResult]:
        return self._results.copy()
