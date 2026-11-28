import datetime as dt
import uuid
from datetime import UTC, datetime
from enum import IntEnum, StrEnum
from typing import Annotated, Literal, Self

from pydantic import (
    AfterValidator,
    AwareDatetime,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    EmailStr,
    Field,
    HttpUrl,
    PlainSerializer,
    StringConstraints,
    WithJsonSchema,
    model_validator,
)
from pydantic.alias_generators import to_camel

from app.models import BookingStatus, Mode, Role


class CamelModel(BaseModel):
    """camelCase in JSON, snake_case in Python."""

    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


# --- Field types


def _format_utc(value: datetime) -> str:
    value = value.astimezone(UTC)
    return value.strftime("%Y-%m-%dT%H:%M:%S.") + f"{value.microsecond // 1000:03d}Z"


def _to_utc(value: datetime) -> datetime:
    if not 2000 <= value.year <= 2100:
        raise ValueError("Please choose a valid date.")
    return value.astimezone(UTC)


def _phone(value: str) -> str:
    if sum(c in "0123456789" for c in value) < 10:
        raise ValueError("Please enter a phone number with at least 10 digits.")
    return value


def _https(value: HttpUrl) -> HttpUrl:
    if value.scheme != "https":
        raise ValueError("Please enter a Zoom link that starts with https://")
    return value


def _normalize_email(value: object) -> object:
    return value.strip().lower() if isinstance(value, str) else value


UtcOut = Annotated[
    datetime,
    PlainSerializer(_format_utc, return_type=str, when_used="json"),
    WithJsonSchema({"type": "string", "format": "date-time"}),
]
UtcIn = Annotated[AwareDatetime, AfterValidator(_to_utc)]
Email = Annotated[EmailStr, BeforeValidator(_normalize_email)]
# Free text keeps line breaks, but PostgreSQL can't store NUL.
Text = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^[^\x00]*$")]
Name = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=100,
        pattern=r"^[^\x00-\x1f\x7f]+$",
    ),
]
Phone = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True, max_length=32, pattern=r"^[^\x00-\x1f\x7f]+$"
    ),
    AfterValidator(_phone),
]
NewPassword = Annotated[str, StringConstraints(min_length=8, max_length=128)]
AnyPassword = Annotated[str, StringConstraints(min_length=1, max_length=128)]
ZoomLink = Annotated[HttpUrl, AfterValidator(_https)]


# --- Prayer minister sign-in


class EmailRequest(CamelModel):
    email: Email


class LoginRequest(CamelModel):
    email: Email
    password: AnyPassword


class ResetPasswordRequest(CamelModel):
    token: Annotated[str, StringConstraints(max_length=200)]
    password: NewPassword


class UserPublic(CamelModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: Role
    created_at: UtcOut


# --- Public booking (no account)


class BookingCreate(CamelModel):
    full_name: Name
    email: Email
    phone: Phone
    prayer_points: Annotated[Text, Field(min_length=1, max_length=500)]
    slot_start: UtcIn
    # "I can't come in person, please join by Zoom."
    online: bool = False
    online_reason: Annotated[Text, Field(max_length=200)] | None = None
    # Honeypot: hidden from people, so only bots fill it in.
    website: Annotated[str, StringConstraints(max_length=200)] | None = None

    @model_validator(mode="after")
    def check_online_reason(self) -> Self:
        if not self.online:
            self.online_reason = None
        elif not self.online_reason:
            raise ValueError("Please tell us briefly why you can't come in person.")
        return self


class LateNoticeRequest(CamelModel):
    message: Annotated[Text, Field(max_length=200)] | None = None


class ManagedBooking(CamelModel):
    """What a visitor sees through their private "manage my booking" link."""

    id: uuid.UUID
    slot_start: UtcOut
    status: BookingStatus
    mode: Mode
    full_name: str
    email: str
    prayer_points: str
    zoom_link: str | None
    decline_message: str | None
    late_cancellation: bool


class CreatedBooking(CamelModel):
    booking: ManagedBooking
    # The same private token as the link in their emails.
    manage_token: str


class DayState(StrEnum):
    open = "open"
    full = "full"
    closed = "closed"
    cancelled = "cancelled"


class SlotState(StrEnum):
    open = "open"
    taken = "taken"


class SlotAvailability(CamelModel):
    start: UtcOut
    state: SlotState


class ThursdayAvailability(CamelModel):
    date: dt.date
    state: DayState
    open_count: int
    slots: list[SlotAvailability]


class SlotPoll(CamelModel):
    poll_after_seconds: int
    days: list[ThursdayAvailability]


# --- Admin


class BookingPublic(CamelModel):
    id: uuid.UUID
    person_id: uuid.UUID
    slot_start: UtcOut
    status: BookingStatus
    mode: Mode
    prayer_points: str
    online_reason: str | None
    zoom_link: str | None
    decline_message: str | None
    late_cancellation: bool
    follow_up_sent_at: UtcOut | None
    created_at: UtcOut
    updated_at: UtcOut


class VisitorSummary(CamelModel):
    id: uuid.UUID
    full_name: str
    email: str
    phone: str


class AdminBooking(BookingPublic):
    visitor: VisitorSummary
    visit_count: int


class ApproveRequest(CamelModel):
    zoom_link: ZoomLink | None = None


class DeclineRequest(CamelModel):
    message: Annotated[Text, Field(max_length=300)] | None = None


class AttendanceRequest(CamelModel):
    """`null` clears the attendance (back to confirmed)."""

    attendance: Literal["attended", "no_show"] | None


class FollowUpRequest(CamelModel):
    subject: Annotated[Text, Field(min_length=1, max_length=150)]
    message: Annotated[Text, Field(min_length=1, max_length=2000)]

    @model_validator(mode="after")
    def one_line_subject(self) -> Self:
        if any(c in self.subject for c in "\r\n"):
            raise ValueError("Please keep the subject on one line.")
        return self


class BlockDateRequest(CamelModel):
    date: dt.date
    reason: Annotated[Text, Field(max_length=80)] | None = None


class BlockedDatePublic(CamelModel):
    date: dt.date
    reason: str | None
    created_at: UtcOut


class BlockDateResponse(CamelModel):
    blocked: BlockedDatePublic
    affected: int


class NoteInput(CamelModel):
    body: Annotated[Text, Field(min_length=1, max_length=5000)]
    person_id: uuid.UUID | None = None


class NotePublic(CamelModel):
    id: uuid.UUID
    body: str
    person_id: uuid.UUID | None
    person_name: str | None = None
    created_at: UtcOut
    updated_at: UtcOut


class PersonSummary(VisitorSummary):
    first_visit: UtcOut | None
    last_visit: UtcOut | None
    completed_count: int  # sessions marked as attended
    no_show_count: int


class PersonDetail(PersonSummary):
    bookings: list[BookingPublic]
    notes: list[NotePublic]


class AnalyticsRange(IntEnum):
    three = 3
    six = 6
    twelve = 12


class MonthStats(CamelModel):
    month: str
    label: str
    held: int
    capacity: int


class AnalyticsSummary(CamelModel):
    range_label: str
    sessions_held: int
    thursdays_held: int
    people_prayed_for: int
    returning_people: int
    attendance_rate: int  # attended / (attended + no_show); unmarked left out
    no_shows: int
    unmarked: int  # started, confirmed, attendance not recorded yet
    online_sessions: int
    monthly: list[MonthStats]
    frequent: list[PersonSummary]
