import uuid
from datetime import timedelta

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, delete, select

from app import clock, emails
from app.errors import AppError, ErrorCode
from app.models import AuthSession, EmailCode, PasswordReset, User
from app.schemas import SignupRequest
from app.security import (
    digest,
    hash_password,
    new_code,
    new_token,
    same_digest,
    verify_password,
)

SESSION_LIFETIME = timedelta(days=14)
CODE_LIFETIME = timedelta(minutes=30)
CODE_COOLDOWN = timedelta(seconds=25)  # the UI allows a resend every 30 seconds
MAX_CODE_ATTEMPTS = 5
RESET_LIFETIME = timedelta(hours=1)


def find_by_email(session: Session, email: str) -> User | None:
    return session.exec(select(User).where(User.email == email)).first()


def signup(session: Session, data: SignupRequest) -> User:
    if find_by_email(session, data.email):
        raise AppError(ErrorCode.email_taken)
    user = User(
        email=data.email,
        full_name=data.full_name,
        phone=data.phone,
        password_hash=hash_password(data.password),
    )
    session.add(user)
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        raise AppError(ErrorCode.email_taken) from None
    send_code(session, user)
    session.commit()
    return user


def send_code(session: Session, user: User) -> None:
    now = clock.utcnow()
    # Serialises concurrent sends, so only one code is current.
    session.exec(select(User.id).where(User.id == user.id).with_for_update()).one()
    current = session.get(EmailCode, user.id, populate_existing=True)
    if current and current.created_at > now - CODE_COOLDOWN:
        return
    code = new_code()
    record = current or EmailCode(
        user_id=user.id, code_hash="", created_at=now, expires_at=now
    )
    # Bound to the user, so equal codes don't share a hash.
    record.code_hash = digest(f"{user.id}:{code}")
    record.attempts = 0
    record.created_at = now
    record.expires_at = now + CODE_LIFETIME
    session.add(record)
    emails.verification_code(session, user, code)


def resend_code(session: Session, email: str) -> None:
    user = find_by_email(session, email)
    if user and not user.email_verified:
        send_code(session, user)
        session.commit()


def verify_email(session: Session, email: str, code: str) -> User:
    user = find_by_email(session, email)
    if user is None:
        raise AppError(ErrorCode.not_found, "We couldn't find that account.")
    record = session.exec(
        select(EmailCode).where(EmailCode.user_id == user.id).with_for_update()
    ).first()
    if (
        record is None
        or user.email_verified
        or record.expires_at <= clock.utcnow()
        or record.attempts >= MAX_CODE_ATTEMPTS
    ):
        raise AppError(ErrorCode.invalid_code)
    if not same_digest(f"{user.id}:{code}", record.code_hash):
        record.attempts += 1
        session.commit()
        raise AppError(ErrorCode.invalid_code)
    user.email_verified = True
    session.delete(record)
    return user


def authenticate(session: Session, email: str, password: str) -> User:
    user = find_by_email(session, email)
    if not verify_password(password, user.password_hash if user else None) or not user:
        raise AppError(ErrorCode.invalid_credentials)
    if not user.email_verified:
        send_code(session, user)
        session.commit()
        raise AppError(
            ErrorCode.email_not_verified,
            "Please confirm your email first. We've sent you a code.",
        )
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
    user.email_verified = True  # the link proves they own the inbox
    # Single use, and older links or logins stop working too.
    session.connection().execute(
        delete(PasswordReset).where(col(PasswordReset.user_id) == user.id)
    )
    session.connection().execute(
        delete(EmailCode).where(col(EmailCode.user_id) == user.id)
    )
    end_all_sessions(session, user.id)
    session.commit()
