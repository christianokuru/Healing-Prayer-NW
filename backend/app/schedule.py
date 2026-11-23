"""When sessions happen. Pure functions, all in Calgary time via the IANA zone."""

import calendar
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Edmonton")
THURSDAY = 3
SLOT_TIMES = (time(19), time(19, 30), time(20), time(20, 30))
SESSION_LENGTH = timedelta(minutes=30)
NOTICE = timedelta(hours=48)


def local_date(moment: datetime) -> date:
    return moment.astimezone(TZ).date()


def slots_on(day: date) -> list[datetime]:
    return [datetime.combine(day, t, TZ).astimezone(UTC) for t in SLOT_TIMES]


def is_slot(moment: datetime) -> bool:
    day = local_date(moment)
    return day.weekday() == THURSDAY and moment in slots_on(day)


def add_months(day: date, months: int) -> date:
    year, month = divmod(day.year * 12 + day.month - 1 + months, 12)
    last = calendar.monthrange(year, month + 1)[1]
    return date(year, month + 1, min(day.day, last))


def window_end(now: datetime) -> datetime:
    local = now.astimezone(TZ)
    end = datetime.combine(add_months(local.date(), 1), local.time(), TZ)
    return end.astimezone(UTC)


def in_window(slot: datetime, now: datetime) -> bool:
    return now + NOTICE <= slot <= window_end(now)


def upcoming_thursdays(now: datetime) -> list[date]:
    first, last = local_date(now), local_date(window_end(now))
    days = (first + timedelta(n) for n in range((last - first).days + 1))
    return [d for d in days if d.weekday() == THURSDAY]


def thursdays_in_month(month: date) -> list[date]:
    last = calendar.monthrange(month.year, month.month)[1]
    days = (month.replace(day=n) for n in range(1, last + 1))
    return [d for d in days if d.weekday() == THURSDAY]


def format_day(day: date) -> str:
    return f"{day:%A, %B} {day.day}, {day.year}"


def format_slot(slot: datetime) -> str:
    local = slot.astimezone(TZ)
    clock_time = (
        f"{local.hour % 12 or 12}:{local:%M} {'am' if local.hour < 12 else 'pm'}"
    )
    return f"{format_day(local.date())} at {clock_time} (Calgary time)"
