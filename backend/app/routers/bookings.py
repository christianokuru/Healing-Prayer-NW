"""Public booking: no account. Visitors book with their contact details and
manage a booking through the private link emailed to them."""

import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Header, Path, Query, Request, Response, status

from app.db import SessionDep
from app.errors import AppError, error_responses
from app.errors import ErrorCode as E
from app.rate_limit import client_ip, hit
from app.schemas import (
    BookingCreate,
    CreatedBooking,
    LateNoticeRequest,
    ManagedBooking,
    SlotPoll,
    ThursdayAvailability,
)
from app.security import digest
from app.services import bookings

router = APIRouter(tags=["public"])

POLL_SECONDS = 10
POLLS_PER_MINUTE = 60  # a few open tabs, not a scraper
HOUR = 3600

SLOT_ERRORS = (E.date_unavailable, E.outside_window, E.slot_taken, E.one_per_thursday)

# Long enough for the signed token, short enough to refuse junk early.
Token = Annotated[str, Path(min_length=1, max_length=100)]


@router.get("/availability")
def get_availability(
    request: Request, session: SessionDep, response: Response
) -> list[ThursdayAvailability]:
    hit(session, "availability", client_ip(request), 120, 60)
    response.headers["Cache-Control"] = "no-store"
    return bookings.availability(session)


@router.get(
    "/availability/slots",
    response_model=SlotPoll,
    responses={304: {"description": "Nothing changed since the given ETag"}},
)
def poll_slots(
    request: Request,
    session: SessionDep,
    response: Response,
    date: Annotated[
        dt.date | None, Query(description="Only this Thursday (Calgary date)")
    ] = None,
    if_none_match: Annotated[str | None, Header(max_length=500)] = None,
) -> SlotPoll | Response:
    """Current slots, cheap to poll: send back the ETag to get a 304 if unchanged.

    Informational only. Booking re-checks the slot, so a stale poll can't double book.
    """
    hit(session, "poll", client_ip(request), POLLS_PER_MINUTE, 60)
    days = bookings.availability(session)
    if date:
        days = [day for day in days if day.date == date]
        if not days:
            raise AppError(E.validation, "Please choose an upcoming Thursday.")
    poll = SlotPoll(poll_after_seconds=POLL_SECONDS, days=days)
    etag = f'"{digest(poll.model_dump_json())[:32]}"'
    headers = {"ETag": etag, "Cache-Control": "no-cache"}
    known = [t.strip().removeprefix("W/") for t in (if_none_match or "").split(",")]
    if etag in known:
        return Response(status_code=status.HTTP_304_NOT_MODIFIED, headers=headers)
    response.headers.update(headers)
    return poll


@router.post(
    "/bookings",
    status_code=status.HTTP_201_CREATED,
    responses=error_responses(E.validation, *SLOT_ERRORS),
)
def create_booking(
    data: BookingCreate, request: Request, session: SessionDep
) -> CreatedBooking:
    hit(session, "book-ip", client_ip(request), 20, HOUR)
    hit(session, "book", data.email, 6, HOUR)
    # Bots fill in the hidden field; refuse quietly, without saying why.
    if data.website:
        raise AppError(E.validation)
    return bookings.create(session, data)


@router.get("/manage/{token}", responses=error_responses(E.not_found))
def get_managed_booking(
    token: Token, request: Request, session: SessionDep
) -> ManagedBooking:
    hit(session, "manage", client_ip(request), 60, 60)
    return bookings.get_managed(session, token)


@router.post(
    "/manage/{token}/cancel",
    responses=error_responses(E.not_found, E.too_late, E.invalid_state),
)
def cancel_managed_booking(
    token: Token, request: Request, session: SessionDep
) -> ManagedBooking:
    hit(session, "manage-change", client_ip(request), 20, HOUR)
    return bookings.cancel(session, token)


@router.post(
    "/manage/{token}/late-notice",
    responses=error_responses(E.not_found, E.invalid_state),
)
def send_late_notice(
    token: Token,
    request: Request,
    session: SessionDep,
    data: LateNoticeRequest | None = None,
) -> ManagedBooking:
    hit(session, "manage-change", client_ip(request), 20, HOUR)
    return bookings.late_notice(session, token, data.message if data else None)
