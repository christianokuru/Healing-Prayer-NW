"""Booking rules. Visitors have no accounts: they book with their contact
details, are recognised by email, and manage a booking through a private link.
"""

import datetime as dt
import uuid
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select

from app import clock, emails
from app.errors import AppError, ErrorCode
from app.models import (
    ACTIVE,
    ATTENDANCE,
    HOLDS_SLOT,
    BlockedDate,
    Booking,
    BookingStatus,
    Mode,
    Person,
)
from app.schedule import (
    NOTICE,
    THURSDAY,
    in_window,
    is_slot,
    local_date,
    slots_on,
    upcoming_thursdays,
)
from app.schemas import (
    BookingCreate,
    CreatedBooking,
    DayState,
    ManagedBooking,
    SlotAvailability,
    SlotState,
    ThursdayAvailability,
)
from app.security import booking_id_from_token, manage_token

_LOCK_ID = 4_158_201


def _lock(session: Session) -> None:
    """Run booking changes one at a time until commit.

    There are four slots a week, so one lock is simpler than several and cannot
    deadlock. The unique indexes remain the last line of defence.
    """
    session.connection().execute(select(func.pg_advisory_xact_lock(_LOCK_ID)))


def _commit(session: Session, booking: Booking) -> Booking:
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise AppError(ErrorCode.slot_taken) from None
    session.refresh(booking)
    return booking


def _set_status(session: Session, booking: Booking, status: BookingStatus) -> None:
    booking.status = status
    booking.updated_at = clock.utcnow()
    # Emails about the previous status that haven't gone out are now untrue.
    emails.withdraw_unsent(session, booking)


def _get(session: Session, booking_id: uuid.UUID) -> Booking:
    booking = session.get(Booking, booking_id, populate_existing=True)
    if booking is None:
        raise AppError(ErrorCode.not_found)
    return booking


def _person(session: Session, booking: Booking) -> Person:
    return session.get_one(Person, booking.person_id)


def _holder(session: Session, slot: datetime) -> Booking | None:
    return session.exec(
        select(Booking).where(
            Booking.slot_start == slot, col(Booking.status).in_(HOLDS_SLOT)
        )
    ).first()


def _has_active_on(
    session: Session, person_id: uuid.UUID, day: dt.date, ignore: uuid.UUID | None
) -> bool:
    found = session.exec(
        select(Booking.id).where(
            Booking.person_id == person_id,
            Booking.session_date == day,
            col(Booking.status).in_(ACTIVE),
        )
    )
    return any(booking_id != ignore for booking_id in found)


def _find_person(session: Session, email: str) -> Person | None:
    return session.exec(select(Person).where(Person.email == email)).first()


def _check_requestable(session: Session, person: Person | None, slot: datetime) -> None:
    day = local_date(slot)
    if not is_slot(slot):
        raise AppError(
            ErrorCode.validation, "Please choose one of the available times."
        )
    if session.get(BlockedDate, day):
        raise AppError(ErrorCode.date_unavailable)
    if not in_window(slot, clock.utcnow()):
        raise AppError(ErrorCode.outside_window)
    holder = _holder(session, slot)
    # Their own slot again is "one per Thursday", which explains it better.
    if holder and (person is None or holder.person_id != person.id):
        raise AppError(ErrorCode.slot_taken)
    if person and _has_active_on(session, person.id, day, None):
        raise AppError(ErrorCode.one_per_thursday)


def to_managed(booking: Booking, person: Person) -> ManagedBooking:
    return ManagedBooking(
        id=booking.id,
        slot_start=booking.slot_start,
        status=booking.status,
        mode=booking.mode,
        full_name=person.full_name,
        email=person.email,
        prayer_points=booking.prayer_points,
        # Only once approved: a declined or cancelled session has no meeting.
        zoom_link=booking.zoom_link
        if booking.status is BookingStatus.confirmed
        else None,
        decline_message=booking.decline_message,
        late_cancellation=booking.late_cancellation,
    )


# --- Public


