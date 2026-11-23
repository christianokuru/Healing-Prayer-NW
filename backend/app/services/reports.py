"""Read-only admin views: booking lists, people and analytics."""

import datetime as dt
import uuid
from collections import Counter, defaultdict
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import ColumnElement, func
from sqlmodel import Session, col, select

from app import clock
from app.errors import AppError, ErrorCode
from app.models import BlockedDate, Booking, BookingStatus, Mode, Role, User
from app.schedule import (
    SESSION_LENGTH,
    SLOT_TIMES,
    add_months,
    local_date,
    thursdays_in_month,
)
from app.schemas import (
    AdminBooking,
    AnalyticsSummary,
    BookingPublic,
    MonthStats,
    PersonDetail,
    PersonSummary,
    TopicCount,
    VisitorSummary,
)


def _completed_clauses(now: datetime) -> tuple[ColumnElement[bool], ...]:
    return (
        col(Booking.status) == BookingStatus.confirmed,
        col(Booking.slot_start) <= now - SESSION_LENGTH,
    )


def _is_completed(booking: Booking, now: datetime) -> bool:
    return (
        booking.status is BookingStatus.confirmed
        and booking.slot_start <= now - SESSION_LENGTH
    )


# --- Bookings


def list_bookings(
    session: Session,
    start: datetime | None = None,
    end: datetime | None = None,
    booking_id: uuid.UUID | None = None,
) -> list[AdminBooking]:
    visits = (
        select(Booking.user_id, func.count().label("visit_count"))
        .where(*_completed_clauses(clock.utcnow()))
        .group_by(col(Booking.user_id))
        .subquery()
    )
    statement = (
        select(Booking, User, func.coalesce(visits.c.visit_count, 0))
        .join(User, col(User.id) == col(Booking.user_id))
        .outerjoin(visits, visits.c.user_id == col(Booking.user_id))
        .order_by(col(Booking.slot_start), col(Booking.created_at))
    )
    if start:
        statement = statement.where(Booking.slot_start >= start)
    if end:
        statement = statement.where(Booking.slot_start < end)
    if booking_id:
        statement = statement.where(Booking.id == booking_id)
    return [
        AdminBooking(
            **BookingPublic.model_validate(booking).model_dump(),
            visitor=VisitorSummary.model_validate(user),
            visit_count=count,
        )
        for booking, user, count in session.exec(statement)
    ]


def get_booking(session: Session, booking_id: uuid.UUID) -> AdminBooking:
    return list_bookings(session, booking_id=booking_id)[0]


# --- People


def _summarize(user: User, bookings: Sequence[Booking], now: datetime) -> PersonSummary:
    completed = sorted(
        (b for b in bookings if _is_completed(b, now)), key=lambda b: b.slot_start
    )
    topics = Counter(b.topic for b in completed).most_common(1)
    return PersonSummary(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        first_visit=completed[0].slot_start if completed else None,
        last_visit=completed[-1].slot_start if completed else None,
        completed_count=len(completed),
        no_show_count=sum(b.status is BookingStatus.no_show for b in bookings),
        top_topic=topics[0][0] if topics else None,
    )


def list_people(session: Session) -> list[PersonSummary]:
    now = clock.utcnow()
    by_user: defaultdict[uuid.UUID, list[Booking]] = defaultdict(list)
    for booking in session.exec(select(Booking)):
        by_user[booking.user_id].append(booking)
    users = session.exec(
        select(User)
        .where(User.role == Role.visitor)
        .order_by(func.lower(User.full_name), col(User.id))
    )
    return [_summarize(user, by_user[user.id], now) for user in users]


def get_person(session: Session, user_id: uuid.UUID) -> PersonDetail:
    user = session.get(User, user_id)
    if user is None or user.role is not Role.visitor:
        raise AppError(ErrorCode.not_found)
    bookings = session.exec(
        select(Booking)
        .where(Booking.user_id == user_id)
        .order_by(col(Booking.slot_start).desc(), col(Booking.created_at).desc())
    ).all()
    return PersonDetail(
        **_summarize(user, bookings, clock.utcnow()).model_dump(),
        bookings=[BookingPublic.model_validate(b) for b in bookings],
    )


# --- Analytics


def _range_label(first: dt.date, last: dt.date) -> str:
    if first.year == last.year:
        return f"{first:%B} – {last:%B %Y}"
    return f"{first:%B %Y} – {last:%B %Y}"


def analytics(session: Session, months: int) -> AnalyticsSummary:
    now = clock.utcnow()
    this_month = local_date(now).replace(day=1)
    month_starts = [add_months(this_month, -n) for n in reversed(range(months))]
    first, end = month_starts[0], add_months(this_month, 1)

    bookings = session.exec(
        select(Booking).where(Booking.session_date >= first, Booking.session_date < end)
    ).all()
    blocked = set(
        session.exec(
            select(col(BlockedDate.date)).where(
                BlockedDate.date >= first, BlockedDate.date < end
            )
        )
    )
    held = [b for b in bookings if _is_completed(b, now)]
    no_shows = sum(b.status is BookingStatus.no_show for b in bookings)
    people = {b.user_id for b in held}

    # Returning: prayed for in this range, and at least twice overall.
    returning = session.exec(
        select(Booking.user_id)
        .where(col(Booking.user_id).in_(people), *_completed_clauses(now))
        .group_by(col(Booking.user_id))
        .having(func.count() >= 2)
    ).all()

    by_user: defaultdict[uuid.UUID, list[Booking]] = defaultdict(list)
    for booking in bookings:
        by_user[booking.user_id].append(booking)
    frequent = [
        _summarize(user, by_user[user.id], now)
        for user in session.exec(select(User).where(col(User.id).in_(people)))
    ]
    frequent.sort(key=lambda p: (-p.completed_count, p.full_name.lower()))

    held_per_month = Counter(b.session_date.replace(day=1) for b in held)
    attended_or_missed = len(held) + no_shows
    return AnalyticsSummary(
        range_label=_range_label(first, this_month),
        sessions_held=len(held),
        thursdays_held=len({b.session_date for b in held}),
        people_prayed_for=len(people),
        returning_people=len(returning),
        attendance_rate=round(100 * len(held) / attended_or_missed)
        if attended_or_missed
        else 0,
        no_shows=no_shows,
        online_sessions=sum(b.mode is Mode.online for b in held),
        monthly=[
            MonthStats(
                month=f"{month:%Y-%m}",
                label=f"{month:%b}",
                held=held_per_month[month],
                capacity=len(SLOT_TIMES)
                * sum(day not in blocked for day in thursdays_in_month(month)),
            )
            for month in month_starts
        ],
        topics=[
            TopicCount(topic=topic, count=count)
            for topic, count in Counter(b.topic for b in held).most_common()
        ],
        frequent=frequent[:6],
    )
