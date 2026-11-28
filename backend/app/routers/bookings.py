import datetime as dt
import uuid
from typing import Annotated

from fastapi import APIRouter, Header, Query, Response, status

from app.db import SessionDep
from app.deps import VisitorDep
from app.errors import AppError, error_responses
from app.errors import ErrorCode as E
from app.models import Booking
from app.rate_limit import hit
from app.schemas import (
    BookingCreate,
    BookingPublic,
    LateNoticeRequest,
    RescheduleRequest,
    SlotDay,
    SlotPoll,
    ThursdayAvailability,
)
from app.security import digest
from app.services import bookings

router = APIRouter(
    tags=["bookings"], responses=error_responses(E.unauthenticated, E.forbidden)
)

POLL_SECONDS = 10
POLLS_PER_MINUTE = 60  # a few open tabs, not a scraper

SLOT_ERRORS = (E.date_unavailable, E.outside_window, E.slot_taken, E.one_per_thursday)


@router.get("/availability")
def get_availability(
    user: VisitorDep,
    session: SessionDep,
    response: Response,
    exclude_booking_id: Annotated[
        uuid.UUID | None, Query(alias="excludeBookingId")
    ] = None,
) -> list[ThursdayAvailability]:
    hit(session, "availability", str(user.id), 60, 60)
    response.headers["Cache-Control"] = "no-store"
    return bookings.availability(session, user, exclude_booking_id)


@router.get(
    "/availability/slots",
    response_model=SlotPoll,
    responses={304: {"description": "Nothing changed since the given ETag"}},
)
def poll_slots(
    user: VisitorDep,
    session: SessionDep,
    response: Response,
    date: Annotated[
        dt.date | None, Query(description="Only this Thursday (Calgary date)")
    ] = None,
    exclude_booking_id: Annotated[
        uuid.UUID | None, Query(alias="excludeBookingId")
    ] = None,
    if_none_match: Annotated[str | None, Header(max_length=500)] = None,
) -> SlotPoll | Response:
    """Current slots, cheap to poll: send back the ETag to get a 304 if unchanged.

    Informational only. Booking re-checks the slot, so a stale poll can't double book.
    """
    hit(session, "poll", str(user.id), POLLS_PER_MINUTE, 60)
    days = bookings.availability(session, user, exclude_booking_id)
    if date:
        days = [day for day in days if day.date == date]
        if not days:
            raise AppError(E.validation, "Please choose an upcoming Thursday.")
    poll = SlotPoll(
        poll_after_seconds=POLL_SECONDS,
        days=[SlotDay.model_validate(day) for day in days],
    )
    # Bound to the person: "mine" differs between visitors.
    tag = digest(f"{user.id}:{poll.model_dump_json()}")[:32]
    etag = f'"{tag}"'
    headers = {"ETag": etag, "Cache-Control": "private, no-cache", "Vary": "Cookie"}
    known = [t.strip().removeprefix("W/") for t in (if_none_match or "").split(",")]
    if etag in known:
        return Response(status_code=status.HTTP_304_NOT_MODIFIED, headers=headers)
    response.headers.update(headers)
    return poll


@router.post(
    "/bookings",
    status_code=status.HTTP_201_CREATED,
    response_model=BookingPublic,
    responses=error_responses(E.validation, *SLOT_ERRORS),
)
def create_booking(
    data: BookingCreate, user: VisitorDep, session: SessionDep
) -> Booking:
    hit(session, "book", str(user.id), 30, 3600)
    return bookings.create(session, user, data)


@router.post(
    "/bookings/{booking_id}/reschedule",
    status_code=status.HTTP_201_CREATED,
    response_model=BookingPublic,
    responses=error_responses(
        E.not_found, E.too_late, E.invalid_state, E.validation, *SLOT_ERRORS
    ),
)
def request_reschedule(
    booking_id: uuid.UUID,
    data: RescheduleRequest,
    user: VisitorDep,
    session: SessionDep,
) -> Booking:
    hit(session, "book", str(user.id), 30, 3600)
    return bookings.reschedule(session, user, booking_id, data.slot_start)


@router.post(
    "/bookings/{booking_id}/cancel",
    response_model=BookingPublic,
    responses=error_responses(E.not_found, E.too_late, E.invalid_state),
)
def cancel_booking(
    booking_id: uuid.UUID, user: VisitorDep, session: SessionDep
) -> Booking:
    return bookings.cancel(session, user, booking_id)


@router.post(
    "/bookings/{booking_id}/late-notice",
    response_model=BookingPublic,
    responses=error_responses(E.not_found, E.invalid_state),
)
def send_late_notice(
    booking_id: uuid.UUID,
    user: VisitorDep,
    session: SessionDep,
    data: LateNoticeRequest | None = None,
) -> Booking:
    return bookings.late_notice(
        session, user, booking_id, data.message if data else None
    )