def availability(session: Session) -> list[ThursdayAvailability]:
    """Every bookable Thursday. Never says who holds a slot, only if it's open."""
    now = clock.utcnow()
    days = upcoming_thursdays(now)
    blocked = set(
        session.exec(
            select(col(BlockedDate.date)).where(col(BlockedDate.date).in_(days))
        )
    )
    held = set(
        session.exec(
            select(col(Booking.slot_start)).where(
                col(Booking.session_date).in_(days),
                col(Booking.status).in_(HOLDS_SLOT),
            )
        )
    )
    result = []
    for day in days:
        is_blocked = day in blocked
        slots = [
            SlotAvailability(
                start=start,
                state=SlotState.taken
                if start in held or is_blocked or not in_window(start, now)
                else SlotState.open,
            )
            for start in slots_on(day)
        ]
        free = sum(s.state is SlotState.open for s in slots)
        if is_blocked:
            state = DayState.cancelled
        elif not any(in_window(s.start, now) for s in slots):
            state = DayState.closed
        elif not free:
            state = DayState.full
        else:
            state = DayState.open
        result.append(
            ThursdayAvailability(
                date=day,
                state=state,
                open_count=free if state is DayState.open else 0,
                slots=slots,
            )
        )
    return result


def create(session: Session, data: BookingCreate) -> CreatedBooking:
    _lock(session)
    person = _find_person(session, data.email)
    _check_requestable(session, person, data.slot_start)
    now = clock.utcnow()
    if person is None:
        person = Person(email=data.email, full_name=data.full_name, phone=data.phone)
        session.add(person)
    else:
        # Keep their latest details; the email address identifies them.
        person.full_name = data.full_name
        person.phone = data.phone
        person.updated_at = now
    session.flush()
    booking = Booking(
        person_id=person.id,
        slot_start=data.slot_start,
        session_date=local_date(data.slot_start),
        mode=Mode.online if data.online else Mode.in_person,
        prayer_points=data.prayer_points,
        online_reason=data.online_reason,
    )
    session.add(booking)
    session.flush()
    emails.new_request(session, booking, person)
    booking = _commit(session, booking)
    session.refresh(person)
    return CreatedBooking(
        booking=to_managed(booking, person), manage_token=manage_token(booking.id)
    )


def _by_token(session: Session, token: str) -> tuple[Booking, Person]:
    booking_id = booking_id_from_token(token)
    booking = (
        session.get(Booking, booking_id, populate_existing=True) if booking_id else None
    )
    if booking is None:
        raise AppError(
            ErrorCode.not_found,
            "We couldn't find that booking. Please open the link from your email again.",
        )
    return booking, _person(session, booking)


def get_managed(session: Session, token: str) -> ManagedBooking:
    return to_managed(*_by_token(session, token))


def cancel(session: Session, token: str) -> ManagedBooking:
    _lock(session)
    booking, person = _by_token(session, token)
    if booking.status not in ACTIVE:
        raise AppError(ErrorCode.invalid_state, "This booking can't be cancelled.")
    if booking.slot_start - clock.utcnow() < NOTICE:
        raise AppError(ErrorCode.too_late)
    _set_status(session, booking, BookingStatus.cancelled)
    emails.cancelled(session, booking, person)
    return to_managed(_commit(session, booking), person)


def late_notice(session: Session, token: str, message: str | None) -> ManagedBooking:
    _lock(session)
    booking, person = _by_token(session, token)
    now = clock.utcnow()
    if booking.status not in ACTIVE or not now < booking.slot_start < now + NOTICE:
        raise AppError(ErrorCode.invalid_state)
    _set_status(session, booking, BookingStatus.cancelled)
    booking.late_cancellation = True
    emails.late_notice(session, booking, person, message)
    return to_managed(_commit(session, booking), person)


# --- Admin


def _pending_future(session: Session, booking_id: uuid.UUID) -> Booking:
    booking = _get(session, booking_id)
    if (
        booking.status is not BookingStatus.pending
        or booking.slot_start <= clock.utcnow()
    ):
        raise AppError(
            ErrorCode.invalid_state, "This request can no longer be answered."
        )
    return booking


def approve(session: Session, booking_id: uuid.UUID, zoom_link: str | None) -> Booking:
    _lock(session)
    booking = _pending_future(session, booking_id)
    if booking.mode is Mode.online:
        if not zoom_link:
            raise AppError(ErrorCode.validation, "Please add the Zoom link.")
        booking.zoom_link = zoom_link
    _set_status(session, booking, BookingStatus.confirmed)
    emails.approved(session, booking, _person(session, booking))
    return _commit(session, booking)


