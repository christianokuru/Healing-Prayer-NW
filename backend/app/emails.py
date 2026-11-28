"""Queue emails in the outbox. Never put prayer points in here."""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, col, delete, select

from app import clock
from app.config import get_settings
from app.models import Booking, EmailKind, Mode, OutboxEmail, Person, Role, User
from app.schedule import SESSION_LENGTH, format_day, format_slot
from app.security import manage_token

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


def _place(booking: Booking) -> str:
    """Where the session happens, as a calendar location."""
    if booking.mode is Mode.online:
        return booking.zoom_link or "Online (Zoom)"
    return get_settings().ministry_address or "Alberta Bible College, Calgary"


def _where(booking: Booking) -> str:
    """The same, with a label, for the email text."""
    label = "Online" if booking.mode is Mode.online else "Address"
    return f"{label}: {_place(booking)}"


def _manage(booking: Booking) -> str:
    """The visitor's private link to see or cancel this booking."""
    return (
        "To see your booking, or cancel it, use your private link "
        "(please don't share it):\n"
        f"{_link(f'/manage/{manage_token(booking.id)}')}"
    )


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
        f"LOCATION:{_escape_ics(_place(booking))}",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return "\r\n".join(_fold_ics(line) for line in lines) + "\r\n"


# --- Prayer minister sign-in


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


# --- Bookings (visitors have no accounts: email is how we reach them)


def new_request(session: Session, booking: Booking, person: Person) -> None:
    when = format_slot(booking.slot_start)
    _queue(
        session,
        person.email,
        "We received your request",
        f"Hello {person.full_name},\n\nThank you. We received your request for "
        f"{when}. Your time is held for you while the prayer minister reviews it, "
        f"and we'll email you as soon as it's answered.\n\n{_manage(booking)}",
        booking=booking,
    )
    for admin in _admin_emails(session):
        _queue(
            session,
            admin,
            "New prayer session request",
            f"{person.full_name} asked for {when}.\n\nAnswer it here: {_link('/admin')}",
            booking=booking,
        )


def approved(session: Session, booking: Booking, person: Person) -> None:
    _queue(
        session,
        person.email,
        "Your prayer session is confirmed",
        f"Hello {person.full_name},\n\nYour session is confirmed for "
        f"{format_slot(booking.slot_start)}.\n\n{_where(booking)}\n\n"
        "The attached file adds it to your calendar.\n\n"
        f"{_manage(booking)}",
        booking=booking,
        kind=EmailKind.decision,
        ics=_ics(booking),
    )


def declined(session: Session, booking: Booking, person: Person) -> None:
    note = f"\n\n{booking.decline_message}" if booking.decline_message else ""
    _queue(
        session,
        person.email,
        "About your prayer session request",
        f"Hello {person.full_name},\n\nThank you for reaching out. We're sorry, we "
        f"can't meet on {format_slot(booking.slot_start)}.{note}\n\n"
        f"You're welcome to choose another Thursday: {_link('/book')}",
        booking=booking,
        kind=EmailKind.decision,
    )


def cancelled(session: Session, booking: Booking, person: Person) -> None:
    """Confirms a cancellation the visitor made from their link."""
    _queue(
        session,
        person.email,
        "Your prayer session is cancelled",
        f"Hello {person.full_name},\n\nAs you asked, your session on "
        f"{format_slot(booking.slot_start)} is cancelled. You're welcome to book "
        f"again whenever you like: {_link('/book')}",
        booking=booking,
    )


def follow_up(
    session: Session, booking: Booking, person: Person, subject: str, message: str
) -> None:
    """The minister's own words to someone who missed their session."""
    _queue(session, person.email, subject, message, booking=booking)


def late_notice(
    session: Session, booking: Booking, person: Person, message: str | None
) -> None:
    note = f"\n\nTheir message:\n{message}" if message else ""
    for admin in _admin_emails(session):
        _queue(
            session,
            admin,
            "A visitor can't make it",
            f"{person.full_name} can't make it on "
            f"{format_slot(booking.slot_start)}.{note}",
            booking=booking,
        )


def thursday_cancelled(session: Session, day: date, person: Person) -> None:
    _queue(
        session,
        person.email,
        "Your prayer session was cancelled",
        f"Hello {person.full_name},\n\nWe're sorry: there are no sessions on "
        f"{format_day(day)}, so yours has been cancelled.\n\n"
        f"Please choose another date: {_link('/book')}",
    )


# --- Scheduled


def reminder(session: Session, booking: Booking, person: Person) -> None:
    _queue_once(
        session,
        f"reminder:{booking.id}",
        person.email,
        "Your prayer session is tomorrow",
        f"Hello {person.full_name},\n\nA reminder of your session on "
        f"{format_slot(booking.slot_start)}.\n\n{_where(booking)}\n\n"
        f"Can't come? Please let us know: {_link(f'/manage/{manage_token(booking.id)}')}",
    )


def pending_digest(
    session: Session, day: date, waiting: list[tuple[Booking, Person]]
) -> None:
    rows = "\n".join(
        f"- {format_slot(booking.slot_start)}: {person.full_name}"
        for booking, person in waiting
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
