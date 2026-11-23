"""Sends queued emails and runs the daily jobs: `python -m app.worker`.

Safe to run more than once: rows are locked and daily emails are deduplicated.
"""

import logging
import smtplib
import ssl
import sys
import time
from datetime import timedelta
from email.message import EmailMessage

from sqlmodel import Session, col, delete, select

from app import clock, emails
from app.config import get_settings
from app.db import get_engine
from app.models import (
    AuthSession,
    Booking,
    BookingStatus,
    EmailCode,
    OutboxEmail,
    PasswordReset,
    RateLimitWindow,
    User,
)
from app.schedule import TZ

logger = logging.getLogger("app.worker")

POLL_SECONDS = 3
JOBS_EVERY_SECONDS = 300
REMINDERS_FROM_HOUR = 9
DIGEST_HOURS = range(8, 12)
MAX_ATTEMPTS = 8


def deliver(email: OutboxEmail) -> None:
    settings = get_settings()
    if not settings.smtp_host:  # only allowed in development
        print(f"--- To: {email.recipient}\n{email.subject}\n\n{email.body}\n")
        return
    message = EmailMessage()
    message["From"] = settings.email_from
    message["To"] = email.recipient
    message["Subject"] = email.subject
    message.set_content(email.body)
    if email.ics:
        message.add_attachment(
            email.ics.encode(),
            maintype="text",
            subtype="calendar",
            filename="prayer-session.ics",
        )
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
        smtp.starttls(context=ssl.create_default_context())
        if settings.smtp_username and settings.smtp_password:
            smtp.login(
                settings.smtp_username, settings.smtp_password.get_secret_value()
            )
        smtp.send_message(message)


def send_next(session: Session) -> bool:
    """Send one due email. Returns False when there is nothing left to do."""
    now = clock.utcnow()
    email = session.exec(
        select(OutboxEmail)
        .where(
            col(OutboxEmail.sent_at).is_(None),
            OutboxEmail.send_after <= now,
            OutboxEmail.attempts < MAX_ATTEMPTS,
        )
        .order_by(col(OutboxEmail.send_after))
        .limit(1)
        .with_for_update(skip_locked=True)
    ).first()
    if email is None:
        session.rollback()
        return False
    try:
        deliver(email)
    except Exception as error:
        # Log no content or recipient: only what is needed to find the row.
        logger.error("Email %s failed: %s", email.id, type(error).__name__)
        email.attempts += 1
        email.send_after = now + timedelta(seconds=30 * 2**email.attempts)
    else:
        email.sent_at = clock.utcnow()
        email.body = ""
        email.ics = None
    session.commit()
    return True


def queue_reminders(session: Session) -> None:
    local = clock.utcnow().astimezone(TZ)
    if local.hour < REMINDERS_FROM_HOUR:
        return
    for booking, visitor in session.exec(
        select(Booking, User)
        .join(User, col(User.id) == col(Booking.user_id))
        .where(
            Booking.session_date == local.date() + timedelta(days=1),
            Booking.status == BookingStatus.confirmed,
        )
    ).all():
        emails.reminder(session, booking, visitor)
    session.commit()


def queue_digest(session: Session) -> None:
    now = clock.utcnow()
    local = now.astimezone(TZ)
    if local.hour not in DIGEST_HOURS:
        return
    waiting = session.exec(
        select(Booking, User)
        .join(User, col(User.id) == col(Booking.user_id))
        .where(Booking.status == BookingStatus.pending, Booking.slot_start > now)
        .order_by(col(Booking.slot_start))
    ).all()
    if waiting:
        emails.pending_digest(session, local.date(), list(waiting))
        session.commit()


def clean_up(session: Session) -> None:
    """Expired logins and codes only. Bookings and people are kept."""
    now = clock.utcnow()
    for model in (AuthSession, EmailCode, PasswordReset, RateLimitWindow):
        session.connection().execute(delete(model).where(col(model.expires_at) < now))
    session.commit()


def run_jobs(session: Session) -> None:
    queue_reminders(session)
    queue_digest(session)
    clean_up(session)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    once = "--once" in sys.argv
    next_jobs = 0.0
    while True:
        try:
            with Session(get_engine()) as session:
                if time.monotonic() >= next_jobs:
                    run_jobs(session)
                    next_jobs = time.monotonic() + JOBS_EVERY_SECONDS
                while send_next(session):
                    pass
        except Exception:
            if once:
                raise
            logger.exception("Worker iteration failed")
        if once:
            return
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
