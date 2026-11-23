import datetime as dt
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.db import SessionDep
from app.deps import require_admin
from app.errors import ErrorCode as E
from app.errors import error_responses
from app.models import BlockedDate
from app.schemas import (
    AdminBooking,
    AnalyticsRange,
    AnalyticsSummary,
    ApproveRequest,
    BlockDateRequest,
    BlockDateResponse,
    BlockedDatePublic,
    DeclineRequest,
    PersonDetail,
    PersonSummary,
    UtcIn,
)
from app.services import bookings, reports

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
    responses=error_responses(E.unauthenticated, E.forbidden),
)

DECISION_ERRORS = error_responses(E.not_found, E.invalid_state)


@router.get("/bookings")
def list_bookings(
    session: SessionDep,
    start: Annotated[
        UtcIn | None, Query(alias="from", description="Inclusive slotStart")
    ] = None,
    end: Annotated[
        UtcIn | None, Query(alias="to", description="Exclusive slotStart")
    ] = None,
) -> list[AdminBooking]:
    return reports.list_bookings(session, start, end)


@router.post("/bookings/{booking_id}/approve", responses=DECISION_ERRORS)
def approve_booking(
    booking_id: uuid.UUID, session: SessionDep, data: ApproveRequest | None = None
) -> AdminBooking:
    zoom_link = str(data.zoom_link) if data and data.zoom_link else None
    bookings.approve(session, booking_id, zoom_link)
    return reports.get_booking(session, booking_id)


@router.post("/bookings/{booking_id}/decline", responses=DECISION_ERRORS)
def decline_booking(
    booking_id: uuid.UUID, session: SessionDep, data: DeclineRequest | None = None
) -> AdminBooking:
    bookings.decline(session, booking_id, data.message if data else None)
    return reports.get_booking(session, booking_id)


@router.post("/bookings/{booking_id}/revert", responses=DECISION_ERRORS)
def revert_decision(booking_id: uuid.UUID, session: SessionDep) -> AdminBooking:
    bookings.revert(session, booking_id)
    return reports.get_booking(session, booking_id)


@router.post("/bookings/{booking_id}/no-show", responses=DECISION_ERRORS)
def mark_no_show(booking_id: uuid.UUID, session: SessionDep) -> AdminBooking:
    bookings.mark_no_show(session, booking_id)
    return reports.get_booking(session, booking_id)


@router.delete("/bookings/{booking_id}/no-show", responses=DECISION_ERRORS)
def undo_no_show(booking_id: uuid.UUID, session: SessionDep) -> AdminBooking:
    bookings.undo_no_show(session, booking_id)
    return reports.get_booking(session, booking_id)


@router.get("/blocked-dates", response_model=list[BlockedDatePublic])
def list_blocked_dates(session: SessionDep) -> list[BlockedDate]:
    return bookings.list_blocked(session)


@router.post(
    "/blocked-dates",
    status_code=status.HTTP_201_CREATED,
    responses=error_responses(E.invalid_state),
)
def block_date(data: BlockDateRequest, session: SessionDep) -> BlockDateResponse:
    blocked, affected = bookings.block_date(session, data.date, data.reason)
    return BlockDateResponse(
        blocked=BlockedDatePublic.model_validate(blocked), affected=affected
    )


@router.delete(
    "/blocked-dates/{date}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=error_responses(E.not_found),
)
def unblock_date(date: dt.date, session: SessionDep) -> None:
    bookings.unblock_date(session, date)


@router.get("/people")
def list_people(session: SessionDep) -> list[PersonSummary]:
    return reports.list_people(session)


@router.get("/people/{person_id}", responses=error_responses(E.not_found))
def get_person(person_id: uuid.UUID, session: SessionDep) -> PersonDetail:
    return reports.get_person(session, person_id)


@router.get("/analytics")
def get_analytics(
    session: SessionDep,
    months: Annotated[AnalyticsRange, Query()] = AnalyticsRange.six,
) -> AnalyticsSummary:
    return reports.analytics(session, months)
