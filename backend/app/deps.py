from typing import Annotated

from fastapi import Depends, Security
from fastapi.security import APIKeyCookie
from sqlmodel import col, select

from app import clock
from app.config import get_settings
from app.db import SessionDep
from app.errors import AppError, ErrorCode
from app.models import AuthSession, Role, User
from app.security import digest

session_cookie = APIKeyCookie(
    name=get_settings().cookie_name, scheme_name="SessionCookie", auto_error=False
)
SessionTokenDep = Annotated[str | None, Security(session_cookie)]


def get_current_user(session: SessionDep, token: SessionTokenDep) -> User:
    if not token:
        raise AppError(ErrorCode.unauthenticated)
    user = session.exec(
        select(User)
        .join(AuthSession, col(AuthSession.user_id) == col(User.id))
        .where(
            AuthSession.token_hash == digest(token),
            AuthSession.expires_at > clock.utcnow(),
        )
    ).first()
    if user is None:
        raise AppError(ErrorCode.unauthenticated)
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def require_admin(user: CurrentUserDep) -> User:
    if user.role is not Role.admin:
        raise AppError(ErrorCode.forbidden)
    return user
