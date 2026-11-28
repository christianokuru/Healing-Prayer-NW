"""Booking rules (section 3 of the handoff spec)."""

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
    User,
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
    DayState,
    SlotAvailability,
    SlotState,
    ThursdayAvailability,
)

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


def _get_own(session: Session, user: User, booking_id: uuid.UUID) -> Booking:
    booking = _get(session, booking_id)
    if booking.user_id != user.id:
        raise AppError(ErrorCode.not_found)
    return booking


def _holder(session: Session, slot: datetime) -> Booking | None:
    return session.exec(
        select(Booking).where(
            Booking.slot_start == slot, col(Booking.status).in_(HOLDS_SLOT)
        )
    ).first()


def _has_active_on(
    session: Session, user_id: uuid.UUID, day: dt.date, ignore: set[uuid.UUID]
) -> bool:
    found = session.exec(
        select(Booking.id).where(
            Booking.user_id == user_id,
            Booking.session_date == day,
            col(Booking.status).in_(ACTIVE),
        )
    )
    return any(booking_id not in ignore for booking_id in found)


def _pending_reschedule(session: Session, booking: Booking) -> Booking | None:
    return session.exec(
        select(Booking).where(
            Booking.reschedule_of_id == booking.id,
            Booking.status == BookingStatus.pending,
        )
    ).first()


def _check_requestable(
    session: Session, user: User, slot: datetime, moving: Booking | None = None
) -> None:
    ignore = {moving.id} if moving else set()
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
    if holder and holder.id not in ignore and holder.user_id != user.id:
        raise AppError(ErrorCode.slot_taken)
    if _has_active_on(session, user.id, day, ignore):
        raise AppError(ErrorCode.one_per_thursday)


# --- Visitor


def availability(
    session: Session, user: User, exclude_id: uuid.UUID | None
) -> list[ThursdayAvailability]:
    now = clock.utcnow()
    days = upcoming_thursdays(now)
    blocked = set(
        session.exec(
            select(col(BlockedDate.date)).where(col(BlockedDate.date).in_(days))
        )
    )
    by_slot: dict[datetime, Booking] = {}
    mine: dict[dt.date, Booking] = {}
    for booking in session.exec(
        select(Booking)
        .where(col(Booking.session_date).in_(days), col(Booking.status).in_(HOLDS_SLOT))
        .order_by(col(Booking.slot_start))
    ):
        own = booking.user_id == user.id
        if own and booking.id == exclude_id:
            continue
        by_slot[booking.slot_start] = booking
        if own and booking.status in ACTIVE:
            mine.setdefault(booking.session_date, booking)

    result = []
    for day in days:
        is_blocked = day in blocked
        slots = []
        for start in slots_on(day):
            holder = by_slot.get(start)
            if holder and holder.user_id == user.id and holder.status in ACTIVE:
                state = SlotState.mine
            elif holder or is_blocked or not in_window(start, now):
                state = SlotState.taken
            else:
                state = SlotState.open
            slots.append(SlotAvailability(start=start, state=state))
        free = sum(s.state is SlotState.open for s in slots)
        my_booking = mine.get(day)
        if is_blocked:
            day_state = DayState.cancelled
        elif my_booking:
            day_state = DayState.booked_by_me
        elif not any(in_window(s.start, now) for s in slots):
            day_state = DayState.closed
        elif not free:
            day_state = DayState.full
        else:
            day_state = DayState.open
        result.append(
            ThursdayAvailability(
                date=day,
                state=day_state,
                open_count=free if day_state is DayState.open else 0,
                slots=slots,
                my_booking_id=my_booking.id
                if my_booking and day_state is DayState.booked_by_me
                else None,
            )
        )
    return result


def list_own(session: Session, user: User) -> list[Booking]:
    return list(
        session.exec(
            select(Booking)
            .where(Booking.user_id == user.id)
            .order_by(col(Booking.slot_start), col(Booking.created_at))
        )
    )


def create(session: Session, user: User, data: BookingCreate) -> Booking:
    _lock(session)
    _check_requestable(session, user, data.slot_start)
    booking = Booking(
        user_id=user.id,
        slot_start=data.slot_start,
        session_date=local_date(data.slot_start),
        mode=data.mode,
        topic=data.topic,
        prayer_points=data.prayer_points,
        online_reason=data.online_reason,
    )
    session.add(booking)
    session.flush()
    emails.new_request(session, booking, user)
    return _commit(session, booking)


def reschedule(
    session: Session, user: User, booking_id: uuid.UUID, slot: datetime
) -> Booking:
    _lock(session)
    original = _get_own(session, user, booking_id)
    if original.status not in ACTIVE:
        raise AppError(ErrorCode.invalid_state, "This session can't be moved.")
    was_pending = original.status is BookingStatus.pending
    if was_pending and original.reschedule_of_id:
        raise AppError(
            ErrorCode.invalid_state,
            "This change is still waiting for approval, so it can't be moved again.",
        )
    if _pending_reschedule(session, original):
        raise AppError(
            ErrorCode.invalid_state,
            "You've already asked to move this session. Please wait for an answer.",
        )
    if original.slot_start - clock.utcnow() < NOTICE:
        raise AppError(ErrorCode.too_late)
    if slot == original.slot_start:
        raise AppError(ErrorCode.validation, "Please choose a different time.")
    _check_requestable(session, user, slot, moving=original)
    if was_pending:
        _set_status(session, original, BookingStatus.rescheduled)
        session.flush()
    booking = Booking(
        user_id=user.id,
        slot_start=slot,
        session_date=local_date(slot),
        mode=original.mode,
        topic=original.topic,
        prayer_points=original.prayer_points,
        online_reason=original.online_reason,
        reschedule_of_id=None if was_pending else original.id,
    )
    session.add(booking)
    session.flush()
    emails.new_request(session, booking, user)
    return _commit(session, booking)


