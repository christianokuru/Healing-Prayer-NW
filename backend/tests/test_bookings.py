import datetime as dt
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

import pytest

from app.schedule import slots_on, window_end
from app.security import manage_token
from tests.conftest import (
    DEC_3,
    DEC_10,
    NOV_26,
    TOKENS,
    approve,
    book,
    booked,
    check_error,
    confirmed,
    mails,
    make_visitor,
    manage,
    slot,
    status_of,
    subjects,
)


def days(visitor):
    return {d["date"]: d for d in visitor.client.get("/availability").json()}


def test_create_needs_no_account(grace, admin, db):
    response = book(grace, online=True, onlineReason="In treatment")
    assert response.status_code == 201
    body = response.json()
    booking = body["booking"]
    assert booking["status"] == "pending"
    assert booking["slotStart"] == slot(DEC_3)
    assert (booking["fullName"], booking["email"]) == ("Grace", "grace@example.com")
    assert booking["mode"] == "online"
    assert booking["zoomLink"] is None
    assert body["manageToken"] == manage_token(uuid.UUID(booking["id"]))
    assert manage(grace, booking["id"]).json() == booking
    assert subjects(db, "grace@example.com") == ["We received your request"]
    assert subjects(db, "janis@example.com") == ["New prayer session request"]
    # The visitor's email carries their private link; nobody's email has prayer points.
    assert f"/manage/{body['manageToken']}" in mails(db, "grace@example.com")[0].body
    for address in ("grace@example.com", "janis@example.com"):
        assert all("SECRET-POINTS" not in m.body for m in mails(db, address))


def test_people_are_recognised_by_email(admin):
    first = make_visitor("Grace@Example.com")
    booked(first)
    again = make_visitor("grace@example.com")
    again.full_name = "Grace Mensah"
    booked(again, DEC_10)
    people = admin.get("/admin/people").json()
    assert [(p["email"], p["fullName"]) for p in people] == [
        ("grace@example.com", "Grace Mensah")
    ]


@pytest.mark.parametrize(
    "change",
    [
        {"prayerPoints": "   "},
        {"prayerPoints": "x" * 501},
        {"fullName": " "},
        {"email": "not-an-email"},
        {"phone": "12345"},
        {"online": True},
        {"online": True, "onlineReason": " "},
        {"slotStart": "2026-12-04T02:01:00.000Z"},
        {"slotStart": "2026-12-03T02:00:00.000Z"},
        {"slotStart": "2026-12-04T02:00:00"},
        {"slotStart": "9999-12-31T23:59:59Z"},
        {"slotStart": "0001-01-01T00:00:00+14:00"},
        {"prayerPoints": "a\x00b"},
    ],
)
def test_create_validation(grace, change):
    check_error(book(grace, **change), 422, "validation")


def test_honeypot_quietly_refuses_bots(grace, db):
    check_error(book(grace, website="http://spam.example"), 422, "validation")
    assert subjects(db, "grace@example.com") == []
    assert book(grace).status_code == 201


def test_bookings_are_rate_limited_per_email(grace):
    for n in range(6):
        book(grace, DEC_3, n % 4)
    check_error(book(grace, DEC_10), 429, "rate_limited")


def test_window(grace, time):
    start = slots_on(NOV_26)[0]
    time.to(start - timedelta(hours=48) + timedelta(seconds=1))
    check_error(book(grace, NOV_26), 422, "outside_window")
    time.to(start - timedelta(hours=48))
    assert book(grace, NOV_26).status_code == 201
    far = dt.date(2027, 1, 7)
    check_error(book(grace, far), 422, "outside_window")


def test_window_is_a_calendar_month():
    assert window_end(datetime(2027, 1, 31, 19, tzinfo=UTC)) == datetime(
        2027, 2, 28, 19, tzinfo=UTC
    )


def test_slot_taken_and_one_per_thursday(grace, tom):
    booked(grace)
    check_error(book(tom), 409, "slot_taken")
    check_error(book(grace, index=1), 409, "one_per_thursday")
    check_error(book(grace), 409, "one_per_thursday")
    assert book(grace, DEC_10).status_code == 201


