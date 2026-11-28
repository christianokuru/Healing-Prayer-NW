"""attendance: add the attended booking status

Revision ID: c3d1e5a7f902
Revises: abb0a94c0674
Create Date: 2026-11-28 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c3d1e5a7f902"
down_revision: str | Sequence[str] | None = "abb0a94c0674"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

OLD = (
    "pending",
    "confirmed",
    "declined",
    "cancelled",
    "cancelled_by_minister",
    "rescheduled",
    "no_show",
)
NEW = (*OLD[:-1], "attended", "no_show")


def _in(values: tuple[str, ...]) -> str:
    return "status IN (" + ", ".join(f"'{v}'" for v in values) + ")"


def _set_statuses(values: tuple[str, ...], held: tuple[str, ...]) -> None:
    op.drop_constraint("booking_status", "bookings", type_="check")
    op.create_check_constraint("booking_status", "bookings", _in(values))
    op.drop_index("uq_bookings_held_slot", table_name="bookings")
    op.create_index(
        "uq_bookings_held_slot",
        "bookings",
        ["slot_start"],
        unique=True,
        postgresql_where=sa.text(_in(held)),
    )


def upgrade() -> None:
    _set_statuses(NEW, ("pending", "confirmed", "attended", "no_show"))


def downgrade() -> None:
    # Attendance can't be represented any more: attended sessions become confirmed.
    op.execute("UPDATE bookings SET status = 'confirmed' WHERE status = 'attended'")
    _set_statuses(OLD, ("pending", "confirmed", "no_show"))
