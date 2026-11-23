from enum import StrEnum

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException


class ErrorCode(StrEnum):
    unauthenticated = "unauthenticated"
    invalid_credentials = "invalid_credentials"
    forbidden = "forbidden"
    email_not_verified = "email_not_verified"
    not_found = "not_found"
    email_taken = "email_taken"
    slot_taken = "slot_taken"
    one_per_thursday = "one_per_thursday"
    date_unavailable = "date_unavailable"
    too_late = "too_late"
    invalid_state = "invalid_state"
    invalid_code = "invalid_code"
    invalid_token = "invalid_token"
    outside_window = "outside_window"
    validation = "validation"
    # Not in the handoff spec: needed for rate limiting and unexpected failures.
    rate_limited = "rate_limited"
    internal = "internal"


C = ErrorCode
ERRORS: dict[ErrorCode, tuple[int, str]] = {
    C.unauthenticated: (401, "Please log in to continue."),
    C.invalid_credentials: (401, "That email or password doesn't match."),
    C.forbidden: (403, "You don't have access to this."),
    C.email_not_verified: (403, "Please confirm your email first."),
    C.not_found: (404, "We couldn't find that."),
    C.email_taken: (409, "There is already an account with this email."),
    C.slot_taken: (409, "Someone just took that time. Please choose another one."),
    C.one_per_thursday: (409, "You already have a session that Thursday."),
    C.date_unavailable: (
        409,
        "There are no sessions that Thursday. Please choose another date.",
    ),
    C.too_late: (
        409,
        "It's less than 48 hours before this session, so it can't be changed online.",
    ),
    C.invalid_state: (409, "This can't be done right now."),
    C.invalid_code: (400, "That code isn't right, or it has expired."),
    C.invalid_token: (400, "This reset link is invalid or has expired."),
    C.outside_window: (
        422,
        "Please choose a time between 48 hours and one month from now.",
    ),
    C.validation: (422, "Please check what you entered and try again."),
    C.rate_limited: (429, "Too many tries. Please wait a little and try again."),
    C.internal: (500, "Something went wrong on our side. Please try again."),
}

FIELD_LABELS = {
    "fullName": "your name",
    "email": "your email address",
    "phone": "your phone number",
    "password": "the password (at least 8 characters)",
    "newPassword": "the new password (at least 8 characters)",
    "prayerPoints": "your prayer points (up to 500 characters)",
    "onlineReason": "the reason for meeting online (up to 200 characters)",
    "slotStart": "the time you chose",
    "zoomLink": "the Zoom link",
    "message": "your message",
    "reason": "the reason",
}


class ErrorResponse(BaseModel):
    code: ErrorCode
    message: str


class AppError(Exception):
    def __init__(
        self,
        code: ErrorCode,
        message: str | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.code = code
        self.headers = headers
        self.status, default = ERRORS[code]
        self.message = message or default
        super().__init__(code)


def error_responses(*codes: ErrorCode) -> dict[int | str, dict]:
    """OpenAPI documentation for the errors an endpoint can return."""
    return {
        status: {
            "model": ErrorResponse,
            "description": ", ".join(c for c in codes if ERRORS[c][0] == status),
        }
        for status in sorted({ERRORS[c][0] for c in codes})
    }


# Shared by every route. 422 also replaces FastAPI's default validation schema.
COMMON_RESPONSES = error_responses(C.validation, C.rate_limited, C.internal)


def error_json(
    code: ErrorCode,
    message: str | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    status, default = ERRORS[code]
    return JSONResponse({"code": code, "message": message or default}, status, headers)


def handle_app_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)  # noqa: S101
    return error_json(exc.code, exc.message, exc.headers)


def handle_validation(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)  # noqa: S101
    error = exc.errors()[0]
    location = error["loc"]
    # IDs are opaque to clients: a malformed one simply doesn't exist.
    if location[0] == "path" and error["type"].startswith("uuid"):
        return error_json(C.not_found)
    # Messages from our own validators are written for people.
    own = error.get("ctx", {}).get("error")
    if error["type"] == "value_error" and isinstance(own, ValueError):
        return error_json(C.validation, str(own))
    label = FIELD_LABELS.get(str(location[-1]))
    return error_json(C.validation, f"Please check {label}." if label else None)


def handle_http(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, HTTPException)  # noqa: S101
    code = {401: C.unauthenticated, 403: C.forbidden, 404: C.not_found}.get(
        exc.status_code, C.internal if exc.status_code >= 500 else C.validation
    )
    return JSONResponse(
        {"code": code, "message": ERRORS[code][1]}, exc.status_code, exc.headers
    )


def handle_unexpected(_: Request, __: Exception) -> JSONResponse:
    # The server still logs the traceback; the client only sees a kind message.
    return error_json(C.internal)


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, handle_app_error)
    app.add_exception_handler(RequestValidationError, handle_validation)
    app.add_exception_handler(HTTPException, handle_http)
    app.add_exception_handler(Exception, handle_unexpected)
