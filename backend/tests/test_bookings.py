import datetime as dt
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

import pytest

from app.schedule import slots_on, window_end
from tests.conftest import (
    DEC_3,
    DEC_10,
    NOV_26,
    approve,
    book,
    booked,
    check_error,
    confirmed,
    mails,
    make_client,
    slot,
    status_of,
    subjects,
)


def days(client, **params):
    return {d["date"]: d for d in client.get("/availability", params=params).json()}


def reschedule(client, booking_id, day, index=0):
    return client.post(
        f"/bookings/{booking_id}/reschedule", json={"slotStart": slot(day, index)}
    )


def test_create(grace, admin, db):
    response = book(grace)
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["slotStart"] == slot(DEC_3)
    assert body["lateCancellation"] is False
    assert grace.get("/me/bookings").json() == [body]
    assert subjects(db, "grace@example.com") == ["We received your request"]
    assert subjects(db, "janis@example.com") == ["New prayer session request"]
    for address in ("grace@example.com", "janis@example.com"):
        assert all("SECRET-POINTS" not in m.body for m in mails(db, address))


@pytest.mark.parametrize(
    "change",
    [
        {"prayerPoints": "   "},
        {"prayerPoints": "x" * 501},
        {"mode": "online"},
        {"mode": "online", "onlineReason": " "},
        {"topic": "nope"},
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
    clients = [make_client(f"v{n}@example.com") for n in range(6)]
    with ThreadPoolExecutor(6) as pool:
        codes = sorted(r.status_code for r in pool.map(book, clients))
    assert codes == [201] + [409] * 5


def test_simultaneous_bookings_by_one_person(grace):
    with ThreadPoolExecutor(4) as pool:
        codes = sorted(
            r.status_code for r in pool.map(lambda n: book(grace, index=n), range(4))
        )
    assert codes == [201, 409, 409, 409]


def test_availability(grace, tom, admin):
    mine = booked(grace)
    booked(tom, index=1)
    admin.post("/admin/blocked-dates", json={"date": str(DEC_10), "reason": "private"})
    result = days(grace)
    assert list(result) == sorted(result)
    assert list(result) == [
        "2026-11-26",
        "2026-12-03",
        "2026-12-10",
        "2026-12-17",
    ]
    assert result["2026-11-26"]["state"] == "open"
    day = result["2026-12-03"]
    assert (day["state"], day["openCount"]) == ("booked_by_me", 0)
    assert day["myBookingId"] == mine
    assert [s["state"] for s in day["slots"]] == ["mine", "taken", "open", "open"]
    assert (result["2026-12-10"]["state"], result["2026-12-10"]["openCount"]) == (
        "cancelled",
        0,
    )
    assert "private" not in str(result)

    moving = days(grace, excludeBookingId=mine)["2026-12-03"]
    assert (moving["state"], moving["openCount"]) == ("open", 3)
    # Excluding someone else's booking reveals nothing.
    assert (
        days(tom, excludeBookingId=mine)["2026-12-03"]["slots"][0]["state"] == "taken"
    )


def test_availability_full_and_closed(grace, time):
    for n in range(4):
        booked(make_client(f"v{n}@example.com"), index=n)
    assert days(grace)["2026-12-03"]["state"] == "full"
    time.to(slots_on(NOV_26)[3] - timedelta(hours=47))
    assert days(grace)["2026-11-26"]["state"] == "closed"
    time.to(slots_on(NOV_26)[2] - timedelta(hours=48))
    assert days(grace)["2026-11-26"]["openCount"] == 2


def test_cancel_frees_the_slot(grace, tom, time):
    booking = booked(grace)
    check_error(tom.post(f"/bookings/{booking}/cancel"), 404, "not_found")
    check_error(tom.post("/bookings/not-an-id/cancel"), 404, "not_found")
    response = grace.post(f"/bookings/{booking}/cancel")
    assert response.json()["status"] == "cancelled"
    check_error(grace.post(f"/bookings/{booking}/cancel"), 409, "invalid_state")
    assert book(tom).status_code == 201


def test_late_notice(grace, admin, db, time):
    booking = confirmed(grace, admin)
    url = f"/bookings/{booking}/late-notice"
    check_error(grace.post(url, json={}), 409, "invalid_state")
    time.to(slots_on(DEC_3)[0] - timedelta(hours=47))
    check_error(grace.post(f"/bookings/{booking}/cancel"), 409, "too_late")
    check_error(reschedule(grace, booking, DEC_10), 409, "too_late")
    long = {"message": "x" * 201}
    check_error(grace.post(url, json=long), 422, "validation")
    body = grace.post(url, json={"message": "Car trouble"}).json()
    assert (body["status"], body["lateCancellation"]) == ("cancelled", True)
    assert "Car trouble" in mails(db, "janis@example.com")[-1].body


def test_reschedule_confirmed(grace, admin):
    original = confirmed(grace, admin)
    check_error(reschedule(grace, original, DEC_3), 422, "validation")
    response = reschedule(grace, original, DEC_10)
    assert response.status_code == 201
    request = response.json()
    assert (request["status"], request["rescheduleOfId"]) == ("pending", original)
    assert status_of(grace, original) == "confirmed"
    check_error(reschedule(grace, original, DEC_10, 1), 409, "invalid_state")
    check_error(reschedule(grace, request["id"], DEC_10, 1), 409, "invalid_state")
    # The pending request counts for its own Thursday.
    check_error(book(grace, DEC_10, 2), 409, "one_per_thursday")

    assert approve(admin, request["id"]).status_code == 200
    assert status_of(grace, original) == "rescheduled"
    reverted = admin.post(f"/admin/bookings/{request['id']}/revert")
    assert reverted.json()["status"] == "pending"
    assert status_of(grace, original) == "confirmed"

    admin.post(f"/admin/bookings/{request['id']}/decline", json={})
    assert status_of(grace, original) == "confirmed"


def test_reschedule_same_thursday(grace, admin):
    original = confirmed(grace, admin)
    request = reschedule(grace, original, DEC_3, 2)
    assert request.status_code == 201
    assert approve(admin, request.json()["id"]).status_code == 200
    assert status_of(grace, original) == "rescheduled"


def test_reschedule_pending_replaces(grace, tom):
    original = booked(grace)
    request = reschedule(grace, original, DEC_3, 1).json()
    assert request["rescheduleOfId"] is None
    assert status_of(grace, original) == "rescheduled"
    assert book(tom).status_code == 201
    check_error(reschedule(tom, request["id"], DEC_10), 404, "not_found")


def test_cancel_takes_the_reschedule_request_with_it(grace, admin):
    original = confirmed(grace, admin)
    request = reschedule(grace, original, DEC_10).json()["id"]
    grace.post(f"/bookings/{original}/cancel")
    assert status_of(grace, request) == "cancelled"
