"""The prayer minister's sign-in. Visitors have no accounts."""

import uuid
from datetime import timedelta

from sqlmodel import Session, col, delete, select

from app import clock, emails
from app.errors import AppError, ErrorCode
from app.models import AuthSession, PasswordReset, User
from app.security import digest, hash_password, new_token, verify_password

SESSION_LIFETIME = timedelta(days=14)
RESET_LIFETIME = timedelta(hours=1)


def find_by_email(session: Session, email: str) -> User | None:
    return session.exec(select(User).where(User.email == email)).first()


def authenticate(session: Session, email: str, password: str) -> User:
    user = find_by_email(session, email)
    if not verify_password(password, user.password_hash if user else None) or not user:
        raise AppError(ErrorCode.invalid_credentials)
    return user


def start_session(session: Session, user: User, previous_token: str | None) -> str:
    """Always a new session ID: one set before login is discarded."""
    if previous_token:
        end_session(session, previous_token)
    token = new_token()
    session.add(
        AuthSession(
            token_hash=digest(token),
            user_id=user.id,
            expires_at=clock.utcnow() + SESSION_LIFETIME,
        )
    )
    return token


def end_session(session: Session, token: str) -> None:
    session.connection().execute(
        delete(AuthSession).where(col(AuthSession.token_hash) == digest(token))
    )


def end_all_sessions(
    session: Session, user_id: uuid.UUID, keep: str | None = None
) -> None:
    statement = delete(AuthSession).where(col(AuthSession.user_id) == user_id)
    if keep:
        statement = statement.where(col(AuthSession.token_hash) != digest(keep))
    session.connection().execute(statement)


def request_password_reset(session: Session, email: str) -> None:
    user = find_by_email(session, email)
    if user is None:
        return
    token = new_token()
    session.add(
        PasswordReset(
            token_hash=digest(token),
            user_id=user.id,
            expires_at=clock.utcnow() + RESET_LIFETIME,
        )
    )
    emails.password_reset(session, user, token)
    session.commit()


def reset_password(session: Session, token: str, password: str) -> None:
    record = session.exec(
        select(PasswordReset)
        .where(PasswordReset.token_hash == digest(token))
        .with_for_update()
    ).first()
    if record is None or record.expires_at <= clock.utcnow():
        raise AppError(ErrorCode.invalid_token)
    user = session.get_one(User, record.user_id)
    user.password_hash = hash_password(password)
    # Single use, and older links or logins stop working too.
    session.connection().execute(
        delete(PasswordReset).where(col(PasswordReset.user_id) == user.id)
    )
    end_all_sessions(session, user.id)
    session.commit()
