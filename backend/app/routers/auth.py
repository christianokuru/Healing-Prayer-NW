from fastapi import APIRouter, Request, Response, status

from app.config import get_settings
from app.db import SessionDep
from app.deps import CurrentUserDep, SessionTokenDep
from app.errors import ErrorCode, error_responses
from app.models import User
from app.rate_limit import client_ip, hit
from app.schemas import (
    EmailRequest,
    LoginRequest,
    ResetPasswordRequest,
    SignupRequest,
    SignupResponse,
    UserPublic,
    VerifyEmailRequest,
)
from app.services import accounts

router = APIRouter(prefix="/auth", tags=["auth"])

MINUTE = 60
HOUR = 60 * MINUTE


def _cookie_options() -> dict:
    return {
        "key": get_settings().cookie_name,
        "path": "/",
        "httponly": True,
        "secure": get_settings().cookie_secure,
        "samesite": "lax",
    }


def _log_in(
    session: SessionDep, response: Response, user: User, previous: str | None
) -> User:
    token = accounts.start_session(session, user, previous)
    session.commit()
    session.refresh(user)
    response.set_cookie(
        value=token,
        max_age=int(accounts.SESSION_LIFETIME.total_seconds()),
        **_cookie_options(),
    )
    return user


@router.post(
    "/signup",
    status_code=status.HTTP_201_CREATED,
    responses=error_responses(ErrorCode.email_taken),
)
def signup(
    data: SignupRequest, request: Request, session: SessionDep
) -> SignupResponse:
    hit(session, "signup-ip", client_ip(request), 60, HOUR)
    hit(session, "signup", data.email, 10, HOUR)
    return SignupResponse(email=accounts.signup(session, data).email)


@router.post(
    "/verify-email",
    response_model=UserPublic,
    responses=error_responses(ErrorCode.invalid_code, ErrorCode.not_found),
)
def verify_email(
    data: VerifyEmailRequest,
    response: Response,
    session: SessionDep,
    token: SessionTokenDep,
) -> User:
    hit(session, "verify", data.email, 15, 30 * MINUTE)
    user = accounts.verify_email(session, data.email, data.code)
    return _log_in(session, response, user, token)


@router.post("/resend-verification", status_code=status.HTTP_204_NO_CONTENT)
def resend_verification(
    data: EmailRequest, request: Request, session: SessionDep
) -> None:
    hit(session, "resend-ip", client_ip(request), 120, HOUR)
    hit(session, "resend", data.email, 10, HOUR)
    accounts.resend_code(session, data.email)


@router.post(
    "/login",
    response_model=UserPublic,
    responses=error_responses(
        ErrorCode.invalid_credentials, ErrorCode.email_not_verified
    ),
)
def login(
    data: LoginRequest,
    request: Request,
    response: Response,
    session: SessionDep,
    token: SessionTokenDep,
) -> User:
    hit(session, "login-ip", client_ip(request), 200, 15 * MINUTE)
    hit(session, "login", data.email, 20, 15 * MINUTE)
    user = accounts.authenticate(session, data.email, data.password)
    return _log_in(session, response, user, token)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=error_responses(ErrorCode.unauthenticated),
)
def logout(
    _: CurrentUserDep,
    response: Response,
    session: SessionDep,
    token: SessionTokenDep,
) -> None:
    if token:
        accounts.end_session(session, token)
        session.commit()
    response.delete_cookie(**_cookie_options())


@router.get(
    "/me",
    response_model=UserPublic,
    responses=error_responses(ErrorCode.unauthenticated),
)
def get_session(user: CurrentUserDep) -> User:
    return user


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
def forgot_password(data: EmailRequest, request: Request, session: SessionDep) -> None:
    hit(session, "forgot-ip", client_ip(request), 60, HOUR)
    hit(session, "forgot", data.email, 5, HOUR)
    accounts.request_password_reset(session, data.email)


@router.post(
    "/reset-password",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=error_responses(ErrorCode.invalid_token),
)
def reset_password(
    data: ResetPasswordRequest, request: Request, session: SessionDep
) -> None:
    hit(session, "reset-ip", client_ip(request), 60, HOUR)
    accounts.reset_password(session, data.token, data.password)
