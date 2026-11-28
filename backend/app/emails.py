"""Queue emails in the outbox. Never put prayer points in here."""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, col, delete, select

from app import clock
from app.config import get_settings
from app.models import Booking, EmailKind, Mode, OutboxEmail, Role, User
from app.schedule import SESSION_LENGTH, format_day, format_slot

# Long enough for the admin's Undo to withdraw the email.
UNDO_DELAY = timedelta(seconds=10)
SIGN_OFF = "\n\nHealing Prayer Northwest"


def _queue(
    session: Session,
    to: str,
    subject: str,
    body: str,
    *,
    booking: Booking | None = None,
    kind: EmailKind = EmailKind.transactional,
    ics: str | None = None,
) -> None:
    delay = UNDO_DELAY if kind is EmailKind.decision else timedelta()
    session.add(
        OutboxEmail(
            recipient=to,
            subject=subject,
            body=body + SIGN_OFF,
            booking_id=booking.id if booking else None,
            kind=kind,
            ics=ics,
            send_after=clock.utcnow() + delay,
        )
    )


def _queue_once(session: Session, key: str, to: str, subject: str, body: str) -> None:
    session.connection().execute(
        insert(OutboxEmail)
        .values(
            OutboxEmail(
                dedupe_key=key, recipient=to, subject=subject, body=body + SIGN_OFF
            ).model_dump()
        )
        .on_conflict_do_nothing(index_elements=["dedupe_key"])
    )


def withdraw_unsent(session: Session, booking: Booking) -> None:
    """Drop decision emails that a newer change has made untrue."""
    session.connection().execute(
        delete(OutboxEmail).where(
            col(OutboxEmail.booking_id) == booking.id,
            col(OutboxEmail.kind) == EmailKind.decision,
            col(OutboxEmail.sent_at).is_(None),
        )
    )


def _link(path: str) -> str:
    return get_settings().frontend_url + path


def _admin_emails(session: Session) -> list[str]:
    return list(session.exec(select(User.email).where(User.role == Role.admin)))


def _where(booking: Booking) -> str:
    if booking.mode is Mode.online:
        return f"Online: {booking.zoom_link}"
    address = get_settings().ministry_address
    return f"Address: {address}" if address else f"Directions: {_link('/dashboard')}"


def _escape_ics(value: str) -> str:
    for char in ("\\", ";", ","):
        value = value.replace(char, "\\" + char)
    return value.replace("\r", "").replace("\n", "\\n")


def _fold_ics(line: str) -> str:
    """RFC 5545: lines are at most 75 bytes."""
    parts, current = [], b""
    for char in line:
        encoded = char.encode()
        if len(current) + len(encoded) > 74:
            parts.append(current)
            current = b""
        current += encoded
    return "\r\n ".join(p.decode() for p in [*parts, current])


def _ics(booking: Booking) -> str:
    def stamp(moment: datetime) -> str:
        return moment.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Healing Prayer Northwest//EN",
        "BEGIN:VEVENT",
        f"UID:{booking.id}@healing-prayer-northwest",
        f"DTSTAMP:{stamp(clock.utcnow())}",
        f"DTSTART:{stamp(booking.slot_start)}",
        f"DTEND:{stamp(booking.slot_start + SESSION_LENGTH)}",
        "SUMMARY:Prayer session",
        f"LOCATION:{_escape_ics(_where(booking))}",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return "\r\n".join(_fold_ics(line) for line in lines) + "\r\n"


# --- Account


def verification_code(session: Session, user: User, code: str) -> None:
    _queue(
        session,
        user.email,
        "Your confirmation code",
        f"Hello {user.full_name},\n\nYour confirmation code is {code}.\n"
        "It works for 30 minutes.",
    )


def password_reset(session: Session, user: User, token: str) -> None:
    _queue(
        session,
        user.email,
        "Reset your password",
        f"Hello {user.full_name},\n\nChoose a new password here:\n"
        f"{_link(f'/reset-password?token={token}')}\n\n"
        "The link works once, for one hour. If you didn't ask for it, "
        "you can ignore this email.",
    )


# --- Bookings