def cancel(session: Session, user: User, booking_id: uuid.UUID) -> Booking:
    _lock(session)
    booking = _get_own(session, user, booking_id)
    if booking.status not in ACTIVE:
        raise AppError(ErrorCode.invalid_state, "This session can't be cancelled.")
    if booking.slot_start - clock.utcnow() < NOTICE:
        raise AppError(ErrorCode.too_late)
    request = _pending_reschedule(session, booking)
    if request:
        _set_status(session, request, BookingStatus.cancelled)
    _set_status(session, booking, BookingStatus.cancelled)
    return _commit(session, booking)


def late_notice(
    session: Session, user: User, booking_id: uuid.UUID, message: str | None
) -> Booking:
    _lock(session)
    booking = _get_own(session, user, booking_id)
    now = clock.utcnow()
    if booking.status not in ACTIVE or not now < booking.slot_start < now + NOTICE:
        raise AppError(ErrorCode.invalid_state)
    _set_status(session, booking, BookingStatus.cancelled)
    booking.late_cancellation = True
    emails.late_notice(session, booking, user, message)
    return _commit(session, booking)


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
    original = (
        session.get(Booking, booking.reschedule_of_id, populate_existing=True)
        if booking.reschedule_of_id
        else None
    )
    # A session that already took place stays in the history as held.
    if (
        original
        and original.status is BookingStatus.confirmed
        and original.slot_start > clock.utcnow()
    ):
        _set_status(session, original, BookingStatus.rescheduled)
    _set_status(session, booking, BookingStatus.confirmed)
    emails.approved(session, booking, session.get_one(User, booking.user_id))
    return _commit(session, booking)


def decline(session: Session, booking_id: uuid.UUID, message: str | None) -> Booking:
    _lock(session)
    booking = _pending_future(session, booking_id)
    _set_status(session, booking, BookingStatus.declined)
    booking.decline_message = message or None
    emails.declined(session, booking, session.get_one(User, booking.user_id))
    return _commit(session, booking)


def revert(session: Session, booking_id: uuid.UUID) -> Booking:
    _lock(session)
    booking = _get(session, booking_id)
    if (
        booking.status not in (BookingStatus.confirmed, BookingStatus.declined)
        or booking.slot_start <= clock.utcnow()
        or _pending_reschedule(session, booking)
    ):
        raise AppError(ErrorCode.invalid_state, "This decision can't be undone.")
    original = (
        session.get(Booking, booking.reschedule_of_id, populate_existing=True)
        if booking.reschedule_of_id
        else None
    )
    ignore = {booking.id}
    if original:
        ignore.add(original.id)

    if booking.status is BookingStatus.declined:
        # The slot was released, so it must still be free.
        _check_restorable(session, booking, ignore)
        if original and (
            original.status is not BookingStatus.confirmed
            or _pending_reschedule(session, original)
        ):
            raise AppError(
                ErrorCode.invalid_state,
                "The original session has changed, so this can't be undone.",
            )
    elif original and original.status is BookingStatus.rescheduled:
        if original.slot_start <= clock.utcnow():
            raise AppError(
                ErrorCode.invalid_state,
                "The original session's time has passed, so this can't be undone.",
            )
        _check_restorable(session, original, ignore)
        _set_status(session, original, BookingStatus.confirmed)

    _set_status(session, booking, BookingStatus.pending)
    booking.zoom_link = None
    booking.decline_message = None
    return _commit(session, booking)


def _check_restorable(
    session: Session, booking: Booking, ignore: set[uuid.UUID]
) -> None:
    holder = _holder(session, booking.slot_start)
    if (
        session.get(BlockedDate, booking.session_date)
        or (holder and holder.id != booking.id)
        or _has_active_on(session, booking.user_id, booking.session_date, ignore)
    ):
        raise AppError(
            ErrorCode.invalid_state,
            "That time is no longer available, so this can't be undone.",
        )


def set_attendance(
    session: Session, booking_id: uuid.UUID, attendance: BookingStatus | None
) -> Booking:
    """Record whether the visitor came (attended / no_show), or clear it (None).

    Allowed from the moment an approved session starts, and can be corrected later.
    The "we missed you" email goes out at most once per booking: it waits for the
    Undo delay, is withdrawn by any later change, and isn't sent again once sent.
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
    _set_status(session, booking, target)
    if target is BookingStatus.no_show and not emails.no_show_already_sent(
        session, booking
    ):
        emails.no_show(session, booking, session.get_one(User, booking.user_id))
    return _commit(session, booking)


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
        select(Booking, User)
        .join(User, col(User.id) == col(Booking.user_id))
        .where(
            Booking.session_date == day,
            Booking.slot_start > clock.utcnow(),
            col(Booking.status).in_(ACTIVE),
        )
    ).all()
    for booking, _ in affected:
        _set_status(session, booking, BookingStatus.cancelled_by_minister)
    # A session and its same-day reschedule request are one email.
    for visitor in {visitor.id: visitor for _, visitor in affected}.values():
        emails.thursday_cancelled(session, day, visitor)
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