def decline(session: Session, booking_id: uuid.UUID, message: str | None) -> Booking:
    _lock(session)
    booking = _pending_future(session, booking_id)
    _set_status(session, booking, BookingStatus.declined)
    booking.decline_message = message or None
    emails.declined(session, booking, _person(session, booking))
    return _commit(session, booking)


def revert(session: Session, booking_id: uuid.UUID) -> Booking:
    """Undo an approval or decline, back to pending, while the session is ahead."""
    _lock(session)
    booking = _get(session, booking_id)
    if (
        booking.status not in (BookingStatus.confirmed, BookingStatus.declined)
        or booking.slot_start <= clock.utcnow()
    ):
        raise AppError(ErrorCode.invalid_state, "This decision can't be undone.")
    if booking.status is BookingStatus.declined:
        # The slot was released when declined, so it must still be free.
        holder = _holder(session, booking.slot_start)
        if (
            session.get(BlockedDate, booking.session_date)
            or holder
            or _has_active_on(session, booking.person_id, booking.session_date, None)
        ):
            raise AppError(
                ErrorCode.invalid_state,
                "That time is no longer available, so this can't be undone.",
            )
    _set_status(session, booking, BookingStatus.pending)
    booking.zoom_link = None
    booking.decline_message = None
    return _commit(session, booking)


def set_attendance(
    session: Session, booking_id: uuid.UUID, attendance: BookingStatus | None
) -> Booking:
    """Record whether the visitor came (attended / no_show), or clear it (None).

    Allowed from the moment an approved session starts, and can be corrected later.
    No email is sent: the minister writes to people herself (see `follow_up`).
    """
    _lock(session)
    booking = _get(session, booking_id)
    if booking.status not in ATTENDANCE or booking.slot_start > clock.utcnow():
        raise AppError(
            ErrorCode.invalid_state,
            "Attendance can only be recorded for approved sessions that have started.",
        )
    target = attendance or BookingStatus.confirmed
    if booking.status is target:
        return booking
    # Not `_set_status`: recording attendance makes no earlier email untrue.
    booking.status = target
    booking.updated_at = clock.utcnow()
    return _commit(session, booking)


def follow_up(
    session: Session, booking_id: uuid.UUID, subject: str, message: str
) -> Booking:
    """The minister's personal email to someone marked as didn't come."""
    booking = _get(session, booking_id)
    if booking.status is not BookingStatus.no_show:
        raise AppError(
            ErrorCode.invalid_state,
            "You can only email people who were marked as didn't come.",
        )
    emails.follow_up(session, booking, _person(session, booking), subject, message)
    booking.follow_up_sent_at = clock.utcnow()
    session.commit()
    session.refresh(booking)
    return booking


# --- Blocked Thursdays


def list_blocked(session: Session) -> list[BlockedDate]:
    return list(session.exec(select(BlockedDate).order_by(col(BlockedDate.date))).all())


def block_date(
    session: Session, day: dt.date, reason: str | None
) -> tuple[BlockedDate, int]:
    if day.weekday() != THURSDAY:
        raise AppError(ErrorCode.validation, "Please choose a Thursday.")
    _lock(session)
    if session.get(BlockedDate, day):
        raise AppError(ErrorCode.invalid_state, "That Thursday is already cancelled.")
    blocked = BlockedDate(date=day, reason=reason or None)
    session.add(blocked)
    affected = session.exec(
        select(Booking, Person)
        .join(Person, col(Person.id) == col(Booking.person_id))
        .where(
            Booking.session_date == day,
            Booking.slot_start > clock.utcnow(),
            col(Booking.status).in_(ACTIVE),
        )
    ).all()
    for booking, _ in affected:
        _set_status(session, booking, BookingStatus.cancelled_by_minister)
    for person in {person.id: person for _, person in affected}.values():
        emails.thursday_cancelled(session, day, person)
    session.commit()
    session.refresh(blocked)
    return blocked, len(affected)


def unblock_date(session: Session, day: dt.date) -> None:
    _lock(session)
    blocked = session.get(BlockedDate, day)
    if blocked is None:
        raise AppError(ErrorCode.not_found)
    session.delete(blocked)
    session.commit()
