"""The single source of "now", so tests can move time."""

from datetime import UTC, datetime


def utcnow() -> datetime:
    return datetime.now(UTC)
