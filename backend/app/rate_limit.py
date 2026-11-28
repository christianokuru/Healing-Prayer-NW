"""Fixed-window limits stored in PostgreSQL, shared by every API process."""

from datetime import UTC, datetime

from fastapi import Request
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, col

from app import clock
from app.errors import AppError, ErrorCode
from app.models import RateLimitWindow
from app.security import digest


def client_ip(request: Request) -> str:
    """Only the real visitor's IP if the BFF forwards X-Forwarded-For (see README)."""
    return request.client.host if request.client else "unknown"


def hit(session: Session, action: str, subject: str, limit: int, seconds: int) -> None:
    """Count an attempt. Commits, so failed requests count too."""
    now = int(clock.utcnow().timestamp())
    window = now // seconds
    statement = (
        insert(RateLimitWindow)
        .values(
            key=digest(f"{action}:{subject}"),
            window=window,
            count=1,
            expires_at=datetime.fromtimestamp((window + 1) * seconds, UTC),
        )
        .on_conflict_do_update(
            index_elements=["key", "window"],
            set_={"count": col(RateLimitWindow.count) + 1},
        )
        .returning(col(RateLimitWindow.count))
    )
    count = session.connection().execute(statement).scalar_one()
    session.commit()
    if count > limit:
        retry_after = (window + 1) * seconds - now
        raise AppError(
            ErrorCode.rate_limited, headers={"Retry-After": str(retry_after)}
        )
