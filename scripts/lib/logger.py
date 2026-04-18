"""Structured logging for the CRM migration system.

Uses only the Python standard library.  Logs to both console and a file
at scripts/logs/migration.log (directory created automatically).
"""

import logging
import os
import sys
from pathlib import Path


_LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
_LOG_FILE = _LOG_DIR / "migration.log"

# Ensure the log directory exists
_LOG_DIR.mkdir(parents=True, exist_ok=True)

_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_DATE_FMT = "%Y-%m-%d %H:%M:%S"


def _make_console_handler(level: int = logging.INFO) -> logging.StreamHandler:  # type: ignore[type-arg]
    """Return a console handler with UTF-8 encoding."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(_FORMAT, datefmt=_DATE_FMT))
    return handler


def _make_file_handler(level: int = logging.INFO) -> logging.FileHandler:
    """Return a file handler that appends to migration.log."""
    handler = logging.FileHandler(_LOG_FILE, encoding="utf-8")
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(_FORMAT, datefmt=_DATE_FMT))
    return handler


def setup_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """Create and return a logger with console + file handlers.

    Parameters
    ----------
    name:
        Logger name (typically ``__name__`` of the calling module).
    level:
        Minimum severity to emit (default ``logging.INFO``).

    Returns
    -------
    logging.Logger
        Configured logger instance.
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Avoid adding duplicate handlers if setup_logger is called multiple times
    if not logger.handlers:
        logger.addHandler(_make_console_handler(level))
        logger.addHandler(_make_file_handler(level))

    return logger


def get_logger(name: str) -> logging.Logger:
    """Retrieve an existing logger or create a new one.

    Convenience wrapper around :func:`setup_logger`.

    Parameters
    ----------
    name:
        Logger name.

    Returns
    -------
    logging.Logger
    """
    return setup_logger(name)
