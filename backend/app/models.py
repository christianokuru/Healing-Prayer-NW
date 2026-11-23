import datetime as dt
import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import DateTime, Enum, Index, text
from sqlmodel import Field, SQLModel

from app import clock


class Role(StrEnum):
    visitor = "visitor"
    admin = "admin"


class BookingStatus(StrEnum):
    pending = "pending"
    confirmed = "confirmed"
    declined = "declined"
    cancelled = "cancelled"
    cancelled_by_minister = "cancelled_by_minister"
    rescheduled = "rescheduled"
    no_show = "no_show"


class Mode(StrEnum):
    in_person = "in_person"
    online = "online"


class Topic(StrEnum):
    healing = "healing"
    emotional = "emotional"
    family = "family"
    deliverance = "deliverance"
    forgiveness = "forgiveness"
    other = "other"


class EmailKind(StrEnum):
    transactional = "transactional"
    decision = "decision"  # can be withdrawn while unsent (Undo)


ACTIVE = (BookingStatus.pending, BookingStatus.confirmed)
HOLDS_SLOT = (*ACTIVE, BookingStatus.no_show)

TIMESTAMPTZ: Any = DateTime(timezone=True)


def _enum(cls: type[StrEnum], name: str) -> Any:
    """A varchar with a CHECK constraint: easy to extend in a migration."""
    return Enum(
        cls,
        name=name,
        native_enum=False,
        create_constraint=True,
        length=32,
        values_callable=lambda e: [m.value for m in e],
    )


def _now() -> datetime:
    return clock.utcnow()


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, max_length=254)
    full_name: str = Field(max_length=100)
    phone: str = Field(max_length=32)
    role: Role = Field(default=Role.visitor, sa_type=_enum(Role, "role"))
    email_verified: bool = False
    password_hash: str
    created_at: datetime = Field(default_factory=_now, sa_type=TIMESTAMPTZ)


class AuthSession(SQLModel, table=True):
    """A login. Only a hash of the cookie value is stored."""

    __tablename__ = "auth_sessions"

    token_hash: str = Field(primary_key=True, max_length=64)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    expires_at: datetime = Field(sa_type=TIMESTAMPTZ, index=True)


class EmailCode(SQLModel, table=True):
    """The current email verification code of a user."""

    __tablename__ = "email_codes"

    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True)
    code_hash: str = Field(max_length=64)
    attempts: int = 0
    created_at: datetime = Field(sa_type=TIMESTAMPTZ)
    expires_at: datetime = Field(sa_type=TIMESTAMPTZ)


class PasswordReset(SQLModel, table=True):
    __tablename__ = "password_resets"

    token_hash: str = Field(primary_key=True, max_length=64)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    expires_at: datetime = Field(sa_type=TIMESTAMPTZ)


class Booking(SQLModel, table=True):
    __tablename__ = "bookings"
    __table_args__ = (
        # The database, not only the code, prevents double booking.
        Index(
            "uq_bookings_held_slot",
            "slot_start",
            unique=True,
            postgresql_where=text("status IN ('pending', 'confirmed', 'no_show')"),
        ),
        # One open reschedule request per booking.
        Index(
            "uq_bookings_pending_reschedule",
            "reschedule_of_id",
            unique=True,
            postgresql_where=text("status = 'pending'"),
        ),
        # One active booking per person per Thursday. A reschedule request may share
        # its original's date, so those are checked under the booking lock instead.
        Index(
            "uq_bookings_user_date",
            "user_id",
            "session_date",
            unique=True,
            postgresql_where=text(
                "status IN ('pending', 'confirmed') AND reschedule_of_id IS NULL"
            ),
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    slot_start: datetime = Field(sa_type=TIMESTAMPTZ, index=True)
    session_date: dt.date = Field(index=True)  # Calgary-local
    status: BookingStatus = Field(
        default=BookingStatus.pending, sa_type=_enum(BookingStatus, "booking_status")
    )
    mode: Mode = Field(sa_type=_enum(Mode, "mode"))
    topic: Topic = Field(sa_type=_enum(Topic, "topic"))
    prayer_points: str = Field(max_length=500)
    online_reason: str | None = Field(default=None, max_length=200)
    zoom_link: str | None = Field(default=None, max_length=2083)
    decline_message: str | None = Field(default=None, max_length=300)
    reschedule_of_id: uuid.UUID | None = Field(
        default=None, foreign_key="bookings.id", index=True
    )
    late_cancellation: bool = False
    created_at: datetime = Field(default_factory=_now, sa_type=TIMESTAMPTZ)
    updated_at: datetime = Field(default_factory=_now, sa_type=TIMESTAMPTZ)


class BlockedDate(SQLModel, table=True):
    __tablename__ = "blocked_dates"

    date: dt.date = Field(primary_key=True)
    reason: str | None = Field(default=None, max_length=80)
    created_at: datetime = Field(default_factory=_now, sa_type=TIMESTAMPTZ)


class OutboxEmail(SQLModel, table=True):
    """Emails are written in the same transaction as the change they announce."""

    __tablename__ = "outbox_emails"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    dedupe_key: str | None = Field(default=None, unique=True, max_length=200)
    kind: EmailKind = Field(
        default=EmailKind.transactional, sa_type=_enum(EmailKind, "email_kind")
    )
    booking_id: uuid.UUID | None = Field(
        default=None, foreign_key="bookings.id", index=True
    )
    recipient: str = Field(max_length=254)
    subject: str = Field(max_length=200)
    body: str  # cleared once sent: it may hold codes, reset or Zoom links
    ics: str | None = None
    attempts: int = 0
    send_after: datetime = Field(default_factory=_now, sa_type=TIMESTAMPTZ, index=True)
    sent_at: datetime | None = Field(default=None, sa_type=TIMESTAMPTZ)


class RateLimitWindow(SQLModel, table=True):
    __tablename__ = "rate_limit_windows"

    key: str = Field(primary_key=True, max_length=64)
    window: int = Field(primary_key=True)
    count: int
    expires_at: datetime = Field(sa_type=TIMESTAMPTZ, index=True)
