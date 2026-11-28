from fastapi import APIRouter, status

from app.db import SessionDep
from app.deps import CurrentUserDep, SessionTokenDep, VisitorDep
from app.errors import AppError, ErrorCode, error_responses
from app.models import Booking, User
from app.rate_limit import hit
from app.schemas import (
    BookingPublic,
    ChangePasswordRequest,
    ProfileUpdate,
    UserPublic,
)
from app.security import hash_password, verify_password
from app.services import accounts, bookings

router = APIRouter(
    prefix="/me", tags=["me"], responses=error_responses(ErrorCode.unauthenticated)
)


@router.patch("", response_model=UserPublic)
def update_profile(
    data: ProfileUpdate, user: CurrentUserDep, session: SessionDep
) -> User:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    session.commit()
    session.refresh(user)
    return user


@router.post(
    "/password",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=error_responses(ErrorCode.invalid_credentials),
)
def change_password(
    data: ChangePasswordRequest,
    user: CurrentUserDep,
    session: SessionDep,
    token: SessionTokenDep,
) -> None:
    hit(session, "change-password", str(user.id), 10, 15 * 60)
    if not verify_password(data.current_password, user.password_hash):
        raise AppError(
            ErrorCode.invalid_credentials, "Your current password isn't right."
        )
    user.password_hash = hash_password(data.new_password)
    accounts.end_all_sessions(session, user.id, keep=token)
    session.commit()


@router.get(
    "/bookings",
    response_model=list[BookingPublic],
    responses=error_responses(ErrorCode.forbidden),
)
def list_my_bookings(user: VisitorDep, session: SessionDep) -> list[Booking]:
    return bookings.list_own(session, user)