def new_request(session: Session, booking: Booking, visitor: User) -> None:
    when = format_slot(booking.slot_start)
    _queue(
        session,
        visitor.email,
        "We received your request",
        f"Hello {visitor.full_name},\n\nWe received your request for {when}. "
        "It is waiting for approval, and we'll email you as soon as it's answered.",
        booking=booking,
    )
    for admin in _admin_emails(session):
        _queue(
            session,
            admin,
            "New prayer session request",
            f"{visitor.full_name} asked for {when}.\n\nAnswer it here: {_link('/admin')}",
            booking=booking,
        )


def approved(session: Session, booking: Booking, visitor: User) -> None:
    _queue(
        session,
        visitor.email,
        "Your prayer session is confirmed",
        f"Hello {visitor.full_name},\n\nYour session is confirmed for "
        f"{format_slot(booking.slot_start)}.\n\n{_where(booking)}\n\n"
        "The attached file adds it to your calendar.",
        booking=booking,
        kind=EmailKind.decision,
        ics=_ics(booking),
    )


def declined(session: Session, booking: Booking, visitor: User) -> None:
    note = f"\n\n{booking.decline_message}" if booking.decline_message else ""
    stands = (
        "\n\nYour original session has not changed." if booking.reschedule_of_id else ""
    )
    _queue(
        session,
        visitor.email,
        "About your prayer session request",
        f"Hello {visitor.full_name},\n\nThank you for reaching out. We're sorry, we "
        f"can't meet on {format_slot(booking.slot_start)}.{note}{stands}\n\n"
        f"You're welcome to choose another Thursday: {_link('/dashboard/book')}",
        booking=booking,
        kind=EmailKind.decision,
    )


NO_SHOW_SUBJECT = "We missed you"


def no_show_already_sent(session: Session, booking: Booking) -> bool:
    """So switching attendance back and forth never emails someone twice."""
    return (
        session.exec(
            select(OutboxEmail.id).where(
                col(OutboxEmail.booking_id) == booking.id,
                col(OutboxEmail.subject) == NO_SHOW_SUBJECT,
                col(OutboxEmail.sent_at).is_not(None),
            )
        ).first()
        is not None
    )


def no_show(session: Session, booking: Booking, visitor: User) -> None:
    _queue(
        session,
        visitor.email,
        NO_SHOW_SUBJECT,
        f"Hello {visitor.full_name},\n\nWe missed you at your prayer session and hope "
        "you're well. You're welcome to book another time whenever you're ready: "
        f"{_link('/dashboard/book')}",
        booking=booking,
        kind=EmailKind.decision,
    )


def late_notice(
    session: Session, booking: Booking, visitor: User, message: str | None
) -> None:
    note = f"\n\nTheir message:\n{message}" if message else ""
    for admin in _admin_emails(session):
        _queue(
            session,
            admin,
            "A visitor can't make it",
            f"{visitor.full_name} can't make it on "
            f"{format_slot(booking.slot_start)}.{note}",
            booking=booking,
        )


def thursday_cancelled(session: Session, day: date, visitor: User) -> None:
    _queue(
        session,
        visitor.email,
        "Your prayer session was cancelled",
        f"Hello {visitor.full_name},\n\nWe're sorry: there are no sessions on "
        f"{format_day(day)}, so yours has been cancelled.\n\n"
        f"Please choose another date: {_link('/dashboard/book')}",
    )


# --- Scheduled


def reminder(session: Session, booking: Booking, visitor: User) -> None:
    _queue_once(
        session,
        f"reminder:{booking.id}",
        visitor.email,
        "Your prayer session is tomorrow",
        f"Hello {visitor.full_name},\n\nA reminder of your session on "
        f"{format_slot(booking.slot_start)}.\n\n{_where(booking)}",
    )


def pending_digest(
    session: Session, day: date, waiting: list[tuple[Booking, User]]
) -> None:
    rows = "\n".join(
        f"- {format_slot(booking.slot_start)}: {visitor.full_name}"
        for booking, visitor in waiting
    )
    for admin in _admin_emails(session):
        _queue_once(
            session,
            f"digest:{day}:{admin}",
            admin,
            f"Requests waiting: {len(waiting)}",
            f"These requests are still waiting:\n\n{rows}\n\n"
            f"Answer them here: {_link('/admin')}",
        )