def test_simultaneous_bookings_for_one_slot():
    visitors = [make_visitor(f"v{n}@example.com") for n in range(6)]
    with ThreadPoolExecutor(6) as pool:
        codes = sorted(r.status_code for r in pool.map(book, visitors))
    assert codes == [201] + [409] * 5


def test_simultaneous_bookings_by_one_person(grace):
    with ThreadPoolExecutor(4) as pool:
        codes = sorted(
            r.status_code for r in pool.map(lambda n: book(grace, index=n), range(4))
        )
    assert codes == [201, 409, 409, 409]


def test_availability(grace, tom, admin):
    booked(grace)
    booked(tom, index=1)
    admin.post("/admin/blocked-dates", json={"date": str(DEC_10), "reason": "private"})
    result = days(grace)
    assert list(result) == [
        "2026-11-26",
        "2026-12-03",
        "2026-12-10",
        "2026-12-17",
    ]
    assert result["2026-11-26"]["state"] == "open"
    day = result["2026-12-03"]
    assert (day["state"], day["openCount"]) == ("open", 2)
    # Held slots are just "taken": nothing says whose they are.
    assert [s["state"] for s in day["slots"]] == ["taken", "taken", "open", "open"]
    assert set(day) == {"date", "state", "openCount", "slots"}
    assert (result["2026-12-10"]["state"], result["2026-12-10"]["openCount"]) == (
        "cancelled",
        0,
    )
    assert "private" not in str(result)


def test_availability_full_and_closed(grace, time):
    for n in range(4):
        booked(make_visitor(f"v{n}@example.com"), index=n)
    assert days(grace)["2026-12-03"]["state"] == "full"
    time.to(slots_on(NOV_26)[3] - timedelta(hours=47))
    assert days(grace)["2026-11-26"]["state"] == "closed"
    time.to(slots_on(NOV_26)[2] - timedelta(hours=48))
    assert days(grace)["2026-11-26"]["openCount"] == 2


def test_manage_link_must_be_genuine(grace, anon):
    booking = booked(grace)
    token = TOKENS[booking]
    forged = token[:32] + ("0" if token[-1] != "0" else "1") * 32
    for bad in (forged, token[:-1], "not-a-token", booking.replace("-", "") * 2):
        check_error(anon.get(f"/manage/{bad}"), 404, "not_found")
        check_error(anon.post(f"/manage/{bad}/cancel"), 404, "not_found")
    check_error(anon.get(f"/manage/{'x' * 101}"), 422, "validation")


def test_cancel_frees_the_slot(grace, tom, db):
    booking = booked(grace)
    response = manage(grace, booking, "cancel")
    assert response.json()["status"] == "cancelled"
    assert subjects(db, "grace@example.com")[-1] == "Your prayer session is cancelled"
    check_error(manage(grace, booking, "cancel"), 409, "invalid_state")
    assert book(tom).status_code == 201


def test_zoom_link_shows_once_confirmed(grace, admin):
    booking = booked(grace, online=True, onlineReason="Unwell")
    approve(admin, booking, zoomLink="https://zoom.us/j/1")
    assert manage(grace, booking).json()["zoomLink"] == "https://zoom.us/j/1"
    manage(grace, booking, "cancel")
    assert manage(grace, booking).json()["zoomLink"] is None


def test_late_notice(grace, admin, db, time):
    booking = confirmed(grace, admin)
    check_error(manage(grace, booking, "late-notice"), 409, "invalid_state")
    time.to(slots_on(DEC_3)[0] - timedelta(hours=47))
    check_error(manage(grace, booking, "cancel"), 409, "too_late")
    check_error(
        manage(grace, booking, "late-notice", message="x" * 201), 422, "validation"
    )
    body = manage(grace, booking, "late-notice", message="Car trouble").json()
    assert (body["status"], body["lateCancellation"]) == ("cancelled", True)
    assert "Car trouble" in mails(db, "janis@example.com")[-1].body
    assert status_of(grace, booking) == "cancelled"
